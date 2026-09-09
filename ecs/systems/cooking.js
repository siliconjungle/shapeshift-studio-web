import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock,lifeMealAccounting} from "../life-state.js";
import {actorSleep,actorSocialActivity,actorDailyActivity,ensureActorDailyActivity} from "../daily-activity-actors.js";
import {preferSpecialist,skillRate} from '../../village-skills.js';
import {actorMeal,ensureActorMeal} from '../actor-meal.js';
import {actorCookingTask,ensureActorCookingTask} from '../actor-cooking-task.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalDrop} from '../../village-survival.js';
import {lifeIdle} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {watchAssigned} from '../../village-watch.js';
import {actorNeeds} from '../actor-needs.js';
import {careParticipant} from '../care-participants.js';
import {dangerRisk} from '../../village-danger.js';
import {supportParticipant} from '../support-participants.js';
import {dangerAwareness} from '../danger-entities.js';
import {defineGameData} from '../../game-data.js';
import {refusingFood,sociallyWithdrawn} from '../../village-feelings.js';
import {preferredCook,willingCustom} from '../../village-traditions.js';
import {isBedtime} from '../../village-time.js';
import {temperatureOf} from '../../village-temperature.js';
import {standingRoom,standingRoute} from '../../village-spacing.js';
export const COOKING_RULES=defineGameData('village-cooking.COOKING_RULES',{duration:12,addDuration:2,mealDuration:10,cooldown:55,maxBatch:4,reserve:1});
const states=new Set(['pot-fetch','pot-carry','cooking-fetch','cooking-carry','cooking-add','cooking-stir','stew-bound','stew-to-seat','stew-wait-bound','stew-wait']);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
import {cookingEntity} from '../cooking-entities.js';
const cookingState=(world,id)=>{const row=world.get(id,'Cooking');if(!row)throw Error('Entity has no Cooking component');return row;};
export function cookingSiteFire(world,id){const row=cookingState(world,id);
return world.get(world.owner(id),'Campfire');
}
export function cookingSiteId(world,id){const row=cookingState(world,id);
return cookingSiteFire(world,id).id??'campfire'
}
export function cookingPoint(world,id){const row=cookingState(world,id);
const f=cookingSiteFire(world,id);return {x:f.x,z:f.z}
}
export function cookingStatus(world,id){const row=cookingState(world,id);
return row.servings?`${row.servings} servings ready`:row.ingredients?(cookingSiteFire(world,id).lit?'Simmering':'Waiting for fire'):row.placed?'Empty pot':'Pot at the store'
}
export function cookingSafe(world,id){const row=cookingState(world,id);
const e=row.economy;return !(e.raids?.alarmUntil>e.time)&&!e.leadership?.rituals.active&&![...(e.raids?.enemies??[]),...(e.slimes?.enemies??[])].some(r=>!(actorVitality(r)?.dead)&&!r.gone&&!['fading','departing','fleeing'].includes(r.state)&&distance(r,cookingPoint(world,id))<7)
}
export function cookingWell(world,id,w,{meal=false}={}){const row=cookingState(world,id);
const e=row.economy;return !(meal&&(refusingFood(e,w)||sociallyWithdrawn(e,w)&&actorNeeds(w).hunger<62))&&!(actorVitality(w)?.dead)&&!w.divineHeld&&!(actorInterior(w)?.inside)&&(actorVitality(w)?.health)>=35&&actorNeeds(w).energy>=(meal?0:25)&&actorNeeds(w).hunger<(meal?101:90)&&temperatureOf(w)<(meal?101:94)&&(!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||meal&&actorNeeds(w).hunger>=62)&&!watchAssigned(e.life.watch,w)&&!(w.localAlarmUntil>e.time)
}
export function cookingAvailable(world,id,w,options){const row=cookingState(world,id);
return cookingWell(world,id,w,options)&&!w.cargo&&!(actorMeal(w)?.mealCarry)&&!(actorCookingTask(w)?.cookingFood)&&!w.firewood&&!w.firestone&&actorSocialActivity(w)?.partnerId==null&&careParticipant(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&dangerAwareness(w)?.partnerId==null&&!w.spacingRoute?.length&&['idle','outbound','following'].includes(w.state)&&((actorCookingTask(w)?.cookingAfter)??0)<=row.economy.time
}
export function cookingBatchSize(world,id){const row=cookingState(world,id);
const e=row.economy,people=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.divineHeld&&actorNeeds(w).hunger>=30);return people.length<2?0:Math.max(0,Math.min(COOKING_RULES.maxBatch,Math.max(0,people.length-[e.cooking,...(e.exploration?.camps??[]).map(c=>c.cooking)].filter(c=>c&&c!==row).reduce((s,c)=>s+c.ingredients+c.servings+e.workers.filter(w=>(actorCookingTask(w)?.cookingSiteId)===cookingSiteId(world,cookingEntity(c))).reduce((s,w)=>s+((actorCookingTask(w)?.cookingFood)??0),0),0)),Math.floor(e.stock.food)-COOKING_RULES.reserve))
}
export function cookingWantsHeat(world,id){const row=cookingState(world,id);
const e=row.economy;return cookingSiteFire(world,id)?.built&&cookingSafe(world,id)&&(row.ingredients>0||row.servings===0&&e.time>=row.after&&cookingBatchSize(world,id)>=2)
}
export function cookingSpot(world,id,w){const row=cookingState(world,id);
const e=row.economy,p=cookingPoint(world,id);for(const dz of [-.35,.25,.8])for(const side of [1,-1]){
  const point={x:p.x+side*1.05,z:p.z+dz};if(distance(point,cookingSiteFire(world,id))<1.05||!standingRoom(e,w,point))continue;const route=e.route(w,point);if(route&&!dangerRisk(e,w,point,route))return route;
 }return null
}
export function cookingSeat(world,id,w){const row=cookingState(world,id);
const e=row.economy,f=cookingSiteFire(world,id);for(const radius of [3.25,3.8])for(let i=0;i<10;i++){
  // Share the near side of the fire; neighbouring bowls stay within chatting distance.
  const angle=Math.PI*.15+i*Math.PI*.16,p={x:f.x+Math.cos(angle)*radius,z:f.z+Math.sin(angle)*radius};
  if(!standingRoom(e,w,p))continue;const route=e.route(w,p);if(route&&!dangerRisk(e,w,p,route))return route;
 }return null
}
export function cookingRoute(world,id,w,state,route){const row=cookingState(world,id);
releaseWork(row.economy,w);ensureActorCookingTask(w).cookingSiteId=cookingSiteId(world,id);w.route=route;w.state=state;w.wait=0;ensureActorCookingTask(w).cookingDeadline=row.economy.time+45;return true
}
export function cookingInterrupt(world,id,w){const row=cookingState(world,id);

  if(!row.fire&&(actorCookingTask(w)?.cookingSiteId)&&(actorCookingTask(w)?.cookingSiteId)!==cookingSiteId(world,id)){const c=row.economy.exploration?.camps.find(c=>c.id===(actorCookingTask(w)?.cookingSiteId));if(c)return cookingInterrupt(world,cookingEntity(c.cooking),w)}
  const e=row.economy;
  if((actorMeal(w)?.cookedMeal)&&(actorMeal(w)?.mealCarry)){actorNeeds(w).hunger=Math.max(0,actorNeeds(w).hunger-62);ensureActorMeal(w).mealCarry=false;ensureActorMeal(w).cookedMeal=false}
  if((actorCookingTask(w)?.potCarry)){row.potDrop={x:w.x,z:w.z};ensureActorCookingTask(w).potCarry=false}
  if((actorCookingTask(w)?.cookingFood)){survivalDrop(e.survival,w,'food',(actorCookingTask(w)?.cookingFood));ensureActorCookingTask(w).cookingFood=0}
  if(row.cookId===w.id)row.cookId=null;
  ensureActorCookingTask(w).resumingStew=false;ensureActorCookingTask(w).stewReserved=false;delete actorCookingTask(w)?.cookingSiteId;ensureActorCookingTask(w).cookingAfter=e.time+5;
  if(states.has(w.state))lifeIdle(e.life,w);
 
}
export function cookingFinish(world,id,w){const row=cookingState(world,id);
delete actorCookingTask(w)?.cookingSiteId;if(row.cookId===w.id)row.cookId=null;lifeIdle(row.economy.life,w);ensureActorCookingTask(w).cookingAfter=row.economy.time+1
}
export function cookingUpdate(world,id){const row=cookingState(world,id);

  const e=row.economy,cook=e.workers.find(w=>w.id===row.cookId);
  if(row.cookId!==null&&(!cook||!cookingWell(world,id,cook)||!cookingSafe(world,id)||!states.has(cook.state))){if(cook)cookingInterrupt(world,id,cook);else row.cookId=null}
 
}
export function cookingHandle(world,id,w,dt,{activeOnly=false,serveOnly=false}={}){const row=cookingState(world,id);

  const e=row.economy,f=cookingSiteFire(world,id);
  if(!row.fire){
   if(states.has(w.state)&&(actorCookingTask(w)?.cookingSiteId)&&(actorCookingTask(w)?.cookingSiteId)!==cookingSiteId(world,id)){const c=e.exploration?.camps.find(c=>c.id===(actorCookingTask(w)?.cookingSiteId));return c?cookingHandle(world,cookingEntity(c.cooking),w,dt,{activeOnly,serveOnly}):false}
   if(!states.has(w.state))for(const c of (e.exploration?.camps??[]).filter(c=>c.fire.discovered&&((distance(w,c.fire)<10&&distance(w,c.fire)<distance(w,f))||(c.cooking.servings>e.workers.filter(p=>(actorCookingTask(p)?.stewReserved)&&(actorCookingTask(p)?.cookingSiteId)===c.id).length&&actorNeeds(w).hunger>=30))).sort((a,b)=>distance(w,a.fire)-distance(w,b.fire)))if(cookingHandle(world,cookingEntity(c.cooking),w,dt,{activeOnly,serveOnly}))return true;
  }else if(states.has(w.state)&&(actorCookingTask(w)?.cookingSiteId)!==cookingSiteId(world,id)||!f.discovered)return false;
  if(states.has(w.state)){
   if(!cookingWell(world,id,w,{meal:['stew-bound','stew-to-seat'].includes(w.state)})||!cookingSafe(world,id)||e.time>(actorCookingTask(w)?.cookingDeadline)){cookingInterrupt(world,id,w);return true}
   if(w.state==='stew-wait'){
    if(row.ingredients&&row.cookId===null){
     if(!f.lit){cookingFinish(world,id,w);return true}
     if(!(personAge(w)?.child)&&!e.leadership?.isLeader(w)){const route=cookingSpot(world,id,w);if(route){row.cookId=w.id;ensureActorCookingTask(w).resumingStew=true;return cookingRoute(world,id,w,'cooking-carry',route)}}
    }
    const reserved=e.workers.filter(p=>!(actorVitality(p)?.dead)&&(actorCookingTask(p)?.stewReserved)&&((actorCookingTask(p)?.cookingSiteId)??'campfire')===cookingSiteId(world,id)).length;
    if(row.servings>reserved){const route=cookingSpot(world,id,w);if(route){ensureActorCookingTask(w).stewReserved=true;w.route=route;w.state='stew-bound';}return true}
    if(!row.ingredients&&!e.workers.some(p=>(actorCookingTask(p)?.cookingFood)&&((actorCookingTask(p)?.cookingSiteId)??'campfire')===cookingSiteId(world,id))){cookingFinish(world,id,w)}
    return true;
   }
   if(w.state==='cooking-add'){
    if(e.time<actorDailyActivity(w)?.activityUntil)return true;
    row.ingredients+=(actorCookingTask(w)?.cookingFood);ensureActorCookingTask(w).cookingFood=0;row.progress=0;w.state='cooking-stir';ensureActorCookingTask(w).cookingDeadline=e.time+45;e.emit('pot-filled',w,null,{...cookingPoint(world,id),amount:row.ingredients});return true;
   }
   if(w.state==='cooking-stir'){
    if(!f.lit){cookingFinish(world,id,w);return true}
    row.progress=Math.min(COOKING_RULES.duration,row.progress+dt*skillRate(w,'cooking'));
    if(e.time>=row.nextSound){row.nextSound=e.time+2.8;e.emit('pot-stir',w,null,cookingPoint(world,id))}
    if(row.progress>=COOKING_RULES.duration){row.servings=row.ingredients;row.ingredients=0;row.batches++;row.readyAt=e.time;row.after=e.time+COOKING_RULES.cooldown;e.emit('stew-ready',w,null,{...cookingPoint(world,id),amount:row.servings});cookingFinish(world,id,w);ensureActorCookingTask(w).cookingAfter=e.time}
    return true;
   }
   const result=e.move(w,dt);if(result==='blocked'){cookingInterrupt(world,id,w);return true}if(result!=='arrived')return true;
   if(w.state==='pot-fetch'){
    const route=cookingSpot(world,id,w);if(!route){cookingInterrupt(world,id,w);return true}
    ensureActorCookingTask(w).potCarry=true;row.potDrop=null;w.route=route;w.state='pot-carry';
   }else if(w.state==='pot-carry'){
    ensureActorCookingTask(w).potCarry=false;row.placed=true;e.emit('pot-placed',w,null,cookingPoint(world,id));cookingFinish(world,id,w);
   }else if(w.state==='cooking-fetch'){
    const count=cookingBatchSize(world,id),route=cookingSpot(world,id,w);if(count<2||!route){cookingInterrupt(world,id,w);return true}
    e.stock.food-=count;ensureActorCookingTask(w).cookingFood=count;w.route=route;w.state='cooking-carry';e.emit('cooking-food-taken',w,null,{amount:count});
   }else if(w.state==='cooking-carry'){
    w.state=(actorCookingTask(w)?.resumingStew)?'cooking-stir':'cooking-add';ensureActorCookingTask(w).resumingStew=false;ensureActorDailyActivity(w).activityUntil=e.time+COOKING_RULES.addDuration;w.facing=cookingPoint(world,id).x<w.x?'left':'right';
   }else if(w.state==='stew-wait-bound'){w.state='stew-wait';w.facing=f.x<w.x?'left':'right';
   }else if(w.state==='stew-bound'){
    const route=cookingSeat(world,id,w);if(!row.servings||!route){cookingInterrupt(world,id,w);return true}
    row.servings--;row.meals++;lifeMealAccounting(e.life).consumed++;ensureActorCookingTask(w).stewReserved=false;ensureActorMeal(w).cookedMeal=true;ensureActorMeal(w).mealCookId=row.lastCookId??null;ensureActorMeal(w).mealCarry=true;w.route=route;w.state='stew-to-seat';e.emit('stew-served',w,null,cookingPoint(world,id));
   }else if(w.state==='stew-to-seat'){
    ensureActorMeal(w).mealCarry=false;w.state='eating';ensureActorDailyActivity(w).activityUntil=e.time+COOKING_RULES.mealDuration;w.facing=f.x<w.x?'left':'right';e.emit('shared-stew',w,null,cookingPoint(world,id));
   }
   return true;
  }
  if(activeOnly||!cookingSafe(world,id)||!cookingAvailable(world,id,w,{meal:true}))return false;
  const reserved=e.workers.filter(p=>!(actorVitality(p)?.dead)&&(actorCookingTask(p)?.stewReserved)&&((actorCookingTask(p)?.cookingSiteId)??'campfire')===cookingSiteId(world,id)).length;
  if(row.servings>reserved&&actorNeeds(w).hunger>=30&&(actorNeeds(w).hunger>=62||willingCustom(e,w,'meal'))){
   const route=cookingSpot(world,id,w);if(route){ensureActorCookingTask(w).stewReserved=true;return cookingRoute(world,id,w,'stew-bound',route)}return false;
  }
  if(serveOnly||!cookingAvailable(world,id,w))return false;
  if(willingCustom(e,w,'meal')&&actorNeeds(w).hunger>=40&&actorNeeds(w).hunger<80&&row.cookId!==null&&row.cookId!==w.id&&(row.ingredients||e.workers.some(p=>(actorCookingTask(p)?.cookingFood)&&((actorCookingTask(p)?.cookingSiteId)??'campfire')===cookingSiteId(world,id)))){const route=cookingSeat(world,id,w);if(route)return cookingRoute(world,id,w,'stew-wait-bound',route)}
  if((personAge(w)?.child)||e.leadership?.isLeader(w)||row.cookId!==null||!f.built||actorNeeds(w).hunger>=(row.ingredients?85:62)||temperatureOf(w)>=(row.ingredients?94:82)||e.time<row.after||row.servings||e.time<((actorCookingTask(w)?.cookingAfter)??0))return false;
  if(!row.ingredients&&!row.potDrop&&cookingBatchSize(world,id)<2)return false;
  if(!f.lit||!preferredCook(e,w)||!preferSpecialist(e,w,'cooking',f)){return false} // The fire tender supplies and lights it first.
  const route=!row.placed?standingRoute(e,w,row.potDrop??w.store??e.depot):row.ingredients?cookingSpot(world,id,w):standingRoute(e,w,w.store??e.depot);
  if(!route){ensureActorCookingTask(w).cookingAfter=e.time+8;return false}
  row.cookId=w.id;
  if(row.ingredients){cookingRoute(world,id,w,'cooking-carry',route);ensureActorCookingTask(w).cookingFood=0;ensureActorCookingTask(w).resumingStew=true;return true}
  return cookingRoute(world,id,w,row.placed?'cooking-fetch':'pot-fetch',route);
 
}
export function cookingSnapshot(world,id){const row=cookingState(world,id);
return {placed:row.placed,cookId:row.cookId,ingredients:row.ingredients,progress:row.progress,servings:row.servings,batches:row.batches,meals:row.meals,status:cookingStatus(world,id)}
}
