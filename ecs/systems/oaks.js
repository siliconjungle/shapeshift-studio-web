import {actorSleep} from '../daily-activity-actors.js';
import {releaseWork} from './resource-harvesting.js';
import {ACORN_RULES,OAK_WORK_STATES} from '../../village-acorns.js';
import {visibleAt} from '../../village-exploration.js';
import {standingRoom} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {skillRate} from '../../village-skills.js';
import {ecologyTrees,ecologyClearSite} from '../../village-ecology.js';
import {resourceOak,resourceGrowth,resourceHarvest,resourceWoodland,resourceCondition,resourceDomains,resourceBinding} from '../resource-state.js';
import {actorOakTask,ensureActorOakTask} from '../actor-oak-task.js';
import {actorVitality} from '../actor-vitality.js';
import {personAge} from '../person-age.js';
import {actorInterior} from '../actor-interior.js';
import {actorConstructionTask} from '../actor-construction-task.js';
import {actorRepairTask} from '../actor-repair-task.js';
import {actorNeeds} from '../actor-needs.js';
import {lifeClock} from '../life-state.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const waitingAcorn=n=>resourceOak(n).oakSeedAt!=null&&resourceOak(n).oakPlantedAt==null&&resourceGrowth(n).state==='growing';
const reusableOak=e=>ecologyTrees(e.ecology).find(n=>n.variant==='tree-oak'&&resourceGrowth(n).state==='depleted'&&(resourceCondition(n).burningUntil??0)<=e.time&&e.time-(resourceWoodland(n).felledAt??e.time)>24&&!e.workers.some(w=>w.node===n));
export const hasOakRoom=world=>{const e=world.resource('Village');return !!e.ecology&&(ecologyTrees(e.ecology).length<e.ecology.treeLimit||!!reusableOak(e));};
export function acornTarget(world,target){const e=world.resource('Village');
 const invalid=reason=>({valid:false,reason});
 if(e.culture!=='hearth'||!e.ecology)return invalid('Acorns grow in Hearth');
 const p=target?.anchor??target;
 if(!p||target.kind&&target.kind!=='ground'||!Number.isFinite(p.x)||!Number.isFinite(p.z)||!visibleAt(e,p.x,p.z))return invalid('Choose visible clear ground');
 const trees=ecologyTrees(e.ecology);
 if(trees.filter(waitingAcorn).length>=ACORN_RULES.maxWaiting)return invalid('Let the villagers plant the waiting acorns first');
 if(!hasOakRoom(world))return invalid('This woodland has no room for another tree yet');
 if(!ecologyClearSite(e.ecology,p,ACORN_RULES.footprint)||trees.some(n=>resourceGrowth(n).state!=='depleted'&&dist(n,p)<ACORN_RULES.spacing))return invalid('Leave space for a full-grown oak, away from paths, buildings and crops');
 const routes=e.workers.filter(w=>!actorVitality(w)?.dead&&!personAge(w)?.child).some(w=>[-1,1].some(sign=>e.route(w,{x:p.x+sign*ACORN_RULES.reach,z:p.z+.15})));
 if(!routes)return invalid('A villager needs to be able to reach the planting spot');
 return {valid:true,point:{x:p.x,z:p.z},label:'Leave an acorn for the villagers to plant'};
}
export function placeAcorn(world,check){const e=world.resource('Village');
 const old=reusableOak(e);let id=old?.id;if(!id)do{id='planted-oak-'+e.ecology.nextTree++;}while(e.nodes.some(n=>n.id===id));
 const data={id,kind:'wood',variant:'tree-oak',base:ACORN_RULES.matureHeight,flip:e.random()<.5,...check.point,woodland:true,ecoBornAt:e.time,oakSeedAt:e.time,oakPlantedAt:null,oakTended:false,state:'growing',reservedBy:null,hits:0,growth:0,readyAt:null,felledAt:null,growSeconds:ACORN_RULES.growSeconds,age:0,retryAt:0};
 let n;
 if(old){
  n=old;
  // Reuse the resource identity/render slot; replace each canonical row so no
  // planting contacts, burn state or prior harvest retries leak into the seed.
  const identity={...data};for(const spec of resourceDomains){const row={node:n};for(const key of spec.fields){if(Object.hasOwn(identity,key))row[key]=identity[key];delete identity[key];}const binding=resourceBinding(n);binding.world.add(binding.id,spec.definition.name,row);}
  for(const key of Object.keys(n))delete n[key];Object.assign(n,identity);
 }else {n=data;e.addResource(n);}
e.emit('acorn-appeared',null,n,{x:n.x,z:n.z});return n;
}
export function interruptOak(world,w){const e=world.resource('Village');
 if(!actorOakTask(w)?.job)return;const n=e.nodes.find(n=>n.id===ensureActorOakTask(w).job.nodeId);if(resourceHarvest(n)?.reservedBy===w.id){resourceHarvest(n).reservedBy=null;if(resourceOak(n).oakPlantedAt==null)delete resourceOak(n).oakPlantContactAt;}delete ensureActorOakTask(w).job;ensureActorOakTask(w).after=e.time+5;if(OAK_WORK_STATES.has(w.state))releaseWork(world,w);
}
const eligible=(e,w)=>!!e.life&&!actorVitality(w)?.dead&&!personAge(w)?.child&&!actorInterior(w)?.inside&&!w.divineHeld&&!w.cargo&&!actorConstructionTask(w)?.cargo&&!actorRepairTask(w)?.cargo&&actorNeeds(w).hunger<65&&actorNeeds(w).energy>30&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
export function updateAcorns(world){const e=world.resource('Village');
 for(const n of e.nodes)if(resourceOak(n).oakSeedAt!=null&&resourceHarvest(n).reservedBy!=null){const w=e.workers.find(w=>w.id===resourceHarvest(n).reservedBy);if(!w||actorVitality(w)?.dead||actorOakTask(w)?.job?.nodeId!==n.id||!OAK_WORK_STATES.has(w.state)){if(actorOakTask(w)?.job?.nodeId===n.id)interruptOak(world,w);resourceHarvest(n).reservedBy=null;if(resourceOak(n).oakPlantedAt==null)delete resourceOak(n).oakPlantContactAt;}}
}
export function handleOak(world,w,dt){const e=world.resource('Village');
 const job=actorOakTask(w)?.job;if(!job)return false;const n=e.nodes.find(n=>n.id===job.nodeId);
 if(!n||resourceGrowth(n).state!=='growing'||resourceHarvest(n).reservedBy!==w.id||!eligible(e,w)||(resourceCondition(n).burningUntil??0)>e.time||!OAK_WORK_STATES.has(w.state)){interruptOak(world,w);return false;}
 if(w.state==='oak-bound'){
  const result=e.move(w,dt);if(result==='blocked'){interruptOak(world,w);return true;}if(result!=='arrived')return true;
  w.facing=n.x<w.x?'left':'right';w.state=job.kind==='plant'?'oak-digging':'oak-tending';w.clock.reset(job.kind==='plant'?'till':'harvest');return true;
 }
 // Contact must stay next to the seed: a blocked or displaced worker cannot
 // plant remotely. An interruption releases the single-worker reservation.
 if(dist(w,n)>1.6){interruptOak(world,w);return false;}
 for(const event of w.clock.advance(dt*skillRate(w,'farming'))){
  if(event==='contact'&&w.state==='oak-digging'){job.digs++;e.emit('oak-soil-tapped',w,n);}
  if(event==='contact'&&w.state==='oak-planting'&&resourceOak(n).oakPlantContactAt==null){resourceOak(n).oakPlantContactAt=e.time;e.emit('oak-seed-covered',w,n);}
  if(event!=='finish')continue;
  if(w.state==='oak-digging'){if(job.digs<2){w.clock.reset('till');continue;}w.state='oak-planting';w.clock.reset('harvest');continue;}
  if(w.state==='oak-planting'){resourceOak(n).oakPlantedAt=e.time;resourceWoodland(n).age=0;resourceGrowth(n).growth=.08;resourceOak(n).oakPlanterId=w.id;e.emit('oak-planted',w,n);}
  else {resourceOak(n).oakTended=true;resourceWoodland(n).age=Math.min(resourceWoodland(n).growSeconds-.01,resourceWoodland(n).age+ACORN_RULES.tendBonus);e.emit('oak-tended',w,n);}
  resourceHarvest(n).reservedBy=null;delete ensureActorOakTask(w).job;ensureActorOakTask(w).after=e.time+12;releaseWork(world,w);return true;
 }
 return true;
}
export function chooseOak(world,w){const e=world.resource('Village');
 if(e.culture!=='hearth'||!e.ecology||!eligible(e,w)||w.state!=='idle'||w.spacingRoute?.length||(actorOakTask(w)?.after??0)>e.time||e.leadership?.isLeader(w))return false;
 const candidates=e.nodes.filter(n=>resourceOak(n).oakSeedAt!=null&&resourceGrowth(n).state==='growing'&&resourceHarvest(n).reservedBy===null&&(resourceHarvest(n).retryAt??0)<=e.time&&!(resourceCondition(n).burningUntil>e.time)&&(waitingAcorn(n)||!resourceOak(n).oakTended&&e.time-resourceOak(n).oakPlantedAt>=ACORN_RULES.tendAfter&&resourceGrowth(n).growth<.8)).sort((a,b)=>Number(waitingAcorn(b))-Number(waitingAcorn(a))||dist(w,a)-dist(w,b));
 for(const n of candidates.slice(0,3))for(const sign of [w.x<n.x?-1:1,w.x<n.x?1:-1]){
  const p={x:n.x+sign*ACORN_RULES.reach,z:n.z+.15};if(!standingRoom(e,w,p))continue;const route=e.route(w,p);if(!route)continue;
  releaseWork(world,w);resourceHarvest(n).reservedBy=w.id;w.node=n;ensureActorOakTask(w).job={nodeId:n.id,kind:waitingAcorn(n)?'plant':'tend',digs:0};w.state='oak-bound';w.route=route;w.decisionReason=waitingAcorn(n)?'Planting an oak for future wood':'Tending the young oak';return true;
 }
 ensureActorOakTask(w).after=e.time+4;return false;
}
export function validAcorns(world){const e=world.resource('Village');
 for(const n of e.nodes)if(resourceOak(n).oakSeedAt!=null){if(n.kind!=='wood'||n.variant!=='tree-oak'||!Number.isFinite(resourceOak(n).oakSeedAt)||resourceOak(n).oakSeedAt<0||resourceOak(n).oakPlantedAt!==null&&(!Number.isFinite(resourceOak(n).oakPlantedAt)||resourceOak(n).oakPlantedAt<resourceOak(n).oakSeedAt)||typeof resourceOak(n).oakTended!=='boolean'||!Number.isFinite(resourceWoodland(n).growSeconds)||resourceWoodland(n).growSeconds<=0||!Number.isFinite(resourceWoodland(n).age)||resourceWoodland(n).age<0)return false;}
 return e.workers.every(w=>!actorOakTask(w)?.job||OAK_WORK_STATES.has(w.state)&&['plant','tend'].includes(ensureActorOakTask(w).job.kind)&&Number.isInteger(ensureActorOakTask(w).job.digs)&&ensureActorOakTask(w).job.digs>=0&&e.nodes.some(n=>n.id===ensureActorOakTask(w).job.nodeId&&resourceHarvest(n).reservedBy===w.id));
}
