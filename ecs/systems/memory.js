import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeRelation} from '../../village-life.js';
import {setActorMemories,actorMemories} from '../actor-memories.js';
import {actorNeeds} from '../actor-needs.js';
import {memoryContacts} from '../memory-contacts.js';
import {MEMORY_RULES,memoryDescription} from '../social-memory-data.js';
import {completeCustom} from '../../village-traditions.js';
const weights={'enjoyed-performance':.12,'shared-performance':.07,'comforted-by-story':.18,'killed-animal':-.25,'ignored-plea':-.18,'protected-animal':.08,'attacked-me':-.3,encouraged:.18,'sheltered-me':.28,'shared-home':.12,'helped-rebuild':.24,'recovery-food':.24,'crowded-home':-.14,'recovered-together':.2,taught:.22,adopted:.35,'elder-stories':.24,traded:.18,abducted:-.8,'taken-away':-.25,farewell:.05,welcomed:.22,welcoming:.18,'rescued':.38,'protected-child':.16,'repaired-home':.18,'weathered-raid-together':.2,'reassured':.25,'miracle-friend':.5,'miracle-enemy':-.5,'shared-meal':.12,'shared-warmth':.06,'time-together':.12,cared:.24,fed:.28,comforted:.3,defended:.32,'went-together':.18,'welcomed-together':.18,'remembered-together':.2,parted:-.3,argument:-.2,rejected:-.35,betrayed:-.8};
const clamp=n=>Math.max(-1,Math.min(1,n));
export function memoryRemember(world,w,other,kind){const state=world.resource('Memory');

  if(!w||!other||w===other||(actorVitality(w)?.dead)||(actorVitality(other)?.dead))return false;
  const time=state.economy.time,list=(actorMemories(w)??setActorMemories(w,[])),old=list.find(m=>m.otherId===other.id&&m.kind===kind);
  if(old&&time-old.at<2)return false;
  const memory={otherId:other.id,kind,at:time,count:Math.min(99,(old?.count??0)+1)};
  if(w.species==='beast'){memory.text=memoryDescription(memory,other.name);setActorMemories(w,[...list.filter(m=>m!==old),memory]);if(actorMemories(w).length>12)actorMemories(w).splice(1,actorMemories(w).length-12);}
  else setActorMemories(w,[memory,...list.filter(m=>m!==old)].slice(0,MEMORY_RULES.limit));return true;
 
}
export function memoryCount(world,w,other,kind){const state=world.resource('Memory');
return actorMemories(w)?.find(m=>m.otherId===other.id&&m.kind===kind)?.count??0
}
export function memoryFeeling(world,w,other){const state=world.resource('Memory');

  return clamp((actorMemories(w)??[]).filter(m=>m.otherId===other.id).reduce((sum,m)=>sum+(weights[m.kind]??0)*(1+Math.min(3,m.count-1)*.25)*Math.pow(.5,Math.max(0,state.economy.time-m.at)/MEMORY_RULES.halfLife),0));
 
}
export function memoryMutual(world,a,b,kind,affinity=0){const state=world.resource('Memory');

  const first=memoryRemember(world,a,b,kind),second=memoryRemember(world,b,a,kind);
  if(first&&second&&affinity){const r=lifeRelation(state.economy.life,a.id,b.id);if(r)r.affinity=clamp(r.affinity+affinity)}
 
}
export function memoryUpdate(world,dt){const state=world.resource('Memory');

  const e=state.economy,near=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&['eating','warming'].includes(w.state));
  const active=new Set();
  for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){
   const a=near[i],b=near[j];if(Math.hypot(a.x-b.x,a.z-b.z)>3)continue;
   const kind=a.state==='eating'&&b.state==='eating'?'shared-meal':a.state==='warming'&&b.state==='warming'&&e.campfire?.lit?'shared-warmth':null;if(!kind)continue;
   const key=[Math.min(a.id,b.id),Math.max(a.id,b.id),kind].join(':');active.add(key);const pair=memoryContacts(state).get(key)??{seconds:0,after:0};pair.seconds+=dt;memoryContacts(state).set(key,pair);
   actorNeeds(a).social=Math.min(100,actorNeeds(a).social+dt);actorNeeds(b).social=Math.min(100,actorNeeds(b).social+dt);
   if(pair.seconds>=MEMORY_RULES.sharedSeconds&&e.time>=pair.after){memoryMutual(world,a,b,kind,kind==='shared-meal'?.025:.015);if(kind==='shared-meal')completeCustom(e,'meal',[a,b]);pair.after=e.time+MEMORY_RULES.sharedCooldown}
  }
  for(const [key,pair] of state.pairs)if(!active.has(key)){pair.seconds=0;if(e.time>=pair.after)memoryContacts(state).delete(key)}
 
}
