/**
 * cif.js — CIF (Crystallographic Information File) 解析器（IodineScope）
 * 支持：
 *  - data_ 块（取第一个）
 *  - loop_ 循环结构
 *  - '...' "..." ;...; 三种引号文本
 *  - # 注释
 *  - 数值：0. 0.5(3) 1/2 .5 ? .（含 esd 后缀、分数）
 *  - 对称操作字符串：x,1/2+y,1/2+z  /  -x+1/3,y+2/3,z 等
 *  - 带电荷类型符号：Na1+、Cl1-、O2-
 */
import { elementFromTypeSymbol } from './periodic.js';
import { SG_OPS } from './sg_ops.js';

// ---------- 底层词法 ----------

/** 预处理：只去 # 注释，保留引号与分号块结构（供 tokenizer 识别） */
function stripComments(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inText = null; // ' " ;
  for (let line of lines) {
    if (inText === ';') {
      out.push(line);
      if (line.startsWith(';')) inText = null;
      continue;
    }
    let result = '';
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (inText === null) {
        if (ch === '#' && (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t')) {
          break; // 注释到行尾
        }
        if (ch === ';' && i === 0) { inText = ';'; result += ch; i++; continue; }
        if (ch === "'" || ch === '"') { inText = ch; result += ch; i++; continue; }
      } else {
        if (ch === inText) inText = null;
        result += ch; i++;
        continue;
      }
      result += ch; i++;
    }
    out.push(result);
  }
  return out.join('\n');
}

/** 去掉引号包裹 */
function unquote(s) {
  s = s.trim();
  if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
    return s.slice(1, -1).trim();
  }
  return s;
}

/** 解析数值（含 esd 括号、分数） */
export function parseNum(s, allowFraction = true) {
  if (s === undefined || s === null) return null;
  s = String(s).trim();
  if (s === '?' || s === '.') return null;
  s = s.replace(/\(\d+(?:\.\d+)?\)/g, '').trim(); // 去 esd
  if (allowFraction && /^[+-]?\d+\s*\/\s*[+-]?\d+$/.test(s)) {
    const [a, b] = s.split('/').map(Number);
    return a / b;
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// ---------- 对称操作解析 ----------

/**
 * 解析对称操作字符串 "x,1/2+y,1/2+z" → { m: [[a,b,c],[d,e,f],[g,h,i]], t: [tx,ty,tz] }
 * 坐标变换：X' = M·X + T（分数坐标）
 */
export function parseSymOp(opStr) {
  // 统一小写：COD 新格式 _space_group_symop_operation_xyz 用大写 "+X,+Y,+Z"，
  // 老格式 _symmetry_equiv_pos_as_xyz 用小写 "x,y,z"；若不统一，大写 X/Y/Z
  // 会因 vars 只含小写而被误判为常数项 → 矩阵全 0 → 所有位点塌缩到原点。
  const parts = String(opStr).toLowerCase().replace(/\s+/g, '').split(',');
  if (parts.length < 3) return null;
  const m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const t = [0, 0, 0];
  const vars = ['x', 'y', 'z'];
  for (let row = 0; row < 3; row++) {
    const comp = parts[row];
    const terms = comp.match(/[+-]?[^+-]+/g) || [];
    for (let term of terms) {
      term = term.trim();
      if (!term) continue;
      let sign = 1;
      if (term[0] === '+') { sign = 1; term = term.slice(1); }
      else if (term[0] === '-') { sign = -1; term = term.slice(1); }
      const vIdx = vars.findIndex(v => term.includes(v));
      if (vIdx !== -1) {
        const coefStr = term.split(term[vIdx])[0].replace(/\*/g, '');
        let coef = 1;
        if (coefStr) { const f = parseNum(coefStr); if (f !== null) coef = f; }
        m[row][vIdx] = sign * coef;
      } else {
        const f = parseNum(term);
        if (f !== null) t[row] += sign * f;
      }
    }
  }
  return { m, t };
}

/** 对分数坐标施加对称操作并归一化到 [0,1) */
export function applySymOp(op, x, y, z) {
  const nx = op.m[0][0] * x + op.m[0][1] * y + op.m[0][2] * z + op.t[0];
  const ny = op.m[1][0] * x + op.m[1][1] * y + op.m[1][2] * z + op.t[1];
  const nz = op.m[2][0] * x + op.m[2][1] * y + op.m[2][2] * z + op.t[2];
  return [nx % 1, ny % 1, nz % 1].map(v => ((v % 1) + 1) % 1);
}

// ---------- 主解析器 ----------

/**
 * 解析 CIF 文本 → 结构化数据
 * @returns {{id:string, cell:object, sgName:string, sgNum:number|null, Z:number|null,
 *   formulaSum:string, formulaStructural:string, names:string[],
 *   sites:Array<{label, element, x, y, z, occupancy, multiplicity, wyckoff}>,
 *   ops:Array<{m,t}>, warnings:string[]}}
 */
export function parseCIF(text, fallbackId) {
  const cleaned = stripComments(text);
  // 行级定位第一个 data_ 块（跳过分号文本块内的行，防误截断）
  const cleanedLines = cleaned.split('\n');
  let firstIdx = -1, cutIdx = -1, inBlock = false;
  for (let idx = 0; idx < cleanedLines.length; idx++) {
    const l = cleanedLines[idx];
    if (l.startsWith(';')) inBlock = !inBlock;
    else if (!inBlock && /^[ \t]*data_/.test(l)) {
      if (firstIdx === -1) firstIdx = idx;
      else { cutIdx = idx; break; }
    }
  }
  let body = cutIdx === -1
    ? cleanedLines.slice(firstIdx).join('\n')
    : cleanedLines.slice(firstIdx, cutIdx).join('\n');

  const idMatch = body.match(/^\s*data_(\S*)/m);
  const id = idMatch ? idMatch[1] : (fallbackId || 'unknown');

  // 预扫描所有行，构建 token 流
  const tokens = tokenizeCif(body);

  // 组装键值（处理 loop_）
  const kv = {};        // 普通键值
  const loops = [];     // [{tags:[...], values:[[...],...]}]
  const order = [];     // 记录出现顺序（供显示）
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.startsWith('_')) {
      // 数据名
      const name = tok;
      const next = tokens[i + 1];
      if (next !== undefined && next !== 'loop_' && !next.startsWith('_')) {
        kv[name] = unquote(next);
        order.push([name, kv[name]]);
        i += 2;
      } else {
        kv[name] = ''; // 无值
        order.push([name, '']);
        i += 1;
      }
    } else if (tok === 'loop_') {
      // 收集标签
      const tags = [];
      let j = i + 1;
      while (j < tokens.length && tokens[j].startsWith('_')) { tags.push(tokens[j]); j++; }
      // 收集值行
      const values = [];
      while (j < tokens.length && !tokens[j].startsWith('_') && tokens[j] !== 'loop_') {
        // 一行一个记录：按循环标签数切块
        const rowVals = [];
        let k = j;
        while (k < tokens.length && !tokens[k].startsWith('_') && tokens[k] !== 'loop_') {
          rowVals.push(unquote(tokens[k]));
          k++;
        }
        // 按标签数切分（CIF 每行值数 = 标签数，防御性处理）
        for (let r = 0; r < rowVals.length; r += tags.length) {
          const row = rowVals.slice(r, r + tags.length);
          if (row.length === tags.length && row.some(v => v !== '')) values.push(row);
        }
        j = k;
      }
      loops.push({ tags, values });
      order.push(['loop:' + tags.join(' '), values.length]);
      i = j;
    } else {
      i++;
    }
  }

  // ---------- 提取晶体学字段 ----------
  const get = (key) => { const v = kv[key]; return v !== undefined && v !== '' ? v : null; };
  const getNum = (key) => { const v = get(key); return v !== null ? parseNum(v) : null; };

  const cell = {
    a: getNum('_cell_length_a'), b: getNum('_cell_length_b'), c: getNum('_cell_length_c'),
    alpha: getNum('_cell_angle_alpha'), beta: getNum('_cell_angle_beta'), gamma: getNum('_cell_angle_gamma')
  };
  if (cell.a === null) throw new Error('缺少晶胞参数 _cell_length_*');

  const sgName = get('_symmetry_space_group_name_H-M') || get('_symmetry_space_group_name_Hall') || null;
  const sgNum = getNum('_space_group_IT_number') ?? getNum('_symmetry_Int_Tables_number') ?? null;

  // 对称操作：优先 _symmetry_equiv_pos_as_xyz，其次 _space_group_symop_operation_xyz
  let opStrs = [];
  for (const lp of loops) {
    if (lp.tags.includes('_symmetry_equiv_pos_as_xyz')) {
      const idx = lp.tags.indexOf('_symmetry_equiv_pos_as_xyz');
      opStrs = lp.values.map(r => r[idx]).filter(v => v && v !== '?' && v !== '.');
      break;
    }
    if (lp.tags.includes('_space_group_symop_operation_xyz')) {
      const idx = lp.tags.indexOf('_space_group_symop_operation_xyz');
      opStrs = lp.values.map(r => r[idx]).filter(v => v && v !== '?' && v !== '.');
      break;
    }
  }
  let ops = opStrs.map(parseSymOp).filter(Boolean);
  // 对称操作回退（学习 Jmol/spglib 的成熟做法）：
  // 当 CIF 缺对称操作清单、或只给出恒等操作时，按 _space_group_IT_number 查空间群表
  // 生成完整一般位置对称操作，避免把整个晶胞塌缩成不对称单元（"只显示几个基元"）。
  if (ops.length <= 1 && sgNum != null) {
    const tbl = SG_OPS[String(Math.round(sgNum))];
    if (tbl && tbl.length > 1) {
      const fromTable = tbl.map(parseSymOp).filter(Boolean);
      if (fromTable.length > ops.length) ops = fromTable;
    }
  }
  if (ops.length === 0) {
    ops = [{ m: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], t: [0, 0, 0] }];
  }

  // 原子位点
  const sites = [];
  for (const lp of loops) {
    const tIdx = lp.tags.indexOf('_atom_site_type_symbol');
    const lIdx = lp.tags.indexOf('_atom_site_label');
    const xIdx = lp.tags.indexOf('_atom_site_fract_x');
    const yIdx = lp.tags.indexOf('_atom_site_fract_y');
    const zIdx = lp.tags.indexOf('_atom_site_fract_z');
    const oIdx = lp.tags.indexOf('_atom_site_occupancy');
    const mIdx = lp.tags.indexOf('_atom_site_symmetry_multiplicity');
    const wIdx = lp.tags.indexOf('_atom_site_Wyckoff_symbol');
    if (xIdx === -1 || yIdx === -1 || zIdx === -1) continue;
    for (const row of lp.values) {
      const typeSym = tIdx !== -1 ? row[tIdx] : (lIdx !== -1 ? row[lIdx] : null);
      const element = elementFromTypeSymbol(typeSym);
      if (!element) continue;
      const x = parseNum(row[xIdx]);
      const y = parseNum(row[yIdx]);
      const z = parseNum(row[zIdx]);
      if (x === null || y === null || z === null) continue;
      sites.push({
        label: lIdx !== -1 ? row[lIdx] : typeSym,
        element,
        x, y, z,
        occupancy: oIdx !== -1 ? (parseNum(row[oIdx]) ?? 1) : 1,
        multiplicity: mIdx !== -1 ? (parseNum(row[mIdx]) ?? 1) : 1,
        wyckoff: wIdx !== -1 ? row[wIdx] : ''
      });
    }
  }
  if (sites.length === 0) throw new Error('未找到原子位点 _atom_site_*');

  // 化学式与名称
  const formulaSum = get('_chemical_formula_sum') || get('_chemical_formula_structural') || '';
  const formulaStructural = get('_chemical_formula_structural') || '';
  const names = [];
  for (const k of ['_chemical_name_systematic', '_chemical_name_common', '_chemical_formula_title']) {
    const v = get(k);
    if (v) names.push(v);
  }

  return {
    id, cell, sgName, sgNum, Z: getNum('_cell_formula_units_Z'),
    formulaSum, formulaStructural, names,
    sites, ops, warnings: [],
    rawOrder: order
  };
}

/** 词法切分：返回 token 数组（数据名/loop_/值） */
function tokenizeCif(body) {
  const tokens = [];
  const lines = body.split('\n');
  let inSemiText = false;
  let semiBuffer = null;
  for (let line of lines) {
    if (inSemiText) {
      if (line.startsWith(';')) {
        inSemiText = false;
        tokens.push(semiBuffer);
        semiBuffer = null;
        const rest = line.slice(1).trim();
        if (rest) tokens.push(rest);
      } else {
        semiBuffer += '\n' + line;
      }
      continue;
    }
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith(';')) {
      inSemiText = true;
      semiBuffer = trimmed.slice(1);
      continue;
    }
    // 按空白切分，保留引号包裹的串
    const parts = trimmed.match(/[^\s'"]+|'[^']*'|"[^"]*"/g) || [];
    for (const p of parts) tokens.push(p);
  }
  if (inSemiText) tokens.push(semiBuffer || '');
  return tokens;
}

// ---------- 晶胞矩阵 ----------

/**
 * 由晶胞参数构建分数坐标→笛卡尔坐标转换矩阵（标准晶体学约定）
 * a 沿 x 轴，b 在 xy 平面
 */
export function cellMatrix(cell) {
  const a = cell.a, b = cell.b, c = cell.c;
  const al = cell.alpha * Math.PI / 180, be = cell.beta * Math.PI / 180, ga = cell.gamma * Math.PI / 180;
  const v = Math.sqrt(1 - Math.cos(al) ** 2 - Math.cos(be) ** 2 - Math.cos(ga) ** 2
    + 2 * Math.cos(al) * Math.cos(be) * Math.cos(ga));
  const m = new Float64Array(9);
  m[0] = a;
  m[1] = b * Math.cos(ga);
  m[2] = c * Math.cos(be);
  m[3] = 0;
  m[4] = b * Math.sin(ga);
  m[5] = c * (Math.cos(al) - Math.cos(be) * Math.cos(ga)) / Math.sin(ga);
  m[6] = 0;
  m[7] = 0;
  m[8] = c * v / Math.sin(ga);
  return m; // 行主序：frac · M = cart
}

/** 分数坐标 → 笛卡尔坐标 */
export function fracToCart(m, fx, fy, fz) {
  return [
    fx * m[0] + fy * m[1] + fz * m[2],
    fx * m[3] + fy * m[4] + fz * m[5],
    fx * m[6] + fy * m[7] + fz * m[8]
  ];
}
