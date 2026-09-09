import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock,lifeSocialVenues} from "../life-state.js";
import {ensureActorDailyActivity} from "../daily-activity-actors.js";
import {actorMeal} from '../actor-meal.js';
import {campfireSocialSpots} from '../../village-campfire.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeCancelSocial,lifeIdle,lifeEmit,lifeStartRoute,lifeRest} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {watchParticipant,ensureWatchParticipant} from '../watch-participants.js';
import {actorNeeds} from '../../ecs/actor-needs.js';
import {activeWatchtowers} from '../../village-watchtowers.js';
import {temperatureOf,isCold,isHot} from '../../village-temperature.js';
import {isBedtime} from '../../village-time.js';
import {beginHouseExit,DOORWAY_DURATION} from '../../doorway-transition.js';
import {standingRoute} from '../../village-spacing.js';
import {WATCH_RULES} from '../watch-data.js';
const watchStates=new Set(['watch-bound','patrolling','watching']);
const unfinished=new Set(['working','returning','unloading','waiting-return','mealbound','eating','resting','meal-to-fire','firewood-bound','fire-bound','loading-fire','tending-fire']);

export function watchWorker(world,id){const state=world.resource('Watch');
return state.economy.workers.find(w=>w.id===id)
}
export function watchAssigned(world,w){const state=world.resource('Watch');
return w.id===state.guard||w.id===state.relief
}
export function watchActive(world){const state=world.resource('Watch');
return isBedtime(lifeClock(state.life).hour,WATCH_RULES.start,WATCH_RULES.end)
}
export function watchCandidates(world,exclude=null){const state=world.resource('Watch');

  const e=state.economy;
  return e.workers.filter(w=>!w.expeditionId&&!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!e.leadership?.isLeader(w)&&w.ritualId==null&&!w.state.startsWith('revolt-')&&!w.state.startsWith('exile-')&&w.id!==exclude&&(watchParticipant(w)?.unavailableUntil??0)<=e.time).sort((a,b)=>
   ((watchParticipant(a)?.total??0)-(watchParticipant(b)?.total??0))*.6+(actorNeeds(b).energy-actorNeeds(a).energy)+(actorNeeds(a).hunger-actorNeeds(b).hunger)*.15);
 
}
export function watchPrepare(world,w){const state=world.resource('Watch');

  const e=state.economy;
  const session=state.life.sessions.find(s=>s.workers.includes(w));if(session)lifeCancelSocial(state.life,session);
  if(w.state==='sleeping'){
   lifeIdle(state.life,w);w.x=(actorResidence(w)?.home).x;w.z=(actorResidence(w)?.home).z;beginHouseExit(w,e.time);lifeEmit(state.life,'wake',w);
  }else if(['homebound','outbound','following'].includes(w.state)){releaseWork(e,w);w.wait=0}
  w.spacingRoute=null;ensureWatchParticipant(w).announced=false;
 
}
export function watchRelease(world,w){const state=world.resource('Watch');

  if(!w)return;
  if(watchStates.has(w.state))lifeIdle(state.life,w);
  ensureActorDailyActivity(w).careAt=0;ensureWatchParticipant(w).announced=false;
 
}
export function watchUpdate(world,dt){const state=world.resource('Watch');

  const e=state.economy;
  if(e.raids?.alarmUntil>e.time)return;
  if(state.relief!==null&&(actorVitality(watchWorker(world,state.relief))?.dead))state.relief=null;
  if(!watchActive(world)){
   watchRelease(world,watchWorker(world,state.guard));watchRelease(world,watchWorker(world,state.relief));state.guard=state.relief=null;return;
  }
  let guard=watchWorker(world,state.guard);
  if(!guard||(actorVitality(guard)?.dead)||(personAge(guard)?.child)||guard.ritualId!=null||e.leadership?.isLeader(guard)||guard.state.startsWith('revolt-')||guard.state.startsWith('exile-')){
   const next=watchCandidates(world)[0];if(!next){state.guard=null;return}
   state.guard=next.id;state.started=e.time;guard=next;watchPrepare(world,next);
  }
  ensureWatchParticipant(guard).total=(watchParticipant(guard)?.total??0)+dt;
  ensureWatchParticipant(guard).sleepDebt=Math.min(WATCH_RULES.maxRecovery,(watchParticipant(guard)?.sleepDebt??0)+dt*WATCH_RULES.recoveryPerSecond);
  if(state.relief!==null&&e.time-state.reliefAt>WATCH_RULES.handoverTimeout){
   const missed=watchWorker(world,state.relief);if(missed){ensureWatchParticipant(missed).unavailableUntil=e.time+20;watchRelease(world,missed)}state.relief=null;state.retryAt=e.time+3;
  }
  const elapsed=e.time-state.started,needsRelief=elapsed>=WATCH_RULES.shift||elapsed>=WATCH_RULES.minimumShift&&(actorNeeds(guard).energy<25||actorNeeds(guard).hunger>85);
  if(state.relief===null&&needsRelief&&e.time>=state.retryAt){
   state.retryAt=e.time+3;const next=watchCandidates(world,guard.id)[0];
   if(next){
    state.relief=next.id;state.reliefAt=e.time;watchPrepare(world,next);
    // Wait at the current lookout so the incoming watcher can catch up.
    if(watchStates.has(guard.state)){guard.route=[];guard.state='watching';ensureWatchParticipant(guard).pauseUntil=e.time+5}
   }
  }
 
}
export function watchHandOver(world,w){const state=world.resource('Watch');

  const old=watchWorker(world,state.guard),e=state.economy;
  if(old&&Math.hypot(old.x-w.x,old.z-w.z)>2.7)return false;
  state.guard=w.id;state.relief=null;state.started=e.time;state.handovers++;state.handoverAt=e.time;
  watchRelease(world,old);lifeEmit(state.life,'watch-start',w,{relievedId:old?.id});ensureWatchParticipant(w).announced=true;return true;
 
}
export function watchPost(world,w){const state=world.resource('Watch');

  const e=state.economy;
  for(const h of activeWatchtowers(e)){const route=standingRoute(e,w,{x:h.x,z:h.z+.5});if(route)return route;}
  const spots=[...lifeSocialVenues(state.life).spots,{x:e.depot.x,z:e.depot.z+1.8},...state.life.homes.map(home=>({x:home.x+1.8,z:home.z+1.2}))];
  // A cold watcher can keep a lookout from the warm edge of a lit fire.
  if(e.campfire?.lit&&isCold(w))spots.unshift(...campfireSocialSpots(e.campfire));
  for(let i=0;i<spots.length;i++){
   const index=((watchParticipant(w)?.post??w.id)+i)%spots.length,route=standingRoute(e,w,spots[index]);
   if(route){ensureWatchParticipant(w).post=(index+1)%spots.length;return route}
  }
  return null;
 
}
export function watchHandle(world,w,dt){const state=world.resource('Watch');

  if((actorVitality(w)?.dead)||!watchActive(world)||!watchAssigned(world,w))return false;
  const e=state.economy;
  if(w.state==='sleeping'||w.state==='homebound')watchPrepare(world,w);
  // Finish and account for existing work/food/fuel before taking the post.
  if(w.cargo||w.firewood||(actorMeal(w)?.mealCarry)||unfinished.has(w.state))return false;
  if((actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION)return true;
  if(w.state==='watch-bound'||w.state==='patrolling'){
   const status=e.move(w,dt);if(status==='moving')return true;
   w.route=[];w.state='watching';ensureWatchParticipant(w).pauseUntil=e.time+(status==='blocked'?5:6+w.id%3);
   if(w.id===state.relief&&status==='arrived')watchHandOver(world,w);
   return true;
  }
  if(w.state==='watching'){
   w.facing=['front','left','back','right'][Math.floor(e.time/3+w.id)%4];
   if(w.id===state.guard&&state.relief!==null)return true;
   if(w.id===state.relief){
    const guard=watchWorker(world,state.guard);if(guard&&Math.hypot(guard.x-w.x,guard.z-w.z)<=2.7){watchHandOver(world,w);return true}
   }
   if(e.time<(watchParticipant(w)?.pauseUntil??0))return true;
  }
  if(w.id===state.guard&&state.relief===null&&actorNeeds(w).hunger>=72&&e.stock.food>0){
   if(lifeStartRoute(state.life,w,'mealbound',e.depot)){lifeEmit(state.life,'hungry',w);return true}
  }
  // A lone watcher (or one whose relief route is blocked) can take a seated,
  // outdoor break instead of exhausting themselves or leaving everyone asleep.
  if(w.id===state.guard&&state.relief===null&&actorNeeds(w).energy<20){lifeRest(state.life,w);return true}
  const destination=w.id===state.relief?watchWorker(world,state.guard):null;
  const route=destination?standingRoute(e,w,destination):watchPost(world,w);
  releaseWork(e,w);w.wait=0;w.route=route??[];w.state=route?(destination?'watch-bound':'patrolling'):'watching';ensureWatchParticipant(w).pauseUntil=e.time+5;
  if(w.id===state.guard&&!watchParticipant(w)?.announced){lifeEmit(state.life,'watch-start',w);ensureWatchParticipant(w).announced=true}
  return true;
 
}
export function watchSnapshot(world){const state=world.resource('Watch');
return {guardId:state.guard,reliefId:state.relief,started:state.started,handovers:state.handovers,handoverAt:state.handoverAt}
}
