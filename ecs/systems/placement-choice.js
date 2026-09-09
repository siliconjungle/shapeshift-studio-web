import {chooseWork} from "../../village-resources.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {ensureActorDailyActivity} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {ensureActorDivineIntent,actorDivineIntent} from "../religion-actors.js";
import {discoveryCapable,discoveryChoose} from "../../village-discovery.js";
import {campfireHandle} from "../../village-campfire.js";
import {actorVitality} from "../actor-vitality.js";
import {survivalRecover} from "../../village-survival.js";
import {lifeHandle} from "../../village-life.js";
import {personAge} from "../person-age.js";
import {defineGameData} from "../../game-data.js";
import {inferDivineRequest,fulfilDivineRequest,answerDivineRequest} from "../../village-divine-request.js";
import {rankWork} from "../../village-decisions.js";
import {isCold} from "../../village-temperature.js";
export const PLACEMENT_CHOICE_RULES=defineGameData('village-placement-choice.PLACEMENT_CHOICE_RULES',{radius:4,settle:.6,lifetime:8});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function interruptedTask(w){return {state:w.state,nodeId:w.node?.id??null,chestId:w.discoveryId??null,dropId:w.recoveryDrop?.id??null};}
export function queuePlacementChoice(world,w,previous){
 const e=world.resource('Village');(ensureActorDivineIntent(w).choice)={previous:previous??{},readyAt:e.time+PLACEMENT_CHOICE_RULES.settle,until:e.time+PLACEMENT_CHOICE_RULES.lifetime};(ensureActorDivineIntent(w).request)=inferDivineRequest(e,w);if((actorDivineIntent(w)?.request)){e.emit('divine-request-noticed',w);if(!e.workers.includes(w))answerDivineRequest(e,w,'refused','I belong to another tribe');}w.decisionReason=null;}
function decided(world,w,kind,targetId,reason){
 const e=world.resource('Village');w.decisionReason=reason;e.emit('placement-choice',w,null,{kind,targetId,reason});return true;}
// One fresh choice after landing; subsequent work uses the ordinary scheduler.
// Emergency handlers and childcare run first, and all candidates use real routes.
export function handlePlacementChoice(world,w,dt){
 const e=world.resource('Village');
 const choice=(actorDivineIntent(w)?.choice);if(!choice)return false;
 if(e.time>choice.until||w.state!=='idle'||(actorVitality(w)?.dead)||(personAge(w)?.child)){delete actorDivineIntent(w)?.choice;return false;}
 if(e.time<choice.readyAt)return true;
 delete actorDivineIntent(w)?.choice;w.wait=0;ensureActorDailyActivity(w).careAt=e.time;
 if(fulfilDivineRequest(e,w,dt))return true;
 if(w.cargo){e.returnHome(w);return decided(world,w,'delivery',null,'Bringing my carried '+w.cargo.kind+' back before starting something else');}
 if(((e.life)==null?undefined:(lifeHandle(e.life,w,dt))))return true;
 if(isCold(w)&&((campfireState)=>campfireState==null?undefined:(campfireHandle(campfireState,w,dt)))(e.campfire))return true;
 const radius=PLACEMENT_CHOICE_RULES.radius,previous=choice.previous,options=[];
 if(((domainState)=>domainState==null?undefined:(discoveryCapable(domainState,w)))(e.discovery))for(const c of e.discovery.chests){
  const d=distance(w,c);if(d>radius||c.openedAt!==null||c.reservedBy!==null||c.retryAt>e.time&&c.id!==previous.chestId)continue;
  const curiosity=['thoughtful','playful'].includes((actorPersonality(w)?.trait))?8:(actorPersonality(w)?.trait)==='blunt'?-5:0;
  options.push({kind:'chest',target:c,score:100-d*5+curiosity,reason:'Noticed a nearby chest after being put down'});
 }
 for(const drop of e.survival?.drops??[]){const d=distance(w,drop);if(d>radius||drop.reservedBy!==null||(drop.availableAt??0)>e.time)continue;options.push({kind:'drop',target:drop,score:52-d*3+(drop.kind==='food'&&e.stock.food<2?45:0),reason:'Collecting loose '+drop.kind+' nearby'});}
 const nodes=e.nodes.filter(n=>resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy===null&&(resourceHarvest(n)?.retryAt??0)<=e.time);
 for(const candidate of e.leadership?.isLeader(w)?[]:rankWork(e,w,nodes)){
  const d=distance(w,candidate.node),resume=candidate.node.id===previous.nodeId;
  const score=candidate.score+Math.max(0,radius-d)*7+(resume?8+Math.min(12,resourceHarvest(candidate.node)?.hits*3):0);
  if(score<=0)continue;
  options.push({kind:'work',target:candidate.node,score,reason:resume?'Continuing my interrupted work':d<=radius?'Noticed useful '+candidate.node.kind+' nearby':candidate.reason});
 }
 options.sort((a,b)=>b.score-a.score||String(a.target.id).localeCompare(String(b.target.id)));
 for(const option of options.slice(0,3)){
  const {kind,target,reason}=option;let started=false;
  if(kind==='chest')started=discoveryChoose(e.discovery,w,{nearby:true,chests:[target]});
  else if(kind==='drop')started=survivalRecover(e.survival,w,{candidates:[target]});
  else{chooseWork(e,w,{workOnly:true,ranked:[{node:target,score:option.score,reason}]});started=w.state==='outbound';}
  if(started)return decided(world,w,kind,target.id,reason);
 }
 return false;
}
