import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {lifeClock,lifeMealAccounting} from "../life-state.js";
import {ensureActorSocialActivity,ensureActorDailyActivity} from "../daily-activity-actors.js";
import {familyConfiguration,familySchedule,familyBirthPlan,setFamilyBirthPlan,familyHistory} from "../family-entities.js";
import {actorVitality} from '../actor-vitality.js';
import {lifeSocial,lifeAddRelationship,lifeRelation} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorNeeds} from '../actor-needs.js';
import {initialiseCombatStyle} from '../../village-archery.js';
import {childcareUpdate} from './childcare.js';
import {childcareSnapshot} from '../../village-childcare.js';
import {meetsSweetheartThreshold} from '../../relationship-label.js';
import {addPerson} from '../../ecs/population-entities.js';

import {adoptionUpdate} from './adoption.js';
import {initialiseRomanceInterest} from '../../village-romance-interest.js';
import {initialiseWorkPreferences} from '../../village-decisions.js';
import {nextPersonId} from '../../village-people.js';
import {childDevelopment,hasFamilySpace,homeBeds} from '../../village-childcare.js';
import {standingRoute,standingRoom,standingRoomWithRadius} from '../../village-spacing.js';
import {ActionClock} from '../../action-timing.js';
import {relationshipLabel} from '../../village-life.js';
import {isBedtime} from '../../village-time.js';
import {matureVillager} from '../../village-age.js';

import {FAMILY_RULES,canHaveOffspring,familyCapacity} from '../../village-family.js';
export function familyUpdate(world,dt){const state=world.resource('Family');

  const e=state.economy,life=e.life;if(!life)return;
  for(const w of e.workers)if(!(actorVitality(w)?.dead)&&(personAge(w)?.child)&&e.time>=(personAge(w)?.matureAt)){
   matureVillager(e,w);
  }
  adoptionUpdate(world);childcareUpdate(world,dt);
  const [founderA,founderB]=(familyConfiguration(state).parents).map(id=>e.workers.find(w=>w.id===id));
  if(founderA&&!(actorVitality(founderA)?.dead)&&founderB&&!(actorVitality(founderB)?.dead)&&e.time>=(familySchedule(state).nextVisit)&&!isBedtime(lifeClock(life).hour)&&!(familyBirthPlan(state))){
   if([founderA,founderB].every(w=>!w.cargo&&!(actorInterior(w)?.inside)&&w.state==='idle'&&actorNeeds(w).hunger<70&&actorNeeds(w).energy>30)){
    ensureActorSocialActivity(founderA).socialAfter=ensureActorSocialActivity(founderB).socialAfter=e.time;
    if(lifeSocial(life,founderA))(familySchedule(state).nextVisit)=e.time+FAMILY_RULES.visitGap;
   }
  }
  if((familyBirthPlan(state))){const pair=((familyBirthPlan(state)).parents??(familyConfiguration(state).parents)).map(id=>e.workers.find(w=>w.id===id));if(!canHaveOffspring(e,...pair))setFamilyBirthPlan(state,null)}
  if(!(familyBirthPlan(state))&&e.stock.food>=familyFoodRequired(world)){
   for(const relation of life.relationships){
    // Reject impossible ordinary bonds before resolving people and walking
    // their ancestry. Leader romances retain their separate eligibility path.
    if(!relation.leaderRomance&&!meetsSweetheartThreshold(relation))continue;
    const a=e.workers.find(w=>w.id===relation.a),b=e.workers.find(w=>w.id===relation.b),key=[relation.a,relation.b].sort((a,b)=>a-b).join(':');
    if(!canHaveOffspring(e,a,b)||(relation.leaderRomance?!e.leadership?.activePair(a,b):relationshipLabel(relation,a,b)!=='Sweetheart')||e.time<((familySchedule(state).birthCooldowns).get(key)??0))continue;
    const home=[(actorResidence(a)?.home),(actorResidence(b)?.home)].find(h=>familyRoomForFamily(world,h,[a,b]));if(!home)continue;
    setFamilyBirthPlan(state,{arrivesAt:e.time+FAMILY_RULES.arrivalDelay,home,parents:[a.id,b.id]});e.emit('family-expected',a,null,{partnerId:b.id});break;
   }
  }
  const birthParents=(familyBirthPlan(state))?.parents??(familyConfiguration(state).parents),[a,b]=birthParents.map(id=>e.workers.find(w=>w.id===id));
  const offspringAllowed=canHaveOffspring(e,a,b);
  // Food is paid once at arrival. If supplies become scarce, the arrival waits
  // rather than creating a negative stockpile or silently dropping the child.
  if((familyBirthPlan(state))&&offspringAllowed&&e.time>=(familyBirthPlan(state)).arrivesAt&&e.stock.food>=familyFoodRequired(world)&&familyRoomForFamily(world,(familyBirthPlan(state)).home,[a,b])){
   const home=(familyBirthPlan(state)).home;let position=null;
   for(const [dx,dz]of [[.65,.5],[-.65,.5],[0,.8],[1,1],[-1,1],[1.8,1.2],[-1.8,1.2],[0,2]]){const p={x:home.x+dx,z:home.z+dz};if(standingRoomWithRadius(e,p,.36)&&e.route(a,p)){position=p;break}}
   if(!position)return;
   e.stock.food-=FAMILY_RULES.food;(familyHistory(state).foodConsumed)+=FAMILY_RULES.food;lifeMealAccounting(life).consumed+=FAMILY_RULES.food;
   const id=nextPersonId(e),sex=(familyHistory(state).born)%2?'female':'male',name=e.names.take();
   const child={id,name,culture:(a.sex==='female'?a:b).culture??e.culture??'hearth',health:100,dead:false,starvingFor:0,sex,child:true,parents:[...birthParents],bornAt:e.time,matureAt:e.time+FAMILY_RULES.childhood,job:null,...position,state:'idle',cargo:null,node:null,route:[],facing:'front',phase:0,clock:new ActionClock('harvest'),wait:1,vx:0,vz:0,retries:0,trait:'playful',home,needs:{energy:90,hunger:8,social:90},bedtime:20,wakeHour:6.5,inside:false,partnerId:null,socialAfter:e.time+15,careAt:e.time+2,activityUntil:0};
   for(const relative of e.workers)lifeAddRelationship(life,{a:relative.id,b:id,affinity:.65,compatibility:.8,attractionAB:0,attractionBA:0,meetings:0,juvenile:true});
   ensureActorResidence(a).home=ensureActorResidence(b).home=home;child.store=e.depot;addPerson(e,child);initialiseCombatStyle(child,e.random);initialiseWorkPreferences(child);initialiseRomanceInterest(child);(familyHistory(state).born)++;setFamilyBirthPlan(state,null);(familySchedule(state).nextBirth)=e.time+FAMILY_RULES.birthGap;(familySchedule(state).birthCooldowns).set([...birthParents].sort((a,b)=>a-b).join(':'),(familySchedule(state).nextBirth));e.emit('born',child,null,{parents:[...birthParents],foodConsumed:FAMILY_RULES.food});
  }
 
}
export function familyRoomForFamily(world,home,parents){const state=world.resource('Family');

  const e=state.economy;if(!hasFamilySpace(e,home,familyCapacity(state.economy)))return false;
  const same=h=>h===home||(h?.id!==undefined?h.id===home.id:h?.x===home.x&&h?.z===home.z);
  const occupants=e.workers.filter(w=>!(actorVitality(w)?.dead)&&(same((actorResidence(w)?.home))||parents.includes(w))).length;
  return occupants+1<=homeBeds(home);
 
}
export function familyFoodRequired(world){const state=world.resource('Family');
return FAMILY_RULES.food+state.economy.workers.filter(w=>!(actorVitality(w)?.dead)).length+1
}
export function familyHandle(world,w,dt){const state=world.resource('Family');

  if(!(personAge(w)?.child))return false;
  const e=state.economy;
  if(w.state==='following'){
   const status=e.move(w,dt);if(status!=='moving'){w.state='idle';w.wait=3+(w.id%3);ensureActorDailyActivity(w).careAt=e.time}return true;
  }
  if(w.state==='idle'){
   if(w.spacingRoute?.length)return true;
   w.wait-=dt;if(w.wait>0)return true;
   const radius=childDevelopment(w,e.time).playRadius,angle=e.time*.3+w.id,spot={x:(actorResidence(w)?.home).x+Math.cos(angle)*radius,z:(actorResidence(w)?.home).z+.6+Math.sin(angle)*radius*.5},route=standingRoute(e,w,spot);
   if(route){w.route=route;w.state='following'}else w.wait=2;
  }
  return true;
 
}
export function familySnapshot(world){const state=world.resource('Family');
return {care:childcareSnapshot(state.economy),foodRequired:familyFoodRequired(world),parents:[...(familyConfiguration(state).parents)],capacity:familyCapacity(state.economy),born:(familyHistory(state).born),foodConsumed:(familyHistory(state).foodConsumed),birthCooldowns:Object.fromEntries((familySchedule(state).birthCooldowns)),pending:(familyBirthPlan(state))?{arrivesAt:(familyBirthPlan(state)).arrivesAt,parents:[...((familyBirthPlan(state)).parents??(familyConfiguration(state).parents))]}:null}
}
export function initialiseFamily(world){const state=world.resource('Family'),e=state.economy;
 const [a,b]=(familyConfiguration(state).parents).map(id=>e.workers.find(w=>w.id===id));
 if(a&&b){a.sex??='female';b.sex??='male';ensureActorResidence(b).home=(actorResidence(a)?.home);const r=((e.life)==null?undefined:(lifeRelation(e.life,a.id,b.id)));if(r)Object.assign(r,{attractionAB:.95,attractionBA:.95,compatibility:.85})}
}
