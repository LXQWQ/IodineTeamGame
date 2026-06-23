!(function(){
const SPU='https://supabase.iteamgame.dpdns.org',SPK='sb_publishable_wH0spS1pkkrKe6pu7AwUKA_2cSK95rG';
let sp=null,spOk=false,cu=null;
async function iSp(){try{sp=window.supabase.createClient(SPU,SPK);const{error}=await sp.from('evz_rankings').select('count',{count:'exact',head:true});if(!error)spOk=true}catch(e){}const s=localStorage.getItem('iodine_current_user');if(s&&s!=='null')cu=s}
function esc(s){return s?s.replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]||m)):''}
async function sySc(s){if(!cu||!spOk)return;try{await sp.from('evz_rankings').upsert({user_name:cu,score:s,updated_at:new Date().toISOString()},{onConflict:'user_name'})}catch(e){}}
async function ldRk(){const c=d('rankC');if(!spOk){c.innerHTML='<div style="text-align:center;padding:20px;color:var(--txt2)">排行榜离线</div>';return}try{const{data,e}=await sp.from('evz_rankings').select('user_name,score').order('score',{ascending:false}).limit(8);if(e||!data||!data.length){c.innerHTML='<div style="text-align:center;padding:20px;color:var(--txt2)">暂无排行数据</div>';return}c.innerHTML='<div style="display:flex;flex-direction:column;gap:4px">'+data.map((u,i)=>`<div style="display:flex;justify-content:space-between;padding:8px 12px;background:rgba(255,255,255,0.02);border-radius:8px"><span>${i+1}. ${esc(u.user_name)}</span><span style="color:var(--gd);font-weight:700">${u.score}分</span></div>`).join('')+'</div>'}catch(ex){c.innerHTML='<div style="text-align:center;padding:20px">加载失败</div>'}}

// ==================== ELEMENTS ====================
const EL={
    H:{n:'氢',s:'H',cost:10,hp:200,dmg:13,cd:0.75,r:'rapid',d:'最轻元素·快速连射',cl:'#6caed6',bl:'#98ccf0',start:true},
    C:{n:'碳',s:'C',cost:50,hp:280,dmg:0,cd:6,r:'prod',d:'产电子(8s/30⚡)·不可相邻',cl:'#3d3d3d',na:true,pi:8,pa:30,start:true},
    O:{n:'氧',s:'O',cost:40,hp:260,dmg:17,cd:0.5,r:'dbl',d:'强氧化剂·双发燃烧',cl:'#4088cc',bl:'#66aaee',bn:true},
    N:{n:'氮',s:'N',cost:35,hp:300,dmg:10,cd:1.0,r:'shoot',d:'阻止僵尸回血3秒',cl:'#7ab0e0',bl:'#a0c8f0',ah:3},
    Na:{n:'钠',s:'Na',cost:32,hp:240,dmg:280,cd:16,r:'bomb',d:'遇水僵尸剧烈爆炸·产物NaOH+H₂',cl:'#dd9930',wr:true,bR:2},
    Cl:{n:'氯',s:'Cl',cost:48,hp:230,dmg:21,cd:0.7,r:'shoot',d:'子弹消除僵尸特殊能力',cl:'#80d860',bl:'#a0ff80',dp:true},
    Fe:{n:'铁',s:'Fe',cost:55,hp:380,dmg:25,cd:1.3,r:'hom',d:'智能追踪·跨路攻击',cl:'#b0a090',bl:'#d0c0a0'},
    S:{n:'硫',s:'S',cost:44,hp:270,dmg:12,cd:0.95,r:'shoot',d:'毒气攻击·相邻己方也受伤·遇重金属生成沉淀',cl:'#d4b030',bl:'#ddcc40',po:true,ap:true},
    Mg:{n:'镁',s:'Mg',cost:38,hp:300,dmg:15,cd:0.85,r:'shoot',d:'闪光致盲0.5秒',cl:'#c8a050',bl:'#ffe888',fl:true},
    Si:{n:'硅',s:'Si',cost:60,hp:500,dmg:23,cd:1.3,r:'spike',d:'永久地刺·不需重种',cl:'#9a8868',pm:true},
    He:{n:'氦',s:'He',cost:15,hp:4000,dmg:0,cd:0,r:'wall',d:'惰性气体·不受任何特效',cl:'#c89898'},
    Ne:{n:'氖',s:'Ne',cost:25,hp:3200,dmg:0,cd:10,r:'wall',d:'红光减速周围僵尸',cl:'#da7a50',sa:true,sr:130},
    Ar:{n:'氩',s:'Ar',cost:50,hp:2800,dmg:0,cd:38,r:'wall',d:'放置后所在行5秒无敌',cl:'#c880c8',rs:5},
    Li:{n:'锂',s:'Li',cost:20,hp:260,dmg:200,cd:14,r:'bomb',d:'被吃自爆·遇水生成LiOH',cl:'#d85545',wr:true,bR:1.5},
    Al:{n:'铝',s:'Al',cost:42,hp:850,dmg:0,cd:22,r:'wall',d:'两性金属·反射酸碱伤害',cl:'#aab4c4',rf:true},
    P:{n:'磷',s:'P',cost:55,hp:150,dmg:9999,cd:40,r:'skill',d:'范围爆发·自身消失',cl:'#dd5a2a',sR:1.5},
    Zn:{n:'锌',s:'Zn',cost:50,hp:350,dmg:0,cd:10,r:'anode',d:'原电池阳极·与Cu相邻产电子',cl:'#aaaacc'},
    Cu:{n:'铜',s:'Cu',cost:52,hp:380,dmg:0,cd:10,r:'cathode',d:'原电池阴极·与Zn相邻产电子',cl:'#cc8844'}
};
const EG=[{lb:'第一周期',it:['H','He']},{lb:'碱金属',it:['Li','Na']},{lb:'碱土金属',it:['Mg']},{lb:'碳族',it:['C','Si']},{lb:'氮族',it:['N','P']},{lb:'氧族',it:['O','S']},{lb:'卤素',it:['Cl']},{lb:'惰性气体',it:['He','Ne','Ar']},{lb:'过渡金属',it:['Fe','Zn','Cu']},{lb:'硼族',it:['Al']}];

// ==================== SUBSTANCES ====================
const SUBS={
    H2O:{n:'水',fm:'H₂O',cl:'#5599cc'},
    HCl:{n:'稀盐酸',fm:'HCl(aq)',cl:'#cc6666'},
    H2SO4:{n:'稀硫酸',fm:'H₂SO₄(aq)',cl:'#cc8844'},
    HNO3:{n:'稀硝酸',fm:'HNO₃(aq)',cl:'#cc9944'},
    NaOH:{n:'氢氧化钠',fm:'NaOH',cl:'#8888cc'},
    LiOH:{n:'氢氧化锂',fm:'LiOH',cl:'#cc8888'},
    pyridine:{n:'吡啶',fm:'C₅H₅N',cl:'#aa88cc'},
    imidazole:{n:'咪唑',fm:'C₃H₄N₂',cl:'#cc88aa'},
    H2O2:{n:'过氧化氢',fm:'H₂O₂',cl:'#88cccc'},
    PbNO32:{n:'硝酸铅',fm:'Pb(NO₃)₂',cl:'#888888'},
    PbS:{n:'硫化铅沉淀',fm:'PbS↓',cl:'#333333'},
    PE:{n:'聚乙烯碎片',fm:'(C₂H₄)n',cl:'#66aa66'},
    enzyme:{n:'酶提取物',fm:'Enz',cl:'#ddaa44'},
    NaCl:{n:'食盐',fm:'NaCl',cl:'#ffffff'},
    Na2SO4:{n:'硫酸钠',fm:'Na₂SO₄',cl:'#eeeedd'},
    NaNO3:{n:'硝酸钠',fm:'NaNO₃',cl:'#eeeedd'},
    Fe2O3:{n:'铁锈',fm:'Fe₂O₃',cl:'#8b5a2b'},
    CaCO3:{n:'石灰石',fm:'CaCO₃',cl:'#ccccaa'},
    SiO2:{n:'石英砂',fm:'SiO₂',cl:'#ddccaa'}
};

// ==================== ZOMBIES (each a specific chemical) ====================
const ZT={
    water:{n:'水基僵尸',sub:'H2O',cl:'#5599cc',hp:300,sp:35,sc:10,us:0,atk:8,chem:'H₂O',d:'主要成分H₂O·遇Na→NaOH+H₂·遇Li→LiOH+H₂'},
    hcl:{n:'稀盐酸僵尸',sub:'HCl',cl:'#cc6666',hp:350,sp:32,sc:20,us:40,atk:12,chem:'HCl',d:'含HCl·遇NaOH→NaCl+H₂O·遇Na→NaCl+H₂↑',isAcid:true},
    h2so4:{n:'稀硫酸僵尸',sub:'H2SO4',cl:'#cc8844',hp:380,sp:30,sc:25,us:55,atk:14,chem:'H₂SO₄',d:'含H₂SO₄·遇NaOH→Na₂SO₄+H₂O',isAcid:true},
    hno3:{n:'稀硝酸僵尸',sub:'HNO3',cl:'#cc9944',hp:360,sp:33,sc:28,us:70,atk:13,chem:'HNO₃',d:'含HNO₃·氧化性酸·遇NaOH→NaNO₃+H₂O',isAcid:true,isOxid:true},
    naoh:{n:'烧碱僵尸',sub:'NaOH',cl:'#8888cc',hp:350,sp:30,sc:20,us:45,atk:12,chem:'NaOH',d:'含NaOH·遇HCl→NaCl+H₂O·遇H₂SO₄→Na₂SO₄+H₂O',isBase:true},
    pyridine:{n:'吡啶僵尸',sub:'pyridine',cl:'#aa88cc',hp:340,sp:28,sc:30,us:60,atk:10,chem:'C₅H₅N',d:'有机碱·被F/Cl裂解→额外C碎片',isBase:true,isOrg:true},
    imidazole:{n:'咪唑僵尸',sub:'imidazole',cl:'#cc88aa',hp:330,sp:29,sc:32,us:75,atk:11,chem:'C₃H₄N₂',d:'有机碱·被F/Cl裂解→额外C+N碎片',isBase:true,isOrg:true},
    h2o2:{n:'过氧化氢僵尸',sub:'H2O2',cl:'#88cccc',hp:400,sp:30,sc:25,us:50,atk:15,chem:'H₂O₂',d:'死亡即分解→H₂O+O₂',isOxid:true},
    pbno3:{n:'硝酸铅僵尸',sub:'PbNO32',cl:'#888888',hp:2000,sp:16,sc:80,us:95,atk:25,chem:'Pb(NO₃)₂',d:'遇S→PbS↓沉淀·极高血量',isHeavy:true,arm:30},
    pe:{n:'聚乙烯僵尸',sub:'PE',cl:'#66aa66',hp:280,sp:42,sc:15,us:35,atk:8,chem:'(C₂H₄)n',d:'碳基聚合物·被F/Cl裂解→C碎片',isOrg:true},
    enzyme:{n:'酶催化僵尸',sub:'enzyme',cl:'#ddaa44',hp:220,sp:55,sc:55,us:80,atk:0,chem:'Enz',d:'加速周围僵尸·死亡掉落酶提取物→可提Mg',isCat:true}
};

// ==================== DEATH DROP TABLE ====================
// [zombieType][killerSymbol] → [{sub, ct}, ...]  (killerSymbol='default' for normal kill)
// 基于真实化学反应：酸碱中和、氧化还原、沉淀反应
const DROP={
    water:{
        Na:[{sub:'NaOH',ct:1}],           // 2Na+2H₂O→2NaOH+H₂↑
        Li:[{sub:'LiOH',ct:1}],           // 2Li+2H₂O→2LiOH+H₂↑
        default:[{sub:'H2O',ct:1}]
    },
    hcl:{
        Na:[{sub:'NaCl',ct:2}],           // 2Na+2HCl→2NaCl+H₂↑
        default:[{sub:'HCl',ct:1}]
    },
    h2so4:{
        Na:[{sub:'Na2SO4',ct:1}],         // 2Na+H₂SO₄→Na₂SO₄+H₂↑
        default:[{sub:'H2SO4',ct:1}]
    },
    hno3:{
        Na:[{sub:'NaNO3',ct:1}],          // Na+HNO₃→NaNO₃+½H₂↑ (简化)
        default:[{sub:'HNO3',ct:1}]
    },
    naoh:{
        default:[{sub:'NaOH',ct:1}]
    },
    pyridine:{
        F:[{sub:'pyridine',ct:1}],        // 裂解产物中有C碎片
        Cl:[{sub:'pyridine',ct:1}],
        default:[{sub:'pyridine',ct:1}]
    },
    imidazole:{
        F:[{sub:'imidazole',ct:1}],
        Cl:[{sub:'imidazole',ct:1}],
        default:[{sub:'imidazole',ct:1}]
    },
    h2o2:{
        default:[{sub:'H2O',ct:2}]        // 2H₂O₂→2H₂O+O₂↑ (给H₂O作为产物)
    },
    pbno3:{
        S:[{sub:'PbS',ct:1}],             // Pb²⁺+S²⁻→PbS↓ (额外获得沉淀)
        default:[{sub:'PbNO32',ct:1}]
    },
    pe:{
        F:[{sub:'PE',ct:1}],              // 裂解产物 (额外C)
        Cl:[{sub:'PE',ct:1}],
        default:[{sub:'PE',ct:1}]
    },
    enzyme:{
        default:[{sub:'enzyme',ct:1}]
    }
};

// ==================== ACID-BASE NEUTRALIZATION ON CONTACT ====================
// When an acid zombie dies in contact with a base plant, or vice versa
function getContactDeathDrops(zombie,plantEl){
    const zt=zombie.tp, ps=plantEl.s;
    const drops=[];
    // Acid zombie + Na (active metal) → salt + H₂
    if(zombie.isAcid&&ps==='Na'){
        if(zt==='hcl')drops.push({sub:'NaCl',ct:2});
        else if(zt==='h2so4')drops.push({sub:'Na2SO4',ct:1});
        else if(zt==='hno3')drops.push({sub:'NaNO3',ct:1});
        return drops;
    }
    // Base zombie + acid plant...  (F and Cl are halogen acids conceptually)
    // Organic base + F/Cl → cracked products (extra C)
    if(zombie.isOrg&&(ps==='F'||ps==='Cl')){
        drops.push({sub:zombie.sub,ct:1}); // original substance
        return drops;
    }
    return null; // use default
}

// ==================== LAB RECIPES ====================
const RCP=[
    {id:'elH2O',eq:'2H₂O→2H₂↑+O₂↑',icon:'⚡',desc:'电解水',cost:{H2O:3},esp:100,unlocks:['O'],unlockDesc:'解锁：氧(O)'},
    {id:'elNaCl',eq:'2NaCl(熔融)→2Na+Cl₂↑',icon:'⚡',desc:'电解熔融食盐',cost:{NaCl:3},esp:150,unlocks:['Na','Cl'],unlockDesc:'解锁：钠(Na)、氯(Cl)'},
    {id:'elNaOH',eq:'4NaOH(熔融)→4Na+O₂↑+2H₂O',icon:'⚡',desc:'电解熔融烧碱制钠',cost:{NaOH:3},esp:150,unlocks:['Na'],unlockDesc:'解锁：钠(Na) 备选路径'},
    {id:'elLiOH',eq:'4LiOH(熔融)→4Li+O₂↑+2H₂O',icon:'⚡',desc:'电解熔融氢氧化锂',cost:{LiOH:3},esp:150,unlocks:['Li'],unlockDesc:'解锁：锂(Li)'},
    {id:'redFe',eq:'2Fe₂O₃+3C→4Fe+3CO₂↑',icon:'🔥',desc:'碳热还原铁锈',cost:{Fe2O3:3},esp:80,unlocks:['Fe'],unlockDesc:'解锁：铁(Fe)',reqC:true},
    {id:'dehH2SO4',eq:'H₂SO₄→SO₃+H₂O→...',icon:'🔥',desc:'浓硫酸脱水制硫',cost:{H2SO4:3},esp:60,unlocks:['S'],unlockDesc:'解锁：硫(S)'},
    {id:'dehHNO3',eq:'4HNO₃→4NO₂↑+O₂↑+2H₂O',icon:'🔥',desc:'硝酸分解制氮',cost:{HNO3:2},esp:70,unlocks:['N'],unlockDesc:'解锁：氮(N)'},
    {id:'decH2O2',eq:'2H₂O₂→2H₂O+O₂↑',icon:'🧪',desc:'过氧化氢催化分解',cost:{H2O2:2},esp:30,unlocks:['O'],unlockDesc:'解锁：氧(O) 备选',yields:{H2O:1}},
    {id:'pyrN',eq:'C₅H₅N→裂解提取N',icon:'🔥',desc:'吡啶裂解提取氮',cost:{pyridine:2},esp:100,unlocks:['N'],unlockDesc:'解锁：氮(N) 备选'},
    {id:'enzMg',eq:'酶提取物→叶绿素核心→Mg',icon:'🧪',desc:'酶热解提取镁',cost:{enzyme:3},esp:80,unlocks:['Mg'],unlockDesc:'解锁：镁(Mg)'},
    {id:'redSi',eq:'SiO₂+C→Si+CO₂↑',icon:'🔥',desc:'碳还原石英砂制硅',cost:{SiO2:2},esp:120,unlocks:['Si'],unlockDesc:'解锁：硅(Si)',reqC:true},
    {id:'peC',eq:'(C₂H₄)n→裂解→n·C₂H₄',icon:'🔥',desc:'聚乙烯裂解回收碳',cost:{PE:3},esp:60,unlocks:[],unlockDesc:'获得额外碳',yields:{C:1}},
    {id:'pbNO3',eq:'Pb(NO₃)₂→热分解→PbO+NO₂+O₂',icon:'🔥',desc:'硝酸铅热分解',cost:{PbNO32:2},esp:80,unlocks:['N','O'],unlockDesc:'解锁：N、O'},
    {id:'elHCl',eq:'2HCl→H₂↑+Cl₂↑',icon:'⚡',desc:'电解盐酸制氯',cost:{HCl:3},esp:120,unlocks:['Cl'],unlockDesc:'解锁：氯(Cl) 备选'},
    {id:'CaCO3',eq:'CaCO₃→CaO+CO₂↑',icon:'🔥',desc:'石灰石热分解',cost:{CaCO3:2},esp:50,unlocks:[],unlockDesc:'不直接解锁，但加速碳生产',yields:{C:1}},
    {id:'neutHClNaOH',eq:'HCl+NaOH→NaCl+H₂O',icon:'🧪',desc:'酸碱中和制盐',cost:{HCl:1,NaOH:1},esp:20,unlocks:[],unlockDesc:'获得：NaCl×2 + H₂O×1',yields:{NaCl:2,H2O:1}},
    {id:'neutH2SO4NaOH',eq:'H₂SO₄+2NaOH→Na₂SO₄+2H₂O',icon:'🧪',desc:'硫酸与烧碱中和',cost:{H2SO4:1,NaOH:2},esp:30,unlocks:[],unlockDesc:'获得：Na₂SO₄×1 + H₂O×2',yields:{Na2SO4:1,H2O:2}},
    {id:'convNa2SO4NaCl',eq:'Na₂SO₄→处理→2NaCl',icon:'🧪',desc:'硫酸钠转化食盐',cost:{Na2SO4:1},esp:30,unlocks:[],unlockDesc:'获得：NaCl×2',yields:{NaCl:2}},
    {id:'convNaNO3NaCl',eq:'NaNO₃→处理→NaCl',icon:'🧪',desc:'硝酸钠转化食盐',cost:{NaNO3:1},esp:30,unlocks:[],unlockDesc:'获得：NaCl×1',yields:{NaCl:1}},
    {id:'PbSrecover',eq:'PbS→煅烧→Pb+SO₂↑',icon:'🔥',desc:'硫化铅煅烧回收',cost:{PbS:2},esp:100,unlocks:[],unlockDesc:'获得：Pb(NO₃)₂×1 + S物质',yields:{PbNO32:1}}
];

// ==================== STATE ====================
const COLS=9,ROWS=5,CW=100,CH=100;
const cv=d('gc'),cx=cv.getContext('2d');cv.width=COLS*CW;cv.height=ROWS*CH;
let es=200,sc=0,wv=0,go=false,gs=false;
let zs=[],els=[],bls=[],ps=[],ecs=[],rxa=[],rxl=[];
let gd=Array(ROWS).fill().map(()=>Array(COLS).fill(null));
let sel='H',shv=false,skl=false,unlocked=new Set(['H','C','Ne']);
let inv={};let gst=0,lf=0,ls=0,les=0,fr=null,mg={r:-1,c:-1};
let cds={},cdt={},rxc={};let boss=null,bt=0;
function d(id){return document.getElementById(id)}

// ==================== CLASSES ====================
class Pt{constructor(x,y,vx,vy,c,s=2,l=0.45){this.x=x;this.y=y;this.vx=vx;this.vy=vy;this.c=c;this.s=s;this.l=l;this.ml=l}up(dt){this.x+=this.vx*dt;this.y+=this.vy*dt;this.l-=dt;return this.l>0}draw(ct){const a=Math.min(1,this.l/this.ml*2.5);ct.save();ct.globalAlpha=a;ct.beginPath();ct.arc(this.x,this.y,this.s,0,Math.PI*2);ct.fillStyle=this.c;ct.fill();ct.restore()}}
class Bl{constructor(x,y,tz,dmg,c,shooter='',tp='norm'){this.x=x;this.y=y;this.tz=tz;this.dmg=dmg;this.c=c;this.shooter=shooter;this.tp=tp;this.sp=tp==='hom'?5.5:6;this.al=true;this.ps=new Set;this.tr=0;this.lt=0;this.vx=0;this.vy=0;this.lk=null;this.ac=0.2;this.mx=6.5;this.bn=false;this.po=false;this.ah=0;this.dp=false;this.fl=false}up(dt){this.lt+=dt;if(this.tp==='hom'){if(this.lt>18){this.al=false;return}if(!this.lk||this.lk.hp<=0){this.lk=null;let nd=Infinity;for(let z of zs){if(z.hp<=0)continue;const d=Math.hypot(z.x-this.x,z.y-this.y);if(d<nd){nd=d;this.lk=z}}}if(this.lk){const dx=this.lk.x-this.x,dy=this.lk.y-this.y,d=Math.hypot(dx,dy);if(d<14){this.lk.hp-=this.dmg;this.lk.lastHitBy=this.shooter;if(this.bn)this.lk.lastHitByBurn=true;if(this.po)this.lk.lastHitByPoison=true;if(this.dp)this.lk.lastHitByDispel=true;if(this.fl)this.lk.lastHitByFlash=true;sP(this.x,this.y,this.c,8);this.al=false;return}const ax=(dx/d)*this.ac,ay=(dy/d)*this.ac;this.vx+=ax;this.vy+=ay;const s=Math.hypot(this.vx,this.vy);if(s>this.mx){this.vx=(this.vx/s)*this.mx;this.vy=(this.vy/s)*this.mx}this.x+=this.vx;this.y+=this.vy}else{this.x+=this.sp}}else{if(!this.tz||this.tz.hp<=0){this.al=false;return}const dx=this.tz.x-this.x,dy=this.tz.y-this.y,d=Math.hypot(dx,dy);if(d<10){this.tz.hp-=this.dmg;this.tz.lastHitBy=this.shooter;if(this.bn)this.tz.bn=2;if(this.po)this.tz.po=3;if(this.ah)this.tz.nh=this.ah;if(this.dp){this.tz.dp=true;this.tz.sp=ZT[this.tz.tp].sp*0.5;setTimeout(()=>{this.tz.sp=ZT[this.tz.tp].sp},3000)}if(this.fl)this.tz.fl=0.5;sP(this.x,this.y,this.c,7);this.al=false;return}const step=Math.min(this.sp,d);this.x+=Math.cos(Math.atan2(dy,dx))*step;this.y+=Math.sin(Math.atan2(dy,dx))*step}this.tr+=dt;if(this.tr>0.03){this.tr=0;ps.push(new Pt(this.x,this.y,0,0,this.c,1.5,0.15))}}draw(ct){ct.save();ct.beginPath();ct.arc(this.x,this.y,this.tp==='hom'?6:4.5,0,Math.PI*2);ct.fillStyle=this.c;ct.shadowBlur=7;ct.shadowColor=this.c;ct.fill();ct.restore()}}
class Zb{constructor(row,type){const t=ZT[type];this.row=row;this.y=row*CH+CH/2;this.tp=type;this.x=cv.width+30+Math.random()*60;this.hp=t.hp;this.mhp=t.hp;this.sp=t.sp;this.sc=t.sc;this.atk=t.atk;this.cl=t.cl;this.sub=t.sub;this.isAcid=t.isAcid||false;this.isBase=t.isBase||false;this.isOxid=t.isOxid||false;this.isHeavy=t.isHeavy||false;this.isOrg=t.isOrg||false;this.isCat=t.isCat||false;this.arm=t.arm||0;this.sl=0;this.po=0;this.at=0;this.nh=0;this.dp=false;this.fl=0;this.bn=0;this.w=48;this.h=65;this.lastHitBy='default';this.lastHitByBurn=false;this.lastHitByPoison=false;this.lastHitByDispel=false;this.lastHitByFlash=false;this.lastHitByContact=false;this.contactPlant=null}up(dt){let ms=this.sp/60;if(this.sl>0){ms*=0.5;this.sl-=dt}if(this.fl>0){ms*=0.2;this.fl-=dt}const col=Math.floor(this.x/CW);if(col>=0&&col<COLS){const el=gd[this.row]&&gd[this.row][col];if(el&&el.al){if(el.r==='spike'){this.at-=dt;if(this.at<=0){this.hp-=el.dmg;this.lastHitBy=el.s;this.lastHitByContact=true;this.contactPlant=el;this.at=el.cd||1.4;sP(this.x,this.y,el.cl,3)}}else{this.at-=dt;if(this.at<=0){let dmg=this.atk,wr=false;if(this.tp==='water'&&el.s==='Na'){wr=true;this.lastHitBy='Na';this.lastHitByContact=true;this.contactPlant=el;trR('Na+H2O',el)}if(this.tp==='water'&&el.s==='Li'){wr=true;this.lastHitBy='Li';this.lastHitByContact=true;this.contactPlant=el;trR('Li+H2O',el)}this.lastHitBy=el.s;this.lastHitByContact=true;this.contactPlant=el;if(this.isAcid&&'AlFeZnCuNaLiMg'.includes(el.s))dmg*=1.6;if(this.isBase&&'CSiNPOFSCl'.includes(el.s))dmg*=1.6;if(this.isOrg&&'FCl'.includes(el.s))dmg*=0.3;if(this.isHeavy&&el.s==='S'){this.lastHitBy='S';this.sp=0.3;this.sl=9999;sP(el.x,el.y,'#ffff00',15)}if(el.rf&&(this.isAcid||this.isBase)){this.hp-=dmg*0.5;sP(el.x,el.y,'#aab4c4',10)}if(!wr||el.al){el.hp-=dmg;this.at=0.45}if(el.al&&el.hp<=0)klEl(el,this.tp);if(!el.al||el.hp<=0)return}}if(el.r!=='spike')return}}this.x-=ms;if(this.po>0){this.hp-=3;this.po-=dt;this.lastHitByPoison=true}if(this.bn>0){this.hp-=4;this.bn-=dt;this.lastHitByBurn=true}if(this.isCat){for(let z of zs){if(z!==this&&Math.hypot(z.x-this.x,z.y-this.y)<160)z.sp=Math.min(160,z.sp+0.15)}}}draw(ct){ct.save();const x=this.x-this.w/2,y=this.y-this.h/2;ct.fillStyle=this.cl;ct.beginPath();rR(ct,x,y,this.w,this.h,10);ct.fill();ct.fillStyle='rgba(0,0,0,0.5)';ct.fillRect(x+8,y+12,9,9);ct.fillRect(x+30,y+12,9,9);if(this.dp){ct.strokeStyle='#0f0';ct.lineWidth=2;ct.beginPath();rR(ct,x-2,y-2,this.w+4,this.h+4,12);ct.stroke()}const pct=this.hp/this.mhp;ct.fillStyle='#c23b22';ct.fillRect(x,y-12,this.w,7);ct.fillStyle='#2c7a4c';ct.fillRect(x,y-12,this.w*pct,7);if(this.arm>0){ct.fillStyle='#888';ct.fillRect(x,y-17,this.w,3)}ct.font='7px sans-serif';ct.fillStyle='rgba(255,255,255,0.5)';ct.fillText(ZT[this.tp].chem,x+2,y-15);ct.restore()}}
class El{constructor(type,row,col){const d=EL[type];this.tp=type;this.s=d.s;this.nm=d.n;this.row=row;this.col=col;this.x=col*CW+CW/2;this.y=row*CH+CH/2;this.hp=d.hp;this.mhp=d.hp;this.dmg=d.dmg||0;this.cd=d.cd||0;this.r=d.r||'shoot';this.cl=d.cl;this.bl=d.bl||d.cl;this.at=0;this.pt=0;this.po=0;this.al=true;this.iv=0;this.rust=null;this.bn=d.bn||false;this.dbl=(d.r==='dbl');this.sh=d.sh||0;this.ah=d.ah||0;this.fl=d.fl||false;this.poSk=d.po||false;this.ap=d.ap||false;this.dp=d.dp||false;this.wr=d.wr||false;this.bR=d.bR||1.5;this.sR=d.sR||1.5;this.na=d.na||false;this.pm=d.pm||false;this.sa=d.sa||false;this.sr=d.sr||130;this.rf=d.rf||false;this.pi=d.pi||0;this.pa=d.pa||0;this.rs=d.rs||0;this.an=(d.r==='anode');this.ca=(d.r==='cathode')}up(dt){if(!this.al)return;if(this.at>0)this.at-=dt;if(this.iv>0)this.iv-=dt;if(this.po>0){this.hp-=3*dt;this.po-=dt;if(this.hp<=0){klEl(this,'po');return}}if(this.r==='prod'&&this.pi>0){this.pt+=dt;if(this.pt>=this.pi){this.pt=0;es+=this.pa;upUI();sP(this.x,this.y,'#ffd700',5)}}if(this.sa){for(let z of zs){if(Math.hypot(z.x-this.x,z.y-this.y)<this.sr)z.sl=Math.max(z.sl,0.15)}}if(this.rs>0&&this.al){for(let e of els){if(e.row===this.row&&e!==this)e.iv=Math.max(e.iv||0,0.15)}}if(this.ap){for(let e of els){if(e!==this&&e.al&&Math.abs(e.row-this.row)<=1&&Math.abs(e.col-this.col)<=1&&!(e.row===this.row&&e.col===this.col))e.po=Math.max(e.po||0,0.15)}}if(this.rust){this.rust.t-=dt;if(this.rust.t<=0)this.rust=null;else for(let z of zs){if(Math.hypot(z.x-this.rust.x,z.y-this.rust.y)<this.rust.r){z.arm=Math.max(0,z.arm-3);z.lastHitBy='Fe'}}}}attack(){if(this.r==='spike'){for(let z of zs){if(z.row===this.row&&Math.abs(z.x-this.x)<CW/2){z.hp-=this.dmg;z.lastHitBy=this.s;z.lastHitByContact=true;z.contactPlant=this;sP(z.x,z.y,this.cl,4);break}}this.at=this.cd;return}if(this.r==='wall'||this.r==='skill'||this.r==='anode'||this.r==='cathode')return;let tz=null,mx=Infinity;for(let z of zs){if(z.row===this.row&&z.x>this.x&&z.x<mx){mx=z.x;tz=z}}if(!tz&&this.r==='hom'){for(let z of zs){if(z.x>this.x&&z.x<mx){mx=z.x;tz=z}}}if(!tz)return;const b=new Bl(this.x,this.y,tz,this.dmg,this.bl,this.s,this.r==='hom'?'hom':'norm');b.bn=this.bn;b.po=this.poSk;b.ah=this.ah;b.dp=this.dp;b.fl=this.fl;bls.push(b);if(this.dbl){const b2=new Bl(this.x+8,this.y+3,tz,Math.floor(this.dmg*0.5),this.bl,this.s);b2.bn=this.bn;bls.push(b2)}if(this.sh>0)this.hp-=this.sh;this.at=this.cd}draw(ct){if(!this.al)return;ct.save();if(this.iv>0){ct.shadowBlur=14;ct.shadowColor='#ffd700';ct.strokeStyle='#ffd700';ct.lineWidth=3}else{ct.strokeStyle='#78b0d8';ct.lineWidth=1.5}ct.beginPath();rR(ct,this.x-35,this.y-35,70,70,14);ct.fillStyle=this.cl;ct.fill();ct.stroke();ct.shadowBlur=0;ct.fillStyle='#fff';ct.font='bold 22px monospace';ct.textAlign='center';ct.textBaseline='middle';ct.fillText(this.s,this.x,this.y+2);if(this.hp<this.mhp){const pct=Math.max(0,this.hp/this.mhp);ct.fillStyle='#c23b22';ct.fillRect(this.x-35,this.y-46,70,6);ct.fillStyle='#2c7a4c';ct.fillRect(this.x-35,this.y-46,70*pct,6)}if(this.r==='prod'){ct.fillStyle='#ffd700';ct.font='9px sans-serif';ct.fillText('⚡',this.x+22,this.y-24)}if(this.rust){ct.strokeStyle='rgba(139,69,19,0.4)';ct.lineWidth=2;ct.beginPath();ct.arc(this.x,this.y,this.rust.r,0,Math.PI*2);ct.stroke();ct.fillStyle='rgba(139,69,19,0.06)';ct.fill()}ct.restore()}}
function rR(ct,x,y,w,h,r){ct.moveTo(x+r,y);ct.lineTo(x+w-r,y);ct.quadraticCurveTo(x+w,y,x+w,y+r);ct.lineTo(x+w,y+h-r);ct.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ct.lineTo(x+r,y+h);ct.quadraticCurveTo(x,y+h,x,y+h-r);ct.lineTo(x,y+r);ct.quadraticCurveTo(x,y,x+r,y)}

// ==================== DEATH DROP SYSTEM ====================
function getDeathDrops(zombie){
    const zt=zombie.tp, killer=zombie.lastHitBy||'default';
    // Check specific killer match first
    const table=DROP[zt];if(!table)return[{sub:zombie.sub,ct:1}];
    // Check contact death (plant in same cell)
    if(zombie.lastHitByContact&&zombie.contactPlant){
        const cd=getContactDeathDrops(zombie,zombie.contactPlant);
        if(cd&&cd.length>0)return cd;
    }
    // Check killer-specific drops
    if(table[killer])return table[killer];
    // Default
    return table.default||[{sub:zombie.sub,ct:1}];
}
function applyDeathDrops(zombie){
    const drops=getDeathDrops(zombie);
    const msgs=[];
    for(let dp of drops){
        addSub(dp.sub,dp.ct);
        const sb=SUBS[dp.sub];
        msgs.push((sb?sb.n+'('+sb.fm+')':dp.sub)+'×'+dp.ct);
    }
    const killer=zombie.lastHitBy!=='default'?zombie.lastHitBy:'';
    if(killer)return '🧪 '+ZT[zombie.tp].chem+'被<b>'+killer+'</b>击杀→产物：'+msgs.join(' + ');
    return '🧪 掉落：'+msgs.join(' + ');
}

// ==================== HELPERS ====================
function sP(x,y,c,n=8){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=50+Math.random()*70;ps.push(new Pt(x,y,Math.cos(a)*s,Math.sin(a)*s,c,1.5+Math.random()*3,0.35+Math.random()*0.25))}}
function addSub(id,ct){inv[id]=(inv[id]||0)+ct;upInvUI()}
function klEl(el,cause){if(!el.al)return;el.al=false;if(el.r==='bomb'){const r=el.bR*CW;for(let z of zs){if(Math.hypot(z.x-el.x,z.y-el.y)<r){z.hp-=(el.dmg||180);z.lastHitBy=el.s;z.lastHitByContact=true;z.contactPlant=el;sP(z.x,z.y,'#ff4400',15)}}sP(el.x,el.y,'#ff6600',35)}if(el.r==='skill'){const r=el.sR*CW;let k=0;for(let i=zs.length-1;i>=0;i--){if(Math.hypot(zs[i].x-el.x,zs[i].y-el.y)<r){sc+=zs[i].sc;k++;zs[i].lastHitBy='P';const dmsg=applyDeathDrops(zs[i]);sP(zs[i].x,zs[i].y,'#ff4400',18);zs.splice(i,1)}}if(k>0){d('msg').innerHTML='🔥 磷爆！清除<b>'+k+'</b>只僵尸';sySc(sc)}}if(gd[el.row]&&gd[el.row][el.col]===el)gd[el.row][el.col]=null;const idx=els.indexOf(el);if(idx!==-1)els.splice(idx,1);sP(el.x,el.y,el.cl,12);upUI()}
function upUI(){d('vEsp').innerText=Math.floor(es);d('vSc').innerText=sc;d('vWv').innerText=wv;let tSub=0;for(let k in inv)tSub+=inv[k];d('vSub').innerText=tSub;const bs=[d('btnB1'),d('btnB2'),d('btnB3')];bs[0].style.display=sc>=500?'inline-block':'none';bs[1].style.display=sc>=1500?'inline-block':'none';bs[2].style.display=sc>=3000?'inline-block':'none'}
function upInvUI(){const c=d('invList');if(!c)return;const entries=Object.entries(inv).filter(([,v])=>v>0);if(!entries.length){c.innerHTML='<div style="font-size:0.65rem;color:var(--dim);text-align:center;padding:12px">击杀僵尸收集物质...</div>';return}c.innerHTML=entries.map(([k,v])=>{const sb=SUBS[k];return`<div class="inv-item"><span class="fm">${sb?sb.fm:k}</span>${sb?sb.n:k}<span class="ct">×${v}</span></div>`}).join('');upUI()}

// ==================== LAB ====================
function openLab(){const c=d('labC');if(!c)return;
    c.innerHTML=RCP.map(r=>{
        const canCraft=Object.entries(r.cost).every(([k,v])=>(inv[k]||0)>=v)&&es>=r.esp;
        const allUnlocked=r.unlocks.length>0&&r.unlocks.every(el=>unlocked.has(el));
        let avail=canCraft;if(allUnlocked&&!r.yields&&!r.bonusEsp)avail=false;
        let costStr=Object.entries(r.cost).map(([k,v])=>{const sb=SUBS[k];return(sb?sb.n:k)+'×'+v+(inv[k]>=v?'✅':'❌')}).join(' ')+(r.reqC?(unlocked.has('C')?' [需碳]':' [需碳❌]'):'');
        return`<div class="rcp-card${avail?' available':''}"><div class="rcp-icon">${r.icon}</div><div class="rcp-info"><div><strong>${r.desc}</strong></div><div class="rcp-eq">${r.eq}</div><div class="rcp-cost">${costStr} | 💰${r.esp}⚡</div><div class="rcp-unlock">${r.unlockDesc}${r.yields?(' | 副产：'+Object.entries(r.yields).map(([k,v])=>(SUBS[k]?SUBS[k].n:k)+'×'+v).join(' ')):''}${r.bonusEsp?(' | +'+r.bonusEsp+'⚡'):''}</div></div><button class="rcp-btn"${avail?'':' disabled'} onclick="window._doRcp('${r.id}')">${allUnlocked&&!r.yields&&!r.bonusEsp?'已解锁':'合成'}</button></div>`;
    }).join('');d('labMod').classList.add('show')}
window._doRcp=function(id){const r=RCP.find(x=>x.id===id);if(!r)return;const can=Object.entries(r.cost).every(([k,v])=>(inv[k]||0)>=v)&&es>=r.esp;if(!can)return;for(let[k,v]of Object.entries(r.cost))inv[k]-=v;es-=r.esp;if(r.reqC&&unlocked.has('C')){const cEl=els.find(e=>e.al&&e.s==='C');if(cEl){es+=60;klEl(cEl,'rx');d('msg').innerHTML='💨 碳元素被消耗用于还原反应'}else{es+=60}}if(r.yields)for(let[k,v]of Object.entries(r.yields)){if(k==='C'){es+=30*v;d('msg').innerHTML='🔄 获得碳当量，+'+30*v+'⚡'}else inv[k]=(inv[k]||0)+v}if(r.bonusEsp)es+=r.bonusEsp;let nl=[];for(let el of r.unlocks){if(!unlocked.has(el)){unlocked.add(el);nl.push(el)}}upUI();upInvUI();rSide();openLab();if(nl.length>0)d('msg').innerHTML='🎉 解锁新元素：<b>'+nl.map(e=>EL[e].n+'('+EL[e].s+')').join('、')+'</b>！现在可以放置了！';else d('msg').innerHTML='✅ 合成完成：'+r.desc};

// ==================== REACTIONS ====================
function trR(key,el1,el2){
    if(rxc[key])return;const rx={};if(key==='Na+H2O'||key==='Li+H2O'){rx.ef=key==='Na+H2O'?'naBoom':'liBoom';rx.cd=12}else{const r=RX[key];if(!r)return;Object.assign(rx,r)}
    rxc[key]=rx.cd||15;setTimeout(()=>delete rxc[key],(rx.cd||15)*1000);
    const ef=rx.ef;
    if(ef==='saltWall'){const row=el1.row;for(let e of els){if(e.row===row&&e!==el1&&e!==el2){e.iv=rx.dur;e.hp=Math.max(e.hp,e.mhp*3)}}el1.iv=rx.dur;el2.iv=rx.dur;sP((el1.x+el2.x)/2,(el1.y+el2.y)/2,'#ffffff',25);addSub('NaCl',1);d('msg').innerHTML='🧂 盐墙生成！获得食盐×1'}
    else if(ef==='slowAll'){for(let z of zs)z.sl=Math.max(z.sl,6);sP(el1.x,el1.y,'#ffffff',30);d('msg').innerHTML='💡 白光闪耀！全场减速6秒'}
    else if(ef==='boostC'){const cE=el1.s==='C'?el1:el2;if(cE.al){cE.pa=EL.C.pa*2;cE.pi=EL.C.pi/2;sP(cE.x,cE.y,'#88ff88',15);d('msg').innerHTML='⚡ 碳产电子翻倍！10秒后碳被消耗';setTimeout(()=>{if(cE.al){es+=60;klEl(cE,'rx');d('msg').innerHTML='💨 碳已消耗，获得60⚡'}},10000)}}
    else if(ef==='battery'){const amt=180+Math.floor(Math.random()*120);es+=amt;sP((el1.x+el2.x)/2,(el1.y+el2.y)/2,'#ffd700',25);upUI();d('msg').innerHTML='🔋 原电池！+'+amt+'⚡'}
    else if(ef==='rust'){const fe=el1.s==='Fe'?el1:el2;fe.rust={x:fe.x,y:fe.y,r:CW*2.2,t:rx.dur};sP(fe.x,fe.y,'#8b4513',20);addSub('Fe2O3',1);d('msg').innerHTML='🟤 锈蚀区！获得铁锈×1'}
    else if(ef==='toxCloud'){for(let z of zs){if(Math.hypot(z.x-el1.x,z.y-el1.y)<CW*2)z.po=rx.dur}sP(el1.x,el1.y,'#aacc00',18);d('msg').innerHTML='☠️ SO₂毒气云！'}
    else if(ef==='naBoom'){for(let z of zs){if(Math.hypot(z.x-el1.x,z.y-el1.y)<CW*2.5){z.hp-=300;z.lastHitBy='Na';z.lastHitByContact=true;z.contactPlant=el1;sP(z.x,z.y,'#ff4400',20)}}sP(el1.x,el1.y,'#ff6600',40);d('msg').innerHTML='💥 2Na+2H₂O→2NaOH+H₂↑ 剧烈反应！'}
    else if(ef==='liBoom'){for(let z of zs){if(Math.hypot(z.x-el1.x,z.y-el1.y)<CW*2){z.hp-=180;z.lastHitBy='Li';z.lastHitByContact=true;z.contactPlant=el1;sP(z.x,z.y,'#ff3333',15)}}sP(el1.x,el1.y,'#ff4444',30);d('msg').innerHTML='💥 2Li+2H₂O→2LiOH+H₂↑ 反应！'}
}

// ==================== ON-FIELD REACTIONS ====================
const RX={
    'Na+Cl':{eq:'2Na+Cl₂→2NaCl',ef:'saltWall',dur:20,cd:25},'Cl+Na':{eq:'2Na+Cl₂→2NaCl',ef:'saltWall',dur:20,cd:25},
    'Mg+O':{eq:'2Mg+O₂→2MgO',ef:'slowAll',dur:6,cd:20},'O+Mg':{eq:'2Mg+O₂→2MgO',ef:'slowAll',dur:6,cd:20},
    'C+O':{eq:'C+O₂→CO₂',ef:'boostC',dur:10,cd:30},'O+C':{eq:'C+O₂→CO₂',ef:'boostC',dur:10,cd:30},
    'Zn+Cu':{eq:'Zn+Cu²⁺→Zn²⁺+Cu',ef:'battery',dur:0,cd:15},'Cu+Zn':{eq:'Zn+Cu²⁺→Zn²⁺+Cu',ef:'battery',dur:0,cd:15},
    'Fe+O':{eq:'4Fe+3O₂+6H₂O→4Fe(OH)₃',ef:'rust',dur:15,cd:25},'O+Fe':{eq:'4Fe+3O₂+6H₂O→4Fe(OH)₃',ef:'rust',dur:15,cd:25},
    'S+O':{eq:'S+O₂→SO₂',ef:'toxCloud',dur:5,cd:18},'O+S':{eq:'S+O₂→SO₂',ef:'toxCloud',dur:5,cd:18}
};

// ==================== GAME LOOP ====================
function spZ(now){if(!gs||go)return;const et=(now-gst)/1000;if(et<30)return;let iv=Math.max(0.6,3-wv*0.15);if(boss)iv=Math.max(0.2,iv/1.5);if(ls>0&&now-ls<iv*1000)return;ls=now;let tps=[];for(let[k,v]of Object.entries(ZT)){if(et>=v.us)tps.push(k)}if(!tps.length)tps.push('water');const tp=tps[Math.floor(Math.random()*tps.length)],row=Math.floor(Math.random()*ROWS);const z=new Zb(row,tp);z.hp+=Math.floor(wv*18);z.sp=Math.min(160,z.sp+wv*1.5);zs.push(z);wv++;upUI()}
function gup(now){if(go){draw();return}const dt=Math.min(0.033,(now-lf)/1000);if(dt<=0){lf=now;fr=requestAnimationFrame(gup);return}lf=now;upUI();const etCd=Math.max(0,30-(now-gst)/1000);const cdEl=d('cdStat'),cdVl=d('vCd');if(etCd>0.5){cdVl.innerText=Math.ceil(etCd);cdEl.style.display=''}else if(cdEl.style.display!=='none'){cdEl.style.display='none';d('msg').innerHTML='⚠️ 僵尸入侵！'}spZ(now);if(!les||now-les>12000){les=now;ecs.push({x:30+Math.random()*(cv.width-60),y:30+Math.random()*(cv.height-60),st:now});if(ecs.length>8)ecs.shift()}for(let i=ecs.length-1;i>=0;i--){if(now-ecs[i].st>2500){es+=20;ecs.splice(i,1);upUI()}}for(let e of els){e.up(dt);if(e.al&&e.at<=0&&e.r!=='wall'&&e.r!=='anode'&&e.r!=='cathode'&&e.r!=='skill')e.attack()}for(let r=0;r<ROWS;r++){for(let c=0;c<COLS-1;c++){const a=gd[r][c],b=gd[r][c+1];if(!a||!b||!a.al||!b.al)continue;const k1=a.s+'+'+b.s,k2=b.s+'+'+a.s;if(RX[k1])trR(k1,a,b);else if(RX[k2])trR(k2,a,b)}}for(let e of els){if(!e.al||e.s!=='Zn')continue;for(let e2 of els){if(!e2.al||e2.s!=='Cu'||e2===e)continue;if(Math.abs(e.row-e2.row)<=1&&Math.abs(e.col-e2.col)<=1)trR('Zn+Cu',e,e2)}}for(let i=bls.length-1;i>=0;i--){bls[i].up(dt);if(!bls[i].al)bls.splice(i,1)}for(let i=zs.length-1;i>=0;i--){const z=zs[i];z.up(dt);for(let b of bls){if(!b.al)continue;if(Math.hypot(b.x-z.x,b.y-z.y)<22){if(b.bn)z.bn=2;if(b.po)z.po=3;if(b.ah)z.nh=b.ah;if(b.dp){z.dp=true;z.sp=ZT[z.tp].sp*0.5;setTimeout(()=>{z.sp=ZT[z.tp].sp},3000)}if(b.fl)z.fl=0.5}}if(z.x<-60){go=true;d('msg').innerHTML='💀 僵尸突破防线！游戏结束';cancelAnimationFrame(fr);draw();return}if(z.hp<=0){sc+=z.sc;sySc(sc);const dmsg=applyDeathDrops(z);d('msg').innerHTML=dmsg;sP(z.x,z.y,z.cl,15);zs.splice(i,1)}}for(let i=ps.length-1;i>=0;i--){if(!ps[i].up(dt))ps.splice(i,1)}if(boss)upBoss(now,dt);draw();fr=requestAnimationFrame(gup)}

// ==================== BOSS ====================
function stBoss(n){if(go||boss)return;const ms={1:500,2:1500,3:3000};if(sc<ms[n])return;boss={nm:n,tm:0,dt:{st:performance.now()}};if(n===1){boss.dt.hp=25000;boss.dt.mhp=25000;boss.dt.fN=null;boss.dt.fH=null;boss.dt.nh3=false;boss.dt.nh3t=0;d('msg').innerHTML='🏭 哈伯-博斯出现！用F/Cl破坏催化剂'}else if(n===2){boss.dt.hp=18000;boss.dt.mhp=18000;boss.dt.rad=[{x:cv.width-120,y:cv.height/2,sz:22,hp:800}];boss.dt.stm=0;d('msg').innerHTML='⚡ 自由基出现！用C/S/P捕获'}else{boss.dt.hp=35000;boss.dt.mhp=35000;boss.dt.tx=0;boss.dt.txt=0;d('msg').innerHTML='☠️ 重金属污染源！用S沉淀封堵'}d('bsStat').style.display='inline-block';upUI()}
function upBoss(now,dt){const bd=boss.dt;bt+=dt;if(boss.nm===1){if(bt>12&&!bd.nh3&&!bd.fN){bd.fN={x:cv.width-220,y:180};bd.fH={x:cv.width-120,y:300};d('msg').innerHTML='🌫️ N₂/H₂雾出现！用<b>F/Cl</b>破坏催化剂'}if(bt>28&&bd.fN&&!bd.nh3){bd.nh3=true;bd.nh3t=0;d('msg').innerHTML='⚠️ NH₃开始合成！15秒后毒云爆发'}if(bd.nh3){bd.nh3t+=dt;if(bd.nh3t>15){for(let e of els){e.hp-=60;e.po=12}d('msg').innerHTML='💨 NH₃毒云爆发！';bd.nh3=false;bd.fN=null;bd.fH=null;bt=0}}for(let e of els){if(!e.al||!'FCl'.includes(e.s))continue;if(bd.fN&&Math.hypot(e.x-bd.fN.x,e.y-bd.fN.y)<CW*1.5){bd.fN=null;bd.fH=null;bd.nh3=false;d('msg').innerHTML='✅ 催化剂被破坏！NH₃合成中止';bt=0;sP(e.x,e.y,'#88ff88',20);bd.hp-=3000}}if(bd.hp<=0)wnBoss(1)}else if(boss.nm===2){bd.stm+=dt;if(bd.stm>6&&bd.rad.length<24){const nr=[];for(let r of bd.rad){r.sz/=1.5;r.hp/=1.5;nr.push({...r,sz:r.sz,hp:r.hp})}bd.rad.push(...nr);bd.stm=0;d('msg').innerHTML='⚡ 自由基分裂！当前<b>'+bd.rad.length+'</b>个'}for(let e of els){if(!e.al||!'CSP'.includes(e.s))continue;for(let i=bd.rad.length-1;i>=0;i--){if(Math.hypot(e.x-bd.rad[i].x,e.y-bd.rad[i].y)<CW*1.2){bd.rad.splice(i,1);sP(e.x,e.y,'#88ff88',10);sc+=200;sySc(sc);upUI()}}}if(bd.rad.length===0)wnBoss(2)}else{bd.txt+=dt;if(bd.txt>3.5){bd.tx+=6;bd.txt=0;for(let e of els){if(Math.random()<0.25){e.po=10;e.hp-=15}}}for(let e of els){if(!e.al||e.s!=='S')continue;bd.tx=Math.max(0,bd.tx-3);if(Math.random()<0.25)sP(e.x,e.y,'#ffff00',6)}if(bd.tx<=0)wnBoss(3)}d('vBs').innerText=Math.floor(bd.hp||0)}
function wnBoss(n){const rw={1:8000,2:15000,3:25000};sc+=rw[n]||8000;sySc(sc);upUI();d('msg').innerHTML='🎉 Boss击败！+'+rw[n]+'积分！获得稀有物质';addSub('CaCO3',3);addSub('SiO2',2);addSub('PbNO32',2);d('bsStat').style.display='none';boss=null;bt=0}

// ==================== PLACEMENT ====================
function plEl(row,col){if(go||row<0||row>=ROWS||col<0||col>=COLS)return false;if(gd[row][col]!==null)return false;const ed=EL[sel];if(!ed)return false;if(!unlocked.has(sel)){d('msg').innerHTML='🔒 <b>'+ed.n+'</b> 尚未解锁！击杀僵尸收集物质→实验室提取';return false}if(es<ed.cost){d('msg').innerHTML='❌ 电子不足（需<b>'+ed.cost+'⚡</b>）';return false}if(cds[sel]&&cds[sel]>0){d('msg').innerHTML='⏳ <b>'+ed.n+'</b> 冷却中';return false}if(ed.na){for(let r=row-1;r<=row+1;r++){for(let c=col-1;c<=col+1;c++){if(r===row&&c===col)continue;if(r>=0&&r<ROWS&&c>=0&&c<COLS&&gd[r][c]!==null){d('msg').innerHTML='❌ 碳不可相邻种植（CO₂封锁）';return false}}}}es-=ed.cost;const el=new El(sel,row,col);gd[row][col]=el;els.push(el);stCD(sel,ed.cd||5);upUI();sP(el.x,el.y,ed.cl,10);if(el.rs>0){for(let e of els){if(e.row===row&&e!==el)e.iv=5}d('msg').innerHTML='🛡️ 氩放置！第'+(row+1)+'行无敌5秒'}else d('msg').innerHTML='✅ 放置 <b>'+ed.n+'('+ed.s+')</b> — '+ed.d;return true}
function shEl(row,col){const el=gd[row][col];if(!el||!el.al)return false;if(el.pm){d('msg').innerHTML='❌ 硅地刺永久存在不可铲除';return false}const rf=Math.floor(EL[el.tp].cost/2);es+=rf;klEl(el,'sh');upUI();d('msg').innerHTML='🔧 铲除<b>'+EL[el.tp].n+'</b>，返还'+rf+'⚡';return true}
function useSkill(row,col){const ed=EL[sel];if(!ed||ed.r!=='skill')return;if(es<ed.cost||(cds[sel]&&cds[sel]>0))return;es-=ed.cost;stCD(sel,ed.cd);upUI();let k=0;for(let i=zs.length-1;i>=0;i--){const z=zs[i];if(Math.abs(z.row-row)<=1&&Math.abs(Math.floor(z.x/CW)-col)<=1){sc+=z.sc;k++;z.lastHitBy='P';applyDeathDrops(z);sP(z.x,z.y,'#ff4400',18);zs.splice(i,1)}}sySc(sc);upUI();skl=false;d('msg').innerHTML=k>0?'🔥 磷爆！清除<b>'+k+'</b>只僵尸':'🔥 范围内无僵尸';rSide()}

// ==================== CD ====================
function stCD(t,sec){cds[t]=sec;upCDUI();if(cdt[t])clearTimeout(cdt[t]);cdt[t]=setTimeout(()=>{delete cds[t];upCDUI()},sec*1000)}
function upCDUI(){document.querySelectorAll('.el-card').forEach(ch=>{const t=ch.dataset.type;if(!t||!EL[t])return;const rm=cds[t];const bar=ch.querySelector('.cd-bar'),txt=ch.querySelector('.cd-txt');if(rm&&rm>0){bar.style.width=(rm/(EL[t].cd||5)*100)+'%';txt.innerText=Math.ceil(rm)+'s'}else{bar.style.width='0%';txt.innerText=''}})}

// ==================== DRAW ====================
function draw(){cx.clearRect(0,0,cv.width,cv.height);cx.strokeStyle='rgba(74,122,58,0.5)';cx.lineWidth=1;for(let i=0;i<=COLS;i++){cx.beginPath();cx.moveTo(i*CW,0);cx.lineTo(i*CW,cv.height);cx.stroke()}for(let i=0;i<=ROWS;i++){cx.beginPath();cx.moveTo(0,i*CH);cx.lineTo(cv.width,i*CH);cx.stroke()}for(let c=0;c<COLS;c++){cx.fillStyle=c%2===0?'rgba(0,0,0,0)':'rgba(255,255,255,0.01)';cx.fillRect(c*CW,0,CW,cv.height)}for(let e of els){if(!e.al||!e.rust)continue;cx.save();cx.fillStyle='rgba(139,69,19,0.08)';cx.beginPath();cx.arc(e.x,e.y,e.rust.r,0,Math.PI*2);cx.fill();cx.strokeStyle='rgba(139,69,19,0.3)';cx.lineWidth=2;cx.setLineDash([8,4]);cx.stroke();cx.setLineDash([]);cx.restore()}for(let e of els)e.draw(cx);for(let z of zs)z.draw(cx);for(let b of bls)b.draw(cx);for(let p of ps)p.draw(cx);for(let e of ecs){cx.save();const a=Math.min(1,(performance.now()-e.st)/500);cx.globalAlpha=a;cx.beginPath();cx.arc(e.x,e.y,13,0,Math.PI*2);cx.fillStyle='#ffd700';cx.shadowBlur=12;cx.fill();cx.beginPath();cx.arc(e.x,e.y,6,0,Math.PI*2);cx.fillStyle='#fff';cx.fill();cx.restore()}if(boss)drawBoss();if(mg.r!==-1&&!go){cx.save();cx.globalAlpha=0.25;cx.fillStyle=shv?'#e05030':skl?'#dd5a2a':'#f0c040';cx.fillRect(mg.c*CW,mg.r*CH,CW,CH);cx.restore()}if(go){cx.fillStyle='rgba(0,0,0,0.55)';cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle='#f0c040';cx.font='bold 36px sans-serif';cx.textAlign='center';cx.fillText('GAME OVER',cv.width/2,cv.height/2-10);cx.font='16px sans-serif';cx.fillStyle='#fff';cx.fillText('积分: '+sc+' | 波次: '+wv+' | 解锁: '+unlocked.size+'元素',cv.width/2,cv.height/2+30)}}
function drawBoss(){const bd=boss.dt;if(bd.hp!==undefined){const bw=300,bx=(cv.width-bw)/2;cx.fillStyle='rgba(30,10,50,0.8)';rR(cx,bx-2,3,bw+4,20,10);cx.fill();cx.fillStyle='#b83bff';rR(cx,bx,5,bw*(bd.hp/bd.mhp),16,8);cx.fill();cx.strokeStyle='rgba(240,200,255,0.6)';cx.lineWidth=1.5;cx.beginPath();rR(cx,bx,5,bw,16,8);cx.stroke();cx.fillStyle='#fff';cx.font='bold 9px sans-serif';cx.fillText('Boss HP '+Math.floor(bd.hp)+'/'+bd.mhp,bx+8,16)}if(boss.nm===1){cx.save();cx.fillStyle='#556';rR(cx,cv.width-160,cv.height/2-55,100,110,12);cx.fill();cx.strokeStyle='#888';cx.lineWidth=2;cx.beginPath();rR(cx,cv.width-160,cv.height/2-55,100,110,12);cx.stroke();cx.fillStyle='#fff';cx.font='bold 13px sans-serif';cx.textAlign='center';cx.fillText('H-B',cv.width-110,cv.height/2+5);cx.font='9px sans-serif';cx.fillStyle='#aaa';cx.fillText('Haber-Bosch',cv.width-110,cv.height/2+20);cx.restore();if(bd.fN){cx.save();cx.fillStyle='rgba(100,180,255,0.25)';cx.beginPath();cx.arc(bd.fN.x,bd.fN.y,55,0,Math.PI*2);cx.fill();cx.fillStyle='#fff';cx.font='bold 16px sans-serif';cx.textAlign='center';cx.fillText('N₂',bd.fN.x,bd.fN.y+5);cx.fillStyle='rgba(255,200,255,0.25)';cx.beginPath();cx.arc(bd.fH.x,bd.fH.y,45,0,Math.PI*2);cx.fill();cx.fillText('H₂',bd.fH.x,bd.fH.y+5);cx.restore()}if(bd.nh3){const a=Math.min(0.6,bd.nh3t/15*0.6);cx.fillStyle=`rgba(200,255,100,${a})`;cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle='#ff0';cx.font='bold 18px sans-serif';cx.textAlign='center';cx.fillText('NH₃ 合成中...',cv.width/2,cv.height/2)}}else if(boss.nm===2){for(let r of bd.rad){cx.save();cx.beginPath();cx.arc(r.x,r.y,r.sz,0,Math.PI*2);cx.fillStyle=`rgba(255,180,0,${0.4+r.sz/40})`;cx.shadowBlur=15;cx.shadowColor='#ffa000';cx.fill();cx.restore()}}else{cx.save();cx.fillStyle='#2a4a2a';rR(cx,cv.width-160,cv.height/2-55,60,110,10);cx.fill();cx.strokeStyle='#4a8a4a';cx.lineWidth=2;cx.beginPath();rR(cx,cv.width-160,cv.height/2-55,60,110,10);cx.stroke();cx.fillStyle='rgba(0,200,0,'+(0.1+bd.tx/30)+')';cx.fillRect(0,0,cv.width,cv.height);cx.fillStyle='#fff';cx.font='10px sans-serif';cx.textAlign='center';cx.fillText('毒性:'+bd.tx,cv.width-130,cv.height/2+5);cx.restore()}}

// ==================== SIDEBAR ====================
function rSide(){const sb=d('sideC');if(!sb)return;sb.innerHTML='';EG.forEach(g=>{const div=document.createElement('div');div.className='el-grp';div.innerHTML='<div class="el-gl">'+g.lb+'</div><div class="el-row"></div>';const row=div.querySelector('.el-row');g.it.forEach(t=>{const ed=EL[t];if(!ed)return;const ch=document.createElement('div');ch.className='el-card';ch.dataset.type=t;if(sel===t)ch.classList.add('sel');if(!unlocked.has(t))ch.classList.add('locked');ch.innerHTML='<span class="sym">'+ed.s+'</span><span class="nm">'+ed.n+'</span><span class="cst">'+ed.cost+'⚡</span><div class="cd-bar"></div><div class="cd-txt"></div>';ch.title=unlocked.has(t)?ed.n+'('+ed.s+') | '+ed.d+' | ❤️'+ed.hp+' ⚔️'+(ed.dmg||'—'):'🔒 未解锁：击杀僵尸收集物质→实验室提取';ch.addEventListener('click',()=>{if(!unlocked.has(t)){d('msg').innerHTML='🔒 <b>'+ed.n+'</b>尚未解锁！在炼金实验室中用物质提取';return}if(shv){shv=false;d('shBtn')?.classList.remove('act')}if(ed.r==='skill'){skl=true;d('msg').innerHTML='🔥 技能模式：点击战场引爆3x3范围（消耗<b>'+ed.cost+'⚡</b>）'}else{skl=false}sel=t;rSide();upCDUI()});row.appendChild(ch)});sb.appendChild(div)});const tr=document.createElement('div');tr.className='tool-row';const sh=document.createElement('div');sh.className='tool-btn';sh.id='shBtn';sh.innerText='🔧 铲子';sh.addEventListener('click',()=>{shv=!shv;sh.classList.toggle('act',shv);skl=false;if(shv)d('msg').innerHTML='🔧 铲子模式：点植物铲除返50%电子';else d('msg').innerHTML='铲子模式关闭'});tr.appendChild(sh);sb.appendChild(tr);upCDUI()}
function rGuide(){const c=d('guideC');if(!c)return;c.innerHTML='<h4 style="color:var(--ac);margin:12px 0 8px">🧪 元素图鉴（'+unlocked.size+'/'+Object.keys(EL).length+' 已解锁）</h4>';c.innerHTML+=Object.entries(EL).map(([k,v])=>'<div class="gd-item" style="'+(unlocked.has(k)?'':'opacity:0.45')+'"><div class="gd-sym" style="background:'+v.cl+'">'+v.s+'</div><div class="gd-info"><strong>'+v.n+'</strong>'+(v.start?' <span style="color:var(--gd)">起始</span>':unlocked.has(k)?' <span style="color:var(--gn)">已解锁</span>':' <span style="color:var(--rd)">🔒</span>')+'<br>'+v.d+'<br>💰'+v.cost+'⚡ ❤️'+v.hp+' ⚔️'+(v.dmg||'—')+'</div></div>').join('');c.innerHTML+='<h4 style="color:var(--ac);margin:12px 0 8px">🧟 僵尸图鉴（死亡产物取决于击杀方式）</h4>';c.innerHTML+=Object.entries(ZT).map(([k,v])=>'<div class="gd-item"><div style="width:45px;height:45px;background:'+v.cl+';border-radius:8px;flex-shrink:0"></div><div class="gd-info"><strong>'+v.n+'</strong> <span style="color:var(--txt2)">'+v.chem+'</span><br>'+v.d+'<br>❤️'+v.hp+' 🏃'+v.sp+' ⚔️'+v.atk+' 🕐'+v.us+'s解锁</div></div>').join('');c.innerHTML+='<h4 style="color:var(--gd);margin:12px 0 8px">⚗️ 死亡反应表（击杀方式→产物）</h4>';c.innerHTML+='<div style="font-size:0.75rem;line-height:1.6"><p>💧 水僵尸 + <b>Na</b> → NaOH | + <b>Li</b> → LiOH</p><p>🧪 酸僵尸 + <b>Na</b> → 对应钠盐(HCl→NaCl, H₂SO₄→Na₂SO₄, HNO₃→NaNO₃)</p><p>⚡ H₂O₂僵尸 → 死亡自动分解→H₂O×2</p><p>☠️ Pb(NO₃)₂僵尸 + <b>S</b> → PbS↓沉淀</p><p>🧬 有机碱僵尸 + <b>F/Cl</b> → 裂解→额外C</p></div>';c.innerHTML+='<h4 style="color:var(--gd);margin:12px 0 8px">🔬 实验室配方</h4>';c.innerHTML+=RCP.map(r=>'<div class="gd-item"><div style="font-size:1.5rem;width:40px;text-align:center">'+r.icon+'</div><div class="gd-info"><strong>'+r.desc+'</strong><br><span style="font-family:Consolas,monospace;color:var(--gd)">'+r.eq+'</span><br>'+r.unlockDesc+' | 💰'+r.esp+'⚡</div></div>').join('')}

// ==================== EVENTS ====================
cv.addEventListener('click',e=>{if(go)return;const r=cv.getBoundingClientRect();const mx=(e.clientX-r.left)*(cv.width/r.width),my=(e.clientY-r.top)*(cv.height/r.height);for(let i=ecs.length-1;i>=0;i--){if(Math.hypot(mx-ecs[i].x,my-ecs[i].y)<22){es+=20;ecs.splice(i,1);upUI();return}}const col=Math.floor(mx/CW),row=Math.floor(my/CH);if(row<0||row>=ROWS||col<0||col>=COLS)return;if(shv){shEl(row,col);shv=false;d('shBtn')?.classList.remove('act');return}if(skl){useSkill(row,col);return}plEl(row,col)});
cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();const mx=(e.clientX-r.left)*(cv.width/r.width),my=(e.clientY-r.top)*(cv.height/r.height);const col=Math.floor(mx/CW),row=Math.floor(my/CH);mg={r:row>=0&&row<ROWS?row:-1,c:col>=0&&col<COLS?col:-1}});
d('btnRe').addEventListener('click',restart);d('btnGd').addEventListener('click',()=>{rGuide();d('guideMod').classList.add('show')});d('closeGd').addEventListener('click',()=>d('guideMod').classList.remove('show'));d('btnRk').addEventListener('click',()=>{ldRk();d('rankMod').classList.add('show')});d('closeRk').addEventListener('click',()=>d('rankMod').classList.remove('show'));d('btnLab').addEventListener('click',openLab);d('closeLab').addEventListener('click',()=>d('labMod').classList.remove('show'));d('btnB1').addEventListener('click',()=>stBoss(1));d('btnB2').addEventListener('click',()=>stBoss(2));d('btnB3').addEventListener('click',()=>stBoss(3));
['rankMod','guideMod','labMod'].forEach(id=>d(id).addEventListener('click',e=>{if(e.target===d(id))d(id).classList.remove('show')}));

function restart(){go=false;gs=true;es=200;sc=0;wv=0;zs=[];els=[];bls=[];ps=[];rxa=[];rxl=[];ecs=[];gd=Array(ROWS).fill().map(()=>Array(COLS).fill(null));cds={};for(let t in cdt)clearTimeout(cdt[t]);cdt={};rxc={};inv={};unlocked=new Set(['H','C','Ne']);boss=null;bt=0;shv=false;skl=false;sel='H';gst=performance.now();lf=gst;ls=0;les=0;upUI();upInvUI();rSide();d('msg').innerHTML='⚛️ 初始：<b>H C Ne</b> | 僵尸死亡产物取决于击杀方式 | 🔬实验室提取新元素 | 30秒发育期';d('bsStat').style.display='none';d('btnB1').style.display='none';d('btnB2').style.display='none';d('btnB3').style.display='none';if(fr)cancelAnimationFrame(fr);fr=requestAnimationFrame(gup)}
async function init(){await iSp();rSide();upUI();upInvUI();gs=true;gst=performance.now();lf=gst;d('msg').innerHTML='⚛️ 初始：<b>H C Ne</b> | 僵尸死亡产物=真实反应结果 | Na杀水僵尸→NaOH, 酸碱中和→盐+水 | 30秒发育期';fr=requestAnimationFrame(gup)}init();
})();