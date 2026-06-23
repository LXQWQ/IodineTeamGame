// ===== CONFIGURATION =====
const CFG = {
  canvasW: 1060, canvasH: 720,
  playerR: 16, speed: 2.8,
  normalRange: 45, normalDamage: 18, normalCooldown: 600,
  projectileR: 6
};

const WEAPONS = {
  katana: { name:'刀', icon:'🗡️', desc:'近战均衡型',
    skills:[
      {name:'斩击',type:'melee',damage:38,cooldown:900,range:55,angle:Math.PI/2.8,icon:'⚔️'},
      {name:'飞燕',type:'dash',damage:42,cooldown:3200,distance:130,icon:'💨'},
      {name:'铁壁',type:'shield',duration:1800,cooldown:7500,icon:'🛡️'},
      {name:'龙闪',type:'breakthrough',damage:55,cooldown:5000,range:72,knockback:280,icon:'🐉'}
    ]},
  bow:{ name:'弓', icon:'🏹', desc:'远程射击型',
    skills:[
      {name:'速射',type:'projectile',damage:24,cooldown:750,speed:9,range:350,icon:'➡️'},
      {name:'贯穿',type:'projectile',damage:38,cooldown:2600,speed:11,range:400,pierce:true,icon:'🔥'},
      {name:'回避',type:'dodge',cooldown:5000,distance:90,icon:'💫'},
      {name:'破魔',type:'breakthrough',projectile:true,damage:35,cooldown:5000,speed:7,knockback:350,icon:'✨'}
    ]},
  spear:{ name:'枪', icon:'🔱', desc:'长柄突进型',
    skills:[
      {name:'突刺',type:'melee',damage:32,cooldown:1100,range:72,angle:Math.PI/4,icon:'📍'},
      {name:'旋风',type:'meleeAoe',damage:36,cooldown:3600,range:62,angle:Math.PI*2,icon:'🌀'},
      {name:'坚牢',type:'shield',duration:2200,cooldown:8500,icon:'🔰'},
      {name:'崩击',type:'breakthrough',damage:48,cooldown:5000,range:82,knockback:300,icon:'💥'}
    ]},
  dual:{ name:'双剑', icon:'⚔️', desc:'高速连击型',
    skills:[
      {name:'双斩',type:'melee',damage:24,cooldown:550,range:48,angle:Math.PI/2.4,icon:'⚡'},
      {name:'乱舞',type:'melee',damage:55,cooldown:3800,range:55,angle:Math.PI/1.8,icon:'🌪️'},
      {name:'瞬步',type:'dodge',cooldown:4200,distance:110,icon:'💨'},
      {name:'破击',type:'breakthrough',damage:42,cooldown:4600,range:66,knockback:280,icon:'💢'}
    ]}
};

// ===== UTILITY =====
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function angle(a,b){return Math.atan2(b.y-a.y,b.x-a.x)}
function lerp(a,b,t){return a+(b-a)*t}
function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v))}
function rand(min,max){return Math.random()*(max-min)+min}

// ===== GAME STATE =====
let G = null; // current game state
let canvas, ctx;
let keys = {};
let modeSelected = null;
let playerMode = 'dual'; // 'single' | 'dual'
let wp1 = null, wp2 = null;
let wpSelectStage = 0; // 0=P1, 1=P2(only for dual instant)

// ===== CLASSES =====
class Character {
  constructor(x,y,team,weaponId,isPlayer=false,name='') {
    this.x=x;this.y=y;this.startX=x;this.startY=y;
    this.team=team;
    this.weaponId=weaponId;
    this.weapon=WEAPONS[weaponId];
    this.isPlayer=isPlayer;
    this.name=name||(team=='red'?'武者':'武士');
    this.hp=100;this.maxHp=100;
    this.alive=true;
    this.dir=team=='red'?1:-1; // 1=right,-1=left
    this.angle=team=='red'?0:Math.PI;
    this.speed=CFG.speed;
    this.radius=CFG.playerR;
    this.skillCds=[0,0,0,0];
    this.normalCd=0;
    this.shieldActive=false;
    this.shieldTimer=0;
    this.kills=0;
    this.flashTimer=0;
    this.stunTimer=0;
    this.aiState='idle';
    this.aiTarget=null;
    this.aiTimer=0;
    this.id=Character._id++;
  }
  get maxSkillCds(){
    return this.weapon.skills.map(s=>s.cooldown);
  }
  reset(pos){
    this.x=pos.x;this.y=pos.y;
    this.startX=pos.x;this.startY=pos.y;
    this.hp=this.maxHp;
    this.alive=true;
    this.skillCds=[0,0,0,0];
    this.normalCd=0;
    this.shieldActive=false;
    this.shieldTimer=0;
    this.stunTimer=0;
    this.flashTimer=0;
    this.dir=this.team=='red'?1:-1;
    this.angle=this.team=='red'?0:Math.PI;
  }
  takeDamage(dmg,attacker){
    if(!this.alive) return;
    if(this.shieldActive){dmg=Math.floor(dmg*0.3);}
    this.hp-=dmg;
    this.flashTimer=8;
    if(this.hp<=0){this.hp=0;this.alive=false;if(attacker)attacker.kills++;}
  }
}
Character._id=0;

class Projectile {
  constructor(x,y,angle,speed,damage,team,weapon,pierce=false,knockback=0,attacker=null){
    this.x=x;this.y=y;
    this.radius=CFG.projectileR;
    this.vx=Math.cos(angle)*speed;
    this.vy=Math.sin(angle)*speed;
    this.damage=damage;
    this.team=team;
    this.weapon=weapon;
    this.pierce=pierce;
    this.knockback=knockback;
    this.attacker=attacker;
    this.alive=true;
    this.life=180;
    this.trail=[];
    this.id=Projectile._id++;
  }
  update(){
    if(!this.alive) return;
    this.trail.push({x:this.x,y:this.y});
    if(this.trail.length>8) this.trail.shift();
    this.x+=this.vx;this.y+=this.vy;
    this.life--;
    if(this.life<=0||this.x<-50||this.x>CFG.canvasW+50||this.y<-50||this.y>CFG.canvasH+50) this.alive=false;
  }
}
Projectile._id=0;

// ===== MAP ENTITIES (战国 mode) =====
class Tower {
  constructor(x,y,pos){
    this.x=x;this.y=y;
    this.pos=pos; // 'north'|'south'
    this.team=null; // null|'red'|'blue'
    this.guardian=null;
    this.bellRung=false;
    this.radius=30;
    this.hp=200;
  }
}

class Guardian {
  constructor(x,y,tower){
    this.x=x;this.y=y;
    this.tower=tower;
    this.hp=150;this.maxHp=150;
    this.alive=true;
    this.radius=22;
    this.aggroRange=200;
    this.team=null;
    this.respawnTimer=0;
  }
}

class Tenshukaku {
  constructor(x,y,team){
    this.x=x;this.y=y;
    this.team=team;
    this.radius=28;
    this.hasDisk=false;
  }
}

class FallenGeneral {
  constructor(x,y,team){
    this.x=x;this.y=y;
    this.team=team;
    this.alive=true;
    this.disk=new Disk(x-20,y,team);
    this.radius=20;
    this.hp=100;
  }
}

class Disk {
  constructor(x,y,team){
    this.x=x;this.y=y;
    this.startX=x;this.startY=y;
    this.team=team;
    this.vx=0;this.vy=0;
    this.radius=12;
    this.alive=true;
    this.attached=true;
    this.friction=0.96;
  }
  update(){
    if(this.attached) return;
    this.x+=this.vx;this.y+=this.vy;
    this.vx*=this.friction;this.vy*=this.friction;
    if(Math.abs(this.vx)<0.1&&Math.abs(this.vy)<0.1){this.vx=0;this.vy=0;}
    if(this.x<-30||this.x>CFG.canvasW+30||this.y<-30||this.y>CFG.canvasH+30) this.reset();
  }
  reset(){
    this.x=this.startX;this.y=this.startY;
    this.vx=0;this.vy=0;
    this.attached=true;
  }
}

// ===== MODE IMPLEMENTATIONS =====
const MODES = {};

// ---- 瞬杀 (Instant Kill) ----
MODES.instant = {
  name:'瞬杀', short:'instant',
  setup(){
    G.mapW=800;G.mapH=500;
    G.offsetX=(CFG.canvasW-G.mapW)/2;
    G.offsetY=(CFG.canvasH-G.mapH)/2;
    G.redScore=0;G.blueScore=0;
    G.round=1;G.maxRounds=1;
    G.state='playing';
    G.allies=[];
    G.enemies=[];
    G.projectiles=[];
    G.effects=[];
    G.towers=[];G.guardians=[];G.tenshukaku=[];G.fallenGenerals=[];G.disk=null;
    G.winner=null;

    const isP2Player=playerMode==='dual';
    const p1=new Character(G.offsetX+120,G.offsetY+G.mapH/2,'red',wp1||'katana',true,'剑士·壱');
    const p2=new Character(G.offsetX+G.mapW-120,G.offsetY+G.mapH/2,'blue',wp2||'katana',isP2Player,'剑士·弐');
    G.players=[p1,p2];
    G.p1=p1;G.p2=p2;
    G.resurrect={red:0,blue:0};
  },
  update(){
    const p1=G.p1,p2=G.p2;
    if(G._ending) return;
    if(!p1.alive&&p2.alive){G._ending=true;endGame('blue');return}
    if(!p2.alive&&p1.alive){G._ending=true;endGame('red');return}
    if(!p1.alive&&!p2.alive){G._ending=true;endGame(null);return}
    updateAI();
    updateProjectiles();
    updateEffects();
  },
  render(ctx){
    renderMap(ctx);
    renderCharacters(ctx,G.players);
    renderProjectiles(ctx);
    renderEffects(ctx);
  }
};

// ---- 战国 (Warring States) ----
MODES.warring = {
  name:'战国', short:'warring',
  setup(){
    G.mapW=960;G.mapH=640;
    G.offsetX=(CFG.canvasW-G.mapW)/2;
    G.offsetY=(CFG.canvasH-G.mapH)/2;
    G.redScore=0;G.blueScore=0;
    G.round=1;G.maxRounds=3;
    G.state='playing';
    G.projectiles=[];
    G.effects=[];
    G.resurrect={red:3,blue:3};
    G.roundResurrectUsed={red:false,blue:false};
    G.roundWinner=null;
    G.winner=null;
    G.running=true;
    G.roundActive=true;

    setupWarringMap();
    setupWarringTeams();

    G.p1=G.players.find(p=>p.isPlayer&&p.team=='red')||G.players[0];
    G.p2=G.players.find(p=>p.isPlayer&&p.team=='blue');
    if(!G.p2&&playerMode==='dual') G.p2=G.players[3]; // fallback to first blue
  },
  update(){
    if(!G.running||!G.roundActive) return;
    updateWarringObjectives();
    updateDisk();
    updateAI();
    updateProjectiles();
    updateEffects();
    checkWarringWinCondition();
  },
  render(ctx){
    renderMapWarring(ctx);
    renderCharacters(ctx,G.players);
    renderProjectiles(ctx);
    renderEffects(ctx);
  }
};

function setupWarringMap(){
  const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
  // Tenshukaku
  G.tenshukaku=[
    new Tenshukaku(ox+30,oy+mh/2,'red'),
    new Tenshukaku(ox+mw-30,oy+mh/2,'blue')
  ];
  // Towers
  const towerNorth=new Tower(ox+mw/2,oy+55,'north');
  const towerSouth=new Tower(ox+mw/2,oy+mh-55,'south');
  // Guardians
  towerNorth.guardian=new Guardian(ox+mw/2-50,oy+55,towerNorth);
  towerSouth.guardian=new Guardian(ox+mw/2+50,oy+mh-55,towerSouth);
  G.towers=[towerNorth,towerSouth];
  G.guardians=[towerNorth.guardian,towerSouth.guardian];
}

function setupWarringTeams(){
  G.players=[];
  const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
  const wps=['katana','bow','spear','katana','spear','dual'];
  // Red team (3)
  if(wp1) wps[0]=wp1;
  for(let i=0;i<3;i++){
    const p=new Character(ox+80+i*20,oy+mh/2-40+i*40,'red',wps[i],i===0,'红·'+(i+1));
    G.players.push(p);
  }
  // Blue team (3)
  const isDual=playerMode==='dual';
  if(wp2) wps[3]=wp2;
  for(let i=0;i<3;i++){
    const p=new Character(ox+mw-80-i*20,oy+mh/2-40+i*40,'blue',wps[i+3],isDual&&i===0,'蓝·'+(i+1));
    G.players.push(p);
  }
  G.allies=G.players.filter(p=>p.team==='red');
  G.enemies=G.players.filter(p=>p.team==='blue');
}

function checkWarringWinCondition(){
  // Check if any tenshukaku has a disk entered
  for(const t of G.tenshukaku){
    if(t.hasDisk){
      const winner=t.team==='red'?'blue':'red';
      endRound(winner);
      return;
    }
  }
  // Check if all players on one team are dead
  const redAlive=G.players.filter(p=>p.team==='red'&&p.alive).length;
  const blueAlive=G.players.filter(p=>p.team==='blue'&&p.alive).length;
  if(redAlive===0&&blueAlive>0){endRound('blue');return;}
  if(blueAlive===0&&redAlive>0){endRound('red');return;}
}

function endRound(winner){
  if(!G.roundActive||G.state==='ended'||!G.running) return;
  G.roundActive=false;
  G.roundWinner=winner;
  showNotification(winner==='red'?'🔴 红方获胜！':'🔵 蓝方获胜！',60);
  // Resurrection phase
  setTimeout(()=>{
    if(!G||G.state==='ended') return;
    const deadRed=G.players.filter(p=>p.team==='red'&&!p.alive);
    const deadBlue=G.players.filter(p=>p.team==='blue'&&!p.alive);
    const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
    if(deadRed.length>0&&G.resurrect.red>0&&!G.roundResurrectUsed.red){
      const r=deadRed[0];r.alive=true;r.hp=Math.floor(r.maxHp*0.5);
      r.x=ox+80;r.y=oy+mh/2;
      G.resurrect.red--;G.roundResurrectUsed.red=true;
      showNotification('🔴 红方使用复活',40);
    }
    if(deadBlue.length>0&&G.resurrect.blue>0&&!G.roundResurrectUsed.blue){
      const b=deadBlue[0];b.alive=true;b.hp=Math.floor(b.maxHp*0.5);
      b.x=ox+mw-80;b.y=oy+mh/2;
      G.resurrect.blue--;G.roundResurrectUsed.blue=true;
      showNotification('🔵 蓝方使用复活',40);
    }
    if(winner==='red') G.redScore++; else G.blueScore++;
    setTimeout(()=>{
      if(G.redScore>=2||G.blueScore>=2){
        endGame(G.redScore>=2?'red':'blue');
      } else {
        G.round++;
        startWarringRound();
      }
    },800);
  },1500);
}

function startWarringRound(){
  G.roundActive=true;
  G.projectiles=[];
  G.effects=[];
  G.roundResurrectUsed={red:false,blue:false};
  // Reset towers & guardians
  for(const t of G.towers){
    t.team=null;t.bellRung=false;
    t.guardian.alive=true;t.guardian.hp=t.guardian.maxHp;
  }
  // Reset fallen generals
  for(const fg of G.fallenGenerals){fg.alive=false;fg.disk.alive=false;}
  G.fallenGenerals=[];
  G.disk=null;
  for(const t of G.tenshukaku) t.hasDisk=false;
  // Reset player positions
  const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
  let ri=0,bi=0;
  for(const p of G.players){
    if(p.team==='red'){p.reset({x:ox+80+ri*20,y:oy+mh/2-40+ri*40});ri++;}
    else{p.reset({x:ox+mw-80-bi*20,y:oy+mh/2-40+bi*40});bi++;}
  }
  showNotification('第 '+G.round+' 局 · 开始！',50);
}

function updateWarringObjectives(){
  const ox=G.offsetX;
  // Check guardians - damaged by attacks near them
  for(const g of G.guardians){
    if(!g.alive) continue;
    for(const p of G.players){
      if(!p.alive||p.stunTimer>0) continue;
      if(dist(p,g)<g.radius+15&&p.normalCd>CFG.normalCooldown-100){
        g.hp-=2;
        if(g.hp<=0){g.alive=false;g.hp=0;
          showNotification((g.tower.pos==='north'?'北':'南')+'侧镇门牛鬼被击败！',50);
        }
      }
    }
  }
  // Bell ringing (player near tower after guardian dead)
  for(const t of G.towers){
    if(t.bellRung||t.guardian.alive) continue;
    for(const p of G.players){
      if(!p.alive) continue;
      const near=dist(p,t)<40;
      if(!near) continue;
      if(p.isPlayer){
        const bellKey=(p.team==='red'&&keys['KeyF'])||(p.team==='blue'&&keys['Digit5']);
        if(!keys['bellPress']&&bellKey){
          keys['bellPress']=true;
          captureTower(t,p);
        }
      } else if(Math.random()<0.03){
        captureTower(t,p);
      }
    }
  }
}

function captureTower(t,p){
  if(t.bellRung) return;
  t.team=p.team;t.bellRung=true;
  showNotification((t.pos==='north'?'北':'南')+'箭塔被'+(p.team==='red'?'🔴红方':'🔵蓝方')+'占领！',60);
  const enemyTenshu=G.tenshukaku.find(ts=>ts.team!==p.team);
  if(enemyTenshu&&!G.fallenGenerals.some(f=>f.team===p.team)){
    const fg=new FallenGeneral(enemyTenshu.x-20,enemyTenshu.y-40,p.team);
    G.fallenGenerals.push(fg);
    G.disk=fg.disk;
    showNotification('坠落大将出现在天守阁旁！',50);
  }
}

function updateDisk(){
  if(!G.disk) return;
  // Physical update (only when not attached)
  if(!G.disk.attached){
    G.disk.update();
    for(const t of G.tenshukaku){
      if(dist(G.disk,t)<t.radius+G.disk.radius){
        t.hasDisk=true;
        G.disk.alive=false;
        showNotification((t.team==='red'?'🔴红':'🔵蓝')+'方天守阁被击破！',60);
      }
    }
  }
}

// ---- 竹取 (Bamboo Cutter) ----
MODES.bamboo = {
  name:'竹取', short:'bamboo',
  setup(){
    G.mapW=920;G.mapH=560;
    G.offsetX=(CFG.canvasW-G.mapW)/2;
    G.offsetY=(CFG.canvasH-G.mapH)/2;
    G.redScore=0;G.blueScore=0;
    G.round=1;G.maxRounds=1;
    G.state='playing';
    G.projectiles=[];
    G.effects=[];
    G.towers=[];G.guardians=[];G.tenshukaku=[];G.fallenGenerals=[];G.disk=null;
    G.resurrect={red:0,blue:0};
    G.winner=null;
    G.running=true;
    G.remainingTime=180;
    G.timerActive=true;

    const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
    G.players=[];
    const wps=['katana','bow','spear','dual','katana','bow','spear',
               'spear','bow','katana','dual','spear','bow','katana'];
    if(wp1) wps[0]=wp1;
    for(let i=0;i<7;i++){
      const p=new Character(ox+60+i*15,oy+60+i*50,'red',wps[i],i===0,'红·'+(i+1));
      G.players.push(p);
    }
    const isDual=playerMode==='dual';
    for(let i=0;i<7;i++){
      const p=new Character(ox+mw-60-i*15,oy+60+i*50,'blue',wps[7+i],isDual&&i===0,'蓝·'+(i+1));
      G.players.push(p);
    }
    G.allies=G.players.filter(p=>p.team==='red');
    G.enemies=G.players.filter(p=>p.team==='blue');
    G.p1=G.players[0];
    G.p2=playerMode==='dual'?G.players[7]:null;
  },
  update(){
    if(!G.running) return;
    if(G.timerActive){
      G.remainingTime-=1/60;
      if(G.remainingTime<=0){
        G.remainingTime=0;
        G.timerActive=false;
        // Determine winner by kills
        const rKills=G.players.filter(p=>p.team==='red').reduce((s,p)=>s+p.kills,0);
        const bKills=G.players.filter(p=>p.team==='blue').reduce((s,p)=>s+p.kills,0);
        endGame(rKills>bKills?'red':bKills>rKills?'blue':null);
        return;
      }
    }
    updateAI();
    updateProjectiles();
    updateEffects();
  },
  render(ctx){
    renderMap(ctx);
    renderCharacters(ctx,G.players);
    renderProjectiles(ctx);
    renderEffects(ctx);
  }
};

// ===== CORE GAME LOGIC =====
function updateProjectiles(){
  for(const p of G.projectiles){
    p.update();
    if(!p.alive) continue;
    // Check collision with characters
    for(const c of G.players){
      if(!c.alive||c.team===p.team) continue;
      if(dist(p,c)<p.radius+c.radius){
        c.takeDamage(p.damage,p.attacker);
        if(p.knockback>0){
          const ang=Math.atan2(p.vy,p.vx);
          c.x=clamp(c.x+Math.cos(ang)*p.knockback*0.5,G.offsetX+c.radius,G.offsetX+G.mapW-c.radius);
          c.y=clamp(c.y+Math.sin(ang)*p.knockback*0.5,G.offsetY+c.radius,G.offsetY+G.mapH-c.radius);
          c.stunTimer=10;
        }
        if(!p.pierce){p.alive=false;break;}
      }
    }
    // Check collision with guardians
    for(const g of (G.guardians||[])){
      if(!g.alive) continue;
      if(dist(p,g)<p.radius+g.radius){
        g.hp-=p.damage*0.6;
        if(g.hp<=0){g.alive=false;g.hp=0;
          showNotification((g.tower.pos==='north'?'北':'南')+'侧镇门牛鬼被击败！',50);
        }
        if(!p.pierce){p.alive=false;break;}
      }
    }
    // Check collision with disk (even when attached)
    if(G.disk&&p.knockback>0&&dist(p,G.disk)<p.radius+G.disk.radius){
      const ang=Math.atan2(p.vy,p.vx);
      G.disk.vx+=Math.cos(ang)*p.knockback*0.15;
      G.disk.vy+=Math.sin(ang)*p.knockback*0.15;
      const spd=Math.hypot(G.disk.vx,G.disk.vy);
      if(spd>15){G.disk.vx*=15/spd;G.disk.vy*=15/spd;}
      G.disk.attached=false;
      p.alive=false;
    }
  }
  G.projectiles=G.projectiles.filter(p=>p.alive);
}

function updateEffects(){
  for(const e of G.effects){e.life--;e.y-=0.5;}
  G.effects=G.effects.filter(e=>e.life>0);
}

function updateAI(){
  // In single-player instant mode, AI controls the opponent
  const isSingleInstant = G.currentMode.short==='instant' && playerMode==='single';
  if(G.currentMode.short==='instant' && !isSingleInstant) return;
  for(const c of G.players){
    if(c.isPlayer||!c.alive) continue;
    c.aiTimer--;
    const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
    if(enemies.length===0) continue;
    let target=enemies.reduce((a,b)=>dist(c,a)<dist(c,b)?a:b);

    // Disk priority (战国 mode)
    if(G.disk&&G.disk.alive&&G.currentMode.short==='warring'){
      const dToDisk=dist(c,G.disk);
      if(dToDisk<300){
        const ang=angle(c,G.disk);
        c.x+=Math.cos(ang)*c.speed*1.2;
        c.y+=Math.sin(ang)*c.speed*1.2;
        c.dir=Math.cos(ang)>0?1:-1;
        c.angle=ang;
        if(dToDisk<80&&c.skillCds[3]<=0){useAISkill(c,3);}
        else if(Math.random()<0.03&&dToDisk<120){useNormalAttack(c);}
        clampAI(c);
        continue;
      }
    }

    // Guardian priority (战国 mode - attack guardians near towers)
    let attackingGuardian=false;
    if(G.currentMode.short==='warring'){
      for(const g of G.guardians){
        if(!g.alive) continue;
        if(dist(c,g)<200){
          const ang=angle(c,g);
          c.x+=Math.cos(ang)*c.speed;
          c.y+=Math.sin(ang)*c.speed;
          clampAI(c);
          c.dir=Math.cos(ang)>0?1:-1;
          c.angle=ang;
          if(dist(c,g)<g.radius+c.radius+15&&Math.random()<0.08){
            const si=Math.floor(Math.random()*3);
            if(c.skillCds[si]<=0) useAISkill(c,si);
            else useNormalAttack(c);
          }
          attackingGuardian=true;
          break;
        }
      }
    }
    if(attackingGuardian){clampAI(c);continue;}

    // Normal combat AI
    if(target){
      const ang=angle(c,target);
      const d=dist(c,target);
      if(d>90){
        c.x+=Math.cos(ang)*c.speed;
        c.y+=Math.sin(ang)*c.speed;
      } else if(d<50&&Math.random()<0.03){
        c.x-=Math.cos(ang)*c.speed*0.8;
        c.y-=Math.sin(ang)*c.speed*0.8;
      }
      c.dir=Math.cos(ang)>0?1:-1;
      c.angle=ang;
      if(d<120&&Math.random()<0.035) useAISkill(c,Math.floor(Math.random()*4));
      if(d<55&&Math.random()<0.05) useNormalAttack(c);
    }
    clampAI(c);
  }
}

function clampAI(c){
  c.x=clamp(c.x,G.offsetX+c.radius,G.offsetX+G.mapW-c.radius);
  c.y=clamp(c.y,G.offsetY+c.radius,G.offsetY+G.mapH-c.radius);
}

function useAISkill(c,idx){
  if(!c.alive||c.stunTimer>0) return;
  const skill=c.weapon.skills[idx];
  if(c.skillCds[idx]>0) return;
  // Don't dash/dodge into walls
  if(skill.type==='dash'||skill.type==='dodge'){
    const dist=c.angle;
    const dx=Math.cos(dist), dy=Math.sin(dist);
    const nx=c.x+dx*skill.distance, ny=c.y+dy*skill.distance;
    const minX=G.offsetX+c.radius, maxX=G.offsetX+G.mapW-c.radius;
    const minY=G.offsetY+c.radius, maxY=G.offsetY+G.mapH-c.radius;
    if(nx<minX||nx>maxX||ny<minY||ny>maxY) return; // would hit wall
  }
  c.skillCds[idx]=skill.cooldown;
  activateSkill(c,idx);
}

function useNormalAttack(c){
  if(c.normalCd>0) return;
  c.normalCd=CFG.normalCooldown;
  const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
  for(const e of enemies){
    const d=dist(c,e);
    const angDiff=Math.abs(normalizeAngle(angle(c,e)-c.angle));
    if(d<CFG.normalRange+CFG.playerR&&angDiff<Math.PI/2.5){
      e.takeDamage(CFG.normalDamage,c);
      addEffect(e.x,e.y,'⚔️',15);
    }
  }
}

// ===== SKILL ACTIVATION =====
function activateSkill(c,idx){
  const skill=c.weapon.skills[idx];
  const ang=c.angle;
  const ox=Math.cos(ang), oy=Math.sin(ang);

  // Damage guardians with skills
  if(skill.type==='melee'||skill.type==='meleeAoe'||skill.type==='breakthrough'){
    for(const g of (G.guardians||[])){
      if(!g.alive) continue;
      const d=dist(c,g);
      if(d<skill.range+c.radius+(skill.type==='meleeAoe'?20:0)){
        g.hp-=skill.damage*0.5;
        addEffect(g.x,g.y,'💥',8);
        if(g.hp<=0){g.alive=false;g.hp=0;
          showNotification((g.tower.pos==='north'?'北':'南')+'侧镇门牛鬼被击败！',50);
        }
      }
    }
  }

  switch(skill.type){
    case 'melee':{
      const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
      for(const e of enemies){
        const d=dist(c,e);
        const aDiff=Math.abs(normalizeAngle(angle(c,e)-ang));
        if(d<skill.range+c.radius&&aDiff<(skill.angle||Math.PI/3)){
          e.takeDamage(skill.damage,c);
          addEffect(e.x,e.y,'💥',10);
        }
      }
      addEffect(c.x+ox*30,c.y+oy*30,skill.icon||'⚔️',12);
      break;
    }
    case 'meleeAoe':{
      const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
      for(const e of enemies){
        const d=dist(c,e);
        if(d<skill.range+c.radius){
          e.takeDamage(skill.damage,c);
          addEffect(e.x,e.y,'💥',10);
        }
      }
      addEffect(c.x,c.y,'🌀',15);
      break;
    }
    case 'projectile':{
      G.projectiles.push(new Projectile(c.x+ox*20,c.y+oy*20,ang,skill.speed,skill.damage,c.team,c.weapon,skill.pierce||false,skill.knockback||0,c));
      break;
    }
    case 'dash':{
      const nx=clamp(c.x+ox*skill.distance,G.offsetX+c.radius,G.offsetX+G.mapW-c.radius);
      const ny=clamp(c.y+oy*skill.distance,G.offsetY+c.radius,G.offsetY+G.mapH-c.radius);
      c.x=nx;c.y=ny;
      addEffect(c.x,c.y,'💨',15);
      // Damage enemies along dash
      const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
      for(const e of enemies){
        if(dist(c,e)<skill.range+c.radius+20){
          e.takeDamage(skill.damage||30,c);
        }
      }
      break;
    }
    case 'shield':{
      c.shieldActive=true;
      c.shieldTimer=skill.duration;
      addEffect(c.x,c.y,'🛡️',skill.duration/16);
      break;
    }
    case 'dodge':{
      const nx=clamp(c.x+ox*skill.distance,G.offsetX+c.radius,G.offsetX+G.mapW-c.radius);
      const ny=clamp(c.y+oy*skill.distance,G.offsetY+c.radius,G.offsetY+G.mapH-c.radius);
      c.x=nx;c.y=ny;
      addEffect(c.x,c.y,'💫',12);
      break;
    }
    case 'breakthrough':{
      if(skill.projectile){
        G.projectiles.push(new Projectile(c.x+ox*20,c.y+oy*20,ang,skill.speed||8,skill.damage||30,c.team,c.weapon,false,skill.knockback||250,c));
      } else {
        const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
        for(const e of enemies){
          const d=dist(c,e);
          const aDiff=Math.abs(normalizeAngle(angle(c,e)-ang));
          if(d<skill.range+c.radius&&aDiff<Math.PI/2.5){
            e.takeDamage(skill.damage,c);
            e.stunTimer=15;
            const kbAng=angle(c,e);
            e.x+=Math.cos(kbAng)*(skill.knockback||200)*0.4;
            e.y+=Math.sin(kbAng)*(skill.knockback||200)*0.4;
        e.x=clamp(e.x,G.offsetX+e.radius,G.offsetX+G.mapW-e.radius);
        e.y=clamp(e.y,G.offsetY+e.radius,G.offsetY+G.mapH-e.radius);
        addEffect(e.x,e.y,'💢',15);
      }
    }
    // Check disk hit (even when attached)
    if(G.disk&&dist(c,G.disk)<skill.range+c.radius+G.disk.radius){
      const aDiff=Math.abs(normalizeAngle(angle(c,G.disk)-ang));
      if(aDiff<Math.PI/2){
        G.disk.vx+=Math.cos(ang)*(skill.knockback||250)*0.12;
        G.disk.vy+=Math.sin(ang)*(skill.knockback||250)*0.12;
        G.disk.attached=false;
        addEffect(G.disk.x,G.disk.y,'💥',20);
      }
    }
    addEffect(c.x+ox*30,c.y+oy*30,skill.icon||'💥',12);
      }
      break;
    }
  }
}

function addEffect(x,y,text,life){
  G.effects.push({x,y,text,life,age:0});
}

// ===== INPUT =====
document.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
  keys[e.code]=true;
  if(e.code==='KeyF'||e.code==='Digit5') keys['bellPress']=false;
  if(!G||!G.running) return;
  handlePlayerInput(G.p1,{
    up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',
    skill:['KeyQ','KeyE','KeyR','KeyF'],attack:'Space'
  });
  if(G.p2&&G.p2.alive&&playerMode==='dual'){
    handlePlayerInput(G.p2,{
      up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',
      skill:['Digit7','Digit8','Digit9','Digit0'],attack:'Enter'
    });
  }
  // ESC to go back
  if(e.code==='Escape'&&G) {G._ending=true;endGame(null);}
});
document.addEventListener('keyup',e=>{keys[e.code]=false;if(e.code==='KeyF'||e.code==='Digit5')keys['bellPress']=true;});

function handlePlayerInput(c,ctrl){
  if(!c||!c.alive) return;
  let dx=0,dy=0;
  if(keys[ctrl.up]) dy=-1;
  if(keys[ctrl.down]) dy=1;
  if(keys[ctrl.left]) dx=-1;
  if(keys[ctrl.right]) dx=1;
  if(dx||dy){
    const len=Math.hypot(dx,dy);
    c.x+=dx/len*c.speed;
    c.y+=dy/len*c.speed;
    c.angle=Math.atan2(dy,dx);
    c.dir=dx>0?1:-1;
  }
  // Wall clamp
  c.x=clamp(c.x,G.offsetX+c.radius,G.offsetX+G.mapW-c.radius);
  c.y=clamp(c.y,G.offsetY+c.radius,G.offsetY+G.mapH-c.radius);
  // Skills
  for(let i=0;i<4;i++){
    if(keys[ctrl.skill[i]]&&c.skillCds[i]<=0&&c.stunTimer<=0){
      const skill=c.weapon.skills[i];
      // Block dash/dodge into walls
      if(skill.type==='dash'||skill.type==='dodge'){
        const dx=Math.cos(c.angle), dy=Math.sin(c.angle);
        const nx=c.x+dx*skill.distance, ny=c.y+dy*skill.distance;
        const minX=G.offsetX+c.radius, maxX=G.offsetX+G.mapW-c.radius;
        const minY=G.offsetY+c.radius, maxY=G.offsetY+G.mapH-c.radius;
        if(nx<minX||nx>maxX||ny<minY||ny>maxY){keys[ctrl.skill[i]]=false;continue;}
      }
      c.skillCds[i]=skill.cooldown;
      activateSkill(c,i);
      keys[ctrl.skill[i]]=false;
    }
  }
  // Normal attack
  if(keys[ctrl.attack]&&c.normalCd<=0&&c.stunTimer<=0){
    c.normalCd=CFG.normalCooldown;
    const enemies=G.players.filter(p=>p.team!==c.team&&p.alive);
    for(const e of enemies){
      const d=dist(c,e);
      const angDiff=Math.abs(normalizeAngle(angle(c,e)-c.angle));
      if(d<CFG.normalRange+CFG.playerR&&angDiff<Math.PI/2.5){
        e.takeDamage(CFG.normalDamage,c);
        addEffect(e.x,e.y,'⚔️',12);
      }
    }
    keys[ctrl.attack]=false;
  }
}

function normalizeAngle(a){
  while(a>Math.PI)a-=Math.PI*2;
  while(a<-Math.PI)a+=Math.PI*2;
  return a;
}

// ===== RENDERING =====
function renderMap(ctx){
  const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
  ctx.fillStyle='#1a2a1a';
  ctx.fillRect(ox,oy,mw,mh);
  // Grid
  ctx.strokeStyle='rgba(60,100,60,0.2)';
  ctx.lineWidth=1;
  for(let x=ox;x<ox+mw;x+=40){ctx.beginPath();ctx.moveTo(x,oy);ctx.lineTo(x,oy+mh);ctx.stroke();}
  for(let y=oy;y<oy+mh;y+=40){ctx.beginPath();ctx.moveTo(ox,y);ctx.lineTo(ox+mw,y);ctx.stroke();}
  // Border
  ctx.strokeStyle='rgba(240,200,72,0.3)';
  ctx.lineWidth=2;
  ctx.strokeRect(ox,oy,mw,mh);
}

function renderMapWarring(ctx){
  renderMap(ctx);
  const ox=G.offsetX, oy=G.offsetY, mw=G.mapW, mh=G.mapH;
  // Dividing line
  ctx.strokeStyle='rgba(200,180,140,0.15)';
  ctx.lineWidth=2;
  ctx.setLineDash([8,8]);
  ctx.beginPath();ctx.moveTo(ox+mw/2,oy);ctx.lineTo(ox+mw/2,oy+mh);ctx.stroke();
  ctx.setLineDash([]);
  // Team zones
  ctx.fillStyle='rgba(232,69,74,0.04)';ctx.fillRect(ox,oy,mw/2-20,mh);
  ctx.fillStyle='rgba(68,153,238,0.04)';ctx.fillRect(ox+mw/2+20,oy,mw/2-20,mh);

  // Tenshukaku
  for(const t of G.tenshukaku){
    const isRed=t.team==='red';
    ctx.fillStyle=isRed?'#cc3344':'#3388cc';
    ctx.shadowColor=isRed?'rgba(200,50,60,0.4)':'rgba(50,130,200,0.4)';
    ctx.shadowBlur=20;
    // Draw tiered building
    for(let i=3;i>=0;i--){
      const w=50-i*8,h=14+i*4;
      ctx.fillRect(t.x-w/2,t.y-h/2-8*i,w,h);
    }
    ctx.fillStyle='#f0c848';
    ctx.font='14px sans-serif';ctx.textAlign='center';
    ctx.fillText('🏯',t.x,t.y+4);
    ctx.shadowBlur=0;
  }

  // Towers
  for(const t of G.towers){
    const captured=t.team!==null;
    ctx.fillStyle=captured?(t.team==='red'?'#cc4455':'#4488dd'):'#555566';
    ctx.shadowBlur=captured?15:0;
    ctx.shadowColor=captured?'rgba(240,200,72,0.3)':'transparent';
    // Tower base
    ctx.fillRect(t.x-18,t.y-18,36,36);
    ctx.fillStyle='#887744';
    ctx.fillRect(t.x-12,t.y-8,24,6);
    // Bell
    ctx.fillStyle='#f0c848';
    ctx.beginPath();ctx.arc(t.x,t.y-8,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ccaa33';
    ctx.font='10px sans-serif';ctx.textAlign='center';
    ctx.fillText('🔔',t.x-2,t.y-4);
    ctx.shadowBlur=0;
    // Label
    ctx.fillStyle=captured?'#f0c848':'#8899aa';
    ctx.font='10px sans-serif';ctx.textAlign='center';
    ctx.fillText(t.pos==='north'?'北箭塔':'南箭塔',t.x,t.y+30);
    // Ring bell hint
    if(!t.bellRung&&!t.guardian.alive){
      ctx.fillStyle='rgba(240,200,72,0.7)';
      ctx.font='9px sans-serif';
      ctx.fillText('[F] 敲钟占领',t.x,t.y+44);
    }
  }

  // Guardians
  for(const g of G.guardians){
    if(!g.alive) continue;
    const hpPct=g.hp/g.maxHp;
    ctx.fillStyle='#663333';
    ctx.shadowColor='rgba(200,50,50,0.3)';
    ctx.shadowBlur=15;
    ctx.beginPath();ctx.arc(g.x,g.y,g.radius,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#aa4444';
    ctx.font='18px sans-serif';ctx.textAlign='center';
    ctx.fillText('👹',g.x-2,g.y+6);
    // HP bar
    const bw=32,bh=4;
    ctx.fillStyle='#333';ctx.fillRect(g.x-bw/2,g.y-g.radius-8,bw,bh);
    ctx.fillStyle=hpPct>0.3?'#cc4444':'#ff6644';
    ctx.fillRect(g.x-bw/2,g.y-g.radius-8,bw*hpPct,bh);
  }

  // Fallen Generals
  for(const fg of G.fallenGenerals){
    if(!fg.alive) continue;
    ctx.fillStyle='#663366';
    ctx.shadowColor='rgba(200,50,200,0.4)';
    ctx.shadowBlur=20;
    ctx.beginPath();ctx.arc(fg.x,fg.y,fg.radius,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='#cc66cc';
    ctx.font='16px sans-serif';ctx.textAlign='center';
    ctx.fillText('👺',fg.x-2,fg.y+5);
    // Disk
    if(fg.disk&&fg.disk.alive){
      ctx.fillStyle=fg.disk.attached?'#f0c848':'#ff8844';
      ctx.shadowColor='rgba(240,200,72,0.5)';
      ctx.shadowBlur=fg.disk.attached?10:20;
      ctx.beginPath();ctx.arc(fg.disk.x,fg.disk.y,fg.disk.radius,0,Math.PI*2);ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#332200';
      ctx.font='10px sans-serif';ctx.textAlign='center';
      ctx.fillText('◉',fg.disk.x,fg.disk.y+3);
      ctx.fillStyle='#f0c848';
      ctx.font='8px sans-serif';
      ctx.fillText('圆盘',fg.disk.x,fg.disk.y+fg.disk.radius+10);
    }
  }
}

function renderCharacters(ctx,chars){
  for(const c of chars){
    if(!c.alive) continue;
    const isRed=c.team==='red';
    ctx.save();
    ctx.translate(c.x,c.y);

    // Flash when hit
    if(c.flashTimer>0){
      ctx.globalAlpha=0.7;
    }

    // Shield effect
    if(c.shieldActive){
      ctx.strokeStyle='rgba(240,200,72,0.5)';
      ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,c.radius+6,0,Math.PI*2);ctx.stroke();
    }

    // Body
    const grad=ctx.createRadialGradient(-4,-4,2,0,0,c.radius);
    grad.addColorStop(0,isRed?'#ff6666':'#66aaff');
    grad.addColorStop(1,isRed?'#cc2233':'#2277cc');
    ctx.fillStyle=grad;
    ctx.shadowColor=isRed?'rgba(200,50,50,0.3)':'rgba(50,130,200,0.3)';
    ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(0,0,c.radius,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;

    // Direction indicator
    ctx.strokeStyle='#ffffff';
    ctx.lineWidth=2;
    const dx=Math.cos(c.angle)*c.radius*1.2;
    const dy=Math.sin(c.angle)*c.radius*1.2;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(dx,dy);ctx.stroke();

    // Stun indicator
    if(c.stunTimer>0){
      ctx.fillStyle='rgba(255,200,50,0.5)';
      ctx.font='12px sans-serif';ctx.textAlign='center';
      ctx.fillText('💫',0,-c.radius-12);
    }

    ctx.restore();

    // HP bar
    const bw=32,bh=4;
    const hpPct=c.hp/c.maxHp;
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.fillRect(c.x-bw/2-1,c.y-c.radius-10-1,bw+2,bh+2);
    ctx.fillStyle=hpPct>0.5?'#44cc44':hpPct>0.25?'#ccaa33':'#cc4444';
    ctx.fillRect(c.x-bw/2,c.y-c.radius-10,bw*hpPct,bh);
    // Name
    ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.font='9px sans-serif';ctx.textAlign='center';
    ctx.fillText(c.name,c.x,c.y-c.radius-13);

    // Player indicator
    if(c.isPlayer){
      ctx.fillStyle='#f0c848';
      ctx.font='8px sans-serif';ctx.textAlign='center';
      ctx.fillText('▼',c.x,c.y-c.radius-18);
    }
  }
}

function renderProjectiles(ctx){
  for(const p of G.projectiles){
    if(!p.alive) continue;
    // Trail
    for(let i=0;i<p.trail.length;i++){
      const alpha=i/p.trail.length*0.4;
      ctx.fillStyle=`rgba(255,220,100,${alpha})`;
      ctx.beginPath();ctx.arc(p.trail[i].x,p.trail[i].y,p.radius*(i/p.trail.length),0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#ffdd66';
    ctx.shadowColor='rgba(255,200,50,0.5)';
    ctx.shadowBlur=10;
    ctx.beginPath();ctx.arc(p.x,p.y,p.radius,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;
  }
}

function renderEffects(ctx){
  for(const e of G.effects){
    const alpha=Math.min(1,e.life/20);
    ctx.globalAlpha=alpha;
    ctx.font='20px sans-serif';ctx.textAlign='center';
    ctx.fillText(e.text,e.x,e.y);
  }
  ctx.globalAlpha=1;
}

// ===== HUD UPDATE =====
function updateHUD(){
  if(!G) return;
  const hud=document.getElementById('hud');
  if(!G.running||G.state==='ended'){hud.classList.remove('show');return;}
  hud.classList.add('show');

  // Round
  document.getElementById('hudRound').textContent=G.maxRounds>1?'第 '+G.round+' 局':'— 合战 —';

  // Timer (竹取)
  const timerEl=document.getElementById('hudTimer');
  if(G.remainingTime!==undefined){
    const m=Math.floor(G.remainingTime/60);
    const s=Math.floor(G.remainingTime%60);
    timerEl.textContent=m+':'+(s<10?'0':'')+s;
  } else if(G.resurrect){
    timerEl.textContent='';
  } else{
    timerEl.textContent='';
  }

  // Score
  document.getElementById('hudScore').textContent=G.redScore+' - '+G.blueScore;

  // Team info
  const rAlive=G.players.filter(p=>p.team==='red'&&p.alive).length;
  const bAlive=G.players.filter(p=>p.team==='blue'&&p.alive).length;
  const rTotal=G.players.filter(p=>p.team==='red').length;
  const bTotal=G.players.filter(p=>p.team==='blue').length;
  document.getElementById('hudRedInfo').textContent='🔴 红方 '+rAlive+'/'+rTotal;
  document.getElementById('hudBlueInfo').textContent='🔵 蓝方 '+bAlive+'/'+bTotal;

  // Player mode indicator + Resurrection
  const resEl=document.getElementById('hudResurrect');
  const modeLabel=playerMode==='dual'?'👥双人':'🧑单人';
  if(G.resurrect){
    resEl.textContent=modeLabel+' | 复活  🔴'+G.resurrect.red+'  🔵'+G.resurrect.blue;
  } else {
    resEl.textContent=modeLabel;
  }

  // HP bar
  const player=G.p1;
  if(player&&player.alive){
    const pct=player.hp/player.maxHp*100;
    document.getElementById('hpFill').style.width=pct+'%';
    document.getElementById('hpFill').className='hp-fill '+(player.team==='red'?'p1':'p2');
    document.getElementById('hpText').textContent=Math.ceil(player.hp)+' / '+player.maxHp;
  }

  // Skill bar
  updateSkillBar(player);
}

function updateSkillBar(player){
  const bar=document.getElementById('skillBar');
  if(!player) return;
  let html='';
  const keys=['Q','E','R','F'];
  for(let i=0;i<4;i++){
    const skill=player.weapon.skills[i];
    const cd=player.skillCds[i];
    const maxCd=skill.cooldown;
    const pct=cd>0?(cd/maxCd*100)+'%':'0%';
    const cdText=cd>0?((cd/1000)>1?Math.ceil(cd/1000)+'s':(cd/1000).toFixed(1)+'s'):'';
    html+='<div class="skill-slot'+(cd>0?' on-cooldown':'')+'" style="--cd-pct:'+pct+'">'+
      '<span class="skey">'+keys[i]+'</span>'+
      '<span class="sicon">'+skill.icon+'</span>'+
      '<span class="sname">'+skill.name+'</span>'+
      (cdText?'<span class="scd">'+cdText+'</span>':'')+
    '</div>';
  }
  bar.innerHTML=html;
}

function showNotification(text,duration){
  const el=document.getElementById('notification');
  el.textContent=text;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),duration||40);
}

// ===== COLLISION =====
function resolveCharacterCollisions(){
  const players=G.players;
  for(let i=0;i<players.length;i++){
    for(let j=i+1;j<players.length;j++){
      const a=players[i],b=players[j];
      if(!a.alive||!b.alive) continue;
      const d=dist(a,b);
      const minDist=a.radius+b.radius;
      if(d<minDist&&d>0.01){
        const overlap=minDist-d;
        const ang=Math.atan2(b.y-a.y,b.x-a.x);
        const push=overlap*0.5;
        a.x-=Math.cos(ang)*push;
        a.y-=Math.sin(ang)*push;
        b.x+=Math.cos(ang)*push;
        b.y+=Math.sin(ang)*push;
        a.x=clamp(a.x,G.offsetX+a.radius,G.offsetX+G.mapW-a.radius);
        a.y=clamp(a.y,G.offsetY+a.radius,G.offsetY+G.mapH-a.radius);
        b.x=clamp(b.x,G.offsetX+b.radius,G.offsetX+G.mapW-b.radius);
        b.y=clamp(b.y,G.offsetY+b.radius,G.offsetY+G.mapH-b.radius);
      }
    }
  }
}

// ===== GAME LOOP =====
let gameLoopId=null;
let lastTime=0;

function gameLoop(timestamp){
  const dt=timestamp-lastTime;
  lastTime=timestamp;
  if(!G||!G.running){renderFrame();gameLoopId=requestAnimationFrame(gameLoop);return;}

  // Update cooldowns and shields
  for(const p of G.players){
    if(!p.alive) continue;
    for(let i=0;i<4;i++){if(p.skillCds[i]>0)p.skillCds[i]-=dt;}
    if(p.normalCd>0)p.normalCd-=dt;
    if(p.shieldActive){p.shieldTimer-=dt;if(p.shieldTimer<=0)p.shieldActive=false;}
    if(p.stunTimer>0)p.stunTimer--;
    if(p.flashTimer>0)p.flashTimer--;
  }

  // Update mode
  if(G.currentMode.update) G.currentMode.update();

  // Resolve character collisions + universal bounds safety
  resolveCharacterCollisions();
  for(const p of G.players){
    if(!p.alive) continue;
    p.x=clamp(p.x,G.offsetX+p.radius,G.offsetX+G.mapW-p.radius);
    p.y=clamp(p.y,G.offsetY+p.radius,G.offsetY+G.mapH-p.radius);
  }

  updateHUD();
  renderFrame();

  gameLoopId=requestAnimationFrame(gameLoop);
}

function renderFrame(){
  ctx.clearRect(0,0,CFG.canvasW,CFG.canvasH);
  // Background
  const bgGrad=ctx.createRadialGradient(530,360,100,530,360,600);
  bgGrad.addColorStop(0,'#141e2a');
  bgGrad.addColorStop(1,'#080c18');
  ctx.fillStyle=bgGrad;
  ctx.fillRect(0,0,CFG.canvasW,CFG.canvasH);

  if(!G) return;
  if(G.currentMode.render) G.currentMode.render(ctx);
}

// ===== MENU FUNCTIONS =====
function showTitle(){
  hideAllPanels();
  document.getElementById('titlePanel').classList.add('active');
  document.getElementById('hud').classList.remove('show');
  if(gameLoopId){cancelAnimationFrame(gameLoopId);gameLoopId=null;}
  G=null;
  gameLoopId=requestAnimationFrame(gameLoop);
}

function showPlayerMode(){
  hideAllPanels();
  document.getElementById('playerModePanel').classList.add('active');
}

function selectPlayerMode(pm){
  playerMode=pm;
  showModeSelect();
}

function showModeSelect(){
  hideAllPanels();
  document.getElementById('modePanel').classList.add('active');
}

function selectMode(mode){
  modeSelected=mode;
  wpSelectStage=0;
  wp1=null;wp2=null;
  const title=document.getElementById('wpTitle');
  const sub=document.getElementById('wpSub');
  const grid=document.getElementById('weaponGrid');
  const confirm=document.getElementById('wpConfirm');
  const isDual=playerMode==='dual';

  if(isDual){
    title.textContent='— P1 选择武器 —';
    sub.textContent=(mode==='instant'?'瞬杀':mode==='warring'?'战国':'竹取')+'模式 · 玩家一选武器';
    buildWeaponGrid(grid,(wp)=>{
      wp1=wp;wpSelectStage=1;
      title.textContent='— P2 选择武器 —';
      sub.textContent=(mode==='instant'?'瞬杀':mode==='warring'?'战国':'竹取')+'模式 · 玩家二选武器';
      buildWeaponGrid(grid,(wp2Sel)=>{wp2=wp2Sel;confirm.style.display='block';});
    });
  } else {
    title.textContent='— 选择武器 —';
    sub.textContent=(mode==='instant'?'瞬杀':mode==='warring'?'战国':'竹取')+'模式 · 选择你的武器';
    buildWeaponGrid(grid,(wp)=>{wp1=wp;confirm.style.display='block';});
  }

  confirm.style.display='none';
  hideAllPanels();
  document.getElementById('weaponPanel').classList.add('active');
}

function buildWeaponGrid(grid,onSelect){
  grid.innerHTML='';
  for(const [id,w] of Object.entries(WEAPONS)){
    const card=document.createElement('div');
    card.className='weapon-card';
    card.innerHTML='<div class="w-icon">'+w.icon+'</div><div class="w-name">'+w.name+'</div><div class="w-desc" style="font-size:0.7rem;color:var(--dim);margin:2px 0 4px">'+w.desc+'</div><div class="w-skills">'+w.skills.map(s=>s.icon+' '+s.name).join('<br>')+'</div>';
    card.onclick=()=>{
      grid.querySelectorAll('.weapon-card').forEach(c=>c.classList.remove('selected'));
      card.classList.add('selected');
      onSelect(id);
    };
    grid.appendChild(card);
  }
}

function confirmWeapon(){
  const isDual=playerMode==='dual';
  // Dual mode needs both weapons; single mode needs only P1's
  if(isDual&&(!wp1||!wp2)) return;
  if(!isDual&&!wp1) return;
  startGame();
}

function startGame(){
  hideAllPanels();
  document.getElementById('hud').classList.add('show');
  const mode=modeSelected;
  G={
    currentMode:null,
    players:[],projectiles:[],effects:[],
    p1:null,p2:null,allies:[],enemies:[],
    redScore:0,blueScore:0,round:1,maxRounds:1,
    state:'playing',winner:null,running:true,_ending:false,
    offsetX:0,offsetY:0,mapW:800,mapH:500,
    towers:[],guardians:[],tenshukaku:[],fallenGenerals:[],
    disk:null,resurrect:null,remainingTime:undefined,
    timerActive:false,roundActive:true,roundWinner:null,
    roundResurrectUsed:{red:false,blue:false}
  };

  switch(mode){
    case 'instant':G.currentMode=MODES.instant;break;
    case 'warring':G.currentMode=MODES.warring;break;
    case 'bamboo':G.currentMode=MODES.bamboo;break;
  }
  G.currentMode.setup();
  if(gameLoopId){cancelAnimationFrame(gameLoopId);}
  lastTime=performance.now();
  gameLoopId=requestAnimationFrame(gameLoop);
}

function endGame(winner){
  if(!G||!G.running||G.state==='ended') return;
  G.running=false;
  G.state='ended';
  const panel=document.getElementById('resultPanel');
  const title=document.getElementById('resultTitle');
  const score=document.getElementById('resultScore');
  const stats=document.getElementById('resultStats');

  hideAllPanels();
  if(winner==='red'){
    title.textContent='🔴 红方胜利！';
    title.className='result-title red';
    score.textContent=G.redScore+' - '+G.blueScore;
  } else if(winner==='blue'){
    title.textContent='🔵 蓝方胜利！';
    title.className='result-title blue';
    score.textContent=G.redScore+' - '+G.blueScore;
  } else {
    title.textContent='— 平局 —';
    title.className='result-title draw';
    score.textContent=G.redScore+' - '+G.blueScore;
  }
  const rKills=G.players.filter(p=>p.team==='red').reduce((s,p)=>s+p.kills,0);
  const bKills=G.players.filter(p=>p.team==='blue').reduce((s,p)=>s+p.kills,0);
  stats.innerHTML='击杀数  🔴'+rKills+'  🔵'+bKills+'<br>'+G.currentMode.name+'模式';
  document.getElementById('hud').classList.remove('show');
  panel.classList.add('active');
}

function restartGame(){
  if(G&&G.currentMode){
    const mode=modeSelected;
    startGame();
  } else {
    showTitle();
  }
}

function hideAllPanels(){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
}

// ===== INIT =====
canvas=document.getElementById('gameCanvas');
ctx=canvas.getContext('2d');
gameLoopId=requestAnimationFrame(gameLoop);