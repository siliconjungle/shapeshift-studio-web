import {actorTradeTask,ensureActorTradeTask} from './../actor-trade-task.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {structuralCondition} from './../home-entities.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock,lifeMealAccounting} from "../life-state.js";
import {actorSleep,actorSocialActivity} from "../daily-activity-actors.js";
import {actorOccasion,ensureActorOccasion} from "../actor-occasion.js";
import {occasionSession,setOccasionSession} from "../community-entities.js";
import {personKinship} from '../person-kinship.js';
import {actorMeal} from '../actor-meal.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop} from '../../village-survival.js';
import {lifeIdle,lifeRelation} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorFeelings,ensureActorFeelings} from '../actor-feelings.js';
import {memoryRemember,memoryMutual} from '../../village-memory.js';
import {watchParticipant} from '../watch-participants.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {dangerRisk} from '../../village-danger.js';
import {supportParticipant} from '../support-participants.js';
import {supportCloseness} from '../../village-support.js';
import {dangerAwareness} from '../danger-entities.js';
import {defineGameData} from '../../game-data.js';
import {refusingFood,sociallyWithdrawn} from '../../village-feelings.js';
import {SOCIAL_CUSTOMS,occasionCustom,willingCustom,customPreference,completeCustom,socialEnjoyment} from '../../village-traditions.js';
import {isBedtime,DAY_LENGTH_SECONDS} from '../../village-time.js';
import {standingRoom,standingRoute} from '../../village-spacing.js';
export const OCCASION_RULES=defineGameData('village-occasions.OCCASION_RULES',{guests:6,range:22,interval:2,retry:5,arrivalTimeout:35,duration:9,queueLimit:8,cooldown:18});
const states=new Set(['occasion-fetch','occasion-bound','occasion-wait','occasion-sharing']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=n=>Math.max(0,Math.min(100,n));
const active=r=>!(actorVitality(r)?.dead)&&!r.gone&&!['fading','fleeing','departing'].includes(r.state);
const eventKinds={'community-recovery':'recovery','raid-recovery':'recovery','house-completed':'house',born:'birth',died:'memorial','villager-arrived':'welcome'};
export function occasionsNotice(world,id,event){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const kind=eventKinds[event.type];if(!kind)return;
  if(event.type==='house-completed'&&state.economy.housing?.projects.find(p=>p.id===event.houseId)?.expeditionId)return;
  const source=kind==='recovery'?event.episodeId:kind==='house'?event.houseId:event.workerId,key=kind+':'+source;
  if(source==null||state.recent.includes(key))return;
  state.recent=[key,...state.recent].slice(0,64);
  const e=state.economy;
  // Several damaged homes and the raid itself belong to one shared recovery.
  if(kind==='recovery'&&(occasionSession(state)?.occasion.kind==='recovery'||state.queue.some(o=>o.kind==='recovery'&&o.expires>e.time)))return;
  const readyAt=e.time+(kind==='recovery'?8:kind==='memorial'?6:kind==='house'||kind==='welcome'?.6:3);
  const occasion={key,kind,source,cause:event.type==='community-recovery'?event.cause:undefined,hostId:event.workerId,at:e.time,readyAt,expires:e.time+DAY_LENGTH_SECONDS*(kind==='recovery'?2:1)};
  state.queue.push(occasion);
  state.nextCheck=Math.min(state.nextCheck,readyAt);
  state.queue.sort((a,b)=>(a.kind==='memorial'?0:1)-(b.kind==='memorial'?0:1)||a.at-b.at);
  state.queue=state.queue.slice(0,OCCASION_RULES.queueLimit);
  // A loss interrupts a celebration; it must never become a cheerful backdrop.
  if(kind==='memorial'&&occasionSession(state)?.occasion.kind!=='memorial')occasionsCancel(world,id);
  // Reserve an available arrival and greeters before autonomous jobs can claim
  // them on the next tick. Busy or unsafe arrivals retain the normal retry path.
  if(kind==='welcome'&&!occasionSession(state))occasionsStart(world,id,occasion);
 
}
export function occasionsSubject(world,id,o){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');
if(o.kind==='recovery')return null;return state.economy.workers.find(w=>w.id===o.source)
}
export function occasionsCenter(world,id,o){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy;
  if(SOCIAL_CUSTOMS.includes(o.kind))return o.point;
  if(o.kind==='welcome'){const w=occasionsSubject(world,id,o);return w&&!(actorVitality(w)?.dead)&&!w.divineHeld?{x:w.x,z:w.z}:null;}
  if(o.kind==='recovery'){if(e.campfire?.built&&e.campfire.lit)return {x:e.campfire.x,z:e.campfire.z};const h=e.life.homes.find(h=>!(structuralCondition(h)?.destroyed)&&!((structuralCondition(h)?.raidThreatUntil)>e.time)&&!e.shelter?.fires.some(f=>f.id===h.id&&f.until>e.time));return h?{x:h.x,z:h.z+2.8}:null;}
  if(o.kind==='memorial')return e.survival.memorials.find(m=>m.workerId===o.source);
  const home=o.kind==='house'?e.life.homes.find(h=>h.id===o.source):(actorResidence(occasionsSubject(world,id,o))?.home);
  return home?{x:home.x,z:home.z+1.35}:null;
 
}
export function occasionsSafe(world,id,point){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy;
  return !(e.raids?.alarmUntil>e.time)&&![...(e.slimes?.enemies??[]),...(e.raids?.enemies??[])].some(r=>active(r)&&distance(r,point)<7);
 
}
export function occasionsWell(world,id,w,o){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy;
  return !sociallyWithdrawn(e,w)&&!refusingFood(e,w)&&!(actorVitality(w)?.dead)&&!w.divineHeld&&!(actorInterior(w)?.inside)&&!w.recoveringFromCombat&&(actorVitality(w)?.health)>=48&&actorNeeds(w).energy>24&&actorNeeds(w).hunger<(o.kind==='house'?85:75)&&!watchAssigned(e.life.watch,w)&&!(watchParticipant(w)?.sleepDebt>0)&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)&&!(w.localAlarmUntil>e.time)&&!((personAge(w)?.child)&&actorNeeds(w).care<30)&&!e.workers.some(c=>!(actorVitality(c)?.dead)&&(personAge(c)?.child)&&(personKinship(c)?.parents)?.includes(w.id)&&actorNeeds(c).hunger>=85);
 
}
export function occasionsAvailable(world,id,w,o){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy;
  return !w.expeditionId&&occasionsWell(world,id,w,o)&&(!(personAge(w)?.child)||SOCIAL_CUSTOMS.includes(o.kind)||o.kind==='recovery'||o.kind==='welcome'||o.kind==='birth'&&w.id===o.source)&&(actorOccasion(w)?.id)==null&&dangerAwareness(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&actorSocialActivity(w)?.partnerId==null&&!w.cargo&&!(actorMeal(w)?.mealCarry)&&!supportParticipant(w)?.food&&!careParticipant(w)?.food&&!(actorConstructionTask(w)?.cargo)&&!(actorTradeTask(w)?.cargo)&&!w.firewood&&!w.firestone&&!w.spacingRoute?.length&&(['idle','outbound','resting','following'].includes(w.state)||o.kind==='welcome'&&w.state==='working'&&w.node)&&(o.kind==='memorial'||!((actorFeelings(w)?.heartbrokenUntil)>e.time&&e.time-(w.griefAt??0)<20))&&((actorOccasion(w)?.after)??0)<=e.time;
 
}
export function occasionsSpot(world,id,w,center,planned,o){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy,offset=(w.id*.71+o.at*.13)%6.28;
  for(const radius of [1.65,2.65])for(let i=0;i<10;i++){
   const angle=offset+i*Math.PI/5,p={x:center.x+Math.cos(angle)*radius,z:center.z+Math.sin(angle)*radius};
   if(planned.some(m=>distance(m.spot,p)<1.25)||!standingRoom(e,w,p))continue;
   const route=e.route(w,p);if(route&&!dangerRisk(e,w,p,route))return {spot:p,route};
  }
  return null;
 
}
export function occasionsPlans(world,id,o,center,existing=[]){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy,subject=occasionsSubject(world,id,o),living=e.workers.filter(w=>!(actorVitality(w)?.dead)),space=OCCASION_RULES.guests-existing.length;
  const uncollected=existing.filter(m=>!(actorOccasion(m.worker)?.food)).length;
  const limit=['house','recovery'].includes(o.kind)?Math.min(space,Math.floor(e.stock.food-living.length-uncollected)):space;
  if(limit<1)return [];
  const candidates=living.filter(w=>occasionsAvailable(world,id,w,o)&&distance(w,center)<(o.chapterGathering?48:OCCASION_RULES.range)&&(w.id===o.hostId&&o.kind==='welcome'||willingCustom(e,w,occasionCustom(o.kind),subject)));
  const score=w=>(e.traditions?customPreference(e,w,occasionCustom(o.kind))*3:0)+(w.id===o.hostId?100:0)+((personKinship(subject)?.parents)?.includes(w.id)?20:0)+(o.kind==='memorial'&&subject?supportCloseness(e,w,subject)*5:0)-distance(w,center)*.15;
  candidates.sort((a,b)=>score(b)-score(a));
  const members=[];
  for(const w of candidates.slice(0,12)){
   const host=(o.kind==='welcome'||SOCIAL_CUSTOMS.includes(o.kind))&&w===subject&&distance(w,center)<.35;
   const plan=host?{spot:{...center},route:[]}:occasionsSpot(world,id,w,center,[...existing,...members],o);if(!plan)continue;
   const route=['house','recovery'].includes(o.kind)?standingRoute(e,w,w.store??e.depot):plan.route;
   if(!route||dangerRisk(e,w,route.at(-1)??plan.spot,route))continue;
   members.push({worker:w,spot:plan.spot,route,arrived:host,cued:false});if(members.length>=limit)break;
  }
  return members;
 
}
export function occasionsAdmit(world,id,o,members){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy;
  for(const m of members){const w=m.worker;releaseWork(e,w);(ensureActorOccasion(w).id)=o.key;(ensureActorOccasion(w).kind)=o.kind;(ensureActorOccasion(w).food)=0;w.spacingRoute=null;w.route=m.route;delete m.route;w.state=m.arrived?'occasion-wait':['house','recovery'].includes(o.kind)?'occasion-fetch':'occasion-bound';w.wait=0}
 
}
export function occasionsStart(world,id,o){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy,center=occasionsCenter(world,id,o),subject=occasionsSubject(world,id,o);
  if(!center||!occasionsSafe(world,id,center)||(['birth','welcome'].includes(o.kind)||SOCIAL_CUSTOMS.includes(o.kind))&&(!subject||(actorVitality(subject)?.dead)||!occasionsAvailable(world,id,subject,o)))return false;
  const members=occasionsPlans(world,id,o,center);
  if(members.length<2||(o.kind==='welcome'||SOCIAL_CUSTOMS.includes(o.kind))&&!members.some(m=>m.worker===subject)||o.kind==='birth'&&(!members.some(m=>m.worker===subject)||!members.some(m=>(personKinship(subject)?.parents)?.includes(m.worker.id))))return false;
  occasionsAdmit(world,id,o,members);
  setOccasionSession(state,{occasion:o,center:{x:center.x,z:center.z},members,deadline:e.time+OCCASION_RULES.arrivalTimeout,inviteAt:e.time+OCCASION_RULES.interval,startedAt:null,until:0});
  state.queue=state.queue.filter(p=>p!==o);return true;
 
}
export function occasionsLeave(world,id,m){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy,w=m.worker;
  if((actorOccasion(w)?.food)){survivalDrop(e.survival,w,'food',(actorOccasion(w)?.food));(ensureActorOccasion(w).food)=0}
  (ensureActorOccasion(w).id)=null;(ensureActorOccasion(w).kind)=null;(ensureActorOccasion(w).after)=e.time+OCCASION_RULES.cooldown;
  if(states.has(w.state))lifeIdle(e.life,w);
 
}
export function occasionsCancel(world,id){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  if(!occasionSession(state))return;
  for(const m of occasionSession(state).members)occasionsLeave(world,id,m);
  setOccasionSession(state,null);state.after=state.economy.time+OCCASION_RULES.cooldown;
 
}
export function occasionsInterrupt(world,id,w){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const s=occasionSession(state);if(!s)return;const m=s.members.find(m=>m.worker===w);if(!m)return;
  occasionsLeave(world,id,m);s.members=s.members.filter(p=>p!==m);
  if(s.members.length<2||['birth','welcome'].includes(s.occasion.kind)&&w.id===s.occasion.source)occasionsCancel(world,id);
 
}
export function occasionsFace(world,id,w,s){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const target=(s.occasion.kind==='welcome'||SOCIAL_CUSTOMS.includes(s.occasion.kind))&&w.id===s.occasion.source?s.members.find(m=>m.worker!==w)?.worker:s.center;
  if(target)w.facing=target.x<w.x?'left':'right';
 
}
export function occasionsBegin(world,id,s){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy;s.startedAt=e.time;s.until=e.time+OCCASION_RULES.duration;
  for(const m of s.members){
   const w=m.worker;w.state='occasion-sharing';occasionsFace(world,id,w,s);m.enjoyment=socialEnjoyment(e,w,occasionCustom(s.occasion.kind),s.members.map(p=>p.worker));
   if((actorOccasion(w)?.food)){(ensureActorOccasion(w).food)=0;actorNeeds(w).hunger=clamp(actorNeeds(w).hunger-62);actorNeeds(w).energy=clamp(actorNeeds(w).energy+7);lifeMealAccounting(e.life).consumed++;state.meals++;e.emit('occasion-meal',w,null,{amount:1})}
  }
 
}
export function occasionsFinish(world,id,s){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy,kind=s.occasion.kind,memory=kind==='house'?'shared-meal':['birth','welcome'].includes(kind)?'welcomed-together':kind==='recovery'?(s.occasion.cause&&s.occasion.cause!=='raid'?'recovered-together':'weathered-raid-together'):SOCIAL_CUSTOMS.includes(kind)?'time-together':'remembered-together';
  completeCustom(e,occasionCustom(kind),s.members.map(m=>m.worker));
  for(let i=0;i<s.members.length;i++)for(let j=i+1;j<s.members.length;j++){
   const a=s.members[i].worker,b=s.members[j].worker;
   if(kind==='welcome'&&(a.id===s.occasion.source||b.id===s.occasion.source)){
    const newcomer=a.id===s.occasion.source?a:b,greeter=newcomer===a?b:a;
    memoryRemember(e.life.memory,newcomer,greeter,'welcomed');memoryRemember(e.life.memory,greeter,newcomer,'welcoming');
    const relation=lifeRelation(e.life,a.id,b.id);if(relation){relation.affinity=Math.min(1,relation.affinity+.05);relation.meetings++;}
   }else memoryMutual(e.life.memory,a,b,memory,.025);
  }
  if(kind==='memorial')for(const {worker:w} of s.members)if(w.grievingForId===s.occasion.source&&(actorFeelings(w)?.heartbrokenUntil)>e.time)ensureActorFeelings(w).heartbrokenUntil=e.time+Math.max(12,((actorFeelings(w)?.heartbrokenUntil)-e.time)*.8);
  if(kind==='recovery')for(const {worker:w} of s.members){w.raidStressUntil=0;actorNeeds(w).social=clamp(actorNeeds(w).social+8);}
  state.completed[kind]=(state.completed[kind]??0)+1;e.emit('occasion-finished',null,null,{kind,occasionId:s.occasion.key,workerIds:s.members.map(m=>m.worker.id)});occasionsCancel(world,id);
 
}
export function occasionsUpdate(world,id,dt){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  const e=state.economy,s=occasionSession(state);
  if(s){
   if(!occasionsSafe(world,id,s.center)||['birth','welcome'].includes(s.occasion.kind)&&(!occasionsSubject(world,id,s.occasion)||(actorVitality(occasionsSubject(world,id,s.occasion))?.dead))){occasionsCancel(world,id);return}
   if(s.occasion.kind==='welcome'&&distance(occasionsSubject(world,id,s.occasion),s.center)>.6){occasionsCancel(world,id);return;}
   for(const m of [...s.members])if(!occasionsWell(world,id,m.worker,s.occasion)||!states.has(m.worker.state))occasionsInterrupt(world,id,m.worker);
   if(occasionSession(state)!==s)return;
   if(s.startedAt===null){
    if(e.time>=s.inviteAt&&e.time<s.deadline-8&&s.members.length<OCCASION_RULES.guests){
     s.inviteAt=e.time+OCCASION_RULES.interval;const joining=occasionsPlans(world,id,s.occasion,s.center,s.members);occasionsAdmit(world,id,s.occasion,joining);s.members.push(...joining);
    }
    if(e.time>=s.deadline){for(const m of [...s.members])if(!m.arrived)occasionsInterrupt(world,id,m.worker);if(occasionSession(state)!==s)return}
    if(s.members.every(m=>m.arrived))occasionsBegin(world,id,s);
   }else{
    for(const [i,m] of s.members.entries()){
     const w=m.worker;actorNeeds(w).social=clamp(actorNeeds(w).social+dt*3);actorNeeds(w).energy=clamp(actorNeeds(w).energy+dt*.65);
     if(!m.cued&&e.time>=s.startedAt+.5+i*1.1){m.cued=true;e.emit('occasion-moment',w,null,{kind:s.occasion.kind,index:i,enjoyment:m.enjoyment})}
    }
    if(e.time>=s.until)occasionsFinish(world,id,s);
   }
   return;
  }
  if(e.time<state.nextCheck||e.time<state.after)return;state.nextCheck=e.time+OCCASION_RULES.interval;
  state.queue=state.queue.filter(o=>o.expires>e.time&&!(['birth','welcome'].includes(o.kind)&&(!occasionsSubject(world,id,o)||(actorVitality(occasionsSubject(world,id,o))?.dead))));
  for(const o of state.queue){if(e.time<o.readyAt){state.nextCheck=Math.min(state.nextCheck,o.readyAt);continue}if(occasionsStart(world,id,o))return;o.readyAt=e.time+OCCASION_RULES.retry}
 
}
export function occasionsHandle(world,id,w,dt){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');

  if((actorOccasion(w)?.id)==null&&!states.has(w.state))return false;
  const e=state.economy,s=occasionSession(state),m=s?.members.find(m=>m.worker===w);
  if(!m){occasionsLeave(world,id,{worker:w});return true}
  if(w.state==='occasion-wait'||w.state==='occasion-sharing')return true;
  const status=e.move(w,dt);if(status==='blocked'){occasionsInterrupt(world,id,w);return true}if(status!=='arrived')return true;
  if(w.state==='occasion-fetch'){
   const route=e.route(w,m.spot);
   if(e.stock.food<1||!route||dangerRisk(e,w,m.spot,route)){occasionsInterrupt(world,id,w);return true}
   e.stock.food--;(ensureActorOccasion(w).food)=1;w.route=route;w.state='occasion-bound';return true;
  }
  if(distance(w,m.spot)>.15){occasionsInterrupt(world,id,w);return true}
  m.arrived=true;w.state='occasion-wait';occasionsFace(world,id,w,s);return true;
 
}
export function occasionsSnapshot(world,id){const state=world.get(id,'OccasionsState');if(!state)throw Error('Missing OccasionsState');
return {completed:{...state.completed},meals:state.meals,queue:state.queue.map(o=>({...o})),session:occasionSession(state)?{kind:occasionSession(state).occasion.kind,key:occasionSession(state).occasion.key,center:{...occasionSession(state).center},startedAt:occasionSession(state).startedAt,until:occasionSession(state).until,members:occasionSession(state).members.map(m=>({workerId:m.worker.id,spot:{...m.spot},arrived:m.arrived,food:(actorOccasion(m.worker)?.food)??0}))}:null}
}
