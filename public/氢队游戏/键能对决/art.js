/* Original procedural character art. Anchor: centre of feet, facing right. */
(() => {
 const palette={H:['#dce9d7','#7b9f91','#e9c779'],O:['#8ccbc8','#3f7576','#d7f0d6'],Na:['#c2c7b1','#747d69','#e7ba5a'],Cl:['#bdcc79','#657a3d','#e2e9b1'],C:['#8b9990','#343f39','#d1e4da'],Fe:['#b68b71','#614b3f','#e5be82']};
 function actor(ctx,f,t=0,scale=1){
  const [light,dark,accent]=palette[f.id], gas=f.id==='O'||f.id==='Cl', heavy=f.id==='Fe';
  const walk=Math.abs(f.vx||0)>.5&&!f.guard, phase=t*.19, bob=gas?Math.sin(t*.045)*3:walk?Math.abs(Math.sin(phase))*2:Math.sin(t*.035)*1.2;
  const attack=f.attack&&f.attack.age<19, thrust=attack?Math.sin(Math.min(1,f.attack.age/12)*Math.PI)*31:0;
  ctx.save();ctx.scale(scale,scale);ctx.translate(0,bob);ctx.lineJoin='round';ctx.lineCap='round';
  const poly=(pts,fill,stroke=dark,lw=2)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}};
  const line=(pts,color,width)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};
  const orb=(x,y,r,fill,stroke)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}};
  if(gas){ctx.save();ctx.globalAlpha=.13;for(let i=0;i<5;i++)orb(Math.sin(t*.035+i*2)*22,-24-i*23,20,accent);ctx.restore()}
  if(f.id==='H')poly([[-13,-108],[-46-Math.sin(t*.08)*8,-94],[-61,-106],[-30,-109]],dark,null);
  const stride=walk?Math.sin(phase)*14:0;
  line([[-11,-48],[-19-stride*.5,-24],[-23-stride,0]],dark,heavy?18:12);
  line([[11,-48],[20+stride*.5,-26],[23+stride,0]],light,heavy?20:13);
  poly([[-33-stride,-7],[-14-stride,-7],[-12-stride,3],[-34-stride,3]],dark,null);
  poly([[14+stride,-6],[30+stride,-6],[38+stride,3],[13+stride,3]],light,dark,1);
  const torso=heavy?32:f.id==='C'?24:21;
  poly([[-torso,-99],[torso-2,-99],[torso+2,-66],[15,-41],[-15,-42],[-torso-5,-65]],dark,light,1.5);
  if(f.id==='C'){
   const crystal=f.diamond;
   poly([[-22,-94],[2,-108],[27,-85],[12,-51],[-10,-45],[-27,-74]],crystal?'#d6eee1':light,dark);
   line([[2,-108],[-5,-72],[12,-51]],crystal?'#ffffff':accent,1.5);
   line([[-22,-94],[-5,-72],[27,-85]],dark,1.5);
   if(f.graphite)for(let i=0;i<4;i++)line([[-22,-92+i*10],[19,-100+i*10]],'#bbc5b5',2);
  }else{
   poly([[-torso+4,-94],[torso-5,-94],[torso-2,-69],[11,-54],[-13,-58]],light,null);
   poly([[-8,-94],[1,-94],[5,-56],[-3,-57]],dark,null);
   if(heavy){poly([[-36,-101],[-17,-105],[-13,-87],[-35,-85]],light,dark);poly([[16,-104],[37,-101],[39,-86],[17,-87]],light,dark);line([[-24,-71],[24,-71]],accent,3);for(let i=0;i<3;i++)line([[-12,-59+i*5],[14,-59+i*5]],dark,2)}
   if(f.id==='Na'){line([[-14,-86],[-5,-78],[-12,-69],[3,-61]],accent,3);poly([[17,-96],[27,-91],[26,-70],[17,-67]],accent,dark,1)}
   if(gas){orb(11,-79,8,dark);orb(11,-79,4,accent)}
  }
  const guard=f.guard, rearX=guard?-12:-36, rearY=guard?-113:-58;
  line([[-torso,-92],[-torso-9,-74],[rearX,rearY]],dark,heavy?17:11);
  orb(rearX,rearY,heavy?10:7,light,dark);
  const fx=guard?32:attack?52+thrust:34, fy=guard?-108:attack?-88:-64;
  line([[torso-4,-92],[guard?33:32+thrust*.5,guard?-88:-75],[fx,fy]],light,heavy?18:12);
  orb(fx,fy,heavy?12:9,light,dark);
  if(f.id==='Fe')poly([[fx-10,fy-9],[fx+10,fy-10],[fx+15,fy+6],[fx-9,fy+9]],light,dark);
  if(f.id==='Cl'){
   poly([[-23,-104],[-22,-130],[1,-142],[22,-130],[26,-104]],dark,accent,1.3);
   poly([[-13,-126],[12,-126],[17,-109],[-12,-107]],'#1e3020',null);
   line([[-9,-118],[13,-118]],accent,3);orb(12,-107,5,light,dark);
   line([[13,-106],[28,-105],[30,-82]],accent,3);
  }else{
   poly([[-17,-106],[-20,-126],[-8,-138],[14,-135],[23,-121],[17,-106]],light,dark,2);
   if(heavy)poly([[-19,-129],[-16,-142],[9,-146],[25,-129],[20,-115],[-19,-119]],dark,light,1.5);
   line([[-9,-121],[16,-121]],'#1c3026',5);line([[3,-121],[17,-121]],accent,2);
   if(f.id==='O'){orb(-19,-124,5,dark,accent);ctx.strokeStyle=accent;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,-123,30,27,0,0,Math.PI*2);ctx.stroke()}
   if(f.id==='H')line([[-18,-130],[16,-132]],accent,5);
  }
  ctx.save();ctx.scale(f.face||1,1);ctx.fillStyle=dark;ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(f.id,0,-76);ctx.restore();
  if(guard){ctx.save();ctx.strokeStyle=accent;ctx.globalAlpha=.65;ctx.lineWidth=3;ctx.beginPath();ctx.arc(10,-82,51,-1.2,1.2);ctx.stroke();ctx.restore()}
  if(f.passiveShield>0){ctx.strokeStyle='#e9c77999';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,-71,46,82,0,0,Math.PI*2);ctx.stroke()}
  if(attack){ctx.save();ctx.globalAlpha=.6;ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.beginPath();ctx.arc(20,-81,35+thrust,-.85,.6);ctx.stroke();ctx.restore()}
  ctx.restore();
 }
 window.FighterArt={actor,palette};
})();
