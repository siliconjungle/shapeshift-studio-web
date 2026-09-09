import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {structuralCondition} from './ecs/home-entities.js';
import {lifeSocialVenues} from "./ecs/life-state.js";
import {faithChange} from "./village-faith.js";
import {occasionSession} from "./ecs/community-entities.js";
import {occasionsAvailable,occasionsStart,occasionsCancel} from "./village-occasions.js";
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {rivalPeople,rivalFor,rivalSettlements} from './rival-roster.js';
import {defineGameData} from './game-data.js';
import {awardBelief} from './god-belief.js';
import {SOCIAL_CUSTOMS,customPreference} from './village-traditions.js';
import {unsafeHome,homeFire} from './village-shelter.js';
import {temperatureOf} from './village-temperature.js';

// A background director: observes ordinary play, never issues objectives or
// creates a disaster to advance a prescribed story.
export const CHAPTER_RULES=defineGameData('village-chapters.CHAPTER_RULES',Object.freeze({opening:60,recovery:18,quiet:150,grief:60,meetingInterval:130,evidenceWindow:900,hardship:18,recoveryGrace:90,retry:90}));
export const CHAPTERS=defineGameData('village-chapters.CHAPTERS',Object.freeze([
 {id:'hearth',title:'A place at the fire',belief:35},
 {id:'season',title:'Weathered together',belief:55},
 {id:'sanctuary',title:'A place to return to',belief:80}
]));
const living=e=>e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.exiled&&!w.rivalJourney);
const safe=e=>!(e.raids?.alarmUntil>e.time)&&![...(e.raids?.enemies??[]),...(e.slimes?.enemies??[]),...rivalPeople(e).filter(w=>w.visit?.kind==='raid'&&w.visit.stage!=='leaving')].some(r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&!['departing','fleeing','fading'].includes(r.state))&&!(e.wishes?.burns??[]).some(b=>b.until>e.time)&&!(e.shelter?.fires??[]).some(f=>f.until>e.time)&&!e.leadership?.rituals.active;
function freshState(e){return {version:2,index:null,phase:'watching',phaseAt:e.time,quietUntil:e.time+CHAPTER_RULES.opening,stableSince:null,nextCheck:0,lastLossAt:null,meals:[],hardship:{seconds:0,lastAt:null,causes:[]},observedAt:e.time,completed:[],celebration:null,sequence:0,nextReflection:0};}
function legacyState(e){const old=e.chapters,finite=n=>Number.isFinite(n)&&n>=0;
 if(old.version!==1||!Number.isInteger(old.index)||old.index<0||old.index>2||!['preparing','sharing','season','building','recovering','celebrating','quiet','settled'].includes(old.phase)||!['phaseAt','quietUntil','nextCheck','meals','sequence','nextReflection'].every(k=>finite(old[k]))||!(old.lastLossAt===null||finite(old.lastLossAt))||!Array.isArray(old.diners)||!old.diners.every(Number.isSafeInteger))return null;
 return {...freshState(e),completed:old.completed,sequence:old.sequence,lastLossAt:old.lastLossAt,quietUntil:Math.max(e.time+CHAPTER_RULES.opening,old.quietUntil)};
}
export function chapterState(e){if(e.chapters?.version===1){const migrated=legacyState(e);if(!migrated||!validChapters({chapters:migrated}))throw Error('Invalid legacy village rhythm');e.chapters=migrated;}return e.chapters??=freshState(e);}
export const chapterReward=(e,id)=>e.chapters?.completed.some(c=>c.id===id)??false;
export function chapterQuiet(e){const c=e.chapters;return !!c&&(e.time<c.quietUntil||['recovering','celebrating'].includes(c.phase)&&e.time-c.phaseAt<CHAPTER_RULES.recoveryGrace);}
function sanctuary(e){return e.life?.homes.find(h=>h.kind==='chapel'&&!unsafeHome(e,h)&&!homeFire(e,h)&&(structuralCondition(h)?.health)>=(structuralCondition(h)?.maxHealth)*.9);}
function sheltered(e){return living(e).every(w=>!(actorResidence(w)?.homeless)&&(actorResidence(w)?.hasBed)!==false&&!unsafeHome(e,(actorResidence(w)?.home)));}
function crisis(e){return living(e).some(w=>(actorVitality(w)?.health)<30||actorNeeds(w).hunger>=90||actorNeeds(w).energy<8||temperatureOf(w)<8||temperatureOf(w)>94);}
function well(e){const people=living(e),ready=people.filter(w=>(actorVitality(w)?.health)>=55&&actorNeeds(w).hunger<75&&actorNeeds(w).energy>=25&&temperatureOf(w)>12&&temperatureOf(w)<86);return people.length>=2&&safe(e)&&!crisis(e)&&ready.length>=Math.max(2,Math.ceil(people.length*.6))&&e.stock.food>=people.length&&sheltered(e);}
function transition(e,phase){const c=e.chapters;c.phase=phase;c.phaseAt=e.time;c.stableSince=null;c.nextCheck=0;}
function observe(e){const c=e.chapters,dt=Math.min(1,Math.max(0,e.time-c.observedAt));c.observedAt=e.time;
 c.meals=c.meals.filter(m=>e.time-m.at<CHAPTER_RULES.evidenceWindow&&living(e).some(w=>w.id===m.id));
 const causes=[];if(!safe(e))causes.push('danger');
 if(living(e).some(w=>temperatureOf(w)<12||temperatureOf(w)>86))causes.push('temperature');
 if(living(e).some(w=>actorNeeds(w).hunger>=90))causes.push('hunger');
 if(causes.length){if(c.hardship.lastAt!==null&&e.time-c.hardship.lastAt>30&&c.hardship.seconds<CHAPTER_RULES.hardship)c.hardship.seconds=0;c.hardship.seconds+=dt;c.hardship.lastAt=e.time;for(const cause of causes)if(!c.hardship.causes.includes(cause))c.hardship.causes.push(cause);}
}
function candidate(e){const c=e.chapters;
 // Recovery from a real shared difficulty takes precedence over infrastructure.
 if(c.hardship.seconds>=CHAPTER_RULES.hardship&&!chapterReward(e,'season'))return 1;
 if(!chapterReward(e,'hearth')&&e.campfire?.built&&e.cooking?.placed&&c.meals.length>=4&&new Set(c.meals.map(m=>m.id)).size>=2)return 0;
 if(!chapterReward(e,'sanctuary')&&e.leadership?.leader&&sanctuary(e))return 2;
 if(c.hardship.seconds>=CHAPTER_RULES.hardship)return 1;
 return null;
}
function finish(e,workerIds){const c=e.chapters,chapter=CHAPTERS[c.index];if(!chapter)return;
 const first=!chapterReward(e,chapter.id);
 if(first)c.completed.push({id:chapter.id,at:e.time,workerIds:[...workerIds],names:workerIds.map(id=>e.workers.find(w=>w.id===id)?.name??'A villager')});
 if(c.index===1)c.hardship={seconds:0,lastAt:null,causes:[]};
 c.celebration=null;c.index=null;c.quietUntil=e.time+CHAPTER_RULES.quiet;c.nextReflection=c.quietUntil+CHAPTER_RULES.meetingInterval;transition(e,'quiet');
 // Repeat recoveries still get a real gathering and respite, without stacking
 // permanent bonuses or becoming an unlimited Belief reward exploit.
 if(first){e.emit('chapter-completed',null,null,{chapter:chapter.id,title:chapter.title});awardBelief(e,chapter.belief,'chapter');}
}
export function noticeChapterEvent(e,event){const c=e.chapters;if(!c)return;
 if(event.type==='stew-enjoyed'){
  if(!chapterReward(e,'hearth')){c.meals.push({id:event.workerId,at:e.time});c.meals=c.meals.slice(-24);}
  if(chapterReward(e,'hearth')){const w=e.workers.find(w=>w.id===event.workerId);if(w&&!(actorVitality(w)?.dead)){actorNeeds(w).energy=Math.min(100,actorNeeds(w).energy+4);actorNeeds(w).social=Math.min(100,actorNeeds(w).social+5);}}
 }
 if(event.type==='died'){c.lastLossAt=e.time;c.hardship.seconds=Math.max(c.hardship.seconds,CHAPTER_RULES.hardship);c.hardship.lastAt=e.time;if(!c.hardship.causes.includes('loss'))c.hardship.causes.push('loss');if(['recovering','celebrating'].includes(c.phase))abandon(e);}
 if(event.type==='occasion-finished'&&event.occasionId===c.celebration&&c.phase==='celebrating'&&event.workerIds?.length>=2)finish(e,event.workerIds);
 if(event.type==='occasion-finished'&&event.occasionId?.startsWith('sanctuary-reflection:')&&chapterReward(e,'sanctuary'))for(const id of event.workerIds??[]){const w=e.workers.find(w=>w.id===id);if(w&&!(actorVitality(w)?.dead))faithChange(e.faith,w,.025,'sanctuary-reflection');}
}
function gathering(e,{reflection=false}={}){
 const c=e.chapters,o=e.occasions;if(!o||occasionSession(o)||o.queue.some(q=>q.kind==='memorial')||e.time<o.after||!safe(e))return false;
 const h=sanctuary(e),fire=e.campfire,hot=(e.temperature??22)>26||living(e).some(w=>temperatureOf(w)>65);
 const alternatives=[...(lifeSocialVenues(e.life)?.spots??[]),e.faith?.shrine,e.depot,...(e.life?.homes??[]).filter(h=>!unsafeHome(e,h))].filter(Boolean);
 const preferred=(reflection||c.index===2)&&h?[{x:h.x,z:h.z}]:fire?.built&&!hot?[{x:fire.x,z:fire.z}]:[];
 // In heat, gather away from the lit fire. Try other familiar places when a
 // preferred site is obstructed; all attendance still requires real routes.
 const centers=[...preferred,...alternatives.filter(p=>!hot||!fire?.lit||Math.hypot(p.x-fire.x,p.z-fire.z)>5.6)];
 const mourning=c.hardship.causes.includes('loss');
 const choices=living(e).flatMap(w=>(reflection||mourning?['quiet']:SOCIAL_CUSTOMS).map(kind=>({w,kind,score:living(e).reduce((sum,p)=>sum+customPreference(e,p,kind),0)}))).sort((a,b)=>b.score-a.score);
 for(const center of centers)for(const {w,kind}of choices){const key=(reflection?'sanctuary-reflection:':'chapter-celebration:')+c.sequence;
  const occasion={key,kind,source:w.id,hostId:w.id,at:e.time,point:center,chapterGathering:true};
  if(temperatureOf(w)<12||temperatureOf(w)>86||!occasionsAvailable(o,w,occasion)||!occasionsStart(o,occasion))continue;c.sequence++;if(!reflection)c.celebration=key;return true;
 }return false;
}
function abandon(e){const c=e.chapters;if(c.celebration&&occasionSession(e.occasions)?.occasion.key===c.celebration)occasionsCancel(e.occasions);c.celebration=null;c.index=null;transition(e,'watching');c.nextCheck=e.time+CHAPTER_RULES.retry;}
export function updateChapters(e){const c=e.chapters;if(!c)return;observe(e);
 if(c.phase==='quiet'&&e.time>=c.quietUntil)transition(e,'watching');
 if(['recovering','celebrating'].includes(c.phase)){
  const mourning=c.lastLossAt!==null&&e.time-c.lastLossAt<CHAPTER_RULES.grief;
  if(!safe(e)||crisis(e)||mourning||candidate(e)!==c.index){abandon(e);return;}
  if(e.time-c.phaseAt>CHAPTER_RULES.recoveryGrace){abandon(e);return;}
  if(c.phase==='recovering'){
   if(!well(e)){c.stableSince=null;return;}c.stableSince??=e.time;
   if(e.time-c.stableSince>=CHAPTER_RULES.recovery)transition(e,'celebrating');return;
  }
  if(occasionSession(e.occasions)?.occasion.key===c.celebration)return;
  c.celebration=null;if(e.time>=c.nextCheck){c.nextCheck=e.time+5;gathering(e);}return;
 }
 if(e.time<c.quietUntil||e.time<c.nextCheck)return;
 c.nextCheck=e.time+5;
 if(!well(e)||c.lastLossAt!==null&&e.time-c.lastLossAt<CHAPTER_RULES.grief)return;
 const next=candidate(e);if(next!==null){c.index=next;transition(e,'recovering');return;}
 if(chapterReward(e,'sanctuary')&&sanctuary(e)&&e.time>=c.nextReflection){c.nextReflection=e.time+CHAPTER_RULES.meetingInterval;gathering(e,{reflection:true});}
}
export function validChapters(e){const c=e.chapters;if(!c)return true;if(c.version===1){const migrated=legacyState(e);return !!migrated&&validChapters({chapters:migrated});}const finite=v=>Number.isFinite(v)&&v>=0,ids=a=>Array.isArray(a)&&a.every(Number.isSafeInteger);
 return c.version===2&&(c.index===null||Number.isInteger(c.index)&&c.index>=0&&c.index<3)&&['watching','recovering','celebrating','quiet'].includes(c.phase)&&(['recovering','celebrating'].includes(c.phase)?c.index!==null:c.index===null)&&['phaseAt','quietUntil','nextCheck','sequence','nextReflection','observedAt'].every(k=>finite(c[k]))&&(c.stableSince===null||finite(c.stableSince))&&(c.lastLossAt===null||finite(c.lastLossAt))&&(c.celebration===null||typeof c.celebration==='string')&&Array.isArray(c.meals)&&c.meals.length<=24&&c.meals.every(m=>Number.isSafeInteger(m.id)&&finite(m.at))&&c.hardship&&finite(c.hardship.seconds)&&(c.hardship.lastAt===null||finite(c.hardship.lastAt))&&Array.isArray(c.hardship.causes)&&c.hardship.causes.every(t=>['danger','temperature','hunger','loss'].includes(t))&&Array.isArray(c.completed)&&c.completed.length<=3&&new Set(c.completed.map(r=>r.id)).size===c.completed.length&&c.completed.every(r=>CHAPTERS.some(d=>d.id===r.id)&&finite(r.at)&&ids(r.workerIds)&&(r.names===undefined||Array.isArray(r.names)&&r.names.length===r.workerIds.length&&r.names.every(n=>typeof n==='string'&&n.length<=100)));
}
