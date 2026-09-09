import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorRepairTask} from './ecs/actor-repair-task.js';
import {ensureActorRepairTask} from './ecs/actor-repair-task.js';
import {releaseWork} from "./village-resources.js";
import {resourceHarvest,resourceGrowth} from "./ecs/resource-state.js";
export {workPreferences,initialiseWorkPreferences,validWorkPreferences,workPreferenceDetails} from './ecs/systems/personality.js';
import {workPreferences} from './ecs/systems/personality.js';
import {attachmentsWorkBias} from "./village-attachments.js";
import {housingMaterialDemand,housingActive} from './village-housing.js';
import {campfireStoneCost} from './village-campfire.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {dangerRisk} from './village-danger.js';
import {familyFoodRequired} from './village-family.js';

import {skillLevel,resourceSkill} from './village-skills.js';
import {ambitionWorkBias} from './village-ambitions.js';
import {placeBias} from './village-place-history.js';
import {pingWorkPenalty} from './village-pings.js';
import {placeFear} from './expedition-planning.js';
import {repairDemand} from './village-repairs.js';
export const WORK_PREFERENCE_WEIGHT=14;
const labels={food:'Food gathering',wood:'Woodcutting',stone:'Mining'};
const amount={food:2,wood:3,stone:3};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function villageDemand(e){
 const living=e.workers.filter(w=>!(actorVitality(w)?.dead)),fire=e.campfire;
 const targets={food:Math.max(living.length*2,familyFoodRequired(e)??0),wood:fire?4+living.length:3,stone:fire&&!fire.built?campfireStoneCost(fire):2};
 const construction=((domainState)=>domainState==null?undefined:(housingMaterialDemand(domainState)))(e.housing);if(construction){targets.wood+=construction.wood;targets.stone+=construction.stone}
 const repairs=repairDemand(e);targets.wood+=repairs.wood;targets.stone+=repairs.stone;
 const promised={...e.stock};
 for(const w of living){
  if(w.cargo)promised[w.cargo.kind]+=w.cargo.amount;
  if(resourceHarvest(w.node)?.reservedBy===w.id&&resourceGrowth(w.node)?.state==='ready')promised[w.node.kind]+=amount[w.node.kind];
  if(w.firestone)promised.stone+=w.firestone;
  if((actorRepairTask(w)?.cargo))promised[(actorRepairTask(w)?.cargo).kind]+=(actorRepairTask(w)?.cargo).amount;
 }
 return {targets,promised};
}
export function rankWork(e,w,nodes){
 const {targets,promised}=villageDemand(e),preferences=workPreferences(w),repairNeeds=repairDemand(e);
 const urgentFood=e.stock.food===0&&e.workers.some(p=>!(actorVitality(p)?.dead)&&(actorNeeds(p)?.hunger??0)>=((personAge(p)?.child)?65:85));
 return nodes.map(node=>{
  const kind=node.kind,target=targets[kind],deficit=clamp((target-promised[kind])/target,-1,1),distance=Math.hypot(node.x-w.x,node.z-w.z);
  const urgency=kind==='food'&&urgentFood?100:0;
  const weight=kind==='food'?75:kind==='stone'&&e.campfire&&!e.campfire.built?65:45;
  const effort=(kind==='food'?0:Math.max(0,45-(actorNeeds(w)?.energy??100))*.4);
  const fear=(dangerRisk(e,w,node)?35:0)+placeFear(e,w,node)*75;
  const rebuilding=((domainState)=>domainState==null?undefined:(housingActive(domainState)))(e.housing)&&e.workers.some(p=>!(actorVitality(p)?.dead)&&(actorResidence(p)?.homeless))&&kind!=='food';
  const score=skillLevel(w,resourceSkill(node))*6+ambitionWorkBias(w,resourceSkill(node))+placeBias(e,w,node,'work')+(rebuilding?35:0)+(attachmentsWorkBias(e.attachments,w,node)??0)+20+deficit*weight+urgency+preferences[kind]*WORK_PREFERENCE_WEIGHT-Math.min(distance,30)*.65-effort-(w.lastJob===kind?3:0)-fear-pingWorkPenalty(e,node);
  const repairs=repairNeeds[kind]>0;
  const reason=node.foodSource==='mushroom'?'Foraging mushrooms for shared meals':urgency?'The village urgently needs food':rebuilding?'Gathering materials to replace lost beds':repairs&&deficit>0?'Gathering '+kind+' to repair damaged buildings':deficit>0?kind==='food'?'Replenishing shared meals':kind==='stone'&&e.campfire&&!e.campfire.built?'Stone is needed for the fire ring':kind==='wood'?'Keeping firewood in reserve':'Replenishing shared stone':preferences[kind]>.6?'Enjoys '+labels[kind].toLowerCase():'Useful work nearby';
  return {node,score,reason};
 }).sort((a,b)=>b.score-a.score||String(a.node.id).localeCompare(String(b.node.id)));
}
// Only an urgent change abandons an unstarted job. Working strikes and carried
// loads still finish; the next assignment sees all ordinary changes in demand.
export function reconsiderWork(e,w){
 if(w.state!=='outbound'||w.node?.kind==='food'||w.cargo||e.time<(w.reconsiderAt??0)||e.time-(w.taskStartedAt??e.time)<3)return;
 w.reconsiderAt=e.time+2;
 if(e.stock.food===0&&e.workers.some(p=>!(actorVitality(p)?.dead)&&(actorNeeds(p)?.hunger??0)>=((personAge(p)?.child)?65:85))&&e.nodes.some(n=>n.kind==='food'&&resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy===null&&(resourceHarvest(n)?.retryAt??0)<=e.time))releaseWork(e,w);
}
