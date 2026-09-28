import {sampleControls,blendControls,clamp,VISEMES,cuePose} from '../../../portrait/controls.js';
export const defaults={smile:0,jaw:0,round:0,puff:0,lidL:0,lidR:0,happy:0,anger:0,worry:0,gazeX:0,gazeY:0,tilt:0,headY:0,headX:0,stretch:0,point:0,openHands:0,cheek:0,hat:0,tongue:0};
const limits=Object.fromEntries(Object.keys(defaults).map(k=>[k,['tilt','headX','headY','hat'].includes(k)?[-100,100]:['smile','gazeX','gazeY','stretch'].includes(k)?[-1,1]:[0,1]]));
const definitions=[
 ['composed','Composed','A little breath. A long look.',{},3.4],
 ['curious','Curious','Eyes first. Then the question.',{tilt:11,gazeX:-.55,gazeY:.15,point:1,smile:.2,lidR:.15,headY:3},2.5],
 ['smug','Smug','He knows something you don’t.',{tilt:-6,smile:.85,lidL:.65,lidR:.43,gazeX:.35,puff:.14,headY:6},2.6],
 ['delight','Delighted','A grin too big to keep inside.',{smile:1,jaw:.7,happy:.88,openHands:.8,stretch:-.3,headY:-18,tilt:-4},2.5],
 ['croak','Holding a croak','Try to keep a straight face.',{puff:1,round:.85,smile:-.22,openHands:.3,headY:-8,stretch:-.05},3.5],
 ['outraged','Outraged','Absolutely unacceptable.',{anger:1,jaw:.9,smile:-.55,round:.05,headY:15,stretch:-.28,openHands:.18},2.5],
 ['panic','Panic','The hat definitely moved.',{jaw:1,round:.7,openHands:1,stretch:.65,headY:-26,worry:.7,gazeY:-.6},2.4],
 ['sheepish','Sheepish','That was probably his fault.',{smile:-.45,lidL:.55,lidR:.16,worry:.7,tilt:-12,headY:17,gazeX:.75,cheek:1},3],
 ['sleepy','Sleepy','Just five more centuries.',{lidL:.86,lidR:.93,jaw:.6,round:1,headY:23,tilt:9,cheek:.85,hat:12},3.6],
];
function makeClip([id,name,note,target,duration]){
 const controls={},keys=(key,list)=>controls[key]=list.map(([time,value,easing='smooth'])=>({time,value,easing}));
 for(const key of Object.keys(defaults)){const goal=target[key]??0;let lag=['point','openHands','cheek'].includes(key)?.16:['hat'].includes(key)?.2:0;
  keys(key,[[0,0],[.12+lag,0],[.48+lag,goal],[duration-.62,goal],[duration,0]]);
 }
 if(['delight','panic','outraged'].includes(id)){
  keys('headY',[[0,0],[.14,12],[.31,target.headY*1.35,'out-back'],[.58,target.headY],[duration-.62,target.headY],[duration,0]]);
  keys('stretch',[[0,0],[.14,-.35],[.31,(target.stretch??0)*1.35],[.58,target.stretch],[duration-.62,target.stretch],[duration,0]]);
  keys('hat',[[0,0],[.16,0],[.38,-18],[.62,9],[.92,-3],[1.15,0],[duration,0]]);
 }
 if(id==='croak'){
  keys('puff',[[0,0],[.2,0],[.85,.95],[1.25,1],[2.08,1],[2.23,.05],[2.5,0],[duration,0]]);
  keys('jaw',[[0,0],[2.07,0],[2.2,.88],[2.39,.42],[2.7,0],[duration,0]]);
  keys('round',[[0,0],[.6,.9],[2.06,.9],[2.25,.25],[2.55,0],[duration,0]]);
  keys('hat',[[0,0],[2.05,0],[2.23,-22],[2.45,12],[2.8,-4],[3.1,0],[duration,0]]);
  keys('stretch',[[0,0],[2.08,0],[2.21,-.4],[2.46,.14],[2.85,0],[duration,0]]);
 }
 if(id==='composed'){keys('headY',[[0,0],[1.7,-3],[duration,0]]);for(const k of ['lidL','lidR'])keys(k,[[0,0],[1.35,0],[1.42,1],[1.49,1],[1.63,0],[duration,0]]);}
 return {id,name,note,duration,holdAt:id==='croak'?1.6:duration-.62,fps:24,controls,target:{...defaults,...target}};
}
export const frogRig={format:'inkwell-portrait',version:1,name:'Frog wizard',defaults,limits,clips:definitions.map(makeClip),speech:{manifest:'audio/babble/manifest.json',mode:'composable-character-babble'}};
export function reaction(rig,id,t,intensity=1){const c=rig.clips.find(c=>c.id===id)||rig.clips[0];const now=sampleControls(rig,c,t),before=sampleControls(rig,c,Math.max(0,t-.09));now.hat+=-(now.tilt-before.tilt)*1.1-(now.headY-before.headY)*.32;return blendControls(rig,defaults,now,intensity);}
export function speak(p,cues,time){const sample=cuePose(cues,time);if(!sample.cue)return p;const v={jaw:0,round:0,tongue:0,smile:0};for(const {cue,weight}of sample.weights)for(const id of Object.keys(v))v[id]+=(VISEMES[cue.pose]?.[id]??0)*weight;return {...p,jaw:p.jaw*(1-sample.weight)+v.jaw,round:p.round*(1-sample.weight)+v.round,tongue:v.tongue,smile:p.smile*(1-sample.weight*.6)+v.smile*.6,puff:Math.max(p.puff,.035*sample.weight)};}
export const showcaseOrder=['composed','curious','delight','smug','croak','panic','sheepish','outraged','sleepy'];
export function showcase(rig,time){let start=0;for(const id of showcaseOrder){const c=rig.clips.find(c=>c.id===id);if(time<start+c.duration)return {clip:c,time:time-start,pose:reaction(rig,id,time-start)};start+=c.duration;}return {clip:rig.clips[0],time:0,pose:{...defaults}};}
export function showcaseDuration(rig){return showcaseOrder.reduce((n,id)=>n+rig.clips.find(c=>c.id===id).duration,0);}
