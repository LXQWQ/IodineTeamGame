/* ============================================================
 * 碳链工坊 · Chain Craft  v2 —— 纯逻辑层（无 DOM，可 Node 测试）
 * 分子状态模型 + 12 条真实有机反应 + 关卡 + BFS 最优路径
 * ============================================================ */

class MoleculeState {
  constructor(carbonCount = 1, functionalGroups = [], unsaturation = [], rings = [], chirality = null, stereochemistry = 'R') {
    this.carbonCount = carbonCount;
    this.functionalGroups = [...functionalGroups];
    this.unsaturation = [...unsaturation];
    this.rings = [...rings];
    this.chirality = chirality;
    this.stereochemistry = stereochemistry;
  }
  clone() {
    return new MoleculeState(this.carbonCount, [...this.functionalGroups], [...this.unsaturation],
      [...this.rings], this.chirality, this.stereochemistry);
  }
  key() {
    return [this.carbonCount, [...this.functionalGroups].sort().join(','),
      [...this.unsaturation].sort().join(','), [...this.rings].sort().join(','),
      this.chirality || '', this.stereochemistry].join('|');
  }
  equals(o) {
    return !!o && this.key() === o.key();
  }
  has(g) { return this.functionalGroups.includes(g); }
  add(g) { if (!this.functionalGroups.includes(g)) this.functionalGroups.push(g); return this; }
  remove(g) {
    const i = this.functionalGroups.indexOf(g);
    if (i >= 0) this.functionalGroups.splice(i, 1);
    return this;
  }
  hasCarbonyl() { return this.has('=O') || this.has('-CHO') || this.has('-COOH') || this.has('-COO-'); }
  hasHydroxyl() { return this.has('-OH'); }
  hasCarboxyl() { return this.has('-COOH'); }
  hasEster() { return this.has('-COO-'); }
  hasEther() { return this.has('-O-'); }
  hasAlphaHydrogen() {
    if (!this.hasCarbonyl() || this.carbonCount < 2) return false;
    return this.functionalGroups.length < this.carbonCount;
  }
  hasConjugatedDiene() {
    return this.unsaturation.length >= 2 && this.carbonCount >= 4;
  }
  /* 便于阅读的分子式摘要：C4 -OH 1双键 */
  getDescription() {
    const p = ['C' + this.carbonCount];
    if (this.rings.length) p.push(this.rings.join('/'));
    if (this.functionalGroups.length) p.push(this.functionalGroups.join(' '));
    if (this.unsaturation.length) p.push(this.unsaturation.length + '×双键');
    if (this.chirality) p.push(this.chirality + '-' + this.stereochemistry);
    return p.join(' · ');
  }
  /* 语义化中文名（尽量贴近真实命名，用于展示） */
  getName() {
    const n = this.carbonCount;
    const stem = ['', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'][n] || ('C' + n);
    const has = this.has.bind(this);
    if (has('-COO-')) return stem + '酸酯';
    if (has('-X')) return '卤代' + stem + '烷';
    if (has('-COOH') && this.unsaturation.length) return stem + '烯酸';
    if (has('-COOH')) return stem + '酸';
    if (has('-CHO') && has('-OH')) return '羟基' + stem + '醛';
    if (has('-CHO')) return stem + '醛';
    if (has('=O') && has('-OH')) return '羟基' + stem + '酮';
    if (has('=O')) return stem + '酮';
    if (has('-O-')) return '二' + stem + '醚';
    if (has('-OH')) return stem + '醇';
    if (this.rings.length) return stem + '环烃';
    if (this.unsaturation.length) return stem + '烯';
    return stem + '烷';
  }
}

/* ---------------- 反应库：12 条真实有机反应 ---------------- */
const REACTIONS = [
  {
    id: 'grignard', name: 'Grignard 加成', emoji: '🧪', cat: '增碳',
    eq: 'R-MgX + C=O → R–C(OH)R′',
    short: '+2C　羰基→羟基',
    desc: '格氏试剂进攻羰基，碳链延长 2 个碳并生成醇。所有增碳反应里最直接的一步。',
    check: m => m.hasCarbonyl() && m.carbonCount >= 2,
    why: m => m.hasCarbonyl() ? '需要至少 2 个碳' : '分子缺少羰基（C=O / -CHO / -COOH）',
    apply: m => {
      const r = m.clone();
      r.carbonCount += 2;
      r.remove('=O').remove('-CHO').remove('-COOH');
      r.add('-OH');
      return r;
    }
  },
  {
    id: 'aldol', name: 'Aldol 缩合', emoji: '🔗', cat: '增碳',
    eq: '2 × 羰基化合物 → β-羟基羰基',
    short: 'C×2　+OH +C=O',
    desc: '含 α-H 的羰基化合物自缩合，碳数翻倍并同时引入羟基与羰基。',
    check: m => m.hasAlphaHydrogen() && m.carbonCount >= 2 && m.carbonCount * 2 <= 16,
    why: m => (!m.hasCarbonyl() ? '分子缺少羰基' : (m.carbonCount * 2 > 16 ? '翻倍后碳数超过 16，链太长了' : '缺少 α-氢（官能团已占满碳位）')),
    apply: m => {
      const r = m.clone();
      r.carbonCount *= 2;
      r.add('-OH').add('=O');
      return r;
    }
  },
  {
    id: 'williamson', name: 'Williamson 成醚', emoji: '🔗', cat: '增碳',
    eq: 'R-OH + R′-X → R-O-R′',
    short: '+2C　-OH→-O-',
    desc: '醇钠与卤代烃发生 SN2，把羟基变成醚键并延长碳链。',
    check: m => m.hasHydroxyl(),
    why: () => '需要羟基 -OH',
    apply: m => {
      const r = m.clone();
      r.carbonCount += 2;
      r.remove('-OH').add('-O-');
      return r;
    }
  },
  {
    id: 'reduction', name: 'NaBH₄ 还原', emoji: '⬇️', cat: '官能团',
    eq: 'C=O → CH-OH',
    short: '-C=O → -OH',
    desc: '硼氢化钠选择性还原羰基为醇，不攻击碳碳双键。',
    check: m => m.hasCarbonyl() && !m.has('-COO-'),
    why: m => (m.has('-COO-') ? '酯基对 NaBH₄ 不敏感' : '分子缺少可还原的羰基'),
    apply: m => {
      const r = m.clone();
      r.remove('=O').remove('-CHO').remove('-COOH').add('-OH');
      return r;
    }
  },
  {
    id: 'oxidation', name: 'PCC 氧化', emoji: '⬆️', cat: '官能团',
    eq: 'CH-OH → C=O',
    short: '-OH → -C=O',
    desc: '温和氧化剂把伯/仲醇氧化成醛或酮，停在羰基不再过度氧化。',
    check: m => m.hasHydroxyl(),
    why: () => '需要羟基 -OH',
    apply: m => {
      const r = m.clone();
      r.remove('-OH').add('=O');
      return r;
    }
  },
  {
    id: 'esterification', name: '酯化', emoji: '💧', cat: '官能团',
    eq: 'R-COOH + R′-OH → R-COO-R′ + H₂O',
    short: '-COOH + -OH → -COO-',
    desc: '羧酸与醇在酸催化下脱水成酯，需要分子里同时具备羧基与羟基。',
    check: m => m.hasCarboxyl() && m.hasHydroxyl(),
    why: m => (m.hasCarboxyl() ? '缺少羟基 -OH' : '缺少羧基 -COOH'),
    apply: m => {
      const r = m.clone();
      r.remove('-COOH').remove('-OH').add('-COO-');
      return r;
    }
  },
  {
    id: 'ether_hydrolysis', name: '醚水解', emoji: '🔨', cat: '减碳',
    eq: 'R-O-R′ + H₂O → 2 R-OH',
    short: '-O- → -OH　碳分家',
    desc: '强酸加热使醚键断裂，碳链一分为二并各自带羟基。',
    check: m => m.hasEther(),
    why: () => '需要醚键 -O-',
    apply: m => {
      const r = m.clone();
      r.remove('-O-').add('-OH');
      r.carbonCount = Math.max(1, Math.round(r.carbonCount / 2));
      return r;
    }
  },
  {
    id: 'diels_alder', name: 'Diels-Alder', emoji: '⭕', cat: '成环',
    eq: '共轭二烯 + 亲双烯体 → 六元环',
    short: '成环　C1=C2,C3=C4 → 环',
    desc: '协同环加成，一次成环并消耗两处双键，是构建六元环的经典手法。',
    check: m => m.hasConjugatedDiene(),
    why: m => (m.unsaturation.length < 2 ? '需要两处共轭双键' : '碳数至少 4'),
    apply: m => {
      const r = m.clone();
      r.unsaturation.splice(0, 2);
      r.carbonCount += 2;
      r.add('-OH');
      if (!r.rings.includes('六元环')) r.rings.push('六元环');
      return r;
    }
  },
  {
    id: 'hydrogenation', name: 'H₂/Pd 加氢', emoji: '⚗️', cat: '还原',
    eq: 'C=C + H₂ → CH-CH',
    short: '双键 −1',
    desc: '催化加氢把碳碳双键饱和成单键，是判断不饱和度的照妖镜。',
    check: m => m.unsaturation.length > 0,
    why: () => '分子没有碳碳双键',
    apply: m => {
      const r = m.clone();
      r.unsaturation.splice(0, 1);
      return r;
    }
  },
  {
    id: 'hydration', name: '加水（烯→醇）', emoji: '💦', cat: '官能团',
    eq: 'C=C + H₂O → CH-OH',
    short: '双键 −1　+OH',
    desc: '酸催化水合，把双键一处碳加上羟基，马氏加成。',
    check: m => m.unsaturation.length > 0,
    why: () => '分子没有碳碳双键',
    apply: m => {
      const r = m.clone();
      r.unsaturation.splice(0, 1);
      r.add('-OH');
      return r;
    }
  },
  {
    id: 'dehydration', name: '脱水（醇→烯）', emoji: '🔥', cat: '官能团',
    eq: 'CH-OH → C=C + H₂O',
    short: '-OH → 双键 +1',
    desc: '浓硫酸加热脱水，羟基与 β-氢成水，留下碳碳双键。',
    check: m => m.hasHydroxyl() && m.carbonCount >= 2,
    why: m => (m.hasHydroxyl() ? '碳数至少 2' : '需要羟基 -OH'),
    apply: m => {
      const r = m.clone();
      r.remove('-OH');
      r.unsaturation.push('C' + r.carbonCount + '=C' + (r.carbonCount + 1));
      return r;
    }
  },
  {
    id: 'jones', name: 'Jones 强氧化', emoji: '🧯', cat: '官能团',
    eq: 'R-CH₂OH → R-COOH',
    short: '-OH → -COOH',
    desc: '琼斯试剂把伯醇一路氧化到羧酸，不会停在醛上。想拿到羧基，这就是最快的路。',
    check: m => m.hasHydroxyl(),
    why: () => '需要羟基 -OH',
    apply: m => {
      const r = m.clone();
      r.remove('-OH').add('-COOH');
      return r;
    }
  },
  {
    id: 'aldehyde_ox', name: '醛氧化成酸', emoji: '🧫', cat: '官能团',
    eq: 'R-CHO + [O] → R-COOH',
    short: '-CHO → -COOH',
    desc: '温和氧化把醛基变成羧基，碳数不变，是拿到羧酸的另一条路。',
    check: m => m.has('-CHO'),
    why: () => '需要醛基 -CHO',
    apply: m => {
      const r = m.clone();
      r.remove('-CHO').add('-COOH');
      return r;
    }
  },
  {
    id: 'halogenation', name: '光照卤代', emoji: '💡', cat: '取代',
    eq: 'R-H + X₂ --hν--> R-X + HX',
    short: '烷 → 卤代烃（+X）',
    desc: '自由基取代：饱和碳上接一个卤素，为后续水解成醇、再氧化打开通路。',
    check: m => m.unsaturation.length === 0 && !m.has('-X'),
    why: m => (m.has('-X') ? '已经带有卤素' : '需要饱和碳（无碳碳双键）'),
    apply: m => {
      const r = m.clone();
      r.add('-X');
      return r;
    }
  },
  {
    id: 'hydrolysis_x', name: '卤代烃水解', emoji: '💧', cat: '取代',
    eq: 'R-X + NaOH(aq) → R-OH',
    short: '-X → -OH',
    desc: '亲核取代把卤素换成羟基，是从烷烃跳回醇类的桥。',
    check: m => m.has('-X'),
    why: () => '需要卤素 -X',
    apply: m => {
      const r = m.clone();
      r.remove('-X').add('-OH');
      return r;
    }
  },
  {
    id: 'decarboxylation', name: '加热脱羧', emoji: '♨️', cat: '减碳',
    eq: 'R-COOH → R-H + CO₂',
    short: '-COOH　碳 −1',
    desc: '羧酸受热脱去二氧化碳，碳链缩短一个碳。',
    check: m => m.hasCarboxyl() && m.carbonCount >= 2,
    why: m => (m.hasCarboxyl() ? '碳数至少 2' : '需要羧基 -COOH'),
    apply: m => {
      const r = m.clone();
      r.remove('-COOH');
      r.carbonCount -= 1;
      return r;
    }
  },
];

const CARBON_MAX = 16;
const RXN_MAP = new Map(REACTIONS.map(r => [r.id, r]));

/* ---------------- 关卡：12 关，难度递增 ---------------- */
const LEVELS = [
  {
    id: 1, tier: '入门', title: '醇的延长', goal: '把 2 个碳的醇延长到 4 个碳的醇',
    start: new MoleculeState(2, ['-OH']),
    target: new MoleculeState(4, ['-OH']),
    hint: 'Grignard 加成能一次加 2 个碳，是延长碳链的捷径。'
  },
  {
    id: 2, tier: '入门', title: '醛到醇', goal: '把醛还原成同碳数的醇',
    start: new MoleculeState(2, ['-CHO']),
    target: new MoleculeState(2, ['-OH']),
    hint: 'NaBH₄ 只还原羰基，不动碳链。'
  },
  {
    id: 3, tier: '入门', title: '氧化还原对', goal: '把丙醇氧化成丙酮',
    start: new MoleculeState(3, ['-OH']),
    target: new MoleculeState(3, ['=O']),
    hint: 'PCC：-OH → C=O，一步到位不串味。'
  },
  {
    id: 4, tier: '进阶', title: '翻倍再用', goal: '从 2 碳醇造出 6 碳醇',
    start: new MoleculeState(2, ['-OH']),
    target: new MoleculeState(6, ['-OH']),
    hint: '先 Aldol 把碳数翻倍，再 Grignard 补一次。注意 Aldol 会带来多余的羰基。'
  },
  {
    id: 5, tier: '进阶', title: '醚的分家', goal: '把醚拆成短链醇',
    start: new MoleculeState(4, ['-O-']),
    target: new MoleculeState(2, ['-OH']),
    hint: '醚水解会把碳链一分为二。'
  },
  {
    id: 6, tier: '进阶', title: '成环', goal: '用共轭二烯做一次环加成',
    start: new MoleculeState(4, [], ['C1=C2', 'C3=C4']),
    target: new MoleculeState(6, ['-OH'], [], ['六元环']),
    hint: 'Diels-Alder 需要两处共轭双键，一次成环并消耗它们。'
  },
  {
    id: 7, tier: '高级', title: '酯的拼装', goal: '从 2 碳醇做出 4 碳酯',
    start: new MoleculeState(2, ['-OH']),
    target: new MoleculeState(4, ['-COO-']),
    hint: 'Grignard 延长碳链 → 氧化出羰基 → 再想办法凑齐羧基与羟基才能酯化。'
  },
  {
    id: 8, tier: '高级', title: '不饱和的反复', goal: '把不饱和醇变成饱和酮',
    start: new MoleculeState(4, ['-OH'], ['C1=C2']),
    target: new MoleculeState(4, ['=O']),
    hint: '先处理双键：加氢或水合都可以，但要数清楚碳数和官能团。'
  },
  {
    id: 9, tier: '高级', title: '减碳', goal: '把 5 碳羧酸缩短到 4 碳酮',
    start: new MoleculeState(5, ['-COOH']),
    target: new MoleculeState(4, ['=O']),
    hint: '脱羧减一个碳，再把羧基变成羰基。'
  },
  {
    id: 10, tier: '大师', title: '长链成酯', goal: '从 2 碳醇造出 6 碳酯',
    start: new MoleculeState(2, ['-OH']),
    target: new MoleculeState(6, ['-COO-']),
    hint: 'Jones 先把醇推向羧酸；Aldol 一次就能同时带来羟基和羰基——两个官能团凑齐才能酯化。'
  },
  {
    id: 11, tier: '大师', title: '环上挂羟基', goal: '把 4 碳二烯做成 8 碳环醇',
    start: new MoleculeState(4, [], ['C1=C2', 'C3=C4']),
    target: new MoleculeState(8, ['-OH'], [], ['六元环']),
    hint: '先成环，再考虑是否需要额外补碳。'
  },
  {
    id: 12, tier: '大师', title: '终局：环酯', goal: '从 4 碳二烯造出带环的酯',
    start: new MoleculeState(4, [], ['C1=C2', 'C3=C4']),
    target: new MoleculeState(6, ['-COO-'], [], ['六元环']),
    hint: '成环后碳数已经够，把官能团一步步推向酯基。'
  },
];

/* ---------------- BFS 最优路径 ---------------- */
function findOptimalPath(startMol, targetMol, maxDepth = 6) {
  if (startMol.equals(targetMol)) return [];
  const seen = new Set([startMol.key()]);
  const q = [{ mol: startMol.clone(), path: [] }];
  while (q.length) {
    const { mol, path } = q.shift();
    if (path.length >= maxDepth) continue;
    for (const rxn of REACTIONS) {
      if (!rxn.check(mol)) continue;
      const next = rxn.apply(mol);
      if (next.carbonCount < 1 || next.carbonCount > CARBON_MAX) continue;
      const k = next.key();
      if (seen.has(k)) continue;
      seen.add(k);
      const p = [...path, rxn.id];
      if (next.equals(targetMol)) return p;
      q.push({ mol: next, path: p });
    }
  }
  return null;
}

const OPTIMAL_CACHE = new Map();
function optimalSteps(level) {
  if (OPTIMAL_CACHE.has(level.id)) return OPTIMAL_CACHE.get(level.id);
  const p = findOptimalPath(level.start, level.target, 6);
  const n = p ? p.length : null;
  OPTIMAL_CACHE.set(level.id, n);
  return n;
}

/* 浏览器端：class / const 是词法绑定，不会自动挂到 window，必须显式导出 */
if (typeof window !== 'undefined') {
  window.MoleculeState = MoleculeState;
  window.REACTIONS = REACTIONS;
  window.RXN_MAP = RXN_MAP;
  window.LEVELS = LEVELS;
  window.CARBON_MAX = CARBON_MAX;
  window.findOptimalPath = findOptimalPath;
  window.optimalSteps = optimalSteps;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MoleculeState, REACTIONS, RXN_MAP, LEVELS, CARBON_MAX, findOptimalPath, optimalSteps };
}
