import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock} from "../life-state.js";
import {actorSocialActivity,actorSleep} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {ensureActorFaith,actorOffering,ensureActorOffering} from '../religion-actors.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop} from '../../village-survival.js';
import {personAge} from '../person-age.js';
import {watchParticipant} from '../watch-participants.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {supportParticipant} from '../support-participants.js';
import {supportCloseness} from '../../village-support.js';
import {dangerAwareness} from '../danger-entities.js';
import {defineGameData} from '../../game-data.js';
import {knownPeople} from '../../village-people.js';
import {noticeFavor,settleJealousy} from '../../village-jealousy.js';
import {temperatureOf,isCold,isHot} from '../../village-temperature.js';
import {DAY_LENGTH_SECONDS,isBedtime} from '../../village-time.js';
import {standingRoute} from '../../village-spacing.js';
export const FAITH_RULES=defineGameData('village-faith.FAITH_RULES',{initialWishes:6,maxWishes:9,offeringCooldown:75,blessingWindow:120});
const clamp=n=>Math.max(0,Math.min(1,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const offeringStates=new Set(['offering-fetch','offering-bound','offering']);
export function faithPerson(world,id,w){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
return (ensureActorFaith(w).belief)??={value:.58,gratitude:0,blessings:[],lastOfferedAt:-DAY_LENGTH_SECONDS,offerAfter:0,lastHarmAt:-Infinity,nextHardshipAt:0,complacency:(actorPersonality(w)?.trait)==='blunt'?.85:(actorPersonality(w)?.trait)==='playful'?.6:(actorPersonality(w)?.trait)==='outgoing'?.35:.08}
}
export function faithChange(world,id,w,amount,reason){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
if(!w||(actorVitality(w)?.dead))return;const f=faithPerson(world,id,w),before=f.value;f.value=clamp(f.value+amount);if(amount<0)f.gratitude=Math.max(0,f.gratitude+amount);if(Math.abs(f.value-before)>.015&&(f.cueAt??0)<=state.economy.time){state.economy.emit(amount>0?'faith-grateful':'faith-doubt',w,null,{reason});f.cueAt=state.economy.time+12}
}
export function faithBenefit(world,id,w,strength,reason){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  if(!w||(actorVitality(w)?.dead))return;const e=state.economy,f=faithPerson(world,id,w);
  // A blessing cannot erase a recent deliberate injury or manufacture devotion.
  if(e.time-f.lastHarmAt<FAITH_RULES.blessingWindow)return;
  f.blessings=f.blessings.filter(t=>e.time-t<FAITH_RULES.blessingWindow);f.blessings.push(e.time);f.blessings=f.blessings.slice(-8);
  if(f.blessings.length>=3&&e.random()<f.complacency){faithChange(world,id,w,-.07,'taking-help-for-granted');return}
  const gain=.05+strength*.12;faithChange(world,id,w,gain,reason);f.gratitude=clamp(f.gratitude+strength*.6);f.offerAfter=Math.max(f.offerAfter,e.time+3+e.random()*7);
 
}
export function faithWitnesses(world,id,p){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
return state.economy.workers.filter(w=>!(actorVitality(w)?.dead)&&(distance(w,p)<12||supportCloseness(state.economy,w,p)>0))
}
export function faithBeforeWish(world,id,kind,target,check){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  const e=state.economy,p=check.actor??check.plant??check.point??check.fire;
  return {kind,targetKind:target.kind,p:p?{x:p.x,z:p.z}:null,actorId:check.actor?.id,health:(actorVitality(check.actor)?.health),amount:check.maxHealth-((actorVitality(check.actor)?.health)??0),hungry:e.stock.food<Math.max(2,e.workers.filter(w=>!(actorVitality(w)?.dead)).length),dry:state.dryFor>45&&(e.ecology?.moisture??0)<.3,raining:state.rain>.2,rainActive:(e.wishes?.rainUntil??0)>e.time,fireDanger:(e.lightning?.fires??[]).some(f=>f.until>e.time),burns:(e.wishes?.burns??[]).filter(b=>b.until>e.time).map(b=>({...b})),pair:check.pair?.map(w=>w.id)};
 
}
export function faithAfterWish(world,id,c,check){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  const e=state.economy;if(state.offeringsEnabled)state.wishes=Math.max(0,state.wishes-1);
  if(check.outcomes?.length&&!check.outcomes.some(o=>o.result?.changed))return;
  noticeFavor(state,c,check);
  const actor=e.workers.find(w=>w.id===c.actorId),harm=(w,amount)=>{if(!w||(actorVitality(w)?.dead))return;faithPerson(world,id,w).lastHarmAt=e.time;faithChange(world,id,w,-amount,'harmful-wish')};
  if(c.kind==='food'&&c.hungry){for(const w of e.workers.filter(w=>!(actorVitality(w)?.dead)))faithBenefit(world,id,w,.45,'food-help');}
  else if(['energy','shield'].includes(c.kind)&&c.targetKind==='villager')faithBenefit(world,id,actor,.6,c.kind==='shield'?'protected':'helped');
  if(c.kind==='life'&&c.targetKind==='villager'){
   faithBenefit(world,id,actor,Math.min(1,c.amount/65),'healed');
   if(c.health<35)for(const w of faithWitnesses(world,id,actor).filter(w=>w!==actor))faithBenefit(world,id,w,.6,'friend-saved');
  }else if(c.kind==='resurrect'){
   faithBenefit(world,id,check.spawned,1,'returned-to-life');for(const w of faithWitnesses(world,id,check.spawned).filter(w=>w!==check.spawned))faithBenefit(world,id,w,.8,'friend-returned');
  }else if(c.kind==='life'&&check.plant&&c.hungry){for(const w of faithWitnesses(world,id,check.plant))faithBenefit(world,id,w,.45,'food-help')}
  else if(c.kind==='rain'&&!c.raining&&!c.rainActive&&(c.dry||c.fireDanger)){
   for(const w of e.workers.filter(w=>!(actorVitality(w)?.dead))){
    const harmed=c.burns.some(b=>b.kind==='villager'&&b.id===w.id);
    if(!harmed)faithBenefit(world,id,w,c.fireDanger?.85:.5,c.fireDanger?'fire-stopped':'rain-after-drought');
   }
  }else if(c.kind==='skull'&&c.targetKind!=='villager'){
   for(const w of faithWitnesses(world,id,c.p).filter(w=>w.localAlarmUntil>e.time||w.state==='defending'||dangerAwareness(w)?.memories?.length))faithBenefit(world,id,w,.8,'danger-ended');
  }else if(c.kind==='skull'&&c.targetKind==='villager'){
   for(const w of faithWitnesses(world,id,{...actor,...c.p}))harm(w,.3);
  }else if(c.kind==='fire'&&c.targetKind==='villager'){
   for(const w of faithWitnesses(world,id,actor))harm(w,w===actor?.4:.22);
  }else if(c.kind==='heartbreak'){
   for(const id of c.pair??[])harm(e.workers.find(w=>w.id===id),.23);
  }else if(c.kind==='fire'&&['tree','crop','mushroom'].includes(c.targetKind)){
   for(const w of faithWitnesses(world,id,c.p))harm(w,c.targetKind==='crop'&&c.hungry?.15:.06);
  }else if(c.kind==='fire'&&check.fire){for(const w of faithWitnesses(world,id,check.fire).filter(w=>isCold(w)))faithBenefit(world,id,w,.45,'warmth')}
 
}
export function faithNotice(world,id,event){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  const e=state.economy,w=knownPeople(e).find(w=>w.id===event.workerId);
  if(w&&(event.type==='died'||event.type==='outsider-died'))for(const p of e.workers.filter(p=>!(actorVitality(p)?.dead))){const close=supportCloseness(e,p,w)??0;if(event.type==='outsider-died'&&!close)continue;faithChange(world,id,p,-(close?.16:.045),'loss');if(event.cause==='god-wish')faithPerson(world,id,p).lastHarmAt=e.time}
  if(event.type==='lightning-ignited'||event.type==='heat-ignited')for(const p of e.workers.filter(p=>!(actorVitality(p)?.dead)&&distance(p,event)<10)){const f=faithPerson(world,id,p);if(e.time>=f.nextHardshipAt){faithChange(world,id,p,-.04,'woodland-fire');f.nextHardshipAt=e.time+40}}
  if(event.type==='starving'||event.type==='hurt'&&event.cause==='attack'){
   if(!w)return;const f=faithPerson(world,id,w);if(e.time>=f.nextHardshipAt){faithChange(world,id,w,event.type==='starving'?-.09:-.045,'hardship');f.nextHardshipAt=e.time+40}
  }
 
}
export function faithAvailable(world,id,w){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
const e=state.economy;return !(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&(actorVitality(w)?.health)>=48&&actorNeeds(w).energy>38&&actorNeeds(w).hunger<65&&!w.cargo&&actorSocialActivity(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&dangerAwareness(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&!watchAssigned(e.life.watch,w)&&!(watchParticipant(w)?.sleepDebt>0)&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)
}
export function faithCancelDisabledOfferings(world,id){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
if(!state.offeringsEnabled)for(const w of state.economy.workers)if((actorOffering(w)?.kind)||(actorOffering(w)?.cargo)||offeringStates.has(w.state))faithInterrupt(world,id,w)
}
export function faithUpdate(world,id,dt,weather){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  faithCancelDisabledOfferings(world,id);settleJealousy(state.economy,dt);
  const e=state.economy;state.rain=weather?.rain??0;state.dryFor=state.rain>.2?0:state.dryFor+dt;
  if(e.time<state.nextCheck)return;state.nextCheck=e.time+5;
  for(const w of e.workers){const f=faithPerson(world,id,w);if((actorVitality(w)?.dead))continue;f.blessings=f.blessings.filter(t=>e.time-t<FAITH_RULES.blessingWindow);
   // A sustained peaceful life can slowly rebuild trust after ordinary hardship.
   if((actorVitality(w)?.health)>75&&actorNeeds(w).hunger<60&&e.time-f.lastHarmAt>DAY_LENGTH_SECONDS&&!e.raids?.enemies.some(r=>!(actorVitality(r)?.dead)&&!r.gone)&&!(w.localAlarmUntil>e.time))f.value=clamp(f.value+.001);
  }
 
}
export function faithStart(world,id,w){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  if(!state.offeringsEnabled)return false;
  const e=state.economy,f=faithPerson(world,id,w);if(!state.shrine||w.state!=='idle'||!faithAvailable(world,id,w)||state.wishes>=FAITH_RULES.maxWishes||e.workers.some(p=>offeringStates.has(p.state))||e.time<f.offerAfter||e.time-f.lastOfferedAt<FAITH_RULES.offeringCooldown)return false;
  if(f.value<.32||f.gratitude<.2&&(f.value<.55||e.time-f.lastOfferedAt<DAY_LENGTH_SECONDS))return false;
  f.offerAfter=e.time+10+e.random()*10;
  if(e.random()>f.value)return false;
  const living=e.workers.filter(p=>!(actorVitality(p)?.dead)).length,kind=['wood','stone','food'].find(k=>e.stock[k]>(k==='food'?Math.max(4,living*2):2));if(!kind)return false;
  const shrineRoute=standingRoute(e,w,state.shrine),route=standingRoute(e,w,w.store??e.depot);if(!shrineRoute||!route)return false;
  releaseWork(e,w);w.state='offering-fetch';w.route=route;(ensureActorOffering(w).kind)=kind;(ensureActorOffering(w).deadline)=e.time+65;w.wait=0;return true;
 
}
export function faithInterrupt(world,id,w){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
if((actorOffering(w)?.cargo)){survivalDrop(state.economy.survival,w,(actorOffering(w)?.cargo).kind,(actorOffering(w)?.cargo).amount);(ensureActorOffering(w).cargo)=null}delete actorOffering(w)?.kind;if(offeringStates.has(w.state))releaseWork(state.economy,w);faithPerson(world,id,w).offerAfter=state.economy.time+15
}
export function faithHandle(world,id,w,dt){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');

  if(!state.offeringsEnabled){if((actorOffering(w)?.kind)||(actorOffering(w)?.cargo)||offeringStates.has(w.state))faithInterrupt(world,id,w);return false}
  const e=state.economy;if(!offeringStates.has(w.state))return faithStart(world,id,w);
  if(!faithAvailable(world,id,w)||e.time>(actorOffering(w)?.deadline)||state.wishes>=FAITH_RULES.maxWishes){faithInterrupt(world,id,w);return false}
  if(w.state==='offering'){
   if(e.time<(actorOffering(w)?.until))return true;
   const cargo=(actorOffering(w)?.cargo);if(cargo){const f=faithPerson(world,id,w);state.wishes=Math.min(FAITH_RULES.maxWishes,state.wishes+1);state.offerings++;state.lastOfferingAt=e.time;f.lastOfferedAt=e.time;f.gratitude=Math.max(0,f.gratitude-.6);e.emit('offering-made',w,null,{...cargo,wishes:1,x:state.shrine.x,z:state.shrine.z});(ensureActorOffering(w).cargo)=null}delete actorOffering(w)?.kind;releaseWork(e,w);return true;
  }
  const status=e.move(w,dt);if(status==='blocked'){faithInterrupt(world,id,w);return true}if(status!=='arrived')return true;
  if(w.state==='offering-fetch'){
   const kind=(actorOffering(w)?.kind),min=kind==='food'?Math.max(4,e.workers.filter(p=>!(actorVitality(p)?.dead)).length*2):2;
   if(e.stock[kind]<=min){faithInterrupt(world,id,w);return true}
   const route=standingRoute(e,w,state.shrine);if(!route){faithInterrupt(world,id,w);return true}
   e.stock[kind]--;(ensureActorOffering(w).cargo)={kind,amount:1};w.state='offering-bound';w.route=route;e.emit('offering-taken',w,null,{kind,amount:1});
  }else{w.state='offering';(ensureActorOffering(w).until)=e.time+2.2;w.facing='back';e.emit('offering-prayer',w)}return true;
 
}
export function faithSnapshot(world,id){const state=world.get(id,'FaithState');if(!state)throw Error('Missing FaithState');
return {wishes:state.wishes,offerings:state.offerings,people:state.economy.workers.map(w=>({id:w.id,...faithPerson(world,id,w)}))}
}
