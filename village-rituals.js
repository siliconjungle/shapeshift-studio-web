import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {releaseWork} from "./village-resources.js";
import {lifeClock} from "./ecs/life-state.js";
import {actorSleep} from "./ecs/daily-activity-actors.js";
import {storyRitualSelection,storyRitualStarted} from './village-story-politics.js';
import {storyHidden,refusesStoryAttack} from './village-story-state.js';
import {beastsRitualCompleted} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt,survivalDrop,survivalDamage} from './village-survival.js';
import {lifeRelation} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {actorRomance} from './ecs/actor-romance.js';
import {watchAssigned} from './village-watch.js';
import {actorNeeds} from './ecs/actor-needs.js';

import {rivalPeople,rivalFor} from './rival-roster.js';
import {civilisationAttitude} from './village-diplomacy.js';
import {defineGameData} from './game-data.js';
import {knownPeople} from './village-people.js';
import {detainRivalForRitual,releaseRivalFromRitual} from './village-rival.js';
import {ageWorkRate} from './village-age.js';
import {jealousAccusation,recordJealousAccusation} from './village-jealousy.js';
import {ritualPostPoint} from './ritual-pose.js';
import {standingRoute} from './village-spacing.js';
import {isBedtime} from './village-time.js';

export const RITUAL_RULES=defineGameData('village-rituals.RITUAL_RULES',{wood:8,load:3,strikes:4,cooldown:90,checkSeconds:25,minimumChance:.2,supportChance:.4,revoltChance:.6,burnSeconds:12,extraVictimChance:.07,thirdVictimChance:.015,outsiderChance:.35,hostileReputation:-.45});
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled;
const states=new Set(['ritual-captive','ritual-fetch','ritual-deliver','ritual-building','ritual-victim-bound','ritual-bound','ritual-leader-bound','ritual-presiding','ritual-attend-bound','ritual-attending']);

// A ritual upgrades the existing paid-for stone campfire. Extra wood is
// physically hauled, the stake is built, and fire is required for ignition.
export class VillageRituals{
 constructor(e,leadership){this.economy=e;this.leadership=leadership;this.active=null;this.nextCheck=90;this.nextId=0;this.completed=0;this.sacrificed=0;this.woodUsed=0;this.assigning=false;}
 participants(r=this.active){return r?[r.leaderId,...r.victimIds,...r.supporterIds,r.builderId].filter(id=>id!=null):[];}
 worker(id){return knownPeople(this.economy).find(w=>w.id===id);}
 committed(w){return this.active&&this.active.stage!=='embers'&&w?.ritualId===this.active.id&&states.has(w.state);}
 attemptChance(){return RITUAL_RULES.minimumChance+RITUAL_RULES.supportChance*this.leadership.support;}
 start(){
  const e=this.economy,leader=this.leadership.leader,fire=e.campfire,adults=e.workers.filter(w=>alive(w)&&!(personAge(w)?.child));
  if(this.active||this.leadership.revolt||!leader||leader.leaderTrait!=='zealot'||!fire?.built||!fire.lit||e.stock.wood<RITUAL_RULES.wood||e.stock.food<adults.length)return false;
  const eligible=e.workers.filter(w=>alive(w)&&w!==leader&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.cargo&&!w.ritualCargo&&!watchAssigned(e.life.watch,w)&&(actorVitality(w)?.health)>35&&!storyHidden(e,w)&&!refusesStoryAttack(e,leader,w)).sort((a,b)=>this.leadership.standing(a)-this.leadership.standing(b));
  const outsiders=rivalPeople(e).filter(w=>civilisationAttitude(e,rivalFor(e,w))<=RITUAL_RULES.hostileReputation).filter(w=>alive(w)&&w.visit&&!w.gone&&!(actorInterior(w)?.inside)&&!w.divineHeld&&w.ritualId==null&&w.visit.stage!=='leaving'&&Math.hypot(w.x-fire.x,w.z-fire.z)<9&&(w.visit.kind!=='raid'||(actorVitality(w)?.health)<=35)&&(actorRomance(leader)?.sweetheartId)!==w.id&&(actorRomance(w)?.sweetheartId)!==leader.id&&(lifeRelation(e.life,leader.id,w.id)?.affinity??0)<.28&&!e.workers.some(p=>p.rivalJourney?.escortId===w.id)&&e.route(w,{x:fire.x,z:fire.z+1.05})).sort((a,b)=>(lifeRelation(e.life,leader.id,a.id)?.affinity??0)-(lifeRelation(e.life,leader.id,b.id)?.affinity??0));
  const storyChoice=storyRitualSelection(e,leader,[...eligible,...outsiders]);
  if(storyChoice&&(!storyChoice.victims.length||!storyChoice.supporters.length))return false;
  const outsider=!storyChoice&&outsiders.length&&e.random()<RITUAL_RULES.outsiderChance?outsiders[0]:null;
  const accusation=jealousAccusation(e,leader,eligible);if(accusation){eligible.splice(eligible.indexOf(accusation.target),1);eligible.unshift(accusation.target)}
  let count=1;if(eligible.length>=2&&e.random()<RITUAL_RULES.extraVictimChance)count=2;if(eligible.length>=3&&count===2&&e.random()<RITUAL_RULES.thirdVictimChance)count=3;
  count=accusation?1:count;const victims=storyChoice?storyChoice.victims:outsider?[outsider]:eligible.slice(0,count),supporters=storyChoice?storyChoice.supporters.slice(0,3):eligible.filter(w=>!(personAge(w)?.child)&&!victims.includes(w)&&this.leadership.standing(w)>.05&&(!outsider||(actorRomance(w)?.sweetheartId)!==outsider.id&&(actorRomance(outsider)?.sweetheartId)!==w.id&&(lifeRelation(e.life,w.id,outsider.id)?.affinity??0)<.28)).slice(0,3);
  if(!victims.length)return false;
  this.active={id:this.nextId++,leaderId:leader.id,x:fire.x,z:fire.z,stage:'supplying',createdAt:e.time,deadline:e.time+160,victimIds:victims.map(w=>w.id),supporterIds:supporters.map(w=>w.id),builderId:null,woodDelivered:0,strikes:0,burnedIds:[],fuelAdded:false,wet:0};
  storyRitualStarted(e,this.active,storyChoice);
  if(storyChoice){const foreign=victims.filter(w=>rivalPeople(e).includes(w));if(foreign.length){this.active.outsiderVictimIds=foreign.map(w=>w.id);this.assigning=true;try{for(const w of foreign)detainRivalForRitual(e,w,this.active.id);}finally{this.assigning=false;}}}
  if(outsider){this.active.motive='tribal-hostility';this.active.outsiderVictimIds=[outsider.id];this.assigning=true;try{detainRivalForRitual(e,outsider,this.active.id);}finally{this.assigning=false;}}
  else if(!storyChoice&&accusation)recordJealousAccusation(e,this.active,accusation);
  fire.ritualWood=0;fire.ritualBurning=false;e.emit('ritual-planned',leader,null,{ritualId:this.active.id,victimIds:this.active.victimIds,wood:RITUAL_RULES.wood,x:fire.x,z:fire.z});return true;
 }
 assign(w,state,point){
  const e=this.economy,route=state==='ritual-victim-bound'?e.route(w,point):standingRoute(e,w,point);if(!route)return false;
  this.assigning=true;try{survivalInterrupt(e.survival,w);}finally{this.assigning=false;}
  (Object.assign(w,{state,route}),Object.assign(ensureActorInterior(w),{inside:false}),Object.assign(w,{wait:0,ritualId:this.active.id}),w);const watch=e.life.watch;if(watch){if(watch.guard===w.id)watch.guard=null;if(watch.relief===w.id)watch.relief=null;}return true;
 }
 interrupt(w){
  if(this.assigning)return;const e=this.economy,r=this.active;
  if(w.ritualCargo){survivalDrop(e.survival,w,w.ritualCargo.kind,w.ritualCargo.amount);w.ritualCargo=null;}
  if(r?.builderId===w.id){r.builderId=null;if(r.stage==='building')r.stage='supplying';}
  if(r&&!['embers'].includes(r.stage)&&(['gathering','burning'].includes(r.stage)||r.outsiderVictimIds?.includes(w.id))&&(r.leaderId===w.id||r.victimIds.includes(w.id)&&(actorVitality(w)?.health)>0))this.cancel('interrupted');
  if(states.has(w.state))releaseWork(e,w);w.ritualId=null;
 }
 cancel(reason){
  const e=this.economy,r=this.active;if(!r||r.stage==='embers')return;
  r.stage='embers';r.endedAt=e.time;r.endReason=reason;r.until=e.time+8;
  if(e.campfire){e.campfire.ritualBurning=false;if(!r.fuelAdded){e.campfire.fuel+=r.woodDelivered*30;r.fuelAdded=true;}}
  for(const id of this.participants(r)){
   const w=this.worker(id);if(!alive(w))continue;
   this.assigning=true;try{if(states.has(w.state)||w.ritualCargo){if(w.ritualCargo){survivalDrop(e.survival,w,w.ritualCargo.kind,w.ritualCargo.amount);w.ritualCargo=null;}survivalInterrupt(e.survival,w);}}finally{this.assigning=false;}
   w.ritualId=null;w.ritualPost=null;if(r.outsiderVictimIds?.includes(w.id))releaseRivalFromRitual(e,w);if(r.victimIds.includes(w.id)){this.leadership.changeResentment(w,.55);e.emit('ritual-freed',w);}
  }
  r.builderId=null;this.nextCheck=e.time+RITUAL_RULES.cooldown;e.emit('ritual-ended',this.worker(r.leaderId),null,{reason,x:r.x,z:r.z});
 }
 gather(){
  const e=this.economy,r=this.active,leader=this.worker(r.leaderId);
  if(!alive(leader)||actorNeeds(leader).hunger>=85||actorNeeds(leader).energy<20)return false;
  const participants=[{w:leader,state:'ritual-leader-bound',point:{x:r.x-1.8,z:r.z+1.5}},...r.victimIds.map((id,i)=>({w:this.worker(id),state:'ritual-victim-bound',point:{x:r.x+(i-(r.victimIds.length-1)/2)*1.2,z:r.z+1.05}})),...r.supporterIds.map((id,i)=>({w:this.worker(id),state:'ritual-attend-bound',point:{x:r.x+Math.cos(i*2.1)*2.4,z:r.z+Math.sin(i*2.1)*2.4}}))];
  r.stage='gathering';r.deadline=e.time+65;
  for(const p of participants){
   const required=p.w===leader||r.victimIds.includes(p.w?.id);
   if(!alive(p.w)||!this.assign(p.w,p.state,p.point)){
    if(required){this.cancel('participant-unavailable');return false;}
   }
  }
  e.emit('ritual-gathering',leader,null,{victimIds:r.victimIds});return true;
 }
 ignite(){
  const e=this.economy,r=this.active,fire=e.campfire;
  if(!r||r.stage!=='gathering'||!fire?.lit||fire.rain>.05||!r.victimIds.every(id=>this.worker(id)?.state==='ritual-bound')||this.worker(r.leaderId)?.state!=='ritual-presiding')return false;
  r.stage='burning';r.burningAt=e.time;r.until=e.time+RITUAL_RULES.burnSeconds;r.fuelAdded=true;
  fire.fuel+=r.woodDelivered*30;fire.ritualBurning=true;fire.ritualWood=r.woodDelivered;
  e.emit('ritual-ignited',this.worker(r.leaderId),null,{victimIds:r.victimIds,x:r.x,z:r.z});this.leadership.ritualBacklash(r);return r.stage==='burning';
 }
 update(dt,weather){
  const e=this.economy,r=this.active;
  if(!r){if(e.time>=this.nextCheck){this.nextCheck=e.time+RITUAL_RULES.checkSeconds;if(e.random()<this.attemptChance())this.start();}return;}
  if(r.stage==='embers'){if(e.time>=r.until){this.active=null;if(e.campfire){e.campfire.ritualWood=0;e.campfire.ritualBurning=false;}}return;}
  if(!this.leadership.leader||this.leadership.leaderId!==r.leaderId){this.cancel('leader-gone');return;}
  if(e.time>r.deadline&&r.stage!=='burning'){this.cancel('delayed');return;}
  if(r.outsiderVictimIds?.some(id=>{const w=this.worker(id);return !alive(w)||!w.visit||w.divineHeld||w.ritualId!==r.id;})){this.cancel('victim-unavailable');return;}
  if(r.stage==='ready'){this.gather();return;}
  if(r.stage==='gathering'){
   if((weather?.rain??0)>.15){this.cancel('rain');return;}
   if(r.victimIds.some(id=>!alive(this.worker(id)))){this.cancel('victim-unavailable');return;}
   this.ignite();return;
  }
  if(r.stage!=='burning')return;
  r.wet=(weather?.rain??0)>.15?r.wet+dt*(weather.rain??0):Math.max(0,r.wet-dt);
  if(r.wet>1||!e.campfire?.lit){this.cancel('rain');return;}
  r.burnDamagePending=(r.burnDamagePending??0)+dt;
  const damage=r.burnDamagePending>=.7?r.burnDamagePending*10:0;if(damage)r.burnDamagePending=0;
  for(const id of r.victimIds){
   const w=this.worker(id);if(!alive(w))continue;
   survivalDamage(e.survival,w,damage,'sacrifice',this.worker(r.leaderId));
   if((actorVitality(w)?.dead)&&!r.burnedIds.includes(id)){r.burnedIds.push(id);this.sacrificed++;e.emit(r.outsiderVictimIds?.includes(id)?'outsider-sacrificed':'villager-sacrificed',w,null,{leaderId:r.leaderId});}
  }
  if(e.time>=r.until||r.victimIds.every(id=>!alive(this.worker(id)))){
   const leader=this.leadership.leader;if(leader&&r.burnedIds.length){leader.ritualBlessedUntil=e.time+150;this.completed++;((beastsState)=>beastsState==null?undefined:(beastsRitualCompleted(beastsState,r)))(e.beasts);e.emit('ritual-completed',leader,null,{sacrificed:r.burnedIds.length});}
   this.cancel('finished');if(this.active)this.active.until=e.time+22;
  }
 }
 handle(w,dt){
  const e=this.economy,r=this.active;if(!r||r.stage==='embers'||!alive(w))return false;
  if(states.has(w.state)){
   if(w.ritualId!==r.id){releaseWork(e,w);return false;}
   if(['ritual-captive','ritual-bound','ritual-presiding','ritual-attending'].includes(w.state)){w.facing='front';return true;}
   if(['ritual-fetch','ritual-deliver','ritual-building'].includes(w.state)&&(actorNeeds(w).hunger>=80||actorNeeds(w).energy<20||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))){this.interrupt(w);return false;}
   if(w.state==='ritual-building'){
    for(const event of w.clock.advance(dt*ageWorkRate(w)*this.leadership.workRate(w))){
     if(event==='contact'){r.strikes++;r.lastHitAt=e.time;e.emit('ritual-build-hit',w,null,{x:r.x,z:r.z});}
     if(event==='finish'){if(r.strikes<RITUAL_RULES.strikes)w.clock.reset('work');else{r.stage='ready';r.builderId=null;releaseWork(e,w);w.ritualId=null;e.emit('ritual-built',w);}}
    }return true;
   }
   const status=e.move(w,dt);if(status==='moving')return true;if(status==='blocked'){if(w.id===r.builderId)this.interrupt(w);else this.cancel('path-blocked');return true;}
   if(w.state==='ritual-fetch'){
    const amount=Math.min(RITUAL_RULES.load,RITUAL_RULES.wood-r.woodDelivered,e.stock.wood),route=standingRoute(e,w,{x:r.x+1.6,z:r.z+.4});
    if(!amount||!route){this.interrupt(w);return true;}
    e.stock.wood-=amount;this.woodUsed+=amount;e.campfire.woodUsed+=amount;w.ritualCargo={kind:'wood',amount};w.state='ritual-deliver';w.route=route;e.emit('ritual-wood-taken',w,null,{amount});
   }else if(w.state==='ritual-deliver'){
    r.woodDelivered+=w.ritualCargo.amount;w.ritualCargo=null;e.campfire.ritualWood=r.woodDelivered;
    if(r.woodDelivered<RITUAL_RULES.wood){r.builderId=null;releaseWork(e,w);w.ritualId=null;}
    else{r.stage='building';w.state='ritual-building';w.facing=r.x<w.x?'left':'right';w.clock.reset('work');}
   }else if(w.state==='ritual-victim-bound'){w.state='ritual-bound';w.route=[];w.ritualBoundAt=e.time;w.ritualPost=ritualPostPoint(r,r.victimIds.indexOf(w.id));e.emit('ritual-bound',w);}
   else if(w.state==='ritual-leader-bound')w.state='ritual-presiding';
   else w.state='ritual-attending';return true;
  }
  const leader=w.id===r.leaderId,willing=leader||r.supporterIds.includes(w.id);
  if(!e.workers.includes(w)||r.stage!=='supplying'||r.builderId!=null||(personAge(w)?.child)||!willing||w.divineHeld||(actorInterior(w)?.inside)||!['idle',...(this.leadership.rivalry?['revolt-bound','revolt-fighting']:[])].includes(w.state)||w.cargo||actorNeeds(w).hunger>=62||actorNeeds(w).energy<28||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||watchAssigned(e.life.watch,w))return false;
  if(this.assign(w,'ritual-fetch',e.depot)){r.builderId=w.id;return true;}return false;
 }
}
