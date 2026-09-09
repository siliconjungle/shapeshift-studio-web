import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {releaseWork} from "./village-resources.js";
import {lifeClock} from "./ecs/life-state.js";
import {actorSleep} from "./ecs/daily-activity-actors.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {actorFaith} from "./ecs/religion-actors.js";
import {beastsLiving} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalDrop,survivalInterrupt} from './village-survival.js';
import {lifeRelation} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {watchAssigned} from './village-watch.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {defineGameData} from './game-data.js';
import {standingRoute} from './village-spacing.js';
import {isBedtime} from './village-time.js';
import {ageWorkRate} from './village-age.js';
import {clearBeastRiteSite,findBeastRiteSite} from './beast-rite-site.js';

export const AWAKENING_RULES=defineGameData('beast-awakening.AWAKENING_RULES',Object.freeze({
 steward:[{name:'Stone foundation',wood:0,stone:6,hits:6},{name:'Timber skeleton',wood:12,stone:6,hits:8},{name:'Carved body',wood:12,stone:6,hits:10}],
 rounds:3,food:6,tendingSeconds:8,pledgeSeconds:8,ceremonySeconds:10,comforterRecovery:90,pledgeRecovery:120,
}));
export const AWAKENING_NAMES={steward:'Beast effigy',comforter:'Little spirit',charismatic:'Circle of pledges'};
const kinds=Object.keys(AWAKENING_NAMES),alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled,clamp=n=>Math.max(0,Math.min(1,n));
const assigning=new WeakSet();
const siteChecks=new WeakMap();
export const currentBeastRite=e=>e.beasts?.rites?.[e.leadership?.leader?.leaderTrait]??null;
export const ritualEnergyCeiling=(w,time)=>w.ritualFatigueUntil>time?(w.ritualEnergyCeiling??100):100;
export const ritualWorkRate=(w,time)=>w.ritualFatigueUntil>time?(w.ritualWorkMultiplier??1):1;
const person=(e,id)=>e.workers.find(w=>w.id===id);
const available=(e,w)=>alive(w)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.cargo&&!w.beastRiteCargo&&!watchAssigned(e.life.watch,w)&&w.state==='idle'&&actorNeeds(w).hunger<62&&actorNeeds(w).energy>=60&&!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour);
function remember(e,w,text){w.leadershipThoughts=[{text,at:e.time},...(w.leadershipThoughts??[])].slice(0,5);}
function fatigue(e,w,kind){
 const comforter=kind==='comforter';actorNeeds(w).energy=Math.max(0,actorNeeds(w).energy-(comforter?45:40));
 w.ritualFatigueUntil=e.time+(comforter?AWAKENING_RULES.comforterRecovery:AWAKENING_RULES.pledgeRecovery);
 w.ritualEnergyCeiling=comforter?65:75;w.ritualWorkMultiplier=comforter?.75:.65;
 remember(e,w,comforter?'I gave my strength to help the little spirit grow.':'I willingly pledged my strength to awaken our beast.');
}
function release(e,r){
 for(const w of e.workers.filter(w=>w.beastRiteKind===r.kind)){
  if(w.beastRiteCargo){survivalDrop(e.survival,w,w.beastRiteCargo.kind,w.beastRiteCargo.amount);delete w.beastRiteCargo;}
  delete w.beastRiteKind;delete w.beastRiteRole;if(w.state.startsWith('awakening-'))releaseWork(e,w);
 }
 r.actorId=null;r.partnerId=null;r.members=[];r.actionProgress=0;
}
export function interruptBeastRite(e,w){
 if(assigning.has(e)||!w.beastRiteKind)return;
 const r=e.beasts?.rites?.[w.beastRiteKind];if(!r)return;
 release(e,r);r.nextAt=e.time+5;if(r.phase==='ceremony')r.phase='preparing';
}
function assign(e,r,w,role,point){
 const route=standingRoute(e,w,point);if(!route)return false;
 assigning.add(e);try{survivalInterrupt(e.survival,w);}finally{assigning.delete(e);}
 (Object.assign(w,{beastRiteKind:r.kind,beastRiteRole:role,state:'awakening-bound',route,wait:0}),Object.assign(ensureActorInterior(w),{inside:false}),w);return true;
}
function approach(r,index=0){const a=Math.PI*.75+index*1.3;return {x:r.x+Math.cos(a)*2,z:r.z+Math.sin(a)*2};}
export function startBeastRite(e){
 const leader=e.leadership?.leader,kind=leader?.leaderTrait;if(!e.beasts||beastsLiving(e.beasts)||!kinds.includes(kind))return null;
 e.beasts.rites??={};if(e.beasts.rites[kind])return e.beasts.rites[kind];
 const point=findBeastRiteSite(e);if(!point){e.beasts.awakeningAt=e.time+10;return null;}
 const r={kind,leaderId:leader.id,...point,createdAt:e.time,phase:'preparing',stage:0,hits:0,delivered:{wood:0,stone:0,food:0},actorId:null,partnerId:null,members:[],actionProgress:0,nextAt:e.time,contributions:[],requests:[],lastGiftAt:null};
 e.beasts.rites[kind]=r;e.emit('awakening-started',leader,null,{kind});return r;
}
export function repairBeastRiteSites(e,{force=false}={}){
 const rites=e.beasts?.rites;if(!rites||beastsLiving(e.beasts))return;
 const checked=siteChecks.get(e);if(!force&&checked?.rites===rites&&checked.nextAt>e.time)return;
 siteChecks.set(e,{rites,nextAt:e.time+5});
 for(const r of Object.values(rites)){
  if(!r.siteBlocked&&clearBeastRiteSite(e,r,r.kind))continue;
  const point=findBeastRiteSite(e,r.kind);
  release(e,r);if(r.phase==='ceremony')r.phase='preparing';
  if(point){Object.assign(r,point);delete r.siteBlocked;}
  else r.siteBlocked=true;
 }
}
export function pledgeChance(e,leader,w){
 const affinity=lifeRelation(e.life,w.id,leader.id)?.affinity??0;
 const trait={gentle:.15,thoughtful:.05,outgoing:.12,playful:.05,blunt:-.15}[(actorPersonality(w)?.trait)]??0;
 return Math.max(.03,Math.min(.95,.15+((actorFaith(w)?.belief)?.value??.5)*.45+affinity*.4+trait-(w.leaderResentment??0)*.3));
}
function startPledge(e,r,leader){
 const candidates=e.workers.filter(w=>w!==leader&&available(e,w)&&!e.leadership.isLeader(w)&&!(w.ritualFatigueUntil>e.time)&&!(r.requests.find(q=>q.id===w.id)?.after>e.time));
 candidates.sort((a,b)=>pledgeChance(e,leader,b)-pledgeChance(e,leader,a));
 const w=candidates[0];if(!w)return false;
 if(!standingRoute(e,leader,approach(r))||!standingRoute(e,w,approach(r,1)))return false;
 let request=r.requests.find(q=>q.id===w.id);if(!request){request={id:w.id,count:0,after:0};r.requests.push(request);}
 request.count++;request.after=e.time+60;
 if(e.random()>=pledgeChance(e,leader,w)){
  e.leadership.changeResentment(w,request.count>1?.12:.035);
  const bond=lifeRelation(e.life,w.id,leader.id);if(bond&&request.count>1)bond.affinity=Math.max(-1,bond.affinity-.1);
  remember(e,w,request.count>1?'Our leader keeps asking for strength I do not want to give.':'I refused to pledge my strength to the summoning.');
  e.emit('awakening-refused',w,null,{leaderId:leader.id});r.nextAt=e.time+20;return false;
 }
 if(!assign(e,r,leader,'pledge',approach(r))||!assign(e,r,w,'pledge',approach(r,1))){release(e,r);return false;}
 r.actorId=leader.id;r.partnerId=w.id;r.actionProgress=0;e.emit('awakening-pledged',w,null,{leaderId:leader.id});return true;
}
function startCeremony(e,r,leader){
 if(!assign(e,r,leader,'ceremony',approach(r)))return false;
 r.actorId=leader.id;r.members=[leader.id];
 for(const w of e.workers.filter(w=>w!==leader&&available(e,w)&&e.leadership.standing(w)>.05).slice(0,3))if(assign(e,r,w,'ceremony',approach(r,r.members.length)))r.members.push(w.id);
 r.phase='ceremony';r.actionProgress=0;e.emit('awakening-chant',leader,null,{kind:r.kind});return true;
}
export function updateBeastRites(e,dt){
 if(!e.beasts||!(dt>0))return;const leader=e.leadership?.leader;
 repairBeastRiteSites(e);
 for(const r of Object.values(e.beasts.rites??{})){
  if(beastsLiving(e.beasts)||!leader||r.kind!==leader.leaderTrait||r.leaderId!==leader.id||e.leadership.revolt||e.leadership.rivalry){if(r.actorId!==null)release(e,r);if(r.phase==='ceremony')r.phase='preparing';}
 }
 if(beastsLiving(e.beasts)||!leader||!kinds.includes(leader.leaderTrait)||e.leadership.revolt||e.leadership.rivalry)return;
 e.beasts.awakeningAt??=90;if(e.time<e.beasts.awakeningAt)return;
 const r=currentBeastRite(e)??startBeastRite(e);if(!r||r.siteBlocked)return;r.leaderId=leader.id;
 if(r.phase==='ready')return;
 // Ceremonies advance only while everyone who committed is present and safe.
 if(r.actorId!==null){
  const ids=r.phase==='ceremony'?r.members:[r.actorId,...(r.partnerId!==null?[r.partnerId]:[])];
  if(ids.some(id=>{const w=person(e,id);return !alive(w)||w.divineHeld||w.beastRiteKind!==r.kind;})){release(e,r);if(r.phase==='ceremony')r.phase='preparing';return;}
  const ready=ids.every(id=>['awakening-tending','awakening-pledging','awakening-chanting'].includes(person(e,id).state));
  if(!ready)return;r.actionProgress+=dt;
  const duration=r.phase==='ceremony'?AWAKENING_RULES.ceremonySeconds:r.kind==='comforter'?AWAKENING_RULES.tendingSeconds:AWAKENING_RULES.pledgeSeconds;
  if(r.actionProgress<duration)return;
  if(r.phase==='ceremony'){r.phase='ready';release(e,r);return;}
  if(r.kind==='comforter'){r.delivered.food=0;fatigue(e,leader,'comforter');r.nextAt=e.time+AWAKENING_RULES.comforterRecovery;}
  else if(r.kind==='charismatic'){const donor=person(e,r.partnerId);fatigue(e,donor,'charismatic');r.contributions.push({id:donor.id,at:e.time});r.nextAt=e.time+20;}
  else return;
  r.stage++;r.lastGiftAt=e.time;e.emit('awakening-grown',leader,null,{kind:r.kind,stage:r.stage});release(e,r);
 }
}
export function handleBeastRite(e,w,dt){
 const r=currentBeastRite(e);if(!r||r.siteBlocked||beastsLiving(e.beasts)||r.leaderId!==e.leadership.leaderId||e.leadership.revolt||e.leadership.rivalry)return false;
 if(w.beastRiteKind===r.kind){
  if(!alive(w)||w.divineHeld||actorNeeds(w).hunger>=85||actorNeeds(w).energy<20||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)){interruptBeastRite(e,w);return false;}
  if(w.state==='awakening-building'){
   for(const event of w.clock.advance(dt*ageWorkRate(w)*e.leadership.workRate(w))){
    if(event==='contact'){r.hits++;e.emit('awakening-build-hit',w,null,{kind:r.kind});}
    if(event==='finish'){if(r.hits<AWAKENING_RULES.steward[r.stage].hits)w.clock.reset('work');else{r.stage++;r.hits=0;r.delivered.wood=r.delivered.stone=0;r.lastGiftAt=e.time;e.emit('awakening-grown',w,null,{kind:r.kind,stage:r.stage});release(e,r);}}
   }return true;
  }
  if(w.state!=='awakening-bound')return true;
  const status=e.move(w,dt);if(status==='moving')return true;if(status==='blocked'){interruptBeastRite(e,w);return true;}
  if(w.beastRiteRole==='fetch'){
   const stage=AWAKENING_RULES.steward[r.stage],kind=r.kind==='comforter'?'food':['stone','wood'].find(k=>r.delivered[k]<stage[k]);
   const amount=r.kind==='comforter'?AWAKENING_RULES.food:Math.min(3,stage[kind]-r.delivered[kind]);
   if(e.stock[kind]<amount){interruptBeastRite(e,w);return true;}
   const route=standingRoute(e,w,approach(r));if(!route){interruptBeastRite(e,w);return true;}
   e.stock[kind]-=amount;w.beastRiteCargo={kind,amount};w.beastRiteRole='deliver';w.route=route;e.emit('awakening-supplies',w,null,{kind,amount});return true;
  }
  if(w.beastRiteRole==='deliver'){const c=w.beastRiteCargo;r.delivered[c.kind]+=c.amount;delete w.beastRiteCargo;release(e,r);return true;}
  w.state=w.beastRiteRole==='build'?'awakening-building':w.beastRiteRole==='tend'?'awakening-tending':w.beastRiteRole==='pledge'?'awakening-pledging':'awakening-chanting';w.facing=r.x<w.x?'left':'right';w.clock.reset('work');return true;
 }
 if(r.actorId!==null||r.phase==='ready'||e.time<r.nextAt||!available(e,w))return false;
 const leader=e.leadership.leader;
 if(r.stage>=AWAKENING_RULES.rounds)return w===leader&&startCeremony(e,r,w);
 if(r.kind==='charismatic')return w===leader&&startPledge(e,r,w);
 if(r.kind==='comforter'){
  if(w!==leader||w.ritualFatigueUntil>e.time)return false;
  if(r.delivered.food<AWAKENING_RULES.food&&e.stock.food<AWAKENING_RULES.food)return false;
 }else if(w!==leader&&(e.leadership.isLeader(w)||e.leadership.standing(w)<=.05))return false;
 const stage=AWAKENING_RULES.steward[r.stage],supplied=r.kind==='comforter'?r.delivered.food>=AWAKENING_RULES.food:['wood','stone'].every(k=>r.delivered[k]>=stage[k]);
 if(!supplied&&r.kind==='steward'&&!['wood','stone'].some(k=>r.delivered[k]<stage[k]&&e.stock[k]>=Math.min(3,stage[k]-r.delivered[k])))return false;
 const role=supplied?(r.kind==='steward'?'build':'tend'):'fetch';
 if(assign(e,r,w,role,role==='fetch'?e.depot:approach(r))){r.actorId=w.id;return true;}return false;
}
export function completeBeastRite(e){for(const r of Object.values(e.beasts?.rites??{}))release(e,r);e.beasts.rites={};e.beasts.awakeningAt=e.time+90;}
export function validBeastRites(e){
 const rites=e.beasts?.rites;if(rites===undefined)return true;if(!rites||Object.getPrototypeOf(rites)!==Object.prototype)return false;
 if(Object.values(rites).some(r=>r?.siteBlocked!==undefined&&typeof r.siteBlocked!=='boolean'))return false;
 const id=n=>Number.isSafeInteger(n)&&n>=0;
 return Object.entries(rites).every(([kind,r])=>kinds.includes(kind)&&r.kind===kind&&id(r.leaderId)&&['preparing','ceremony','ready'].includes(r.phase)&&[r.x,r.z,r.createdAt,r.nextAt,r.actionProgress].every(Number.isFinite)&&r.actionProgress>=0&&Number.isInteger(r.stage)&&r.stage>=0&&r.stage<=3&&(r.phase==='preparing'||r.stage===3)&&Number.isInteger(r.hits)&&r.hits>=0&&['wood','stone','food'].every(k=>Number.isFinite(r.delivered?.[k])&&r.delivered[k]>=0)&&Array.isArray(r.members)&&r.members.every(id)&&Array.isArray(r.contributions)&&r.contributions.length<=3&&r.contributions.every(c=>id(c.id)&&Number.isFinite(c.at))&&Array.isArray(r.requests)&&r.requests.every(q=>id(q.id)&&Number.isInteger(q.count)&&q.count>0&&Number.isFinite(q.after))&&(r.actorId===null||e.workers.some(w=>w.id===r.actorId))&&(r.partnerId===null||e.workers.some(w=>w.id===r.partnerId)));
}
