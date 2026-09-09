import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {structuralCondition} from './../home-entities.js';
import {actorRepairTask} from './../actor-repair-task.js';
import {repairSchedule,repairAccounting,addRepairJob,replaceRepairJobs} from '../repair-state.js';
import {ensureActorRepairTask} from '../actor-repair-task.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock} from "../life-state.js";
import {actorSleep,actorSocialActivity} from "../daily-activity-actors.js";
import {campfireStoneCost} from '../../village-campfire.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop} from '../../village-survival.js';
import {personAge} from '../person-age.js';
import {memoryRemember} from '../../village-memory.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {supportParticipant} from '../support-participants.js';
import {disasterRepairPriority} from '../../village-community-recovery.js';
import {preferSpecialist,skillRate,resourceSkill} from '../../village-skills.js';
import {defineGameData} from '../../game-data.js';
import {declinedDivineRequest} from '../../village-divine-request.js';
import {ageWorkRate} from '../../village-age.js';
import {temperatureOf,isCold,isHot} from '../../village-temperature.js';
import {homePosition,homeFire,assignBeds} from '../../village-shelter.js';
import {isBedtime} from '../../village-time.js';
import {standingRoute,standingRoom} from '../../village-spacing.js';
import {recoveryState,recoveryThreats,recoveryDistance as distance,urgentFood,coldFuelNeed} from '../../village-recovery-state.js';
export const REPAIR_RULES=defineGameData('village-repairs.REPAIR_RULES',{healthPerLoad:24,strikes:3,inspectSeconds:2,interval:3,retry:8});
export const REPAIR_STATES=new Set(['repair-inspect-bound','repair-inspecting','repair-fetch','repair-bound','repairing']);
export const repairKind=j=>(j.batches??0)%3===2?'stone':'wood';
export function repairSafe(world,h){const e=world.resource('Village');return !!h&&!(structuralCondition(h)?.destroyed)&&!homeFire(e,h)&&!(((structuralCondition(h)?.raidThreatUntil)??0)>e.time)&&!(e.raids?.alarmUntil>e.time)&&!recoveryThreats(e).some(r=>distance(r,homePosition(h))<8);}
export function repairDemand(world){const e=world.resource('Village');
 const demand={wood:0,stone:0};for(const j of e.recovery?.repairs??[]){const h=e.life.homes.find(h=>h.id===j.homeId);if(!h||(structuralCondition(h)?.destroyed)||(structuralCondition(h)?.health)>=(structuralCondition(h)?.maxHealth))continue;const loads=Math.ceil(((structuralCondition(h)?.maxHealth)-(structuralCondition(h)?.health))/REPAIR_RULES.healthPerLoad);for(let i=0;i<loads;i++)demand[(i+(j.batches??0))%3===2?'stone':'wood']++;}
 return demand;
}
export function constructionReserve(world,kind){const e=world.resource('Village');
 const repair=(e.recovery?.repairs??[]).find(j=>{const h=e.life.homes.find(h=>h.id===j.homeId);return h&&!(structuralCondition(h)?.destroyed)&&(structuralCondition(h)?.health)<(structuralCondition(h)?.maxHealth)*.65&&repairKind(j)===kind;});
 return Math.max(repair?1:0,kind==='wood'&&e.campfire?4:0,kind==='stone'&&e.campfire&&!e.campfire.built?campfireStoneCost(e.campfire):0);
}
export function fuelReserve(world){const e=world.resource('Village');return coldFuelNeed(e)?0:(e.recovery?.repairs??[]).some(j=>{const h=e.life.homes.find(h=>h.id===j.homeId);return h&&!(structuralCondition(h)?.destroyed)&&(structuralCondition(h)?.health)<(structuralCondition(h)?.maxHealth)*.65&&repairKind(j)==='wood';})?1:0;}
export function repairContact(world,w){const e=world.resource('Village');const h=e.life.homes.find(h=>h.id===(actorRepairTask(w)?.homeId)),c=homePosition(h??w),d=Math.hypot(w.x-c.x,w.z-c.z)||1,r=h?.kind==='chapel'?2.5:1.8;return {x:c.x+(w.x-c.x)/d*r,z:c.z+(w.z-c.z)/d*r};}
export function spareRepairMaterial(world,j){const e=world.resource('Village');const kind=repairKind(j);return e.stock[kind]-(kind==='wood'&&e.campfire?4:0)>=1;}
function routeTo(e,w,h){
 const c=homePosition(h),obstacle=e.obstacles().find(o=>Math.hypot(o.x-c.x,o.z-c.z)<.1),radius=obstacle?.radius??(h.kind==='chapel'?2.8:2.15);
 // Work beside the wall, within hammer reach. Never let the generic standing
 // search move the repairer metres away from the actual work surface.
 const sides=w.x<c.x?[-1,1]:[1,-1];
 for(const side of sides)for(const dz of [.25,.65,-.25]){
  const p={x:c.x+side*(radius+.32),z:c.z+dz};
  if(!standingRoom(e,w,p))continue;const route=e.route(w,p);if(route)return route;
 }
 return null;
}
export function interruptRepair(world,w){const e=world.resource('Village');
 if((actorRepairTask(w)?.homeId)==null&&!REPAIR_STATES.has(w.state))return;
 const j=e.recovery?.repairs.find(j=>j.homeId===(actorRepairTask(w)?.homeId));if(j?.reservedBy===w.id){j.reservedBy=null;j.strikes=0;}
 if((actorRepairTask(w)?.cargo)){if(w.cargo)survivalDrop(e.survival,w,(actorRepairTask(w)?.cargo).kind,(actorRepairTask(w)?.cargo).amount);else w.cargo={kind:(actorRepairTask(w)?.cargo).kind,amount:(actorRepairTask(w)?.cargo).amount};ensureActorRepairTask(w).cargo=null;}
 ensureActorRepairTask(w).homeId=null;ensureActorRepairTask(w).retryAt=e.time+REPAIR_RULES.retry;if(REPAIR_STATES.has(w.state))releaseWork(e,w);
}
export function updateRepairs(world){const e=world.resource('Village');
 if(!e.life)return;const s=recoveryState(e);if(e.time<repairSchedule(s).nextCheck)return;repairSchedule(s).nextCheck=e.time+REPAIR_RULES.interval;
 for(const h of e.life.homes){if(h.kind==='camp'||(structuralCondition(h)?.destroyed)||(structuralCondition(h)?.health)>=(structuralCondition(h)?.maxHealth)-.01)continue;if(!s.repairs.some(j=>j.homeId===h.id))addRepairJob(s,{homeId:h.id,reservedBy:null,inspectedAt:null,batches:0,strikes:0});}
 replaceRepairJobs(s,s.repairs.filter(j=>{const h=e.life.homes.find(h=>h.id===j.homeId),w=e.workers.find(w=>w.id===j.reservedBy);if(w&&((actorVitality(w)?.dead)||w.divineHeld||(actorRepairTask(w)?.homeId)!==j.homeId||!REPAIR_STATES.has(w.state)))interruptRepair(world,w);if(!w)j.reservedBy=null;return h&&!(structuralCondition(h)?.destroyed)&&((structuralCondition(h)?.health)<(structuralCondition(h)?.maxHealth)-.01||j.reservedBy!=null);}));
}
export function handleRepair(world,w,dt,{targetId=null}={}){const e=world.resource('Village');
 if(!e.life||(actorVitality(w)?.dead)||w.divineHeld)return false;const s=recoveryState(e),j=s.repairs.find(j=>j.homeId===(actorRepairTask(w)?.homeId)),h=e.life.homes.find(h=>h.id===j?.homeId),busy=REPAIR_STATES.has(w.state);
 const urgent=actorNeeds(w).hunger>=65||actorNeeds(w).energy<28||temperatureOf(w)<=15||isHot(w)||urgentFood(e)||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||watchAssigned(e.life.watch,w);
 if(busy){
  if(!j||j.reservedBy!==w.id||!repairSafe(world,h)||urgent||(structuralCondition(h)?.health)>=(structuralCondition(h)?.maxHealth)){interruptRepair(world,w);if(w.cargo)e.returnHome(w);return false;}
  if(w.state==='repair-inspecting'){
   if(e.time<(actorRepairTask(w)?.inspectUntil))return true;j.inspectedAt=e.time;j.strikes=0;
   if(!spareRepairMaterial(world,j)){e.emit('repair-shortage',w,null,{houseId:h.id,kind:repairKind(j)});interruptRepair(world,w);ensureActorRepairTask(w).retryAt=e.time+25;return true;}
   const route=standingRoute(e,w,w.store??e.depot);if(!route){interruptRepair(world,w);return true;}w.route=route;w.state='repair-fetch';w.decisionReason='Collecting '+repairKind(j)+' to mend '+(h.name??'the home');return true;
  }
  if(w.state==='repairing'){
   for(const event of w.clock.advance(dt*skillRate(w,'building')*ageWorkRate(w)*(e.leadership?.workRate(w)??1))){
    if(event==='contact'){j.strikes++;e.emit('repair-hit',w,null,{houseId:h.id});}
    if(event==='finish'){
     if(j.strikes<REPAIR_RULES.strikes){w.clock.reset('work');continue;}
     const cargo=(actorRepairTask(w)?.cargo);if(!cargo){interruptRepair(world,w);return true;}
     const amount=Math.min(REPAIR_RULES.healthPerLoad,(structuralCondition(h)?.maxHealth)-(structuralCondition(h)?.health));structuralCondition(h).health+=amount;structuralCondition(h).lastRepairAt=e.time;repairAccounting(s).consumed[cargo.kind]+=cargo.amount;j.batches++;ensureActorRepairTask(w).cargo=null;repairAccounting(s).repaired+=amount;
     e.emit('building-repaired',w,null,{houseId:h.id,amount,complete:(structuralCondition(h)?.health)>=(structuralCondition(h)?.maxHealth)});
     for(const resident of e.workers.filter(p=>!actorVitality(p)?.dead&&(actorResidence(p)?.home)===h&&p!==w))memoryRemember(e.life.memory,resident,w,'repaired-home');
     j.reservedBy=null;j.strikes=0;ensureActorRepairTask(w).homeId=null;releaseWork(e,w);ensureActorRepairTask(w).retryAt=e.time+2;assignBeds(e);return true;
    }
   }return true;
  }
  const result=e.move(w,dt);if(result==='blocked'){interruptRepair(world,w);if(w.cargo)e.returnHome(w);return true;}if(result!=='arrived')return true;
  if(w.state==='repair-inspect-bound'){w.state='repair-inspecting';ensureActorRepairTask(w).inspectUntil=e.time+REPAIR_RULES.inspectSeconds;w.facing=homePosition(h).x<w.x?'left':'right';e.emit('repair-inspect',w,null,{houseId:h.id});return true;}
  if(w.state==='repair-fetch'){
   const route=routeTo(e,w,h);if(!route||!spareRepairMaterial(world,j)){interruptRepair(world,w);return true;}
   const kind=repairKind(j);e.stock[kind]--;ensureActorRepairTask(w).cargo={kind,amount:1};w.state='repair-bound';w.route=route;e.emit('repair-material-taken',w,null,{kind,amount:1,houseId:h.id});return true;
  }
  w.state='repairing';w.facing=homePosition(h).x<w.x?'left':'right';w.clock.reset('work');return true;
 }
 if(urgent||(personAge(w)?.child)||(actorInterior(w)?.inside)||w.cargo||(actorRepairTask(w)?.cargo)||w.state!=='idle'||w.wait>0||w.spacingRoute?.length||actorSocialActivity(w)?.partnerId!=null||careParticipant(w)?.partnerId!=null||supportParticipant(w)?.partnerId!=null||e.leadership?.isLeader(w)||((actorRepairTask(w)?.retryAt)??0)>e.time||s.repairs.some(j=>j.reservedBy!=null))return false;
 // Leave the rest of the population available for meals, fuel and care.
 const candidates=s.repairs.filter(j=>j.reservedBy==null&&(targetId===null||j.homeId===targetId)&&!declinedDivineRequest(e,w,'repair',j.homeId)).map(j=>({j,h:e.life.homes.find(h=>h.id===j.homeId)})).filter(p=>repairSafe(world,p.h)&&structuralCondition(p.h).health<structuralCondition(p.h).maxHealth).sort((a,b)=>disasterRepairPriority(e,b.h)-disasterRepairPriority(e,a.h)||structuralCondition(a.h).health/structuralCondition(a.h).maxHealth-structuralCondition(b.h).health/structuralCondition(b.h).maxHealth);
 for(const {j,h} of candidates){
  if(!preferSpecialist(e,w,'building',homePosition(h)))continue;
  if((structuralCondition(h)?.health)/(structuralCondition(h)?.maxHealth)>.65&&e.stock.food<e.workers.filter(w=>!(actorVitality(w)?.dead)).length*2)continue;
  if(j.inspectedAt!=null&&!spareRepairMaterial(world,j))continue;
  const route=j.inspectedAt==null?routeTo(e,w,h):standingRoute(e,w,w.store??e.depot);if(!route)continue;
  releaseWork(e,w);w.wait=0;ensureActorRepairTask(w).homeId=h.id;j.reservedBy=w.id;w.route=route;w.state=j.inspectedAt==null?'repair-inspect-bound':'repair-fetch';w.decisionReason=j.inspectedAt==null?'Inspecting damage to '+(h.name??'the home'):'Collecting '+repairKind(j)+' to repair '+(h.name??'the home');return true;
 }
 ensureActorRepairTask(w).retryAt=e.time+REPAIR_RULES.retry;return false;
}
