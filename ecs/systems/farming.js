import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {plotPreparation} from '../farming-state.js';
import {farmingSchedule} from '../farming-state.js';
import {farmingHistory} from '../farming-state.js';
import {farmingSites} from '../farming-state.js';
import {plotInput} from '../farming-state.js';
import {ensureActorFarmingTask} from '../actor-farming-task.js';
import {releaseWork} from "../../village-resources.js";
import {resourceCondition} from "../resource-state.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {actorSleep} from "../daily-activity-actors.js";
import {familyBirthPlan} from "../family-entities.js";
import {attachmentsWorkBias} from "../../village-attachments.js";
import {addEnvironmentRecords} from '../../ecs/environment-entities.js';
import {actorVitality} from '../actor-vitality.js';
import {personAge} from '../person-age.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {skillRate} from '../../village-skills.js';
import {exploredAt} from '../../village-exploration.js';

import {declinedDivineRequest} from '../../village-divine-request.js';
import {ageWorkRate} from '../../village-age.js';

import {standingRoom} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {isForage} from '../../village-foraging.js';
import {FARM_RULES,FARM_STATES,farmPlants,validFarmSite} from '../../village-farming.js';

export function farmingActive(world){const state=world.resource('Farming');
return state.plots.find(p=>plotPreparation(p).state!=='ready')
}
export function farmingUpdate(world,dt){const state=world.resource('Farming');

  const e=state.economy,living=e.workers.filter(w=>!(actorVitality(w)?.dead));
  const food=e.nodes.filter(n=>n.kind==='food'&&!isForage(n)),incoming=living.reduce((sum,w)=>sum+(w.cargo?.kind==='food'?w.cargo.amount:0)+(w.node?.kind==='food'?2:0),0);
  const exhausted=food.length>0&&food.every(n=>resourceGrowth(n)?.state!=='ready');
  farmingSchedule(state).shortage=e.stock.food+incoming<living.length?farmingSchedule(state).shortage+dt:0;
  if(farmingActive(world)||state.plots.length>=Math.min(FARM_RULES.maxPlots,farmingSites(state).sites.length+1)||e.time<farmingSchedule(state).nextCheck)return;
  farmingSchedule(state).nextCheck=e.time+3;
  const wanted=Math.ceil((living.length+((familyBirthPlan(e.family))?1:0))/FARM_RULES.villagersPerPlot);
  if(wanted<=state.plots.length&&!(e.time>60&&exhausted&&farmingSchedule(state).shortage>=FARM_RULES.shortageSeconds))return;
  const site=farmingSites(state).sites.find(s=>(!s.id.includes('-expansion-')||exploredAt(e,s.x,s.z))&&!state.plots.some(p=>p.id===s.id)&&validFarmSite(e,s,state.plots));if(!site)return;
  addEnvironmentRecords(state,{...site,state:'planned',passes:0,reservedBy:null,visible:false});farmingSchedule(state).shortage=0;
 
}
export function farmingInterrupt(world,w){const state=world.resource('Farming');

  const plot=state.plots.find(p=>plotPreparation(p).reservedBy===w.id);if(plot)plotPreparation(plot).reservedBy=null;
  if(FARM_STATES.has(w.state)){releaseWork(state.economy,w);ensureActorFarmingTask(w).retryAt=state.economy.time+5}
  ensureActorFarmingTask(w).plotId=null;
 
}
export function farmingRouteTo(world,w,plot){const state=world.resource('Farming');

  const e=state.economy;
  for(const dx of [1.8,-1.8]){const p={x:plot.x+dx,z:plot.z};if(!standingRoom(e,w,p))continue;const route=e.route(w,p);if(route)return route}
  return null;
 
}
export function farmingHandle(world,w,dt,{targetId=null}={}){const state=world.resource('Farming');

  const e=state.economy,plot=state.plots.find(p=>p.id===ensureActorFarmingTask(w).plotId);
  if(w.state==='replant-bound'||w.state==='replanting'){
   const node=w.node;
   if(!resourceCultivation(node)?.needsPlanting||resourceHarvest(node)?.reservedBy!==w.id){farmingInterrupt(world,w);return true}
   if((actorNeeds(w)?.hunger??0)>=85&&e.stock.food>0||(actorNeeds(w)?.energy??100)<12||isBedtime(lifeClock(e.life)?.hour??12,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)){farmingInterrupt(world,w);return true}
   if(w.state==='replant-bound'){
    const status=e.move(w,dt);if(status==='blocked'){resourceHarvest(node).retryAt=e.time+8;farmingInterrupt(world,w)}
    else if(status==='arrived'){w.state='replanting';w.facing=node.x<w.x?'left':'right';w.clock.reset('harvest')}
    return true;
   }
   for(const event of w.clock.advance(dt*skillRate(w,'farming')*ageWorkRate(w)))if(event==='finish'){
    ((Object.assign(resourceCultivation(node),{needsPlanting:false}),node),Object.assign(resourceGrowth(node),{state:'growing',growth:.08}),Object.assign(resourceHarvest(node),{hits:0}),Object.assign(resourceGrowth(node),{readyAt:e.time+FARM_RULES.grow,initialGrow:FARM_RULES.grow}),node);
    e.emit('crop-planted',w,node);releaseWork(e,w);
   }
   return true;
  }
  if(FARM_STATES.has(w.state)){
   if(!plot||plotPreparation(plot).reservedBy!==w.id){farmingInterrupt(world,w);return true}
   if(w.state==='farm-bound'){
    const status=e.move(w,dt);if(status==='moving')return true;if(status==='blocked'){farmingInterrupt(world,w);return true}
    if(!validFarmSite(e,plot,state.plots)){farmingInterrupt(world,w);return true}
    plotPreparation(plot).state=plotPreparation(plot).state==='planned'?'preparing':plotPreparation(plot).state;
    w.state=plotPreparation(plot).state==='planting'?'planting-plot':'preparing-plot';w.facing=plot.x<w.x?'left':'right';w.clock.reset(plotPreparation(plot).state==='planting'?'harvest':'till');return true;
   }
   for(const event of w.clock.advance(dt*skillRate(w,'farming')*ageWorkRate(w))){
    if(event==='contact'){
     plotPreparation(plot).passes++;plotPreparation(plot).visible=true;e.emit('plot-worked',w,null,{plotId:plot.id});
    }
    if(event==='finish'){
     if(plotPreparation(plot).passes<FARM_RULES.workPasses){w.clock.reset(plotPreparation(plot).state==='planting'?'harvest':'till');continue}
     if(plotPreparation(plot).state==='preparing'){plotPreparation(plot).state='planting';plotPreparation(plot).passes=0;w.state='planting-plot';w.clock.reset('harvest');continue}
     plotPreparation(plot).state='ready';plotPreparation(plot).reservedBy=null;farmingHistory(state).completed++;
     const nodes=farmPlants(plot).map(n=>({...n,state:'growing',reservedBy:null,hits:0,growth:.08,readyAt:e.time+FARM_RULES.grow,initialGrow:FARM_RULES.grow}));e.addResource(...nodes);
     e.emit('plot-planted',w,null,{plotId:plot.id});releaseWork(e,w);ensureActorFarmingTask(w).plotId=null;
    }
   }
   return true;
  }
  if((actorVitality(w)?.dead)||(personAge(w)?.child)||(actorInterior(w)?.inside)||w.cargo||w.state!=='idle'||w.spacingRoute?.length||(ensureActorFarmingTask(w).retryAt??0)>e.time||watchAssigned(e.life?.watch,w)||isBedtime(lifeClock(e.life)?.hour??12,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||(actorNeeds(w)?.energy??100)<30)return false;
  // Keep existing gardens productive before opening more land. With an empty
  // pantry, collect a ripe crop first if one is already available.
  if((actorNeeds(w)?.hunger??0)<62&&e.stock.food>0||e.stock.food===0&&!e.nodes.some(n=>n.kind==='food'&&resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy===null)){
   const empty=e.nodes.filter(n=>resourceCultivation(n)?.needsPlanting&&(targetId===null||n.id===targetId)&&!declinedDivineRequest(e,w,'replant',n.id)&&(resourceCondition(n)?.burningUntil??0)<=e.time&&resourceGrowth(n)?.state==='depleted'&&resourceHarvest(n)?.reservedBy===null&&(resourceHarvest(n)?.retryAt??0)<=e.time).sort((a,b)=>Math.hypot(a.x-w.x,a.z-w.z)-Math.hypot(b.x-w.x,b.z-w.z)-(attachmentsWorkBias(e.attachments,w,a)??0)+(attachmentsWorkBias(e.attachments,w,b)??0));
   for(const node of empty.slice(0,3)){
    for(const dx of (w.culture==='solis'?[-.6,.6]:[-.85,.85])){const p={x:node.x+dx,z:node.z+.12};if(!standingRoom(e,w,p))continue;const route=e.route(w,p);if(!route)continue;
     releaseWork(e,w);resourceHarvest(node).reservedBy=w.id;w.node=node;w.job='food';w.state='replant-bound';w.route=route;w.decisionReason='Replanting the harvested garden';return true;
    }
    resourceHarvest(node).retryAt=e.time+8;
   }
  }
  if((actorNeeds(w)?.hunger??0)>=62)return false;
  const site=farmingActive(world);if(!site||targetId!==null&&site.id!==targetId||plotPreparation(site).reservedBy!==null||declinedDivineRequest(e,w,'farm',site.id))return false;
  if(!validFarmSite(e,site,state.plots)){ensureActorFarmingTask(w).retryAt=e.time+5;return false}
  const route=farmingRouteTo(world,w,site);if(!route){ensureActorFarmingTask(w).retryAt=e.time+5;return false}
  releaseWork(e,w);plotPreparation(site).reservedBy=w.id;ensureActorFarmingTask(w).plotId=site.id;w.state='farm-bound';w.route=route;w.decisionReason='Preparing more land for shared food';return true;
 
}
export function farmingSnapshot(world){const state=world.resource('Farming');
return {plots:state.plots.map(p=>plotInput(p)),completed:farmingHistory(state).completed,shortage:farmingSchedule(state).shortage}
}
