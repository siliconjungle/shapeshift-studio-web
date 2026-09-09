import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock} from "../life-state.js";
import {actorSleep,actorDailyActivity,ensureActorDailyActivity,actorSocialActivity} from "../daily-activity-actors.js";
import {ensureActorMeal} from '../actor-meal.js';
import {cookingWantsHeat} from '../../village-cooking.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeIdle} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {defineGameData} from '../../game-data.js';
import {declinedDivineRequest} from '../../village-divine-request.js';
import {ageWorkRate} from '../../village-age.js';
import {temperatureOf,isCold,isHot} from '../../village-temperature.js';
import {fuelReserve} from '../../village-repairs.js';
import {standingRoute} from '../../village-spacing.js';
import {isBedtime} from '../../village-time.js';
import {DOORWAY_DURATION} from '../../doorway-transition.js';
export const CAMPFIRE_RULES=defineGameData('village-campfire.CAMPFIRE_RULES',{stonePerRing:6,buildDuration:3.4,woodPerLoad:2,secondsPerWood:65,warmRadius:2.9,dryDelay:8,visitDuration:12});
const clamp=n=>Math.max(0,Math.min(100,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const fireStates=new Set(['stone-bound','ring-bound','building-ring','firewood-bound','fire-bound','loading-fire','tending-fire','warming-bound','warming','meal-to-fire']);
import {campfireEntity} from '../campfire-entities.js';
const campfireState=(world,id)=>{const state=world.get(id,'Campfire');if(!state)throw Error('Entity has no Campfire component');return state;};
export function campfireStoneCost(world,id){const state=campfireState(world,id);
return CAMPFIRE_RULES.stonePerRing
}
export function campfireDry(world,id){const state=campfireState(world,id);
return state.rain<.05&&state.economy.time>=state.wetUntil
}
export function campfireSocialSpots(world,id){const state=campfireState(world,id);
return [{x:state.x,z:state.z+1.9},{x:state.x,z:state.z-1.9}]
}
export function campfireSeat(world,id,w){const state=campfireState(world,id);

  for(let i=0;i<8;i++){const angle=(i+w.id)*Math.PI/4,p={x:state.x+Math.cos(angle)*1.9,z:state.z+Math.sin(angle)*1.9};const route=standingRoute(state.economy,w,p);if(route)return route}return null;
 
}
export function campfireUpdate(world,id,dt,weather){const state=campfireState(world,id);

  const e=state.economy;state.rain=Math.max(0,Math.min(1,weather?.rain??0));
  if(state.rain>.05){state.wetUntil=e.time+CAMPFIRE_RULES.dryDelay;state.rainExposure+=dt*state.rain}else state.rainExposure=0;
  if(state.lit){
   state.fuel=Math.max(0,state.fuel-dt);
   if(state.rainExposure>.45||state.fuel===0){state.lit=false;state.extinguished++;e.emit('fire-out',null,null,{reason:state.fuel===0?'fuel':'rain'})}
  }

 
}
export function campfireFinish(world,id,w){const state=campfireState(world,id);
delete w.fireSiteId;if(state.tender===w.id)state.tender=null;lifeIdle(state.economy.life,w);w.fireVisitAfter=state.economy.time+25
}
export function campfireTakeMeal(world,id,w){const state=campfireState(world,id);

  if(!state.discoveryId){const c=state.economy.exploration?.camps.filter(c=>c.fire.discovered&&c.fire.lit&&distance(w,c.fire)<distance(w,state)).sort((a,b)=>distance(w,a.fire)-distance(w,b.fire))[0];if(c)return campfireTakeMeal(world,campfireEntity(c.fire),w);}
  if(!state.built||!state.lit||isHot(w))return false;const route=campfireSeat(world,id,w);if(!route)return false;
  w.fireSiteId=state.id??'campfire';w.route=route;w.state='meal-to-fire';ensureActorMeal(w).mealCarry=true;return true;
 
}
export function campfireHandle(world,id,w,dt,{requested=false}={}){const state=campfireState(world,id);

  const e=state.economy,night=isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
  if(!state.discoveryId){
   if(fireStates.has(w.state)&&w.fireSiteId&&w.fireSiteId!==(state.id??'campfire')){const c=e.exploration?.camps.find(c=>c.id===w.fireSiteId);return c?campfireHandle(world,campfireEntity(c.fire),w,dt,{requested}):false}
   if(!fireStates.has(w.state))for(const c of (e.exploration?.camps??[]).filter(c=>c.fire.discovered&&distance(w,c.fire)<10&&distance(w,c.fire)<distance(w,state)).sort((a,b)=>distance(w,a.fire)-distance(w,b.fire)))if(campfireHandle(world,campfireEntity(c.fire),w,dt,{requested}))return true;
  }else if(!state.discovered||fireStates.has(w.state)&&w.fireSiteId!==state.id)return false;
  if(fireStates.has(w.state)){
   if(w.state==='building-ring'){
    w.clock.advance(dt*ageWorkRate(w));if(e.time<actorDailyActivity(w)?.activityUntil)return true;
    if(!state.built&&w.firestone===campfireStoneCost(world,id)){state.built=true;w.firestone=0;e.emit('ring-built',w,null,{amount:campfireStoneCost(world,id)})}
    campfireFinish(world,id,w);w.fireVisitAfter=e.time;return true;
   }
   if(w.state==='warming'){
    if(!state.lit||night||temperatureOf(w)>=48||e.time>=actorDailyActivity(w)?.activityUntil){campfireFinish(world,id,w);return true}
    actorNeeds(w).energy=clamp(actorNeeds(w).energy+dt*1.2);return true;
   }
   if(w.state==='loading-fire'){
    if(e.time<actorDailyActivity(w)?.activityUntil)return true;
    if(w.firewood){const amount=w.firewood;state.fuel+=amount*CAMPFIRE_RULES.secondsPerWood;w.firewood=0;e.emit('firewood-added',w,null,{amount})}
    if(!state.lit&&campfireDry(world,id)&&state.fuel>0){w.state='tending-fire';ensureActorDailyActivity(w).activityUntil=e.time+1.3;return true}
    campfireFinish(world,id,w);return true;
   }
   if(w.state==='tending-fire'){
    if(e.time<actorDailyActivity(w)?.activityUntil)return true;
    if(campfireDry(world,id)&&state.fuel>0){state.lit=true;state.rainExposure=0;e.emit('fire-lit',w)}
    campfireFinish(world,id,w);return true;
   }
   if(w.fireRetryAt>e.time)return true;
   if(!w.route.length){
    const route=['stone-bound','firewood-bound'].includes(w.state)?e.route(w,e.depot):campfireSeat(world,id,w);
    if(!route){w.fireRetryAt=e.time+3;return true}w.route=route;
   }
   const status=e.move(w,dt);if(status==='moving')return true;
   if(status==='blocked'){w.route=[];w.fireRetryAt=e.time+3;if(!w.firewood&&!w.firestone&&w.state!=='meal-to-fire')campfireFinish(world,id,w);return true}
   if(w.state==='stone-bound'){
    if(state.built||e.stock.stone<campfireStoneCost(world,id)){campfireFinish(world,id,w);return true}
    e.stock.stone-=campfireStoneCost(world,id);state.stoneUsed+=campfireStoneCost(world,id);w.firestone=campfireStoneCost(world,id);
    e.emit('stone-taken',w,null,{amount:w.firestone});w.state='ring-bound';w.route=campfireSeat(world,id,w)??[];
   }else if(w.state==='ring-bound'){
    w.state='building-ring';ensureActorDailyActivity(w).activityUntil=e.time+CAMPFIRE_RULES.buildDuration/ageWorkRate(w);w.facing=state.x<w.x?'left':'right';w.clock.reset('work');
   }else if(w.state==='firewood-bound'){
    if(!campfireDry(world,id)||e.stock.wood-CAMPFIRE_RULES.woodPerLoad<fuelReserve(e)){campfireFinish(world,id,w);return true}
    e.stock.wood-=CAMPFIRE_RULES.woodPerLoad;state.woodUsed+=CAMPFIRE_RULES.woodPerLoad;w.firewood=CAMPFIRE_RULES.woodPerLoad;
    e.emit('firewood-taken',w,null,{amount:w.firewood});w.state='fire-bound';w.route=campfireSeat(world,id,w)??[];
   }else if(w.state==='fire-bound'){
    w.state=w.firewood?'loading-fire':'tending-fire';ensureActorDailyActivity(w).activityUntil=e.time+1.3;w.facing=state.x<w.x?'left':'right';
   }else if(w.state==='meal-to-fire'){
    ensureActorMeal(w).mealCarry=false;w.state='eating';ensureActorDailyActivity(w).activityUntil=e.time+5;w.facing=state.x<w.x?'left':'right';
   }else{
    if(!state.lit){campfireFinish(world,id,w);return true}
    w.state='warming';ensureActorDailyActivity(w).activityUntil=e.time+CAMPFIRE_RULES.visitDuration;w.facing=state.x<w.x?'left':'right';
   }
   return true;
  }
  if(declinedDivineRequest(e,w,'campfire',state.id??'campfire'))return false;
  if((actorInterior(w)?.inside)||night||watchAssigned(e.life.watch,w)||w.cargo||!['idle','outbound'].includes(w.state)||actorSocialActivity(w)?.partnerId!==null||((actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION))return false;
  if(actorNeeds(w).hunger>=62||actorNeeds(w).energy<28)return false;
  if(w.state==='outbound'&&temperatureOf(w)>15)return false;
  if(!state.built){
   if(!(personAge(w)?.child)&&state.tender===null&&e.stock.stone>=campfireStoneCost(world,id)&&(w.fireVisitAfter??0)<=e.time){
    const route=e.route(w,e.depot);if(route){releaseWork(e,w);w.fireSiteId=state.id??'campfire';w.wait=0;w.route=route;w.state='stone-bound';state.tender=w.id;return true}
    w.fireVisitAfter=e.time+8;
   }
   return false;
  }
  if(isCold(w)&&!state.lit&&state.fuel===0&&e.stock.wood<CAMPFIRE_RULES.woodPerLoad&&state.tender===null&&campfireDry(world,id)&&(w.noFirewoodCueAt??0)<=e.time){
   // Let the first cold cue play before explaining the missing resource.
   if((w.coldCueAt??0)-e.time<51){e.emit('missing-firewood',w);w.noFirewoodCueAt=e.time+60}
  }
  if((requested||((cookingState)=>cookingState==null?undefined:(cookingWantsHeat(cookingState)))(state.cooking??e.cooking)||e.workers.some(p=>!(actorVitality(p)?.dead)&&!(actorInterior(p)?.inside)&&isCold(p)&&distance(p,state)<10))&&!(personAge(w)?.child)&&state.tender===null&&campfireDry(world,id)&&(!state.lit||state.fuel<25)&&(state.fuel>=25||e.stock.wood-CAMPFIRE_RULES.woodPerLoad>=fuelReserve(e))&&(w.fireVisitAfter??0)<=e.time){
   const needsWood=state.fuel<25,route=needsWood?e.route(w,e.depot):campfireSeat(world,id,w);
   if(route){releaseWork(e,w);w.fireSiteId=state.id??'campfire';w.wait=0;w.route=route;w.state=needsWood?'firewood-bound':'fire-bound';state.tender=w.id;return true}
   w.fireVisitAfter=e.time+8;
  }
  if(state.lit&&isCold(w)&&(w.fireVisitAfter??0)<=e.time){const route=campfireSeat(world,id,w);if(route){releaseWork(e,w);w.fireSiteId=state.id??'campfire';w.wait=0;w.route=route;w.state='warming-bound';return true}}
  return false;
 
}
export function campfireSnapshot(world,id){const state=campfireState(world,id);
return {x:state.x,z:state.z,built:state.built,stoneUsed:state.stoneUsed,stoneCost:campfireStoneCost(world,id),lit:state.lit,fuel:state.fuel,woodUsed:state.woodUsed,tender:state.tender,wetUntil:state.wetUntil,rain:state.rain,extinguished:state.extinguished}
}
