import {animationTime} from '../fx/presentation.js';
import {simplifyKeys} from './timing.js';
import {timelineRows} from './timeline.js';
const OPS=new Set(['key','scene3d.key','lighting.key','backdrop.key','motion.targetKey']);
const signature=c=>JSON.stringify([c.op,c.clip,c.node,c.joint,c.id,c.channel]);
export class GestureRecorder {
 constructor(){this.armed=false;this.take=null;this.tolerance=null;}
 begin(context,now=performance.now()){if(!this.armed)return false;this.take={context:structuredClone(context),start:now,tracks:new Map()};return true;}
 at(now=performance.now()){const t=this.take;if(!t)return null;const c=t.context;return Math.min(c.duration,Math.round((c.time+(now-t.start)/1000)*(c.fps??30))/(c.fps??30));}
 capture(commands,now=performance.now()){if(!this.take)return commands;const presentation=this.at(now);return commands.map(c=>{const time=this.take.context.dimension===2&&c.op!=='backdrop.key'?animationTime(this.take.context,presentation):presentation;if(!OPS.has(c.op))throw Error('This property cannot be recorded yet');const binding={...c,time,easing:'linear'},id=signature(c);delete binding.value;let track=this.take.tracks.get(id);if(!track){track={binding,keys:[]};this.take.tracks.set(id,track);}const key={time,value:structuredClone(c.value),easing:'linear'},old=track.keys.findIndex(k=>k.time===time);if(old>=0)track.keys[old]=key;else track.keys.push(key);return {...binding,value:key.value};});}
 command(){if(!this.take||!this.take.tracks.size)return null;return {op:'recording.apply',tracks:[...this.take.tracks.values()].map(t=>({binding:t.binding,keys:structuredClone(t.keys)})),tolerance:this.tolerance??(this.take.context.dimension===3?.002:.25)};}
 finish(){const c=this.command();this.take=null;return c;}
 cancel(){const context=this.take?.context;this.take=null;return context;}
 snapshot(){return{armed:this.armed,recording:!!this.take,time:this.at(),samples:[...(this.take?.tracks.values()??[])].reduce((n,t)=>n+t.keys.length,0)};}
}
export const gestureRecorder=new GestureRecorder();
function trackKeys(p,c){const clip=(c.op==='scene3d.key'?p.scene3d:p)?.clips.find(x=>x.id===c.clip);if(c.op==='key')return clip?.tracks[c.joint];if(c.op==='scene3d.key')return clip?.tracks.find(t=>t.node===c.node&&t.channel===c.channel)?.keys;if(c.op==='lighting.key')return clip?.lightingTracks?.find(t=>t.node===c.joint&&t.channel===c.channel)?.keys;if(c.op==='motion.targetKey')return (c.dimension===3?p.scene3d:p).clips.find(x=>x.id===c.clip)?.tools?.constraints.find(t=>t.id===c.id)?.pointKeys;if(c.op==='backdrop.key')return (c.id?p.backdrop.layers.find(l=>l.id===c.id)?.tracks:p.backdrop.tracks)?.find(t=>t.channel===c.channel)?.keys;}
export function applyRecordingCommand(p,c,apply){
 if(c.op==='recording.simplify'){const wanted=new Set(c.rows),rows=timelineRows(p,c).filter(r=>wanted.has(r.id));if(!rows.length)throw Error('Select recorded keys first');for(const r of rows){if(r.event||r.procedural||r.keys.some(k=>k.easing!=='linear'||typeof k.value==='string'))throw Error('Clean up linear numeric recordings; other curves remain authored');const next=simplifyKeys(r.keys,c.tolerance??.25);r.keys.splice(0,r.keys.length,...next);}return;}
 if(c.op!=='recording.apply'||!Array.isArray(c.tracks)||!c.tracks.length||c.tracks.length>128)throw Error('Invalid recorded take');
 for(const t of c.tracks){if(!OPS.has(t.binding.op)||!t.keys?.length||t.keys.length>10000)throw Error('Invalid recording binding');const keys=simplifyKeys(t.keys,c.tolerance??.25),from=t.keys[0].time,to=t.keys.at(-1).time;if(from>to||t.keys.some((k,i)=>!Number.isFinite(k.time)||i&&k.time<=t.keys[i-1].time))throw Error('Invalid recorded time');
  // Only this take's interval is replaced; neighbouring animation stays intact.
  const existing=trackKeys(p,t.binding),before=existing?.filter(k=>k.time<from||k.time>to).map(k=>structuredClone(k))??[];
  for(const k of keys)apply(p,{...t.binding,time:k.time,value:k.value,easing:k.easing});
  const dest=trackKeys(p,t.binding);dest.splice(0,dest.length,...[...before,...keys].sort((a,b)=>a.time-b.time));
 }
}
