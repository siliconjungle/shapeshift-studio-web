import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {releaseWork} from "../../village-resources.js";
import {lifeClock,lifeMealAccounting} from "../life-state.js";
import {actorSleep,ensureActorSleep,ensureActorSocialActivity,ensureActorDailyActivity,actorDailyActivity,actorSocialActivity} from "../daily-activity-actors.js";
import {actorPersonality,ensureActorPersonality} from "../personality-actors.js";
import {attachmentsRest} from "../../village-attachments.js";
import {rivalPeople} from '../../rival-roster.js';
import {forcedSleep} from '../../behaviour-wishes.js';
import {actorMeal,ensureActorMeal} from '../actor-meal.js';
import {campfireTakeMeal} from '../../village-campfire.js';
import {actorFeeding,ensureActorFeeding} from '../actor-feeding.js';
import {actorDeprivation} from '../actor-deprivation.js';
import {actorVitality} from '../actor-vitality.js';
import {personAge} from '../person-age.js';
import {ensureActorRomance,actorRomance} from '../actor-romance.js';
import {ensureActorFeelings} from '../actor-feelings.js';
import {memoryUpdate} from '../../village-memory.js';
import {watchParticipant} from '../watch-participants.js';
import {watchUpdate,watchHandle,watchAssigned,watchSnapshot} from '../../village-watch.js';
import {updateResidentNeeds} from '../systems/needs.js';
import {actorNeeds,setActorNeeds} from '../actor-needs.js';

import {relationshipLabel} from '../../relationship-label.js';

import {chooseSocialMeeting,cancelSocialMeeting,finishSocialMeeting,updateSocialMeetings} from '../systems/social-meetings.js';
import {socialEntities} from '../social-entities.js';
import {beastRelation} from '../../beast-behaviour.js';
import {updateFeelings,refusingFood} from '../../village-feelings.js';
import {completeCustom} from '../../village-traditions.js';
import {sleepingHome,SHELTER_RULES} from '../../village-shelter.js';
import {createMemory} from '../../village-memory.js';
import {createRomance} from '../../village-romance.js';
import {createWatch} from '../../village-watch.js';
import {standingRoute} from '../../village-spacing.js';
import {beginHouseExit} from '../../doorway-transition.js';
import {isBedtime,wrapHour} from '../../village-time.js';
const clamp=n=>Math.max(0,Math.min(100,n));
const traits=['gentle','outgoing','quiet','playful','blunt','thoughtful'];
const movingStates=new Set(['mealbound','homebound','meeting']);
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
export function initialiseLife(world,{watch=true}={}){const state=world.resource('Life'),economy=state.economy;
socialEntities(state);state.memory=createMemory(economy);state.romance=createRomance(state);
  for(const [i,w] of economy.workers.entries()){setActorNeeds(w,{energy:67+i*5%28,hunger:18+i*9,social:39+i*7,...actorNeeds(w)});(Object.assign(ensureActorFeelings(w),{heartbrokenUntil:0}),(Object.assign(ensureActorRomance(w),{sweetheartId:(actorRomance(w)?.sweetheartId)??null}),Object.assign(ensureActorPersonality(w),{trait:actorPersonality(w)?.trait??traits[i%traits.length]}),((Object.assign(ensureActorResidence(w),{home:state.homes[i%state.homes.length]}),w),Object.assign(ensureActorSleep(w),{bedtime:actorSleep(w)?.bedtime??20.1+(i%4)*.5,wakeHour:actorSleep(w)?.wakeHour??5.8+(i%4)*.4}),(Object.assign(ensureActorInterior(w),{inside:false}),w),Object.assign(ensureActorSocialActivity(w),{partnerId:null,socialAfter:i*2}),Object.assign(ensureActorDailyActivity(w),{careAt:i*.4,activityUntil:0}),w)));}
  for(let a=0;a<economy.workers.length;a++)for(let b=a+1;b<economy.workers.length;b++){
   const pair=a*31+b*17+5,close=Math.floor(a/2)===Math.floor(b/2);
   lifeAddRelationship(world,{a:economy.workers[a].id,b:economy.workers[b].id,affinity:close?.38:hash(pair)*.7-.42,
    compatibility:close?.75:hash(pair+6)*1.6-.8,attractionAB:hash(pair+20),attractionBA:hash(pair+21),meetings:0});
  }
  state.watch=watch?createWatch(state):null;
 
}
export function lifeRelation(world,a,b){const state=world.resource('Life');
const beast=state.economy.beasts?.actors.find(w=>w.id===a||w.id===b);if(beast){const other=state.economy.workers.find(w=>w.id===(beast.id===a?b:a))??rivalPeople(state.economy).find(w=>w.id===(beast.id===a?b:a))??state.economy.leadership?.exiles.find(w=>w.id===(beast.id===a?b:a));return other?beastRelation(beast,other):undefined;}return socialEntities(state).relationships.find(a,b)
}
export function lifeAddRelationship(world,record){const state=world.resource('Life');
socialEntities(state).relationships.add(record);return record
}
export function lifeAddSocialMeeting(world,record){const state=world.resource('Life');
socialEntities(state).meetings.add(record);return record
}
export function lifeEmit(world,type,w,extra={}){const state=world.resource('Life');
state.economy.emit(type,w,null,extra)
}
export function lifeUpdate(world,dt,hour){const state=world.resource('Life');

  const next=wrapHour(hour);if(next<lifeClock(state).hour-12)lifeClock(state).day++;lifeClock(state).hour=next;
  // Rates are expressed per world day, so changing the day length keeps the
  // number of meals and breaks sensible.
  updateFeelings(state.economy,dt);
  updateResidentNeeds(world,dt);
  updateSocialMeetings(world,dt);
  memoryUpdate(state.memory,dt);
  watchUpdate(state.watch,dt);
 
}
export function lifeIdle(world,w){const state=world.resource('Life');
if((actorVitality(w)?.dead))return;w.state='idle';w.route=[];ensureActorInterior(w).inside=false;ensureActorSocialActivity(w).partnerId=null;w.wait=.5;ensureActorDailyActivity(w).careAt=state.economy.time+.5
}
export function lifeStartRoute(world,w,nextState,destination){const state=world.resource('Life');

  const route=nextState==='mealbound'?standingRoute(state.economy,w,destination):state.economy.route(w,destination);
  if(!route){ensureActorDailyActivity(w).careAt=state.economy.time+8;return false}
  releaseWork(state.economy,w);w.wait=0;w.route=route;w.state=nextState;return true;
 
}
export function lifeRest(world,w,{here=false}={}){const state=world.resource('Life');
if(!here&&attachmentsRest(state.economy.attachments,w))return;releaseWork(state.economy,w);w.state='resting';w.wait=0;ensureActorDailyActivity(w).activityUntil=state.economy.time+12;lifeEmit(world,'rest',w)
}
export function lifeSocial(world,w){const state=world.resource('Life');
return chooseSocialMeeting(world,w);
}
export function lifeCancelSocial(world,session){const state=world.resource('Life');
return cancelSocialMeeting(world,session);
}
export function lifeFinishSocial(world,session){const state=world.resource('Life');
return finishSocialMeeting(world,session);
}
export function lifeHandle(world,w,dt){const state=world.resource('Life');

  const wishSleep=forcedSleep(state.economy,w);
  if(!wishSleep&&watchHandle(state.watch,w,dt))return true;
  const e=state.economy,night=wishSleep||actorNeeds(w).hunger<90&&!watchAssigned(state.watch,w)&&(isBedtime(lifeClock(state).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||(watchParticipant(w)?.sleepDebt??0)>0);
  if(w.state==='sleeping'){
   if(!sleepingHome(e,w)||(!night&&actorNeeds(w).energy>=50)||actorNeeds(w).hunger>=90){lifeIdle(world,w);w.x=(actorResidence(w)?.home).x;w.z=(actorResidence(w)?.home).z;beginHouseExit(w,e.time);lifeEmit(world,'wake',w)}
   return true;
  }
  if(w.state==='eating'){
   if(e.time>=actorDailyActivity(w)?.activityUntil){actorNeeds(w).hunger=clamp(actorNeeds(w).hunger-62);actorNeeds(w).energy=clamp(actorNeeds(w).energy+((actorMeal(w)?.cookedMeal)?11:7));if((actorMeal(w)?.cookedMeal)){e.emit('stew-enjoyed',w,null,{cookId:(actorMeal(w)?.mealCookId)});delete actorMeal(w)?.mealCookId;actorNeeds(w).social=clamp(actorNeeds(w).social+8);completeCustom(e,'meal',[w,...e.workers.filter(p=>p!==w&&!(actorVitality(p)?.dead)&&(actorMeal(p)?.cookedMeal)&&Math.hypot(p.x-w.x,p.z-w.z)<5)]);}ensureActorMeal(w).cookedMeal=false;lifeIdle(world,w)}return true;
  }
  if(w.state==='resting'){
   if(e.time>=actorDailyActivity(w)?.activityUntil||actorNeeds(w).energy>=82&&!night){lifeIdle(world,w)}return true;
  }
  if(w.state==='socialising'||w.state==='waiting-friend')return true;
  if(movingStates.has(w.state)){
   const status=e.move(w,dt);
   if(status==='blocked'){
    const session=state.sessions.find(s=>s.workers.includes(w));if(session)lifeCancelSocial(world,session);else lifeIdle(world,w);
    ensureActorDailyActivity(w).careAt=e.time+8;return true;
   }
   if(status!=='arrived')return true;
   if(w.state==='homebound'){if(!sleepingHome(e,w)){lifeIdle(world,w);lifeRest(world,w,{here:true});return true}w.state='sleeping';ensureActorInterior(w).inside=true;ensureActorInterior(w).insideAt=(actorResidence(w)?.home);ensureActorInterior(w).enteredAt=e.time;lifeEmit(world,'sleep',w)}
   else if(w.state==='meeting')w.state='waiting-friend';
   else if(refusingFood(e,w)){lifeIdle(world,w);ensureActorDailyActivity(w).careAt=e.time+5;}
   else if(e.stock.food>=1){e.stock.food--;lifeMealAccounting(state).consumed++;w.state='eating';ensureActorDailyActivity(w).activityUntil=e.time+5;((campfireState)=>campfireState==null?undefined:(campfireTakeMeal(campfireState,w)))(e.campfire);lifeEmit(world,'ate',w,{amount:1})}
   else{lifeIdle(world,w);ensureActorDailyActivity(w).careAt=e.time+6}
   return true;
  }
  if(w.cargo||!['idle','outbound'].includes(w.state)||actorDailyActivity(w)?.careAt>e.time)return false;
  ensureActorDailyActivity(w).careAt=e.time+1;
  if(w.state==='outbound'&&!night&&actorNeeds(w).hunger<85&&actorNeeds(w).energy>=12)return false;
  if(night||(actorNeeds(w).energy<12&&(actorDeprivation(w)?.sleeplessFor)>SHELTER_RULES.sleepDebtGrace)){const home=sleepingHome(e,w);if(home&&lifeStartRoute(world,w,'homebound',home)){lifeEmit(world,'homebound',w);return true}if(actorNeeds(w).hunger<85){lifeRest(world,w,{here:true});return true}}
  if(actorNeeds(w).hunger>=62&&e.stock.food>0&&!refusingFood(e,w)){if(lifeStartRoute(world,w,'mealbound',e.depot)){lifeEmit(world,'hungry',w);return true}}
  if(actorNeeds(w).hunger>=62&&e.stock.food===0&&((actorFeeding(w)?.hungerCueAt)??0)<=e.time){lifeEmit(world,'no-food',w);ensureActorFeeding(w).hungerCueAt=e.time+20}
  if(actorNeeds(w).energy<((personAge(w)?.elder)?42:28)){lifeRest(world,w);return true}
  if(actorNeeds(w).social<48&&actorSocialActivity(w)?.socialAfter<=e.time&&actorNeeds(w).hunger<82&&lifeSocial(world,w))return true;
  return false;
 
}
export function lifeSnapshot(world){const state=world.resource('Life');
return {hour:lifeClock(state).hour,day:lifeClock(state).day,consumed:lifeMealAccounting(state).consumed,watch:watchSnapshot(state.watch)??null,relationships:state.relationships.map(r=>({...r,label:relationshipLabel(r,state.economy.workers.find(w=>w.id===r.a),state.economy.workers.find(w=>w.id===r.b))}))}
}
