/**
 * crystal.js — 晶体构建核心（IodineScope）
 * 从解析后的 CIF 数据构建可渲染的晶体：
 *  1. 对称操作展开：对每个原子位点施加全部对称操作，去重后得到晶胞内全部原子
 *  2. 超胞复制
 *  3. 最小镜像成键：键长判据（共价半径和 × 系数），周期性边界处理
 *  4. 配位数 / 配位多面体邻接表
 *  5. 理论密度、元素计数等物性计算
 * 这是参照 Diamond 等晶体学软件的渲染逻辑，基于公开晶体学约定从零实现的原创代码。
 */
import { cellMatrix, fracToCart, applySymOp } from './cif.js';
import { elementOf } from './periodic.js';

/** 配位壳层相对容差：只保留 dist ≤ minD × 1.07 的最短键长壳层
 * （第一配位壳；bcc Fe 排除 15.5% 更长的第二壳，正长石 K 保留 5.9% 内的第一壳） */
export const SHELL_FACTOR = 1.07;

/** 从化学式字符串解析元素计数："Al6 Cl2 Na8 O24 Si6" → {Al:6, Cl:2, ...} */
export function parseFormulaSum(str) {
  const counts = {};
  if (!str) return counts;
  const tokens = String(str).trim().split(/\s+/);
  for (const tok of tokens) {
    const m = tok.match(/^([A-Z][a-z]?)(\d*)/);
    if (!m) continue;
    counts[m[1]] = (counts[m[1]] || 0) + (m[2] ? parseInt(m[2], 10) : 1);
  }
  return counts;
}

/** 晶胞体积（Å³） */
export function cellVolume(cell) {
  const { a, b, c } = cell;
  const al = cell.alpha * Math.PI / 180, be = cell.beta * Math.PI / 180, ga = cell.gamma * Math.PI / 180;
  return a * b * c * Math.sqrt(
    1 - Math.cos(al) ** 2 - Math.cos(be) ** 2 - Math.cos(ga) ** 2
    + 2 * Math.cos(al) * Math.cos(be) * Math.cos(ga)
  );
}

/**
 * 构建晶体
 * @param {object} cif  parseCIF 的输出
 * @param {{supercell?:number, bondFactor?:number, bondOffset?:number}} options
 */
export function buildCrystal(cif, options = {}) {
  const supercell = Math.max(1, Math.min(4, Math.round(options.supercell ?? 1)));
  const bondFactor = options.bondFactor ?? 1.08;
  const bondOffset = options.bondOffset ?? 0.15;

  const cell = cif.cell;
  const M = cellMatrix(cell);
  const volume = cellVolume(cell);

  // ---------- 1. 对称展开 + 去重 ----------
  // 量化精度须足够粗以吸收 CIF 四位小数舍入 + 对称运算的浮点误差（~1e-4），
  // 否则本应重合的对称等效位置会被拆成多个假原子（如 AlB2 型 3 原子被算成 7 个）。
  // 0.001 分数坐标 ≈ 0.005–0.01 Å，远小于任何真实原子间距，安全。
  const Q = 1e-3; // 坐标量化精度
  const QB = 1 / Q; // 每个轴的桶数（须为整数）
  const seen = new Map(); // key(位置) → 该位置的 {element, topOcc}
  const atoms = [];
  const elCounts = {};    // 占位率加权元素计数（与 pymatgen composition 对齐）
  let massSum = 0;        // 加权原子量（用于密度）
  // 无序结构处理（学习 Jmol/pymatgen 的成熟做法）：
  // 1. 剔除占有率极低的"噪声"位点（<10%，如 SrCl2 的 Cl 假位点）
  // 2. 同一位置（量化后相同）的不同元素合并为"混合位点"（如长石 Al/Si 无序、
  //    合金 Ag/Au 固溶体），取占位率最高的元素作为渲染主元素
  const OCCUPANCY_MIN = 0.1;
  for (const site of cif.sites) {
    const occ = site.occupancy ?? 1;
    if (occ < OCCUPANCY_MIN) continue;
    // 该 site 展开出的去重位置集合（加权计数 = occ × 位置数，与 pymatgen composition 同语义）
    const positions = new Set();
    for (const op of cif.ops) {
      const [x, y, z] = applySymOp(op, site.x, site.y, site.z);
      // 跨 [0,1) wrap 边界的同一位置须归并：量化后按桶数取模
      const qx = ((Math.round(x / Q) % QB) + QB) % QB;
      const qy = ((Math.round(y / Q) % QB) + QB) % QB;
      const qz = ((Math.round(z / Q) % QB) + QB) % QB;
      const pkey = `${qx}|${qy}|${qz}`;
      if (positions.has(pkey)) continue;
      positions.add(pkey);
      // 全局位置去重（不含元素 → 混合位点自动合并），主元素取占位率更高者
      const entry = seen.get(pkey);
      if (entry) {
        if (occ > entry.topOcc) { entry.topOcc = occ; entry.element = site.element; }
        continue;
      }
      seen.set(pkey, { topOcc: occ, element: site.element });
      atoms.push({
        idx: atoms.length,
        element: site.element,
        frac: [x, y, z],
        cart: fracToCart(M, x, y, z),
        siteIdx: site.label || site.element,
        occupancy: site.occupancy
      });
    }
    elCounts[site.element] = (elCounts[site.element] || 0) + occ * positions.size;
    massSum += elementOf(site.element).mass * occ * positions.size;
  }

  // ---------- 2. 超胞复制 ----------
  // 复制顺序保证前 len(atoms) 个为 (0,0,0) 晶胞（即"核心"原子）
  const all = [];
  for (const at of atoms) {
    for (let i = 0; i < supercell; i++) {
      for (let j = 0; j < supercell; j++) {
        for (let k = 0; k < supercell; k++) {
          all.push(makeAtom(at, M, i, j, k));
        }
      }
    }
  }
  // 单晶胞显示时补齐边界原子（Diamond 晶胞渲染惯例）：
  // 晶胞内容按占位加权计数（角=1/8、棱=1/4、面=1/2），但渲染时每个
  // 顶点/棱心/面心都要可见 —— 对 frac 分量为 0 的原子生成 {0,1} 组合副本
  // （如 NaCl：8 角 Na + 6 面心 Na + 12 棱心 Cl + 1 体心 Cl = 27 个可见原子）
  if (supercell === 1 && options.renderBoundary !== false) {
    for (const at of atoms) {
      const zeroIdx = [0, 1, 2].filter(i => Math.abs(at.frac[i]) < 1e-6);
      const n = zeroIdx.length;
      for (let mask = 1; mask < (1 << n); mask++) {
        const f = [...at.frac];
        for (let b = 0; b < n; b++) {
          if (mask & (1 << b)) f[zeroIdx[b]] += 1;
        }
        const copy = makeAtom({ ...at, frac: f }, M, 0, 0, 0);
        copy.boundary = true; // 边界副本（不参与计数/标签）
        all.push(copy);
      }
    }
  }
  for (let i = 0; i < all.length; i++) all[i].idx = i;

  // ---------- 3. 成键（双轨制）----------
  //  - neighbors（周期完整）：环绕最近镜像 + 方向去重——供配位数统计、
  //    多面体顶点、原子详情（物理配位数，如 NaCl 角原子 6 配位）
  //  - bonds（绘制）：可见键——1³ 晶胞视图只画两端都在可见范围的键
  //    （向晶胞外延伸的键不画，与 Diamond 晶胞显示一致）；超胞视图
  //    画跨边界键（环绕成键，两端都在超胞范围内）
  const bonds = [];
  const neighbors = new Map(); // idx → [{idx, dist, off}]

  // 成键判据（Diamond 风格的距离判据，分元素对处理）：
  //  - 异元素对（至少一方非金属）：共价半径和 × factor + offset（离子键通常略长于共价半径和）
  //  - 同元素对：×1.05 + 0.05，保证金属（Cu-Cu 2.56、Fe-Fe 2.48）、共价（C-C 1.54）
  //    与类金属（Si-Si 2.35）键正常识别；但离子晶体中阳离子-阳离子（NaCl 的 Na-Na 3.86 Å、
  //    萤石 Ca-Ca 3.72 Å）不是键——碱金属/碱土在库内无单质条目，故同元素判据收紧
  //  - 金属-金属异元素对：离子晶体中阳离子-阳离子（如钙钛矿 Ca-Ti 3.29 Å、沸石 Si-Na 3.0 Å）
  //    不是化学键，但合金（Cu-Zn）需要保留，故用收紧判据折中
  //    注：Si 归入"金属"侧以收紧 Si-Na 等阳离子对；Si-O/Si-C 仍走宽松判据
  const NON_METALS = new Set(['H','He','B','C','N','O','F','Ne','P','S','Cl',
    'Ar','Se','Br','Kr','I','Xe','At','Rn']);
  const IONIC_SAME = new Set(['Li','Na','K','Rb','Cs','Mg','Ca','Sr','Ba']); // 库内无单质的碱/碱土（Mg 单质键 3.2 略牺牲）
  function cutoff(e1, e2) {
    if (e1 === e2) {
      const e = elementOf(e1);
      // 离子晶体同元素（阳离子-阳离子）判据收紧：NaCl Na-Na 3.86、
      // CsCl Cs-Cs 4.12、MgO Mg-Mg 2.98、萤石 Ca-Ca 3.72 均非键，
      // 用 cov×1.6 + 0.05（离子间距通常大于共价半径和的 1.6 倍）
      if (IONIC_SAME.has(e1)) return e.cov * 1.6 + 0.05;
      return e.cov * 2 * 1.05 + 0.05;
    }
    const m1 = NON_METALS.has(e1), m2 = NON_METALS.has(e2);
    if (!m1 && !m2) return (elementOf(e1).cov + elementOf(e2).cov) * 0.95 + 0.05;
    return (elementOf(e1).cov + elementOf(e2).cov) * bondFactor + bondOffset;
  }

  const N = supercell;
  // 以晶胞为单位分桶，邻居只可能是 ±1 晶胞内的原子
  const buckets = new Map();
  const bkey = (x, y, z) => `${x},${y},${z}`;
  for (const at of all) {
    const k = bkey(at.cx, at.cy, at.cz);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(at);
  }
  // 位置 → 实例映射（物理端点环绕后匹配实际原子，供邻居记录）
  const posMap = new Map();
  for (const a of all) {
    const k = `${Math.round(a.frac[0] / Q)}|${Math.round(a.frac[1] / Q)}|${Math.round(a.frac[2] / Q)}`;
    if (!posMap.has(k)) posMap.set(k, a.idx);
  }

  // 最近邻距离 + 填充缩放系数：
  //  - at.nn = 每个原子的最近邻距离（±1 晶胞分桶搜索，跳过 <0.01Å 自身镜像）；
  //  - fillScale = min(原子对距离 / 共价半径和)——空间填充等比缩放到最紧对相切。
  let fillScale = Infinity;
  for (const at of all) {
    let best = Infinity;
    const [cx0, cy0, cz0] = [at.cx, at.cy, at.cz];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const wx = ((cx0 + dx) % N + N) % N;
          const wy = ((cy0 + dy) % N + N) % N;
          const wz = ((cz0 + dz) % N + N) % N;
          const bucket = buckets.get(bkey(wx, wy, wz));
          if (!bucket) continue;
          const off = [dx - (wx - cx0), dy - (wy - cy0), dz - (wz - cz0)];
          for (const b of bucket) {
            if (b.idx === at.idx) continue;
            const dfx = b.frac[0] + off[0] - at.frac[0];
            const dfy = b.frac[1] + off[1] - at.frac[1];
            const dfz = b.frac[2] + off[2] - at.frac[2];
            const d = Math.sqrt(
              (dfx * M[0] + dfy * M[1] + dfz * M[2]) ** 2 +
              (dfx * M[3] + dfy * M[4] + dfz * M[5]) ** 2 +
              (dfx * M[6] + dfy * M[7] + dfz * M[8]) ** 2
            );
            // 跳过自身周期镜像（1³ 的边界副本与内容原子互为 ±1 晶胞镜像，
            // 距离为 0 但不是另一个原子；与成键的 dist<0.01 保护同理）
            if (d < 0.01) continue;
            if (d < best) best = d;
            // 填充缩放：所有原子等比缩放（保持相对大小）直到最紧的一对恰好相切。
            // s = min(原子对距离 / 共价半径和) —— 保证任意两球 r_i+r_j ≤ d_ij 绝不穿模，
            // 且达到最大贴合（最紧对相切）。NaCl：Na-Cl 对 2.727/2.68 → s≈1.02，
            // Na=1.69、Cl=1.04 相切（硬球 min(nn/2) 会把两者压成一样大）。
            const rSum = elementOf(at.element).cov + elementOf(b.element).cov;
            if (rSum > 0) {
              const ratio = d / rSum;
              if (ratio < fillScale) fillScale = ratio;
            }
          }
        }
      }
    }
    at.nn = best;
  }

  // ---- A. neighbors：环绕成键（所有渲染原子中心，物理位置去重）----
  // 配位数 = 与该原子**连键**的原子中，**键长最短壳层**的数量：
  // 先收集 cutoff 判据内的连键伙伴（最小镜像、物理位置去重、排除自身），
  // 再只保留 dist ≤ minD × 1.07（相对容差）的最短键长层。
  // 例：bcc Fe 角/体心 = 8（排除 15.5% 更长的第二壳 2.81Å）；
  //     正长石 K = 10（2.72–2.88Å 的第一配位壳，2.95Å 起是下一层）。
  // 补边副本也参与（同环境同配位）。多面体走独立的 computeCoordPolyhedra。
  for (const at of all) {
    const nl = [];
    const seenPos = new Set();
    const [cx0, cy0, cz0] = [at.cx, at.cy, at.cz];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const wx = ((cx0 + dx) % N + N) % N;
          const wy = ((cy0 + dy) % N + N) % N;
          const wz = ((cz0 + dz) % N + N) % N;
          const bucket = buckets.get(bkey(wx, wy, wz));
          if (!bucket) continue;
          const off = [dx - (wx - cx0), dy - (wy - cy0), dz - (wz - cz0)];
          for (const b of bucket) {
            if (b.idx === at.idx) continue;
            const dfx = b.frac[0] + off[0] - at.frac[0];
            const dfy = b.frac[1] + off[1] - at.frac[1];
            const dfz = b.frac[2] + off[2] - at.frac[2];
            const dxc = dfx * M[0] + dfy * M[1] + dfz * M[2];
            const dyc = dfx * M[3] + dfy * M[4] + dfz * M[5];
            const dzc = dfx * M[6] + dfy * M[7] + dfz * M[8];
            const dist = Math.sqrt(dxc * dxc + dyc * dyc + dzc * dzc);
            if (dist < 0.01 || dist >= cutoff(at.element, b.element)) continue;
            // 物理邻居位置（中心 + 位移），同一周期镜像去重
            const px = at.cart[0] + dxc, py = at.cart[1] + dyc, pz = at.cart[2] + dzc;
            const pk = `${Math.round(px * 1000)}|${Math.round(py * 1000)}|${Math.round(pz * 1000)}`;
            if (seenPos.has(pk)) continue;
            seenPos.add(pk);
            nl.push({ idx: b.idx, dist, off: [off[0], off[1], off[2]] });
          }
        }
      }
    }
    if (nl.length) {
      let minD = Infinity;
      for (const n of nl) if (n.dist < minD) minD = n.dist;
      neighbors.set(at.idx, nl.filter((n) => n.dist <= minD * SHELL_FACTOR));
    }
  }

  // ---- B. bonds：绘制键 ----
  if (N === 1) {
    // 1³ 晶胞视图：所有原子对（内容+边界副本）直接距离成键——
    // 向晶胞外延伸的键（物理端点无实例）自然排除；边界原子之间的键保留
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i], b = all[j];
        const dx = b.cart[0] - a.cart[0];
        const dy = b.cart[1] - a.cart[1];
        const dz = b.cart[2] - a.cart[2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 0.01 || dist >= cutoff(a.element, b.element)) continue;
        bonds.push({
          a: i, b: j,
          ax: a.cart[0], ay: a.cart[1], az: a.cart[2],
          bx: b.cart[0], by: b.cart[1], bz: b.cart[2],
          dist
        });
      }
    }
  } else {
    // 超胞视图：环绕成键（每原子对最近镜像），跨边界键两端都在超胞内
    const pairMin = new Map(); // `${a}|${b}` → {dist, dxc, dyc, dzc, dx, dy, dz}
    for (const at of all) {
      const [cx0, cy0, cz0] = [at.cx, at.cy, at.cz];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const wx = ((cx0 + dx) % N + N) % N;
            const wy = ((cy0 + dy) % N + N) % N;
            const wz = ((cz0 + dz) % N + N) % N;
            const bucket = buckets.get(bkey(wx, wy, wz));
            if (!bucket) continue;
            const off = [dx - (wx - cx0), dy - (wy - cy0), dz - (wz - cz0)];
            for (const b of bucket) {
              if (b.idx <= at.idx) continue;
              const dfx = b.frac[0] + off[0] - at.frac[0];
              const dfy = b.frac[1] + off[1] - at.frac[1];
              const dfz = b.frac[2] + off[2] - at.frac[2];
              const dxc = dfx * M[0] + dfy * M[1] + dfz * M[2];
              const dyc = dfx * M[3] + dfy * M[4] + dfz * M[5];
              const dzc = dfx * M[6] + dfy * M[7] + dfz * M[8];
              const dist = Math.sqrt(dxc * dxc + dyc * dyc + dzc * dzc);
              if (dist < 0.01) continue;
              const key = `${at.idx}|${b.idx}`;
              const cur = pairMin.get(key);
              if (!cur || dist < cur.dist) {
                pairMin.set(key, { dist, dxc, dyc, dzc, dx: off[0], dy: off[1], dz: off[2] });
              }
            }
          }
        }
      }
    }
    const bondSet = new Set(); // 环绕端点去重（同一物理键只画一条）
    for (const [key, p] of pairMin) {
      const [ai, bi] = key.split('|').map(Number);
      const a = all[ai], b = all[bi];
      if (p.dist >= cutoff(a.element, b.element)) continue;
      // 物理端点越过超胞外壁（off ≠ 0 = 最小镜像跨盒壁）的键不画：
      // 与 1³ 晶胞视图一致——向晶胞外延伸的键不用画（Diamond 断裂键的简化）
      if (p.dx !== 0 || p.dy !== 0 || p.dz !== 0) continue;
      // 端点环绕 [0,N) 规范化：同一物理键的跨边界表示合并
      const nf = (v) => ((v % N) + N) % N;
      const e1 = `${nf(a.frac[0]).toFixed(3)}|${nf(a.frac[1]).toFixed(3)}|${nf(a.frac[2]).toFixed(3)}`;
      const e2 = `${nf(b.frac[0] + p.dx).toFixed(3)}|${nf(b.frac[1] + p.dy).toFixed(3)}|${nf(b.frac[2] + p.dz).toFixed(3)}`;
      const gkey = e1 < e2 ? e1 + '|' + e2 : e2 + '|' + e1;
      if (bondSet.has(gkey)) continue;
      bondSet.add(gkey);
      bonds.push({
        a: ai, b: bi,
        ax: a.cart[0], ay: a.cart[1], az: a.cart[2],
        bx: a.cart[0] + p.dxc, by: a.cart[1] + p.dyc, bz: a.cart[2] + p.dzc,
        dist: p.dist
      });
    }
  }

  // ---------- 4. 物性统计 ----------
  // counts / massSum 已在对称展开循环内按占位率加权累计（对齐 pymatgen composition）
  const counts = elCounts;
  const density = volume > 0 ? (massSum / 0.60221) / volume : 0; // g/cm³

  return {
    id: cif.id,
    cell, matrix: M, volume,
    atoms: all,
    bonds,
    neighbors,
    supercell: N,
    counts,          // 晶胞内元素计数（占有率加权）
    density,
    fillScale: isFinite(fillScale) && fillScale > 0 ? fillScale : 1, // 填充等比缩放系数
    Z: cif.Z ?? 1,
    cif
  };
}

/**
 * 配位多面体计算（用户定义的"空隙查找"正确逻辑）：
 * 以每个**阳离子**为中心，枚举它周围所有阴离子在 ±1 晶胞的镜像
 * （同一物理位置去重，保证 +x 与 -x 两个方向的最近阴离子都算），
 * 只取**距离最短的那一层**（同距并列全要，远一点都不算），
 * 对这些"最近阴离子"做凸包 → 该阳离子的配位多面体。
 * 返回 [{x,y,z,element,cn,dist,verts:[{x,y,z}...]}]（笛卡尔坐标，Å）。
 * 例：NaCl 的 Na⁺ 有 6 个等距 Cl⁻ → 正八面体；CsCl 的 Cs⁺ 有 8 个等距 Cl⁻ → 立方体；
 * 石英 Si⁴⁺ 有 4 个等距 O²⁻ → 正四面体。边界副本（1³ 补边）不作为中心。
 */
export function computeCoordPolyhedra(crystal, opts = {}) {
  const M = crystal.matrix;
  const minVerts = opts.minVerts ?? 4;    // 至少 4 个不共面顶点才能成多面体
  const maxPoly = opts.maxPoly ?? 600;
  const NON_METALS = new Set(['H','He','B','C','N','O','F','Ne','P','S','Cl',
    'Ar','Se','Br','Kr','I','Xe','At','Rn']);
  const isCation = (el) => !NON_METALS.has(el);
  const isAnion = (el) => NON_METALS.has(el);
  const out = [];
  for (const c of crystal.atoms) {
    // 所有渲染的阳离子都要有完整多面体（含 1³ 补边副本：角/面上的 Na 中心
    // 照画完整八面体——渲染语义 = 8 角 + 6 面 = 14，而非晶体学截取 8×1/8+…=4）
    if (!isCation(c.element)) continue;    // 只以阳离子为中心
    const seen = new Set();                // 按物理位置去重（周期镜像/补边副本合并）
    const shell = [];
    let minD = Infinity;
    for (const a of crystal.atoms) {
      if (!isAnion(a.element)) continue;
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          for (let dk = -1; dk <= 1; dk++) {
            // 阴离子在"阳离子所在晶胞 ±1"的镜像（绝对分数坐标）
            const fx = a.frac[0] + (c.cx - a.cx + di);
            const fy = a.frac[1] + (c.cy - a.cy + dj);
            const fz = a.frac[2] + (c.cz - a.cz + dk);
            const dfx = c.frac[0] - fx, dfy = c.frac[1] - fy, dfz = c.frac[2] - fz;
            const dx = dfx * M[0] + dfy * M[1] + dfz * M[2];
            const dy = dfx * M[3] + dfy * M[4] + dfz * M[5];
            const dz = dfx * M[6] + dfy * M[7] + dfz * M[8];
            const x = c.cart[0] - dx, y = c.cart[1] - dy, z = c.cart[2] - dz;
            const key = `${Math.round(x * 1000)}|${Math.round(y * 1000)}|${Math.round(z * 1000)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (d < minD) minD = d;
            shell.push({ x, y, z, d, element: a.element });
          }
        }
      }
    }
    if (minD === Infinity) continue;       // 无阴离子（单质/共价物）→ 不多面体
    // 只取"最短键长壳层"：dist ≤ minD × SHELL_FACTOR（同距并列全要，远一点不算）
    const verts = shell
      .filter((s) => s.d <= minD * SHELL_FACTOR)
      .map((s) => ({ x: s.x, y: s.y, z: s.z, element: s.element }));
    if (verts.length < minVerts) continue;
    if (out.length >= maxPoly) break;
    out.push({
      x: c.cart[0], y: c.cart[1], z: c.cart[2],
      element: c.element,
      cn: verts.length,
      dist: minD,
      verts
    });
  }
  return out;
}

function makeAtom(src, M, cx, cy, cz) {
  const fx = src.frac[0] + cx, fy = src.frac[1] + cy, fz = src.frac[2] + cz;
  return {
    idx: -1,
    element: src.element,
    frac: [fx, fy, fz],
    cart: fracToCart(M, fx, fy, fz),
    cx, cy, cz,
    occupancy: src.occupancy,
    siteIdx: src.siteIdx
  };
}
