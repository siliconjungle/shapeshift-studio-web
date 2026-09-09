import {INTRUDER_PRESETS,makeIntruderPreset} from './intruder-presets.js';
import {GOD_PORTRAIT_PRESETS} from '../god-portrait-catalog.js';
import {BUILDERS} from '../builder-character.js';
import {beastCharacter} from '../beast-character.js';
import {FORMAT,identity,setKey} from './runtime.js';
export const characters=[...INTRUDER_PRESETS,...GOD_PORTRAIT_PRESETS,...Object.values(BUILDERS),...['hearth','solis','cryos'].flatMap(c=>['comforter','steward','charismatic','zealot'].map(k=>beastCharacter(c,k)))];
export function starterClips(){
  const make=(id,name,duration)=>({id,name,duration,fps:24,loop:true,tracks:{}});
  const idle=make('idle','Breathe',2.4),walk=make('walk','Walk',1.2),wave=make('wave','Wave',2);
  const key=(c,id,t,v)=>setKey(c,id,t,{...identity(),...v});
  for(const [t,v]of [[0,0],[1.2,1],[2.4,0]]){key(idle,'body',t,{y:-v*3,scaleX:1+v*.025,scaleY:1-v*.018});key(idle,'head',t,{rotation:v*2});}
  for(let i=0;i<=4;i++){const t=i*.3,s=Math.sin(i*Math.PI/2),lift=Math.abs(s);key(walk,'body',t,{y:-lift*4,rotation:s*2});key(walk,'head',t,{rotation:-s*2});for(const [side,sign]of [['l',1],['r',-1]]){key(walk,'upper_arm_'+side,t,{rotation:s*sign*22});key(walk,'forearm_'+side,t,{rotation:-Math.abs(s)*9});key(walk,'foot_'+side,t,{x:s*sign*12,y:-Math.max(0,s*sign)*13,rotation:s*sign*8});}}
  for(const [t,r,elbow]of [[0,0,0],[.45,-105,-35],[.75,-110,-55],[1,-100,-15],[1.25,-110,-55],[1.5,-100,-15],[2,0,0]]){key(wave,'upper_arm_r',t,{rotation:r});key(wave,'forearm_r',t,{rotation:elbow});key(wave,'head',t,{rotation:r? -5:0});}
  return [idle,walk,wave];
}
export async function makePreset(id='solis-female',view='front'){
  if(INTRUDER_PRESETS.some(c=>c.id===id))return makeIntruderPreset(id);
  if(GOD_PORTRAIT_PRESETS.some(c=>c.id===id)){const {makeGodPortrait}=await import('../god-portrait-rig.js');return makeGodPortrait(id,{assetURL:p=>new URL('../'+p,location.href).href});}
  const character=characters.find(c=>c.id===id)??Object.values(BUILDERS)[0],r=character.rigs[view]??{},assets=[];
  const response=await fetch(new URL('../'+character.landmarks,location.href));
  if(!response.ok)throw Error('Could not load character facial landmarks.');
  const landmarks=(await response.json())[view];
  const dimensions={};
  for(const part of ['head','body','arm','hand','boot']){
    const art=part==='head'&&landmarks&&character.face?character.face(view):character.art(view,part);
    const src=new URL('../assets/vector/'+art+'.svg',location.href).href;
    const img=new Image();img.src=src;await img.decode();dimensions[part]=[img.naturalWidth,img.naturalHeight];assets.push({id:part,src});
  }
  const aspect=part=>dimensions[part][0]/dimensions[part][1];
  const bw=r.bodyWidth??(view==='side'?178:130*aspect('body')),bh=r.bodyHeight??130,by=r.bodyCenterY??-125;
  const hh=r.headHeight??221,hw=r.headWidth??(view==='side'?235:hh*aspect('head')),bottom=r.headBottom??-130;
  const neckV=r.headNeckV??.965,headPivotY=r.hoodCollarV!==undefined?neckV:1,headAttachY=r.hoodCollarV!==undefined?by+(r.hoodCollarV-.5)*bh+(r.hoodOverlap??10):bottom;
  const joints=[],add=(id,name,parent,x,y,layer,sprite,extra={})=>joints.push({id,name,parent,rest:{...identity(),x,y,...extra},layer,...(sprite?{sprite}:{})});
  const sprite=(asset,width,height,pivotX=.5,pivotY=.5,crop)=>({asset,width,height,pivotX,pivotY,...(crop?{crop}:{})});
  add('root','Root / ground',null,0,0,0);
  add('body','Body','root',0,by,10,sprite('body',bw,bh));
  add('head','Head / neck','body',0,headAttachY-by,30,sprite('head',hw,hh,r.headNeckU??.5,headPivotY),{scaleX:r.headFlipX??1});
  // The game paints expressions separately. Give the editor real eye pieces
  // too, so their position/origin and blink scale can be animated like any joint.
  if(landmarks){
    const toUV=(x,y)=>[(x-landmarks.origin[0])/landmarks.width,(y-landmarks.origin[1])/landmarks.height];
    assets.push({id:'eye',src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><ellipse cx="50" cy="50" rx="48" ry="48" fill="#161c17"/></svg>')});
    for(const [i,box]of landmarks.eyes.entries()){
      const [x0,y0]=toUV(box[0],box[1]),[x1,y1]=toUV(box[2],box[3]);
      add('eye_'+(i?'r':'l'),(i?'Right':'Left')+' eye','head',((x0+x1)/2-(r.headNeckU??.5))*hw,((y0+y1)/2-headPivotY)*hh,32+i,sprite('eye',(x1-x0)*hw,(y1-y0)*hh));
    }
    if(landmarks.mouth){const [x0,y0]=toUV(...landmarks.mouth.slice(0,2)),[x1,y1]=toUV(...landmarks.mouth.slice(2));assets.push({id:'mouth',src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><path d="M2 10 Q50 18 98 10 Q50 72 2 10" fill="#161c17"/></svg>')});add('mouth','Mouth','head',((x0+x1)/2-(r.headNeckU??.5))*hw,((y0+y1)/2-headPivotY)*hh,34,sprite('mouth',(x1-x0)*hw,(y1-y0)*hh));}
  }
  const sockets=r.sockets??[[.15,.34],[.85,.34]],feet=r.feetSpacing??34,fh=r.footHeight??68;
  for(const [i,side]of ['l','r'].entries()){
    const sign=i?1:-1,sx=(sockets[i][0]-.5)*bw,sy=(sockets[i][1]-.5)*bh,armLength=Math.max(40,-76-(by+sy)),aw=r.armWidth??28,layer=i?20:5;
    add('upper_arm_'+side,(i?'Right':'Left')+' shoulder','body',sx,sy,layer,sprite('arm',aw,armLength*.52,.5,.05,[0,0,1,.52]),{rotation:-sign*12});
    add('forearm_'+side,(i?'Right':'Left')+' elbow','upper_arm_'+side,0,armLength*.47,layer+1,sprite('arm',aw,armLength*.56,.5,.05,[0,.44,1,.56]));
    // Hand source cuffs point down for Hearth and up for Solis/beasts.
    const handH=r.handHeight??45,handAngle=r.handRotation?0:180;
    add('hand_'+side,(i?'Right':'Left')+' wrist','forearm_'+side,0,armLength*.48,layer+2,sprite('hand',handH*aspect('hand'),handH,.5,handAngle?.85:.15),{rotation:handAngle});
    add('foot_'+side,(i?'Right':'Left')+' foot','root',sign*feet,-fh*.8,3+i,sprite('boot',r.footWidth??fh*aspect('boot'),fh,.5,.2),{scaleX:r.pairedBoots&&view!=='side'?(i===(r.reverseBootPair?0:1)?-1:1):1});
  }
  return {format:FORMAT,version:1,name:character.label+' · '+view,source:{character:id,view},assets,joints,clips:starterClips()};
}
