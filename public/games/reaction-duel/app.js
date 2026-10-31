/* 反应对决 · 炼金术士 v2
   —— 双槽反应台 / 真实化学方程式 / 操作修正 / AI 对手
   数据：60 种物质 · 8 种操作 · 45 条反应方程式 */
'use strict';

/* ═══════════════ 数据 ═══════════════ */

// 物质：id 名称 化学式 状态 类别 标签 活性 毒性 基准伤害
const SUBSTANCES = [
  // ── 活泼金属 ──
  {id:'Li',name:'锂',formula:'Li',state:'固',cat:'金属',tags:['还原剂','碱性'],reactivity:5,dmg:9,emoji:'🔘'},
  {id:'Na',name:'钠',formula:'Na',state:'固',cat:'金属',tags:['还原剂','碱性','活泼'],reactivity:5,dmg:10,emoji:'🟡'},
  {id:'K',name:'钾',formula:'K',state:'固',cat:'金属',tags:['还原剂','碱性','极活泼'],reactivity:5,dmg:11,emoji:'🟣'},
  {id:'Mg',name:'镁',formula:'Mg',state:'固',cat:'金属',tags:['还原剂','燃烧'],reactivity:4,dmg:8,emoji:'⚪'},
  {id:'Ca',name:'钙',formula:'Ca',state:'固',cat:'金属',tags:['还原剂','碱性'],reactivity:4,dmg:8,emoji:'⚪'},
  {id:'Al',name:'铝',formula:'Al',state:'固',cat:'金属',tags:['两性','钝化'],reactivity:3,dmg:6,emoji:'⚙️'},
  {id:'Zn',name:'锌',formula:'Zn',state:'固',cat:'金属',tags:['还原剂','置换'],reactivity:3,dmg:7,emoji:'🔩'},
  {id:'Fe',name:'铁',formula:'Fe',state:'固',cat:'金属',tags:['还原剂','置换'],reactivity:2,dmg:6,emoji:'🧲'},
  {id:'Cu',name:'铜',formula:'Cu',state:'固',cat:'金属',tags:['惰性金属'],reactivity:1,dmg:4,emoji:'🟠'},
  {id:'Ag',name:'银',formula:'Ag',state:'固',cat:'金属',tags:['惰性金属','沉淀'],reactivity:1,dmg:3,emoji:'⚪'},
  {id:'Pb',name:'铅',formula:'Pb',state:'固',cat:'金属',tags:['重金属','沉淀'],reactivity:1,dmg:5,emoji:'⬛'},
  {id:'Hg',name:'汞',formula:'Hg',state:'液',cat:'金属',tags:['重金属','剧毒'],reactivity:1,dmg:7,emoji:'💧'},

  // ── 非金属单质 ──
  {id:'C',name:'碳',formula:'C',state:'固',cat:'非金属',tags:['还原剂','燃烧'],reactivity:2,dmg:5,emoji:'⬛'},
  {id:'S',name:'硫',formula:'S',state:'固',cat:'非金属',tags:['氧化剂','燃烧'],reactivity:3,dmg:6,emoji:'🟡'},
  {id:'P',name:'磷',formula:'P',state:'固',cat:'非金属',tags:['燃烧','自燃'],reactivity:4,dmg:8,emoji:'🔴'},
  {id:'H2',name:'氢气',formula:'H₂',state:'气',cat:'非金属',tags:['还原剂','易燃'],reactivity:4,dmg:8,emoji:'💨'},
  {id:'O2',name:'氧气',formula:'O₂',state:'气',cat:'非金属',tags:['氧化剂','助燃'],reactivity:4,dmg:5,emoji:'🫧'},
  {id:'N2',name:'氮气',formula:'N₂',state:'气',cat:'非金属',tags:['惰性','稳定'],reactivity:1,dmg:2,emoji:'💨'},
  {id:'Cl2',name:'氯气',formula:'Cl₂',state:'气',cat:'非金属',tags:['氧化剂','剧毒'],reactivity:5,dmg:9,emoji:'🟢'},
  {id:'Br2',name:'溴',formula:'Br₂',state:'液',cat:'非金属',tags:['氧化剂','腐蚀'],reactivity:4,dmg:8,emoji:'🟤'},
  {id:'I2',name:'碘',formula:'I₂',state:'固',cat:'非金属',tags:['氧化剂','升华'],reactivity:3,dmg:6,emoji:'🟪'},
  {id:'Si',name:'硅',formula:'Si',state:'固',cat:'非金属',tags:['半导体'],reactivity:2,dmg:4,emoji:'🔲'},

  // ── 酸 ──
  {id:'HCl',name:'盐酸',formula:'HCl',state:'液',cat:'酸',tags:['强酸','挥发性'],reactivity:4,dmg:11,emoji:'🧪'},
  {id:'H2SO4',name:'硫酸',formula:'H₂SO₄',state:'液',cat:'酸',tags:['强酸','脱水'],reactivity:5,dmg:13,emoji:'🧪'},
  {id:'HNO3',name:'硝酸',formula:'HNO₃',state:'液',cat:'酸',tags:['强酸','氧化性'],reactivity:5,dmg:12,emoji:'🧪'},
  {id:'H3PO4',name:'磷酸',formula:'H₃PO₄',state:'液',cat:'酸',tags:['中强酸'],reactivity:3,dmg:8,emoji:'🧪'},
  {id:'HF',name:'氢氟酸',formula:'HF',state:'液',cat:'酸',tags:['弱酸','腐蚀'],reactivity:3,dmg:9,emoji:'🧪'},
  {id:'CH3COOH',name:'乙酸',formula:'CH₃COOH',state:'液',cat:'酸',tags:['弱酸','有机'],reactivity:2,dmg:7,emoji:'🧴'},
  {id:'H2CO3',name:'碳酸',formula:'H₂CO₃',state:'液',cat:'酸',tags:['弱酸','不稳定'],reactivity:2,dmg:6,emoji:'🧴'},
  {id:'H2S',name:'氢硫酸',formula:'H₂S',state:'气',cat:'酸',tags:['弱酸','剧毒'],reactivity:3,dmg:8,emoji:'☠️'},

  // ── 碱 ──
  {id:'NaOH',name:'氢氧化钠',formula:'NaOH',state:'固',cat:'碱',tags:['强碱','腐蚀'],reactivity:4,dmg:11,emoji:'🧂'},
  {id:'KOH',name:'氢氧化钾',formula:'KOH',state:'固',cat:'碱',tags:['强碱','腐蚀'],reactivity:4,dmg:11,emoji:'🧂'},
  {id:'CaOH2',name:'氢氧化钙',formula:'Ca(OH)₂',state:'固',cat:'碱',tags:['中强碱'],reactivity:3,dmg:9,emoji:'⚪'},
  {id:'MgOH2',name:'氢氧化镁',formula:'Mg(OH)₂',state:'固',cat:'碱',tags:['弱碱','沉淀'],reactivity:2,dmg:6,emoji:'⚪'},
  {id:'NH3',name:'氨',formula:'NH₃',state:'气',cat:'碱',tags:['弱碱','挥发性'],reactivity:3,dmg:9,emoji:'💨'},
  {id:'Na2CO3',name:'碳酸钠',formula:'Na₂CO₃',state:'固',cat:'盐',tags:['碱性盐'],reactivity:3,dmg:8,emoji:'🧂'},
  {id:'NaHCO3',name:'碳酸氢钠',formula:'NaHCO₃',state:'固',cat:'盐',tags:['碱性盐','受热分解'],reactivity:2,dmg:7,emoji:'🧂'},
  {id:'AlOH3',name:'氢氧化铝',formula:'Al(OH)₃',state:'固',cat:'碱',tags:['两性','沉淀'],reactivity:2,dmg:5,emoji:'⚪'},

  // ── 盐 ──
  {id:'NaCl',name:'氯化钠',formula:'NaCl',state:'固',cat:'盐',tags:['稳定'],reactivity:1,dmg:3,emoji:'🧂'},
  {id:'CaCO3',name:'碳酸钙',formula:'CaCO₃',state:'固',cat:'盐',tags:['沉淀','分解'],reactivity:2,dmg:6,emoji:'⬜'},
  {id:'CuSO4',name:'硫酸铜',formula:'CuSO₄',state:'固',cat:'盐',tags:['置换','蓝色'],reactivity:3,dmg:9,emoji:'🔵'},
  {id:'FeCl3',name:'氯化铁',formula:'FeCl₃',state:'固',cat:'盐',tags:['水解','沉淀'],reactivity:3,dmg:8,emoji:'🟤'},
  {id:'AgNO3',name:'硝酸银',formula:'AgNO₃',state:'固',cat:'盐',tags:['沉淀','感光'],reactivity:3,dmg:9,emoji:'⚪'},
  {id:'BaCl2',name:'氯化钡',formula:'BaCl₂',state:'固',cat:'盐',tags:['沉淀'],reactivity:3,dmg:8,emoji:'⚪'},
  {id:'KMnO4',name:'高锰酸钾',formula:'KMnO₄',state:'固',cat:'盐',tags:['强氧化剂','紫色'],reactivity:5,dmg:12,emoji:'🟪'},
  {id:'Na2SO4',name:'硫酸钠',formula:'Na₂SO₄',state:'固',cat:'盐',tags:['稳定'],reactivity:1,dmg:3,emoji:'⚪'},

  // ── 氧化物 / 其他 ──
  {id:'H2O',name:'水',formula:'H₂O',state:'液',cat:'氧化物',tags:['中性'],reactivity:1,dmg:2,emoji:'💧'},
  {id:'H2O2',name:'过氧化氢',formula:'H₂O₂',state:'液',cat:'氧化物',tags:['氧化剂','分解'],reactivity:4,dmg:9,emoji:'💧'},
  {id:'CO2',name:'二氧化碳',formula:'CO₂',state:'气',cat:'氧化物',tags:['酸性氧化物'],reactivity:1,dmg:3,emoji:'💨'},
  {id:'SO2',name:'二氧化硫',formula:'SO₂',state:'气',cat:'氧化物',tags:['还原剂','刺激性'],reactivity:3,dmg:7,emoji:'💨'},
  {id:'NO2',name:'二氧化氮',formula:'NO₂',state:'气',cat:'氧化物',tags:['氧化剂','红棕'],reactivity:4,dmg:9,emoji:'🟤'},
  {id:'CaO',name:'氧化钙',formula:'CaO',state:'固',cat:'氧化物',tags:['碱性氧化物'],reactivity:3,dmg:7,emoji:'⬜'},
  {id:'Fe2O3',name:'氧化铁',formula:'Fe₂O₃',state:'固',cat:'氧化物',tags:['铁锈','还原'],reactivity:2,dmg:6,emoji:'🟤'},
  {id:'MnO2',name:'二氧化锰',formula:'MnO₂',state:'固',cat:'氧化物',tags:['催化剂'],reactivity:2,dmg:5,emoji:'⬛'},

  // ── 有机物 ──
  {id:'CH4',name:'甲烷',formula:'CH₄',state:'气',cat:'有机',tags:['可燃','烷烃'],reactivity:3,dmg:8,emoji:'🔥'},
  {id:'C2H5OH',name:'乙醇',formula:'C₂H₅OH',state:'液',cat:'有机',tags:['可燃','醇'],reactivity:2,dmg:6,emoji:'🍷'},
  {id:'C6H12O6',name:'葡萄糖',formula:'C₆H₁₂O₆',state:'固',cat:'有机',tags:['还原性','糖'],reactivity:2,dmg:5,emoji:'🍬'},
  {id:'C6H6',name:'苯',formula:'C₆H₆',state:'液',cat:'有机',tags:['芳香','剧毒'],reactivity:2,dmg:7,emoji:'⬡'},
  {id:'C3H6O',name:'丙酮',formula:'C₃H₆O',state:'液',cat:'有机',tags:['溶剂','易燃'],reactivity:2,dmg:6,emoji:'🧴'}
];

// 反应：a,b 物质 / eq 方程式 / dmg 基准 / prod 产物 / cond 条件（满足则加成）
const REACTIONS = [
  // 活泼金属 + 酸 → 盐 + 氢气
  {a:'Na',b:'HCl',eq:'2Na + 2HCl → 2NaCl + H₂↑',dmg:14,prod:['NaCl','H₂'],cond:[]},
  {a:'K',b:'HCl',eq:'2K + 2HCl → 2KCl + H₂↑',dmg:15,prod:['KCl','H₂'],cond:[]},
  {a:'Mg',b:'HCl',eq:'Mg + 2HCl → MgCl₂ + H₂↑',dmg:11,prod:['MgCl₂','H₂'],cond:[]},
  {a:'Zn',b:'HCl',eq:'Zn + 2HCl → ZnCl₂ + H₂↑',dmg:10,prod:['ZnCl₂','H₂'],cond:[]},
  {a:'Fe',b:'HCl',eq:'Fe + 2HCl → FeCl₂ + H₂↑',dmg:9,prod:['FeCl₂','H₂'],cond:[]},
  {a:'Al',b:'HCl',eq:'2Al + 6HCl → 2AlCl₃ + 3H₂↑',dmg:12,prod:['AlCl₃','H₂'],cond:[]},
  {a:'Na',b:'H2SO4',eq:'2Na + H₂SO₄ → Na₂SO₄ + H₂↑',dmg:15,prod:['Na₂SO₄','H₂'],cond:[]},
  {a:'Zn',b:'H2SO4',eq:'Zn + H₂SO₄ → ZnSO₄ + H₂↑',dmg:11,prod:['ZnSO₄','H₂'],cond:[]},
  {a:'Fe',b:'H2SO4',eq:'Fe + H₂SO₄ → FeSO₄ + H₂↑',dmg:10,prod:['FeSO₄','H₂'],cond:[]},
  {a:'Mg',b:'H2SO4',eq:'Mg + H₂SO₄ → MgSO₄ + H₂↑',dmg:12,prod:['MgSO₄','H₂'],cond:[]},
  {a:'Cu',b:'HNO3',eq:'3Cu + 8HNO₃ → 3Cu(NO₃)₂ + 2NO↑ + 4H₂O',dmg:13,prod:['Cu(NO₃)₂','NO','H₂O'],cond:[]},
  {a:'Ag',b:'HNO3',eq:'3Ag + 4HNO₃ → 3AgNO₃ + NO↑ + 2H₂O',dmg:12,prod:['AgNO₃','NO','H₂O'],cond:[]},
  {a:'Zn',b:'HNO3',eq:'4Zn + 10HNO₃ → 4Zn(NO₃)₂ + NH₄NO₃ + 3H₂O',dmg:11,prod:['Zn(NO₃)₂','H₂O'],cond:[]},

  // 金属 + 水
  {a:'Na',b:'H2O',eq:'2Na + 2H₂O → 2NaOH + H₂↑',dmg:12,prod:['NaOH','H₂'],cond:[]},
  {a:'K',b:'H2O',eq:'2K + 2H₂O → 2KOH + H₂↑',dmg:14,prod:['KOH','H₂'],cond:[]},
  {a:'Ca',b:'H2O',eq:'Ca + 2H₂O → Ca(OH)₂ + H₂↑',dmg:9,prod:['Ca(OH)₂','H₂'],cond:[]},

  // 中和
  {a:'NaOH',b:'HCl',eq:'NaOH + HCl → NaCl + H₂O',dmg:11,prod:['NaCl','H₂O'],cond:[]},
  {a:'KOH',b:'HCl',eq:'KOH + HCl → KCl + H₂O',dmg:11,prod:['KCl','H₂O'],cond:[]},
  {a:'NaOH',b:'H2SO4',eq:'2NaOH + H₂SO₄ → Na₂SO₄ + 2H₂O',dmg:13,prod:['Na₂SO₄','H₂O'],cond:[]},
  {a:'NaOH',b:'HNO3',eq:'NaOH + HNO₃ → NaNO₃ + H₂O',dmg:12,prod:['NaNO₃','H₂O'],cond:[]},
  {a:'CaOH2',b:'HCl',eq:'Ca(OH)₂ + 2HCl → CaCl₂ + 2H₂O',dmg:12,prod:['CaCl₂','H₂O'],cond:[]},
  {a:'NH3',b:'HCl',eq:'NH₃ + HCl → NH₄Cl',dmg:13,prod:['NH₄Cl'],cond:[]},
  {a:'MgOH2',b:'HCl',eq:'Mg(OH)₂ + 2HCl → MgCl₂ + 2H₂O',dmg:10,prod:['MgCl₂','H₂O'],cond:[]},
  {a:'AlOH3',b:'NaOH',eq:'Al(OH)₃ + NaOH → NaAlO₂ + 2H₂O',dmg:10,prod:['NaAlO₂','H₂O'],cond:[]},
  {a:'Na2CO3',b:'HCl',eq:'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑',dmg:11,prod:['NaCl','H₂O','CO₂'],cond:[]},
  {a:'NaHCO3',b:'HCl',eq:'NaHCO₃ + HCl → NaCl + H₂O + CO₂↑',dmg:10,prod:['NaCl','H₂O','CO₂'],cond:[]},
  {a:'CaCO3',b:'HCl',eq:'CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑',dmg:11,prod:['CaCl₂','H₂O','CO₂'],cond:[]},

  // 沉淀
  {a:'AgNO3',b:'NaCl',eq:'AgNO₃ + NaCl → AgCl↓ + NaNO₃',dmg:10,prod:['AgCl↓','NaNO₃'],cond:[]},
  {a:'BaCl2',b:'Na2SO4',eq:'BaCl₂ + Na₂SO₄ → BaSO₄↓ + 2NaCl',dmg:10,prod:['BaSO₄↓','NaCl'],cond:[]},
  {a:'BaCl2',b:'H2SO4',eq:'BaCl₂ + H₂SO₄ → BaSO₄↓ + 2HCl',dmg:12,prod:['BaSO₄↓','HCl'],cond:[]},
  {a:'FeCl3',b:'NaOH',eq:'FeCl₃ + 3NaOH → Fe(OH)₃↓ + 3NaCl',dmg:12,prod:['Fe(OH)₃↓','NaCl'],cond:[]},
  {a:'CuSO4',b:'NaOH',eq:'CuSO₄ + 2NaOH → Cu(OH)₂↓ + Na₂SO₄',dmg:12,prod:['Cu(OH)₂↓','Na₂SO₄'],cond:[]},
  {a:'CaOH2',b:'CO2',eq:'Ca(OH)₂ + CO₂ → CaCO₃↓ + H₂O',dmg:9,prod:['CaCO₃↓','H₂O'],cond:[]},

  // 置换
  {a:'Fe',b:'CuSO4',eq:'Fe + CuSO₄ → FeSO₄ + Cu↓',dmg:12,prod:['FeSO₄','Cu↓'],cond:[]},
  {a:'Zn',b:'CuSO4',eq:'Zn + CuSO₄ → ZnSO₄ + Cu↓',dmg:11,prod:['ZnSO₄','Cu↓'],cond:[]},
  {a:'Mg',b:'CuSO4',eq:'Mg + CuSO₄ → MgSO₄ + Cu↓',dmg:12,prod:['MgSO₄','Cu↓'],cond:[]},
  {a:'Cu',b:'AgNO3',eq:'Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag↓',dmg:11,prod:['Cu(NO₃)₂','Ag↓'],cond:[]},
  {a:'Fe',b:'AgNO3',eq:'Fe + 2AgNO₃ → Fe(NO₃)₂ + 2Ag↓',dmg:12,prod:['Fe(NO₃)₂','Ag↓'],cond:[]},

  // 氧化还原 / 燃烧
  {a:'H2',b:'O2',eq:'2H₂ + O₂ →(点燃) 2H₂O',dmg:15,prod:['H₂O'],cond:['点燃']},
  {a:'C',b:'O2',eq:'C + O₂ →(点燃) CO₂↑',dmg:12,prod:['CO₂'],cond:['点燃']},
  {a:'S',b:'O2',eq:'S + O₂ →(点燃) SO₂↑',dmg:12,prod:['SO₂'],cond:['点燃']},
  {a:'P',b:'O2',eq:'4P + 5O₂ →(点燃) 2P₂O₅',dmg:14,prod:['P₂O₅'],cond:['点燃']},
  {a:'CH4',b:'O2',eq:'CH₄ + 2O₂ →(点燃) CO₂ + 2H₂O',dmg:14,prod:['CO₂','H₂O'],cond:['点燃']},
  {a:'Mg',b:'O2',eq:'2Mg + O₂ →(点燃) 2MgO',dmg:13,prod:['MgO'],cond:['点燃']},
  {a:'Fe',b:'O2',eq:'4Fe + 3O₂ → 2Fe₂O₃',dmg:10,prod:['Fe₂O₃'],cond:[]},
  {a:'H2',b:'Cl2',eq:'H₂ + Cl₂ →(点燃) 2HCl',dmg:14,prod:['HCl'],cond:['点燃']},
  {a:'Na',b:'Cl2',eq:'2Na + Cl₂ →(点燃) 2NaCl',dmg:15,prod:['NaCl'],cond:['点燃']},
  {a:'Fe',b:'Cl2',eq:'2Fe + 3Cl₂ →(点燃) 2FeCl₃',dmg:14,prod:['FeCl₃'],cond:['点燃']},
  {a:'Cu',b:'Cl2',eq:'Cu + Cl₂ →(点燃) CuCl₂',dmg:12,prod:['CuCl₂'],cond:['点燃']},

  // 分解 / 催化
  {a:'H2O2',b:'MnO2',eq:'2H₂O₂ →(MnO₂) 2H₂O + O₂↑',dmg:13,prod:['H₂O','O₂'],cond:['催化剂']},
  {a:'KMnO4',b:'HCl',eq:'2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂↑ + 8H₂O',dmg:16,prod:['KCl','Cl₂','H₂O'],cond:[]},
  {a:'CaCO3',b:'CaO',eq:'CaCO₃ →(高温) CaO + CO₂↑',dmg:8,prod:['CaO','CO₂'],cond:[]},
  {a:'CaO',b:'H2O',eq:'CaO + H₂O → Ca(OH)₂',dmg:10,prod:['Ca(OH)₂'],cond:[]},
  {a:'SO2',b:'H2O',eq:'SO₂ + H₂O → H₂SO₃',dmg:8,prod:['H₂SO₃'],cond:[]},
  {a:'CO2',b:'H2O',eq:'CO₂ + H₂O → H₂CO₃',dmg:7,prod:['H₂CO₃'],cond:[]},
  {a:'NH3',b:'H2O',eq:'NH₃ + H₂O ⇌ NH₃·H₂O',dmg:7,prod:['NH₃·H₂O'],cond:[]},
  {a:'Cl2',b:'NaOH',eq:'Cl₂ + 2NaOH → NaCl + NaClO + H₂O',dmg:13,prod:['NaCl','NaClO','H₂O'],cond:[]},
  {a:'Cl2',b:'H2O',eq:'Cl₂ + H₂O ⇌ HCl + HClO',dmg:9,prod:['HCl','HClO'],cond:[]},
  {a:'NO2',b:'H2O',eq:'3NO₂ + H₂O → 2HNO₃ + NO↑',dmg:11,prod:['HNO₃','NO'],cond:[]},
  {a:'Fe2O3',b:'HCl',eq:'Fe₂O₃ + 6HCl → 2FeCl₃ + 3H₂O',dmg:11,prod:['FeCl₃','H₂O'],cond:[]},
  {a:'Cu',b:'H2SO4',eq:'Cu + 2H₂SO₄(浓) →(加热) CuSO₄ + SO₂↑ + 2H₂O',dmg:13,prod:['CuSO₄','SO₂','H₂O'],cond:['加热']},
  {a:'C',b:'H2SO4',eq:'C + 2H₂SO₄(浓) →(加热) CO₂↑ + 2SO₂↑ + 2H₂O',dmg:13,prod:['CO₂','SO₂','H₂O'],cond:['加热']},
  {a:'Cu',b:'HNO3',eq:'Cu + 4HNO₃(浓) → Cu(NO₃)₂ + 2NO₂↑ + 2H₂O',dmg:14,prod:['Cu(NO₃)₂','NO₂','H₂O'],cond:[]},
  {a:'CH4',b:'Cl2',eq:'CH₄ + Cl₂ →(光照) CH₃Cl + HCl',dmg:10,prod:['CH₃Cl','HCl'],cond:[]},
  {a:'C6H6',b:'HNO3',eq:'C₆H₆ + HNO₃ →(催化) C₆H₅NO₂ + H₂O',dmg:12,prod:['C₆H₅NO₂','H₂O'],cond:['催化剂']},
  {a:'C2H5OH',b:'O2',eq:'C₂H₅OH + 3O₂ →(点燃) 2CO₂ + 3H₂O',dmg:13,prod:['CO₂','H₂O'],cond:['点燃']},
  {a:'C6H12O6',b:'O2',eq:'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O',dmg:11,prod:['CO₂','H₂O'],cond:[]}
];

// 操作卡：给本回合的反应加修正
const OPERATIONS = [
  {id:'heat', name:'加热',   emoji:'🔥', desc:'反应伤害 +3',                cost:1, count:4},
  {id:'elec', name:'通电',   emoji:'⚡', desc:'反应伤害 +4 · 电解增强',      cost:1, count:4},
  {id:'cata', name:'催化剂', emoji:'🧫', desc:'反应伤害 ×1.5',              cost:1, count:4},
  {id:'press',name:'加压',   emoji:'🎚️', desc:'气体产物加成 · 伤害 +2',      cost:1, count:3},
  {id:'cool', name:'冷却',   emoji:'❄️', desc:'下回合对手能量 −1',           cost:1, count:3},
  {id:'neut', name:'中和剂', emoji:'🛡️', desc:'自身获得 4 点护盾',           cost:1, count:3},
  {id:'filt', name:'过滤',   emoji:'🧴', desc:'净化：自身回复 3 点 HP',      cost:1, count:3},
  {id:'stir', name:'搅拌',   emoji:'🌀', desc:'抽 2 张牌',                   cost:1, count:4}
];

// 索引
const SUB_MAP = new Map(SUBSTANCES.map(s => [s.id, s]));
const OP_MAP  = new Map(OPERATIONS.map(o => [o.id, o]));

// 反应查表（无序）
const RX_MAP = new Map();
REACTIONS.forEach(r => {
  RX_MAP.set(r.a + '|' + r.b, r);
  if (r.a !== r.b) RX_MAP.set(r.b + '|' + r.a, r);
});
function findReaction(a, b){
  if (!a || !b || a.type !== 'sub' || b.type !== 'sub') return null;
  return RX_MAP.get(a.sid + '|' + b.sid) || null;
}

/* ═══════════════ 常量 ═══════════════ */
const HP_MAX      = 30;
const HAND_MAX    = 5;
const ENERGY_MAX  = 6;
const ENERGY_TURN = 3;
const OP_MAX      = 2;      // 每回合最多打出的操作卡
const DECK_SIZE   = 40;
const FIZZLE_DMG  = 2;      // 无效反应自伤

/* ═══════════════ 状态 ═══════════════ */
let G = null;

function newDeck(){
  // 物质卡：按活性加权抽取，保证有足够的高分组合
  const pool = [];
  SUBSTANCES.forEach(s => {
    let n = 1;
    if (s.reactivity >= 4) n = 2;   // 活泼物质多给一张
    if (s.reactivity <= 1) n = 0;   // 惰性物质少出现
    for (let i = 0; i < n; i++) pool.push({type:'sub', sid:s.id, uid:0});
  });
  const ops = [];
  OPERATIONS.forEach(o => { for (let i = 0; i < o.count; i++) ops.push({type:'op', oid:o.id, uid:0}); });
  const deck = shuffle(pool.concat(ops));
  return deck.slice(0, DECK_SIZE).map((c, i) => ({...c, uid:'c' + i + '_' + Math.random().toString(36).slice(2, 7)}));
}
function shuffle(a){
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ═══════════════ 可玩性保底 ═══════════════
   手牌里若没有任何「能互相反应」的两张物质，双方就会永远打不出伤害 ——
   每回合抽牌后强制保证至少一对，牌库不配合时用经典配对兜底。 */
const GUARANTEE_PAIRS = [['HCl','NaOH'], ['H2SO4','NaOH'], ['Na','H2O'], ['HCl','Na2CO3'], ['H2O2','MnO2']];
let UID_SEQ = 0;
function newCard(sid){
  UID_SEQ++;
  return {type:'sub', sid, uid:'g' + UID_SEQ + '_' + Math.random().toString(36).slice(2, 6)};
}
function hasPair(hand){
  const subs = hand.filter(c => c.type === 'sub');
  for (let i = 0; i < subs.length; i++)
    for (let j = i + 1; j < subs.length; j++)
      if (findReaction(subs[i], subs[j])) return true;
  return false;
}
/* 优先换掉操作卡，其次换掉手牌最后一张（尽量保留已有物质） */
function swapOutOne(s, card){
  let oi = s.hand.findIndex(c => c.type === 'op');
  if (oi < 0) oi = s.hand.length - 1;
  if (oi < 0){ s.hand.push(card); return; }
  s.deck.push(s.hand.splice(oi, 1)[0]);
  s.hand.push(card);
}
function ensurePlayable(s){
  if (hasPair(s.hand)) return;
  // ① 从牌库里找一张能跟手上物质反应的牌换进来
  for (let tries = 0; tries < 60 && !hasPair(s.hand); tries++){
    const subsIn = s.hand.filter(c => c.type === 'sub');
    let di = -1;
    for (let i = 0; i < s.deck.length; i++){
      const c = s.deck[i];
      if (c.type !== 'sub') continue;
      if (subsIn.length === 0 || subsIn.some(x => findReaction(x, c))){ di = i; break; }
    }
    if (di < 0) break;
    swapOutOne(s, s.deck.splice(di, 1)[0]);
  }
  if (hasPair(s.hand)) return;
  // ② 牌库也不配合 → 用经典配对兜底（每回合最多造一对）
  for (const [x, y] of GUARANTEE_PAIRS){
    const ca = newCard(x), cb = newCard(y);
    if (!findReaction(ca, cb)) continue;
    swapOutOne(s, ca); swapOutOne(s, cb);
    if (hasPair(s.hand)) return;
  }
}

function newSide(name, isAI){
  const deck = newDeck();
  const hand = [];
  for (let i = 0; i < HAND_MAX; i++) if (deck.length) hand.push(deck.pop());
  return {name, isAI, hp:HP_MAX, shield:0, energy:ENERGY_TURN, deck, discard:[], hand,
          slots:[null, null], ops:[], opCount:0, skipEnergy:0};
}

function newGame(){
  G = {
    turn: 0,
    cur: 0,                 // 0=玩家 1=AI
    sides: [newSide('你', false), newSide('AI', true)],
    over: false,
    winner: -1,
    busy: false,
    log: [],
    stats: {rx:0, dmg:0, fizzle:0, best:0}
  };
  G.turn = 1;
  addLog('⚗ 反应对决开始 —— 用真实化学方程式击垮对手', 'eq');
  addLog('提示：选中一张物质后，手牌里能与之反应的牌会亮绿框。', '');
  drawTo(G.sides[0]); drawTo(G.sides[1]);
  renderAll();
}

function me(){ return G.sides[0]; }
function foe(){ return G.sides[1]; }
function side(i){ return G.sides[i]; }

/* ═══════════════ 抽牌/弃牌 ═══════════════ */
function drawTo(s, extra = 0){
  const target = HAND_MAX + extra;
  while (s.hand.length < target){
    if (!s.deck.length){
      if (!s.discard.length) break;
      s.deck = shuffle(s.discard.splice(0));
      addLog(`${s.name} 的牌库洗回 ${s.deck.length} 张`, '');
    }
    s.hand.push(s.deck.pop());
  }
  ensurePlayable(s);
}
function discardCard(s, card){
  s.discard.push({type:card.type, sid:card.sid, oid:card.oid, uid:card.uid});
}

/* ═══════════════ 出牌 ═══════════════ */
function playToSlot(cardUid, slot){
  if (G.over || G.busy || G.cur !== 0) return false;
  const s = me();
  const idx = s.hand.findIndex(c => c.uid === cardUid);
  if (idx < 0) return false;
  const card = s.hand[idx];
  if (card.type !== 'sub'){ return false; }
  if (s.energy < 1){ sfx('no'); return false; }

  // 若该槽已有牌，先退回手牌
  if (s.slots[slot]){ return swapSlot(slot, cardUid); }

  s.energy -= 1;
  s.hand.splice(idx, 1);
  card.paid = 1;
  s.slots[slot] = card;
  sfx('place');
  renderAll();
  return true;
}

function swapSlot(slot, cardUid){
  const s = me();
  const idx = s.hand.findIndex(c => c.uid === cardUid);
  if (idx < 0) return false;
  const old = s.slots[slot];
  const card = s.hand[idx];
  s.hand.splice(idx, 1);
  s.hand.push(old);
  s.slots[slot] = card;
  sfx('place');
  renderAll();
  return true;
}

function clearSlot(slot){
  const s = me();
  if (!s.slots[slot]) return;
  s.hand.push(s.slots[slot]);
  s.slots[slot] = null;
  renderAll();
}

function clearLab(){
  const s = me();
  [0, 1].forEach(i => {
    if (s.slots[i]){ s.hand.push(s.slots[i]); s.slots[i] = null; }
  });
  s.ops = [];
  s.opCount = 0;
  renderAll();
}

function playOp(cardUid){
  if (G.over || G.busy || G.cur !== 0) return false;
  const s = me();
  const idx = s.hand.findIndex(c => c.uid === cardUid);
  if (idx < 0) return false;
  const card = s.hand[idx];
  if (card.type !== 'op') return false;
  if (s.energy < 1){ sfx('no'); return false; }
  if (s.opCount >= OP_MAX){ toast('本回合操作卡已用满（' + OP_MAX + ' 张）'); return false; }

  s.energy -= 1;
  s.opCount += 1;
  s.hand.splice(idx, 1);
  const op = OP_MAP.get(card.oid);
  s.ops.push({...card, name:op.name, emoji:op.emoji, desc:op.desc});
  sfx('op');
  // 即时型操作
  if (card.oid === 'stir'){ drawTo(s, 2); addLog('🌀 搅拌：抽 2 张牌', 'me'); }
  if (card.oid === 'neut'){ s.shield += 4; addLog('🛡️ 中和剂：获得 4 点护盾', 'me'); }
  if (card.oid === 'filt'){ s.hp = Math.min(HP_MAX, s.hp + 3); addLog('🧴 过滤：回复 3 点 HP', 'me'); }
  if (card.oid === 'cool'){ foe().skipEnergy += 1; addLog('❄️ 冷却：对手下回合能量 −1', 'me'); }
  renderAll();
  return true;
}

function removeOp(i){
  const s = me();
  if (!s.ops[i]) return;
  s.hand.push(s.ops[i]);
  s.ops.splice(i, 1);
  s.opCount = Math.max(0, s.opCount - 1);
  renderAll();
}

/* ═══════════════ 反应结算 ═══════════════ */
function computePreview(){
  const s = me();
  const a = s.slots[0], b = s.slots[1];
  if (!a || !b) return null;
  const rx = findReaction(a, b);
  if (!rx) return {ok:false};
  let dmg = rx.dmg;
  const mods = [];
  s.ops.forEach(o => {
    if (o.oid === 'heat'){ dmg += 3; mods.push('加热 +3'); }
    if (o.oid === 'elec'){ dmg += 4; mods.push('通电 +4'); }
    if (o.oid === 'cata'){ dmg = Math.round(dmg * 1.5); mods.push('催化 ×1.5'); }
    if (o.oid === 'press'){ dmg += 2; mods.push('加压 +2'); }
  });
  const condMet = rx.cond && rx.cond.length
    ? rx.cond.every(c => s.ops.some(o => opMatchesCond(o.oid, c))) : false;
  if (condMet){ dmg += 3; mods.push('条件满足 +3'); }
  return {ok:true, rx, dmg, mods, condMet};
}
function opMatchesCond(oid, cond){
  if (cond === '点燃') return false;                 // 点燃由物质自身火焰属性代表
  if (cond === '加热') return oid === 'heat';
  if (cond === '催化剂') return oid === 'cata';
  return false;
}

const GAS_PROD = /H₂|O₂|Cl₂|CO₂|SO₂|NO|NO₂|H₂S|NH₃/;
const PPT_PROD = /↓/;

function ignite(){
  if (G.over || G.busy || G.cur !== 0) return;
  const s = me(), f = foe();
  const a = s.slots[0], b = s.slots[1];
  if (!a || !b) return;
  const pv = computePreview();
  s.slots = [null, null];
  const usedOps = s.ops.splice(0);
  s.opCount = 0;

  if (!pv || !pv.ok){
    // 逸散
    s.hp -= FIZZLE_DMG;
    G.stats.fizzle++;
    addLog(`💨 ${a.fid ? subName(a) : subName(a)} 与 ${subName(b)} 没有发生反应 —— 能量逸散，自伤 ${FIZZLE_DMG}`, 'bad');
    discardCard(s, a); discardCard(s, b);
    sfx('fizzle');
    afterResolve();
    return;
  }

  const rx = pv.rx;
  G.stats.rx++;
  G.stats.dmg += pv.dmg;
  G.stats.best = Math.max(G.stats.best, pv.dmg);
  addLog(`✅ ${rx.eq}`, 'eq');
  if (pv.mods.length) addLog(`   修正：${pv.mods.join(' · ')}`, '');
  damage(f, pv.dmg, '反应');

  // 产物特效
  const prods = rx.prod || [];
  if (prods.some(p => GAS_PROD.test(p))){
    f.skipEnergy += 1;
    addLog(`   气体逸出 → 对手下回合能量 −1`, 'me');
  }
  if (prods.some(p => PPT_PROD.test(p))){
    s.shield += 3;
    addLog(`   沉淀生成 → 你获得 3 点护盾`, 'me');
  }
  if (prods.some(p => p === 'H₂O')){
    s.hp = Math.min(HP_MAX, s.hp + 2);
    addLog(`   生成水 → 你回复 2 点 HP`, 'me');
  }
  discardCard(s, a); discardCard(s, b);
  usedOps.forEach(o => discardCard(s, o));
  sfx('boom');
  afterResolve();
}

function subName(card){
  const s = SUB_MAP.get(card.sid);
  return s ? s.formula : '?';
}

function damage(target, amount, src){
  let dmg = amount;
  if (target.shield > 0){
    const absorbed = Math.min(target.shield, dmg);
    target.shield -= absorbed;
    dmg -= absorbed;
    if (absorbed > 0) addLog(`   护盾吸收 ${absorbed} 点`, '');
  }
  target.hp -= dmg;
  if (dmg > 0) addLog(`   ${src}造成 ${dmg} 点伤害`, target === me() ? 'foe' : 'me');
  if (target.hp <= 0){
    target.hp = 0;
    endGame(target === me() ? 1 : 0);
  }
}

function afterResolve(){
  const s = me(), f = foe();
  // 消耗掉的操作卡已进弃牌堆
  s.ops = [];
  if (G.over){ renderAll(); return; }
  // 若手牌不足则补
  drawTo(s);
  renderAll();
}

/* ═══════════════ 回合 ═══════════════ */
/* 换手牌：整手退回牌库、重抽一手（1⚡，每回合一次）—— 保底机制之外的显式逃生口 */
function swapHand(){
  if (G.over || G.busy || G.cur !== 0) return false;
  const s = me();
  if (s.swapped){ toast('本回合已经换过手牌了'); sfx('no'); return false; }
  if (s.energy < 1){ toast('能量不足（换手牌需要 1⚡）'); sfx('no'); return false; }
  s.energy -= 1;
  s.swapped = true;
  const n = s.hand.length;
  s.deck.push(...s.hand.splice(0));
  s.deck = shuffle(s.deck);
  drawTo(s);
  ensurePlayable(s);
  addLog(`🎲 换手牌：退回 ${n} 张、重抽 ${s.hand.length} 张（−1⚡）`, 'me');
  sfx('place');
  renderAll();
  return true;
}

function endTurn(){
  if (G.over || G.busy || G.cur !== 0) return;
  const s = me();
  // 台上未用的牌退回
  [0, 1].forEach(i => { if (s.slots[i]){ s.hand.push(s.slots[i]); s.slots[i] = null; } });
  s.ops.forEach(o => s.hand.push(o));
  s.ops = [];
  s.opCount = 0;
  G.busy = true;
  renderAll();
  setTimeout(aiTurn, 620);
}

function aiTurn(){
  if (G.over){ G.busy = false; return; }
  G.cur = 1;
  const f = foe();
  f.energy = Math.min(ENERGY_MAX, ENERGY_TURN + (f.energy > ENERGY_MAX ? 0 : 0));
  if (f.skipEnergy > 0){ f.energy = Math.max(0, ENERGY_TURN - f.skipEnergy); f.skipEnergy = 0; }
  else f.energy = ENERGY_TURN;
  f.slots = [null, null]; f.ops = []; f.opCount = 0;
  drawTo(f);
  renderAll();

  const plan = aiPlan(f);
  const steps = plan.steps;
  let k = 0;
  const tick = () => {
    if (G.over){ G.busy = false; return; }
    if (k >= steps.length){ setTimeout(aiFinish, 340); return; }
    const st = steps[k++];
    st();
    renderAll();
    setTimeout(tick, 430);
  };
  setTimeout(tick, 300);
}

function aiFinish(){
  const f = foe();
  if (G.over){ G.busy = false; return; }
  // 结算
  if (f.slots[0] && f.slots[1]){
    const rx = findReaction(f.slots[0], f.slots[1]);
    if (rx){
      let dmg = rx.dmg;
      const mods = [];
      f.ops.forEach(o => {
        if (o.oid === 'heat'){ dmg += 3; mods.push('加热'); }
        if (o.oid === 'elec'){ dmg += 4; mods.push('通电'); }
        if (o.oid === 'cata'){ dmg = Math.round(dmg * 1.5); mods.push('催化'); }
        if (o.oid === 'press'){ dmg += 2; mods.push('加压'); }
      });
      addLog(`【对手】${rx.eq}`, 'foe');
      if (mods.length) addLog(`   对手修正：${mods.join(' · ')}`, 'foe');
      G.stats.rx++;
      damage(me(), dmg, '对手的反应');
      const prods = rx.prod || [];
      if (prods.some(p => GAS_PROD.test(p))){ me().skipEnergy += 1; addLog('   气体逸出 → 你下回合能量 −1', 'foe'); }
      if (prods.some(p => PPT_PROD.test(p))){ f.shield += 3; addLog('   沉淀生成 → 对手获得 3 点护盾', 'foe'); }
      if (prods.some(p => p === 'H₂O')){ f.hp = Math.min(HP_MAX, f.hp + 2); addLog('   生成水 → 对手回复 2 点 HP', 'foe'); }
      sfx('boom');
    } else {
      f.hp -= FIZZLE_DMG;
      addLog(`【对手】两张牌没有反应 —— 自伤 ${FIZZLE_DMG}`, 'foe');
    }
    discardCard(f, f.slots[0]); discardCard(f, f.slots[1]);
  }
  f.slots = [null, null];
  f.ops.forEach(o => discardCard(f, o));
  f.ops = [];
  drawTo(f);
  if (G.over){ G.busy = false; renderAll(); return; }
  nextRound();
}

function nextRound(){
  G.busy = false;
  G.cur = 0;
  G.turn++;
  const s = me();
  s.energy = Math.min(ENERGY_MAX, s.energy + 0);
  let gain = ENERGY_TURN;
  if (s.skipEnergy > 0){ gain = Math.max(1, ENERGY_TURN - s.skipEnergy); s.skipEnergy = 0; }
  s.energy = gain;
  s.opCount = 0;
  s.swapped = false;
  drawTo(s);
  addLog(`── 第 ${G.turn} 回合 · 你的回合 ──`, '');
  renderAll();
}

/* ═══════════════ AI ═══════════════ */
function aiPlan(f){
  const steps = [];
  // 1) 先找手上能成为最强反应的两张
  const subs = f.hand.filter(c => c.type === 'sub');
  const ops  = f.hand.filter(c => c.type === 'op');
  let best = null;
  for (let i = 0; i < subs.length; i++){
    for (let j = i + 1; j < subs.length; j++){
      const rx = findReaction(subs[i], subs[j]);
      if (rx && (!best || rx.dmg > best.rx.dmg)) best = {a:subs[i], b:subs[j], rx};
    }
  }
  // 难度：medium 有 25% 概率选次优，hard 总是最优
  if (best){
    // 操作卡强化
    const wantDmg = Math.random() < 0.55;
    if (wantDmg){
      const o = ops.find(x => x.oid === 'cata') || ops.find(x => x.oid === 'elec') || ops.find(x => x.oid === 'heat');
      if (o){
        steps.push(() => {
          const idx = f.hand.findIndex(c => c.uid === o.uid);
          if (idx < 0) return;
          f.hand.splice(idx, 1);
          const op = OP_MAP.get(o.oid);
          f.ops.push({...o, ...op});
          addLog(`【对手】使用 ${op.emoji} ${op.name}`, 'foe');
        });
      }
    }
    steps.push(() => {
      const i = f.hand.findIndex(c => c.uid === best.a.uid);
      if (i < 0) return;
      f.slots[0] = f.hand.splice(i, 1)[0];
    });
    steps.push(() => {
      const i = f.hand.findIndex(c => c.uid === best.b.uid);
      if (i < 0) return;
      f.slots[1] = f.hand.splice(i, 1)[0];
    });
    return {steps};
  }
  // 2) 没有现成组合：打一张最有希望的 + 防御操作
  const def = ops.find(x => x.oid === 'neut') || ops.find(x => x.oid === 'filt');
  if (f.hp < HP_MAX * 0.5 && def){
    steps.push(() => {
      const i = f.hand.findIndex(c => c.uid === def.uid);
      if (i < 0) return;
      f.hand.splice(i, 1);
      const op = OP_MAP.get(def.oid);
      if (op.id === 'neut') f.shield += 4;
      if (op.id === 'filt') f.hp = Math.min(HP_MAX, f.hp + 3);
      addLog(`【对手】使用 ${op.emoji} ${op.name}`, 'foe');
    });
  }
  // 挑一张能参与最多潜在反应的物质
  const score = new Map();
  subs.forEach(c => {
    let n = 0;
    subs.forEach(d => { if (d.uid !== c.uid && findReaction(c, d)) n++; });
    score.set(c.uid, n + (SUB_MAP.get(c.sid).reactivity * 0.2));
  });
  const top = subs.slice().sort((x, y) => (score.get(y.uid) || 0) - (score.get(x.uid) || 0))[0];
  if (top){
    steps.push(() => {
      const i = f.hand.findIndex(c => c.uid === top.uid);
      if (i < 0) return;
      f.slots[0] = f.hand.splice(i, 1)[0];
    });
  }
  return {steps};
}

/* ═══════════════ 结束 ═══════════════ */
function endGame(winner){
  if (G.over) return;
  G.over = true;
  G.winner = winner;
  G.busy = false;
  addLog(winner === 0 ? '🏆 你击败了炼金术士！' : '💀 你被对手的反应击溃…', winner === 0 ? 'eq' : 'bad');
  renderAll();
  setTimeout(() => {
    el('overEmoji').textContent = winner === 0 ? '🏆' : '💀';
    el('overTitle').textContent = winner === 0 ? '胜利' : '败北';
    el('overSub').textContent = winner === 0 ? '你的反应式更精准。' : '再试一次，注意配平。';
    el('overStats').innerHTML = `
      <div>成功反应<b>${G.stats.rx}</b></div>
      <div>累计伤害<b>${G.stats.dmg}</b></div>
      <div>最高单发<b>${G.stats.best}</b></div>
      <div>逸散次数<b>${G.stats.fizzle}</b></div>`;
    el('overModal').classList.add('show');
    sfx(winner === 0 ? 'win' : 'lose');
  }, 620);
}

/* ═══════════════ 渲染 ═══════════════ */
const el = id => document.getElementById(id);
function addLog(txt, cls){
  G.log.push({txt, cls});
  if (G.log.length > 120) G.log.shift();
}

function slotHTML(card){
  if (!card) return null;
  if (card.type === 'op'){
    const op = OP_MAP.get(card.oid);
    return `<div class="op-card-in"><span class="e">${op.emoji}</span>
      <div><div class="t">${op.name}</div><div class="d">${op.desc}</div></div></div>`;
  }
  const s = SUB_MAP.get(card.sid);
  return `<div class="scard">
    <span class="st">${s.emoji}</span>
    <div class="f">${s.formula}</div>
    <div class="n">${s.name} · ${s.state}态</div>
    <div class="tags">${s.tags.map(t => `<span class="tg">${t}</span>`).join('')}</div>
  </div>`;
}

function renderAll(){
  if (!G) return;
  const s = me(), f = foe();

  // HP
  el('meHpNum').textContent = Math.max(0, s.hp);
  el('foeHpNum').textContent = Math.max(0, f.hp);
  el('meHpBar').style.width = Math.max(0, s.hp) / HP_MAX * 100 + '%';
  el('foeHpBar').style.width = Math.max(0, f.hp) / HP_MAX * 100 + '%';
  el('meShield').classList.toggle('hidden', s.shield <= 0);
  el('foeShield').classList.toggle('hidden', f.shield <= 0);
  el('meShield').textContent = '🛡 ' + s.shield;
  el('foeShield').textContent = '🛡 ' + f.shield;
  el('meEnergy').textContent = '⚡ ' + s.energy;
  el('foeEnergy').textContent = '⚡ ' + (G.cur === 1 ? f.energy : ENERGY_TURN);
  el('meHand').textContent = '🃏 ' + s.hand.length;
  el('foeHand').textContent = '🃏 ' + f.hand.length;
  el('deckTip').textContent = '牌库 ' + s.deck.length;

  // 回合条
  const tb = el('turnBanner');
  tb.className = 'turn-banner ' + (G.cur === 0 ? 'mine' : 'foeTurn');
  tb.textContent = G.over
    ? (G.winner === 0 ? '你赢了' : '你输了')
    : `第 ${G.turn} 回合 · ${G.cur === 0 ? '你的回合' : '对手思考中…'}`;

  // 对手手牌背面
  el('foeHandRow').innerHTML = f.hand.map(() => '<div class="foe-card"></div>').join('');
  // 对手槽
  el('foeSlots').querySelectorAll('.mini-slot').forEach((node, i) => {
    const c = f.slots[i];
    node.classList.toggle('filled', !!c);
    node.textContent = c ? subName(c) : '';
  });
  el('foeHint').textContent = G.cur === 1 ? '正在配置反应…' : (f.slots[0] && f.slots[1] ? '已就位' : '等待中');

  // 我的槽
  const preview = computePreview();
  [0, 1].forEach(i => {
    const node = el('slot' + i);
    const c = s.slots[i];
    node.classList.toggle('filled', !!c);
    node.classList.toggle('hot', !!(c && preview && preview.ok));
    node.innerHTML = c
      ? slotHTML(c) + `<span class="rm" data-rm="${i}">✕</span>`
      : `<div class="slot-empty"><span class="slot-idx">${i === 0 ? 'A' : 'B'}</span><span class="slot-tip">放一张物质</span></div>`;
  });
  el('slot0').querySelectorAll('[data-rm]').forEach(n => n.onclick = ev => { ev.stopPropagation(); clearSlot(0); });
  el('slot1').querySelectorAll('[data-rm]').forEach(n => n.onclick = ev => { ev.stopPropagation(); clearSlot(1); });

  // 修正条
  el('modRow').innerHTML = s.ops.map((o, i) =>
    `<span class="mod">${o.emoji} ${o.name}<button data-op="${i}">✕</button></span>`).join('');

  // 预览
  const pv = el('preview');
  if (!s.slots[0] || !s.slots[1]){
    pv.className = 'preview';
    pv.innerHTML = s.slots[0] || s.slots[1]
      ? `<div class="pv-empty">再放一张能与之反应的物质 · 绿框牌可以配</div>`
      : `<div class="pv-empty">选两张物质放进 A / B，就能引发反应</div>`;
  } else if (preview && preview.ok){
    pv.className = 'preview pv-ok';
    pv.innerHTML = `<div class="pv-eq">${preview.rx.eq}</div>
      <div class="pv-sub">预计伤害 <span class="pv-dmg">${preview.dmg}</span>
      ${preview.mods.length ? ' · ' + preview.mods.join(' · ') : ''}
      ${preview.condMet ? ' · 条件满足' : ''}</div>`;
  } else {
    pv.className = 'preview pv-bad';
    pv.innerHTML = `<div class="pv-eq">这对物质不会反应</div>
      <div class="pv-sub">引发会能量逸散，自己受 ${FIZZLE_DMG} 点反噬</div>`;
  }

  // 按钮
  el('btnIgnite').disabled = !(s.slots[0] && s.slots[1]) || G.cur !== 0 || G.over || G.busy;
  const swapBtn = el('btnSwap');
  if (swapBtn){
    const blocked = G.cur !== 0 || G.over || G.busy || s.swapped || s.energy < 1;
    swapBtn.disabled = blocked;
    swapBtn.classList.toggle('need', !hasPair(s.hand) && !blocked);
  }

  // 手牌
  const first = s.slots[0] || s.slots[1];
  el('hand').innerHTML = s.hand.map(c => cardHTML(c, first)).join('') ||
    '<div class="card empty">手牌为空</div>';

  // 日志
  el('log').innerHTML = G.log.slice(-60).map(l =>
    `<div class="li ${l.cls || ''}">${l.txt}</div>`).join('');
  const lb = el('log');
  lb.scrollTop = lb.scrollHeight;
}

function cardHTML(c, first){
  if (c.type === 'op'){
    const op = OP_MAP.get(c.oid);
    return `<div class="card c-op" data-card="${c.uid}">
      <span class="c-st">${op.emoji}</span>
      <div class="c-f" style="font-size:15px">${op.name}</div>
      <div class="c-desc">${op.desc}</div>
      <span class="c-cost">1⚡</span>
    </div>`;
  }
  const s = SUB_MAP.get(c.sid);
  let match = false, dmg = 0;
  if (first && first.type === 'sub'){
    const rx = findReaction(first, c);
    if (rx){ match = true; dmg = rx.dmg; }
  }
  return `<div class="card ${match ? 'match' : ''}" data-card="${c.uid}">
    ${match ? '<span class="c-check">✓</span>' : ''}
    <span class="c-st">${s.emoji}</span>
    <div class="c-f">${s.formula}</div>
    <div class="c-n">${s.name}</div>
    <div class="c-tags">${s.tags.slice(0, 2).map(t => `<span class="c-tg">${t}</span>`).join('')}</div>
    ${match ? `<span class="c-dmg">✧ ${dmg}</span>` : ''}
    <span class="c-cost">1⚡</span>
  </div>`;
}

/* ═══════════════ 交互 ═══════════════ */
function bindUI(){
  el('hand').addEventListener('click', ev => {
    const node = ev.target.closest('[data-card]');
    if (!node) return;
    if (G.over || G.cur !== 0 || G.busy) return;
    const uid = node.dataset.card;
    const card = me().hand.find(c => c.uid === uid);
    if (!card) return;
    if (card.type === 'op'){ playOp(uid); return; }
    // 物质：优先填空槽，否则替换第一个
    const s = me();
    if (!s.slots[0]) playToSlot(uid, 0);
    else if (!s.slots[1]) playToSlot(uid, 1);
    else playToSlot(uid, 0);
  });

  el('slot0').onclick = () => { if (me().slots[0]) clearSlot(0); };
  el('slot1').onclick = () => { if (me().slots[1]) clearSlot(1); };

  el('modRow').addEventListener('click', ev => {
    const b = ev.target.closest('[data-op]');
    if (b) removeOp(+b.dataset.op);
  });

  el('btnIgnite').onclick = ignite;
  el('btnClear').onclick = clearLab;
  if (el('btnSwap')) el('btnSwap').onclick = swapHand;
  el('btnEnd').onclick = endTurn;
  el('btnRules').onclick = () => el('rulesModal').classList.add('show');
  el('btnCloseRules').onclick = () => el('rulesModal').classList.remove('show');
  el('rulesModal').onclick = ev => { if (ev.target === el('rulesModal')) el('rulesModal').classList.remove('show'); };
  el('btnRestart').onclick = () => { el('overModal').classList.remove('show'); newGame(); };
  el('btnAgain').onclick = () => { el('overModal').classList.remove('show'); newGame(); };
  el('btnSound').onclick = () => { toggleSound(); el('btnSound').textContent = soundOn() ? '🔊' : '🔇'; };
  el('btnSound').textContent = soundOn() ? '🔊' : '🔇';
}

/* ═══════════════ 音效（极简 WebAudio） ═══════════════ */
let AC = null, _sound = true;
function soundOn(){ return _sound; }
function toggleSound(){ _sound = !_sound; }
function sfx(kind){
  if (!_sound) return;
  try{
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    const t = AC.currentTime;
    const map = {
      place:  [520, 0.05, 'sine', 0.05],
      op:     [700, 0.07, 'triangle', 0.06],
      boom:   [150, 0.28, 'sawtooth', 0.11],
      fizzle: [110, 0.20, 'sine', 0.07],
      no:     [90,  0.10, 'square', 0.05],
      win:    [880, 0.34, 'sine', 0.10],
      lose:   [120, 0.42, 'sine', 0.09]
    };
    const [freq, dur, type, vol] = map[kind] || map.place;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (kind === 'boom') o.frequency.exponentialRampToValueAtTime(freq * 0.35, t + dur);
    if (kind === 'win') o.frequency.exponentialRampToValueAtTime(freq * 1.6, t + dur);
    if (kind === 'lose') o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }catch(e){}
}

/* ═══════════════ 提示 ═══════════════ */
let toastTimer = null;
function toast(msg){
  let n = document.getElementById('_toast');
  if (!n){
    n = document.createElement('div');
    n.id = '_toast';
    n.style.cssText = 'position:fixed;left:50%;bottom:120px;transform:translateX(-50%);' +
      'background:rgba(20,12,34,.96);border:1px solid #3a2a58;color:#e9e2f7;padding:9px 16px;' +
      'border-radius:10px;font-size:12.5px;z-index:200;pointer-events:none;transition:.22s;opacity:0';
    document.body.appendChild(n);
  }
  n.textContent = msg;
  n.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { n.style.opacity = '0'; }, 1600);
}

/* ═══════════════ 测试钩子（?debug） ═══════════════ */
if (location.search.indexOf('debug') >= 0){
  window.__rd = {
    get G(){ return G; },
    newGame, findReaction,
    state(){ return {
      turn:G.turn, cur:G.cur, over:G.over, winner:G.winner,
      me:{hp:me().hp, shield:me().shield, energy:me().energy, hand:me().hand.length, deck:me().deck.length, ops:(me().ops||[]).length, slots:me().slots.map(c=>c&&c.sid)},
      foe:{hp:foe().hp, shield:foe().shield, hand:foe().hand.length},
      stats:{...G.stats}, log:G.log.length
    }; },
    hand(){ return me().hand.map(c => ({uid:c.uid, type:c.type, sid:c.sid, oid:c.oid})); },
    give(sid){ me().hand.push({type:'sub', sid, uid:'t'+Math.random().toString(36).slice(2,8)}); renderAll(); return me().hand.length; },
    giveOp(oid){ me().hand.push({type:'op', oid, uid:'t'+Math.random().toString(36).slice(2,8)}); renderAll(); return me().hand.length; },
    fill(){ me().energy = ENERGY_MAX; renderAll(); },
    put(sid, slot){
      const before = me().hand.length;
      const uid = 't' + Math.random().toString(36).slice(2,8);
      me().hand.push({type:'sub', sid, uid});
      const ok = playToSlot(uid, slot);
      return ok;
    },
    op(oid){ const uid='t'+Math.random().toString(36).slice(2,8); me().hand.push({type:'op',oid,uid}); return playOp(uid); },
    ignite, endTurn,
    rxCount(){ return REACTIONS.length; },
    subCount(){ return SUBSTANCES.length; },
    opCount(){ return OPERATIONS.length; },
    dmgPreview(){ const p = computePreview(); return p ? {ok:!!p.ok, dmg:p.dmg||0, eq:(p.rx&&p.rx.eq)||''} : {ok:false, dmg:0, eq:''}; },
    forceWin(w){ endGame(w); }
  };
}

/* ═══════════════ 启动 ═══════════════ */
document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  newGame();
});
