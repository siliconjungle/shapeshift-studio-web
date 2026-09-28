// Reusable portrait controls. Same key interpolation as editable Studio SVGs.
import {sampleKeys} from '@shapeshift-labs/studio-core/vector/model';
export const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function sampleControls(rig,clip,time){
 const out={...rig.defaults};
 for(const [id,keys]of Object.entries(clip?.controls??{}))out[id]=sampleKeys(keys,clamp(time,0,clip.duration),out[id]??0);
 return limitControls(rig,out);
}
export function limitControls(rig,values){const out={};for(const [id,base]of Object.entries(rig.defaults)){const v=values[id]??base,[lo,hi]=rig.limits[id]??[-1000,1000];out[id]=clamp(Number.isFinite(v)?v:base,lo,hi);}return out;}
export function blendControls(rig,a,b,t){const out={};for(const id of Object.keys(rig.defaults))out[id]=(a[id]??rig.defaults[id])+((b[id]??rig.defaults[id])-(a[id]??rig.defaults[id]))*t;return limitControls(rig,out);}
export function validatePortrait(rig){
 if(rig.format!=='inkwell-portrait'||rig.version!==1)throw Error('Choose an Inkwell portrait rig version 1.');
 if(!rig.defaults||!rig.limits||!Array.isArray(rig.clips)||rig.clips.length>50)throw Error('Invalid portrait controls.');
 const ids=new Set();
 for(const c of rig.clips){if(typeof c.id!=='string'||ids.has(c.id)||!Number.isFinite(c.duration)||c.duration<.1||c.duration>60)throw Error('Invalid portrait clip.');ids.add(c.id);
  for(const [id,keys]of Object.entries(c.controls)){if(!(id in rig.defaults)||!Array.isArray(keys)||keys.length>1000)throw Error('Unknown control or too many keys: '+id);let prev=-1;
   for(const k of keys){if(!Number.isFinite(k.time)||k.time<0||k.time>c.duration||k.time<=prev||!Number.isFinite(k.value)||!['smooth','linear','step','out-back','out-elastic','in-quad','out-quad'].includes(k.easing))throw Error('Invalid control key: '+id);prev=k.time;}
  }
 }
 return rig;
}
export function cuePose(cues,time){
 const weights=[];let result=null,weight=0,sum=0;
 for(const cue of cues){if(time<cue.start-.04||time>cue.end+.065)continue;const w=clamp((time-cue.start+.04)/.055)*clamp((cue.end+.065-time)/.08);weights.push({cue,weight:w});sum+=w;if(w>weight){result=cue;weight=w;}}
 if(sum>1)for(const w of weights)w.weight/=sum;
 return {cue:result,weight:Math.min(1,sum),weights};
}
export const VISEMES={rest:{jaw:0,round:0},MBP:{jaw:0,round:.18},AI:{jaw:.7,round:.05},E:{jaw:.32,round:0,smile:.4},O:{jaw:.56,round:.84},U:{jaw:.25,round:1},FV:{jaw:.12,round:.15},L:{jaw:.38,round:.2,tongue:.9}};
// Critically damped-ish, bounded spring for optional pointer gaze and cloth.
export function spring(value,velocity,target,dt,frequency=12,damping=1){
 dt=Math.min(.032,Math.max(0,dt));const f=frequency*2*Math.PI,steps=Math.max(1,Math.ceil(dt/.004)),h=dt/steps;
 for(let i=0;i<steps;i++){velocity+=(f*f*(target-value)-2*damping*f*velocity)*h;value+=velocity*h;}
 return {value,velocity};
}
