import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {releaseWork} from "./village-resources.js";
import {personKinship} from './ecs/person-kinship.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalRefuge,survivalInterrupt} from './village-survival.js';
import {lifeRelation} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {memoryRemember} from './village-memory.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {ensureSupportParticipant} from './ecs/support-participants.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';
import {DOORWAY_DURATION} from './doorway-transition.js';
import {unsafeHome,homePosition} from './village-shelter.js';
import {standingRoute} from './village-spacing.js';
import {recoveryState,recoveryThreats,recoveryDistance as distance} from './village-recovery-state.js';
const escortStates=new Set(['rescue-bound','escorting-child','child-escaping','child-escorted']);
export function interruptEscort(e,w){
 const s=e.recovery;if(!s)return;
 for(const trip of [...s.escorts]){if(trip.helperId!==w.id&&trip.childId!==w.id)continue;s.escorts=s.escorts.filter(t=>t!==trip);for(const id of [trip.helperId,trip.childId]){const p=e.workers.find(p=>p.id===id);if(!p)continue;p.rescueId=null;if(escortStates.has(p.state)){releaseWork(e,p);p.rescueAfter=e.time+3;}}}
}
export function updateEmergency(e){
 if(!e.life||!e.raids)return;const s=recoveryState(e),active=e.raids.enemies.filter(r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&!['fleeing','departing'].includes(r.state)),observed=e.raids.alarmUntil>e.time||active.some(r=>r.spotted);
 if(observed&&!s.crisis){s.crisis={id:s.nextEpisode++,startedAt:e.time,lastDangerAt:e.time,workerIds:[],deaths:e.survival.deaths};}
 if(s.crisis){
  if(active.length||e.raids.alarmUntil>e.time){s.crisis.lastDangerAt=e.time;for(const w of e.workers)if(!(actorVitality(w)?.dead)&&(w.state==='defending'||w.state==='defense-bound'||w.state==='fleeing'||w.state==='sheltering'||escortStates.has(w.state))&&!s.crisis.workerIds.includes(w.id))s.crisis.workerIds.push(w.id);}
  else if(e.time-s.crisis.lastDangerAt>=3){
   const crisis=s.crisis,loss=e.survival.deaths>crisis.deaths||e.life.homes.some(h=>(structuralCondition(h)?.destroyedAt)>=crisis.startedAt);
   s.quietUntil=Math.max(s.quietUntil,e.time+DAY_LENGTH_SECONDS*(loss?1.25:.8));
   for(const w of e.workers.filter(w=>!(actorVitality(w)?.dead)&&crisis.workerIds.includes(w.id))){w.raidStressUntil=e.time+100;w.raidStressAt=e.time;ensureSupportParticipant(w).receiveAfter=0;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-8);}
   s.crisis=null;e.emit('raid-recovery',null,null,{episodeId:crisis.id,workerIds:crisis.workerIds,loss});
  }
 }
 for(const trip of [...s.escorts]){
  const a=e.workers.find(w=>w.id===trip.helperId),b=e.workers.find(w=>w.id===trip.childId),home=e.life.homes.find(h=>h.id===trip.homeId);
  if(!a||!b||(actorVitality(a)?.dead)||(actorVitality(b)?.dead)||a.divineHeld||b.divineHeld||(actorVitality(a)?.health)<28||e.time>trip.deadline||!escortStates.has(a.state)||!escortStates.has(b.state)||home&&unsafeHome(e,home)){interruptEscort(e,a??b??{id:trip.helperId});continue;}
 }
 if(e.time<s.nextEmergencyCheck)return;s.nextEmergencyCheck=e.time+.5;
 const threats=recoveryThreats(e);
 for(const child of e.workers.filter(w=>(personAge(w)?.child)&&!(actorVitality(w)?.dead)&&!w.divineHeld&&!(actorInterior(w)?.inside)&&w.rescueId==null&&(w.rescueAfter??0)<=e.time&&threats.some(r=>distance(r,w)<9))){
  const helper=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!w.divineHeld&&!(actorInterior(w)?.inside)&&!e.leadership?.isLeader(w)&&w.rescueId==null&&(w.rescueAfter??0)<=e.time&&(actorVitality(w)?.health)>=48&&actorNeeds(w).energy>20&&w.ritualId==null&&!w.state.startsWith('revolt-')&&!w.state.startsWith('exile-')&&distance(w,child)<12).sort((a,b)=>((personKinship(child)?.parents)?.includes(b.id)?8:0)-((personKinship(child)?.parents)?.includes(a.id)?8:0)+distance(a,child)-distance(b,child))[0];
  if(!helper)continue;const refuge=survivalRefuge(e.survival,child),meeting=standingRoute(e,helper,{x:child.x+1,z:child.z});if(!refuge||!meeting)continue;
  survivalInterrupt(e.survival,helper);survivalInterrupt(e.survival,child);
  const trip={helperId:helper.id,childId:child.id,homeId:refuge.home?.id??null,point:refuge.point,phase:'meeting',deadline:e.time+40,repathAt:0};s.escorts.push(trip);
  helper.rescueId=child.id;child.rescueId=helper.id;helper.state='rescue-bound';helper.route=meeting;child.state='child-escaping';child.route=refuge.route;helper.wait=child.wait=0;helper.spacingRoute=child.spacingRoute=null;
  helper.decisionReason='Helping '+child.name+' get somewhere safe';child.decisionReason='Getting away with '+helper.name;e.emit('rescue-start',helper,null,{partnerId:child.id});
 }
}
export function handleEmergencyEscort(e,w,dt){
 const trip=e.recovery?.escorts.find(t=>t.helperId===w.id||t.childId===w.id);if(!trip)return false;
 const a=e.workers.find(p=>p.id===trip.helperId),b=e.workers.find(p=>p.id===trip.childId);if(!a||!b)return false;
 if((actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION)return true;
 const complete=()=>{
  const home=e.life.homes.find(h=>h.id===trip.homeId);if(home&&unsafeHome(e,home)){interruptEscort(e,w);return;}
  e.recovery.escorts=e.recovery.escorts.filter(t=>t!==trip);a.rescueId=b.rescueId=null;
  b.state='sheltering';b.route=[];ensureActorInterior(b).inside=!!home;ensureActorInterior(b).insideAt=home??null;ensureActorInterior(b).enteredAt=e.time;b.refuge={home,point:trip.point,route:[]};b.raidStressUntil=e.time+100;b.raidStressAt=e.time;
  memoryRemember(e.life.memory,b,a,'rescued');memoryRemember(e.life.memory,a,b,'protected-child');lifeRelation(e.life,a.id,b.id).affinity=Math.min(1,lifeRelation(e.life,a.id,b.id).affinity+.08);
  releaseWork(e,a);a.rescueAfter=e.time+8;e.recovery.rescued++;e.emit('child-rescued',a,null,{partnerId:b.id});
 };
 if(distance(a,b)<1.9&&trip.phase==='meeting'){trip.phase='escorting';a.state='escorting-child';b.state='child-escorted';a.route=standingRoute(e,a,{x:trip.point.x+1.1,z:trip.point.z})??[];b.route=e.route(b,trip.point)??[];trip.repathAt=e.time+1;}
 if(w===b){
  if(distance(b,trip.point)<.3&&distance(a,b)<2.4){complete();return true;}
  // The child continues escaping while the adult catches up, then stays nearby.
  if(trip.phase==='escorting'&&distance(a,b)>2.5)return true;
  if(!b.route.length&&distance(b,trip.point)>.3)b.route=e.route(b,trip.point)??[];
  if(b.route.length&&e.move(b,dt)==='blocked'){interruptEscort(e,b);return false;}return true;
 }
 if(e.time>=trip.repathAt){trip.repathAt=e.time+.7;const target=trip.phase==='meeting'?{x:b.x+1.1,z:b.z}:{x:trip.point.x+1.1,z:trip.point.z};a.route=standingRoute(e,a,target)??[];}
 if(trip.phase==='escorting'&&distance(a,b)>2.5&&distance(a,trip.point)<distance(b,trip.point))return true;
 if(a.route.length&&e.move(a,dt)==='blocked'){interruptEscort(e,a);return false;}
 return true;
}
