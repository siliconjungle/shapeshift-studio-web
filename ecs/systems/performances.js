import {ACTOR_RULES,actorState} from '../../village-actors.js';
import {skillLevel,gainSkill} from '../../village-skills.js';
import {standingRoom} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {visiblePeople,knownPeople} from '../../village-people.js';
import {lifeRelation} from '../../village-life.js';
import {memoryMutual} from '../../village-memory.js';
import {releaseWork} from './resource-harvesting.js';
import {theatreSchedule,theatrePerformance,theatreHistory} from '../theatre-state.js';
import {actorPerformanceCareer,ensureActorPerformanceCareer,actorPerformanceParticipation,ensureActorPerformanceParticipation} from '../performance-actors.js';
import {actorComponent} from '../actor-entities.js';
import {actorNeeds} from '../actor-needs.js';
import {actorVitality} from '../actor-vitality.js';
import {personAge} from '../person-age.js';
import {actorInterior} from '../actor-interior.js';
import {actorConstructionTask} from '../actor-construction-task.js';
import {actorRepairTask} from '../actor-repair-task.js';
import {actorSocialActivity,actorSleep} from '../daily-activity-actors.js';
import {careParticipant} from '../care-participants.js';
import {actorLearning,ensureActorLearning,actorAmbitions,ensureActorAmbitions} from '../development-actors.js';
import {actorPersonality} from '../personality-actors.js';
import {actorFeelings} from '../actor-feelings.js';
import {lifeClock} from '../life-state.js';
const states=new Set(['actor-bound','actor-wait','actor-performing','actor-watching']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),clamp=n=>Math.max(0,Math.min(100,n));
const free=w=>w&&!actorVitality(w)?.dead&&!actorInterior(w)?.inside&&!w.divineHeld&&!w.exiled&&!w.visit&&!w.expeditionId&&!w.rivalJourney&&!w.cargo&&!actorConstructionTask(w)?.cargo&&!actorRepairTask(w)?.cargo&&!w.frenzy&&!w.ritualId&&actorSocialActivity(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&!actorLearning(w)?.lesson&&w.state==='idle'&&(w.wait??0)<=3&&!w.spacingRoute?.length;
const comfortable=(e,w)=>!(actorComponent(w,'ActorPoison')?.effect?.until>e.time)&&actorNeeds(w)&&actorNeeds(w).hunger<55&&actorNeeds(w).energy>42&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
export const isActor=w=>!!actorPerformanceCareer(w)?.specialization&&w.role==='actor'&&!personAge(w)?.child&&!w.mage;
const safe=e=>e.life&&!((e.raids?.alarmUntil??0)>e.time)&&!(e.shelter?.fires??[]).some(f=>f.until>e.time)&&!(e.life.watch?.active)&&e.stock.food>=e.workers.filter(w=>!actorVitality(w)?.dead).length&&((e.wishDrawContext?.rain??0)<.45);
export function noticeActorEvent(world,event){const e=world.resource('Village');
 if(event.type!=='social-finish'||event.kind==='argument')return;
 const w=e.workers.find(w=>w.id===event.workerId);if(w&&!personAge(w)?.child&&!w.mage&&!w.role)ensureActorPerformanceCareer(w).conversations=Math.min(20,(actorPerformanceCareer(w)?.conversations??0)+1);
}
export function promoteActor(world,w){const e=world.resource('Village');
 if(!w||actorVitality(w)?.dead||personAge(w)?.child||w.mage||w.role||e.workers.filter(p=>!actorVitality(p)?.dead&&isActor(p)).length>=Math.max(1,Math.ceil(e.workers.filter(p=>!actorVitality(p)?.dead).length/ACTOR_RULES.peoplePerActor)))return false;
 if((actorPerformanceCareer(w)?.shows??0)<ACTOR_RULES.promoteShows||skillLevel(w,'acting')<1)return false;
 ensureActorPerformanceCareer(w).specialization={since:e.time,shows:actorPerformanceCareer(w)?.shows,encouraged:0,favourites:[]};w.role='actor';e.emit('actor-specialised',w);return true;
}
export function leavePerformance(world,w){const e=world.resource('Village');
 const s=theatrePerformance(e.theatre)?.session;if(s){s.members=s.members.filter(m=>m.id!==w.id);if(s.hostId===w.id)s.cancelled=true;}
 delete actorPerformanceParticipation(w)?.sessionId;delete actorPerformanceParticipation(w)?.seat;
 if(states.has(w.state)){w.state='idle';w.route=[];w.wait=2;w.decisionReason=null;}
 ensureActorPerformanceParticipation(w).after=e.time+30;
}
function end(world,completed=false){const e=world.resource('Village');
 const t=actorState(e),s=theatrePerformance(t).session;if(!s)return;const host=e.workers.find(w=>w.id===s.hostId),guests=s.members.map(m=>visiblePeople(e).find(w=>w.id===m.id)).filter(w=>w&&w.id!==s.hostId&&w.state==='actor-watching');
 if(completed&&host&&guests.length){
  ensureActorPerformanceCareer(host).shows=(actorPerformanceCareer(host)?.shows??0)+1;gainSkill(e,host,'acting',12);actorNeeds(host).social=clamp(actorNeeds(host).social+12);actorNeeds(host).energy=clamp(actorNeeds(host).energy-3);ensureActorAmbitions(host).fulfilledUntil=e.time+25;
  if(actorPerformanceCareer(host)?.specialization){actorPerformanceCareer(host).specialization.shows=actorPerformanceCareer(host)?.shows;actorPerformanceCareer(host).specialization.favourites=[...new Set([...guests.map(w=>w.id),...(actorPerformanceCareer(host)?.specialization.favourites??[])])].slice(0,8);actorPerformanceCareer(host).specialization.encouraged=(actorPerformanceCareer(host)?.specialization.encouraged??0)+guests.filter(w=>personAge(w)?.child).length;}
  for(const w of guests){const liking=s.kind==='comfort'||personAge(w)?.child||actorPersonality(w)?.trait==='playful'||actorPersonality(w)?.trait==='outgoing'?1:.8;actorNeeds(w).social=clamp(actorNeeds(w).social+12+skillLevel(host,'acting')*2);ensureActorPerformanceParticipation(w).entertainedUntil=e.time+35;memoryMutual(e.life.memory,host,w,s.kind==='comfort'?'comforted-by-story':'enjoyed-performance',.025*liking);
   const r=lifeRelation(e.life,host.id,w.id);if(r)r.meetings++;
   e.emit('actor-applause',w,null,{partnerId:host.id,delay:guests.indexOf(w)*.22});
   if(personAge(w)?.child){gainSkill(e,w,'acting',3,'teaching');ensureActorLearning(w).history=[{skill:'acting',mentorId:host.id,mentorName:host.name,at:e.time,amount:3},...(actorLearning(w)?.history??[])].slice(0,8);e.emit('actor-imitation',w,null,{mentorId:host.id});}
  }
  for(let i=0;i<guests.length;i++)for(let j=i+1;j<guests.length;j++)memoryMutual(e.life.memory,guests[i],guests[j],'shared-performance',.012);
  theatreHistory(t).entries=[{at:e.time,hostId:host.id,kind:s.kind,audience:guests.length},...theatreHistory(t).entries].slice(0,12);e.emit('actor-show-finished',host,null,{kind:s.kind,audience:guests.length});promoteActor(world,host);
 }
 const ids=s.members.map(m=>m.id);theatrePerformance(t).session=null;theatreSchedule(t).nextAt=e.time+ACTOR_RULES.interval;
 for(const id of ids){const w=visiblePeople(e).find(w=>w.id===id);if(actorPerformanceParticipation(w)?.sessionId===s.id)leavePerformance(world,w);}
}
function start(world,host){const e=world.resource('Village');
 const fire=e.campfire,center=fire?.built?{x:fire.x,z:fire.z+2.7}:{x:host.x,z:host.z};
 // Leave room for the audience even at the edge of a clearing or beside a building.
 for(const p of [center,{x:center.x,z:center.z-3},{x:center.x-3,z:center.z-3},{x:center.x+3,z:center.z-3},{x:host.x,z:host.z-3}])if(startAt(world,host,p))return true;
 return false;
}
function startAt(world,host,p){const e=world.resource('Village');
 const t=actorState(e);if(!standingRoom(e,host,p)||!e.route(host,p))return false;
 const guests=visiblePeople(e).filter(w=>w!==host&&free(w)&&comfortable(e,w)&&distance(w,p)<ACTOR_RULES.range&&(lifeRelation(e.life,host.id,w.id)?.affinity??0)>-.45).sort((a,b)=>Number(personAge(b)?.child)-Number(personAge(a)?.child)||actorNeeds(a).social-actorNeeds(b).social);
 const members=[{id:host.id,spot:p,arrived:false}],plans=[{w:host,route:e.route(host,p)}];
 for(const w of guests){let spot,route;for(let i=0;i<7;i++){const angle=Math.PI*.16+i*Math.PI*.112,q={x:p.x+Math.cos(angle)*2.6,z:p.z+Math.sin(angle)*2.6};if(members.some(m=>distance(m.spot,q)<1.15)||!standingRoom(e,w,q))continue;const r=e.route(w,q);if(!r)continue;spot=q;route=r;break;}if(!spot)continue;members.push({id:w.id,spot,arrived:false});plans.push({w,route});if(members.length>=ACTOR_RULES.audience+1)break;}
 if(members.length<2)return false;
 const comfort=guests.some(w=>(actorFeelings(w)?.heartbrokenUntil??0)>e.time||(w.grievingUntil??0)>e.time)||e.rhythm?.phase==='recovery';
 const s={id:theatreSchedule(t).nextId++,hostId:host.id,kind:comfort?'comfort':personAge(host)?.child?'play':'story',members,at:e.time,startedAt:null,beat:-1,cancelled:false};theatrePerformance(t).session=s;
 for(const {w,route}of plans){releaseWork(world,w);ensureActorPerformanceParticipation(w).sessionId=s.id;ensureActorPerformanceParticipation(w).seat=members.find(m=>m.id===w.id).spot;w.route=route;w.state='actor-bound';w.wait=0;w.spacingRoute=null;w.decisionReason=w===host?'Sharing a story with the village':'Joining a nearby performance';}
 return true;
}
export function updateActors(world){const e=world.resource('Village');
 if(!e.life)return;const t=actorState(e),s=theatrePerformance(t).session;
 if(s){
  const host=e.workers.find(w=>w.id===s.hostId);
  if(s.cancelled||!host||actorVitality(host)?.dead||personAge(host)?.child||host.mage||host.role&&host.role!=='actor'||!safe(e)){end(world);return;}
  for(const m of [...s.members]){const w=visiblePeople(e).find(w=>w.id===m.id);if(!w||actorPerformanceParticipation(w)?.sessionId!==s.id||!states.has(w.state)||!comfortable(e,w)||w.divineHeld||actorVitality(w)?.dead||actorInterior(w)?.inside){if(w)leavePerformance(world,w);else s.members=s.members.filter(a=>a.id!==m.id);}}
  if(s.cancelled||s.members.length<2){end(world);return;}
  if(s.startedAt==null&&s.members.every(m=>m.arrived)){s.startedAt=e.time;for(const m of s.members){const w=visiblePeople(e).find(w=>w.id===m.id);w.state=m.id===host.id?'actor-performing':'actor-watching';w.facing=m.id===host.id?'front':m.spot.x<host.x?'right':'left';}e.emit('actor-show-started',host,null,{kind:s.kind});}
  if(s.startedAt==null&&e.time-s.at>ACTOR_RULES.arriveTimeout){end(world);return;}
  if(s.startedAt!=null){const age=e.time-s.startedAt,beat=Math.floor(age/4);if(beat>s.beat&&beat<3){s.beat=beat;const guest=s.members.filter(m=>m.id!==host.id)[beat%(s.members.length-1)];if(guest)e.emit('actor-audience-reacted',visiblePeople(e).find(w=>w.id===guest.id),null,{kind:s.kind,beat});}if(age>=ACTOR_RULES.duration+ACTOR_RULES.bow)end(world,true);}
  return;
 }
 if(e.time<theatreSchedule(t).nextAt||!safe(e))return;theatreSchedule(t).nextAt=e.time+ACTOR_RULES.retry;
 const hosts=e.workers.filter(w=>free(w)&&comfortable(e,w)&&!personAge(w)?.child&&!w.mage&&(!w.role||isActor(w))&&(actorPerformanceParticipation(w)?.after??0)<=e.time&&(isActor(w)||(actorPerformanceCareer(w)?.conversations??0)>=2||actorAmbitions(w)?.current?.skill==='acting')).sort((a,b)=>Number(isActor(b))-Number(isActor(a))||skillLevel(b,'acting')-skillLevel(a,'acting')||(actorPerformanceCareer(b)?.conversations??0)-(actorPerformanceCareer(a)?.conversations??0));
 for(const w of hosts.slice(0,3))if(start(world,w))break;
}
export function handleActor(world,w,dt){const e=world.resource('Village');
 if(actorPerformanceParticipation(w)?.sessionId==null)return false;const s=theatrePerformance(e.theatre)?.session,m=s?.members.find(m=>m.id===w.id);
 if(!m||actorPerformanceParticipation(w)?.sessionId!==s.id||!states.has(w.state)||!comfortable(e,w)){leavePerformance(world,w);return false;}
 if(w.state==='actor-bound'){const result=e.move(w,dt);if(result==='blocked'){leavePerformance(world,w);return false;}if(result==='arrived'){m.arrived=true;w.state='actor-wait';}}
 return true;
}
export function validActors(world){const e=world.resource('Village');
 const t=e.theatre;if(t){if(!Number.isFinite(theatreSchedule(t).nextAt)||theatreSchedule(t).nextAt<0||!Number.isSafeInteger(theatreSchedule(t).nextId)||theatreSchedule(t).nextId<0||!Array.isArray(theatreHistory(t).entries)||theatreHistory(t).entries.length>12)return false;const s=theatrePerformance(t).session;if(s&&(!Number.isSafeInteger(s.id)||!e.workers.some(w=>w.id===s.hostId)||!['comfort','story','play'].includes(s.kind)||!Number.isFinite(s.at)||s.startedAt!==null&&!Number.isFinite(s.startedAt)||!Array.isArray(s.members)||s.members.length>6||new Set(s.members.map(m=>m.id)).size!==s.members.length||s.members.some(m=>!Number.isSafeInteger(m.id)||![m.spot?.x,m.spot?.z].every(Number.isFinite))))return false;}
 return e.workers.every(w=>(actorPerformanceCareer(w)?.specialization==null||Number.isFinite(actorPerformanceCareer(w)?.specialization.since)&&actorPerformanceCareer(w)?.specialization.since>=0&&Number.isSafeInteger(actorPerformanceCareer(w)?.specialization.shows)&&actorPerformanceCareer(w)?.specialization.shows>=0)&& (actorPerformanceCareer(w)?.shows==null||Number.isSafeInteger(actorPerformanceCareer(w)?.shows)&&actorPerformanceCareer(w)?.shows>=0));
}
