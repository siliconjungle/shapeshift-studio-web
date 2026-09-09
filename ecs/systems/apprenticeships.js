import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock} from "../life-state.js";
import {actorSocialActivity,actorSleep} from "../daily-activity-actors.js";
import {developmentSchedule} from "../development-state.js";
import {actorLearning,ensureActorLearning,actorSkills} from "../development-actors.js";
import {actorOccasion} from "../actor-occasion.js";
import {watchAssigned} from "../../village-watch.js";
import {dangerRisk} from "../../village-danger.js";
import {personAge} from "../person-age.js";
import {actorVitality} from "../actor-vitality.js";
import {actorNeeds} from "../actor-needs.js";
import {careParticipant} from "../care-participants.js";
import {supportParticipant} from "../support-participants.js";
import {memoryMutual,memoryRemember} from "../../village-memory.js";
import {lifeRelation} from "../../village-life.js";
import {skillLevel,workingSkill,gainSkill,SKILL_THRESHOLDS,SKILLS} from "../../village-skills.js";
import {standingRoom} from "../../village-spacing.js";
import {isBedtime} from "../../village-time.js";
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const fit=(world,w)=>{const e=world.resource('Village');return !(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.exiled&&!w.expeditionId&&!w.rivalJourney&&!w.cargo&&careParticipant(w)?.partnerId==null&&actorSocialActivity(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&!(actorOccasion(w)?.id)&&!w.role&&!watchAssigned(e.life.watch,w)&&(actorVitality(w)?.health)>65&&actorNeeds(w).hunger<50&&actorNeeds(w).energy>45&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)&&!(e.raids?.alarmUntil>e.time);};
function finish(world,w){
 const e=world.resource('Village');const a=(actorLearning(w)?.lesson);if(!a)return;const mentor=e.workers.find(p=>p.id===a.mentorId);if(a.learned>=1&&mentor){if(!(actorVitality(mentor)?.dead))memoryMutual(e.life.memory,w,mentor,'taught',.035);(ensureActorLearning(w).history)=[{skill:a.skill,mentorId:mentor.id,mentorName:mentor.name,at:e.time,amount:a.learned,completed:a.stage==='success'},...((actorLearning(w)?.history)??[])].slice(0,8);}delete actorLearning(w)?.lesson;(ensureActorLearning(w).after)=e.time+40;if(w.state==='apprentice-bound'||w.state==='apprentice-learning')releaseWork(e,w);}
export function updateApprenticeships(world){
 const e=world.resource('Village');
 if(!e.life||(developmentSchedule(e).apprenticeAt??60)>e.time)return;developmentSchedule(e).apprenticeAt=e.time+8;
 const teachers=e.workers.filter(w=>fit(world,w)&&workingSkill(w)&&!['combat','exploring','diplomacy'].includes(workingSkill(w))&&skillLevel(w,workingSkill(w))>=1&&!e.workers.some(p=>(actorLearning(p)?.lesson)?.mentorId===w.id));
 const students=e.workers.filter(w=>fit(world,w)&&!(actorLearning(w)?.lesson)&&((actorLearning(w)?.after)??0)<=e.time&&(w.state==='idle'||(personAge(w)?.child)&&w.state==='following')).sort((a,b)=>Number((personAge(b)?.child))-Number((personAge(a)?.child))||((actorLearning(a)?.after)??0)-((actorLearning(b)?.after)??0));
 for(const w of students){
  (ensureActorLearning(w).after)=e.time+20;
  const mentor=teachers.filter(t=>t!==w&&distance(w,t)<10&&skillLevel(t,workingSkill(t))>skillLevel(w,workingSkill(t))&&(!(personAge(w)?.child)||skillLevel(w,workingSkill(t))<2)&&!e.workers.some(p=>(actorLearning(p)?.lesson)?.mentorId===t.id)).sort((a,b)=>(lifeRelation(e.life,w.id,b.id)?.affinity??0)-(lifeRelation(e.life,w.id,a.id)?.affinity??0)||distance(w,a)-distance(w,b))[0];
  if(!mentor)continue;
  for(let i=0;i<8;i++){
   const angle=i*Math.PI/4,point={x:mentor.x+Math.cos(angle)*1.7,z:mentor.z+Math.sin(angle)*1.7};if(!standingRoom(e,w,point))continue;const route=e.route(w,point);if(!route||dangerRisk(e,w,point,route))continue;
   releaseWork(e,w);w.state='apprentice-bound';w.route=route;w.wait=0;(ensureActorLearning(w).lesson)={mentorId:mentor.id,skill:workingSkill(mentor),until:e.time+25,learned:0};e.emit('apprentice-started',w,null,{mentorId:mentor.id,skill:(actorLearning(w)?.lesson).skill});break;
  }
 }
}
export function handleApprenticeship(world,w,dt){
 const e=world.resource('Village');
 const a=(actorLearning(w)?.lesson);if(!a)return false;const mentor=e.workers.find(p=>p.id===a.mentorId);
 if(!fit(world,w)||!mentor||(actorVitality(mentor)?.dead)||(actorInterior(mentor)?.inside)||e.time>=a.until||workingSkill(mentor)!==a.skill||distance(w,mentor)>12||!['apprentice-bound','apprentice-learning'].includes(w.state)){finish(world,w);return false;}
 if(w.state==='apprentice-bound'){const result=e.move(w,dt);if(result==='blocked'){finish(world,w);return false;}if(result==='arrived'){w.state='apprentice-learning';w.route=[];a.startedAt=e.time;a.stageAt=e.time;a.stage='watch';e.emit('apprentice-watching',w,null,{mentorId:mentor.id,skill:a.skill});}return true;}
 if(distance(w,mentor)>2.8){finish(world,w);return false;}
 w.facing=mentor.x<w.x?'left':'right';
 a.stage??='watch';a.stageAt??=e.time;a.startedAt??=e.time;
 const durations={watch:2.5,try:2.6,fumble:1.1,encourage:2,retry:2.6,success:1.6},next={watch:'try',try:'fumble',fumble:'encourage',encourage:'retry',retry:'success'};
 if(e.time-a.stageAt>=durations[a.stage]){if(a.stage==='success'){finish(world,w);return true;}a.stage=next[a.stage];a.stageAt=e.time;e.emit('apprentice-'+a.stage,w,null,{mentorId:mentor.id,skill:a.skill});if(a.stage==='encourage')memoryRemember(e.life.memory,w,mentor,'encouraged');}

 const cap=SKILL_THRESHOLDS[Math.min((personAge(w)?.child)?2:5,skillLevel(mentor,a.skill))],xp=(actorSkills(w)?.values)?.[a.skill]?.xp??0;
 if(xp>=cap){finish(world,w);return false;}
 a.learned+=gainSkill(e,w,a.skill,Math.min(cap-xp,dt*.6*(1+skillLevel(mentor,'caregiving')*.1)),'teaching');actorNeeds(w).social=Math.min(100,actorNeeds(w).social+dt*.4);return true;
}
export function handleMentor(world,w){
 const e=world.resource('Village');const student=e.workers.find(p=>(actorLearning(p)?.lesson)?.mentorId===w.id);if(!student||!fit(world,w)||(actorVitality(student)?.dead)||(actorInterior(student)?.inside)||(actorLearning(student)?.lesson).until<=e.time||workingSkill(w)!==(actorLearning(student)?.lesson).skill)return false;return true;}
export function validApprenticeship(w){const a=(actorLearning(w)?.lesson);return !a||Number.isSafeInteger(a.mentorId)&&!!SKILLS[a.skill]&&Number.isFinite(a.until)&&a.until>=0&&Number.isFinite(a.learned)&&a.learned>=0&&a.learned<=500&&(a.stage===undefined||['watch','try','fumble','encourage','retry','success'].includes(a.stage))&&(a.stageAt===undefined||Number.isFinite(a.stageAt)&&a.stageAt>=0)&&(a.startedAt===undefined||Number.isFinite(a.startedAt)&&a.startedAt>=0);}
