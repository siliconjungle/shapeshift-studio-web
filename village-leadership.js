import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {releaseWork} from "./village-resources.js";
import {ensureActorDailyActivity,actorDailyActivity} from "./ecs/daily-activity-actors.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {faithPerson,faithChange,faithBenefit} from "./village-faith.js";
import {actorFaith} from "./ecs/religion-actors.js";
import {attachmentsHandle} from "./village-attachments.js";
import {occasionsHandle} from "./village-occasions.js";
import {personKinship} from './ecs/person-kinship.js';
import {discoveryHandle} from './village-discovery.js';
import {cookingHandle} from './village-cooking.js';
import {campfireHandle} from './village-campfire.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt,survivalDrop,survivalDamage} from './village-survival.js';
import {lifeRelation,lifeHandle} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {romancePartner,romanceBetray} from './village-romance.js';
import {actorRomance,ensureActorRomance} from './ecs/actor-romance.js';
import {ensureWatchParticipant} from './ecs/watch-participants.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {populationEntities,addPerson,removePerson} from './ecs/population-entities.js';
import {relicPersuasion} from './village-relics.js';
import {defineGameData} from './game-data.js';
import {beginHouseExit,DOORWAY_DURATION} from './doorway-transition.js';
import {handleBeastRite,ritualWorkRate} from './beast-awakening.js';
import {interestedInRomance,romanceInterest} from './village-romance-interest.js';
import {knownPeople} from './village-people.js';
import {chapelHome,startChapelArson,handleChapelArson,cancelChapelArson} from './village-chapel.js';
import {standingRoute} from './village-spacing.js';
import {assignSexuality,mutuallyAttracted} from './village-sexuality.js';
import {canRomance} from './village-romance.js';
import {VillageRituals,RITUAL_RULES} from './village-rituals.js';
import {startLeaderRivalry,updateLeaderRivalry,handleLeaderRivalry,rivalrySide} from './village-leader-rivalry.js';

export const LEADER_RULES=defineGameData('village-leadership.LEADER_RULES',{faith:.82,convictionSeconds:18,successionDelay:45,checkSeconds:2,politicsSeconds:20,minimumTenure:65,sermonSeconds:8,challengeTenure:240,challengeConviction:100,challengeInterval:90,challengeChance:.04});
export const LEADER_TRAITS={
 zealot:{label:'Zealot',description:'Can order fire sacrifices with enough village support.'},
 charismatic:{label:'Charismatic',description:'Can attract several compatible adult partners; neglected villagers may resent them.'},
 steward:{label:'Steward',description:'Organises faster building and uses fewer construction materials.'},
 comforter:{label:'Comforter',description:'Helps the village sleep well and recover from loneliness.'}
};
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled;
const adult=w=>alive(w)&&!(personAge(w)?.child);
const politicalStates=new Set(['revolt-bound','revolt-fighting','exile-bound']);
export function leadershipThought(w,text,time){w.leadershipThoughts=[{text,at:time},...(w.leadershipThoughts??[])].slice(0,5);}

// All offices, votes, grievances and rituals are persistent simulation records.
// The renderer may replace a costume, but cannot create a leader or a death.
export class VillageLeadership{
 constructor(e){
  this.economy=e;this.leaderId=null;this.nextChallenge=0;this.nextCheck=0;this.nextPolitics=0;this.successionAt=0;this.promotions=0;this.history=[];this.exiles=[];populationEntities(e).bind(this,'exiles','Exile');this.exilingId=null;this.revolt=null;this.unrest=0;
  this.rivalry=null;this.rivalryHistory=[];this.rituals=new VillageRituals(e,this);for(const w of e.workers)this.person(w);
 }
 person(w){
  assignSexuality(this.economy,w);w.leaderAmbition??=0;w.leaderResentment??=0;w.leadershipThoughts??=[];
  if(!(personAge(w)?.child))faithPerson(this.economy.faith,w);return w;
 }
 get leader(){return this.economy.workers.find(w=>w.id===this.leaderId&&adult(w))??null;}
 get leaders(){return this.economy.workers.filter(w=>adult(w)&&(w.role==='spiritual-leader'||w.id===this.leaderId));}
 isLeader(w){return !!w&&adult(w)&&(w.role==='spiritual-leader'||w.id===this.leaderId);}
 sideOf(w){return rivalrySide(this,w);}
 supportFor(leader=this.leader){const voters=this.economy.workers.filter(w=>adult(w)&&!this.isLeader(w));return leader&&voters.length?voters.filter(w=>this.rivalry?this.sideOf(w)===leader.id:this.standing(w,leader)>.05).length/voters.length:0;}
 standing(w,leader=this.leader){
  if(!leader||w===leader)return 0;
  const affinity=lifeRelation(this.economy.life,w.id,leader.id)?.affinity??0;
  return clamp(relicPersuasion(this.economy,leader)+affinity*.65+(((actorFaith(w)?.belief)?.value??.5)-.5)*.5-(w.leaderResentment??0)*.75,-1,1);
 }
 get support(){return this.supportFor();}
 benefits(){
  const leader=this.leader;if(!leader||this.rivalry)return {build:1,materials:1,cost:1,harvest:0,sleep:1};
  const strength=clamp(this.support*2-.5),ritual=leader.ritualBlessedUntil>this.economy.time;
  return {build:1+strength*(leader.leaderTrait==='steward'?.35:ritual?.3:.15),materials:leader.leaderTrait==='steward'?1-.25*strength:1,cost:leader.leaderTrait==='steward'?1-.25*strength:1,harvest:strength*(ritual?.55:leader.leaderTrait==='zealot'?.2:.15),sleep:1+strength*(leader.leaderTrait==='comforter'?.5:.1)};
 }
 moodRate(w){const mood=w?.leadershipMood;return (mood?.until>this.economy.time&&mood.kind==='grief'?.75:1)*ritualWorkRate(w,this.economy.time);}
 workRate(w){return this.benefits().build*this.moodRate(w);}
 chooseTrait(w){
  const weighted=(actorPersonality(w)?.trait)==='gentle'||(actorPersonality(w)?.trait)==='thoughtful'?['comforter','steward','charismatic','zealot']:(actorPersonality(w)?.trait)==='outgoing'||(actorPersonality(w)?.trait)==='playful'?['charismatic','charismatic','steward','zealot']:['steward','zealot','comforter','charismatic'];
  return weighted[Math.min(weighted.length-1,Math.floor(this.economy.random()*weighted.length))];
 }
 promote(w,trait=this.chooseTrait(w)){
  const e=this.economy;if(!e.workers.includes(w)||!adult(w)||this.isLeader(w)||(actorInterior(w)?.inside)||w.divineHeld||w.id===this.exilingId||((actorFaith(w)?.belief)?.value??0)<LEADER_RULES.faith||!LEADER_TRAITS[trait])return false;
  survivalInterrupt(e.survival,w);if(w.cargo){survivalDrop(e.survival,w,w.cargo.kind,w.cargo.amount);w.cargo=null;}
  const watch=e.life.watch;if(watch){if(watch.guard===w.id)watch.guard=null;if(watch.relief===w.id)watch.relief=null;}
  ensureWatchParticipant(w).sleepDebt=0;Object.assign(w,{role:'spiritual-leader',leaderTrait:trait,leaderSince:e.time,leaderAmbition:0,leaderResentment:0,leaderSuitorIds:[],leaderNextSermon:e.time+10,leaderCandidateAt:null});
  this.leaderId??=w.id;this.promotions++;this.unrest=0;this.nextPolitics=e.time+LEADER_RULES.minimumTenure;
  leadershipThought(w,'My faith has given me a calling to lead.',e.time);
  e.emit('leader-promoted',w,null,{trait,x:w.x,z:w.z});if(this.leaders.length>1)startLeaderRivalry(this);return true;
 }
 changeResentment(w,amount){w.leaderResentment=clamp((w.leaderResentment??0)+amount);}
 loss(w,cause='death'){
  if(w.id!==this.leaderId&&w.role!=='spiritual-leader')return;
  if(this.rivalry&&!(actorVitality(w)?.dead)&&cause!=='rejuvenated')return;
  const e=this.economy,standing=new Map(e.workers.filter(p=>p!==w&&alive(p)).map(p=>[p.id,this.standing(p,w)])),voters=e.workers.filter(p=>p!==w&&adult(p)),support=voters.length?voters.filter(p=>standing.get(p.id)>.05).length/voters.length:0;
  w.role='former-leader';w.formerLeaderAt=e.time;
  if(this.leaderId===w.id)this.leaderId=null;
  this.leaderId??=this.leaders[0]?.id??null;
  if(!this.leader)this.successionAt=e.time+LEADER_RULES.successionDelay;
  this.history.unshift({id:w.id,name:w.name,trait:w.leaderTrait,from:w.leaderSince,until:e.time,cause,support});this.history=this.history.slice(0,12);
  this.rituals.cancel('leader-gone');this.endRevolt();
  for(const p of e.workers.filter(p=>p!==w&&alive(p))){
   if(cause==='rejuvenated'){if(p.leaderBelovedId===w.id)p.leaderBelovedId=null;leadershipThought(p,`${w.name} is a child again. Someone else must guide us now.`,e.time);continue;}
   const score=standing.get(p.id),aspiring=!(personAge(p)?.child)&&((actorPersonality(p)?.trait)==='outgoing'||(actorPersonality(p)?.trait)==='blunt'||e.random()<.22);
   const kind=this.rivalry?(this.sideOf(p)===w.id?'grief':'relief'):score<-.12?'relief':aspiring&&score>-.05?'ambition':'grief';
   p.leadershipMood={kind,leaderId:w.id,until:e.time+(cause==='exile'?100:180)};
   if(kind==='grief'){actorNeeds(p).social=clamp(actorNeeds(p).social-(score>.2?40:18),0,100);actorNeeds(p).energy=clamp(actorNeeds(p).energy-10,0,100);faithChange(e.faith,p,-(score>.2?.16:.06),'leader-lost');leadershipThought(p,`I miss ${w.name}. The village feels different without them.`,e.time);}
   if(kind==='relief'){actorNeeds(p).social=clamp(actorNeeds(p).social+22,0,100);this.changeResentment(p,-.5);leadershipThought(p,`With ${w.name} gone, I finally feel safe again.`,e.time);}
   if(kind==='ambition'){p.leaderAmbition=clamp(p.leaderAmbition+.4);faithChange(e.faith,p,.07,'a-new-calling');leadershipThought(p,`${w.name} is gone. Perhaps I could lead us next.`,e.time);}
   if(p.leaderBelovedId===w.id){p.leaderBelovedId=null;const r=lifeRelation(e.life,p.id,w.id);if(r?.leaderRomance)r.romanceStatus='ended';}
   e.emit('leader-loss-response',p,null,{kind,leaderId:w.id});
  }
  e.emit('leader-lost',w,null,{cause,support});
  updateLeaderRivalry(this);
 }
 notice(event){
  const e=this.economy,w=knownPeople(e).find(p=>p.id===event.workerId);
  if(['born','grown','villager-arrived','resurrected'].includes(event.type)&&w)this.person(w);
  if(event.type==='resurrected'&&w?.role==='former-leader'){w.role=null;w.leaderCandidateAt=null;}
  if(event.type==='prayer-answered'&&w)faithBenefit(e.faith,w,.55,'prayer-answered');
  if(event.type==='died'||event.type==='outsider-died'){
   if(w&&(w.id===this.leaderId||w.role==='spiritual-leader'))this.loss(w,'death');
   else if(event.cause==='sacrifice'&&w){
    const leader=this.leader;
    for(const p of e.workers.filter(p=>alive(p)&&p!==leader)){
     const close=(personKinship(p)?.parents)?.includes(w.id)||(personKinship(w)?.parents)?.includes(p.id)||(actorRomance(p)?.sweetheartId)===w.id||(lifeRelation(e.life,p.id,w.id)?.affinity??0)>.55;
     const opposed=close||this.standing(p)<.1;
     this.changeResentment(p,opposed?.4:.035);if(opposed&&leader){const r=lifeRelation(e.life,p.id,leader.id);if(r)r.affinity=clamp(r.affinity-.3,-1,1);}
     if(!opposed)faithChange(e.faith,p,.09,'ritual-conviction');
     leadershipThought(p,close?`I cannot forgive what happened to ${w.name}.`:opposed?`I fear what our leader will ask of us next.`:`I believe ${w.name}'s sacrifice mattered.`,e.time);
    }
   }
  }
  if(event.type==='starving'&&w&&this.leader&&!this.isLeader(w))this.changeResentment(w,.1);
 }
 court(a,b,r){
  const e=this.economy,leader=this.isLeader(a)?a:this.isLeader(b)?b:null,peer=leader===a?b:a;
  if(!leader||leader.leaderTrait!=='charismatic'||!canRomance(e,leader,peer)||!mutuallyAttracted(leader,peer))return false;
  if(r.affinity<.45||r.meetings<2)return false;
  if(!this.activePair(leader,peer)&&[leader,peer].some(w=>romanceInterest(w)<.5&&!interestedInRomance(w,r)))return false;
  const old=romancePartner(e.life.romance,peer);
  if(old&&old!==leader){romanceBetray(e.life.romance,peer,leader);this.changeResentment(old,.35);leadershipThought(old,`${peer.name} spends their affection on ${leader.name}; I feel forgotten.`,e.time);}
  leader.leaderSuitorIds??=[];if(leader.leaderSuitorIds.includes(peer.id))return true;
  leader.leaderSuitorIds.push(peer.id);peer.leaderBelovedId=leader.id;ensureActorRomance(peer).sweetheartId=null;
  Object.assign(r,{leaderRomance:true,romanceStatus:'devoted',romanceAfter:e.time+30,affinity:Math.max(.76,r.affinity),attractionAB:.96,attractionBA:.96});
  actorNeeds(peer).social=clamp(actorNeeds(peer).social+18,0,100);e.emit('leader-courtship',leader,null,{partnerId:peer.id});return true;
 }
 activePair(a,b){const leader=this.isLeader(a)?a:this.isLeader(b)?b:null,peer=leader===a?b:leader===b?a:null;return !!peer&&leader.leaderTrait==='charismatic'&&leader.leaderSuitorIds?.includes(peer.id)&&peer.leaderBelovedId===leader.id&&canRomance(this.economy,leader,peer);}
 update(dt,weather){
  if(!(dt>0))return;const e=this.economy;updateLeaderRivalry(this);this.rituals.update(dt,weather);
  if(this.revolt&&(e.time>=this.revolt.deadline||!this.leader||!this.revolt.rebelIds.some(id=>alive(e.workers.find(w=>w.id===id)))))this.endRevolt();
  if(e.time<this.nextCheck)return;this.nextCheck=e.time+LEADER_RULES.checkSeconds;
  for(const w of e.workers){this.person(w);if(!adult(w)||this.isLeader(w))continue;
   if((actorFaith(w)?.belief)?.value>=LEADER_RULES.faith){w.leaderCandidateAt??=e.time;}else w.leaderCandidateAt=null;
   if(w.leadershipMood?.until<=e.time)w.leadershipMood=null;
  }
  if(e.time>=this.successionAt){
   const candidate=e.workers.filter(w=>adult(w)&&!this.isLeader(w)&&w.id!==this.exilingId&&!(actorInterior(w)?.inside)&&!w.divineHeld&&(actorVitality(w)?.health)>35&&actorNeeds(w).hunger<85&&w.leaderCandidateAt!=null&&e.time-w.leaderCandidateAt>=LEADER_RULES.convictionSeconds).sort((a,b)=>((actorFaith(b)?.belief).value+b.leaderAmbition*.15)-((actorFaith(a)?.belief).value+a.leaderAmbition*.15))[0];
   if(candidate){
    if(!this.leader)this.promote(candidate);
    else if(!this.rivalry&&this.leaders.length===1&&e.time>=Math.max(this.nextChallenge??0,this.leader.leaderSince+LEADER_RULES.challengeTenure)){
     this.nextChallenge=e.time+LEADER_RULES.challengeInterval;
     if(e.time-candidate.leaderCandidateAt>=LEADER_RULES.challengeConviction&&(candidate.leaderAmbition>.35||candidate.leaderResentment>.5)&&e.random()<LEADER_RULES.challengeChance)this.promote(candidate);
    }
   }
  }
  const leader=this.leader;if(!leader||this.rivalry||e.time<this.nextPolitics)return;this.nextPolitics=e.time+LEADER_RULES.politicsSeconds;
  for(const w of e.workers.filter(w=>adult(w)&&w!==leader)){
   if(leader.leaderTrait==='charismatic'){
    const relation=lifeRelation(e.life,w.id,leader.id);
    if(canRomance(e,w,leader)&&mutuallyAttracted(w,leader)&&relation){relation.affinity=clamp(relation.affinity+.08,-1,1);relation.attractionAB=Math.max(relation.attractionAB,.8);relation.attractionBA=Math.max(relation.attractionBA,.8);}
    const partner=e.workers.find(p=>p.id===(actorRomance(w)?.sweetheartId)),overlooked=actorNeeds(w).social<30&&!this.activePair(leader,w),jealous=partner?.leaderBelovedId===leader.id;
    if(overlooked||jealous){this.changeResentment(w,.09);leadershipThought(w,`Everyone gathers around ${leader.name}, but I feel left behind.`,e.time);e.emit('leader-overlooked',w);}
   }
   if(this.standing(w)>.1&&actorNeeds(w).hunger<60)this.changeResentment(w,-.025);
  }
  const adults=e.workers.filter(w=>adult(w)&&w!==leader),opponents=adults.filter(w=>this.standing(w)<-.25);
  this.unrest=clamp(this.unrest+(opponents.length?opponents.length/Math.max(1,adults.length)*.24:-.15));
  if(!this.revolt&&e.time-leader.leaderSince>=LEADER_RULES.minimumTenure&&opponents.length&&(this.unrest>.5||opponents.some(w=>w.leaderResentment>.8))&&e.random()<.35)this.startRevolt(opponents);
 }
 startRevolt(rebels,{instigatorId=null}={}){
  const e=this.economy,leader=this.leader;if(!leader||this.rivalry||this.revolt||!rebels.some(adult))return false;
  rebels=rebels.filter(w=>adult(w)&&w!==leader).slice(0,4);
  if(!rebels.length||instigatorId!==null&&!rebels.some(w=>w.id===instigatorId))return false;
  const supporters=e.workers.filter(w=>adult(w)&&w!==leader&&!w.divineHeld&&!w.expeditionId&&!w.rivalJourney&&!rebels.includes(w)&&this.standing(w)>.25).slice(0,2);
  this.rituals.cancel('revolt');
  if(instigatorId===null&&rebels.length>supporters.length&&e.random()<.6){this.exile(leader);return true;}
  this.revolt={leaderId:leader.id,rebelIds:rebels.map(w=>w.id),loyalistIds:[leader.id,...supporters.map(w=>w.id)],startedAt:e.time,deadline:e.time+65,...(instigatorId===null?{}:{instigatorId})};
  for(const w of [...rebels,leader,...supporters]){const door=(actorInterior(w)?.inside)&&((actorInterior(w)?.insideAt)??(actorResidence(w)?.home));survivalInterrupt(e.survival,w);ensureActorInterior(w).inside=false;if(door){w.x=door.x;w.z=door.z;beginHouseExit(w,e.time);}w.state='revolt-bound';w.revoltRepathAt=0;e.emit('leader-revolt',w,null,{leaderId:leader.id});}
  if(instigatorId===null)startChapelArson(e,this.revolt);return true;
 }
 ritualBacklash(r){
  const e=this.economy,leader=this.leader;if(!leader||r.backlashChecked)return false;
  r.backlashChecked=true;const opposition=1-this.support;
  const rebels=e.workers.filter(w=>adult(w)&&w!==leader&&(this.standing(w)<=.05||r.victimIds.some(id=>(personKinship(w)?.parents)?.includes(id)||(personKinship(this.rituals.worker(id))?.parents)?.includes(w.id)||(actorRomance(w)?.sweetheartId)===id)));
  for(const w of rebels){this.changeResentment(w,.2+.3*opposition);leadershipThought(w,'Our leader ordered a sacrifice I oppose.',e.time);}
  this.unrest=clamp(this.unrest+opposition*.35);
  // A rivalry already has armed opposition; its combat continues around the ritual.
  if(rebels.length&&e.random()<RITUAL_RULES.revoltChance*opposition)return this.startRevolt(rebels);
  return false;
 }
 endRevolt(){
  const revolt=this.revolt;if(!revolt)return;cancelChapelArson(this.economy,revolt);this.revolt=null;this.unrest=.1;
  for(const w of this.economy.workers)if(alive(w)&&politicalStates.has(w.state)&&w.state!=='exile-bound'){w.combatTarget=null;w.combatKind=null;releaseWork(this.economy,w);}
 }
 exile(w){
  const e=this.economy;if(!this.isLeader(w)||this.rivalry)return false;
  survivalInterrupt(e.survival,w);this.loss(w,'exile');this.exilingId=w.id;
  w.state='exile-bound';ensureActorInterior(w).inside=false;w.exileStartedAt=e.time;w.exileDeadline=e.time+45;
  w.route=e.route(w,{x:e.depot.x-15,z:e.depot.z+17})??[];leadershipThought(w,'The village has sent me away.',e.time);e.emit('leader-exiled',w);return true;
 }
 combatTarget(w){
  if(!this.revolt)return null;const ids=this.revolt.rebelIds.includes(w.id)?this.revolt.loyalistIds:this.revolt.rebelIds;
  const candidates=this.economy.workers.filter(p=>ids.includes(p.id)&&alive(p)&&!(actorInterior(p)?.inside)&&!p.divineHeld);
  if(this.revolt.instigatorId===w.id)return candidates.find(p=>p.id===this.revolt.leaderId)??null;
  return candidates.sort((a,b)=>distance(w,a)-distance(w,b))[0]??null;
 }
 handleExclusive(w,dt){
  const e=this.economy;
  if(this.rituals.handle(w,dt)||handleBeastRite(e,w,dt))return true;
  if(handleLeaderRivalry(this,w,dt))return true;
  if(w.id===this.exilingId){
   if(!alive(w)){this.exilingId=null;return false;}
   if(!w.route.length||e.move(w,dt)!=='moving'||e.time>=w.exileDeadline){w.exiled=true;w.state='exiled';w.exiledAt=e.time;addPerson(e,w,'Exile');this.exilingId=null;e.emit('villager-exiled',w);ensureActorResidence(w).home=null;w.store=null;removePerson(e,w);}
   return true;
  }
  if(this.revolt&&[...this.revolt.rebelIds,...this.revolt.loyalistIds].includes(w.id)&&alive(w)){
   if(w.divineHeld||(actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION)return true;
   if(handleChapelArson(e,w,dt))return true;
   const target=this.combatTarget(w);if(!target){if(this.revolt.instigatorId!==undefined){w.route=[];return true;}this.endRevolt();return false;}
   w.combatTarget=target.id;w.combatKind='villager';
   if(distance(w,target)<=1.6){
    if(w.state!=='revolt-fighting'){w.state='revolt-fighting';w.route=[];w.clock.reset('fight');}
    w.facing=target.x<w.x?'left':'right';
    for(const event of w.clock.advance(dt)){if(event==='contact'&&alive(target)&&distance(w,target)<1.85){survivalDamage(e.survival,target,12,'revolt',w);e.emit('leader-fight-hit',w,null,{targetId:target.id});}if(event==='finish')w.clock.reset('fight');}
   }else{w.state='revolt-bound';if(e.time>=(w.revoltRepathAt??0)){w.revoltRepathAt=e.time+1;const a=Math.atan2(w.z-target.z,w.x-target.x);w.route=e.route(w,{x:target.x+Math.cos(a)*1.25,z:target.z+Math.sin(a)*1.25})??[];}if(w.route.length)e.move(w,dt);}
   return true;
  }
  return false;
 }
 handleLeader(w,dt){
  if(!this.isLeader(w))return false;const e=this.economy;
  if(((cookingState)=>cookingState==null?undefined:(cookingHandle(cookingState,w,dt)))(e.cooking))return true;
  if(((domainState)=>domainState==null?undefined:(discoveryHandle(domainState,w,dt)))(e.discovery))return true;
  if(w.state.startsWith('occasion-')&&occasionsHandle(e.occasions,w,dt))return true;
  if(w.state==='rest-bound'&&attachmentsHandle(e.attachments,w,dt))return true;
  if(w.state==='meal-to-fire'&&((campfireState)=>campfireState==null?undefined:(campfireHandle(campfireState,w,dt)))(e.campfire))return true;
  if(lifeHandle(e.life,w,dt))return true;
  if(w.state==='leader-bound'){if(e.move(w,dt)!=='moving'){w.state='leader-sermon';ensureActorDailyActivity(w).activityUntil=e.time+LEADER_RULES.sermonSeconds;e.emit('leader-sermon',w);}return true;}
  if(w.state==='leader-sermon'){
   if(e.time>=actorDailyActivity(w)?.activityUntil){
    for(const p of e.workers.filter(p=>alive(p)&&p!==w&&distance(w,p)<7)){
     actorNeeds(p).social=clamp(actorNeeds(p).social+(w.leaderTrait==='comforter'?14:6),0,100);faithChange(e.faith,p,.018,'shared-faith');
     const r=lifeRelation(e.life,w.id,p.id);if(r&&adult(p)){r.meetings++;r.affinity=clamp(r.affinity+.045,-1,1);if(w.leaderTrait==='charismatic')this.court(w,p,r);}
    }
    releaseWork(e,w);w.leaderNextSermon=e.time+25;
   }return true;
  }
  if(w.state!=='idle')releaseWork(e,w);
  if(e.time>=(w.leaderNextSermon??0)&&actorNeeds(w).energy>30&&actorNeeds(w).hunger<70){
   w.leaderNextSermon=e.time+12;const shrine=chapelHome(e)??e.prayers?.shrine??e.faith?.shrine??e.depot,route=standingRoute(e,w,shrine);
   if(route){w.state='leader-bound';w.route=route;w.wait=0;}
  }
  return true;
 }
 snapshot(){return {leaderId:this.leaderId,leaderIds:this.leaders.map(w=>w.id),rivalry:this.rivalry?structuredClone(this.rivalry):null,rivalryHistory:this.rivalryHistory??[],trait:this.leader?.leaderTrait??null,support:this.support,benefits:this.benefits(),promotions:this.promotions,successionAt:this.successionAt,unrest:this.unrest,ritual:this.rituals.active,history:this.history,exiles:this.exiles.map(w=>({id:w.id,name:w.name,at:w.exiledAt}))};}
}
