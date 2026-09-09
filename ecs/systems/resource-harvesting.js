import {actorPoisonCare} from '../poison-actors.js';
import {endPoisonCare} from './poison.js';
import {appleWorkAvailable,syncAppleResources} from './apples.js';
import {isApple,APPLE_VARIANT} from '../../village-apples.js';
import {actorPerformanceParticipation} from '../performance-actors.js';
import {leavePerformance} from './performances.js';
import {actorOakTask} from '../actor-oak-task.js';
import {resourceOak} from '../resource-state.js';
import {personAge} from '../person-age.js';
import {actorVitality} from '../actor-vitality.js';
import {initialiseWorkPreferences,rankWork} from '../../village-decisions.js';
import {exploredAt} from '../../village-exploration.js';
import {declinedDivineRequest} from '../../village-divine-request.js';
import {standingRoom} from '../../village-spacing.js';
import {survivalRecover} from '../../village-survival.js';
import {discoveryChoose} from '../../village-discovery.js';
import {resourceWoodland} from "../resource-state.js";
import {resourceCultivation} from "../resource-state.js";
import {resourceCondition} from "../resource-state.js";
import {resourceGrowth,resourceHarvest,resourceBinding} from '../resource-state.js';
import {RESOURCE_RULES} from '../../resource-rules.js';
import {isForage,forageRules,harvestForage} from '../../village-foraging.js';
import {skillRate,resourceSkill} from '../../village-skills.js';
import {ageWorkRate} from '../../village-age.js';
import {TRANSITIONS} from '../../animation-transitions.js';
export function depleteResource(world,node,{cause='harvest'}={}){
 const e=world.resource('Village');
 if(resourceBinding(node)?.world!==world)throw Error('Resource does not belong to this village');
  if(node.foodSource==='cactus')resourceCondition(node).burntPlant=cause==='fire';
  const rules=isForage(node)?forageRules(node):RESOURCE_RULES[node.kind];resourceGrowth(node).state='depleted';resourceGrowth(node).growth=0;resourceHarvest(node).reservedBy=null;
  resourceGrowth(node).readyAt=rules.regrow===null?null:e.time+rules.regrow;
  if(node.kind==='food'&&!isForage(node)&&e.farming){resourceCultivation(node).needsPlanting=true;resourceGrowth(node).readyAt=null}
  if(node.kind==='wood'&&e.ecology){resourceWoodland(node).felledAt=e.time;resourceGrowth(node).readyAt=null}
 if(isForage(node))harvestForage(e,node);
 if(node.kind==='wood'&&node.variant===APPLE_VARIANT)syncAppleResources(world);
 
}
export function harvestResourceStep(world,w,dt){
 const e=world.resource('Village');
    const node=w.node;
    if(!node||resourceGrowth(node)?.state!=='ready'||resourceHarvest(node)?.reservedBy!==w.id){releaseWork(world,w);return}
    const rules=isForage(node)?forageRules(node):RESOURCE_RULES[node.kind];
    for(const event of w.clock.advance(dt*skillRate(w,resourceSkill(node))*ageWorkRate(w)*(e.leadership?.moodRate(w)??1))){
     if(event==='contact'){resourceHarvest(node).hits++;e.emit(rules.contact,w,node)}
     if(event==='finish'){
      if(resourceHarvest(node)?.hits<rules.hits){w.clock.reset(rules.action);continue}
      depleteResource(world,node);
      const bonus=node.kind==='food'&&e.leadership&&e.random()<e.leadership.benefits().harvest?1:0;
      w.cargo={kind:node.kind,amount:rules.amount+bonus,...(isForage(node)?{appearance:isApple(node)?'apple':node.foodSource==='cactus'?'fruit':'mushroom'}:{})};e.emit('gathered',w,node,{bonus});w.node=null;e.returnHome(w);w.wait=Math.max(w.wait??0,TRANSITIONS.pickup);
     }
    }
}

export function chooseWork(world,worker,{workOnly=false,ranked:choices=null}={}){const e=world.resource('Village');
  initialiseWorkPreferences(worker);
  if((personAge(worker)?.child)||(actorVitality(worker)?.dead)||e.leadership?.isLeader(worker))return;
  if(!workOnly&&((e.survival)==null?undefined:(survivalRecover(e.survival,worker))))return;
  if(!workOnly&&((domainState)=>domainState==null?undefined:(discoveryChoose(domainState,worker)))(e.discovery))return;
  const available=e.nodes.filter(n=>resourceGrowth(n)?.state==='ready'&&appleWorkAvailable(world,n)&&exploredAt(e,n.x,n.z)&&resourceHarvest(n)?.reservedBy===null&&(resourceHarvest(n)?.retryAt??0)<=e.time&&!declinedDivineRequest(e,worker,'work',n.id)).sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z));
  if(!available.length){worker.job=null;worker.wait=1.5;return}
  const ranked=choices??rankWork(e,worker,available);
  if(ranked[0].score<=0){worker.job=null;worker.decisionReason=null;worker.wait=3;return}
  // Try the best node, then another material before spending the final search
  // on the next best option. Unreachable groves must not starve other work.
  const alternate=ranked.find(candidate=>candidate.node.kind!==ranked[0].node.kind);
  const candidates=[ranked[0],alternate,...ranked.slice(1)].filter((v,i,all)=>v&&all.indexOf(v)===i).slice(0,3);
  // Bound path searches per scheduling pass; failed targets cool down instead
  // of rerunning expensive A* from every worker on every frame.
  for(const {node,reason} of candidates){
   if(!appleWorkAvailable(world,node)||resourceHarvest(node)?.reservedBy!=null||resourceGrowth(node)?.state!=='ready')continue;
   const reach=isApple(node)?1.35:node.kind==='food'?(worker.culture==='solis'?.6:.85):node.kind==='stone'?Math.max(1.15,(node.radius??.7)+.5):1.35;
   const spots=[-1,1].flatMap(side=>[.12,.5,-.2].map(dz=>({x:node.x+side*reach,z:node.z+dz}))).sort((a,b)=>Math.hypot(a.x-worker.x,a.z-worker.z)-Math.hypot(b.x-worker.x,b.z-worker.z));
   for(const spot of spots){if(!standingRoom(e,worker,spot))continue;const route=e.route(worker,spot);if(!route)continue;
    resourceHarvest(node).reservedBy=worker.id;worker.node=node;worker.job=node.kind;worker.route=route;worker.state='outbound';worker.retries=0;worker.taskStartedAt=e.time;worker.decisionReason=reason;return;
   }
   resourceHarvest(node).retryAt=e.time+8;
  }
  worker.job=null;worker.wait=1.5;
 
}

export function releaseWork(world,worker){const e=world.resource('Village');if(actorPoisonCare(worker)?.job)endPoisonCare(world,worker);const carerId=actorPoisonCare(worker)?.carerId;if(carerId!==undefined){const carer=e.workers.find(p=>p.id===carerId);if(carer)endPoisonCare(world,carer);}if(actorPerformanceParticipation(worker)?.sessionId!=null)leavePerformance(world,worker);const oak=actorOakTask(worker);if(oak?.job){const node=e.nodes.find(n=>n.id===oak.job.nodeId);if(resourceHarvest(node)?.reservedBy===worker.id){resourceHarvest(node).reservedBy=null;if(resourceOak(node).oakPlantedAt==null)delete resourceOak(node).oakPlantContactAt;}delete oak.job;oak.after=e.time+5;}if(resourceHarvest(worker.node)?.reservedBy===worker.id)resourceHarvest(worker.node).reservedBy=null;worker.node=null;worker.job=null;worker.route=[];worker.state='idle';worker.wait=1.5;worker.decisionReason=null
}
