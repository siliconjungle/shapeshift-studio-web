import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {ensureActorDailyActivity,ensureActorSocialActivity} from "./ecs/daily-activity-actors.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {applyVillageShield,villageEffects} from './gameplay-effects/village-runtime.js';
import {villageActorRef} from './gameplay-effects/village-targets.js';
import {faithChange,faithBenefit} from "./village-faith.js";
import {ensureActorDivineResponse,actorDivineResponse,actorDivineIntent,actorFaith,ensureActorFaith} from "./ecs/religion-actors.js";
import {beastLearning} from './ecs/beast-learning.js';
import {beastsInterrupt,beastsSupported,beastsStoreRoute,beastsReinforce,beastsCue} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt} from './village-survival.js';
import {lifeRelation,lifeCancelSocial} from './village-life.js';
import {memoryMutual} from './village-memory.js';
import {slimeSupported} from './village-slimes.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {dangerRefresh} from './village-danger.js';
import {supportCloseness} from './village-support.js';
import {rivalBeasts} from './rival-roster.js';
import {visitingRivalBeast} from './rival-beast.js';
import {defineGameData} from './game-data.js';
import {visibleAt} from './village-exploration.js';
import {answerDivineRequest} from './village-divine-request.js';
import {visiblePeople,visibleSocialPeople} from './village-people.js';
import {interruptedTask,queuePlacementChoice} from './village-placement-choice.js';
import {actorLabel} from './village-cultures.js';
import {canWalkAt} from './village-walking.js';
import {standingRoom} from './village-spacing.js';
export {DIVINE_RULES} from './divine-rules.js';
import {DIVINE_RULES} from './divine-rules.js';
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.gone;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function divineActor(e,t){return (t?.kind==='beast'?[...(e.beasts?.actors??[]),...rivalBeasts(e).filter(b=>b.visit&&!b.gone)]:t?.kind==='villager'?visiblePeople(e):t?.kind==='raider'?e.raids?.enemies:t?.kind==='slime'?e.slimes?.enemies:[])?.find(w=>w.id===t.id)}
export function heldActor(e){return divineActor(e,e.divine?.held)}
export function shieldBlocks(e,w,cause='attack'){
 if(!['attack','fire','lightning','leader-rivalry','revolt'].includes(cause))return false;
 if(w.divineHeld)return true;
 const protection=e.abilityEffects?villageEffects(e).modified(villageActorRef(e,w),'protection',0).value:0;
 if(!(w.shieldUntil>e.time)&&!(protection>0))return false;
 if((w.shieldCueAt??-Infinity)<=e.time){w.shieldHitAt=e.time;w.shieldCueAt=e.time+.16;e.emit('shield-blocked',e.workers.includes(w)?w:null,null,{actorId:w.id,actorKind:e.workers.includes(w)?'villager':w.species==='beast'?'beast':w.species==='slime'?'slime':'raider'})}
 return true;
}
export function interventionTarget(e,target){
 const actor=divineActor(e,target);
 return alive(actor)&&!(actorInterior(actor)?.inside)&&!actor.divineHeld&&!actor.flight&&!['emerging','departing','fading'].includes(actor.state)?{valid:true,actor,label:actorLabel(actor,target.kind)}:{valid:false,reason:'Choose a living character outdoors'};
}
export function shieldActor(e,actor){return applyVillageShield(e,actor)}
const threats=e=>[...(e.raids?.enemies??[]),...(e.slimes?.enemies??[])].filter(w=>alive(w)&&!w.divineHeld&&!['fleeing','departing','fading'].includes(w.state));
function dangerAt(e,point){return threats(e).filter(w=>distance(w,point)<4).length+([...e.wishes?.burns??[],...e.lightning?.fires??[],...e.shelter?.fires??[]].some(f=>f.until>e.time&&Number.isFinite(f.x)&&distance(f,point)<2)?2:0)}
function thought(e,w,text,mood){(ensureActorDivineResponse(w).memories)=[{text,at:e.time},...((actorDivineResponse(w)?.memories)??[])].slice(0,6);(ensureActorDivineResponse(w).mood)={kind:mood,until:e.time+8}}
export function liftActor(e,target,actor){
 const beastTrace=target.kind==='beast'?(beastLearning(actor)?.recentBehaviour):null,previousTask=target.kind==='villager'?interruptedTask(actor):null;
 answerDivineRequest(e,actor,'deferred','respond to being lifted again');
 delete actorDivineIntent(actor)?.choice;
 const witnesses=e.workers.filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&w!==actor&&distance(w,actor)<8).map(w=>w.id),danger=dangerAt(e,actor)+(actor.state==='ritual-bound'?3:0);
 if(target.kind==='beast')beastsInterrupt(e.beasts,actor);
 else if(target.kind==='villager')survivalInterrupt(e.survival,actor);
 else Object.assign(actor,{route:[],target:null,targetId:null,victimId:null,windup:0,clock:0});
 delete ensureActorInterior(actor).exitAt;delete ensureActorInterior(actor).exitFrom;delete actor.ritualDeathPost;
 (Object.assign(actor,{divineHeld:true,state:'held',vx:0,vz:0}),Object.assign(ensureActorInterior(actor),{inside:false}),actor);
 e.divine??={};e.divine.held={kind:target.kind,id:actor.id,from:{x:actor.x,z:actor.z},startedAt:e.time,danger,witnesses,beastTrace,previousTask};
 if(target.kind==='villager'){const mood=actorPersonality(actor)?.trait==='playful'||actorPersonality(actor)?.trait==='outgoing'?'delight':actorPersonality(actor)?.trait==='blunt'?'grumpy':'surprise';(ensureActorDivineResponse(actor).mood)={kind:mood,until:e.time+8};e.emit('divine-lifted',actor,null,{reaction:mood})}
 else if(target.kind==='beast'){const playful=(beastLearning(actor)?.temperament)==='playful',stubborn=(beastLearning(actor)?.temperament)==='stubborn';e.emit('beast-reaction',null,null,{beastId:actor.id,reaction:playful?'delight':stubborn?'grumpy':'surprise',expression:playful?'happy':stubborn?'angry':'surprised'});}
 else e.emit(target.kind==='raider'?'raider-lifted':'slime-lifted',null,null,{[target.kind==='raider'?'raiderId':'slimeId']:actor.id});
 for(const id of witnesses)e.emit('divine-witness',e.workers.find(w=>w.id===id),null,{reaction:target.kind==='villager'?'surprise':'delight'});
}
export function placementTarget(e,point){
 const h=e.divine?.held,actor=heldActor(e);
 if(!h||!alive(actor))return {valid:false,reason:'No character is being held'};
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!canWalkAt(point.x,point.z,e.heightAt,e.obstacles())||!standingRoom(e,actor,point))return {valid:false,reason:'Choose clear, walkable ground'};
 if(h.kind==='beast'&&(!beastsSupported(e.beasts,point)||!beastsStoreRoute(e.beasts,point)))return {valid:false,reason:'This beast needs clear ground connected to the village'};
 if(h.kind==='slime'&&!slimeSupported(e.slimes,point.x,point.z,actor.radius))return {valid:false,reason:'This blob needs more clear ground'};
 if(h.kind==='villager'&&!e.pathfind(point,e.depot,e.heightAt,e.obstacles()))return {valid:false,reason:'Choose ground connected to the village'};
 if([...(e.raids?.enemies??[]),...(e.slimes?.enemies??[])].some(w=>w!==actor&&alive(w)&&!w.divineHeld&&distance(point,w)<.7+(w.radius??.3)))return {valid:false,reason:'Leave some room around other characters'};
 return {valid:true,point:{x:point.x,z:point.z},actor,label:'Put down '+(actorLabel(actor,h.kind))};
}
function placementReactions(e,h,actor,point){
 const risk=dangerAt(e,point),saved=h.danger>risk,harmed=risk>h.danger;
 if(h.kind==='villager'){
  const mood=harmed?'afraid':saved?'relieved':actorPersonality(actor)?.trait==='blunt'?'angry':['quiet','thoughtful'].includes(actorPersonality(actor)?.trait)?'worried':actorPersonality(actor)?.trait==='playful'||actorPersonality(actor)?.trait==='outgoing'?'delighted':((actorFaith(actor)?.belief)?.value??.5)>.65?'relieved':'startled';
  const text=harmed?'The divine hand put me in danger.':saved?'The divine hand carried me to safety.':mood==='delighted'?'I flew in the hand of our god!':mood==='angry'?'I did not ask to be moved by our god.':mood==='worried'?'Being lifted by our god frightened me.':'Our god lifted me and set me down again.';
  thought(e,actor,text,mood);
  if(e.time>=(actorFaith(actor)?.handAfter??0)){if(harmed){faithChange(e.faith,actor,-.16,'dangerous-hand');if((actorFaith(actor)?.belief))(ensureActorFaith(actor).belief).lastHarmAt=e.time}else if(saved)faithBenefit(e.faith,actor,.8,'carried-to-safety');else if(mood==='angry'||mood==='worried')faithChange(e.faith,actor,-.045,'unwanted-hand');else if(mood==='delighted')faithBenefit(e.faith,actor,.25,'divine-flight');ensureActorFaith(actor).handAfter=e.time+60}
  e.emit('divine-placed',actor,null,{reaction:harmed?'nervous':saved||mood==='delighted'?'delight':mood==='angry'?'grumpy':mood==='worried'?'nervous':'surprise'});
 }
 if(h.kind==='beast'){const moved=distance(h.from,point)>2;const lesson=harmed?'dangerous-hand':saved?'rescue':moved?'redirect':null;if(lesson)beastsReinforce(e.beasts,actor,lesson,{trace:h.beastTrace});else if((beastLearning(actor)?.temperament)==='playful')beastsCue(e.beasts,actor,'delight','happy');}
 const witnesses=e.workers.filter(w=>alive(w)&&w!==actor&&!(actorInterior(w)?.inside)&&((h.witnesses??[]).includes(w.id)||distance(w,point)<8));
 for(const w of witnesses){
  const close=h.kind==='villager'&&(supportCloseness(e,w,actor)>0||((e.life)==null?undefined:(lifeRelation(e.life,w.id,actor.id)?.affinity))>.28),enemyNear=!['villager','beast'].includes(h.kind)&&distance(w,point)<5,removed=!['villager','beast'].includes(h.kind)&&distance(w,h.from)<5&&distance(w,point)>6;
  const upset=enemyNear||close&&harmed||h.kind==='villager'&&(actorPersonality(w)?.trait)==='gentle'&&(actorDivineResponse(actor)?.mood)?.kind==='angry';
  const pleased=removed||close&&saved||!upset&&(actorPersonality(w)?.trait)==='playful';
  if(e.time>=(actorFaith(w)?.witnessAfter??0)){if(upset)faithChange(e.faith,w,-.06,'witnessed-hand-danger');else if(pleased)faithBenefit(e.faith,w,.3,'witnessed-hand-help');ensureActorFaith(w).witnessAfter=e.time+60}
  thought(e,w,enemyNear?'Our god brought danger close to us.':removed?'Our god carried the creature away.':close&&saved?`Our god carried ${actor.name} to safety.`:upset?'I disliked what our god did with the divine hand.':`I watched our god lift ${actor.name??'a creature'}.`,upset?'worried':pleased?'delighted':'startled');
  e.emit('divine-witness',w,null,{reaction:upset?'nervous':pleased?'delight':'surprise'});
 }
}
// Placement has no second card/cooldown cost. Buffer events just like casts.
export function placeHeldActor(e,point,{cancel=false}={}){
 if(!cancel&&point&&!visibleAt(e,point.x,point.z))return {valid:false,reason:'Beyond the village’s sight'};
 const h=e.divine?.held,actor=heldActor(e);if(!h)return {valid:false,reason:'No character is being held'};
 if(!alive(actor)){if(actor)actor.divineHeld=false;e.divine.held=null;return {valid:false,reason:'This character is no longer alive'};}
 const check=cancel?{valid:true,point:h.from,actor}:placementTarget(e,point);if(!check.valid)return check;
 const previous=e.events;e.events=[];
 try{
  (Object.assign(actor,check.point),Object.assign(actor,{divineHeld:false,state:['villager','beast'].includes(h.kind)?'idle':h.kind==='slime'?'wander':'sneaking',route:[],vx:0,vz:0,wait:.6}),Object.assign(ensureActorDailyActivity(actor),{careAt:e.time+.6}),Object.assign(actor,{repathAt:0,scanAt:0,attackAt:e.time+1,landedAt:e.time,lift:0}),actor);
  actor.divinePlacedAt=e.time;actor.divineHeldSeconds=e.time-h.startedAt;
  if(actor.expiresAt)actor.expiresAt+=actor.divineHeldSeconds;
  e.divine.held=null;
  if(!cancel){placementReactions(e,h,actor,check.point);if(h.kind==='villager')queuePlacementChoice(e,actor,h.previousTask);}
  dangerRefresh(e);e.wishes.pending.push(...e.events);
 }finally{e.events=previous}
 return {valid:true,label:check.label??'Returned to the original position'};
}
export function socialPair(e,point){
 const near=visibleSocialPeople(e).filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(w,point)<=DIVINE_RULES.pairRadius).sort((a,b)=>distance(a,point)-distance(b,point)||a.id-b.id);
 return near.length>=2?near.slice(0,2):[];
}
export function changeSocialBond(e,pair,kind){
 const [a,b]=pair,r=lifeRelation(e.life,a.id,b.id);for(const s of [...e.life.sessions])if(s.workers.includes(a)||s.workers.includes(b))lifeCancelSocial(e.life,s);
 r.affinity=kind==='friendship'?.85:-.85;r.socialMiracle=kind;r.socialMiracleAt=e.time;r.meetings=Math.max(5,r.meetings);
 memoryMutual(e.life.memory,a,b,kind==='friendship'?'miracle-friend':'miracle-enemy');
 for(const w of pair){ensureActorSocialActivity(w).socialAfter=e.time+2;actorNeeds(w).social=Math.max(0,Math.min(100,actorNeeds(w).social+(kind==='friendship'?25:-20)));(ensureActorDivineResponse(w).mood)={kind:kind==='friendship'?'delighted':'angry',until:e.time+8}}
 e.emit('wish-'+kind,a,null,{partnerId:b.id});
}
