import {poseAt,animationTime} from '../runtime.js';
import {sampleLighting2D} from '../lighting-state.js';
import {RESOLVED_2D,RESOLVED_3D,readPath,validateResolvedValue} from './resolved-channels.js';

export function availableResolvedChannels(project,context){
 const n=(context.dimension===3?project.scene3d?.nodes:project.joints)?.find(n=>n.id===context.selected);
 if(!n||context.asset||context.dimension===2&&context.mode==='rig')return [];
 return (context.dimension===3?RESOLVED_3D:RESOLVED_2D).filter(c=>{
  if(c.startsWith('eye.'))return Object.values(n.surfaces??{}).some(s=>s.eye);
  if(c.startsWith('light.')||c.startsWith('coloring.'))return !!n[c.split('.')[0]];
  // The illustrated body uses stretch, waist and bend; taper belongs to the
  // general primitive deformation shader until the illustrated kit supports it.
  if(c==='deform.taper'&&project.scene3d?.rendering?.pipeline==='illustrated')return false;
  return true;
 });
}
export function readPuppetChannel(project,context,channel,overrides=[]){
 const clip=project.clips.find(c=>c.id===context.clip),time=animationTime(clip,context.time);
 return structuredClone(channel.includes('.')?readPath(sampleLighting2D(project,clip,time,overrides).get(context.selected),channel):poseAt(project,clip,time,{overrides}).get(context.selected)?.transform[channel]);
}
export function bakeTimes(clip,start,end,fps){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end>clip.duration||end<=start)throw Error('Choose an interval inside this clip');
 if(!Number.isFinite(fps)||fps<24||fps>120)throw Error('Sample rate must be between 24 and 120 FPS');
 const count=Math.ceil((end-start)*fps);if(count>9999)throw Error('Choose a shorter interval (maximum 10,000 keys per channel)');
 return Array.from({length:count+1},(_,i)=>Math.min(end,start+i/fps));
}
// readAt returns actual local channel output after all drivers, in presentation
// time. 2D stores the corresponding animation time so hitstop is not applied twice.
export async function sampleResolvedTrack({project,context,channel,start,end,fps=60,readAt,progress=()=>{}}){
 const doc=context.dimension===3?project.scene3d:project,clip=doc.clips.find(c=>c.id===context.clip);
 if(!availableResolvedChannels(project,context).includes(channel))throw Error('This selection cannot drive '+channel);
 const times=bakeTimes(clip,start,end,fps),keys=[],mapped=t=>context.dimension===3?t:animationTime(clip,t);
 for(let i=0;i<times.length;i++){
  let value=await readAt(times[i],i);const time=mapped(times[i]);if(context.dimension===3&&channel==='rotation'&&keys.length)value=value.map((n,j)=>n+360*Math.round((keys.at(-1).value[j]-n)/360));validateResolvedValue(channel,value,context.dimension);
  const key={time,value:structuredClone(value),easing:'linear'};
  // A held animation frame has one value, even across many presentation frames.
  if(keys.length&&Math.abs(keys.at(-1).time-time)<1e-9)keys[keys.length-1]=key;else keys.push(key);
  if(i%24===0){progress(i/times.length);await new Promise(r=>setTimeout(r,0));}
 }
 const from=mapped(start),to=mapped(end);if(to<=from)throw Error('This interval is entirely frozen; extend it beyond the hitstop');
 progress(1);return {id:'baked-'+crypto.randomUUID().slice(0,8),node:context.selected,channel,start:from,end:to,inclusiveEnd:end===clip.duration,enabled:true,keys};
}
