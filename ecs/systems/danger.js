import {actorTradeTask,ensureActorTradeTask} from './../actor-trade-task.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {plotPreparation} from '../farming-state.js';
import {actorFarmingTask} from '../actor-farming-task.js';
import {releaseWork} from "../../village-resources.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceHarvest} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {actorSleep,actorSocialActivity} from "../daily-activity-actors.js";
import {discoveryInterrupt} from '../../village-discovery.js';
import {farmingInterrupt} from '../../village-farming.js';
import {rivalPeople} from '../../rival-roster.js';
import {actorMeal} from '../actor-meal.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeIdle} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {memoryMutual} from '../../village-memory.js';
import {watchParticipant} from '../watch-participants.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {isRivalBeast} from '../../rival-beast.js';
import {supportParticipant} from '../support-participants.js';
import {supportCloseness} from '../../village-support.js';
import {dangerEntities,dangerAwareness,ensureDangerAwareness} from '../danger-entities.js';

import {rivalThreats} from '../../village-rival.js';
import {isBedtime} from '../../village-time.js';
import {standingRoom} from '../../village-spacing.js';
import {DANGER_RULES} from '../../village-danger.js';
const approachStates=new Set(['outbound','replant-bound','farm-bound','recovering','discovery-bound']);
const workStates=new Set(['working','replanting','preparing-plot','planting-plot','discovering']);
const companionStates=new Set(['companion-bound','companion-ready','escort-wait','escorting','escort-guard']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const active=r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&!['fading','fleeing','departing'].includes(r.state);
function segmentDistance(p,a,b){
 const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
 const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)):0;
 return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);
}
export function dangerSourceKey(world,source){const state=world.resource('Danger');

  const e=state.economy;
  if(e.slimes?.enemies.includes(source))return 'slime:'+(source.familyId??source.id);
  if(rivalPeople(e).includes(source)||isRivalBeast(e,source))return 'outsider:'+source.id;
  if(e.raids?.enemies.includes(source))return 'raider:'+source.id;
  return null;
 
}
export function dangerIsActive(world,key){const state=world.resource('Danger');

  const e=state.economy;
  if(key.startsWith('outsider:'))return rivalThreats(e).some(w=>'outsider:'+w.id===key);
  return key.startsWith('slime:')?e.slimes?.enemies.some(r=>active(r)&&'slime:'+(r.familyId??r.id)===key)??false:e.raids?.enemies.some(r=>active(r)&&'raider:'+r.id===key)??false;
 
}
export function dangerRemember(world,w,source){const state=world.resource('Danger');

  if((actorVitality(w)?.dead)||(actorInterior(w)?.inside)||!source)return;
  const key=dangerSourceKey(world,source);if(!key||!dangerIsActive(world,key))return;
  const list=ensureDangerAwareness(state.economy,w).memories??=[],memory=list.find(m=>m.key===key);
  if(memory){memory.attackedAt=state.economy.time;return}
  ensureDangerAwareness(state.economy,w).memories=[{key,x:w.x,z:w.z,radius:DANGER_RULES.radius,attackedAt:state.economy.time},...list].slice(0,DANGER_RULES.memoryLimit);
 
}
export function dangerRisk(world,w,destination,route=[]){const state=world.resource('Danger');

  if(!dangerAwareness(w)?.memories?.length)return null;
  for(const m of dangerAwareness(w)?.memories){
   if(!dangerIsActive(world,m.key))continue;
   if(distance(m,destination)<=m.radius)return m;
   // Leaving a remembered grove is always allowed. Only re-entry/crossing
   // counts, so fear can never block a retreat to food or shelter.
   let from=w,exiting=distance(w,m)<=m.radius;
   for(const to of route){
    if(exiting){if(distance(to,m)>m.radius)exiting=false}
    else if(segmentDistance(m,from,to)<m.radius)return m;
    from=to;
   }
  }
  return null;
 
}
export function dangerRefresh(world,{silent=false}={}){const state=world.resource('Danger');

  const e=state.economy;
  for(const w of e.workers){
   if(!dangerAwareness(w)?.memories?.length)continue;
   const remaining=dangerAwareness(w)?.memories.filter(m=>dangerIsActive(world,m.key));
   if(remaining.length===dangerAwareness(w)?.memories.length)continue;
   state.cleared+=dangerAwareness(w)?.memories.length-remaining.length;ensureDangerAwareness(state.economy,w).memories=remaining;ensureDangerAwareness(state.economy,w).retryAt=0;
   if(w.state==='idle')w.wait=Math.min(w.wait,.5);
   if(!silent&&!(actorVitality(w)?.dead))e.emit('danger-cleared',w);
  }
  for(const trip of [...state.trips])if(!dangerIsActive(world,trip.memory.key))dangerCancel(world,trip,{safe:true});
 
}
export function dangerCapable(world,w,{companion=false}={}){const state=world.resource('Danger');

  const e=state.economy;
  return !w.expeditionId&&!e.leadership?.isLeader(w)&&!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.recoveringFromCombat&&(actorVitality(w)?.health)>=48&&actorNeeds(w).energy>(companion?40:30)&&actorNeeds(w).hunger<(companion?65:85)&&!watchAssigned(e.life.watch,w)&&!(watchParticipant(w)?.sleepDebt>0)&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
 
}
export function dangerCompanion(world,w,leader){const state=world.resource('Danger');

  return w!==leader&&dangerCapable(world,w,{companion:true})&&dangerAwareness(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&actorSocialActivity(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&!w.cargo&&!(actorMeal(w)?.mealCarry)&&!careParticipant(w)?.food&&!supportParticipant(w)?.food&&!w.firestone&&!w.firewood&&!(actorConstructionTask(w)?.cargo)&&!(actorTradeTask(w)?.cargo)&&!w.spacingRoute?.length&&['idle','outbound'].includes(w.state)&&supportCloseness(state.economy,leader,w)>0&&distance(w,leader)<DANGER_RULES.companionRange;
 
}
export function dangerBeside(world,w,peer,{safe=false}={}){const state=world.resource('Danger');

  const e=state.economy;
  const spots=[{x:peer.x-1.25,z:peer.z},{x:peer.x+1.25,z:peer.z},{x:peer.x,z:peer.z+1.25},{x:peer.x,z:peer.z-1.25}].sort((a,b)=>distance(w,a)-distance(w,b));
  for(const spot of spots){
   if(!standingRoom(e,w,spot,peer))continue;
   const route=e.route(w,spot);if(!route||safe&&dangerRisk(world,w,spot,route))continue;
   return route;
  }
  return null;
 
}
export function dangerAbandon(world,w){const state=world.resource('Danger');

  const e=state.economy;
  ((domainState)=>domainState==null?undefined:(discoveryInterrupt(domainState,w)))(e.discovery);
  if(w.recoveryDrop){w.recoveryDrop.reservedBy=null;w.recoveryDrop=null}
  if(actorFarmingTask(w)?.plotId||resourceCultivation(w.node)?.needsPlanting)((domainState)=>domainState==null?undefined:(farmingInterrupt(domainState,w)))(e.farming);
  releaseWork(e,w);if((actorVitality(w)?.dead))w.state='dead';w.spacingRoute=null;ensureDangerAwareness(state.economy,w).retryAt=e.time+DANGER_RULES.retry;w.wait=DANGER_RULES.retry;
 
}
export function dangerRequest(world,w,memory){const state=world.resource('Danger');

  const e=state.economy,goal=w.route.at(-1);if(!goal)return false;
  const candidates=e.workers.filter(p=>dangerCompanion(world,p,w)).sort((a,b)=>supportCloseness(e,w,b)-supportCloseness(e,w,a)+(distance(w,a)-distance(w,b))*.06);
  for(const buddy of candidates.slice(0,3)){
   const route=dangerBeside(world,w,buddy,{safe:true});if(!route)continue;
   const trip={leader:w,buddy,memory,goal:{...goal},resumeState:w.state,phase:'meeting',until:0,deadline:e.time+DANGER_RULES.tripTimeout,repathAt:0,arrived:false};
   releaseWork(e,buddy);buddy.state='escort-wait';buddy.wait=0;ensureDangerAwareness(state.economy,buddy).partnerId=w.id;ensureDangerAwareness(state.economy,w).partnerId=buddy.id;w.route=route;w.state='companion-bound';w.spacingRoute=buddy.spacingRoute=null;
   dangerEntities(state).trips.add(trip);e.emit('companion-request',w,null,{partnerId:buddy.id});return true;
  }
  if((dangerAwareness(w)?.cueAt??0)<=e.time){e.emit('danger-hesitate',w);ensureDangerAwareness(state.economy,w).cueAt=e.time+20}
  return false;
 
}
export function dangerCancel(world,trip,{safe=false,completed=false}={}){const state=world.resource('Danger');

  const e=state.economy,{leader,buddy}=trip;dangerEntities(state).trips.remove(trip);ensureDangerAwareness(state.economy,leader).partnerId=ensureDangerAwareness(state.economy,buddy).partnerId=null;
  if(companionStates.has(buddy.state))lifeIdle(e.life,buddy);
  if(companionStates.has(leader.state)){
   if(safe&&!(actorVitality(leader)?.dead)){
    const route=e.route(leader,trip.goal);
    if(route){leader.route=route;leader.state=trip.resumeState;leader.wait=0;return}
   }
   dangerAbandon(world,leader);
  }else if(!safe&&!completed&&(approachStates.has(leader.state)||workStates.has(leader.state)))dangerAbandon(world,leader);
 
}
export function dangerInterrupt(world,w){const state=world.resource('Danger');
for(const t of [...state.trips])if(t.leader===w||t.buddy===w)dangerCancel(world,t)
}
export function dangerUpdate(world){const state=world.resource('Danger');

  const e=state.economy;
  if(e.time>=state.nextCheck){state.nextCheck=e.time+.5;dangerRefresh(world)}
  for(const t of [...state.trips]){
   const {leader:a,buddy:b}=t;
   if(!dangerCapable(world,a)||!dangerCapable(world,b,{companion:true})||e.time>t.deadline||!companionStates.has(b.state)){dangerCancel(world,t);continue}
   if(t.phase==='travelling'&&!t.arrived&&a.cargo&&distance(a,b)<=DANGER_RULES.maxSeparation)dangerArrive(world,t);
   const ownsTask=a.discoveryId&&e.discovery?.chests.some(c=>c.id===a.discoveryId&&c.reservedBy===a.id)||a.recoveryDrop?.reservedBy===a.id||resourceHarvest(a.node)?.reservedBy===a.id||actorFarmingTask(a)?.plotId&&e.farming?.plots.some(p=>p.id===actorFarmingTask(a)?.plotId&&plotPreparation(p).reservedBy===a.id);
   if(!ownsTask||!companionStates.has(a.state)&&!approachStates.has(a.state)&&!workStates.has(a.state)){dangerCancel(world,t,{completed:!!a.cargo||a.state==='idle'});continue}
   if(t.phase==='reassuring'&&e.time>=t.until){
    const route=e.route(a,t.goal);if(!route){dangerCancel(world,t);continue}
    a.state=t.resumeState;a.route=route;a.wait=0;b.state='escorting';t.phase='travelling';e.emit('companion-ready',a,null,{partnerId:b.id});
   }
   if(t.phase==='travelling'&&!t.arrived&&workStates.has(a.state)&&distance(a,b)<=DANGER_RULES.maxSeparation){
    dangerArrive(world,t);
   }
  }
 
}
export function dangerArrive(world,t){const state=world.resource('Danger');

  t.arrived=true;state.accompanied++;const e=state.economy;
  memoryMutual(e.life.memory,t.leader,t.buddy,'went-together',.035);e.emit('companions-arrived',t.leader,null,{partnerId:t.buddy.id});
 
}
export function dangerHandle(world,w,dt){const state=world.resource('Danger');

  const e=state.economy,trip=state.trips.find(t=>t.leader===w||t.buddy===w);
  if(!trip){
   if(companionStates.has(w.state)){dangerAbandon(world,w);return true}
   if(!approachStates.has(w.state)||!w.route.length)return false;
   const memory=dangerRisk(world,w,w.route.at(-1),w.route);if(!memory)return false;
   if((dangerAwareness(w)?.retryAt??0)>e.time||!dangerCapable(world,w)||!dangerRequest(world,w,memory))dangerAbandon(world,w);
   return true;
  }
  const {leader:a,buddy:b}=trip;
  if(w===a){
   if(trip.phase==='meeting'){
    const status=e.move(w,dt);if(status==='blocked'){dangerCancel(world,trip);return true}
    if(status==='arrived'){
     if(distance(a,b)>1.7){dangerCancel(world,trip);return true}
     a.state='companion-ready';a.facing=b.x<a.x?'left':'right';b.facing=a.x<b.x?'left':'right';trip.phase='reassuring';trip.until=e.time+DANGER_RULES.meetingSeconds;
    }return true;
   }
   if(trip.phase==='reassuring')return true;
   // Wait for the escort instead of walking into the remembered place alone.
   return distance(a,b)>DANGER_RULES.maxSeparation;
  }
  if(trip.phase!=='travelling')return true;
  if(distance(a,b)>1.6){
   b.state='escorting';
   if(e.time>=trip.repathAt){trip.repathAt=e.time+.75;b.route=dangerBeside(world,b,a)??[];if(!b.route.length){dangerCancel(world,trip);return true}}
   if(b.route.length&&e.move(b,dt)==='blocked'){dangerCancel(world,trip);return true}
  }else{b.route=[];b.state='escort-guard';b.facing=['left','front','right'][Math.floor(e.time/2)%3]}
  return true;
 
}
