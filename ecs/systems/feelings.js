import {ensureActorSocialActivity,actorSocialActivity} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {personKinship} from '../person-kinship.js';
import {ensureBeastEmotions,beastEmotions} from '../beast-emotions.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeRelation} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorRomance} from '../actor-romance.js';
import {FEELING_RULES} from '../feeling-rules.js';
import {actorFeelings,ensureActorFeelings} from '../actor-feelings.js';
import {memoryRemember} from '../../village-memory.js';
import {actorNeeds} from '../actor-needs.js';
import {ensureSupportParticipant} from '../support-participants.js';
import {interestedInRomance,romanticHurtFactor,validRomanceInterest} from '../../village-romance-interest.js';
import {knownPeople,socialPeople} from '../../village-people.js';
import {attractedTo} from '../../village-sexuality.js';
const clamp=n=>Math.max(0,Math.min(1,n));
export const directedAttraction=(r,id)=>r?(r.a===id?r.attractionAB:r.attractionBA)??0:0;
export const activeHeartbreak=(e,w)=>{if((actorVitality(w)?.dead)||personAge(w)?.child)return null;const feelings=actorFeelings(w);return feelings?.heartbreak&&feelings.heartbrokenUntil>e.time?feelings.heartbreak:null;};
export const refusingFood=(e,w)=>!!(activeHeartbreak(e,w)?.refuseUntil>e.time);
export const sociallyWithdrawn=(e,w)=>!!(activeHeartbreak(e,w)?.withdrawUntil>e.time);
export function emotionalAttachment(e,w,other,r=((e.life)==null?undefined:(lifeRelation(e.life,w.id,other.id)))){
 const crush=actorFeelings(w)?.crush;
 return clamp(directedAttraction(r,w.id)*.7+Math.min(1,(r?.meetings??0)/10)*.2+Math.max(0,r?.affinity??0)*.1+(crush?.targetId===other.id?crush.strength*.12:0));
}
export function hurtRomantically(world,w,other,cause,{attachment=emotionalAttachment(world.resource('Village'),w,other),established=false}={}){
 const e=world.resource('Village');
 if((actorVitality(w)?.dead)||(personAge(w)?.child))return null;
 const sensitive=['quiet','gentle','thoughtful'].includes((actorPersonality(w)?.trait)),importance=established?1:romanticHurtFactor(w,other,((e.life)==null?undefined:(lifeRelation(e.life,w.id,other.id)))),severity=clamp((.12+attachment*.78+(sensitive?.08:0))*importance);
 const deep=importance>=.9&&attachment>=.88&&((((e.life)==null?undefined:(lifeRelation(e.life,w.id,other.id)?.meetings))??0)>=8||((actorFeelings(w)?.crush)?.strength??0)>=.85);
 const extreme=deep&&e.random()<FEELING_RULES.extremeChance;
 const duration=extreme?FEELING_RULES.extremeDuration:(35+severity*40)*importance;
 const refuses=extreme||severity>.65&&e.random()<.3;
 ensureActorFeelings(w).heartbreak={otherId:other.id,otherName:other.name,cause,attachment,severity:extreme?.98:severity,extreme,startedAt:e.time,until:e.time+duration,refuseUntil:e.time+(refuses?(extreme?FEELING_RULES.extremeRefusal:18+severity*20):0),withdrawUntil:e.time+(extreme?240:severity>.45?18+severity*32:0)};
 if(w.species==='beast'){ensureBeastEmotions(w).anger=clamp(((beastEmotions(w)?.anger)??0)+severity*.75);ensureBeastEmotions(w).emotionalReason=(cause==='bereaved'?'Grieving for ':cause==='cheated-on'?'Betrayed by ':'Heartbroken over ')+other.name;ensureBeastEmotions(w).emotionalTargetId=other.id;}
 ensureActorFeelings(w).heartbrokenUntil=(actorFeelings(w)?.heartbreak).until;ensureSupportParticipant(w).receiveAfter=0;ensureActorFeelings(w).refusingFoodNow=refuses;ensureActorFeelings(w).withdrawnNow=(actorFeelings(w)?.heartbreak).withdrawUntil>e.time;
 actorNeeds(w).social=Math.max(0,actorNeeds(w).social-(12*importance+severity*28));ensureActorSocialActivity(w).socialAfter=Math.max(actorSocialActivity(w)?.socialAfter??0,e.time+20);
 if((actorFeelings(w)?.crush)?.targetId===other.id)ensureActorFeelings(w).crush.rejectedAt=e.time;
 memoryRemember(e.life.memory,w,other,cause==='cheated-on'?'betrayed':cause==='breakup'?'parted':'rejected');
 if(refuses)e.emit('heartbreak-refusing-food',w,null,{partnerId:other.id,extreme});
 if(sociallyWithdrawn(e,w))e.emit('heartbreak-withdrawn',w,null,{partnerId:other.id});
 return (actorFeelings(w)?.heartbreak);
}
export function comfortHeartbreak(world,w,helper){
 const e=world.resource('Village');
 const h=activeHeartbreak(e,w);if(!h)return false;
 ensureActorFeelings(w).refusingFoodNow=ensureActorFeelings(w).withdrawnNow=false;
 h.severity=Math.max(0,h.severity-FEELING_RULES.comfortRelief);h.refuseUntil=e.time;h.withdrawUntil=e.time;
 h.until=e.time+Math.max(12,((actorFeelings(w)?.heartbrokenUntil)-e.time)*.55);ensureActorFeelings(w).heartbrokenUntil=h.until;h.comfortedAt=e.time;h.comfortedBy=helper.id;
 e.emit('heartbreak-comforted',w,null,{helperId:helper.id});return true;
}
export function clearRomanticFeelings(w){const feelings=ensureActorFeelings(w);delete feelings.heartbreak;delete feelings.crush;feelings.heartbrokenUntil=0;feelings.refusingFoodNow=feelings.withdrawnNow=false;}
function crushEligible(e,w,p){
 if(w===p||(actorVitality(w)?.dead)||(actorVitality(p)?.dead)||(personAge(w)?.child)||(personAge(p)?.child)||w.exiled||p.exiled||!attractedTo(w,p))return false;
 const people=knownPeople(e),ancestors=a=>{const seen=new Set(),todo=[...((personKinship(a)?.parents)??[])];while(todo.length){const id=todo.pop();if(seen.has(id))continue;seen.add(id);todo.push(...((personKinship(people.find(x=>x.id===id))?.parents)??[]));}return seen;},a=ancestors(w),b=ancestors(p);
 return !a.has(p.id)&&!b.has(w.id)&&![...a].some(id=>b.has(id));
}
export function updateFeelings(world,dt){
 const e=world.resource('Village');
 if(!(dt>0))return;
 const people=socialPeople(e);
 for(const w of [...e.workers,...(e.beasts?.actors??[])]){
  if((actorVitality(w)?.dead))continue;
  if((personAge(w)?.child)){if((actorFeelings(w)?.heartbreak)||(actorFeelings(w)?.crush))clearRomanticFeelings(w);ensureActorFeelings(w).refusingFoodNow=ensureActorFeelings(w).withdrawnNow=false;continue;}
  ensureActorFeelings(w).refusingFoodNow=refusingFood(e,w);ensureActorFeelings(w).withdrawnNow=sociallyWithdrawn(e,w);
  if((actorFeelings(w)?.heartbreak)&&e.time>=(actorFeelings(w)?.heartbrokenUntil)){delete actorFeelings(w)?.heartbreak;e.emit('heartbreak-eased',w);}
  if((actorFeelings(w)?.crush)){const target=people.find(p=>p.id===(actorFeelings(w)?.crush).targetId);if(!target||!crushEligible(e,w,target)||(actorRomance(w)?.sweetheartId)!=null||w.leaderBelovedId!=null)delete actorFeelings(w)?.crush;}
  if(((actorFeelings(w)?.crushCheckAt)??0)>e.time)continue;ensureActorFeelings(w).crushCheckAt=e.time+FEELING_RULES.crushCheck;
  if((actorRomance(w)?.sweetheartId)!=null||w.leaderBelovedId!=null||activeHeartbreak(e,w))continue;
  const candidates=people.filter(p=>crushEligible(e,w,p)).map(p=>({p,r:lifeRelation(e.life,w.id,p.id)})).filter(({r})=>r&&r.meetings>=1&&r.affinity>.2&&interestedInRomance(w,r,'crush')&&(r.romanceAfter??0)<=e.time);
  candidates.sort((a,b)=>directedAttraction(b.r,w.id)-directedAttraction(a.r,w.id));const next=candidates[0];
  if(!next){if((actorFeelings(w)?.crush)&&e.time-(actorFeelings(w)?.crush).since>120)delete actorFeelings(w)?.crush;continue;}
  if((actorFeelings(w)?.crush)?.targetId!==next.p.id){ensureActorFeelings(w).crush={targetId:next.p.id,since:e.time,strength:.25,reciprocal:attractedTo(next.p,w)&&interestedInRomance(next.p,next.r)};e.emit('crush-formed',w,null,{partnerId:next.p.id});}
  else{ensureActorFeelings(w).crush.strength=clamp((actorFeelings(w)?.crush).strength+.035);ensureActorFeelings(w).crush.reciprocal=attractedTo(next.p,w)&&interestedInRomance(next.p,next.r);}
 }
}
export function validFeelings(w){
 const c=(actorFeelings(w)?.crush),h=(actorFeelings(w)?.heartbreak),identity=id=>Number.isSafeInteger(id)||typeof id==='string'&&/^beast-\d+$/.test(id);
 return validRomanceInterest(w)&&(!c||identity(c.targetId)&&Number.isFinite(c.since)&&Number.isFinite(c.strength)&&c.strength>=0&&c.strength<=1&&typeof c.reciprocal==='boolean')&&(!h||identity(h.otherId)&&['severity','attachment'].every(k=>Number.isFinite(h[k])&&h[k]>=0&&h[k]<=1)&&['startedAt','until','refuseUntil','withdrawUntil'].every(k=>Number.isFinite(h[k]))&&typeof h.extreme==='boolean');
}
