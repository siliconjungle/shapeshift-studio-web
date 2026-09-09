import {homeCapacity} from './../home-entities.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {structuralCondition} from './../home-entities.js';
import {addHome,applyHomeInput} from '../home-entities.js';
import {constructionProgress} from './../housing-state.js';
import {applyConstructionInput,constructionInput,ensureConstructionProgress} from './../housing-state.js';
import {housingAccounting,housingSchedule,housingSites} from './../housing-state.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock} from "../life-state.js";
import {actorSleep} from "../daily-activity-actors.js";
import {familyBirthPlan} from "../family-entities.js";
import {personKinship} from '../person-kinship.js';
import {addEnvironmentRecords} from '../../ecs/environment-entities.js';
import {actorVitality} from '../actor-vitality.js';
import {personAge} from '../person-age.js';
import {actorRomance} from '../actor-romance.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {familyCapacity} from '../../village-family.js';
import {preferSpecialist,skillRate} from '../../village-skills.js';

import {updateCamps,finishCamp,finishPackingStage} from '../../village-camps.js';
import {WATCHTOWER_RULES,watchtowerSites,needsWatchtower} from '../../village-watchtowers.js';
import {exploredAt} from '../../village-exploration.js';

import {declinedDivineRequest} from '../../village-divine-request.js';
import {ageWorkRate} from '../../village-age.js';

import {constructionReserve} from '../../village-repairs.js';
import {CHAPEL_SITES} from '../../village-chapel.js';
import {assignBeds,homePosition} from '../../village-shelter.js';

import {standingRoom} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {homeBeds} from '../../village-childcare.js';
import {HOUSE_RULES,buildingRules,buildingStages,projectStages,HOUSE_STATES,houseEntrance,validHouseSite} from '../../village-housing.js';

export function housingActive(world){const state=world.resource('Housing');
return state.projects.find(p=>p.owner!=='rival'&&!p.expeditionId&&p.abandonedAt==null&&!['complete','destroyed','packed'].includes((constructionProgress(p)?.state)))
}
export function housingObstacles(world){const state=world.resource('Housing');
return state.projects.filter(p=>(constructionProgress(p)?.state)!=='packed'&&(p.kind!=='camp'||(constructionProgress(p)?.state)!=='destroyed')).map(p=>({houseId:p.id,x:p.x,z:p.z,radius:buildingRules(p).radius}))
}
export function housingMaterialDemand(world){const state=world.resource('Housing');
const p=housingActive(world),result={wood:0,stone:0};if(!p||p.packing)return result;const stage=buildingStages(p)[(constructionProgress(p)?.stage)];result[stage.kind]=Math.max(0,stage.amount-(constructionProgress(p)?.delivered)-state.economy.workers.reduce((n,w)=>n+((actorConstructionTask(w)?.cargo)?.projectId===p.id?(actorConstructionTask(w)?.cargo).amount:0),0));return result
}
export function housingUpdate(world){const state=world.resource('Housing');

  const e=state.economy,living=e.workers.filter(w=>!(actorVitality(w)?.dead));updateCamps(e);
  if(e.time>=housingSchedule(state).nextMove){housingSchedule(state).nextMove=e.time+5;housingSettleAdults(world)}
  if(housingActive(world)||e.time<housingSchedule(state).nextCheck||!e.family)return;housingSchedule(state).nextCheck=e.time+4;
  const displaced=living.some(w=>(actorResidence(w)?.homeless));
  if(!living.length)return;
  const chapelNeeded=!!e.leadership?.leader&&!e.leadership?.revolt&&!e.life.homes.some(h=>h.kind==='chapel'&&!(structuralCondition(h)?.destroyed));
  const towerNeeded=needsWatchtower(e);
  const needsHousing=displaced||living.length+((familyBirthPlan(e.family))?1:0)>=familyCapacity(e)-1;
  if(!needsHousing&&!chapelNeeded&&!towerNeeded||!displaced&&e.stock.food<living.length*2)return;
  const ruin=e.life.homes.find(h=>h.kind!=='camp'&&(structuralCondition(h)?.destroyed)&&(h.kind==='watchtower'?towerNeeded:h.kind==='chapel'?chapelNeeded:needsHousing)&&!state.projects.some(p=>p.id===h.id&&(constructionProgress(p)?.state)!=='destroyed'));
  if(ruin&&(displaced||chapelNeeded||towerNeeded)&&e.time-(structuralCondition(ruin).destroyedAt??0)<6)return;
  if(ruin&&(displaced||chapelNeeded||towerNeeded)){const old=state.projects.find(p=>p.id===ruin.id),project={id:ruin.id,kind:ruin.kind??'cottage',stages:projectStages(e,ruin.kind),...homePosition(ruin),flip:!!ruin.flip,state:'supplying',stage:0,delivered:0,strikes:0,reservedBy:null,spent:{wood:0,stone:0},lastHitAt:-100,rebuilding:true};if(old)applyConstructionInput(old,project);else addEnvironmentRecords(state,project);e.emit('house-planned',null,null,{houseId:project.id});return}
  const candidates=needsHousing?(state.projects.filter(p=>(p.kind??'cottage')==='cottage'&&(constructionProgress(p)?.state)!=='destroyed').length<HOUSE_RULES.maxHouses?housingSites(state).sites:[]):chapelNeeded?(housingSites(state).chapelSites??CHAPEL_SITES).map(s=>({...s,kind:'chapel'})):watchtowerSites(e).filter(s=>exploredAt(e,s.x,s.z)&&![...housingSites(state).sites,...housingSites(state).chapelSites].some(p=>Math.hypot(p.x-s.x,p.z-s.z)<buildingRules(p).radius+WATCHTOWER_RULES.radius+.5));
  const site=candidates.find(s=>(!s.id.includes('-expansion-')||exploredAt(e,s.x,s.z))&&!state.projects.some(p=>p.id===s.id)&&validHouseSite(e,s)&&living.every(w=>(actorInterior(w)?.inside)||Math.hypot(w.x-s.x,w.z-s.z)>buildingRules(s).radius+.7)&&living.some(w=>!(personAge(w)?.child)&&housingRouteTo(world,w,s)));
  if(!site)return;
  const project={...site,kind:site.kind??'cottage',stages:projectStages(e,site.kind),flip:e.random()<.5,state:'supplying',stage:0,delivered:0,strikes:0,reservedBy:null,spent:{wood:0,stone:0},lastHitAt:-100};
  addEnvironmentRecords(state,project);e.emit('house-planned',null,null,{houseId:project.id});
 
}
export function housingSettleAdults(world){const state=world.resource('Housing');

  const e=state.economy;
  for(const p of state.projects.filter(p=>(constructionProgress(p)?.state)==='complete'&&buildingRules(p).beds>0&&p.kind!=='chapel'&&p.kind!=='camp')){
   const home=e.life.homes.find(h=>h.id===p.id);if(e.workers.some(w=>!(actorVitality(w)?.dead)&&(actorResidence(w)?.home)===home))continue;
   // Grown children establish a household; young children stay with caregivers.
   const adult=e.workers.find(w=>!w.expeditionId&&!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&w.state==='idle'&&(personKinship(w)?.parents)?.length&&(actorResidence(w)?.home)!==home&&e.workers.filter(o=>!(actorVitality(o)?.dead)&&(actorResidence(o)?.home)===(actorResidence(w)?.home)).length>1);
   if(!adult)continue;
   const partner=e.workers.find(w=>!w.expeditionId&&w.id===(actorRomance(adult)?.sweetheartId)&&!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&w.state==='idle');
   const members=[adult,...(partner?[partner]:[])];for(const w of e.workers)if(!(actorVitality(w)?.dead)&&(personAge(w)?.child)&&(personKinship(w)?.parents)?.some(id=>members.some(a=>a.id===id)))members.push(w);
   if(members.length>homeBeds(home))continue;
   for(const w of members)ensureActorResidence(w).home=home;
  }
 
}
export function housingRouteTo(world,w,p){const state=world.resource('Housing');

  const e=state.economy;
  for(const dx of [buildingRules(p).radius+.65,-buildingRules(p).radius-.65]){const point={x:p.x+dx,z:p.z+.35};if(standingRoom(e,w,point)){const route=e.route(w,point);if(route)return route}}
  return null;
 
}
export function housingInterrupt(world,w){const state=world.resource('Housing');

  const p=state.projects.find(p=>(constructionProgress(p)?.reservedBy)===w.id);if(p)ensureConstructionProgress(p).reservedBy=null;
  if((actorConstructionTask(w)?.cargo)){w.cargo={kind:(actorConstructionTask(w)?.cargo).kind,amount:(actorConstructionTask(w)?.cargo).amount};ensureActorConstructionTask(w).cargo=null}
  if(HOUSE_STATES.has(w.state)){releaseWork(state.economy,w);ensureActorConstructionTask(w).retryAt=state.economy.time+5}
  ensureActorConstructionTask(w).projectId=null;
 
}
export function housingPause(world,w){const state=world.resource('Housing');
housingInterrupt(world,w);if(w.cargo)state.economy.returnHome(w)
}
export function housingHandle(world,w,dt,{targetId=null}={}){const state=world.resource('Housing');

  if(w.expeditionId!=null)return false;
  const e=state.economy,p=state.projects.find(p=>p.id===(actorConstructionTask(w)?.projectId)),busy=HOUSE_STATES.has(w.state);
  const needs=actorNeeds(w)??{hunger:0,energy:100};
  const urgent=needs.hunger>=62||needs.energy<28||isBedtime(lifeClock(e.life)?.hour??12,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||watchAssigned(e.life?.watch,w);
  if(busy){
   if(!p||(constructionProgress(p)?.reservedBy)!==w.id||['complete','destroyed','packed'].includes((constructionProgress(p)?.state))){housingPause(world,w);return true}
   if(urgent||e.stock.food===0&&e.workers.some(a=>!(actorVitality(a)?.dead)&&(actorNeeds(a)?.hunger??0)>=65)){housingPause(world,w);return !!w.cargo}
   const stage=buildingStages(p)[(constructionProgress(p)?.stage)];
   if(w.state==='house-building'){
    for(const event of w.clock.advance(dt*skillRate(w,'building')*ageWorkRate(w)*(e.leadership?.workRate(w)??1))){
     if(event==='contact'){ensureConstructionProgress(p).strikes++;ensureConstructionProgress(p).lastHitAt=e.time;e.emit('house-hit',w,null,{houseId:p.id,stage:stage.id})}
     if(event==='finish'){
      if((constructionProgress(p)?.strikes)<stage.strikes){w.clock.reset('work');continue}
      if(p.packing){finishPackingStage(e,p,w);continue}
      (constructionProgress(p)?.spent)[stage.kind]+=stage.amount;housingAccounting(state).consumed[stage.kind]+=stage.amount;ensureConstructionProgress(p).stage++;ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).delivered=0;ensureConstructionProgress(p).reservedBy=null;
      if((constructionProgress(p)?.stage)===buildingStages(p).length){ensureConstructionProgress(p).state='complete';housingAccounting(state).completed++;const previous=e.life.homes.find(h=>h.id===p.id),home=houseEntrance(p,e.heightAt,e.culture);if(p.kind==='camp'){finishCamp(e,p);e.emit('house-completed',w,null,{houseId:p.id,beds:(homeCapacity(p.home)?.beds),kind:p.kind});releaseWork(e,w);ensureActorConstructionTask(w).projectId=null;continue;}if(previous)applyHomeInput(previous,{...home,destroyed:false,health:home.maxHealth,maxHealth:home.maxHealth,rebuilt:true});else addHome(e,home);assignBeds(e);e.emit('house-completed',w,null,{houseId:p.id,beds:(homeCapacity(previous??home)?.beds),kind:p.kind})}
      else {ensureConstructionProgress(p).state='supplying';e.emit('house-stage-completed',w,null,{houseId:p.id,stage:stage.id})}
      releaseWork(e,w);ensureActorConstructionTask(w).projectId=null;
     }
    }
    return true;
   }
   const status=e.move(w,dt);if(status==='moving')return true;if(status==='blocked'){housingPause(world,w);return true}
   if(w.state==='house-fetch'){
    const reserve=p?.kind==='camp'?0:constructionReserve(e,stage.kind);
    const amount=Math.min(HOUSE_RULES.load,stage.amount-(constructionProgress(p)?.delivered),Math.max(0,e.stock[stage.kind]-reserve));
    const route=housingRouteTo(world,w,p);if(!amount||!route){housingPause(world,w);return true}
    e.stock[stage.kind]-=amount;ensureActorConstructionTask(w).cargo={projectId:p.id,kind:stage.kind,amount};w.route=route;w.state='house-deliver';e.emit('house-material-taken',w,null,{houseId:p.id,kind:stage.kind,amount});return true;
   }
   if(w.state==='house-deliver'){
    ensureConstructionProgress(p).delivered+=(actorConstructionTask(w)?.cargo).amount;ensureActorConstructionTask(w).cargo=null;e.emit('house-material-delivered',w,null,{houseId:p.id});
    if((constructionProgress(p)?.delivered)<stage.amount){ensureConstructionProgress(p).reservedBy=null;releaseWork(e,w);ensureActorConstructionTask(w).projectId=null;return true}
   }
   ensureConstructionProgress(p).state='building';w.state='house-building';w.facing=p.x<w.x?'left':'right';w.clock.reset('work');return true;
  }
  if((actorVitality(w)?.dead)||(personAge(w)?.child)||(actorInterior(w)?.inside)||w.cargo||w.state!=='idle'||w.spacingRoute?.length||urgent||((actorConstructionTask(w)?.retryAt)??0)>e.time||e.stock.food<e.workers.filter(w=>!(actorVitality(w)?.dead)).length&&!e.workers.some(w=>!(actorVitality(w)?.dead)&&(actorResidence(w)?.homeless))||e.workers.some(w=>(personAge(w)?.child)&&!(actorVitality(w)?.dead)&&(actorNeeds(w)?.hunger??0)>65))return false;
  const site=housingActive(world);if(!site||targetId!==null&&site.id!==targetId||(constructionProgress(site)?.reservedBy)!==null||declinedDivineRequest(e,w,'building',site.id))return false;
  if(!preferSpecialist(e,w,'building',site))return false;
  const stage=buildingStages(site)[(constructionProgress(site)?.stage)],build=(constructionProgress(site)?.delivered)>=stage.amount;
  const reserve=(p?.kind??site?.kind)==='camp'?0:constructionReserve(e,stage.kind);
  if(!build&&e.stock[stage.kind]<=reserve)return false;
  const route=build?housingRouteTo(world,w,site):e.route(w,e.depot);if(!route){ensureActorConstructionTask(w).retryAt=e.time+5;return false}
  releaseWork(e,w);ensureConstructionProgress(site).reservedBy=w.id;ensureActorConstructionTask(w).projectId=site.id;w.state=build?'house-bound':'house-fetch';w.route=route;w.decisionReason=site.kind==='camp'?(site.packing?'Packing away temporary shelter':'Putting up temporary shelter near the fire'):site.kind==='watchtower'?'Building a lookout to warn the village of danger':site.kind==='chapel'?'Building a sanctuary for the village’s spiritual leader':'Building another home for the village';return true;
 
}
export function housingSnapshot(world){const state=world.resource('Housing');
return {completed:housingAccounting(state).completed,consumed:{...housingAccounting(state).consumed},projects:state.projects.map(p=>({...constructionInput(p),spent:{...(constructionProgress(p)?.spent)}}))}
}
