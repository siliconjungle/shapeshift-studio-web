import {identity,CHANNELS,sampleTrack,matrix,multiply} from './puppet-studio/joint-transforms.js';
import {GOD_PORTRAIT_LAYOUTS} from './god-portrait-layouts.js';
import {GOD_PORTRAIT_PRESETS} from './god-portrait-catalog.js';
export {GOD_PORTRAIT_PRESETS} from './god-portrait-catalog.js';
export const PORTRAIT_EXPRESSIONS=['idle','pleased','curious','concerned','stern','shocked'];
export function portraitClips(){
 const make=(id,duration,loop=false)=>({id,name:({idle:'Idle · breathe & blink',pleased:'Pleased',curious:'Curious',concerned:'Concerned',stern:'Stern',shocked:'Surprised'})[id],duration,fps:24,loop,tracks:{}});
 const key=(c,j,t,v)=>{(c.tracks[j]??=[]).push({time:t,value:{...identity(),...v},easing:'smooth'});};
 const idle=make('idle',6,true);
 for(const [t,y,rotation]of [[0,0,0],[1.5,-5,.45],[3,-1,0],[4.5,-5,-.45],[6,0,0]]){key(idle,'body',t,{y:y*.45,scaleY:1-y*.00045});key(idle,'head',t,{y,rotation});key(idle,'halo',t,{y:-y*.25,rotation:-rotation*.4});}
 for(const side of ['l','r'])for(const [t,scaleY]of [[0,1],[2.8,1],[2.9,.035],[3.03,.035],[3.18,1],[6,1]])key(idle,'eye_'+side,t,{scaleY});
 const result=[idle];
 for(const id of PORTRAIT_EXPRESSIONS.slice(1)){
  const c=make(id,3),poses={pleased:{head:{rotation:-3,y:-6},l:{scaleY:.5,rotation:8},r:{scaleY:.5,rotation:-8}},curious:{head:{rotation:5,y:-3},l:{scaleY:1.1},r:{scaleY:.65}},concerned:{head:{rotation:-2,y:9},l:{scaleY:.65,rotation:-13},r:{scaleY:.65,rotation:13}},stern:{head:{y:4},l:{scaleY:.55,rotation:15},r:{scaleY:.55,rotation:-15}},shocked:{head:{y:-13,scaleX:1.025,scaleY:1.025},l:{scaleY:1.2,scaleX:1.1},r:{scaleY:1.2,scaleX:1.1}}}[id];
  for(const [joint,value]of [['head',poses.head],['eye_l',poses.l],['eye_r',poses.r]])for(const [t,v]of [[0,{}],[.35,value],[2.1,value],[3,{}]])key(c,joint,t,v);
  result.push(c);
 }
 return result;
}
// This is a normal editable Puppet Studio project, not a portrait-only format.
export function makeGodPortrait(god='warden',{assetURL=p=>p}={}){
 god=god.replace(/^god-/,'');if(!GOD_PORTRAIT_LAYOUTS[god])throw Error('Unknown god portrait '+god);
 const layout=GOD_PORTRAIT_LAYOUTS[god],assets=['body','head','halo','eye'].map(id=>({id,src:assetURL(`assets/vector/gods/${god}/${id}.svg`)}));
 const joints=[{id:'root',name:'Portrait anchor',parent:null,rest:identity(),layer:0}];
 for(const [id,p]of Object.entries(layout))joints.push({id,name:({body:'Mantle / shoulders',head:'Mask / crown',halo:'Golden halo',eye_l:'Left eye',eye_r:'Right eye'})[id],parent:p.parent??'root',layer:p.layer,rest:{...identity(),x:p.x,y:p.y,scaleX:p.flip??1},sprite:{asset:p.asset??id,width:p.width,height:p.height,pivotX:.5,pivotY:p.pivotY??.5}});
 return {format:'inkwell-puppet',version:1,name:GOD_PORTRAIT_PRESETS.find(c=>c.id==='god-'+god).label,source:{character:'god-'+god,view:'front',portrait:true},assets,joints,clips:portraitClips()};
}
// The portrait subset uses the same transform sampler as Studio, without loading
// the editor's 3D/FX engines into the title screen. Every supplied clip is keys.
export function portraitPose(project,clip,time,{gaze={x:0,y:0}}={}){
 const poses=new Map(),byId=new Map(project.joints.map(j=>[j.id,j]));
 const visit=j=>{if(poses.has(j.id))return poses.get(j.id);const delta=sampleTrack(clip?.tracks[j.id],time),t={...j.rest};for(const c of CHANNELS)t[c]=c.startsWith('scale')?t[c]*delta[c]:t[c]+delta[c];if(j.id==='eye_l'||j.id==='eye_r'){t.x+=Math.max(-1,Math.min(1,gaze.x||0))*12;t.y+=Math.max(-1,Math.min(1,gaze.y||0))*8;}const local=matrix(t),parent=j.parent?visit(byId.get(j.parent)).world:[1,0,0,1,0,0],pose={joint:j,world:multiply(parent,local),transform:t};poses.set(j.id,pose);return pose;};
 for(const j of project.joints)visit(j);return poses;
}
export function portraitReaction(signals,previous){
 const now={used:signals.used,dead:signals.dead};
 let expression=null;
 if(previous){if(now.dead>previous.dead)expression='concerned';else if(now.used>previous.used){const cast=signals.lastCast;expression=['fire','lightning','scold','rampage','hate','enemy'].includes(cast?.kind)?'stern':'pleased';}}
 return {now,expression};
}
