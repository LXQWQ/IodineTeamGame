(() => {
'use strict';
const $=id=>document.getElementById(id),C=$('game'),X=C.getContext('2d'),W=C.width,ground=510;
let H=C.height;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const colors={H:'#dce9d7',O:'#8ccbc8',Na:'#c2c7b1',Cl:'#bdcc79',C:'#8b9990',Fe:'#b68b71'};
let game=null,raf=0,picked='H',mode='normal',sound=false,audio=null,accumulator=0,lastTime=0,lobbyFrame=0,lastHud=0;
const key={},sources=new Map(),buffer={},STEP=1000/60;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const fighters={
H:{name:'氢',sym:'H',type:'速攻',max:900,speed:6.5,jump:16,atk:32,reductant:true,desc:'H₂ 轻快突进，靠近后引发燃爆。',s1:['扩散突袭',20,'氢气低摩尔质量与快速扩散启发的位移技；轨迹为示意，真实氢气无色。'],s2:['爆鸣冲击',34,'H₂ 与空气/氧气混合后点燃可发生爆鸣；必须存在氧化性气氛。'],ult:['氢氧燃爆',80,'2H₂ + O₂ → 2H₂O；点火触发放热反应。近距离爆发也会损伤自身。']},
O:{name:'氧',sym:'O',type:'压制',max:1050,speed:5.2,jump:14.5,atk:34,oxidizer:true,desc:'支持燃烧，本身不可燃；擅长持续氧化。',s1:['助燃领域',26,'提高周围燃烧反应速率与剧烈程度；O₂ 本身不作为“燃料”。'],s2:['氧化侵蚀',34,'对易氧化金属/还原性角色施加强氧化压力。'],ult:['臭氧重铸',78,'放电可使 O₂ 转化为 O₃；臭氧氧化性很强。']},
Na:{name:'钠',sym:'Na',type:'爆发',max:820,speed:5.8,jump:15,atk:38,metal:true,reductant:true,alkali:true,desc:'碱金属；遇水剧烈反应，爆发高、防御低。',s1:['碎钠抛射',18,'小块钠可增大与环境接触面积；命中后附着短时间。'],s2:['遇水燃爆',30,'2Na + 2H₂O → 2NaOH + H₂↑，强烈放热；有水才发动。'],ult:['焰色闪光',70,'Na 原子受激后发出约589 nm黄色光；仅造成游戏视觉干扰，不把光当成爆炸。']},
Cl:{name:'氯',sym:'Cl',type:'控制',max:930,speed:4.9,jump:14,atk:31,oxidizer:true,gas:true,desc:'黄绿色气体；强氧化、远程腐蚀与区域控制。',s1:['氯气瘴域',24,'Cl₂ 为有毒黄绿色气体；密闭空间更易积累。'],s2:['次氯漂白',36,'消耗携带水样：Cl₂ + H₂O ⇌ HCl + HClO。氧化作用不等于能移除任意钝化膜。'],ult:['银氯沉降',72,'携带的Ag⁺与Cl⁻试剂溶液反应生成AgCl沉淀；陷阱减速属于游戏抽象。']},
C:{name:'碳',sym:'C',type:'变换',max:1100,speed:5,jump:14,atk:33,reductant:true,desc:'同素异形体切换；根据氧供改变燃烧路径。',s1:['金刚石护甲',24,'使用金刚石材料护甲增强物理防御；高硬度不等于抗一切化学侵蚀。'],s2:['石墨滑移',24,'石墨层间作用较弱，层间较易滑动。'],ult:['燃烧分岔',74,'氧充足偏向 CO₂；氧不足时 CO 生成比例上升。']},
Fe:{name:'铁',sym:'Fe',type:'重装',max:1320,speed:4.2,jump:12.7,atk:40,metal:true,reductant:true,desc:'高稳定重装；可钝化，并在 Fe²⁺/Fe³⁺ 红氧体系间切换。',s1:['钝化护盾',28,'消耗冷浓硝酸试剂形成钝化膜；高温场景不能启用这一条件。'],s2:['二价三价转化',30,'Fe²⁺/Fe³⁺ 可通过氧化还原相互转化；游戏中切换恢复/进攻模式。'],ult:['铁氧熔蚀',76,'铁在氧气中燃烧的经典产物主要按 Fe₃O₄ 表示：3Fe + 2O₂ → Fe₃O₄。']}};
const stages={lab:{name:'普通实验室',note:'中央水槽可破裂形成水体；Na 接触后会发生剧烈反应。'},hot:{name:'高温坩埚台',note:'高温提高多类反应速率；燃烧/氧化类攻击增强。'},sealed:{name:'密闭反应舱',note:'气体不易逸散，H₂ / Cl₂ / O₃ 等区域效果持续更久。'},cold:{name:'低温液氮舱',note:'降温使许多反应动力学变慢：移动、冷却与活化能积累受抑。'}};

const meta={
 H:{formula:'H₂',role:'轻量 / 突进',tip:'先突进，再爆鸣。终式需贴近，并承担反冲。',basic:'轻量连击'},
 O:{formula:'O₂',role:'气态 / 压制',tip:'在助燃区内压制距离，用氧化飞弹积累优势。',basic:'分子冲击'},
 Na:{formula:'Na',role:'金属 / 爆发',tip:'普攻击破中央水槽。站进水区，再发动燃爆。',basic:'钠块撞击'},
 Cl:{formula:'Cl₂',role:'气态 / 控场',tip:'用气体封路。水样与银盐试剂有使用次数。',basic:'氯气飞弹'},
 C:{formula:'C',role:'材料 / 变换',tip:'护甲抗物理，滑移换位置。密闭低氧改变终式。',basic:'碳粒冲击'},
 Fe:{formula:'Fe',role:'金属 / 重装',tip:'重拳范围更大、收招更慢。先防御，再反击。',basic:'铁锻重击'}
};
const stageMeta={lab:['H₂O','水槽 / 空气','普攻击破水槽后形成水区'],hot:['Δ','高温 / 空气','燃烧更强，冷浓硝酸钝化不可用'],sealed:['O₂↓','密闭 / 低氧','气体滞留，碳燃烧偏向CO路径'],cold:['T↓','低温 / 空气','冷却加长，氧化伤害降低']};
function mk(id,x,face,isAI=false){const d=fighters[id];return {id,...d,x,y:ground-142,w:68,h:142,vx:0,vy:0,face,stable:d.max,energy:mode==='training'?100:30,isAI,cd:[0,0,0,0],maxcd:[1,1,1,1],statuses:[],guard:false,diamond:0,graphite:0,fe3:false,inv:0,flash:0,passiveShield:0,field:0,stun:0,kb:0,dash:0,attack:null,combo:0,lastHit:-999,think:20,move:0,guardTime:0,waterCD:0,reagents:{water:2,silver:1,acid:2,redox:4}}}
function rng(){let x=game.seed|0;x^=x<<13;x^=x>>>17;x^=x<<5;game.seed=x;return (x>>>0)/4294967296}
function addS(f,type,dur,pow=1){let z=f.statuses.find(s=>s.type===type);if(z){z.dur=Math.max(z.dur,dur);z.pow=Math.max(z.pow,pow)}else f.statuses.push({type,dur,pow,t:0})}
function has(f,t){return f.statuses.some(s=>s.type===t&&s.dur>0)}
function sLabel(t){return {corrosion:'腐蚀',oxidation:'氧化',precip:'沉淀减速',blind:'视线干扰',poison:'气氛干扰',passive:'钝化'}[t]||t}
function say(title,txt='',ms=2000){$('fact').replaceChildren();const b=document.createElement('b');b.textContent=title;$('fact').append(b);if(txt){const detail=document.createElement('span');detail.className='fact-detail';detail.textContent=' · '+txt;$('fact').append(detail)}$('fact').style.opacity=1;clearTimeout(say.t);say.t=setTimeout(()=>$('fact').style.opacity=0,ms);if(game&&txt)log(title+'：'+txt)}
function log(s){if(!game)return;game.log.unshift(s);game.log=game.log.slice(0,60)}
function tone(kind){if(!sound||!audio)return;try{const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;const f={hit:135,block:380,skill:520,start:660,ko:95}[kind]||180;o.type=kind==='hit'?'triangle':'sine';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*.45,now+.1);g.gain.setValueAtTime(.045,now);g.gain.exponentialRampToValueAtTime(.001,now+.15);o.connect(g);g.connect(audio.destination);o.start();o.stop(now+.16)}catch{}}
function particles(x,y,color,amount=9){for(let i=0;i<amount;i++){const angle=i/amount*Math.PI*2+game.frame*.13;game.fx.push({x,y,vx:Math.cos(angle)*(2+i%4),vy:Math.sin(angle)*(2+i%3)-1,life:20+i%7,max:27,color})}if(game.fx.length>160)game.fx.splice(0,game.fx.length-160)}
function damage(t,a,src,opt={}){
 if(game.over||t.inv>0)return 0;
 const toward=!src||Math.sign(src.x-t.x)===t.face;
 const blocked=t.guard&&toward;let m=blocked?.38:1;
 if(t.diamond&&!opt.chemical&&!opt.oxidation)m*=.62;
 if(t.passiveShield>0&&(opt.chemical||opt.corrosive||opt.oxidation)){
  t.passiveShield=0;t.statuses=t.statuses.filter(s=>s.type!=='passive');particles(t.x+t.w/2,t.y+65,'#e9c779',12);say('钝化膜吸收一次化学攻击');return 0;
 }
 if(has(t,'oxidation'))m*=1.12;
 if(opt.oxidation&&t.reductant)m*=1.18;
 if(opt.flame&&game.stage==='hot')m*=1.2;
 if(opt.oxidation&&game.stage==='cold')m*=.8;
 if(opt.flame&&game.zones.some(z=>z.kind==='oxygen'&&overlapF(t,z)))m*=1.5;
 const actual=Math.min(t.stable,a*m);t.stable=clamp(t.stable-actual,0,t.max);
 t.energy=clamp(t.energy+Math.min(8,a*.09),0,100);
 if(src)src.energy=clamp(src.energy+Math.min(10,a*.15),0,100);
 t.flash=7;
 if(!opt.dot){
  t.stun=Math.max(t.stun,blocked?3:opt.heavy?16:8);t.kb=(opt.knock||3)*(src?src.face:1)*(blocked?.3:1);
  if(opt.up&&!blocked)t.vy=-opt.up;
  game.hitstop=Math.max(game.hitstop,blocked?2:opt.heavy?5:3);
  game.shake=Math.max(game.shake,reducedMotion?0:opt.heavy?7:3);
  particles(t.x+t.w/2,t.y+50,blocked?'#b8c8a2':'#e9c779',blocked?5:12);
  game.numbers.push({x:t.x+t.w/2,y:t.y+10,text:blocked?'格挡 '+Math.round(actual):String(Math.round(actual)),life:42,color:blocked?'#b8c8a2':'#f2d990'});
  tone(blocked?'block':'hit');
  if(src&&!blocked){src.combo=game.frame-src.lastHit<90?src.combo+1:1;src.lastHit=game.frame;if(src===game.p){$('hitCallout').textContent=src.combo>1?src.combo+' HITS':'HIT';$('hitCallout').style.opacity=1;game.callout=45}}
 }
 return actual;
}
function hit(a,r,d,opt={}){
 const b=a===game.p?game.e:game.p,dx=(b.x+b.w/2)-(a.x+a.w/2);
 if(Math.abs(dx)<r&&Math.sign(dx||a.face)===a.face&&Math.abs(a.y-b.y)<110){damage(b,d,a,opt);return true}return false;
}
function proj(o,k,s,d,opt={}){game.projectiles.push({owner:o,kind:k,x:o.x+o.w/2+o.face*42,y:o.y+52,vx:o.face*s,life:140,r:opt.r||10,dmg:d,opt})}
function zone(o,k,x,y,w,h,dur,opt={}){game.zones.push({owner:o,kind:k,x,y,w,h,dur,max:dur,opt,t:18,struck:false})}
function overlapF(f,z){return f.x+f.w>z.x&&f.x<z.x+z.w&&f.y+f.h>z.y&&f.y<z.y+z.h}
function richOxygen(f){return game.stage!=='sealed'||game.zones.some(z=>z.kind==='oxygen'&&overlapF(f,z))||(f===game.p?game.e:game.p).id==='O'}
function condition(f,n){
 if(f.id==='Na'&&n===2&&!(game.stage==='lab'&&game.water>0&&f.x+f.w>410&&f.x<710&&f.y+f.h>ground-15))return '需进入水区';
 if(f.id==='Cl'&&n===2&&f.reagents.water<=0)return '水样已用完';
 if(f.id==='Cl'&&n===3&&f.reagents.silver<=0)return '银盐试剂已用完';
 if(f.id==='Fe'&&n===1&&(game.stage==='hot'||f.reagents.acid<=0))return game.stage==='hot'?'需低温试剂条件':'钝化试剂已用完';
 if(f.id==='Fe'&&n===2&&f.reagents.redox<=0)return '配套试剂已用完';
 return '';
}
function skill(f,n){
 if(game.over||f.cd[n]>0||f.stun>0||f.attack||f.guard)return false;
 if(n===0){
  const windup=f.id==='Fe'?11:f.id==='H'?5:7,duration=f.id==='Fe'?33:f.id==='H'?23:28;
  f.attack={age:0,windup,duration,used:false,n:0};f.cd[0]=duration;f.maxcd[0]=duration;return true;
 }
 const item=n===1?f.s1:n===2?f.s2:f.ult,cost=item[1],reason=condition(f,n);
 if(reason||f.energy<cost){if(f===game.p)say(reason||'驱动能量不足 · 需要 '+cost,reason?'反应条件未满足，不消耗能量。':'命中、受击与时间推移都能积累驱动能量。',1400);return true}
 f.energy-=cost;f.cd[n]=(n===3?400:n===2?150:110)*(game.stage==='cold'?1.3:1);f.maxcd[n]=f.cd[n];f.attack={age:0,windup:0,duration:n===3?30:19,used:true,n};
 const b=f===game.p?game.e:game.p,cx=f.x+f.w/2;
 say(f.sym+' · '+item[0],item[2],1700);tone('skill');
 switch(f.id){
 case 'H':
  if(n===1){f.dash=14;f.inv=16;zone(f,'hcloud',f.x-55,f.y-10,180,150,game.stage==='sealed'?180:110)}
  if(n===2){const x=f.face>0?cx+20:cx-210;zone(f,'blast',x,f.y-15,190,175,16,{dmg:95,flame:true,chemical:true,heavy:true});log('点火装置：2H₂ + O₂ → 2H₂O')}
  if(n===3){zone(f,'fusion',cx-185,f.y-30,370,195,25,{dmg:210,flame:true,chemical:true,heavy:true});damage(f,75,null,{chemical:true});log('氢氧燃烧，释放化学能；本招不涉及核聚变。')}
  break;
 case 'O':
  if(n===1){f.field=330;zone(f,'oxygen',cx-155,ground-220,310,220,330);log('区域氧供增加：区域内燃烧类攻击增强。')}
  if(n===2)proj(f,'oxygen',9,62,{oxidation:true,chemical:true,r:14});
  if(n===3){zone(f,'ozone',cx-230,ground-240,460,240,game.stage==='sealed'?400:280,{dmg:4.8,oxidation:true,chemical:true});log('放电装置供能：3O₂ → 2O₃。')}
  break;
 case 'Na':
  if(n===1)proj(f,'na',10,48,{chemical:true,r:12});
  if(n===2){zone(f,'nawater',cx-145,ground-180,290,180,23,{dmg:135,flame:true,chemical:true,heavy:true,corrosive:true});damage(f,35,null,{chemical:true});f.waterCD=210;log('2Na + 2H₂O → 2NaOH + H₂↑；放热，可能伴随燃烧。')}
  if(n===3){zone(f,'sodiumGlow',cx-300,ground-280,600,280,35,{blind:true});log('Na发射黄光：视觉干扰，不额外施加爆炸伤害。')}
  break;
 case 'Cl':
  if(n===1){zone(f,'chlorine',f.face>0?cx+20:cx-260,ground-195,240,195,game.stage==='sealed'?400:250,{dmg:2.8,corrosive:true,chemical:true})}
  if(n===2){f.reagents.water--;proj(f,'hclo',7,60,{oxidation:true,chemical:true,r:16});log('消耗水样：Cl₂ + H₂O ⇌ HCl + HClO。')}
  if(n===3){f.reagents.silver--;const target=clamp(b.x,cx-300,cx+300);zone(f,'agcl',target-45,ground-65,160,70,210,{precip:true});log('外加Ag⁺与Cl⁻水溶液：Ag⁺ + Cl⁻ → AgCl↓。')}
  break;
 case 'C':
  if(n===1){f.diamond=250;f.graphite=0;log('金刚石材料护甲：提升物理防御，不抵抗所有化学攻击。')}
  if(n===2){f.graphite=210;f.diamond=0;f.dash=13;f.inv=18;log('切换石墨材料模块；不是常温下瞬间改变同素异形体。')}
  if(n===3){const rich=richOxygen(f),x=f.face>0?cx+5:cx-245;zone(f,rich?'co2burn':'coburn',x,ground-220,240,220,26,{dmg:rich?165:115,flame:true,chemical:true,heavy:true,interference:!rich});log(rich?'C + O₂ → CO₂；氧供充足的教学路径。':'2C + O₂ → 2CO；低氧教学路径，干扰为游戏抽象。')}
  break;
 case 'Fe':
  if(n===1){f.reagents.acid--;f.passiveShield=1;addS(f,'passive',260);log('携带冷浓硝酸试剂：表面钝化，消耗一次试剂。')}
  if(n===2){f.reagents.redox--;f.fe3=!f.fe3;if(f.fe3)proj(f,'fe3',7,66,{oxidation:true,chemical:true,r:13});else {f.energy=clamp(f.energy+45,0,100);say('Fe²⁺ 还原模块 · 驱动能量回收','价态转化由配套氧化剂或还原剂完成，回能是游戏奖励。')}log('Fe²⁺ / Fe³⁺ 为离子模块，不能与铁单质混同。')}
  if(n===3){zone(f,'ironburn',cx-180,ground-230,360,230,30,{dmg:190,flame:true,oxidation:true,chemical:true,heavy:true});damage(f,35,null,{chemical:true});log('点火与氧供：3Fe + 2O₂ → Fe₃O₄（本场景代表式，非所有条件唯一产物）。')}
 }
 return true;
}
function breakWater(f){if(game.stage!=='lab'||game.water>0)return;game.water=1200;say('水槽破裂 · 水区已形成','钠进入水区后发生放热反应。');particles(560,ground-45,'#9acbc0',16)}
function updateAttack(f){
 if(!f.attack)return;const a=f.attack;a.age++;
 if(!a.used&&a.age>=a.windup){a.used=true;f.energy=clamp(f.energy+2,0,100);
  if(f.id==='Cl')proj(f,'chlorine',7,27,{chemical:true,r:9});
  else hit(f,f.id==='Fe'?146:124,f.atk,{knock:f.id==='Fe'?7:4,heavy:f.id==='Fe'});
  if(game.stage==='lab'&&Math.abs(f.x+f.w/2-560)<120&&f.y+f.h>ground-65)breakWater(f);
 }
 if(a.age>=a.duration)f.attack=null;
}
function updF(f){
 for(let i=0;i<4;i++)f.cd[i]=Math.max(0,f.cd[i]-1);
 for(const name of ['inv','flash','stun','field','diamond','graphite','dash','waterCD'])f[name]=Math.max(0,f[name]-1);
 if(f===game.p)f.guard=!!key.s&&f.y>=ground-f.h-1&&!f.attack&&f.stun<=0;
 const slow=has(f,'precip')?.55:1,cold=game.stage==='cold'?.88:1,speed=f.speed*slow*cold*(f.graphite?1.3:1);
 const dir=f.isAI?f.move:(key.d?1:0)-(key.a?1:0),target=f.guard||f.stun>0?0:dir*speed;
 f.vx+=(target-f.vx)*.4;
 if(f.dash>0)f.vx=f.face*13;
 if(f===game.p&&buffer.w&&f.y>=ground-f.h-1&&!f.guard&&f.stun<=0){f.vy=-f.jump;delete buffer.w}
 f.vy+=.78;f.x+=f.vx+f.kb;f.kb*=.8;f.y+=f.vy;
 if(f.y>ground-f.h){f.y=ground-f.h;f.vy=0}
 f.x=clamp(f.x,22,W-f.w-22);
 f.energy=clamp(f.energy+(game.mode==='training'?.8:.055)*(game.stage==='cold'?.65:1),0,100);
 for(const s of f.statuses){s.dur--;s.t++;if((s.type==='corrosion'||s.type==='poison')&&s.t>=30){damage(f,2.5*s.pow,null,{chemical:true,dot:true});s.t=0}}
 f.statuses=f.statuses.filter(s=>s.dur>0);
 if(!has(f,'passive'))f.passiveShield=0;
 if(f.id==='Na'&&game.stage==='lab'&&game.water>0&&f.x+f.w>410&&f.x<710&&f.y+f.h>ground-15&&f.waterCD<=0){f.waterCD=210;zone(f,'nawater',f.x-100,ground-170,260,170,22,{dmg:85,flame:true,chemical:true,heavy:true});damage(f,30,null,{chemical:true});log('钠接触水：自动放热，双方近距离均有风险。')}
 updateAttack(f);
}
function ai(f){
 if(game.mode==='training'){f.move=0;f.guard=false;return}
 if(f.guardTime>0)f.guardTime--;
 f.guard=f.guardTime>0&&!f.attack&&f.stun<=0;
 if(--f.think>0)return;f.think=game.mode==='easy'?25:13;
 const b=game.p,d=(b.x+b.w/2)-(f.x+f.w/2),dist=Math.abs(d);f.move=dist>110?Math.sign(d):dist<62?-Math.sign(d):0;
 if(has(f,'blind')&&rng()<.45){f.move=0;return}
 if(b.attack&&dist<170&&rng()<.45)f.guardTime=22;
 if(dist<130&&rng()<(game.mode==='easy'?.5:.82))skill(f,0);
 if(f.energy>=f.ult[1]&&dist<260&&rng()<.4)skill(f,3);
 else if(f.energy>=f.s2[1]&&dist<420&&!condition(f,2)&&rng()<.25)skill(f,2);
 else if(f.energy>=f.s1[1]&&dist<330&&!condition(f,1)&&rng()<.28)skill(f,1);
 if(rng()<.035&&f.y>=ground-f.h-1&&dist<260)f.vy=-f.jump;
}
function updP(){for(const p of game.projectiles){p.x+=p.vx;p.life--;const b=p.owner===game.p?game.e:game.p;if(b.inv<=0&&p.x>b.x-8&&p.x<b.x+b.w+8&&p.y>b.y&&p.y<b.y+b.h){const dealt=damage(b,p.dmg,p.owner,p.opt);if(dealt>0&&p.opt.oxidation)addS(b,'oxidation',180);p.life=0}}game.projectiles=game.projectiles.filter(p=>p.life>0&&p.x>-60&&p.x<W+60)}
function updZ(){
 for(const z of game.zones){z.dur--;z.t++;const b=z.owner===game.p?game.e:game.p;if(!overlapF(b,z)||b.inv>0)continue;
  const continuous=z.kind==='chlorine'||z.kind==='ozone';
  if((continuous&&z.t>=18)||(!continuous&&!z.struck)){
   z.t=0;z.struck=true;
   if(z.opt.dmg)damage(b,z.opt.dmg,z.owner,{...z.opt,dot:continuous});
   if(z.kind==='chlorine')addS(b,'corrosion',80,.6);
   if(z.kind==='ozone')addS(b,'oxidation',110);
   if(z.opt.precip)addS(b,'precip',120);
   if(z.opt.blind)addS(b,'blind',180);
   if(z.opt.interference)addS(b,'poison',160,.7);
  }
 }
 game.zones=game.zones.filter(z=>z.dur>0);
}
function resolveOutcome(){if(game.p.stable<=0||game.e.stable<=0){end(game.p.stable<=0&&game.e.stable<=0?'DRAW':game.p.stable<=0?'AI':'PLAYER','ko');return true}return false}
function update(){
 if(!game||game.over||game.paused)return;
 game.frame++;
 if(game.intro>0){game.intro--;$('message').innerHTML=game.intro>30?'准备反应<small>READY</small>':'开始对决<small>FIGHT</small>';$('message').style.opacity=1;if(!game.intro){$('message').style.opacity=0;clearInput();tone('start')}return}
 if(game.hitstop>0){game.hitstop--;return}
 if(game.mode!=='training')game.time=Math.max(0,game.time-1/60);
 if(game.water>0)game.water--;
 game.p.face=game.e.x>game.p.x?1:-1;game.e.face=-game.p.face;
 ai(game.e);updF(game.p);updF(game.e);
 const dx=game.e.x-game.p.x,gap=game.p.w+7;
 if(Math.abs(dx)<gap&&Math.abs(game.p.y-game.e.y)<105){const shift=(gap-Math.abs(dx))/2,sign=dx>=0?1:-1;game.p.x=clamp(game.p.x-sign*shift,22,W-game.p.w-22);game.e.x=clamp(game.e.x+sign*shift,22,W-game.e.w-22)}
 for(const [k,n] of [['j',0],['k',1],['l',2],['u',3]]){
  if((buffer[k]||(k==='j'&&key.j))&&skill(game.p,n))delete buffer[k];
 }
 for(const k of Object.keys(buffer)){if(--buffer[k]<=0)delete buffer[k]}
 updP();updZ();
 for(const f of game.fx){f.x+=f.vx;f.y+=f.vy;f.vy+=.14;f.life--}game.fx=game.fx.filter(f=>f.life>0);
 for(const f of game.numbers){f.y-=.65;f.life--}game.numbers=game.numbers.filter(f=>f.life>0);
 game.shake*=.8;if(game.callout>0)game.callout--;else $('hitCallout').style.opacity=0;
 if(resolveOutcome())return;
 if(game.time<=0&&game.mode!=='training'){const ratio=game.p.stable/game.p.max-game.e.stable/game.e.max;end(Math.abs(ratio)<1e-8?'DRAW':ratio>0?'PLAYER':'AI','time')}
}
function bg(){
 const st=game.stage,top={lab:'#26392f',hot:'#3d3022',sealed:'#253532',cold:'#243b3b'}[st];
 const g=X.createLinearGradient(0,0,0,H);g.addColorStop(0,top);g.addColorStop(1,'#101a14');X.fillStyle=g;X.fillRect(0,0,W,H);
 X.fillStyle='#0e191366';X.fillRect(0,0,W,180);X.fillStyle='#81947712';
 for(let i=0;i<7;i++)X.fillRect(i*185,0,5,ground);
 X.strokeStyle='#788d7033';X.lineWidth=1;
 for(let i=0;i<6;i++){const x=48+i*185;X.strokeRect(x,170,138,231);X.fillStyle='#0c191a66';X.fillRect(x+6,178,126,214);X.strokeStyle='#8baa8333';X.beginPath();X.moveTo(x,290);X.lineTo(x+138,290);X.stroke();X.strokeStyle='#788d7033'}
 X.fillStyle='#92a981';X.globalAlpha=.4;for(let i=0;i<5;i++)X.fillRect(90+i*220,147,100,3);X.globalAlpha=1;
 // Depth rails and industrial floor, intentionally subdued behind the fighters.
 X.fillStyle='#253528';X.fillRect(0,ground,W,H-ground);X.fillStyle='#6a7950';X.fillRect(0,ground,W,3);
 X.strokeStyle='#73805733';for(let i=-4;i<12;i++){X.beginPath();X.moveTo(W/2+(i-3)*135,ground);X.lineTo(W/2+(i-3)*240,H);X.stroke()}for(let i=0;i<4;i++){X.beginPath();X.moveTo(0,ground+18+i*31);X.lineTo(W,ground+18+i*31);X.stroke()}
 X.save();X.globalAlpha=.13;X.fillStyle='#d9d9a7';X.font='800 86px monospace';X.textAlign='center';X.fillText({lab:'REACTION LAB / 01',hot:'THERMAL CORE / 02',sealed:'SEALED CELL / 03',cold:'CRYO CHAMBER / 04'}[st],W/2,267);X.restore();
 if(st==='lab'){
  X.fillStyle='#819487';X.fillRect(534,375,52,82);X.fillStyle='#253c33';X.fillRect(541,383,38,58);X.strokeStyle='#a2c8b2';X.lineWidth=3;X.strokeRect(541,383,38,58);
  if(game.water<=0){X.fillStyle='#9fc7b280';X.fillRect(545,400,30,36);X.fillStyle='#c5dbc1';X.font='10px monospace';X.textAlign='center';X.fillText('J 击破水槽',560,474)}
  else {X.fillStyle='#87cfb544';X.beginPath();X.ellipse(560,ground+3,151,10,0,0,Math.PI*2);X.fill();X.strokeStyle='#b1e3cf66';X.lineWidth=2;X.beginPath();X.ellipse(560,ground+1,146,7,0,0,Math.PI*2);X.stroke();X.fillStyle='#b7e9d2';X.font='11px monospace';X.textAlign='center';X.fillText('H₂O · 水区',560,ground+30)}
 }
 if(st==='hot'){for(let i=0;i<3;i++){const x=120+i*430;X.fillStyle='#111b15';X.fillRect(x,330,58,150);X.fillStyle='#d6a453';X.fillRect(x+8,344,42,78);X.fillStyle='#fff1ac88';X.fillRect(x+16,351,26,60);X.strokeStyle='#5b513b';for(let n=0;n<4;n++)X.strokeRect(x+7,344+n*19,44,1)}}
 if(st==='sealed'){X.strokeStyle='#8aa37b66';X.lineWidth=8;X.strokeRect(34,128,W-68,ground-138);X.strokeStyle='#1c2920';X.lineWidth=3;X.strokeRect(40,134,W-80,ground-150);X.fillStyle='#c0bf83';for(let i=0;i<8;i++)X.fillRect(50+i*145,ground-17,55,5)}
 if(st==='cold'){X.fillStyle='#b2ddc717';for(let i=0;i<32;i++){const x=(i*73+game.frame*.25)%W,y=160+(i*43+game.frame*.32)%320;X.fillRect(x,y,2,7)}X.fillStyle='#a0cbb811';X.fillRect(0,ground-50,W,50)}
 X.fillStyle='#070f0b55';X.fillRect(0,ground+80,W,H-ground-80);
}
const zoneColors={hcloud:'#dae9d2',blast:'#eac078',fusion:'#f0d4a0',oxygen:'#8ec9c7',ozone:'#aac7a1',nawater:'#efd07e',sodiumGlow:'#ffec9c',chlorine:'#b3c966',agcl:'#f0ebd0',co2burn:'#e2aa6a',coburn:'#c7a37d',ironburn:'#da9c6b'};
function drawZ(z){
 X.save();const col=zoneColors[z.kind]||'#fff',fade=clamp(z.dur/z.max,0,1);X.fillStyle=col;X.strokeStyle=col;
 if(['hcloud','chlorine','ozone','oxygen'].includes(z.kind)){
  X.globalAlpha=.09+fade*.07;for(let i=0;i<9;i++){X.beginPath();X.arc(z.x+((i*41+game.frame*.9)%z.w),z.y+25+((i*31)%Math.max(1,z.h-50)),27+(i%3)*12,0,Math.PI*2);X.fill()}
  X.globalAlpha=.35;X.lineWidth=2;X.beginPath();X.ellipse(z.x+z.w/2,ground-1,z.w/2,11,0,0,Math.PI*2);X.stroke();
  X.font='10px monospace';X.textAlign='center';X.fillText({hcloud:'H₂ · 轨迹示意',chlorine:'Cl₂',ozone:'O₃ · 放电',oxygen:'O₂ · 助燃区'}[z.kind],z.x+z.w/2,ground+18);
 }else if(z.kind==='agcl'){
  X.globalAlpha=.65*fade;for(let i=0;i<14;i++){const x=z.x+i*12,y=ground-6-(i%3)*5;X.beginPath();X.moveTo(x,y-12);X.lineTo(x+6,y);X.lineTo(x,y+5);X.lineTo(x-5,y);X.closePath();X.fill()}X.font='10px monospace';X.textAlign='center';X.fillText('AgCl↓',z.x+z.w/2,ground+18);
 }else{
  const cx=z.x+z.w/2,cy=z.y+z.h*.55,r=Math.min(z.w,z.h)*(.4+(1-fade)*.5);X.globalAlpha=fade*.18;X.beginPath();X.ellipse(cx,cy,z.w*.5,z.h*.5,0,0,Math.PI*2);X.fill();X.globalAlpha=fade*.9;X.lineWidth=5*fade;X.beginPath();X.arc(cx,cy,r,0,Math.PI*2);X.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;X.beginPath();X.moveTo(cx+Math.cos(a)*r*.75,cy+Math.sin(a)*r*.75);X.lineTo(cx+Math.cos(a)*r*1.2,cy+Math.sin(a)*r*1.2);X.stroke()}
 }
 X.restore();
}
function drawF(f){
 X.save();X.fillStyle='#08130c88';X.beginPath();X.ellipse(f.x+f.w/2,ground+5,48,9,0,0,Math.PI*2);X.fill();
 X.translate(f.x+f.w/2,f.y+f.h);X.scale(f.face,1);
 if(f.inv>0)X.globalAlpha=.55+Math.sin(game.frame*.6)*.2;
 if(f.flash>0){X.shadowBlur=18;X.shadowColor='#f2d88e';X.globalAlpha=.76}
 FighterArt.actor(X,f,game.frame,1.05);X.restore();
 const tags=[];if(f.diamond)tags.push('金刚石');if(f.graphite)tags.push('石墨');if(f.fe3)tags.push('Fe³⁺');if(tags.length){X.fillStyle='#d3dcbd';X.font='10px monospace';X.textAlign='center';X.fillText(tags.join(' · '),f.x+f.w/2,f.y-18)}
}
function render(){if(!game)return;const portrait=matchMedia('(max-width:660px) and (orientation:portrait)').matches,wanted=portrait?840:630;if(C.height!==wanted){C.height=wanted;H=wanted}X.save();if(portrait){const separation=Math.abs(game.e.x-game.p.x),zoom=Math.min(1.5,W/(separation+350)),centre=clamp((game.p.x+game.e.x)/2+34,W/zoom/2,W-W/zoom/2);X.translate(W/2-centre*zoom,H*.85-ground*zoom);X.scale(zoom,zoom)}if(!reducedMotion&&game.shake>.1)X.translate(Math.sin(game.frame*2)*game.shake,Math.cos(game.frame*1.7)*game.shake*.5);bg();for(const z of game.zones)drawZ(z);drawF(game.p);drawF(game.e);
 for(const p of game.projectiles){const col={oxygen:'#9bdad0',na:'#f4d082',hclo:'#d0d98a',fe3:'#d4a385',chlorine:'#b7d374'}[p.kind]||'#fff';X.strokeStyle=col+'66';X.lineWidth=p.r;X.lineCap='round';X.beginPath();X.moveTo(p.x-p.vx*3,p.y);X.lineTo(p.x,p.y);X.stroke();X.fillStyle=col;X.beginPath();X.arc(p.x,p.y,p.r*.65,0,Math.PI*2);X.fill();X.fillStyle='#eef5d3';X.beginPath();X.arc(p.x,p.y,p.r*.25,0,Math.PI*2);X.fill()}
 for(const f of game.fx){X.globalAlpha=f.life/f.max;X.fillStyle=f.color;X.fillRect(f.x,f.y,4,2)}X.globalAlpha=1;
 for(const f of game.numbers){X.globalAlpha=Math.min(1,f.life/15);X.fillStyle=f.color;X.font='bold 22px monospace';X.textAlign='center';X.fillText(f.text,f.x,f.y)}X.globalAlpha=1;X.restore();}
function hud(){
 if(!game)return;const p=game.p,e=game.e;
 for(const [prefix,f] of [['p',p],['e',e]]){$(prefix+'hp').style.width=f.stable/f.max*100+'%';$(prefix+'eng').style.width=f.energy+'%';$(prefix+'health').textContent=Math.ceil(f.stable)+' / '+f.max;$(prefix+'energy').textContent=Math.floor(f.energy);const tags=f.statuses.map(s=>sLabel(s.type));$(prefix+'statuses').replaceChildren(...tags.map(t=>{const el=document.createElement('span');el.textContent=t;return el}))}
 $('timer').textContent=game.mode==='training'?'∞':String(Math.ceil(game.time)).padStart(2,'0');$('timeLabel').textContent=game.mode==='training'?'TRAINING':'TIME';
 $('statusline').textContent='驱动能量 '+Math.floor(p.energy)+'；稳定度 '+Math.ceil(p.stable);
 document.querySelectorAll('.actions .ctrl').forEach((btn,i)=>{
  const move=i===0?[meta[p.id].basic,0]:i===1?p.s1:i===2?p.s2:p.ult,remaining=p.cd[i],reason=i?condition(p,i):'',busy=p.guard?'防御中':p.stun>0?'受击硬直':p.attack?'出招中':'';
  btn.querySelector('b').textContent=move[0];btn.querySelector('small').textContent=remaining>0?'冷却 '+(remaining/60).toFixed(1)+'s':reason||busy||((i?move[1]+' 能量':'按住连击')+(i&&p.energy<move[1]?' · 不足':''));
  btn.classList.toggle('cooling',remaining>0);btn.classList.toggle('unavailable',!!reason||p.energy<move[1]);btn.classList.toggle('ready',remaining<=0&&!reason&&!busy&&p.energy>=move[1]);btn.style.setProperty('--cooldown',remaining/(p.maxcd[i]||1));
  btn.setAttribute('aria-label',move[0]+'，'+btn.querySelector('small').textContent);
 });
 const labels=[game.stage==='sealed'?'低氧 / 密闭':'空气 / 氧供',game.stage==='lab'?(game.water>0?'水区已激活':'水槽：近身普攻击破'):game.stage==='hot'?'高温：燃烧增强':game.stage==='cold'?'低温：冷却延长':'气体滞留'];
 if(p.id==='Cl')labels.push('水样 '+p.reagents.water+' · 银盐 '+p.reagents.silver);
 if(p.id==='Fe')labels.push('钝化试剂 '+p.reagents.acid+' · 变价试剂 '+p.reagents.redox);
 const signature=labels.join('|');if($('conditions').dataset.value!==signature){$('conditions').dataset.value=signature;$('conditions').replaceChildren(...labels.map((t,i)=>{const el=document.createElement('span');el.textContent=t;if(i===1&&game.water>0)el.className='active';return el}))}
}
function clearInput(){for(const k of Object.keys(key))delete key[k];for(const k of Object.keys(buffer))delete buffer[k];sources.clear();document.querySelectorAll('.ctrl.on').forEach(b=>b.classList.remove('on'))}
function setInput(k,down,source){
 if(!game||game.over||game.paused||game.intro>0)return;
 let set=sources.get(k);if(!set){set=new Set();sources.set(k,set)}const was=set.size>0;
 if(down)set.add(source);else set.delete(source);key[k]=set.size>0;
 if(down&&!was&&['w','j','k','l','u'].includes(k))buffer[k]=12;
 document.querySelectorAll('.ctrl[data-key="'+k+'"]').forEach(b=>b.classList.toggle('on',key[k]));
}
function pause(value=true){if(!game||game.over)return;game.paused=value;clearInput();accumulator=0;lastTime=performance.now();$('overlay').hidden=!value;$('resumeBtn').hidden=false;if(value){$('overlayEyebrow').textContent='REACTION PAUSED';$('overlayTitle').textContent='反应暂停';$('overlayDetail').textContent='喘口气。继续时，战局从这里恢复。'}$('pauseBtn').textContent=value?'继续 Esc':'暂停 Esc'}
function end(who,reason){
 if(game.over)return;game.over=true;game.winner=who;game.endReason=reason;clearInput();hud();tone('ko');
 $('overlayEyebrow').textContent=who==='DRAW'?'DRAW':who==='PLAYER'?'REACTION COMPLETE':'REACTION ENDED';$('overlayTitle').textContent=who==='DRAW'?'势均力敌':who==='PLAYER'?'你赢了这一局':'再试一种策略';
 const cause=reason==='time'?'时间到，按剩余稳定度比例判定。':'稳定度耗尽，本局对抗结束。';
 $('overlayDetail').textContent=cause+' 你 '+Math.round(game.p.stable/game.p.max*100)+'% / 对手 '+Math.round(game.e.stable/game.e.max*100)+'%。';$('resumeBtn').hidden=true;$('overlay').hidden=false;
}
function start(){
 clearInput();const eid=$('enemySel').value,stage=$('stageSel').value;
 game={p:mk(picked,230,1),e:mk(eid,820,-1,true),stage,mode,time:60,frame:0,over:false,paused:false,intro:70,projectiles:[],zones:[],log:[],water:0,hitstop:0,shake:0,fx:[],numbers:[],callout:0,seed:481927};
 $('select').hidden=true;$('battle').hidden=false;document.body.classList.add('in-battle');$('overlay').hidden=true;$('message').style.opacity=1;$('pname').textContent=picked+' · '+fighters[picked].name;$('ename').textContent=eid+' · '+fighters[eid].name;$('stageName').textContent=stages[stage].name;$('modeName').textContent={easy:'入门对战',normal:'标准对战',training:'训练模式'}[mode];$('pauseBtn').textContent='暂停 Esc';$('trainingReset').hidden=mode!=='training';$('fact').style.opacity=0;clearTimeout(say.t);accumulator=0;lastTime=performance.now();hud();window.scrollTo({top:0});log('场景：'+stages[stage].name+'；'+stageMeta[stage][2]);
 if(sound&&audio)audio.resume();
}
function toLobby(){clearInput();game=null;$('select').hidden=false;$('battle').hidden=true;document.body.classList.remove('in-battle');clearTimeout(say.t);if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});window.scrollTo({top:0});$('startBtn').focus({preventScroll:true})}
function syncEnemyCards(){const id=$('enemySel').value;$('enemyLabel').textContent=fighters[id].name+' / '+fighters[id].type;document.querySelectorAll('.enemy-pick').forEach(b=>{b.classList.toggle('sel',b.dataset.enemy===id);b.setAttribute('aria-pressed',String(b.dataset.enemy===id))})}
function profile(){const f=fighters[picked];$('profileFormula').textContent=meta[picked].formula;$('profileRole').textContent=meta[picked].role;$('profileName').innerHTML=f.name+'<span>'+f.sym+'</span>';$('profileDesc').textContent=f.desc;$('profileTip').textContent=meta[picked].tip;
 $('profileStats').innerHTML=[['机动',f.speed/6.5],['稳定度',f.max/1320],['普攻',f.atk/40]].map(([label,value])=>'<div class="stat">'+label+'<div class="stat-track"><span style="width:'+Math.round(value*100)+'%"></span></div></div>').join('');
 $('moveList').innerHTML=[f.s1,f.s2,f.ult].map((m,i)=>'<div class="move-item"><kbd>'+['K','L','U'][i]+'</kbd><div><b>'+m[0]+'</b><small>'+m[2]+'</small></div><span class="cost">'+m[1]+' E</span></div>').join('');
 document.querySelectorAll('.fighter').forEach(b=>{b.classList.toggle('sel',b.dataset.id===picked);b.setAttribute('aria-pressed',String(b.dataset.id===picked))});
}
function build(){
 Object.keys(fighters).forEach(id=>{
  const f=fighters[id],b=document.createElement('button');b.className='fighter';b.dataset.id=id;b.innerHTML='<span class="sym" style="color:'+colors[id]+'">'+id+'</span><b>'+f.name+'</b>';b.setAttribute('aria-label',f.name+'，'+f.type);b.onclick=()=>{picked=id;profile()};$('fighterList').append(b);
  const e=document.createElement('button');e.className='enemy-pick';e.dataset.enemy=id;e.textContent=id;e.setAttribute('aria-label','对手 '+f.name);e.onclick=()=>{$('enemySel').value=id;syncEnemyCards()};$('enemyPicks').append(e);
 });
 Object.keys(stages).forEach(id=>{const b=document.createElement('button');b.className='stage-card'+(id==='lab'?' sel':'');b.dataset.stage=id;b.dataset.icon=stageMeta[id][0];b.setAttribute('aria-pressed',String(id==='lab'));b.innerHTML='<b>'+stages[id].name+'</b><small>'+stageMeta[id][1]+'</small>';b.onclick=()=>{$('stageSel').value=id;document.querySelectorAll('.stage-card').forEach(el=>{el.classList.toggle('sel',el===b);el.setAttribute('aria-pressed',String(el===b))})};$('stagePicks').append(b)});
 document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(el=>{el.classList.toggle('sel',el===b);el.setAttribute('aria-pressed',String(el===b))});$('modeHint').textContent={easy:'AI 反应更慢 · 适合熟悉距离与防御',normal:'完整 AI 对抗 · 60 秒 · 剩余稳定度比例判胜',training:'静止对手 · 快速回能 · 无计时 · 可随时重置'}[mode]});
 profile();syncEnemyCards();
}
function loop(t){
 if(!lastTime)lastTime=t;const elapsed=Math.max(0,Math.min(100,t-lastTime));lastTime=t;
 if(game){if(!game.paused&&!game.over){accumulator+=elapsed;while(accumulator+1e-7>=STEP){update();accumulator-=STEP;if(game.over)break}}else accumulator=0;render();if(t-lastHud>=66){hud();lastHud=t}}
 else {lobbyFrame+=elapsed/STEP;const c=$('portrait'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.translate(c.width/2,270);FighterArt.actor(ctx,{id:picked,face:1},reducedMotion?0:lobbyFrame,1.5);ctx.restore()}
 raf=requestAnimationFrame(loop);
}
build();$('startBtn').onclick=start;$('pauseBtn').onclick=()=>pause(!game.paused);$('resumeBtn').onclick=()=>pause(false);$('rematchBtn').onclick=start;$('restart').onclick=toLobby;$('trainingReset').onclick=start;
$('enemySel').onchange=syncEnemyCards;
$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=sound?'音效 开':'音效 关';$('soundBtn').setAttribute('aria-pressed',String(sound));if(sound){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume();tone('start')}catch{sound=false;$('soundBtn').textContent='音效不可用';$('soundBtn').setAttribute('aria-pressed','false')}}};
$('fullscreenBtn').onclick=async()=>{try{if(document.fullscreenElement){await document.exitFullscreen()}else if($('battle').requestFullscreen){await $('battle').requestFullscreen()}else say('当前浏览器不支持全屏 · 可横屏游玩')}catch{say('可通过横屏获得更大视野')}};
$('helpBtn').onclick=()=>{if(game&&!game.over)pause(true);$('helpDialog').showModal()};$('notesBtn').onclick=()=>{if(game&&!game.over)pause(true);$('notesContent').replaceChildren(...(game.log.length?game.log:['本局尚无反应记录。']).map(s=>{const d=document.createElement('div');d.textContent=s;return d}));$('notesDialog').showModal()};
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
const keyMap={arrowleft:'a',arrowright:'d',arrowup:'w',arrowdown:'s',' ':'w'};
addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]'))return;
 if(e.key==='Escape'&&game&&!game.over){e.preventDefault();pause(!game.paused);return}
 if(!game||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 const k=keyMap[e.key.toLowerCase()]||e.key.toLowerCase();if(!'adwsjklu'.includes(k)||k.length!==1)return;e.preventDefault();if(!e.repeat)setInput(k,true,'key:'+e.code);
});
addEventListener('keyup',e=>{const k=keyMap[e.key.toLowerCase()]||e.key.toLowerCase();if('adwsjklu'.includes(k)&&k.length===1)setInput(k,false,'key:'+e.code)});
document.querySelectorAll('.ctrl').forEach(b=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(e.button!==0&&e.pointerType==='mouse')return;b.setPointerCapture(e.pointerId);setInput(b.dataset.key,true,'pointer:'+e.pointerId)});
 const off=e=>{e.preventDefault();setInput(b.dataset.key,false,'pointer:'+e.pointerId)};b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('lostpointercapture',off);b.addEventListener('contextmenu',e=>e.preventDefault());
 b.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();setInput(b.dataset.key,true,'button')}});b.addEventListener('keyup',e=>{if(e.key==='Enter')setInput(b.dataset.key,false,'button')});
});
addEventListener('blur',()=>{clearInput();if(game&&!game.over)pause(true)});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(game&&!game.over)pause(true)}});
addEventListener('error',e=>{$('errorBanner').hidden=false;$('errorBanner').textContent='游戏遇到错误，请刷新重试。'+String(e.message||'');if(game&&!game.over)pause(true)});
// Test controls exist only on loopback when explicitly requested; never on the deployed host.
if(['127.0.0.1','localhost'].includes(location.hostname)&&new URLSearchParams(location.search).has('test')){
 window.__gameTest={state:()=>structuredClone(game),start:(p='H',e='Fe',st='lab',m='training')=>{picked=p;mode=m;$('enemySel').value=e;$('stageSel').value=st;start();game.intro=0;$('message').style.opacity=0;},stopRAF:()=>cancelAnimationFrame(raf),step:n=>{for(let i=0;i<n;i++)update();hud();render()},renderFrame:t=>{cancelAnimationFrame(raf);loop(t);cancelAnimationFrame(raf)},resetClock:()=>{lastTime=1000;accumulator=0},input:(k,v)=>setInput(k,v,'test'),patch:(who,values)=>Object.assign(game[who],values),patchGame:values=>Object.assign(game,values),skill:(who,n)=>skill(game[who],n),damage:(who,n)=>damage(game[who],n,null,{}),zone:(kind,dur,dmg)=>zone(game.p,kind,game.e.x-10,game.e.y-10,120,190,dur,{dmg,chemical:true}),finish:resolveOutcome,pause,condition:(who,n)=>condition(game[who],n)};
}
raf=requestAnimationFrame(loop);
})();
