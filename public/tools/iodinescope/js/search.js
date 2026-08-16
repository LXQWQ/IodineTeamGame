/**
 * search.js — 晶体库索引与搜索（IodineScope）
 * 依据原子种类与数目、晶系、关键词从自有 CIF 库索引中检索。
 */
let INDEX = null;

/** 加载 data/index.json 索引 */
export async function loadIndex() {
  if (INDEX) return INDEX;
  const resp = await fetch('data/index.json', { cache: 'no-store' });
  if (!resp.ok) throw new Error('索引加载失败: ' + resp.status);
  INDEX = await resp.json();
  return INDEX;
}

export function getIndex() { return INDEX; }

/** 解析化学式字符串："NaCl"、"Fe2O3"、"C" → {Na:1, Cl:1} */
export function parseFormulaInput(str) {
  const counts = {};
  const tokens = String(str || '').match(/[A-Z][a-z]?\d*/g) || [];
  for (const tok of tokens) {
    const m = tok.match(/^([A-Z][a-z]?)(\d*)$/);
    if (!m) continue;
    counts[m[1]] = (counts[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return counts;
}

/** 计量比归一化（最小整数比）：{Fe:2,O:3} → {Fe:2,O:3}；{Na:4,Cl:4} → {Na:1,Cl:1} */
export function normalizeRatio(counts) {
  const vals = Object.values(counts);
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const g = vals.reduce((acc, v) => gcd(acc, v), vals[0] || 1);
  const out = {};
  for (const [k, v] of Object.entries(counts)) out[k] = v / g;
  return out;
}

/**
 * 搜索
 * @param {object} q
 *  - formulaCounts: {sym: n}  公式解析的元素计量（精确模式按计量比匹配，包含模式按晶胞计数匹配）
 *  - matchMode: 'exact' | 'contains'
 *  - elements: [{sym, min, max}]  附加晶胞计数约束
 *  - totalMin / totalMax: 晶胞原子总数范围
 *  - system: 晶系（cubic 等）
 *  - keyword: 名称/矿物/化学式关键词
 * @param {number} maxResults
 */
export function searchIndex(q = {}, maxResults = 300) {
  if (!INDEX) return [];
  const { formulaCounts = {}, matchMode = 'contains', elements = [],
    totalMin = 0, totalMax = Infinity, system = '', keyword = '' } = q;
  const kw = keyword.trim().toLowerCase();
  const fKeys = Object.keys(formulaCounts);
  const fNorm = normalizeRatio(formulaCounts);
  const results = [];

  for (const s of INDEX.structures) {
    // 公式匹配（精确 = 计量比一致；包含 = 晶胞内元素充足）
    if (fKeys.length) {
      if (matchMode === 'exact') {
        const sNorm = normalizeRatio(s.counts);
        const sKeys = Object.keys(sNorm);
        if (sKeys.length !== fKeys.length) continue;
        if (!fKeys.every(k => Math.abs(sNorm[k] - fNorm[k]) < 1e-6)) continue;
      } else {
        if (!fKeys.every(k => (s.counts[k] ?? 0) >= (formulaCounts[k] ?? 1))) continue;
      }
    }

    // 附加元素 + 数目约束（晶胞计数）
    let elOk = true;
    for (const req of elements) {
      const count = s.counts[req.sym] ?? 0;
      if (count === 0) { elOk = false; break; }
      if (req.min !== undefined && count < req.min) { elOk = false; break; }
      if (req.max !== undefined && count > req.max) { elOk = false; break; }
    }
    if (!elOk) continue;

    // 原子总数
    const total = Object.values(s.counts).reduce((a, b) => a + b, 0);
    if (total < totalMin || total > totalMax) continue;

    // 晶系
    if (system && s.system !== system) continue;

    // 关键词
    if (kw) {
      const hay = `${s.name} ${s.mineral || ''} ${s.formula} ${s.sg}`.toLowerCase();
      if (!hay.includes(kw)) continue;
    }
    results.push(s);
    if (results.length >= maxResults) break;
  }
  return results;
}

/** 晶系中文名 */
export const SYSTEM_NAMES = {
  triclinic: '三斜', monoclinic: '单斜', orthorhombic: '正交',
  tetragonal: '四方', trigonal: '三方', hexagonal: '六方', cubic: '立方'
};

/** 晶系判定：优先用空间群国际编号（准确），否则用晶胞参数（容差判据） */
export function systemOf(cell, sgNum = null) {
  if (sgNum) {
    if (sgNum >= 195) return 'cubic';
    if (sgNum >= 168) return 'hexagonal';
    if (sgNum >= 143) return 'trigonal';
    if (sgNum >= 89) return 'tetragonal';
    if (sgNum >= 16) return 'orthorhombic';
    if (sgNum >= 3) return 'monoclinic';
    return 'triclinic';
  }
  const t = 1e-2;
  const [a, b, c] = [cell.a, cell.b, cell.c];
  const [al, be, ga] = [cell.alpha, cell.beta, cell.gamma];
  const eq = (x, y) => Math.abs(x - y) < t;
  const r = (x) => Math.abs(x - 90) < t;
  if (eq(a, b) && eq(b, c) && r(al) && r(be) && r(ga)) return 'cubic';
  if (eq(a, b) && r(al) && r(be) && Math.abs(ga - 120) < t) return 'hexagonal';
  if (eq(a, b) && eq(a, c) && eq(al, be) && r(ga) && !r(al) && Math.abs(al - 120) > t) return 'trigonal';
  if (eq(a, b) && r(al) && r(be) && r(ga)) return 'tetragonal';
  if (r(al) && r(be) && r(ga) && !eq(a, b) && !eq(b, c) && !eq(a, c)) return 'orthorhombic';
  if (r(al) && r(ga) && !r(be)) return 'monoclinic';
  return 'triclinic';
}

/** 化学式美化为下标形式（金属优先重排："Cl Na" → "NaCl"） */
export function prettyFormula(formula) {
  if (!formula) return '';
  const NON_METAL_SET = new Set(['H','He','B','C','N','O','F','Ne','P','S','Cl',
    'Ar','Se','Br','Kr','I','Xe','At','Rn']);
  const tokens = String(formula).replace(/-/g, '').trim().split(/\s+/).filter(Boolean);
  tokens.sort((a, b) => {
    const ma = a.match(/^([A-Z][a-z]?)/), mb = b.match(/^([A-Z][a-z]?)/);
    const na = ma && NON_METAL_SET.has(ma[1]) ? 1 : 0;
    const nb = mb && NON_METAL_SET.has(mb[1]) ? 1 : 0;
    if (na !== nb) return na - nb;
    return a.localeCompare(b);
  });
  return tokens.map(t => t.replace(/(\d+)/g, '<sub>$1</sub>')).join('');
}
