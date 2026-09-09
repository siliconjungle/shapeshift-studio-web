import {structuralCondition} from './../home-entities.js';
import {ensureActorRepairTask} from '../actor-repair-task.js';
import {constructionProgress} from './../housing-state.js';
import {ensureConstructionProgress} from './../housing-state.js';
import {ensureActorConstructionTask} from './../actor-construction-task.js';
import {plotPreparation} from '../farming-state.js';
import {ensureActorFarmingTask} from '../actor-farming-task.js';
import {chooseWork} from "../../village-resources.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {actorSleep,ensureActorDailyActivity} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {actorDivineIntent,ensureActorDivineResponse,actorDivineResponse,actorFaith} from "../religion-actors.js";
import {personKinship} from "../person-kinship.js";
import {farmingActive,farmingHandle} from "../../village-farming.js";
import {discoveryChoose} from "../../village-discovery.js";
import {housingHandle} from "../../village-housing.js";
import {campfireHandle} from "../../village-campfire.js";
import {actorVitality} from "../actor-vitality.js";
import {survivalRecover} from "../../village-survival.js";
import {personAge} from "../person-age.js";
import {watchAssigned} from "../../village-watch.js";
import {actorNeeds} from "../actor-needs.js";
import {dangerRisk} from "../../village-danger.js";
import {defineGameData} from "../../game-data.js";
import {workPreferences} from "../../village-decisions.js";
import {homePosition} from "../../village-shelter.js";
import {isBedtime} from "../../village-time.js";
import {temperatureOf} from "../../village-temperature.js";
import {handleRepair} from "../../village-repairs.js";
export const DIVINE_REQUEST_RULES=defineGameData('village-divine-request.DIVINE_REQUEST_RULES',Object.freeze({radius:4,declineSeconds:20}));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// Resolve the meaning at landing, before reservations, hunger or preferences
// can silently turn the god's gesture into a different task. Only IDs are saved.
export function inferDivineRequest(world,w){
 const e=world.resource('Village');
 const choices=[],add=(kind,target,task,point=target)=>{const d=distance(w,point);if(d<=DIVINE_REQUEST_RULES.radius)choices.push({kind,targetId:target.id??'campfire',task,distance:d});};
 for(const n of e.nodes)if(resourceGrowth(n)?.state!=='depleted'||resourceCultivation(n)?.needsPlanting)add(resourceCultivation(n)?.needsPlanting?'replant':'work',n,resourceCultivation(n)?.needsPlanting?'replant the nearby garden':({wood:'cut the nearby tree',stone:'mine the nearby stone',food:'gather the nearby food'})[n.kind]);
 for(const c of e.discovery?.chests??[])if(c.openedAt===null)add('chest',c,'open the nearby chest');
 for(const d of e.survival?.drops??[])add('drop',d,'collect the nearby '+d.kind);
 for(const p of e.housing?.projects??[])if(p.owner!=='rival'&&!['complete','destroyed','packed'].includes((constructionProgress(p)?.state))&&((constructionProgress(p)?.stage)>0||(constructionProgress(p)?.strikes)>0||(constructionProgress(p)?.delivered)>0))add('building',p,p.kind==='chapel'?'build the nearby sanctuary':'build the nearby home');
 for(const h of e.life?.homes??[])if(h.kind!=='camp'&&!(structuralCondition(h)?.destroyed))add('repair',h,'repair the nearby building',homePosition(h));
 for(const fire of [e.campfire,...(e.exploration?.camps??[]).filter(c=>c.fire.discovered).map(c=>c.fire)])if(fire&&(fire.built||e.workers.some(p=>p.id===fire.tender&&p.state==='building-ring')))add('campfire',fire,fire.built?'tend the nearby campfire':'build the nearby fire ring');
 const farm=((domainState)=>domainState==null?undefined:(farmingActive(domainState)))(e.farming);if(plotPreparation(farm)?.visible)add('farm',farm,'plant the nearby field');
 choices.sort((a,b)=>a.distance-b.distance||a.kind.localeCompare(b.kind)||String(a.targetId).localeCompare(String(b.targetId)));
 if(!choices.length)return null;const {distance:_,...request}=choices[0];return {...request,status:'pending',askedAt:e.time,roll:e.random()};
}
export function declinedDivineRequest(world,w,kind,targetId){
 const e=world.resource('Village');const r=(actorDivineIntent(w)?.request);return r?.status==='refused'&&r.kind===kind&&r.targetId===targetId&&r.decidedAt+DIVINE_REQUEST_RULES.declineSeconds>e.time;}
export function answerDivineRequest(world,w,status,reason){
 const e=world.resource('Village');
 const r=(actorDivineIntent(w)?.request);if(!r||r.status!=='pending')return;
 Object.assign(r,{status,reason,decidedAt:e.time});
 const text=status==='accepted'?`Our god asked me to ${r.task}, and I agreed.`:status==='refused'?`I knew our god wanted me to ${r.task}, but I refused: ${reason}.`:status==='deferred'?`Our god asked me to ${r.task}, but I had to ${reason}.`:`I understood our god wanted me to ${r.task}, but ${reason}.`;
 (ensureActorDivineResponse(w).memories)=[{text,at:e.time,request:true,status,kind:r.kind,targetId:r.targetId},...((actorDivineResponse(w)?.memories)??[])].slice(0,6);
 (ensureActorDivineResponse(w).mood)={kind:status==='accepted'?'determined':status==='refused'?'defiant':status==='deferred'?'worried':'confused',until:e.time+8};
 e.emit('divine-request-response',w,null,{status,kind:r.kind,targetId:r.targetId,reason});
}
function urgentReason(world,w){
 const e=world.resource('Village');
 if(w.cargo)return 'return my carried supplies first';
 if(actorNeeds(w).hunger>=62&&e.stock.food>0)return 'eat first';
 if(actorNeeds(w).energy<((personAge(w)?.elder)?42:28)||isBedtime(lifeClock(e.life)?.hour??12,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))return 'rest first';
 if((actorVitality(w)?.health)<35||w.recoveringFromCombat)return 'recover from my injuries';
 if(temperatureOf(w)<20||temperatureOf(w)>85)return 'get out of the extreme temperature';
 if(watchAssigned(e.life?.watch,w))return 'keep watch';
 if((e.raids?.alarmUntil??0)>e.time||(w.localAlarmUntil??0)>e.time||dangerRisk(e,w,w))return 'deal with danger first';
 if(e.workers.some(c=>!(actorVitality(c)?.dead)&&(personAge(c)?.child)&&(personKinship(c)?.parents)?.includes(w.id)&&(actorNeeds(c).hunger>=65||actorNeeds(c).care<25)))return 'care for my child first';
 return null;
}
// Observe even when emergency/role handlers take the person out of the normal
// scheduler. A request must never simply disappear without an explanation.
export function observeDivineRequest(world,w){
 const e=world.resource('Village');
 const r=(actorDivineIntent(w)?.request),c=(actorDivineIntent(w)?.choice);if(!r||r.status!=='pending'||!c)return;
 if((actorVitality(w)?.dead)){answerDivineRequest(world,w,'unavailable','I could not carry it out');delete actorDivineIntent(w)?.choice;return;}
 if((personAge(w)?.child)){answerDivineRequest(world,w,'unavailable','I am too young for this work');delete actorDivineIntent(w)?.choice;return;}
 if(e.time<c.readyAt&&w.state==='idle')return;
 const reason=urgentReason(world,w);
 if(reason||w.state!=='idle'||e.time>c.until){answerDivineRequest(world,w,'deferred',reason??(w.state!=='idle'?'attend to something else first':'attend to another need first'));delete actorDivineIntent(w)?.choice;ensureActorDailyActivity(w).careAt=e.time;if(w.cargo)e.returnHome(w);}
}
export function fulfilDivineRequest(world,w,dt){
 const e=world.resource('Village');
 const r=(actorDivineIntent(w)?.request);if(!r||r.status!=='pending')return false;
 const target=r.kind==='work'||r.kind==='replant'?e.nodes.find(n=>n.id===r.targetId):r.kind==='chest'?e.discovery?.chests.find(c=>c.id===r.targetId):r.kind==='drop'?e.survival?.drops.find(d=>d.id===r.targetId):r.kind==='building'?e.housing?.projects.find(p=>p.id===r.targetId):r.kind==='repair'?e.life?.homes.find(h=>h.id===r.targetId):r.kind==='farm'?e.farming?.plots.find(p=>p.id===r.targetId):e.exploration?.camps.find(c=>c.id===r.targetId)?.fire??e.campfire;
 const fail=(reason,status='unavailable')=>{answerDivineRequest(world,w,status,reason);w.wait=2;return true;};
 if(!target)return fail('the task is no longer there');
 const reservedBy=r.kind==='work'||r.kind==='replant'?resourceHarvest(target)?.reservedBy:r.kind==='building'?(constructionProgress(target)?.reservedBy):target.reservedBy;
 if(reservedBy!=null&&reservedBy!==w.id)return fail('someone else is already doing it');
 if(r.kind==='work'&&resourceGrowth(target)?.state!=='ready')return fail('the resource is not ready');
 if(r.kind==='repair'&&(structuralCondition(target).destroyed||structuralCondition(target).health>=structuralCondition(target).maxHealth))return fail('there is no repair work to do');
 if(r.kind==='chest'&&target.openedAt!==null||r.kind==='building'&&['complete','destroyed'].includes((constructionProgress(target)?.state)))return fail('the work is no longer available');
 if(e.leadership?.isLeader(w)&&!['chest','drop'].includes(r.kind))return fail('my role is to lead the tribe','refused');
 const faith=(actorFaith(w)?.belief)?.value??.5,pref=r.kind==='work'||r.kind==='replant'?workPreferences(w)[target.kind]:.5;
 const temperament=({gentle:.12,thoughtful:.08,quiet:.02,outgoing:.04,playful:-.08,blunt:-.2})[(actorPersonality(w)?.trait)]??0;
 const willingness=Math.max(.08,Math.min(.98,.45+faith*.45+temperament+(pref-.5)*.3));
 if(r.roll>willingness)return fail(faith<.35?'I do not trust our god enough':pref<.3?'I dislike this work':'I want to choose for myself','refused');
 let started=false;
 if(r.kind==='work'){chooseWork(e,w,{workOnly:true,ranked:[{node:target,score:100,reason:'Our god asked me to '+r.task}]});started=w.node===target&&w.state==='outbound';}
 else if(r.kind==='chest')started=discoveryChoose(e.discovery,w,{nearby:true,chests:[target]});
 else if(r.kind==='drop')started=survivalRecover(e.survival,w,{candidates:[target]});
 else if(r.kind==='building'){ensureActorConstructionTask(w).retryAt=0;started=housingHandle(e.housing,w,dt,{targetId:target.id});}
 else if(r.kind==='repair'){ensureActorRepairTask(w).retryAt=0;started=handleRepair(e,w,dt,{targetId:target.id});}
 else if(r.kind==='farm'||r.kind==='replant'){ensureActorFarmingTask(w).retryAt=0;started=((domainState)=>domainState==null?undefined:(farmingHandle(domainState,w,dt,{targetId:target.id})))(e.farming);}
 else if(r.kind==='campfire'){w.fireVisitAfter=0;started=campfireHandle(target,w,dt,{requested:true});}
 if(!started)return fail('I cannot do that work right now');
 w.decisionReason='Our god asked me to '+r.task;answerDivineRequest(world,w,'accepted','I agreed to help');
 e.emit('placement-choice',w,null,{kind:r.kind,targetId:r.targetId,reason:w.decisionReason,divineRequest:true});return true;
}

export function validDivineRequest(w){
 const r=(actorDivineIntent(w)?.request);if(r==null)return true;
 return ['work','replant','chest','drop','building','repair','campfire','farm'].includes(r.kind)&&['pending','accepted','refused','deferred','unavailable'].includes(r.status)&&(typeof r.targetId==='string'||Number.isSafeInteger(r.targetId))&&typeof r.task==='string'&&Number.isFinite(r.askedAt)&&Number.isFinite(r.roll)&&r.roll>=0&&r.roll<=1&&(r.status==='pending'||Number.isFinite(r.decidedAt)&&typeof r.reason==='string');
}
