import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {structuralCondition} from './../home-entities.js';
import {releaseWork} from "../../village-resources.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceGrowth} from "../resource-state.js";
import {actorSocialActivity} from "../daily-activity-actors.js";
import {ensureActorPrayer,actorPrayer} from "../religion-actors.js";
import {personKinship} from "../person-kinship.js";
import {actorVitality} from "../actor-vitality.js";
import {personAge} from "../person-age.js";
import {actorRomance} from "../actor-romance.js";
import {watchAssigned} from "../../village-watch.js";
import {actorNeeds} from "../actor-needs.js";
import {careParticipant} from "../care-participants.js";
import {dangerRisk} from "../../village-danger.js";
import {supportParticipant} from "../support-participants.js";
import {dangerAwareness} from "../danger-entities.js";
import {standingRoute} from "../../village-spacing.js";
import {memorialOpacity} from "../../village-memorials.js";
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const states=new Set(['prayer-bound','praying']);
export function interruptPrayer(world,w){
 const e=world.resource('Village');if(states.has(w.state)){releaseWork(e,w);(ensureActorPrayer(w).after)=e.time+35}}
export function prayerNeed(world,w){
 const e=world.resource('Village');
 const fire=(e.shelter?.fires??[]).find(f=>f.until>e.time&&((actorResidence(w)?.home)?.id===f.id||distance(w,f)<10));
 if(fire)return {kind:'rain',targetId:fire.id,point:{x:fire.x,z:fire.z+3.3}};
 const damaged=e.life?.homes.find(h=>h===(actorResidence(w)?.home)&&!(structuralCondition(h)?.destroyed)&&(structuralCondition(h)?.health)<(structuralCondition(h)?.maxHealth)*.65);
 if(damaged&&e.recovery?.repairs.some(j=>j.homeId===damaged.id)&&e.stock.wood<1)return {kind:'repair',targetId:damaged.id,health:structuralCondition(damaged).health,point:{x:damaged.x+1,z:damaged.z}};
 if((actorResidence(w)?.homeless))return {kind:'shelter',point:e.prayers?.shrine??e.depot};
 const grave=(e.survival?.memorials??[]).find(m=>m.workerId===w.grievingForId&&memorialOpacity(m,e.time)>0);
 if(grave)return {kind:'return',targetId:grave.workerId,point:{x:grave.x+.8,z:grave.z+.3}};
 const hungry=actorNeeds(w).hunger>=55||e.workers.some(c=>!(actorVitality(c)?.dead)&&(personAge(c)?.child)&&(personKinship(c)?.parents)?.includes(w.id)&&actorNeeds(c).hunger>=55);
 if(hungry&&e.stock.food<1){const n=e.nodes.filter(n=>n.kind==='food'&&resourceGrowth(n)?.state==='growing'&&!resourceCultivation(n)?.needsPlanting).sort((a,b)=>distance(a,w)-distance(b,w))[0];if(n)return {kind:'food',targetId:n.id,growth:resourceGrowth(n)?.growth,point:{x:n.x+1,z:n.z+.5}}}
 if(actorNeeds(w).social<25&&(actorRomance(w)?.sweetheartId)==null)return {kind:'company',population:e.workers.filter(w=>!(actorVitality(w)?.dead)).length,point:e.prayers?.shrine??e.depot};
 return null;
}
function answered(world,w,p){
 const e=world.resource('Village');
 if(p.kind==='repair'){const h=e.life.homes.find(h=>h.id===p.targetId);return h&&!(structuralCondition(h)?.destroyed)&&((structuralCondition(h)?.health)>(p.health??0)+12||e.stock.wood>0);}
 if(p.kind==='rain')return !(e.shelter?.fires??[]).some(f=>f.id===p.targetId&&f.until>e.time)&&!(structuralCondition(e.life.homes.find(h=>h.id===p.targetId))?.destroyed);
 if(p.kind==='shelter')return !(actorResidence(w)?.homeless);
 if(p.kind==='return')return e.workers.some(o=>o.id===p.targetId&&!(actorVitality(o)?.dead));
 if(p.kind==='food'){const n=e.nodes.find(n=>n.id===p.targetId);return e.stock.food>0||resourceGrowth(n)?.growth>(p.growth??0)+.2}
 return (actorRomance(w)?.sweetheartId)!=null||actorNeeds(w).social>=55||e.workers.filter(o=>!(actorVitality(o)?.dead)).length>(p.population??Infinity);
}
export function updatePrayers(world){
 const e=world.resource('Village');
 if(!e.prayers)return;
 for(const w of e.workers){
  const p=(actorPrayer(w)?.request);if((actorVitality(w)?.dead)||!p||p.answeredAt!=null)continue;
  if(answered(world,w,p)){p.answeredAt=e.time;(ensureActorPrayer(w).reliefUntil)=e.time+25;actorNeeds(w).social=Math.min(100,actorNeeds(w).social+12);(ensureActorPrayer(w).memories)=[{kind:p.kind,at:e.time},...((actorPrayer(w)?.memories)??[])].slice(0,4);interruptPrayer(world,w);e.emit('prayer-answered',w,null,{kind:p.kind})}
 }
}
export function handlePrayer(world,w,dt){
 const e=world.resource('Village');
 if(!e.prayers||(actorVitality(w)?.dead))return false;
 if(states.has(w.state)){
  const p=(actorPrayer(w)?.request);
  if(!p||p.answeredAt!=null||e.time>p.deadline||actorNeeds(w).energy<12||actorNeeds(w).hunger>=90){interruptPrayer(world,w);return false}
  if(w.state==='prayer-bound'){const status=e.move(w,dt);if(status==='blocked'){interruptPrayer(world,w);return false}if(status==='arrived'){w.state='praying';(ensureActorPrayer(w).until)=e.time+4;w.facing='back';e.emit('prayer',w,null,{kind:p.kind})}return true}
  if(e.time>=(actorPrayer(w)?.until)){interruptPrayer(world,w);(ensureActorPrayer(w).after)=e.time+65}return true;
 }
 if(w.state!=='idle'||(personAge(w)?.child)||(actorInterior(w)?.inside)||w.cargo||actorNeeds(w).energy<18||actorNeeds(w).hunger>=90||w.wait>0||actorSocialActivity(w)?.partnerId!=null||supportParticipant(w)?.partnerId!=null||dangerAwareness(w)?.partnerId!=null||careParticipant(w)?.partnerId!=null||watchAssigned(e.life.watch,w)||((actorPrayer(w)?.after)??0)>e.time)return false;
 (ensureActorPrayer(w).after)=e.time+8;const need=prayerNeed(world,w);if(!need)return false;
 const route=standingRoute(e,w,need.point);if(!route||dangerRisk(e,w,need.point,route))return false;
 releaseWork(e,w);(ensureActorPrayer(w).request)={...need,askedAt:e.time,deadline:e.time+25};w.state='prayer-bound';w.route=route;w.wait=0;return true;
}
