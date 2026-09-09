import {actorTradeTask,ensureActorTradeTask} from './../actor-trade-task.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock,lifeMealAccounting} from "../life-state.js";
import {actorSocialActivity,actorSleep} from "../daily-activity-actors.js";
import {personKinship} from '../person-kinship.js';
import {recoveringVillager} from '../../village-community-recovery.js';
import {actorMeal} from '../actor-meal.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop} from '../../village-survival.js';
import {lifeRelation,lifeRest,lifeIdle,lifeCancelSocial} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorRomance,ensureActorRomance} from '../actor-romance.js';
import {actorFeelings,ensureActorFeelings} from '../actor-feelings.js';
import {memoryFeeling,memoryRemember} from '../../village-memory.js';
import {watchParticipant} from '../watch-participants.js';
import {watchAssigned} from '../../village-watch.js';
import {slimeClear} from '../../village-slimes.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {supportParticipant,ensureSupportParticipant} from '../support-participants.js';
import {dangerAwareness} from '../danger-entities.js';
import {supportVisits} from '../../ecs/care-entities.js';

import {activeHeartbreak,refusingFood,comfortHeartbreak,sociallyWithdrawn} from '../../village-feelings.js';
import {rivalThreats} from '../../village-rival.js';
import {standingRoom,standingRoute} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {SUPPORT_RULES} from '../../village-support.js';
const states=new Set(['support-fetch','support-bound','supporting']);
const clamp=n=>Math.max(0,Math.min(100,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const restingHome=w=>(actorInterior(w)?.inside)&&w.state==='sheltering'&&w.recoveringFromCombat;
const position=w=>restingHome(w)?(actorInterior(w)?.insideAt)??(actorResidence(w)?.home):w;
export function supportCloseness(world,a,b){const state=world.resource('Support');

  const e=state.economy,r=lifeRelation(e.life,a.id,b.id);
  if(activeHeartbreak(e,b)?.otherId===a.id)return 0;
  if((actorRomance(a)?.sweetheartId)===b.id||(actorRomance(b)?.sweetheartId)===a.id)return 2;
  const affinity=r?.affinity??0;
  if(affinity<-.3)return 0;
  if(recoveringVillager(e,b))return Math.max(.55,affinity+.6);
  if((personKinship(a)?.parents)?.includes(b.id)||(personKinship(b)?.parents)?.includes(a.id))return 1;
  return affinity>.28?affinity+Math.max(0,memoryFeeling(e.life.memory,a,b))*.25:0;
 
}
export function supportAvailable(world,w){const state=world.resource('Support');

  const e=state.economy;
  return !w.expeditionId&&!sociallyWithdrawn(e,w)&&!e.leadership?.isLeader(w)&&!(actorVitality(w)?.dead)&&!w.divineHeld&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.cargo&&!(actorMeal(w)?.mealCarry)&&!careParticipant(w)?.food&&!(actorConstructionTask(w)?.cargo)&&!(actorTradeTask(w)?.cargo)&&!w.firewood&&!w.firestone&&actorSocialActivity(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&dangerAwareness(w)?.partnerId==null&&!w.spacingRoute?.length&&['idle','outbound'].includes(w.state)&&(actorVitality(w)?.health)>=48&&actorNeeds(w).energy>45&&actorNeeds(w).hunger<55&&!watchAssigned(e.life.watch,w)&&!(watchParticipant(w)?.sleepDebt>0)&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
 
}
export function supportNeed(world,w){const state=world.resource('Support');

  const e=state.economy;
  if(w.expeditionId||(actorVitality(w)?.dead)||w.divineHeld||dangerAwareness(w)?.partnerId!=null||supportParticipant(w)?.partnerId!=null||careParticipant(w)?.partnerId!=null||actorSocialActivity(w)?.partnerId!=null||w.cargo||(actorMeal(w)?.mealCarry)||(supportParticipant(w)?.receiveAfter??0)>e.time||!['idle','following','resting','sheltering','mealbound'].includes(w.state)||(actorInterior(w)?.inside)&&!restingHome(w)||w.state==='sheltering'&&!restingHome(w)||watchAssigned(e.life.watch,w))return null;
  if(!restingHome(w)&&(isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||(watchParticipant(w)?.sleepDebt??0)>0))return null;
  if(activeHeartbreak(e,w)){if(actorNeeds(w).hunger>=48&&e.stock.food>=1)return 'food';if(refusingFood(e,w)||sociallyWithdrawn(e,w))return 'heartbreak';}
  if(!(personAge(w)?.child)&&actorNeeds(w).hunger>=48&&(actorNeeds(w).energy<36||restingHome(w))&&e.stock.food>=1)return 'food';
  if(recoveringVillager(e,w)&&actorNeeds(w).hunger>=48&&e.stock.food>=1)return 'food';
  if(actorNeeds(w).hunger>=85)return null;
  if(recoveringVillager(e,w)&&actorNeeds(w).social<50)return 'reassure';
  if(w.grievingForId!=null&&(actorFeelings(w)?.heartbrokenUntil)>e.time&&w.comfortedLossAt!==w.griefAt)return 'comfort';
  if(w.raidStressUntil>e.time&&w.raidComfortedAt!==w.raidStressAt)return 'reassure';
  if(restingHome(w))return 'visit';
  return null;
 
}
export function supportNearbySpot(world,helper,recipient){const state=world.resource('Support');

  const e=state.economy,p=position(recipient);
  // Stay beside the house entrance, with room for people to come and go.
  const spots=[{x:p.x-1.25,z:p.z+.2},{x:p.x+1.25,z:p.z+.2},{x:p.x,z:p.z+1.3}].sort((a,b)=>distance(helper,a)-distance(helper,b));
  for(const spot of spots){if(!standingRoom(e,helper,spot,recipient))continue;const route=e.route(helper,spot);if(route)return {spot,route}}
  return null;
 
}
export function supportStart(world,w){const state=world.resource('Support');

  const e=state.economy;if(!supportAvailable(world,w)||state.sessions.length>=SUPPORT_RULES.maxVisits||(supportParticipant(w)?.checkAt??0)>e.time||(supportParticipant(w)?.helpAfter??0)>e.time||e.raids?.alarmUntil>e.time)return false;
  ensureSupportParticipant(w).checkAt=e.time+SUPPORT_RULES.interval;
  // Finish urgent food gathering when the communal cupboard is empty.
  if(w.node?.kind==='food'&&e.stock.food<1)return false;
  const candidates=e.workers.filter(p=>p!==w).map(p=>({p,kind:supportNeed(world,p),close:supportCloseness(world,w,p)})).filter(c=>c.kind&&c.close&&distance(w,position(c.p))<=SUPPORT_RULES.range);
  candidates.sort((a,b)=>(b.kind==='food'?3:0)-(a.kind==='food'?3:0)+b.close-a.close+(distance(w,position(a.p))-distance(w,position(b.p)))*.08);
  for(const {p,kind} of candidates.slice(0,3)){
   const destination=supportNearbySpot(world,w,p);if(!destination)continue;
   const route=kind==='food'?standingRoute(e,w,w.store??e.depot):destination.route;if(!route)continue;
   releaseWork(e,w);w.spacingRoute=null;w.state=kind==='food'?'support-fetch':'support-bound';w.route=route;w.wait=0;ensureSupportParticipant(w).partnerId=p.id;ensureSupportParticipant(p).partnerId=w.id;p.spacingRoute=null;
   if(!(actorInterior(p)?.inside)&&p.state!=='resting'){lifeRest(e.life,p)}
   supportVisits(state).add({helper:w,recipient:p,kind,spot:destination.spot,inside:!!(actorInterior(p)?.inside),until:0,deadline:e.time+45,griefAt:p.griefAt});
   return true;
  }
  if(candidates.length)ensureSupportParticipant(w).checkAt=e.time+SUPPORT_RULES.retry;
  return false;
 
}
export function supportCancel(world,s,{completed=false}={}){const state=world.resource('Support');

  const e=state.economy;supportVisits(state).remove(s);
  const {helper:a,recipient:b}=s;
  if(supportParticipant(a)?.food){survivalDrop(e.survival,a,'food',supportParticipant(a)?.food);ensureSupportParticipant(a).food=0}
  ensureSupportParticipant(a).partnerId=ensureSupportParticipant(b).partnerId=null;
  if(states.has(a.state))lifeIdle(e.life,a);
  ensureSupportParticipant(a).helpAfter=e.time+(completed?SUPPORT_RULES.cooldown:SUPPORT_RULES.retry);
  ensureSupportParticipant(b).receiveAfter=e.time+(completed?SUPPORT_RULES.cooldown:SUPPORT_RULES.retry);
 
}
export function supportInterrupt(world,w){const state=world.resource('Support');
for(const s of [...state.sessions])if(s.helper===w||s.recipient===w)supportCancel(world,s)
}
export function supportUpdate(world,dt){const state=world.resource('Support');

  const e=state.economy;
  for(const s of [...state.sessions]){
   const {helper:a,recipient:b}=s;
   if((actorVitality(a)?.dead)||(actorVitality(b)?.dead)||!states.has(a.state)||supportParticipant(a)?.partnerId!==b.id||supportParticipant(b)?.partnerId!==a.id||!['resting','sheltering'].includes(b.state)||!!(actorInterior(b)?.inside)!==s.inside||s.inside&&!restingHome(b)||e.time>s.deadline||actorNeeds(a).hunger>=75||actorNeeds(a).energy<25||actorNeeds(b).hunger>=90&&!['food','heartbreak'].includes(s.kind)||watchAssigned(e.life.watch,a)||watchAssigned(e.life.watch,b)||isBedtime(lifeClock(e.life).hour,actorSleep(a)?.bedtime,actorSleep(a)?.wakeHour)||!s.inside&&isBedtime(lifeClock(e.life).hour,actorSleep(b)?.bedtime,actorSleep(b)?.wakeHour)||e.raids?.alarmUntil>e.time||s.until&&distance(a,position(b))>1.8){supportCancel(world,s);continue}
   if(!s.until)continue;
   actorNeeds(a).social=clamp(actorNeeds(a).social+dt*2);actorNeeds(b).social=clamp(actorNeeds(b).social+dt*4);
   if(e.time<s.until)continue;
   if(['food','heartbreak'].includes(s.kind)&&activeHeartbreak(e,b)){comfortHeartbreak(e,b,a);state.comforts++;}
   if(supportParticipant(a)?.food){
    const hungerBefore=actorNeeds(b).hunger;ensureSupportParticipant(a).food=0;actorNeeds(b).hunger=clamp(actorNeeds(b).hunger-62);actorNeeds(b).energy=clamp(actorNeeds(b).energy+7);lifeMealAccounting(e.life).consumed++;state.meals++;
    memoryRemember(e.life.memory,b,a,'fed');e.emit('friend-fed',a,null,{partnerId:b.id,amount:1,hungerBefore});
   }
   const comfort=s.kind==='comfort'&&b.griefAt===s.griefAt;
   if(comfort){b.comfortedLossAt=b.griefAt;ensureActorFeelings(b).heartbrokenUntil=Math.min((actorFeelings(b)?.heartbrokenUntil),e.time+Math.max(12,((actorFeelings(b)?.heartbrokenUntil)-e.time)*.65));state.comforts++}
   if(s.kind==='reassure'){b.raidComfortedAt=b.raidStressAt??e.time;b.raidStressUntil=e.time+Math.max(0,((b.raidStressUntil??e.time)-e.time)*.35);actorNeeds(b).social=clamp(actorNeeds(b).social+10);}
   if(s.kind==='visit')state.visits++;
   memoryRemember(e.life.memory,b,a,comfort||s.kind==='heartbreak'?'comforted':s.kind==='reassure'?'reassured':'cared');memoryRemember(e.life.memory,a,b,'time-together');
   const r=lifeRelation(e.life,a.id,b.id);if(r)r.affinity=Math.min(1,r.affinity+.045);
   e.emit('support-finished',a,null,{partnerId:b.id,kind:s.kind,inside:s.inside});supportCancel(world,s,{completed:true});
  }
 
}
export function supportHandle(world,w,dt){const state=world.resource('Support');

  const e=state.economy,s=state.sessions.find(s=>s.helper===w||s.recipient===w);
  if(!s){if(states.has(w.state)){lifeIdle(e.life,w);return true}return supportStart(world,w)}
  if(s.recipient===w)return true;
  if(w.state==='supporting')return true;
  const status=e.move(w,dt);if(status==='blocked'){supportCancel(world,s);return true}if(status!=='arrived')return true;
  if(w.state==='support-fetch'){
   const destination=supportNearbySpot(world,w,s.recipient);
   if(e.stock.food<1||!destination){supportCancel(world,s);return true}
   e.stock.food--;ensureSupportParticipant(w).food=1;w.route=destination.route;s.spot=destination.spot;w.state='support-bound';return true;
  }
  if(distance(w,position(s.recipient))>1.8){supportCancel(world,s);return true}
  w.state='supporting';w.facing=position(s.recipient).x<w.x?'left':'right';
  if(!s.inside)s.recipient.facing=w.x<s.recipient.x?'left':'right';
  s.until=e.time+SUPPORT_RULES.visitSeconds;e.emit('support-start',w,null,{partnerId:s.recipient.id,kind:s.kind,inside:s.inside});return true;
 
}
export function supportBereave(world,lost){const state=world.resource('Support');

  const e=state.economy;
  for(const w of e.workers){
   if(w===lost||(actorVitality(w)?.dead)||!supportCloseness(world,w,lost))continue;
   for(const s of [...e.life.sessions])if(s.workers.includes(w))lifeCancelSocial(e.life,s);
   if((actorRomance(w)?.sweetheartId)===lost.id)ensureActorRomance(w).sweetheartId=null;
   w.grievingForId=lost.id;w.griefAt=e.time;ensureActorFeelings(w).heartbrokenUntil=e.time+SUPPORT_RULES.griefSeconds;ensureSupportParticipant(w).receiveAfter=0;
   if(w.state==='idle'&&!(actorInterior(w)?.inside)&&!w.cargo&&!watchAssigned(e.life.watch,w))lifeRest(e.life,w);
   e.emit('bereaved',w,null,{lostId:lost.id});
  }
 
}
export function supportProtection(world,w){const state=world.resource('Support');

  const e=state.economy;
  if((actorVitality(w)?.dead)||(personAge(w)?.child)||(actorInterior(w)?.inside)||(actorVitality(w)?.health)<48||w.recoveringFromCombat||actorNeeds(w).energy<20)return null;
  if(!e.slimes?.enemies.length&&!e.raids?.enemies.length&&!rivalThreats(e).length)return null;
  let best=null,score=-Infinity;
  for(const enemy of [...(e.slimes?.enemies??[]),...(e.raids?.enemies??[]),...rivalThreats(e)]){
   if((actorVitality(enemy)?.dead)||enemy.gone||!['chase','attacking','defending','rival-raiding'].includes(enemy.state)||distance(w,enemy)>SUPPORT_RULES.defendRange)continue;
   const friend=e.workers.find(p=>p.id===(enemy.species==='slime'?enemy.targetId:enemy.victimId));
   if(!friend||friend===w||(actorVitality(friend)?.dead)||(actorInterior(friend)?.inside))continue;
   const close=supportCloseness(world,w,friend);if(!close||distance(w,friend)>SUPPORT_RULES.defendRange)continue;
   if(enemy.species==='slime'&&!slimeClear(e.slimes,enemy,w,.16))continue;
   const value=close*4-distance(w,enemy)*.2+((actorVitality(friend)?.health)<48?2:0);
   if(value>score){score=value;best={enemy,friend}}
  }
  return best;
 
}
export function supportProtect(world,w,{enemy,friend}){const state=world.resource('Support');

  w.protectingId=friend.id;w.protectionEnemyId=enemy.id;w.protectionUntil=state.economy.time+12;
 
}
export function supportDefended(world,w,enemy){const state=world.resource('Support');

  const e=state.economy,friend=e.workers.find(p=>p.id===w.protectingId);
  if(!friend||(actorVitality(friend)?.dead)||enemy.id!==w.protectionEnemyId||e.time>w.protectionUntil)return;
  w.protectingId=null;
  if((w.protectionCueAt??0)>e.time)return;
  w.protectionCueAt=e.time+15;state.defenses++;memoryRemember(e.life.memory,friend,w,'defended');
  const r=lifeRelation(e.life,w.id,friend.id);if(r)r.affinity=Math.min(1,r.affinity+.04);
  e.emit('friend-defended',w,null,{partnerId:friend.id});
 
}
