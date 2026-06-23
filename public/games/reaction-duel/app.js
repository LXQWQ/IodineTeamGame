// ===== 化学物质数据 (60张) =====
const SUBSTANCES = [
  {id:'Li',name:'锂',formula:'Li',state:'固体',cat:'金属',tags:['还原剂','碱性前体'],reactivity:4,tox:'中毒',dmg:7,emoji:'⚪'},
  {id:'Na',name:'钠',formula:'Na',state:'固体',cat:'金属',tags:['还原剂','碱性前体'],reactivity:5,tox:'剧毒',dmg:8,emoji:'🟡'},
  {id:'K',name:'钾',formula:'K',state:'固体',cat:'金属',tags:['还原剂','碱性前体'],reactivity:5,tox:'剧毒',dmg:9,emoji:'🟣'},
  {id:'Mg',name:'镁',formula:'Mg',state:'固体',cat:'金属',tags:['还原剂','可燃'],reactivity:3,tox:'无毒',dmg:5,emoji:'⬜'},
  {id:'Ca',name:'钙',formula:'Ca',state:'固体',cat:'金属',tags:['还原剂','碱性前体'],reactivity:3,tox:'低毒',dmg:5,emoji:'⬜'},
  {id:'Al',name:'铝',formula:'Al',state:'固体',cat:'金属',tags:['还原剂'],reactivity:2,tox:'无毒',dmg:4,emoji:'⬜'},
  {id:'Zn',name:'锌',formula:'Zn',state:'固体',cat:'金属',tags:['还原剂'],reactivity:2,tox:'低毒',dmg:4,emoji:'🔘'},
  {id:'Fe',name:'铁',formula:'Fe',state:'固体',cat:'金属',tags:['还原剂','催化剂'],reactivity:2,tox:'无毒',dmg:3,emoji:'⚫'},
  {id:'Cu',name:'铜',formula:'Cu',state:'固体',cat:'金属',tags:['催化剂前体'],reactivity:1,tox:'低毒',dmg:2,emoji:'🟠'},
  {id:'Ag',name:'银',formula:'Ag',state:'固体',cat:'金属',tags:['催化剂前体','沉淀剂'],reactivity:1,tox:'低毒',dmg:2,emoji:'⬜'},
  {id:'Pb',name:'铅',formula:'Pb',state:'固体',cat:'金属',tags:['沉淀剂'],reactivity:1,tox:'剧毒',dmg:3,emoji:'⚫'},
  {id:'Hg',name:'汞',formula:'Hg',state:'液体',cat:'金属',tags:['催化剂','毒性'],reactivity:1,tox:'剧毒',dmg:4,emoji:'🪩'},
  {id:'C',name:'碳',formula:'C',state:'固体',cat:'非金属',tags:['可燃','还原剂'],reactivity:2,tox:'无毒',dmg:3,emoji:'⚫'},
  {id:'S',name:'硫',formula:'S',state:'固体',cat:'非金属',tags:['可燃','沉淀剂前体'],reactivity:2,tox:'低毒',dmg:3,emoji:'🟡'},
  {id:'P',name:'磷',formula:'P',state:'固体',cat:'非金属',tags:['可燃','剧毒'],reactivity:3,tox:'剧毒',dmg:5,emoji:'🔴'},
  {id:'H2',name:'氢气',formula:'H₂',state:'气体',cat:'非金属',tags:['可燃','还原剂'],reactivity:3,tox:'无毒',dmg:4,emoji:'🫧'},
  {id:'O2',name:'氧气',formula:'O₂',state:'气体',cat:'非金属',tags:['助燃','氧化剂'],reactivity:2,tox:'无毒',dmg:2,emoji:'🔵'},
  {id:'N2',name:'氮气',formula:'N₂',state:'气体',cat:'非金属',tags:[],reactivity:1,tox:'无毒',dmg:1,emoji:'🔵'},
  {id:'Cl2',name:'氯气',formula:'Cl₂',state:'气体',cat:'非金属',tags:['氧化剂','氯化剂','剧毒'],reactivity:3,tox:'剧毒',dmg:6,emoji:'🟢'},
  {id:'Br2',name:'溴',formula:'Br₂',state:'液体',cat:'非金属',tags:['氧化剂','腐蚀性'],reactivity:3,tox:'剧毒',dmg:5,emoji:'🟤'},
  {id:'I2',name:'碘',formula:'I₂',state:'固体',cat:'非金属',tags:['氧化剂','消毒'],reactivity:2,tox:'中毒',dmg:4,emoji:'🟣'},
  {id:'Si',name:'硅',formula:'Si',state:'固体',cat:'非金属',tags:['半导体'],reactivity:1,tox:'无毒',dmg:2,emoji:'⬜'},
  {id:'HCl',name:'盐酸',formula:'HCl',state:'溶液',cat:'酸',tags:['酸性','氯化剂'],reactivity:4,tox:'中毒',dmg:6,emoji:'🧪'},
  {id:'H2SO4',name:'硫酸',formula:'H₂SO₄',state:'溶液',cat:'酸',tags:['酸性','氧化剂','脱水'],reactivity:4,tox:'剧毒',dmg:8,emoji:'🧪'},
  {id:'HNO3',name:'硝酸',formula:'HNO₃',state:'溶液',cat:'酸',tags:['酸性','氧化剂'],reactivity:4,tox:'剧毒',dmg:7,emoji:'🧪'},
  {id:'H3PO4',name:'磷酸',formula:'H₃PO₄',state:'溶液',cat:'酸',tags:['酸性'],reactivity:2,tox:'中毒',dmg:4,emoji:'🧪'},
  {id:'HF',name:'氢氟酸',formula:'HF',state:'溶液',cat:'酸',tags:['酸性','腐蚀性'],reactivity:3,tox:'剧毒',dmg:6,emoji:'🧪'},
  {id:'CH3COOH',name:'乙酸',formula:'CH₃COOH',state:'溶液',cat:'酸',tags:['酸性','可燃'],reactivity:2,tox:'低毒',dmg:3,emoji:'🧪'},
  {id:'H2CO3',name:'碳酸',formula:'H₂CO₃',state:'溶液',cat:'酸',tags:['酸性','易分解'],reactivity:1,tox:'低毒',dmg:2,emoji:'🧪'},
  {id:'H2S',name:'硫化氢',formula:'H₂S',state:'气体',cat:'酸',tags:['酸性','可燃','剧毒'],reactivity:2,tox:'剧毒',dmg:5,emoji:'💨'},
  {id:'NaOH',name:'氢氧化钠',formula:'NaOH',state:'固体',cat:'碱',tags:['碱性','腐蚀性'],reactivity:4,tox:'剧毒',dmg:6,emoji:'⬜'},
  {id:'KOH',name:'氢氧化钾',formula:'KOH',state:'固体',cat:'碱',tags:['碱性','腐蚀性'],reactivity:4,tox:'剧毒',dmg:6,emoji:'⬜'},
  {id:'CaOH2',name:'氢氧化钙',formula:'Ca(OH)₂',state:'固体',cat:'碱',tags:['碱性'],reactivity:2,tox:'中毒',dmg:4,emoji:'⬜'},
  {id:'MgOH2',name:'氢氧化镁',formula:'Mg(OH)₂',state:'固体',cat:'碱',tags:['碱性'],reactivity:1,tox:'无毒',dmg:2,emoji:'⬜'},
  {id:'NH3',name:'氨气',formula:'NH₃',state:'气体',cat:'碱',tags:['碱性','还原剂'],reactivity:3,tox:'中毒',dmg:4,emoji:'💨'},
  {id:'Na2CO3',name:'碳酸钠',formula:'Na₂CO₃',state:'固体',cat:'碱',tags:['碱性','碳酸根'],reactivity:3,tox:'中毒',dmg:4,emoji:'⬜'},
  {id:'NaHCO3',name:'碳酸氢钠',formula:'NaHCO₃',state:'固体',cat:'碱',tags:['碱性','碳酸氢根'],reactivity:2,tox:'无毒',dmg:3,emoji:'⬜'},
  {id:'AlOH3',name:'氢氧化铝',formula:'Al(OH)₃',state:'固体',cat:'碱',tags:['碱性','两性'],reactivity:1,tox:'无毒',dmg:2,emoji:'⬜'},
  {id:'NaCl',name:'氯化钠',formula:'NaCl',state:'固体',cat:'盐',tags:['氯化物'],reactivity:1,tox:'无毒',dmg:1,emoji:'⬜'},
  {id:'CaCO3',name:'碳酸钙',formula:'CaCO₃',state:'固体',cat:'盐',tags:['碳酸盐','沉淀'],reactivity:2,tox:'无毒',dmg:3,emoji:'⬜'},
  {id:'CuSO4',name:'硫酸铜',formula:'CuSO₄',state:'溶液',cat:'盐',tags:['铜离子','氧化性'],reactivity:3,tox:'剧毒',dmg:5,emoji:'🔵'},
  {id:'FeCl3',name:'氯化铁',formula:'FeCl₃',state:'溶液',cat:'盐',tags:['氧化剂','铁离子'],reactivity:3,tox:'中毒',dmg:5,emoji:'🟠'},
  {id:'AgNO3',name:'硝酸银',formula:'AgNO₃',state:'溶液',cat:'盐',tags:['银离子','氧化剂','沉淀剂'],reactivity:3,tox:'剧毒',dmg:6,emoji:'⬜'},
  {id:'BaCl2',name:'氯化钡',formula:'BaCl₂',state:'固体',cat:'盐',tags:['钡离子','沉淀剂'],reactivity:2,tox:'剧毒',dmg:4,emoji:'⬜'},
  {id:'KMnO4',name:'高锰酸钾',formula:'KMnO₄',state:'固体',cat:'盐',tags:['强氧化剂','紫色'],reactivity:5,tox:'中毒',dmg:9,emoji:'🟣'},
  {id:'Na2SO4',name:'硫酸钠',formula:'Na₂SO₄',state:'固体',cat:'盐',tags:['硫酸盐'],reactivity:1,tox:'无毒',dmg:1,emoji:'⬜'},
  {id:'H2O',name:'水',formula:'H₂O',state:'液体',cat:'氧化物',tags:['溶剂','稳定'],reactivity:1,tox:'无毒',dmg:0,emoji:'💧'},
  {id:'H2O2',name:'过氧化氢',formula:'H₂O₂',state:'液体',cat:'氧化物',tags:['氧化剂','助燃','易分解'],reactivity:3,tox:'低毒',dmg:4,emoji:'💧'},
  {id:'CO2',name:'二氧化碳',formula:'CO₂',state:'气体',cat:'氧化物',tags:['酸性氧化物'],reactivity:1,tox:'低毒',dmg:1,emoji:'💨'},
  {id:'SO2',name:'二氧化硫',formula:'SO₂',state:'气体',cat:'氧化物',tags:['酸性氧化物','还原剂','剧毒'],reactivity:2,tox:'剧毒',dmg:4,emoji:'💨'},
  {id:'NO2',name:'二氧化氮',formula:'NO₂',state:'气体',cat:'氧化物',tags:['氧化剂','剧毒'],reactivity:3,tox:'剧毒',dmg:5,emoji:'🟤'},
  {id:'CaO',name:'氧化钙',formula:'CaO',state:'固体',cat:'氧化物',tags:['碱性氧化物','吸水'],reactivity:2,tox:'中毒',dmg:3,emoji:'⬜'},
  {id:'Fe2O3',name:'氧化铁',formula:'Fe₂O₃',state:'固体',cat:'氧化物',tags:['氧化剂','颜料'],reactivity:1,tox:'无毒',dmg:2,emoji:'🔴'},
  {id:'MnO2',name:'二氧化锰',formula:'MnO₂',state:'固体',cat:'氧化物',tags:['催化剂','氧化剂'],reactivity:2,tox:'中毒',dmg:3,emoji:'⚫'},
  {id:'CH4',name:'甲烷',formula:'CH₄',state:'气体',cat:'有机物',tags:['可燃','温室气体'],reactivity:2,tox:'低毒',dmg:3,emoji:'🔥'},
  {id:'C2H5OH',name:'乙醇',formula:'C₂H₅OH',state:'液体',cat:'有机物',tags:['可燃','还原剂','消毒'],reactivity:2,tox:'低毒',dmg:3,emoji:'🍶'},
  {id:'CH3COOH_org',name:'乙酸',formula:'CH₃COOH',state:'液体',cat:'有机物',tags:['酸性','可燃'],reactivity:2,tox:'低毒',dmg:3,emoji:'🧪'},
  {id:'C6H12O6',name:'葡萄糖',formula:'C₆H₁₂O₆',state:'固体',cat:'有机物',tags:['还原剂','营养'],reactivity:1,tox:'无毒',dmg:2,emoji:'🍬'},
  {id:'C6H6',name:'苯',formula:'C₆H₆',state:'液体',cat:'有机物',tags:['可燃','致癌'],reactivity:2,tox:'剧毒',dmg:4,emoji:'🧫'},
  {id:'C3H6O',name:'丙酮',formula:'CH₃COCH₃',state:'液体',cat:'有机物',tags:['可燃','溶剂'],reactivity:2,tox:'低毒',dmg:3,emoji:'🧪'},
];
const SUBSTANCE_MAP = {};
SUBSTANCES.forEach(s=>SUBSTANCE_MAP[s.id]=s);

// ===== 操作卡 (20张) =====
const OPERATIONS = [
  {id:'heat',name:'加热',desc:'反应活性+2,或使固体熔化',effect:{type:'boost',reactivity:2},emoji:'🔥',count:4},
  {id:'elec',name:'通电',desc:'引发电解或电离反应',effect:{type:'condition',condition:'通电'},emoji:'⚡',count:3},
  {id:'cata',name:'催化剂',desc:'反应伤害×1.5,不消耗',effect:{type:'multiply',dmgMult:1.5},emoji:'💎',count:3},
  {id:'cool',name:'冷却',desc:'对手反应活性-2(1回合)',effect:{type:'debuff',target:'opponent',reactivity:-2},emoji:'❄️',count:2},
  {id:'press',name:'加压',desc:'气体反应伤害+3',effect:{type:'boost',gasDmg:3},emoji:'💪',count:2},
  {id:'extract',name:'萃取',desc:'从产物回收一种物质',effect:{type:'extract'},emoji:'🧫',count:2},
  {id:'neutral',name:'中和剂',desc:'获得5点护盾',effect:{type:'shield',shield:5},emoji:'🛡️',count:2},
  {id:'filter',name:'过滤',desc:'沉淀物→4点防御',effect:{type:'filter'},emoji:'🔬',count:2},
];

// ===== 化学反应数据库 (45个) =====
const REACTIONS = [
  {a:'Na',b:'HCl',eq:'2Na+2HCl→2NaCl+H₂↑',dmg:12,prod:['NaCl','H₂'],cond:[]},
  {a:'K',b:'HCl',eq:'2K+2HCl→2KCl+H₂↑',dmg:13,prod:['KCl','H₂'],cond:[]},
  {a:'Mg',b:'HCl',eq:'Mg+2HCl→MgCl₂+H₂↑',dmg:9,prod:['MgCl₂','H₂'],cond:[]},
  {a:'Ca',b:'HCl',eq:'Ca+2HCl→CaCl₂+H₂↑',dmg:9,prod:['CaCl₂','H₂'],cond:[]},
  {a:'Zn',b:'HCl',eq:'Zn+2HCl→ZnCl₂+H₂↑',dmg:8,prod:['ZnCl₂','H₂'],cond:[]},
  {a:'Fe',b:'HCl',eq:'Fe+2HCl→FeCl₂+H₂↑',dmg:7,prod:['FeCl₂','H₂'],cond:[]},
  {a:'Al',b:'HCl',eq:'2Al+6HCl→2AlCl₃+3H₂↑',dmg:10,prod:['AlCl₃','H₂'],cond:[]},
  {a:'Na',b:'H2SO4',eq:'2Na+H₂SO₄→Na₂SO₄+H₂↑',dmg:14,prod:['Na₂SO₄','H₂'],cond:[]},
  {a:'Mg',b:'H2SO4',eq:'Mg+H₂SO₄→MgSO₄+H₂↑',dmg:10,prod:['MgSO₄','H₂'],cond:[]},
  {a:'Zn',b:'H2SO4',eq:'Zn+H₂SO₄→ZnSO₄+H₂↑',dmg:9,prod:['ZnSO₄','H₂'],cond:[]},
  {a:'Fe',b:'CuSO4',eq:'Fe+CuSO₄→FeSO₄+Cu↓',dmg:8,prod:['FeSO₄','Cu'],cond:[]},
  {a:'Zn',b:'CuSO4',eq:'Zn+CuSO₄→ZnSO₄+Cu↓',dmg:9,prod:['ZnSO₄','Cu'],cond:[]},
  {a:'Na',b:'H2O',eq:'2Na+2H₂O→2NaOH+H₂↑',dmg:10,prod:['NaOH','H₂'],cond:[]},
  {a:'K',b:'H2O',eq:'2K+2H₂O→2KOH+H₂↑',dmg:11,prod:['KOH','H₂'],cond:[]},
  {a:'Ca',b:'H2O',eq:'Ca+2H₂O→Ca(OH)₂+H₂↑',dmg:7,prod:['Ca(OH)₂','H₂'],cond:[]},
  {a:'NaOH',b:'HCl',eq:'NaOH+HCl→NaCl+H₂O',dmg:8,prod:['NaCl','H₂O'],cond:[]},
  {a:'KOH',b:'HCl',eq:'KOH+HCl→KCl+H₂O',dmg:8,prod:['KCl','H₂O'],cond:[]},
  {a:'NaOH',b:'H2SO4',eq:'2NaOH+H₂SO₄→Na₂SO₄+2H₂O',dmg:10,prod:['Na₂SO₄','H₂O'],cond:[]},
  {a:'CaOH2',b:'HCl',eq:'Ca(OH)₂+2HCl→CaCl₂+2H₂O',dmg:8,prod:['CaCl₂','H₂O'],cond:[]},
  {a:'NH3',b:'HCl',eq:'NH₃+HCl→NH₄Cl',dmg:6,prod:['NH₄Cl'],cond:[]},
  {a:'Na2CO3',b:'HCl',eq:'Na₂CO₃+2HCl→2NaCl+H₂O+CO₂↑',dmg:9,prod:['NaCl','H₂O','CO₂'],cond:[]},
  {a:'NaHCO3',b:'HCl',eq:'NaHCO₃+HCl→NaCl+H₂O+CO₂↑',dmg:7,prod:['NaCl','H₂O','CO₂'],cond:[]},
  {a:'CaCO3',b:'HCl',eq:'CaCO₃+2HCl→CaCl₂+H₂O+CO₂↑',dmg:8,prod:['CaCl₂','H₂O','CO₂'],cond:[]},
  {a:'KMnO4',b:'H2O2',eq:'2KMnO₄+3H₂O₂→2MnO₂+3O₂↑+2KOH+2H₂O',dmg:12,prod:['MnO₂','O₂','KOH','H₂O'],cond:[]},
  {a:'H2O2',b:'MnO2',eq:'2H₂O₂→2H₂O+O₂↑(MnO₂催化)',dmg:6,prod:['H₂O','O₂'],cond:['催化剂']},
  {a:'H2',b:'O2',eq:'2H₂+O₂→2H₂O(点燃)',dmg:14,prod:['H₂O'],cond:['点燃']},
  {a:'CH4',b:'O2',eq:'CH₄+2O₂→CO₂+2H₂O(点燃)',dmg:10,prod:['CO₂','H₂O'],cond:['点燃']},
  {a:'C2H5OH',b:'O2',eq:'C₂H₅OH+3O₂→2CO₂+3H₂O(点燃)',dmg:10,prod:['CO₂','H₂O'],cond:['点燃']},
  {a:'S',b:'O2',eq:'S+O₂→SO₂↑(点燃)',dmg:7,prod:['SO₂'],cond:['点燃']},
  {a:'C',b:'O2',eq:'C+O₂→CO₂(点燃)',dmg:6,prod:['CO₂'],cond:['点燃']},
  {a:'Fe',b:'O2',eq:'3Fe+2O₂→Fe₃O₄(点燃)',dmg:8,prod:['Fe₃O₄'],cond:['点燃']},
  {a:'Mg',b:'O2',eq:'2Mg+O₂→2MgO(点燃)',dmg:9,prod:['MgO'],cond:['点燃']},
  {a:'AgNO3',b:'NaCl',eq:'AgNO₃+NaCl→AgCl↓+NaNO₃',dmg:6,prod:['AgCl','NaNO₃'],cond:[]},
  {a:'BaCl2',b:'Na2SO4',eq:'BaCl₂+Na₂SO₄→BaSO₄↓+2NaCl',dmg:7,prod:['BaSO₄','NaCl'],cond:[]},
  {a:'FeCl3',b:'NaOH',eq:'FeCl₃+3NaOH→Fe(OH)₃↓+3NaCl',dmg:8,prod:['Fe(OH)₃','NaCl'],cond:[]},
  {a:'CuSO4',b:'NaOH',eq:'CuSO₄+2NaOH→Cu(OH)₂↓+Na₂SO₄',dmg:7,prod:['Cu(OH)₂','Na₂SO₄'],cond:[]},
  {a:'BaCl2',b:'H2SO4',eq:'BaCl₂+H₂SO₄→BaSO₄↓+2HCl',dmg:8,prod:['BaSO₄','HCl'],cond:[]},
  {a:'AgNO3',b:'HCl',eq:'AgNO₃+HCl→AgCl↓+HNO₃',dmg:7,prod:['AgCl','HNO₃'],cond:[]},
  {a:'CaO',b:'H2O',eq:'CaO+H₂O→Ca(OH)₂',dmg:4,prod:['Ca(OH)₂'],cond:[]},
  {a:'CO2',b:'H2O',eq:'CO₂+H₂O⇌H₂CO₃',dmg:2,prod:['H₂CO₃'],cond:[]},
  {a:'SO2',b:'H2O',eq:'SO₂+H₂O⇌H₂SO₃',dmg:4,prod:['H₂SO₃'],cond:[]},
  {a:'H2',b:'Cl2',eq:'H₂+Cl₂→2HCl(光照/点燃)',dmg:12,prod:['HCl'],cond:['点燃']},
  {a:'Na',b:'Cl2',eq:'2Na+Cl₂→2NaCl(点燃)',dmg:10,prod:['NaCl'],cond:['点燃']},
  {a:'KMnO4',b:'HCl',eq:'2KMnO₄+16HCl→2KCl+2MnCl₂+5Cl₂↑+8H₂O',dmg:14,prod:['KCl','MnCl₂','Cl₂','H₂O'],cond:[]},
  {a:'H2SO4',b:'Cu',eq:'Cu+2H₂SO₄(浓)→CuSO₄+SO₂↑+2H₂O(加热)',dmg:10,prod:['CuSO₄','SO₂','H₂O'],cond:['加热']},
];
const REACTION_MAP = {};
REACTIONS.forEach(r => {
  const key = [r.a,r.b].sort().join('+');
  if(!REACTION_MAP[key]) REACTION_MAP[key]=[];
  REACTION_MAP[key].push(r);
});

function expandOps() {
  const ops = [];
  OPERATIONS.forEach(op => { for(let i=0;i<op.count;i++) ops.push({...op}); });
  return ops;
}

let Game = {}; // 全局引用

// ===== 游戏引擎 =====
class ReactionDuel {
  constructor() { this.reset(); }

  reset() {
    const ov = document.querySelector('.game-over-overlay'); if(ov) ov.remove();
    const rm = document.querySelector('.reaction-modal'); if(rm) rm.remove();
    this.deck = this.shuffle([...SUBSTANCES,...SUBSTANCES,...expandOps()]);
    this.players = [
      {hp:30,maxHp:30,hand:[],reaction:[],products:[],shield:0,activeOps:[],usedHeat:false,hasDrawn:false,name:'你'},
      {hp:30,maxHp:30,hand:[],reaction:[],products:[],shield:0,activeOps:[],usedHeat:false,hasDrawn:false,name:'对手'}
    ];
    this.currentPlayer = 0;
    this.phase = 'start';
    this.turn = 1;
    this.gameOver = false;
    this.winner = null;
    this.waitingForConfirm = false;
    this.pendingReaction = null;
    this.log = ['🔄 炼金术士对决开始!'];
    Game.instance = this;
    for(let p=0;p<2;p++) for(let i=0;i<5;i++) this.drawCard(p);
    this.logMsg('🎴 双方各抽5张起始手牌');
    this.phase = 'main';
    this.render();
    setTimeout(()=>this.startTurn(), 100);
  }

  shuffle(arr) {
    for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]}
    return arr;
  }

  drawCard(idx) {
    if(this.deck.length===0) return null;
    const card = this.deck.pop();
    this.players[idx].hand.push(card);
    return card;
  }

  startTurn() {
    if(this.gameOver) return;
    this.phase = 'draw';
    this.render();
    const p = this.players[this.currentPlayer];
    p.hasDrawn = false;
    // 自动抽牌
    this.drawPhase();
  }

  drawPhase() {
    const p = this.players[this.currentPlayer];
    if(p.hasDrawn) return;
    p.hasDrawn = true;
    if(this.deck.length===0) {
      this.logMsg('⚠️ 牌库已空!');
    } else {
      for(let i=0;i<2;i++) this.drawCard(this.currentPlayer);
      this.logMsg(`📤 ${this.currentPlayer===0?'你':'对手'}抽取2张牌 (手牌:${p.hand.length}张)`);
    }
    this.phase = 'main';
    this.render();
    if(this.currentPlayer===1) setTimeout(()=>this.aiTurn(), 500);
  }

  playCard(idx, handIdx) {
    if(this.gameOver||this.waitingForConfirm) return;
    if(idx!==this.currentPlayer||this.phase!=='main') return;
    const p = this.players[idx];
    if(handIdx<0||handIdx>=p.hand.length) return;
    const card = p.hand[handIdx];
    p.usedHeat = false;
    if(card.count!==undefined) {
      // 操作卡
      this.applyOperation(idx, card, handIdx);
      this.render();
      if(this.currentPlayer===1) this.endTurn();
      return;
    }
    // 物质卡:需要抽牌阶段先完成
    if(!p.hasDrawn) {
      this.logMsg('⚠️ 请先完成抽牌阶段');
      return;
    }
    if(p.reaction.length>=2) {
      this.logMsg('⚠️ 反应区已满');
      return;
    }
    p.hand.splice(handIdx,1);
    p.reaction.push({...card});
    this.logMsg(`🧪 ${idx===0?'你':'对手'}放置了 ${card.name}(${card.formula})`);
    this.render();
    if(p.reaction.length===2) {
      const r = this.checkReaction(idx);
      if(r) {
        this.phase = 'reaction';
        this.pendingReaction = r;
        this.render();
        if(idx===0) this.showReactionConfirm(idx, r);
        else this.aiConfirmReaction(idx, r);
      } else {
        this.logMsg('❌ 这两张物质无法发生反应');
        this.phase = 'main';
        this.render();
      }
    }
  }

  checkReaction(idx) {
    const p = this.players[idx];
    if(p.reaction.length<2) return null;
    const c1 = p.reaction[0], c2 = p.reaction[1];
    const key = [c1.id,c2.id].sort().join('+');
    const candidates = REACTION_MAP[key]||[];
    if(candidates.length===0) return null;
    for(const r of candidates){
      if(r.cond&&r.cond.length>0){
        let hasCond = false;
        for(const c of r.cond){
          if(c==='点燃'||c==='加热'){
            if(p.activeOps.some(o=>o.source==='加热'||o.source==='点燃')) hasCond=true;
          }
          if(c==='通电'&&p.activeOps.some(o=>o.source==='通电')) hasCond=true;
          if(c==='催化剂'&&p.activeOps.some(o=>o.source==='催化剂')) hasCond=true;
        }
        if(!hasCond) continue;
      }
      return r;
    }
    return null;
  }

  applyOperation(idx, op, handIdx) {
    const p = this.players[idx];
    p.hand.splice(handIdx,1);
    this.logMsg(`⚡ ${idx===0?'你':'对手'}使用了 ${op.name}`);
    if(op.effect.type==='boost') {
      if(op.id==='press') {
        p.activeOps.push({type:'gasDmg',val:3,source:'加压'});
        this.logMsg('💪 加压激活');
      } else if(op.id==='heat') {
        p.activeOps.push({type:'reactivity',val:2,source:'加热'});
        p.usedHeat = true;
        this.logMsg('🔥 加热:反应活性+2');
      }
    } else if(op.effect.type==='multiply') {
      p.activeOps.push({type:'multiply',val:1.5,source:'催化剂',persist:true});
      this.logMsg('💎 催化剂:伤害×1.5');
    } else if(op.effect.type==='debuff') {
      const opp = this.players[1-idx];
      opp.activeOps.push({type:'reactivity',val:-2,source:'冷却',duration:1});
      this.logMsg('❄️ 冷却:对手活性-2');
    } else if(op.effect.type==='shield') {
      p.shield += op.effect.shield;
      this.logMsg(`🛡️ 中和剂:+${op.effect.shield}护盾`);
    } else if(op.effect.type==='extract') {
      if(p.products.length>0) {
        const prod = p.products.pop();
        this.logMsg(`🧫 萃取回收到:${prod}`);
      } else this.logMsg('⚠️ 无产物可萃取');
    } else if(op.effect.type==='filter') {
      const hasPpt = p.products.some(x=>x.includes('↓'));
      if(hasPpt) { p.shield+=4; this.logMsg('🔬 过滤获得4防'); }
      else this.logMsg('⚠️ 无沉淀物');
    }
    this.render();
  }

  showReactionConfirm(idx, r) {
    this.waitingForConfirm = true;
    const ov = document.createElement('div');
    ov.className = 'reaction-modal';
    ov.id = 'reactModal';
    const dmg = this.calcDmg(idx, r);
    ov.innerHTML = `<div class="box">
      <h3>⚗️ ${r.eq.includes('点燃')?'🔥 需要点燃条件!':'化学反应触发!'}</h3>
      <div class="eq">${r.eq}</div>
      <div class="prod">产物: ${r.prod.join(', ')}</div>
      <div class="dmg-preview">💥 ${r.cond.includes('点燃')?'(需加热激活) ':''}伤害: ${dmg}</div>
      <div class="btns">
        <button style="background:var(--accent);color:#fff" onclick="Game.instance.confirmReaction()">✅ 确认反应</button>
        <button style="background:var(--border);color:var(--text)" onclick="Game.instance.cancelReaction()">✖️ 取消</button>
      </div></div>`;
    document.body.appendChild(ov);
  }

  aiConfirmReaction(idx, r) {
    // AI自动确认反应
    this.pendingReaction = r;
    setTimeout(()=>this.confirmReaction(), 400);
  }

  calcDmg(idx, r) {
    let dmg = r.dmg;
    const p = this.players[idx];
    for(const op of p.activeOps) {
      if(op.type==='multiply') dmg = Math.floor(dmg*op.val);
      if(op.type==='gasDmg'&&p.reaction.some(c=>c.state==='气体')) dmg += op.val;
    }
    return dmg;
  }

  confirmReaction() {
    const ov = document.getElementById('reactModal');
    if(ov) ov.remove();
    this.waitingForConfirm = false;
    if(!this.pendingReaction) return;
    const r = this.pendingReaction;
    const idx = this.currentPlayer;
    const p = this.players[idx];
    const opp = this.players[1-idx];
    this.pendingReaction = null;
    let dmg = this.calcDmg(idx, r);
    // 催化剂不消耗
    p.activeOps = p.activeOps.filter(o=>o.persist);
    // 护盾
    let actualDmg = dmg;
    if(opp.shield>0) {
      const abs = Math.min(opp.shield, dmg);
      opp.shield -= abs;
      actualDmg = dmg - abs;
      this.logMsg(`🛡️ 护盾吸收${abs}点`);
    }
    opp.hp -= actualDmg;
    if(opp.hp<0) opp.hp=0;
    for(const prod of r.prod) p.products.push(prod);
    p.reaction = [];
    this.logMsg(`⚗️ ${r.eq} → 💥${actualDmg}伤害`);
    this.showDmgPopup(1-idx, actualDmg);
    this.render();
    if(opp.hp<=0) {
      this.gameOver=true; this.winner=idx; this.render();
      setTimeout(()=>this.showGameOver(),300);
      return;
    }
    this.phase = 'main';
    this.render();
    if(this.currentPlayer===1) setTimeout(()=>this.aiTurn(), 300);
  }

  cancelReaction() {
    const ov = document.getElementById('reactModal');
    if(ov) ov.remove();
    this.waitingForConfirm = false;
    this.pendingReaction = null;
    this.logMsg('⏳ 取消反应');
    this.phase = 'main';
    this.render();
  }

  showDmgPopup(idx, dmg) {
    const zones = document.querySelectorAll('.player-zone');
    if(!zones[idx]) return;
    const rect = zones[idx].getBoundingClientRect();
    const popup = document.createElement('div');
    popup.className = 'dmg-popup';
    popup.textContent = `-${dmg}`;
    popup.style.left = (rect.left+rect.width/2-15)+'px';
    popup.style.top = (rect.top+30)+'px';
    document.body.appendChild(popup);
    setTimeout(()=>popup.remove(),1000);
    zones[idx].classList.add('dmg-flash');
    zones[idx].classList.add('shake');
    setTimeout(()=>{zones[idx].classList.remove('dmg-flash');zones[idx].classList.remove('shake');},600);
  }

  endTurn() {
    if(this.waitingForConfirm) return;
    const p = this.players[this.currentPlayer];
    p.activeOps = p.activeOps.filter(o=>{
      if(o.duration) {o.duration--; return o.duration>0;}
      if(!o.persist) return false;
      return true;
    });
    this.currentPlayer = 1-this.currentPlayer;
    this.turn++;
    this.phase = 'start';
    this.render();
    this.logMsg(`--- 第${this.turn}回合: ${this.currentPlayer===0?'你的':'对手的'}回合 ---`);
    setTimeout(()=>this.startTurn(), 200);
  }

  // ===== AI =====
  aiTurn() {
    if(this.gameOver||this.currentPlayer!==1) return;
    const p = this.players[1];
    // 尝试放反应区第二张
    if(p.reaction.length===1) {
      const existing = p.reaction[0];
      const hand = p.hand.filter(c=>c.count===undefined);
      for(let i=0;i<hand.length;i++){
        const key = [hand[i].id,existing.id].sort().join('+');
        if(REACTION_MAP[key]) {
          this.playCard(1, p.hand.indexOf(hand[i]));
          return;
        }
      }
    }
    // 放一张物质
    if(p.reaction.length<2) {
      const hand = p.hand.filter(c=>c.count===undefined);
      if(hand.length>0) {
        hand.sort((a,b)=>b.reactivity-a.reactivity);
        this.playCard(1, p.hand.indexOf(hand[0]));
        return;
      }
    }
    // 使用操作卡
    const ops = p.hand.filter(c=>c.count!==undefined);
    if(ops.length>0) {
      const pref = ops.find(o=>o.id==='heat'||o.id==='cata');
      const target = pref||ops[0];
      this.applyOperation(1, target, p.hand.indexOf(target));
      this.render();
      this.endTurn();
      return;
    }
    this.logMsg('⏭️ AI跳过');
    this.endTurn();
  }

  // ===== 渲染 =====
  render() {
    const board = document.getElementById('board');
    if(!board) return;
    board.innerHTML = this.renderBoard();
  }

  renderBoard() {
    const hide = new Array(4).fill('').map(()=>'<div class="card-wrap opponent-card"><div class="card face-down"></div></div>').join('');
    return `
      ${this.renderPlayerZone(1)}
      <div class="actions" id="actionBar">
        <button onclick="Game.instance.endTurn()" class="primary" ${this.currentPlayer!==0||this.gameOver||this.waitingForConfirm?'disabled':''}>⏭️ 结束回合</button>
        <span style="font-size:0.7rem;color:var(--text2)">
          回合${this.turn} | 牌库${this.deck.length}张 | ${this.phase==='main'?'🎯 出牌':'⏳'}. . .
        </span>
        <span style="font-size:0.65rem;color:var(--accent2)">
          ${this.currentPlayer===0?'🧙 你的回合':'🧛 对手回合'}
        </span>
      </div>
      ${this.renderPlayerZone(0)}
      <div class="log-area">
        <div class="log-title">📜 战斗日志</div>
        ${this.log.slice(-5).reverse().map(e=>`<div class="log-entry">${e}</div>`).join('')}
      </div>
    `;
  }

  renderPlayerZone(idx) {
    const p = this.players[idx];
    const isMe = idx===0;
    const isActive = idx===this.currentPlayer;
    const hpPct = Math.max(0, p.hp/p.maxHp*100);
    const hpDanger = hpPct<30?'danger':'';
    const shieldStr = p.shield>0 ? `<span class="shield-text">🛡️${p.shield}</span>` : '';
    const opBadges = p.activeOps.map(o=>`<span class="op-badge">${o.source||'?'}</span>`).join('');
    const slots = [];
    for(let i=0;i<2;i++){
      if(i<p.reaction.length){
        const c=p.reaction[i];
        const stars='★'.repeat(c.reactivity)+'☆'.repeat(5-c.reactivity);
        slots.push(`<div class="slot filled"><div style="text-align:center;font-size:0.5rem;line-height:1.2"><div>${c.emoji}</div><div style="font-weight:bold">${c.name}</div><div style="font-size:0.45rem;color:var(--accent2)">${c.formula}</div><div style="font-size:0.4rem;color:var(--gold)">${stars}</div></div></div>`);
      } else {
        slots.push(`<div class="slot">⬜</div>`);
      }
    }
    const products = p.products.length>0 ? p.products.map(pr=>`<span class="product-tag">${pr}</span>`).join('') : '<span style="font-size:0.55rem;color:var(--text2)">空</span>';
    const handHTML = isMe ? this.renderHand(idx, p.hand) : p.hand.map(()=>'<div class="card-wrap opponent-card"><div class="card face-down"></div></div>').join('');
    return `<div class="player-zone${isActive?' active':''}${!isMe?' opponent':''}">
      <div class="player-info">
        <div class="player-name">${isMe?'🧙 你':'🧛 对手'} <span class="turn-indicator"></span>${opBadges?` ${opBadges}`:''}</div>
        <div class="deck-info">
          <span>📚 ${p.hand.length}张</span>
          ${!isMe?`<span>🎴 ${this.deck.length}张</span>`:''}
        </div>
        <div class="hp-container">${shieldStr}
          <div class="hp-bar"><div class="hp-fill ${hpDanger}" style="width:${hpPct}%"></div></div>
          <span class="hp-text">${p.hp}/${p.maxHp}</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:0.3rem;margin-bottom:0.2rem">
        <span style="font-size:0.55rem;color:var(--text2);flex-shrink:0">📦:</span>
        <div class="products">${products}</div>
      </div>
      <div class="reaction-zone">${slots[0]}<span class="plus">+</span>${slots[1]}</div>
      <div class="hand${!isMe?' opponent-hand':''}">${handHTML}</div>
    </div>`;
  }

  renderHand(idx, hand) {
    const toxMap = {无毒:'✅',低毒:'⚠️',中毒:'☠️',剧毒:'💀'};
    return hand.map((card,i) => {
      if(card.count===undefined){
        const stars='★'.repeat(card.reactivity)+'☆'.repeat(5-card.reactivity);
        const isDisabled = this.currentPlayer!==0||this.phase!=='main'||this.gameOver||this.waitingForConfirm||!this.players[0].hasDrawn;
        return `<div class="card-wrap" onclick="${isDisabled?'':`Game.instance.playCard(0,${i})`}" style="${isDisabled?'opacity:0.7':''}">
          <div class="card substance-card">
            <div class="card-top"><span class="card-name">${card.name}</span><span class="card-formula">${card.formula}</span></div>
            <div class="card-body"><span class="card-emoji">${card.emoji}</span><span class="card-state">${card.state}</span><span class="card-stars">${stars}</span></div>
            <div class="card-bottom"><span class="card-tox">${toxMap[card.tox]||'?'}</span><span class="card-dmg">⚔${card.dmg}</span></div>
          </div></div>`;
      } else {
        const isDisabled = this.currentPlayer!==0||this.phase!=='main'||this.gameOver||this.waitingForConfirm||!this.players[0].hasDrawn;
        return `<div class="card-wrap" onclick="${isDisabled?'':`Game.instance.playCard(0,${i})`}" style="${isDisabled?'opacity:0.7':''}">
          <div class="card op-card">
            <div class="card-top"><span class="card-name">${card.name}</span></div>
            <div class="card-body" style="text-align:center"><span class="card-emoji">${card.emoji}</span><span style="font-size:0.42rem;color:var(--text2);padding:0 2px">${card.desc}</span></div>
            <div class="card-bottom"><span style="font-weight:bold;color:var(--accent2)">操作</span></div>
          </div></div>`;
      }
    }).join('');
  }

  showGameOver() {
    const ov = document.createElement('div');
    ov.className = 'game-over-overlay';
    ov.innerHTML = `<div class="box">
      <h2>${this.winner===0?'🎉 你赢了!':'💀 你输了!'}</h2>
      <div class="sub">${this.winner===0?'炼金术士的胜利!':'对手炼金术士获胜'}</div>
      <div class="stats">${this.turn}回合 | 剩余HP:${this.players[0].hp}/${this.players[0].maxHp}
        <br>产物收集:${this.players[0].products.length}种 | 对手产物:${this.players[1].products.length}种</div>
      <button onclick="Game.instance.reset()">🔄 再来一局</button>
    </div>`;
    document.body.appendChild(ov);
  }

  logMsg(msg) { this.log.push(msg); this.render(); }
}

// ===== 全局 =====
let currentTheme = localStorage.getItem('reaction_duel_theme')||'iodine-vapor';
document.documentElement.setAttribute('data-theme', currentTheme);

function toggleTheme() {
  const themes = ['iodine-vapor','tsukuyomi','mercury','sulfur','cinnabar','copper-sulfate','carbon','classic-light','classic-dark'];
  const idx = themes.indexOf(currentTheme);
  currentTheme = themes[(idx+1)%themes.length];
  document.documentElement.setAttribute('data-theme', currentTheme);
  localStorage.setItem('reaction_duel_theme', currentTheme);
}

function showHelp() {
  const ov = document.createElement('div');
  ov.className = 'help-overlay';
  ov.onclick = function(e){if(e.target===this)this.remove()};
  ov.innerHTML = `<div class="box">
    <h2>📖 反应对决 · 炼金术士</h2>
    <p><strong>目标:</strong> 将对手HP归零(初始30)</p>
    <p><strong>回合流程:</strong> 自动抽2张 → 出牌(点击手牌) → 反应区满2张自动检测反应 → 结束回合</p>
    <p><strong>卡牌:</strong> 物质卡(60种真实化学物质) + 操作卡(加热/催化剂/冷却等)</p>
    <p><strong>反应:</strong> 45+个真实化学反应方程式驱动。金属+酸→H₂,酸碱中和,氧化还原,沉淀...</p>
    <p><strong>策略:</strong> 配对恰当物质→高伤害; 使用操作卡放大伤害或防御; 收集产物</p>
    <p style="color:var(--accent2);font-size:0.7rem;margin-top:0.5rem">⚗️ 所有反应均有真实化学方程式支撑</p>
    <button onclick="this.closest('.help-overlay').remove()">关闭</button>
  </div>`;
  document.body.appendChild(ov);
}

document.addEventListener('DOMContentLoaded',()=>{Game.instance=new ReactionDuel();});