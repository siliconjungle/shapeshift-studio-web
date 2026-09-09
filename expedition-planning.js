import {actorTradeTask,ensureActorTradeTask} from './ecs/actor-trade-task.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorRepairTask} from './ecs/actor-repair-task.js';
import {ensureActorRepairTask} from './ecs/actor-repair-task.js';
import {actorConstructionTask,ensureActorConstructionTask} from './ecs/actor-construction-task.js';
import {resourceGrowth} from "./ecs/resource-state.js";
import {lifeClock} from "./ecs/life-state.js";
import {actorSocialActivity,actorSleep} from "./ecs/daily-activity-actors.js";
import {familyBirthPlan} from "./ecs/family-entities.js";
export {expeditionTemperament} from './ecs/systems/personality.js';
import {expeditionTemperament} from './ecs/systems/personality.js';
import {actorAmbitions} from "./ecs/development-actors.js";
import {actorOccasion} from "./ecs/actor-occasion.js";
import {personKinship} from './ecs/person-kinship.js';
import {watchAssigned} from './village-watch.js';
import {watchParticipant} from './ecs/watch-participants.js';
import {dangerAwareness} from './ecs/danger-entities.js';
import {actorMeal} from './ecs/actor-meal.js';
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {careParticipant} from './ecs/care-participants.js';
import {supportParticipant} from './ecs/support-participants.js';
import {supportCloseness} from './village-support.js';
import {skillLevel} from './village-skills.js';
import {placeBias} from './village-place-history.js';
import {defineGameData} from './game-data.js';
import {visibleAt,exploredAt} from './village-exploration.js';
import {isForage} from './village-foraging.js';
import {villageDemand} from './village-decisions.js';
import {isBedtime,DAY_LENGTH_SECONDS} from './village-time.js';
import {temperatureOf} from './village-temperature.js';

export const EXPEDITION_RULES=defineGameData('expeditions.rules',{minimumDistance:18,groveRadius:9,check:12,foodEach:3,wood:6,load:9,minimumParty:2,maximumParty:3,memoryLimit:24,historyLimit:16});
export const expeditionDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=n=>Math.max(0,Math.min(1,n));
export function expeditionState(e){return e.expeditions??={version:1,nextId:0,nextCheck:e.time+45,nextDeparture:e.time+90,places:[],history:[],active:null};}
export function placeFear(e,w,point){
 return Math.max(0,...(w.journeyMemories??[]).filter(m=>expeditionDistance(m,point)<11).map(m=>m.fear*Math.pow(.5,Math.max(0,e.time-m.at)/(DAY_LENGTH_SECONDS*6))));
}
export function rememberJourneyPlace(e,w,point,{fear=0,lostId=null,outcome='visited'}={}){
 const memories=w.journeyMemories??=[],old=memories.find(m=>expeditionDistance(m,point)<7);
 const m={x:point.x,z:point.z,at:e.time,fear:Math.max(fear,(old?.fear??0)*.8),lostId:lostId??old?.lostId??null,outcome};
 w.journeyMemories=[m,...memories.filter(m=>m!==old)].slice(0,EXPEDITION_RULES.memoryLimit);
}
export function expeditionResources(e,place){return e.nodes.filter(n=>resourceGrowth(n)?.state==='ready'&&n.kind===place.kind&&(n.kind!=='food'||isForage(n))&&exploredAt(e,n.x,n.z)&&expeditionDistance(n,place)<EXPEDITION_RULES.groveRadius);}
export function observeExpeditionPlaces(e){
 const s=expeditionState(e),observers=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.rivalJourney);
 for(const w of observers){
  const seed=e.nodes.find(n=>resourceGrowth(n)?.state==='ready'&&['wood','stone','food'].includes(n.kind)&&(n.kind!=='food'||isForage(n))&&expeditionDistance(n,e.depot)>=EXPEDITION_RULES.minimumDistance&&expeditionDistance(n,w)<6&&visibleAt(e,n.x,n.z)&&!s.places.some(p=>p.kind===n.kind&&expeditionDistance(p,n)<10));
  if(!seed)continue;
  const patch=expeditionResources(e,seed);if(patch.length<3)continue;
  s.places.push({id:'grove-'+s.nextId++,...{x:seed.x,z:seed.z,kind:seed.kind},discoveredAt:e.time,discovererId:w.id,lastVisitedAt:null,avoidUntil:0,visits:0});
  if(s.places.length>EXPEDITION_RULES.memoryLimit)s.places.shift();
  e.emit('expedition-cue',w,null,{reaction:'surprise',reason:'grove-discovered'});
 }
}
export function expeditionVolunteer(e,w){
 return !(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(personAge(w)?.elder)&&!w.exiled&&!w.divineHeld&&!(actorInterior(w)?.inside)&&!w.rivalJourney&&w.expeditionId==null&&(w.expeditionAfter??0)<=e.time&&!e.leadership?.isLeader(w)&&!watchAssigned(e.life?.watch,w)&&!((watchParticipant(w)?.sleepDebt)>0)&&!w.recoveringFromCombat&&!w.cargo&&!(actorConstructionTask(w)?.cargo)&&!(actorTradeTask(w)?.cargo)&&!(actorRepairTask(w)?.cargo)&&!w.firewood&&!w.firestone&&!(actorMeal(w)?.mealCarry)&&!careParticipant(w)?.food&&!supportParticipant(w)?.food&&!(actorOccasion(w)?.food)&&actorSocialActivity(w)?.partnerId==null&&(actorOccasion(w)?.id)==null&&dangerAwareness(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&w.ritualId==null&&!w.spacingRoute?.length&&['idle','outbound','resting'].includes(w.state)&&(actorVitality(w)?.health)>=70&&actorNeeds(w).energy>=55&&actorNeeds(w).hunger<48&&temperatureOf(w)>25&&temperatureOf(w)<76&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
}
export function leavesCareAtHome(e,party){
 const adults=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!w.exiled&&!w.rivalJourney&&!w.expeditionId&&!party.includes(w));
 if(adults.length<Math.max(1,Math.ceil(e.workers.filter(w=>!(actorVitality(w)?.dead)&&(personAge(w)?.child)).length/3)))return false;
 return e.workers.filter(w=>!(actorVitality(w)?.dead)&&(personAge(w)?.child)).every(c=>{
  const parents=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&(personKinship(c)?.parents)?.includes(w.id));
  return parents.length?parents.some(p=>adults.includes(p)):adults.some(a=>(actorVitality(a)?.health)>45);
 });
}
export function chooseExpedition(e){
 const s=expeditionState(e),living=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.exiled),candidates=living.filter(w=>expeditionVolunteer(e,w));
 if(candidates.length<2||living.some(w=>actorNeeds(w).hunger>85)||e.stock.food<living.length+6||e.stock.wood<EXPEDITION_RULES.wood+2||e.raids?.alarmUntil>e.time||e.leadership?.revolt||(familyBirthPlan(e.family))&&(familyBirthPlan(e.family)).arrivesAt-e.time<30)return null;
 const {targets}=villageDemand(e),plans=[];
 for(const place of s.places){
  if(place.avoidUntil>e.time||expeditionResources(e,place).length<3)continue;
  const nearby=e.nodes.filter(n=>n.kind===place.kind&&resourceGrowth(n)?.state==='ready'&&exploredAt(e,n.x,n.z)&&expeditionDistance(n,e.depot)<EXPEDITION_RULES.minimumDistance).length;
  const shortage=Math.max(0,(targets[place.kind]*2-e.stock[place.kind])/Math.max(1,targets[place.kind]*2));
  // A remote camp is worthwhile because local work is running out, a shortage
  // makes the extra haul valuable, or an unusually curious scout proposes it.
  const pressure=shortage*.8+(nearby<3?.65:0);
  const leader=candidates.map(w=>({w,score:pressure+skillLevel(w,'exploring')*.1+placeBias(e,w,place,'journey')*.025+((actorAmbitions(w)?.current)?.kind==='explore'?.3:0)+expeditionTemperament(e,w).curiosity*.55-placeFear(e,w,place)*(1+expeditionTemperament(e,w).caution)+e.random()*.3})).sort((a,b)=>b.score-a.score)[0];
  if(leader.score<.85)continue;
  const party=[leader.w],others=candidates.filter(w=>w!==leader.w).map(w=>{
   const t=expeditionTemperament(e,w),bond=Math.min(1,supportCloseness(e,w,leader.w)??0),parent=e.workers.some(c=>!(actorVitality(c)?.dead)&&(personAge(c)?.child)&&(personKinship(c)?.parents)?.includes(w.id));
   return {w,score:pressure*.45+t.curiosity*.5+bond*t.attachment*.65-t.caution*.35-placeFear(e,w,place)*1.5-(parent?.45:0)+e.random()*.35};
  }).sort((a,b)=>b.score-a.score);
  const size=e.random()<.35?3:2;
  for(const {w,score} of others){if(score<.05||!leavesCareAtHome(e,[...party,w]))continue;party.push(w);if(party.length===size)break;}
  if(party.length<2||!leavesCareAtHome(e,party)||e.stock.food<living.length+party.length*EXPEDITION_RULES.foodEach)continue;
  plans.push({place,party,score:leader.score+expeditionResources(e,place).length*.015-expeditionDistance(place,e.depot)*.003});
 }
 return plans.sort((a,b)=>b.score-a.score)[0]??null;
}
