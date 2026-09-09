import {poisoned} from './poison.js';
import {POISON_RULES} from '../../village-poison.js';
import {actorWorld} from '../actor-entities.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorRepairTask} from './../actor-repair-task.js';
import {ensureActorRepairTask} from '../actor-repair-task.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {actorSocialActivity} from "../daily-activity-actors.js";
import {actorSkills,ensureActorSkills,ensureActorLearning,actorLearning,actorAmbitions} from "../development-actors.js";
import {SKILLS,SKILL_THRESHOLDS} from "../development-rules.js";
import {actorCookingTask} from "../actor-cooking-task.js";
import {personAge} from "../person-age.js";
import {actorVitality} from "../actor-vitality.js";
import {actorNeeds} from "../actor-needs.js";
import {careParticipant} from "../care-participants.js";
import {supportParticipant} from "../support-participants.js";
// Plain simulation records; no render-time XP or wall-clock progression.


export const skillLevel=(w,id)=>{const xp=(actorSkills(w)?.values)?.[id]?.xp??0;let level=0;while(level<5&&xp>=SKILL_THRESHOLDS[level+1])level++;return level;};
export const skillRate=(w,id)=>(1+skillLevel(w,id)*.1)*(poisoned(w,actorWorld(w)?.resource('Village').time??0)?POISON_RULES.workRate:1);
export const resourceSkill=n=>({food:'farming',wood:'woodcutting',stone:'mining'})[typeof n==='string'?n:n?.kind];
export function workingSkill(w){if(w.state==='working')return resourceSkill(w.node);return ({'actor-performing':'acting','oak-digging':'farming','oak-planting':'farming','oak-tending':'farming','scarecrow-building':'building','house-building':'building',repairing:'building','building-ring':'building','preparing-plot':'farming','planting-plot':'farming',replanting:'farming','cooking-stir':'cooking',caring:'caregiving',supporting:'caregiving',socialising:'diplomacy',defending:'combat',scouting:'exploring','ping-walking':'exploring'})[w.state]??null;}
export function gainSkill(world,w,id,amount,source='practice'){
 const e=world.resource('Village');
 if(!w||(actorVitality(w)?.dead)||id==='magic'&&!w.mage||!SKILLS[id]||!(amount>0)||!Number.isFinite(amount))return 0;
 const before=skillLevel(w,id),skills=(ensureActorSkills(w).values)??={},r=skills[id]??={xp:0,practised:0,taught:0};
 const actual=Math.min(amount,500-r.xp);if(actual<=0)return 0;r.xp+=actual;r[source==='teaching'?'taught':'practised']+=actual;
 const level=skillLevel(w,id);if(level>before){
  (ensureActorSkills(w).celebration)={skill:id,level,at:e.time};
  e.emit('skill-level-up',w,null,{skill:id,level,previous:before,source});
 }return actual;
}
export function noticeSkillEvent(world,event){
 const e=world.resource('Village');
 let w=e.workers.find(w=>w.id===event.workerId),id,amount=0;
 if(event.type==='gathered'){id=resourceSkill(e.nodes.find(n=>n.id===event.nodeId));amount=5;}
 else if(['crop-planted','plot-worked','plot-planted','oak-planted','oak-tended'].includes(event.type)){id='farming';amount=event.type==='plot-planted'?5:2;}
 else if(['house-stage-completed','house-completed','building-repaired','camp-packed'].includes(event.type)){id='building';amount=event.type==='house-completed'?10:4;}
 else if(event.type==='stew-ready'){id='cooking';amount=6;}
 else if(['child-cared-for','elder-cared-for','child-rescued'].includes(event.type)){w=e.workers.find(w=>w.id===(event.caregiverId??event.partnerId));id='caregiving';amount=5;}
 else if(event.type==='social-finish'&&event.kind!=='argument'||event.type==='rival-trade'){id='diplomacy';amount=3;const peer=e.workers.find(w=>w.id===event.partnerId);if(peer)gainSkill(world,peer,id,2);}
 else if(event.type==='defend'||event.type==='frenzy-hit'||event.type==='arrow-hit'){id='combat';amount=2;}
 else if(event.type==='treasure-opened'||event.type==='exploration-arrived'||event.type==='expedition-cue'&&event.reason==='grove-discovered'||event.type==='ping-response'&&event.arrived){id='exploring';amount=4;}
 if(event.type==='elder-cared-for'){const elder=e.workers.find(p=>p.id===event.workerId),student=e.workers.find(p=>p.id===event.caregiverId);if(elder&&student){const best=Object.keys(SKILLS).filter(k=>(k!=='magic'||student.mage)&&skillLevel(elder,k)>skillLevel(student,k)).sort((a,b)=>skillLevel(elder,b)-skillLevel(elder,a))[0];if(best){const learned=gainSkill(world,student,best,3,'teaching');(ensureActorLearning(student).history)=[{skill:best,mentorId:elder.id,mentorName:elder.name,at:e.time,amount:learned},...((actorLearning(student)?.history)??[])].slice(0,8);}}}
 if(id)gainSkill(world,w,id,amount);
}
export function skillDetails(w){return Object.entries(SKILLS).filter(([id])=>id!=='magic'||w.mage).map(([id,s])=>{const level=skillLevel(w,id),xp=(actorSkills(w)?.values)?.[id]?.xp??0,next=SKILL_THRESHOLDS[level+1];return {id,name:s.name,level,xp:Math.floor(xp),progress:level===5?100:Math.floor((xp-SKILL_THRESHOLDS[level])/(next-SKILL_THRESHOLDS[level])*100),description:s.description};});}
export function validSkills(w){
 if((actorSkills(w)?.values)!==undefined&&(typeof (actorSkills(w)?.values)!=='object'||!(actorSkills(w)?.values)||Array.isArray((actorSkills(w)?.values))||Object.entries((actorSkills(w)?.values)).some(([id,r])=>!SKILLS[id]||!r||!['xp','practised','taught'].every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=500)||r.xp>500)))return false;
 const c=(actorSkills(w)?.celebration);return !c||!!SKILLS[c.skill]&&Number.isInteger(c.level)&&c.level>=1&&c.level<=5&&Number.isFinite(c.at)&&c.at>=0;
}
// Let a nearby free specialist take the next job. Never wait for someone busy
// or unsafe, and give a failed approach a cooldown in the job's own scheduler.
export function preferSpecialist(world,w,id,point=world.resource('Village').depot){
 const e=world.resource('Village');
 const score=p=>skillLevel(p,id)*3+((actorAmbitions(p)?.current)?.kind==='mastery'&&(actorAmbitions(p)?.current).skill===id?4:0);
 return !e.workers.some(p=>p!==w&&!(actorVitality(p)?.dead)&&!(personAge(p)?.child)&&!(actorInterior(p)?.inside)&&!p.divineHeld&&!p.exiled&&!p.expeditionId&&!p.rivalJourney&&!p.role&&!p.cargo&&actorSocialActivity(p)?.partnerId==null&&careParticipant(p)?.partnerId==null&&supportParticipant(p)?.partnerId==null&&!(actorLearning(p)?.lesson)&&p.state==='idle'&&p.wait<=0&&actorNeeds(p).hunger<55&&actorNeeds(p).energy>45&&Math.hypot(p.x-point.x,p.z-point.z)<9&&((actorConstructionTask(p)?.retryAt)??0)<=e.time&&((actorRepairTask(p)?.retryAt)??0)<=e.time&&((actorCookingTask(p)?.cookingAfter)??0)<=e.time&&score(p)>score(w));
}
