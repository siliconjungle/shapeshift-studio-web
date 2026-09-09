import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {lifeClock} from "../life-state.js";
import {actorSocialActivity,actorSleep} from "../daily-activity-actors.js";
import {actorPersonality} from "../personality-actors.js";
import {actorOccasion} from "../actor-occasion.js";
import {occasionSession} from "../community-entities.js";
import {occasionsAvailable,occasionsStart} from "../../village-occasions.js";
import {createTraditions} from "../tradition-entities.js";
import {actorTraditions,ensureActorTraditions} from "../actor-traditions.js";
import {actorMeal} from "../actor-meal.js";
import {cookingAvailable,cookingPoint,cookingSpot} from "../../village-cooking.js";
import {actorVitality} from "../actor-vitality.js";
import {lifeRelation} from "../../village-life.js";
import {personAge} from "../person-age.js";
import {actorFeelings,ensureActorFeelings} from "../actor-feelings.js";
import {actorNeeds} from "../actor-needs.js";
import {supportCloseness} from "../../village-support.js";
import {defineGameData} from "../../game-data.js";
import {DAY_LENGTH_SECONDS,isBedtime} from "../../village-time.js";

export const TRADITION_RULES=defineGameData('village-traditions.TRADITION_RULES',{halfLife:DAY_LENGTH_SECONDS*3,evidenceHalfLife:DAY_LENGTH_SECONDS*5,interval:35,firstGathering:60,learning:.32});
export const SOCIAL_CUSTOMS=['singing','stories','quiet'];
export const CUSTOMS={
 singing:{label:'Singing together',cue:'humming',bias:{outgoing:.35,playful:.4,quiet:-.25,blunt:-.15}},
 stories:{label:'Sharing stories',cue:'thinking',bias:{thoughtful:.4,outgoing:.25,quiet:.1,blunt:-.1}},
 quiet:{label:'Quiet company',cue:'rest',bias:{quiet:.4,gentle:.3,thoughtful:.2,outgoing:-.2,playful:-.2}},
 meal:{label:'Shared meals',cue:'love',bias:{gentle:.25,outgoing:.25}},
 cooking:{label:'Cooking for others',cue:'proud',bias:{gentle:.35,thoughtful:.2,blunt:.1}},
 welcome:{label:'Welcoming newcomers',cue:'love',bias:{outgoing:.35,gentle:.3,quiet:-.1}},
 remembrance:{label:'Remembering together',cue:'love',bias:{thoughtful:.3,gentle:.25,playful:-.1}}
};
const clamp=(n,min=-1,max=1)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function traditionState(world){
 const e=world.resource('Village');return e.traditions??createTraditions(e,{nextAt:e.time+TRADITION_RULES.firstGathering,sequence:0});}
export function customFeeling(world,w,kind){
 const e=world.resource('Village');
 const r=(actorTraditions(w)?.experiences)?.[kind],age=Math.max(0,e.time-(r?.at??e.time));
 return {value:(r?.value??0)*Math.pow(.5,age/TRADITION_RULES.halfLife),evidence:(r?.evidence??0)*Math.pow(.5,age/TRADITION_RULES.evidenceHalfLife)};
}
export function customPreference(world,w,kind){
 const e=world.resource('Village');return clamp((CUSTOMS[kind]?.bias[(actorPersonality(w)?.trait)]??0)+customFeeling(world,w,kind).value);}
export function customExperience(world,w,kind,reward,reason,other=null,{shock=false}={}){
 const e=world.resource('Village');
 if(!e.traditions||!CUSTOMS[kind]||!w||(actorVitality(w)?.dead))return;
 const previous=(actorTraditions(w)?.experiences)?.[kind];
 // One completed experience, not one reward per animation tick or companion.
 if(!shock&&previous&&e.time-previous.at<20)return;
 const old=customFeeling(world,w,kind),value=shock?clamp(old.value-reward):clamp(old.value+TRADITION_RULES.learning*(clamp(reward)-old.value));
 ((ensureActorTraditions(w).experiences)??={})[kind]={value,evidence:Math.min(12,old.evidence+1),at:e.time,reason,otherId:other?.id??null,otherName:other?.name??null,avoidUntil:shock?e.time+45+90*reward:previous?.avoidUntil??0};
}
export function customaryActivities(world){
 const e=world.resource('Village');
 if(!e.traditions)return [];
 const living=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.exiled);
 return Object.entries(CUSTOMS).map(([kind,definition])=>{
  const followers=living.filter(w=>{const f=customFeeling(world,w,kind);return f.evidence>=2.5&&f.value>.18&&customPreference(world,w,kind)>0;});
  return {kind,label:definition.label,followers:followers.map(w=>w.id),share:followers.length/Math.max(1,living.length)};
 }).filter(c=>c.followers.length>=2&&c.share>=.4);
}
export function customThoughts(world,w){
 const e=world.resource('Village');
 if(!e.traditions)return [];
 return Object.keys((actorTraditions(w)?.experiences)??{}).map(kind=>{
  const f=customFeeling(world,w,kind),r=(actorTraditions(w)?.experiences)[kind];if(!CUSTOMS[kind]||f.evidence<.4||Math.abs(f.value)<.08)return null;
  const feeling=f.value<-.28?'Wary of':f.value<0?'Unsure about':f.value>.35?'Fond of':'Warming to';
  const reason=r.reason==='loss'?`${r.otherName??'Someone close'} died during it`:r.reason==='hurt'?'Was hurt during it':r.reason==='discomfort'?'The last gathering was uncomfortable':r.reason==='relief'?'It helped after a difficult time':r.reason==='company'?'Enjoyed the company':r.reason==='cooked'?'People enjoyed the food':'Enjoyed taking part';
  return {at:r.at,text:`${feeling} ${CUSTOMS[kind].label.toLowerCase()} · ${reason}`};
 }).filter(Boolean).sort((a,b)=>b.at-a.at).slice(0,3).map(r=>r.text);
}
export function occasionCustom(kind){return ({house:'meal',recovery:'meal',birth:'welcome',memorial:'remembrance',welcome:'welcome'})[kind]??(SOCIAL_CUSTOMS.includes(kind)?kind:null);}
export function currentCustom(world,w){
 const e=world.resource('Village');
 if(w.state==='occasion-sharing')return occasionCustom((actorOccasion(w)?.kind));
 if(w.state==='cooking-stir'||w.state==='cooking-add')return 'cooking';
 if(w.state==='eating'&&((actorMeal(w)?.cookedMeal)||e.workers.some(p=>p!==w&&!(actorVitality(p)?.dead)&&p.state==='eating'&&distance(w,p)<4)))return 'meal';
 if(w.state==='socialising')return ['affection','quiet'].includes(actorSocialActivity(w)?.socialKind)?'quiet':'stories';
 return null;
}
export function willingCustom(world,w,kind,host=null){
 const e=world.resource('Village');
 if(!e.traditions||!kind)return true;
 const record=(actorTraditions(w)?.experiences)?.[kind];if(record?.avoidUntil>e.time)return false;
 const bond=host&&host!==w?Math.min(1,supportCloseness(e,w,host)??0)*.15:0;
 return customPreference(world,w,kind)+bond>-.35;
}
export function socialEnjoyment(world,w,kind,people){
 const e=world.resource('Village');
 const peers=people.filter(p=>p!==w),bond=peers.length?peers.reduce((n,p)=>n+clamp(lifeRelation(e.life,w.id,p.id)?.affinity??0),0)/peers.length:0;
 const discomfort=actorNeeds(w).hunger>60||actorNeeds(w).energy<35||actorNeeds(w).temperature<22||actorNeeds(w).temperature>78;
 return clamp(.35+(CUSTOMS[kind]?.bias[(actorPersonality(w)?.trait)]??0)*.9+bond*.35-(discomfort?.65:0));
}
export function completeCustom(world,kind,people){
 const e=world.resource('Village');
 if(!e.traditions||!kind)return;
 for(const w of people){
  const reward=socialEnjoyment(world,w,kind,people),relief=reward>0&&((actorFeelings(w)?.heartbrokenUntil)>e.time||w.raidStressUntil>e.time);
  customExperience(world,w,kind,reward+(relief?.15:0),reward<0?'discomfort':relief?'relief':'company');
  // Familiar rituals are useful through individual comfort, not a permanent village buff.
  if(reward>0){actorNeeds(w).social=clamp(actorNeeds(w).social+3+Math.max(0,customFeeling(world,w,kind).value)*5,0,100);if(relief)ensureActorFeelings(w).heartbrokenUntil=e.time+Math.max(0,((actorFeelings(w)?.heartbrokenUntil)-e.time)*.96);}
 }
}
export function rememberCustomLoss(world,lost,cause){
 const e=world.resource('Village');
 if(!e.traditions)return;
 const injury=(actorTraditions(lost)?.injury);
 const lostKind=currentCustom(world,lost)??(injury?.cause===cause&&e.time-injury.at<=30?injury.kind:null);
 for(const w of e.workers){
  if(w===lost||(actorVitality(w)?.dead))continue;
  const close=supportCloseness(e,w,lost)??0,witness=!(actorInterior(w)?.inside)&&distance(w,lost)<9;
  // Close people retain the association even away from the gathering. Strangers
  // only learn from something they witnessed, with a much weaker response.
  if(close<=0&&!witness)continue;
  const kind=lostKind??(witness?currentCustom(world,w):null);if(!kind)continue;
  customExperience(world,w,kind,close>0?.7+Math.min(1,close)*.3:.22,'loss',lost,{shock:true});
  if(kind==='cooking'&&currentCustom(world,w)==='meal')customExperience(world,w,'meal',close>0?.85:.22,'loss',lost,{shock:true});
 }
}
export function noticeCustomEvent(world,event){
 const e=world.resource('Village');
 if(!e.traditions)return;
 const w=e.workers.find(w=>w.id===event.workerId);
 if(event.type==='hurt'&&w&&(actorVitality(w)?.health)>0){const kind=currentCustom(world,w),previous=(actorTraditions(w)?.experiences)?.[kind];if(kind)(ensureActorTraditions(w).injury)={kind,at:e.time,cause:event.cause};if(kind&&!(previous?.reason==='hurt'&&e.time-previous.at<12))customExperience(world,w,kind,Math.min(.45,event.amount/60),'hurt',null,{shock:true});}
 if(event.type==='stew-ready'&&w)e.cooking.lastCookId=w.id;
 if(event.type==='stew-enjoyed'&&w){const cook=e.workers.find(p=>p.id===event.cookId);if(cook&&cook!==w)customExperience(world,cook,'cooking',.55+(CUSTOMS.cooking.bias[(actorPersonality(cook)?.trait)]??0),'cooked',w);}
 if(event.type==='social-finish'&&w){const peer=e.workers.find(p=>p.id===event.partnerId);if(peer){if(event.kind==='argument'){for(const p of [w,peer])customExperience(world,p,'stories',-.6,'discomfort');}else completeCustom(world,event.customKind??(event.kind==='affection'?'quiet':'stories'),[w,peer]);}}
}
export function updateTraditions(world){
 const e=world.resource('Village');
 if(!e.traditions||!e.occasions||e.time<e.traditions.nextAt)return;
 e.traditions.nextAt=e.time+TRADITION_RULES.interval;
 if(occasionSession(e.occasions)||e.occasions.queue.length||e.time<e.occasions.after||e.leadership?.rituals.active||e.stock.food<e.workers.filter(w=>!(actorVitality(w)?.dead)).length)return;
 const choices=[];
 for(const w of e.workers){
  if((personAge(w)?.child)||actorNeeds(w).social>68||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))continue;
  for(const kind of SOCIAL_CUSTOMS){
   const o={kind,hostId:w.id,at:e.time};if(!occasionsAvailable(e.occasions,w,o)||!willingCustom(world,w,kind))continue;
   choices.push({w,kind,weight:Math.max(.05,.45+customPreference(world,w,kind))});
  }
 }
 // Weighted exploration: experience steers choice without freezing everyone
 // into a personality script. Preferences decay when a custom falls out of use.
 for(let attempt=0;attempt<3&&choices.length;attempt++){
  let draw=e.random()*choices.reduce((n,c)=>n+c.weight,0),index=choices.findIndex(c=>(draw-=c.weight)<0);if(index<0)index=choices.length-1;
  const {w,kind}=choices.splice(index,1)[0],key='custom:'+e.traditions.sequence++;
  if(occasionsStart(e.occasions,{kind,key,source:w.id,hostId:w.id,at:e.time,point:{x:w.x,z:w.z}})){e.traditions.nextAt=e.time+65;return;}
 }
}
export function preferredCook(world,w){
 const e=world.resource('Village');
 if(!e.traditions)return true;
 const c=e.cooking,eligible=e.workers.filter(p=>!(personAge(p)?.child)&&!e.leadership?.isLeader(p)&&cookingAvailable(c,p)&&actorNeeds(p).hunger<62&&willingCustom(world,p,'cooking')&&distance(p,cookingPoint(c))<18);
 eligible.sort((a,b)=>customPreference(world,b,'cooking')-customPreference(world,a,'cooking')||distance(a,cookingPoint(c))-distance(b,cookingPoint(c)));
 // Try reachable candidates, so a keen but stranded cook cannot monopolise it.
 return eligible.find(p=>cookingSpot(c,p))===w;
}

export function chooseSocialCustom(world,a,b){
 const e=world.resource('Village');
 if(!e.traditions)return 'stories';
 return ['stories','quiet'].filter(kind=>willingCustom(world,a,kind,b)&&willingCustom(world,b,kind,a)).sort((x,y)=>customPreference(world,a,y)+customPreference(world,b,y)-customPreference(world,a,x)-customPreference(world,b,x))[0]??null;
}
export function validTraditionState(world){
 const e=world.resource('Village');
 if(e.traditions&&(!Number.isFinite(e.traditions.nextAt)||e.traditions.nextAt<0||!Number.isSafeInteger(e.traditions.sequence)||e.traditions.sequence<0))return false;
 return e.workers.every(w=>!(actorTraditions(w)?.experiences)||(Object.getPrototypeOf((actorTraditions(w)?.experiences))===Object.prototype&&Object.entries((actorTraditions(w)?.experiences)).every(([kind,r])=>Object.hasOwn(CUSTOMS,kind)&&r&&Number.isFinite(r.value)&&Math.abs(r.value)<=1&&Number.isFinite(r.evidence)&&r.evidence>=0&&r.evidence<=12&&Number.isFinite(r.at)&&r.at>=0&&Number.isFinite(r.avoidUntil)&&r.avoidUntil>=0&&typeof r.reason==='string'&&(r.otherId===null||Number.isSafeInteger(r.otherId))&&(r.otherName===null||typeof r.otherName==='string'))));
}
