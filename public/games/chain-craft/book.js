/* ============================================================
 * 碳链工坊 · 教材主线（Book Campaign）
 * ------------------------------------------------------------
 * 一本书 = 一条主线；书的每一章 = 游戏的一章；
 * 每章按该章知识点自动生成题目；上一章分数达标才能解锁下一章。
 *
 * 依赖 logic.js 暴露的 MoleculeState / REACTIONS / RXN_MAP /
 * CARBON_MAX / findOptimalPath（浏览器挂在 window，Node 走 require）。
 * ============================================================ */
(function (root) {
  'use strict';

  const MOL = root.MoleculeState;
  const REACTIONS = root.REACTIONS;
  const CARBON_MAX = root.CARBON_MAX || 16;
  const findOptimalPath = root.findOptimalPath;

  /* ============================================================
   * 一、扩展反应库（补足 Clayden 各章知识点）
   * ============================================================ */
  const EXTRA = [
    {
      id: 'hcn_add', name: 'HCN 加成', emoji: '🩸', cat: '增碳',
      eq: 'R₂C=O + HCN → R₂C(OH)CN',
      short: '+1C　羰基→羟腈',
      desc: '氰离子进攻羰基，得到羟腈（氰醇）。碳链延长 1 个碳，同时留下一个可水解的氰基。',
      check: m => m.hasCarbonyl() && m.carbonCount + 1 <= CARBON_MAX,
      why: () => '分子缺少羰基',
      apply: m => {
        const r = m.clone();
        r.carbonCount += 1;
        r.remove('=O').remove('-CHO');
        r.add('-OH').add('-CN');
        return r;
      }
    },
    {
      id: 'nitrile_hydro', name: '氰基水解', emoji: '💧', cat: '官能团',
      eq: 'R-CN + 2H₂O → R-COOH + NH₃',
      short: '-CN→-COOH',
      desc: '腈在酸性或碱性条件下水解成羧酸。这是把「多一个碳」永久装进碳链的办法。',
      check: m => m.has('-CN'),
      why: () => '需要氰基 -CN',
      apply: m => {
        const r = m.clone();
        r.remove('-CN').add('-COOH');
        return r;
      }
    },
    {
      id: 'imine', name: '亚胺缩合', emoji: '🔷', cat: '官能团',
      eq: 'R₂C=O + R′NH₂ → R₂C=NR′ + H₂O',
      short: 'C=O→C=N',
      desc: '伯胺与羰基缩合成亚胺（席夫碱）。pH 5 左右最快，太酸太碱都会停在半路。',
      check: m => m.has('=O') || m.has('-CHO'),
      why: () => '需要醛或酮的羰基',
      apply: m => {
        const r = m.clone();
        r.remove('=O').remove('-CHO').add('=N-');
        return r;
      }
    },
    {
      id: 'acetal', name: '缩醛保护', emoji: '🛡️', cat: '官能团',
      eq: 'R₂C=O + 2R′OH (H⁺) → R₂C(OR′)₂',
      short: 'C=O→缩醛',
      desc: '羰基与两分子醇在酸催化下生成缩醛，把羰基「藏起来」——它对碱和亲核试剂都稳定。',
      check: m => m.has('=O') || m.has('-CHO'),
      why: () => '需要醛或酮的羰基',
      apply: m => {
        const r = m.clone();
        r.remove('=O').remove('-CHO').add('缩醛');
        return r;
      }
    },
    {
      id: 'acetal_deprot', name: '缩醛脱保护', emoji: '🔓', cat: '官能团',
      eq: 'R₂C(OR′)₂ + H₂O (H⁺) → R₂C=O',
      short: '缩醛→C=O',
      desc: '稀酸水解把缩醛还原成羰基。合成上通常「保护—干活—脱保护」三步走。',
      check: m => m.has('缩醛'),
      why: () => '需要缩醛保护基',
      apply: m => {
        const r = m.clone();
        r.remove('缩醛').add('=O');
        return r;
      }
    },
    {
      id: 'epoxidation', name: '环氧化', emoji: '🔺', cat: '成环',
      eq: 'C=C + RCO₃H → 环氧化物',
      short: '双键→三元环',
      desc: '过氧酸把烯烃氧化成环氧化合物（mCPBA）。三元环张力大，是最听话的亲电试剂之一。',
      check: m => m.unsaturation.length > 0,
      why: () => '需要碳碳双键',
      apply: m => {
        const r = m.clone();
        r.unsaturation.pop();
        r.rings.push('三元环');
        return r;
      }
    },
    {
      id: 'epoxide_open', name: '环氧开环', emoji: '⭕', cat: '官能团',
      eq: '环氧化物 + Nu⁻ → 邻位官能化醇',
      short: '三元环→-OH',
      desc: '亲核试剂从背面进攻环氧化物，开环得到反式产物。酸性条件下亲核试剂进攻取代较多的碳。',
      check: m => m.rings.includes('三元环'),
      why: () => '需要三元环（环氧化物）',
      apply: m => {
        const r = m.clone();
        r.rings = r.rings.filter(x => x !== '三元环');
        r.add('-OH');
        return r;
      }
    },
    {
      id: 'e2', name: 'E2 消除', emoji: '💨', cat: '官能团',
      eq: 'R-CH₂-CH₂-X + Base → R-CH=CH₂',
      short: '-X　+双键',
      desc: '强碱夺 β-氢，卤代烃发生反式共平面消除，生成烯烃。和取代反应是一对冤家。',
      check: m => m.has('-X'),
      why: () => '需要离去基团 -X',
      apply: m => {
        const r = m.clone();
        r.remove('-X');
        r.unsaturation.push('C' + Math.max(1, r.carbonCount - 1) + '=C' + r.carbonCount);
        return r;
      }
    },
    {
      id: 'enolate_alkyl', name: '烯醇负离子烷基化', emoji: '✂️', cat: '增碳',
      eq: 'R-CO-CH₂⁻ + R′X → R-CO-CH₂R′',
      short: '+1C',
      desc: 'LDA 把酮变成烯醇负离子，再用卤代烃烷基化。这是定向增碳最常用的手法之一。',
      check: m => m.hasAlphaHydrogen() && m.carbonCount + 1 <= CARBON_MAX,
      why: m => (m.hasCarbonyl() ? '缺少 α-氢' : '分子缺少羰基'),
      apply: m => {
        const r = m.clone();
        r.carbonCount += 1;
        return r;
      }
    },
    {
      id: 'claisen', name: 'Claisen 缩合', emoji: '🧬', cat: '增碳',
      eq: '2 R-COOR′ → β-酮酯',
      short: 'C×2　+ =O',
      desc: '两分子酯在强碱下缩合，生成 β-酮酯。是合成乙酰乙酸、构建 1,3-二羰基体系的标准手法。',
      check: m => (m.has('-COO-') || m.has('-COOH')) && m.carbonCount * 2 <= CARBON_MAX,
      why: m => (m.has('-COO-') || m.has('-COOH') ? '翻倍后碳数超过上限' : '需要酯基或羧基'),
      apply: m => {
        const r = m.clone();
        r.carbonCount *= 2;
        r.add('=O');
        return r;
      }
    },
    {
      id: 'michael', name: 'Michael 共轭加成', emoji: '🌊', cat: '增碳',
      eq: 'R₂C=CH-C=O + Nu⁻ → 1,4-加成产物',
      short: '双键-1　+1C',
      desc: '亲核试剂加到 α,β-不饱和羰基的 β 位，双键消失、碳链延长——软亲核试剂偏爱 1,4-加成。',
      check: m => m.unsaturation.length > 0 && m.hasCarbonyl() && m.carbonCount + 1 <= CARBON_MAX,
      why: m => (!m.hasCarbonyl() ? '需要羰基（共轭受体）' : (m.unsaturation.length ? '碳数已达上限' : '需要碳碳双键')),
      apply: m => {
        const r = m.clone();
        r.unsaturation.pop();
        r.carbonCount += 1;
        return r;
      }
    },
    {
      id: 'nitration', name: '芳环硝化', emoji: '💥', cat: '取代',
      eq: 'Ar-H + HNO₃/H₂SO₄ → Ar-NO₂',
      short: '环上 -NO₂',
      desc: '混酸生成硝酰正离子，进攻芳环。苯环必须先有环，这是亲电芳香取代的第一课。',
      check: m => m.rings.length > 0 && !m.has('-NO2'),
      why: m => (m.rings.length ? '环上已有硝基' : '需要芳环（六元环）'),
      apply: m => {
        const r = m.clone();
        r.add('-NO2');
        return r;
      }
    },
    {
      id: 'clemmensen', name: 'Clemmensen 还原', emoji: '🔨', cat: '还原',
      eq: 'R₂C=O + Zn(Hg)/HCl → R₂CH₂',
      short: 'C=O→CH₂',
      desc: '锌汞齐在浓盐酸里把羰基彻底还原成亚甲基，一步「抹掉」羰基。',
      check: m => m.has('=O') || m.has('-CHO'),
      why: () => '需要醛或酮的羰基',
      apply: m => {
        const r = m.clone();
        r.remove('=O').remove('-CHO');
        return r;
      }
    },
    {
      id: 'ozonolysis', name: '臭氧氧化裂解', emoji: '⚡', cat: '减碳',
      eq: 'C=C + O₃ then Zn/H₂O → 2 C=O',
      short: '双键断　-1C',
      desc: '臭氧把双键彻底切断，还原后得到两个羰基。用来「找出双键在哪」或缩短碳链。',
      check: m => m.unsaturation.length > 0 && m.carbonCount >= 3,
      why: m => (m.carbonCount >= 3 ? '需要碳碳双键' : '碳数太少，无法裂解'),
      apply: m => {
        const r = m.clone();
        r.unsaturation.pop();
        r.carbonCount -= 1;
        r.add('-CHO');
        return r;
      }
    },
    {
      id: 'saponification', name: '酯的皂化', emoji: '🧼', cat: '官能团',
      eq: 'R-COOR′ + NaOH(aq) → R-COO⁻ + R′OH',
      short: '-COO- → -COOH + -OH',
      desc: '碱水解把酯拆回羧酸和醇。酯的「不可逆水解」是肥皂工业的化学基础。',
      check: m => m.has('-COO-'),
      why: () => '需要酯基 -COO-',
      apply: m => {
        const r = m.clone();
        r.remove('-COO-').add('-COOH').add('-OH');
        return r;
      }
    },
    {
      id: 'wittig', name: 'Wittig 反应', emoji: '🧲', cat: '官能团',
      eq: 'R₂C=O + Ph₃P=CHR′ → R₂C=CHR′',
      short: 'C=O→C=C',
      desc: '磷叶立德把羰基换成双键，位置确定、条件温和——合成烯烃的经典王牌。',
      check: m => m.has('=O') || m.has('-CHO'),
      why: () => '需要醛或酮的羰基',
      apply: m => {
        const r = m.clone();
        r.remove('=O').remove('-CHO');
        r.unsaturation.push('C' + Math.max(1, r.carbonCount - 1) + '=C' + r.carbonCount);
        return r;
      }
    },
    {
      id: 'radical_hbr', name: '自由基 HBr 加成', emoji: '💡', cat: '取代',
      eq: 'R-CH=CH₂ + HBr (ROOR) → R-CH₂-CH₂Br',
      short: '双键-1　+X',
      desc: '过氧化物引发自由基链反应，HBr 反马氏加成。光照或加热都能启动。',
      check: m => m.unsaturation.length > 0 && !m.has('-X'),
      why: m => (m.unsaturation.length ? '分子已有卤素' : '需要碳碳双键'),
      apply: m => {
        const r = m.clone();
        r.unsaturation.pop();
        r.add('-X');
        return r;
      }
    }
  ];
  EXTRA.forEach(r => { if (!root.RXN_MAP.has(r.id)) { REACTIONS.push(r); root.RXN_MAP.set(r.id, r); } });

  /* ============================================================
   * 二、工具：种子随机
   * ============================================================ */
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry32(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const S = (c, g, u, r) => new MOL(c, g || [], u || [], r || []);

  /* ============================================================
   * 三、教材数据：43 章
   *    rxns   = 本章知识点对应的反应 id
   *    seeds  = 起始原料池（碳数 / 官能团 / 双键 / 环）
   *    depth  = 生成题目的步数范围
   *    n      = 本章题目数
   * ============================================================ */
  const CLAYDEN = {
    id: 'clayden2e',
    title: 'Clayden 有机化学',
    subtitle: 'Organic Chemistry, 2nd Edition',
    author: 'Graham Patrick / Jonathan Clayden 等',
    blurb: '43 章，从「什么是有机化学」一路走到「今日有机化学」。每章按知识点自动生成合成题。',
    chapters: [
      { no: 1, cn: '什么是有机化学', en: 'What is organic chemistry?', rxns: ['halogenation', 'hydrogenation', 'hydrolysis_x', 'dehydration'], seeds: [[4], [5], [6]], depth: [2, 3], n: 6 },
      { no: 2, cn: '有机结构', en: 'Organic structures', rxns: ['halogenation', 'hydration', 'dehydration', 'reduction', 'oxidation'], seeds: [[3], [4], [5]], depth: [2, 3], n: 6 },
      { no: 3, cn: '测定有机结构', en: 'Determining organic structures', rxns: ['hydrogenation', 'dehydration', 'hydration', 'ozonolysis'], seeds: [[4, [], ['C1=C2'], []], [5, [], ['C2=C3'], []]], depth: [2, 4], n: 7 },
      { no: 4, cn: '分子的结构', en: 'Structure of molecules', rxns: ['diels_alder', 'hydrogenation', 'hydration', 'epoxidation'], seeds: [[4, [], ['C1=C2'], []], [5, [], ['C1=C2'], []]], depth: [2, 4], n: 7 },
      { no: 5, cn: '有机反应', en: 'Organic reactions', rxns: ['grignard', 'reduction', 'oxidation', 'hydration'], seeds: [[3, ['=O']], [4, ['-CHO']]], depth: [2, 4], n: 7 },
      { no: 6, cn: '羰基亲核加成', en: 'Nucleophilic addition to the carbonyl group', rxns: ['hcn_add', 'reduction', 'grignard', 'imine'], seeds: [[3, ['=O']], [4, ['-CHO']], [5, ['=O']]], depth: [2, 4], n: 8 },
      { no: 7, cn: '离域与共轭', en: 'Delocalization and conjugation', rxns: ['diels_alder', 'michael', 'hydrogenation'], seeds: [[4, [], ['C1=C2', 'C3=C4'], []], [5, [], ['C1=C2'], ['=O']]], depth: [2, 4], n: 7 },
      { no: 8, cn: '酸性、碱性与 pKa', en: 'Acidity, basicity, and pKa', rxns: ['decarboxylation', 'e2', 'oxidation', 'jones'], seeds: [[3, ['-COOH']], [4, ['-COOH']], [5, ['-X']]], depth: [2, 4], n: 7 },
      { no: 9, cn: '有机金属试剂增碳', en: 'Organometallic reagents to make C–C bonds', rxns: ['grignard', 'hcn_add', 'reduction', 'nitrile_hydro'], seeds: [[2, ['=O']], [3, ['-CHO']]], depth: [2, 4], n: 8 },
      { no: 10, cn: '羧酸衍生物的亲核取代', en: 'Nucleophilic substitution at the carbonyl group', rxns: ['esterification', 'saponification', 'hydrolysis_x', 'claisen'], seeds: [[3, ['-COOH']], [4, ['-COO-']]], depth: [2, 4], n: 8 },
      { no: 11, cn: '失去羰基氧的取代', en: 'Substitution at C=O with loss of carbonyl oxygen', rxns: ['acetal', 'acetal_deprot', 'wittig', 'imine', 'clemmensen'], seeds: [[3, ['=O']], [4, ['-CHO']]], depth: [2, 4], n: 8 },
      { no: 12, cn: '平衡、速率与机理', en: 'Equilibria, rates, and mechanisms', rxns: ['grignard', 'aldol', 'esterification', 'ether_hydrolysis', 'saponification'], seeds: [[4, ['=O']], [3, ['-COOH']]], depth: [3, 5], n: 8 },
      { no: 13, cn: '¹H NMR', en: '¹H NMR: proton nuclear magnetic resonance', rxns: ['hydrogenation', 'hydration', 'dehydration', 'halogenation'], seeds: [[4, [], ['C1=C2'], []], [5]], depth: [2, 4], n: 7 },
      { no: 14, cn: '立体化学', en: 'Stereochemistry', rxns: ['grignard', 'hcn_add', 'reduction', 'halogenation'], seeds: [[3, ['=O']], [4, ['-OH']]], depth: [2, 4], n: 8 },
      { no: 15, cn: '饱和碳上的亲核取代', en: 'Nucleophilic substitution at saturated carbon', rxns: ['hydrolysis_x', 'williamson', 'halogenation', 'e2'], seeds: [[3, ['-X']], [4, ['-X']], [5, ['-OH']]], depth: [2, 4], n: 8 },
      { no: 16, cn: '构象分析', en: 'Conformational analysis', rxns: ['hydrogenation', 'diels_alder', 'halogenation', 'epoxidation'], seeds: [[6, [], [], ['六元环']], [6, ['-OH'], [], ['六元环']]], depth: [2, 4], n: 7 },
      { no: 17, cn: '消除反应', en: 'Elimination reactions', rxns: ['e2', 'dehydration', 'hydrogenation', 'ozonolysis'], seeds: [[3, ['-X']], [4, ['-OH']], [5, ['-X']]], depth: [2, 4], n: 8 },
      { no: 18, cn: '光谱方法复习', en: 'Review of spectroscopic methods', rxns: ['hydrogenation', 'hydration', 'dehydration', 'oxidation', 'reduction'], seeds: [[4], [5, [], ['C1=C2'], []]], depth: [3, 5], n: 8 },
      { no: 19, cn: '烯烃的亲电加成', en: 'Electrophilic addition to alkenes', rxns: ['hydration', 'hydrogenation', 'radical_hbr', 'epoxidation'], seeds: [[4, [], ['C1=C2'], []], [5, [], ['C2=C3'], []]], depth: [2, 4], n: 8 },
      { no: 20, cn: '烯醇与烯醇负离子', en: 'Formation and reactions of enols and enolates', rxns: ['enolate_alkyl', 'aldol', 'halogenation', 'oxidation'], seeds: [[4, ['=O']], [5, ['=O']]], depth: [2, 4], n: 8 },
      { no: 21, cn: '芳环亲电取代', en: 'Electrophilic aromatic substitution', rxns: ['nitration', 'halogenation', 'hydrogenation', 'nitrile_hydro'], seeds: [[6, [], [], ['六元环']], [6, ['-OH'], [], ['六元环']]], depth: [2, 4], n: 8 },
      { no: 22, cn: '共轭加成与亲核芳香取代', en: 'Conjugate addition and nucleophilic aromatic substitution', rxns: ['michael', 'diels_alder', 'nitration', 'aldol'], seeds: [[4, ['=O'], ['C1=C2'], []], [6, [], [], ['六元环']]], depth: [3, 5], n: 8 },
      { no: 23, cn: '化学选择性与保护基', en: 'Chemoselectivity and protecting groups', rxns: ['acetal', 'acetal_deprot', 'grignard', 'reduction', 'saponification'], seeds: [[4, ['=O', '-OH']], [5, ['=O', '-COOH']]], depth: [3, 5], n: 8 },
      { no: 24, cn: '区域选择性', en: 'Regioselectivity', rxns: ['clemmensen', 'ozonolysis', 'hydration', 'radical_hbr', 'epoxide_open'], seeds: [[4, ['=O']], [5, ['-CHO']]], depth: [3, 5], n: 8 },
      { no: 25, cn: '烯醇负离子的烷基化', en: 'Alkylation of enolates', rxns: ['enolate_alkyl', 'aldol', 'oxidation', 'jones'], seeds: [[4, ['=O']], [5, ['=O']]], depth: [2, 5], n: 8 },
      { no: 26, cn: 'Aldol 与 Claisen 缩合', en: 'Aldol and Claisen condensation', rxns: ['aldol', 'claisen', 'esterification', 'saponification'], seeds: [[3, ['=O']], [4, ['-COO-']]], depth: [2, 5], n: 9 },
      { no: 27, cn: '硫、硅、磷试剂', en: 'Sulfur, silicon, phosphorus', rxns: ['wittig', 'esterification', 'saponification', 'imine'], seeds: [[4, ['=O']], [5, ['-CHO']]], depth: [2, 4], n: 8 },
      { no: 28, cn: '逆合成分析', en: 'Retrosynthetic analysis', rxns: ['grignard', 'aldol', 'williamson', 'esterification', 'reduction', 'oxidation', 'hydrogenation', 'enolate_alkyl'], seeds: [[3, ['=O']], [4, ['-OH']], [5, ['=O']]], depth: [4, 6], n: 9 },
      { no: 29, cn: '芳杂环（一）：反应', en: 'Aromatic heterocycles 1: reactions', rxns: ['nitration', 'halogenation', 'e2', 'hydrogenation'], seeds: [[5, [], [], ['六元环']], [6, ['-OH'], [], ['六元环']]], depth: [2, 5], n: 8 },
      { no: 30, cn: '芳杂环（二）：合成', en: 'Aromatic heterocycles 2: synthesis', rxns: ['diels_alder', 'nitration', 'hydrogenation', 'dehydration'], seeds: [[4, [], ['C1=C2'], []], [5, ['=O'], ['C2=C3'], []]], depth: [3, 5], n: 8 },
      { no: 31, cn: '饱和杂环与立体电子效应', en: 'Saturated heterocycles and stereoelectronics', rxns: ['epoxidation', 'epoxide_open', 'hydration', 'halogenation'], seeds: [[4, [], ['C1=C2'], []], [5, ['-OH']]], depth: [2, 5], n: 8 },
      { no: 32, cn: '环状分子的立体选择性', en: 'Stereoselectivity in cyclic molecules', rxns: ['epoxidation', 'epoxide_open', 'hydrogenation', 'diels_alder'], seeds: [[5, [], ['C1=C2'], []], [6, [], [], ['六元环']]], depth: [3, 5], n: 8 },
      { no: 33, cn: '非对映选择性', en: 'Diastereoselectivity', rxns: ['reduction', 'grignard', 'epoxidation', 'epoxide_open'], seeds: [[4, ['=O']], [5, ['=O', '-OH']]], depth: [3, 5], n: 8 },
      { no: 34, cn: '周环反应（一）：环加成', en: 'Pericyclic reactions 1: cycloadditions', rxns: ['diels_alder', 'hydrogenation', 'ozonolysis', 'epoxidation'], seeds: [[4, [], ['C1=C2', 'C3=C4'], []], [5, [], ['C1=C2'], []]], depth: [2, 5], n: 9 },
      { no: 35, cn: '周环反应（二）：σ迁移与电环化', en: 'Pericyclic reactions 2: sigmatropic and electrocyclic', rxns: ['diels_alder', 'dehydration', 'hydrogenation', 'nitration'], seeds: [[5, [], ['C1=C2'], []], [6, [], [], ['六元环']]], depth: [3, 5], n: 8 },
      { no: 36, cn: '参与、重排与碎裂', en: 'Participation, rearrangement, fragmentation', rxns: ['esterification', 'saponification', 'decarboxylation', 'claisen'], seeds: [[4, ['-COOH']], [5, ['-COO-']]], depth: [3, 5], n: 8 },
      { no: 37, cn: '自由基反应', en: 'Radical reactions', rxns: ['radical_hbr', 'halogenation', 'ozonolysis', 'hydrogenation'], seeds: [[4, [], ['C1=C2'], []], [6]], depth: [2, 5], n: 8 },
      { no: 38, cn: '卡宾的合成与反应', en: 'Synthesis and reactions of carbenes', rxns: ['epoxidation', 'epoxide_open', 'halogenation', 'hydrogenation'], seeds: [[4, [], ['C1=C2'], []], [5, [], ['C2=C3'], []]], depth: [3, 5], n: 8 },
      { no: 39, cn: '测定反应机理', en: 'Determining reaction mechanisms', rxns: ['grignard', 'aldol', 'e2', 'hydration', 'dehydration', 'oxidation'], seeds: [[4, ['=O']], [4, ['-X']]], depth: [3, 6], n: 9 },
      { no: 40, cn: '有机金属化学', en: 'Organometallic chemistry', rxns: ['grignard', 'hcn_add', 'wittig', 'enolate_alkyl', 'hydrogenation'], seeds: [[3, ['=O']], [4, ['-CHO']]], depth: [3, 6], n: 9 },
      { no: 41, cn: '不对称合成', en: 'Asymmetric synthesis', rxns: ['grignard', 'reduction', 'epoxidation', 'hydrolysis_x'], seeds: [[4, ['=O']], [5, ['=O']]], depth: [3, 6], n: 9 },
      { no: 42, cn: '生命有机化学', en: 'Organic chemistry of life', rxns: ['esterification', 'saponification', 'oxidation', 'reduction', 'hydrolysis_x'], seeds: [[4, ['-COOH', '-OH']], [5, ['-CHO', '-OH']]], depth: [3, 5], n: 9 },
      { no: 43, cn: '今日有机化学', en: 'Organic chemistry today', rxns: ['grignard', 'aldol', 'diels_alder', 'wittig', 'epoxidation', 'nitration', 'claisen', 'michael', 'enolate_alkyl'], seeds: [[4, ['=O']], [5, [], ['C1=C2'], []], [6, [], [], ['六元环']]], depth: [4, 7], n: 10 }
    ]
  };

  const BOOKS = [CLAYDEN];
  const BOOK_MAP = new Map(BOOKS.map(b => [b.id, b]));
  BOOKS.forEach(b => {
    b.chapters.forEach((c, i) => {
      c.index = i;
      c.bookId = b.id;
      c.label = '第 ' + c.no + ' 章';
      c.title = c.cn;
      c.total = c.n;
    });
  });

  /* ============================================================
   * 四、题目生成（确定性：同一章每次打开题面相同）
   * ============================================================ */
  const PUZZLE_CACHE = new Map();

  /* 走一步：本章重点反应优先（65%），其余留给通用反应兜底，
     保证「本章知识点」占主导但路线不会走死 */
  const PREFER_CHAPTER = 0.65;
  function walkOnce(rng, ch, steps) {
    const seed = ch.seeds[Math.floor(rng() * ch.seeds.length)];
    const start = S(seed[0], seed[1], seed[2], seed[3]);
    let cur = start.clone();
    for (let i = 0; i < steps; i++) {
      const cands = REACTIONS.filter(r => r.check(cur));
      if (!cands.length) return null;
      const pref = cands.filter(r => ch.rxns.indexOf(r.id) >= 0);
      const pool = (pref.length && rng() < PREFER_CHAPTER) ? pref : cands;
      const r = pool[Math.floor(rng() * pool.length)];
      const nx = r.apply(cur);
      if (nx.carbonCount < 2 || nx.carbonCount > CARBON_MAX || nx.equals(cur)) return null;
      cur = nx;
    }
    if (cur.equals(start)) return null;
    return { start, target: cur };
  }

  /* ---------- 策展题库（curated.js）：按章附真实知识点出题 ---------- */
  function curatedList(bookId, no) {
    const C = root.CURATED;
    if (!C || bookId !== 'clayden2e') return [];
    const raw = C[no];
    if (!raw || !raw.length) return [];
    const out = [], seen = new Set();
    for (let i = 0; i < raw.length; i++) {
      const item = raw[i];
      const from = item[0], steps = item[1], note = item[2] || '';
      let mol;
      const sp = v => (v || '').split(',').map(x => x.trim()).filter(Boolean);
      try { mol = S(from[0], sp(from[1]), sp(from[2]), sp(from[3])); }
      catch (e) { continue; }
      if (!mol.carbonCount) continue;
      let cur = mol.clone(), ok = true;
      for (const rid of steps) {
        const r = root.RXN_MAP.get(rid);
        if (!r || !r.check(cur)) { ok = false; break; }
        cur = r.apply(cur);
      }
      if (!ok || cur.carbonCount < 1 || cur.carbonCount > CARBON_MAX) continue;
      const k = cur.key();
      if (seen.has(k) || cur.equals(mol)) continue;
      const path = findOptimalPath(mol, cur, 8);
      if (!path || !path.length) continue;
      seen.add(k);
      out.push({
        no: out.length + 1,
        start: mol,
        target: cur,
        optimal: path.length,
        via: path,
        note: note,
        curated: true
      });
    }
    return out;
  }

  function genChapter(bookId, no) {
    const book = BOOK_MAP.get(bookId) || CLAYDEN;
    const ch = book.chapters.find(c => c.no === no);
    if (!ch) return [];
    const ck = bookId + ':' + no;
    if (PUZZLE_CACHE.has(ck)) return PUZZLE_CACHE.get(ck);

    const rng = mulberry32(hashStr(ck) ^ 0x9e3779b9);
    const out = [], seen = new Set();
    let guard = 0;

    /* 一、策展题优先：每一条都对应本书本章的真实知识点 */
    for (const c of curatedList(bookId, no)) {
      seen.add(c.target.key());
      out.push(c);
    }
    /* 策展题比原设定题量多时，以策展题数为准，保证章节卡片显示的题量与实玩一致 */
    if (out.length > ch.total) ch.total = out.length;
    /* 三轮：先按本章难度区间，题量不足时逐步放宽步数，扩大去重空间 */
    const spans = [[ch.depth[0], ch.depth[1]], [ch.depth[0], ch.depth[1] + 1], [ch.depth[0], ch.depth[1] + 2]];
    for (const [lo, hi] of spans) {
      while (out.length < ch.total && guard < ch.total * 200) {
        guard++;
        const span = hi - lo;
        const steps = lo + Math.floor(rng() * (span + 1));
        const w = walkOnce(rng, ch, steps);
        if (!w) continue;
        const k = w.target.key();
        if (seen.has(k)) continue;
        const path = findOptimalPath(w.start, w.target, 8);
        if (!path || path.length < 2) continue;
        seen.add(k);
        out.push({
          no: out.length + 1,
          start: w.start,
          target: w.target,
          optimal: path.length,
          via: path,
          note: '',
          curated: false
        });
      }
      if (out.length >= ch.total) break;
    }
    PUZZLE_CACHE.set(ck, out);
    return out;
  }

  /* 把一道生成题包装成 LEVEL 形状，直接复用现有游戏界面 */
  function puzzleToLevel(bookId, no, idx) {
    const list = genChapter(bookId, no);
    const p = list[idx];
    if (!p) return null;
    const ch = (BOOK_MAP.get(bookId) || CLAYDEN).chapters.find(c => c.no === no);
    const viaTxt = p.via.map(id => (root.RXN_MAP.get(id) || {}).name).join(' → ');
    return {
      id: 'b' + no + '-' + p.no,
      tier: '第 ' + no + ' 章',
      title: ch.cn + ' · 第 ' + p.no + ' 题',
      goal: '把 ' + p.start.getName() + ' 变成 ' + p.target.getName(),
      start: p.start.clone(),
      target: p.target.clone(),
      point: p.note || '',
      hint: (p.note ? '考点：' + p.note + '。' : '先想逆合成：目标分子最后一步通常是什么反应？') +
        '最优路径：' + viaTxt + '（提示已给出路径，尽量自己推）',
      optimal: p.optimal,
      bookId: bookId,
      chapterNo: no,
      puzzleNo: p.no
    };
  }

  /* ============================================================
   * 五、打分与解锁
   * ============================================================ */
  const PASS_SCORE = 80;          // 解锁下一章所需分数
  function scoreOf(steps, optimal) {
    if (!optimal) return 60;
    const diff = steps - optimal;
    if (diff <= 0) return 100;
    if (diff === 1) return 80;
    if (diff === 2) return 60;
    return 40;
  }
  function starsOf(score) {
    if (score >= 95) return 3;
    if (score >= 75) return 2;
    if (score > 0) return 1;
    return 0;
  }

  const SAVE_KEY = 'cc_book_v1';
  const BookProgress = {
    data: {},
    load() {
      try { this.data = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') || {}; }
      catch (e) { this.data = {}; }
      return this.data;
    },
    save() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { }
    },
    get(bookId, no) {
      const b = this.data[bookId] || {};
      return b[no] || null;
    },
    /* 记录一次章节成绩（取历史最好） */
    record(bookId, no, score) {
      const b = this.data[bookId] || (this.data[bookId] = {});
      const cur = b[no] || { best: 0, done: 0 };
      cur.best = Math.max(cur.best, Math.round(score));
      cur.done = (cur.done || 0) + 1;
      b[no] = cur;
      this.save();
      return cur;
    },
    clear(bookId) {
      if (bookId) delete this.data[bookId]; else this.data = {};
      this.save();
    }
  };

  function chapterUnlocked(bookId, no) {
    if (no <= 1) return true;
    const prev = BookProgress.get(bookId, no - 1);
    return !!prev && prev.best >= PASS_SCORE;
  }

  /* 主线总进度：已解锁到第几章 */
  function unlockedUpTo(bookId) {
    const book = BOOK_MAP.get(bookId) || CLAYDEN;
    let last = 1;
    for (const ch of book.chapters) {
      if (chapterUnlocked(bookId, ch.no)) last = ch.no; else break;
    }
    return last;
  }

  const API = {
    BOOKS, BOOK_MAP, CLAYDEN, EXTRA,
    EXTRA_REACTION_COUNT: EXTRA.length,
    PASS_SCORE,
    genChapter, puzzleToLevel, scoreOf, starsOf, curatedList,
    BookProgress, chapterUnlocked, unlockedUpTo,
    totalPuzzles: () => BOOKS.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.n, 0), 0)
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
  }
  Object.keys(API).forEach(k => { root[k] = API[k]; });
})(typeof window !== 'undefined' ? window : globalThis);
