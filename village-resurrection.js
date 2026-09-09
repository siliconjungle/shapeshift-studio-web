import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {ensureActorDailyActivity,ensureActorSocialActivity} from "./ecs/daily-activity-actors.js";
import {occasionSession} from "./ecs/community-entities.js";
import {occasionsCancel} from "./village-occasions.js";
import {ensureActorDeprivation} from './ecs/actor-deprivation.js';
import {actorVitality,ensureActorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt} from './village-survival.js';
import {survivalRecords} from './ecs/survival-records.js';
import {personAge,ensurePersonAge} from './ecs/person-age.js';
import {actorRomance,ensureActorRomance} from './ecs/actor-romance.js';
import {ensureActorFeelings} from './ecs/actor-feelings.js';
import {ensureWatchParticipant} from './ecs/watch-participants.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {ActionClock} from './action-timing.js';
import {DEATH_SECONDS} from './death-motion.js';
import {memorialOpacity} from './village-memorials.js';
import {newcomerTarget} from './village-newcomer.js';

// A grave identifies an existing person; this command never creates a new identity.
export function resurrectionTarget(e,target,{allowForming=false}={}){
 const grave=target?.kind==='grave'&&(e.survival?.memorials??[]).find(m=>m.id===target.id);
 const worker=grave&&e.workers.find(w=>w.id===grave.workerId);
 if(!grave||!(actorVitality(worker)?.dead)||memorialOpacity(grave,e.time)<=0||!allowForming&&e.time-grave.diedAt<DEATH_SECONDS)return {valid:false,reason:'Choose a villager’s gravestone'};
 let last;
 // Another villager may be visiting the stone. Find room beside it, not on them.
 for(const radius of [0,.7,1.2])for(let i=0;i<(radius?8:1);i++){
  const angle=i*Math.PI/4,point={x:grave.x+Math.cos(angle)*radius,z:grave.z+Math.sin(angle)*radius};
  const check=newcomerTarget(e,point);last=check;
  if(check.valid)return {...check,grave,worker,label:'Bring '+worker.name+' back to life'};
  if(check.reason.includes('population')||check.reason.includes('expected child'))return check;
 }
 return {valid:false,reason:last?.reason??'There is no room beside this grave'};
}
export function resurrectVillager(e,check){
 const {worker:w,grave,point,home}=check,deadFor=Math.max(0,e.time-grave.diedAt);
 // Time spent dead does not advance a child's development.
 if((personAge(w)?.child)){if(Number.isFinite((personAge(w)?.bornAt)))ensurePersonAge(w).bornAt+=deadFor;if(Number.isFinite((personAge(w)?.matureAt)))ensurePersonAge(w).matureAt+=deadFor}
 survivalInterrupt(e.survival,w);
 ensureWatchParticipant(w).sleepDebt=0;(Object.assign(ensureActorVitality(w),{dead:false,health:100}),(Object.assign(ensureActorDeprivation(w),{starvingFor:0,exhaustedFor:0,sleeplessFor:0}),((Object.assign(w,{...point}),Object.assign(ensureActorResidence(w),{home}),Object.assign(w,{store:e.depot,state:'idle',job:null,cargo:null,node:null,route:[],spacingRoute:null}),Object.assign(ensureActorInterior(w),{inside:false,insideAt:null}),Object.assign(w,{doorway:null,vx:0,vz:0,wait:1.3,retries:0,clock:new ActionClock('harvest'),revivedAt:e.time,resurrections:(w.resurrections??0)+1}),w),Object.assign(ensureActorDailyActivity(w),{careAt:e.time+1.3}),Object.assign(ensureActorSocialActivity(w),{socialAfter:e.time+4}),Object.assign(ensureActorDailyActivity(w),{activityUntil:0}),Object.assign(w,{recoveringFromCombat:false}),w)));
 Object.assign(actorNeeds(w),{energy:85,hunger:15,social:60});
 delete actorVitality(w)?.diedAt;delete actorVitality(w)?.deathCause;delete ensureActorInterior(w).enteredAt;delete ensureActorInterior(w).exitAt;delete ensureActorInterior(w).exitFrom;
 // Keep memories and family links, but do not claim a former partner who moved on.
 const sweetheart=e.workers.find(p=>p.id===(actorRomance(w)?.sweetheartId));
 if(!sweetheart||(actorVitality(sweetheart)?.dead)||(actorRomance(sweetheart)?.sweetheartId)!==w.id)ensureActorRomance(w).sweetheartId=null;
 for(const other of e.workers)if(other.grievingForId===w.id){other.grievingForId=null;ensureActorFeelings(other).heartbrokenUntil=0;other.griefAt=null;other.comfortedLossAt=null}
 survivalRecords(e.survival).memorials.remove(grave);
 if(e.wishes)e.wishes.burns=e.wishes.burns.filter(b=>!(b.kind==='villager'&&b.id===w.id));
 const occasions=e.occasions;
 if(occasions){
  if(occasionSession(occasions)?.occasion.kind==='memorial'&&occasionSession(occasions).occasion.source===w.id)occasionsCancel(occasions);
  occasions.queue=occasions.queue.filter(o=>!(o.kind==='memorial'&&o.source===w.id));
  occasions.recent=occasions.recent.filter(key=>key!=='memorial:'+w.id);
 }
 e.emit('resurrected',w,null,{graveId:grave.id,witnessIds:e.workers.filter(other=>!(actorVitality(other)?.dead)).map(other=>other.id)});return w;
}

// Allow the final death animation to finish when a held card can still save the village.
export function canResurrectFromHand(e){
 if(e.faith?.offeringsEnabled&&e.faith.wishes<1)return false;
 return (e.wishes?.reserve==='resurrect'||!!e.wishes?.queue.includes('resurrect'))&&(e.survival?.memorials??[]).some(m=>resurrectionTarget(e,{kind:'grave',id:m.id},{allowForming:true}).valid);
}
