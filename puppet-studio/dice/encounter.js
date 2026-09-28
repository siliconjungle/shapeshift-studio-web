import {timingGrade} from './rules.js';
export const MAX_HEARTS=5;
// Hazards occupy the gaps between actual musical notes; they never own a roll.
export class HazardLane{
 constructor(){this.entries=new Map();}
 reset(){this.entries.clear();}
 sync(song){
  const ids=new Set(song.queue.map(n=>n.id));
  for(const [id,h] of this.entries)if(!ids.has(h.after))this.entries.delete(id);
  for(let i=0;i<song.queue.length-1;i++){
   const a=song.queue[i],b=song.queue[i+1];if(a.id<2||(a.id+song.seed%2)%4!==2||b.beat-a.beat<1.5)continue;
   const id='skull-'+a.id;if(!this.entries.has(id))this.entries.set(id,{id,after:a.id,kind:'skull',beat:(a.beat+b.beat)/2,resolved:false});
  }
  for(const h of this.entries.values())if(song.beat>h.beat+.35)h.resolved=true;
 }
 get targets(){return [...this.entries.values()].filter(h=>!h.resolved);}
 hit(beat){const h=this.targets.find(n=>Math.abs(n.beat-beat)<=.35+1e-12);if(h)h.resolved=true;return h;}
}
export function judgeTarget(kind,position,pressed=true){
 if(kind==='skull'){
  if(!pressed)return{name:'Dodged',bonus:0,tone:'avoid',safe:true,damage:0};
  if(Math.abs(position-.72)>.14+1e-12)return null;
  return{name:'Skull',bonus:-1,tone:'skull',damage:1};
 }
 if(!pressed)return{name:'Miss',bonus:-1,tone:'miss',damage:1};
 const grade=timingGrade(position);return{...grade,damage:grade.bonus<0?1:0};
}
export class RunHealth{
 constructor(){this.reset();}
 reset(){this.heartUnits=MAX_HEARTS*2;this.hearts=3;this.resolved=new Set();}
 apply(id,grade){if(this.resolved.has(id)||this.dead)return false;this.resolved.add(id);if(!grade.damage)return false;this.heartUnits=Math.max(0,this.heartUnits-1);this.hearts=Math.max(0,this.hearts-1);return true;}
 recover(id,grade){if(this.resolved.has(id)||this.dead||!grade?.heal)return false;this.resolved.add(id);const before=this.heartUnits;this.heartUnits=Math.min(MAX_HEARTS*2,this.heartUnits+1);this.hearts=Math.min(3,this.hearts+1);return this.heartUnits>before;}
 get dead(){return this.heartUnits===0;}
}
