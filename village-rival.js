import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {lifeClock} from "./ecs/life-state.js";
import {ensureActorDailyActivity,ensureActorSocialActivity} from "./ecs/daily-activity-actors.js";
import {familyBirthPlan,setFamilyBirthPlan} from "./ecs/family-entities.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {handleStoryVisitor} from './village-story-journeys.js';
import {refusesStoryAttack,storyHidden,interruptStory,storyPerson,storyClose} from './village-story-state.js';
import {villageWorld} from './ecs/village-world.js';
import {progressRivalDevelopment} from './ecs/systems/rival-development.js';
import {settlementEconomy,settlementDevelopment,settlementSchedule,settlementDiplomacy,settlementHistory,settlementCouncil} from './ecs/rival-entities.js';
import {bindRivalSettlement,clearRivalSettlementEntities,setRivalVisit,clearRivalVisit,settlementRelicIntent,setSettlementRelicIntent} from './ecs/rival-entities.js';
import {actorRelicTask} from './ecs/actor-curse-relic.js';
import {personKinship} from './ecs/person-kinship.js';
import {actorVitality,ensureActorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt,survivalDrop,survivalAlert,survivalDamage} from './village-survival.js';
import {lifeRelation,lifeAddRelationship,lifeIdle} from './village-life.js';
import {personAge,ensurePersonAge} from './ecs/person-age.js';
import {romanceResolve} from './village-romance.js';
import {actorRomance} from './ecs/actor-romance.js';
import {ensureActorFeelings} from './ecs/actor-feelings.js';
import {memoryMutual,memoryRemember} from './village-memory.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {rivalBeastEntities} from './ecs/beast-entities.js';
import {supportBereave} from './village-support.js';
import {populationEntities,addPerson,transferPerson} from './ecs/population-entities.js';

import {updateRelicPolitics,handleRelicVisitor,bringRelicOnVisit,returnRelicFromVisit,validRelicPolitics} from './village-relic-politics.js';
import {dropRelic,handleRelicTask} from './village-relics.js';
import {curseFumbles} from './village-curse.js';
import {rivalSettlements,rivalPeople,rivalFor,withRival} from './rival-roster.js';
import {diplomacyState,updateDiplomacy,validDiplomacy,civilisationAttitude,civilisationBond,noteDiplomaticIncident} from './village-diplomacy.js';
import {isCulture} from './village-cultures.js';
import {skillLevel} from './village-skills.js';
import {chooseRivalMotive,rivalNeeds,progressRivalNeeds,rivalTradeOffer,noteRivalTrade,returnRivalCargo,validRivalNeeds} from './rival-needs.js';
import {stageRivalCamp,handleRivalCamp} from './village-camps.js';
import {rivalCombatants,joinRivalRaid,progressRivalBeast,updateRivalBeast,isRivalBeast,damageRivalBeast,validRivalBeast} from './rival-beast.js';
import {defineGameData} from './game-data.js';
import {initialiseRomanceInterest,validRomanceInterest} from './village-romance-interest.js';
import {chapterQuiet} from './village-chapters.js';
import {standingRoom} from './village-spacing.js';
import {AGE_RULES,initialiseAge} from './village-age.js';
import {ActionClock} from './action-timing.js';
import {createVillageNamePool} from './village-names.js';
import {knownPeople,nextPersonId} from './village-people.js';
import {newcomerTarget} from './village-newcomer.js';
import {shieldBlocks} from './divine-interventions.js';

export const RIVAL_RULES=defineGameData('village-rival.RIVAL_RULES',{tick:30,firstVisit:90,visitGap:180,visitDuration:45,conversation:5,councilDuration:9,councilDeadline:25,raidDelay:65,raidDuration:50,maxPopulation:12});
const clamp=(n,min=-1,max=1)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const living=e=>e.workers.filter(w=>!(actorVitality(w)?.dead));
const outdoor=w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld;
const available=w=>!w.expeditionId&&outdoor(w)&&!(personAge(w)?.child)&&!w.cargo&&actorNeeds(w).hunger<80&&actorNeeds(w).energy>25&&['idle','outbound'].includes(w.state)&&!w.role;
const active=e=>e.rival?.people.filter(w=>w.visit&&!(actorVitality(w)?.dead)&&!w.gone)??[];
export const rivalThreats=e=>rivalCombatants(e).filter(w=>w.visit&&!(actorVitality(w)?.dead)&&!w.gone).filter(w=>w.visit.kind==='raid'&&!w.divineHeld&&w.ritualId==null&&(w.visit.stage!=='leaving'||e.workers.some(p=>p.rivalJourney?.captured&&p.rivalJourney.escortId===w.id)));
const person=(e,id)=>knownPeople(e).find(w=>w.id===id);
const cue=(e,w,reaction,other=null)=>e.emit('rival-emote',w,null,{reaction,partnerId:other?.id});
export function ensureRivalBond(e,a,b){
 let r=lifeRelation(e.life,a.id,b.id);if(r)return r;
 const child=(personAge(a)?.child)||(personAge(b)?.child);
 r={a:a.id,b:b.id,affinity:-.12+civilisationAttitude(e,rivalFor(e,a)??rivalFor(e,b)??e.rival)*.2,compatibility:e.random()*1.6-.8,attractionAB:child?0:.3+e.random()*.7,attractionBA:child?0:.3+e.random()*.7,meetings:0,...(child?{juvenile:true}:{})};lifeAddRelationship(e.life,r);return r;
}
function makePerson(e){
 const s=e.rival,id=nextPersonId(e),names=createVillageNamePool({culture:s.culture,random:e.random,reserved:knownPeople(e).map(w=>w.name)});
 const w={id,name:names.take(),culture:s.culture,tribeId:s.culture,sex:settlementDevelopment(s).generated%2?'male':'female',sexuality:'straight',combatStyle:e.random()<.35?'bow':'sword',trait:['gentle','outgoing','quiet','playful','blunt','thoughtful'][Math.min(5,Math.floor(e.random()*6))],workPreferences:{food:e.random(),wood:e.random(),stone:e.random()},x:0,z:0,health:100,ageYears:24,dead:false,child:false,parents:[],origin:'rival',state:'away',route:[],clock:new ActionClock('harvest'),phase:0,facing:'front',vx:0,vz:0,wait:1,retries:0,job:null,node:null,cargo:null,needs:{energy:90,hunger:20,social:60},bedtime:21,wakeHour:6,inside:false,partnerId:null,sweetheartId:null,memories:[],careAt:0,socialAfter:0,activityUntil:0};
 settlementDevelopment(s).generated++;addPerson(e,w,'RivalCitizen');initialiseRomanceInterest(w);for(const p of knownPeople(e))if(p!==w)ensureRivalBond(e,p,w);return w;
}
function createSettlement(e,culture){
 const s={culture,people:[],generated:0,stock:{food:18,wood:12,stone:8},prosperity:.55,development:0,capacity:4,reputation:0,grievance:0,nextTick:e.time+30,nextVisit:e.time+RIVAL_RULES.firstVisit+(e.rivals?.length??0)*95,raidAt:null,warUntil:0,council:null,history:[]};
 e.rivals.push(s);bindRivalSettlement(e,s);withRival(e,s,()=>{rivalBeastEntities(e,s);populationEntities(e).bind(s,'people','RivalCitizen');makePerson(e);makePerson(e)});return s;
}
export function ensureRivalCivilisations(e){
 if(!e.rival)return;e.rivals??=[e.rival];
 for(const culture of ['hearth','solis','cryos'])if(culture!==e.culture&&!e.rivals.some(s=>s.culture===culture))createSettlement(e,culture);
 diplomacyState(e);
}
export function createRivalState(e){
 clearRivalSettlementEntities(e);e.rivals=[];const primary=e.culture==='solis'?'hearth':e.culture==='cryos'?'hearth':'solis';e.rival=createSettlement(e,primary);ensureRivalCivilisations(e);return e.rival;
}
function remember(e,kind,w,other=null){const s=e.rival;settlementHistory(s).history.unshift({kind,at:e.time,personId:w.id,otherId:other?.id??null});settlementHistory(s).history.length=Math.min(40,settlementHistory(s).history.length);}
export function rivalIncident(e,delta,kind,w,other=null){const owner=rivalFor(e,w)??rivalFor(e,other)??e.rival;return withRival(e,owner,()=>incident(e,delta,kind,w,other));}
function incident(e,delta,kind,w,other=null){
 const s=e.rival;if(!s)return;settlementDiplomacy(s).reputation=clamp(settlementDiplomacy(s).reputation+delta);settlementDiplomacy(s).grievance=clamp(settlementDiplomacy(s).grievance+Math.max(0,-delta)-(delta>0?delta*.65:0),0,2);remember(e,kind,w,other);noteDiplomaticIncident(e,s,delta,kind);
 // An insult is a small setback. Repeated slights or a killing can provoke a later raid.
 if(settlementDiplomacy(s).grievance>=.45&&settlementDiplomacy(s).raidAt===null)settlementDiplomacy(s).raidAt=e.time+RIVAL_RULES.raidDelay+e.random()*40;
 if(settlementDiplomacy(s).reputation>.2&&settlementDiplomacy(s).grievance<.25)settlementDiplomacy(s).raidAt=null;
}
function entrance(e){
 const gates=e.raids?.entrances??[{x:e.depot.x-10,z:e.depot.z+5},{x:e.depot.x+10,z:e.depot.z+5}];const offset=Math.max(0,rivalSettlements(e).indexOf(e.rival))%gates.length;for(const p of [...gates.slice(offset),...gates.slice(0,offset)])if(e.pathfind(p,e.depot,e.heightAt,e.obstacles()))return {...p};return null;
}
function meetingSpot(e,w,center,radius=1.6,nearStore=false){
 const points=[];for(const r of [radius,radius+.5])for(let i=0;i<12;i++){const angle=(i+w.id%12)*Math.PI/6;points.push({x:center.x+Math.cos(angle)*r,z:center.z+Math.sin(angle)*r});}
 if(nearStore)points.sort((a,b)=>distance(a,e.depot)-distance(b,e.depot));
 for(const p of points){if(!standingRoom(e,w,p))continue;const route=e.route(w,p);if(route)return {point:p,route};}return null;
}
export function startRivalVisit(e,options={}){const owner=rivalFor(e,options.culture)??rivalFor(e,options.visitor)??e.rival;return withRival(e,owner,()=>startVisit(e,options));}
function startVisit(e,{kind='wanderer',visitor=null,motive=null}={}){
 const s=e.rival;if(!s||active(e).length||s.beast?.visit||settlementCouncil(s).council)return [];
 const gate=entrance(e);if(!gate)return [];motive??=kind==='raid'?'grievance':chooseRivalMotive(e);
 const eligible=s.people.filter(w=>!(actorVitality(w)?.dead)&&!w.visit&&!w.captive),pool=visitor?[visitor]:eligible;
 const chosen=kind==='raid'?eligible.slice(0,Math.min(3,Math.max(1,living(e).filter(w=>!(personAge(w)?.child)).length))):[pool[Math.min(pool.length-1,Math.floor(e.random()*pool.length))]].filter(Boolean);
 const result=[];
 for(const [i,w] of chosen.entries()){
  if(!eligible.includes(w))continue;
  const p={x:gate.x+i*.7,z:gate.z},spot=meetingSpot(e,{...w,...p},e.depot);if(!spot)continue;const route=spot.route;
  ensureActorVitality(w).health=Math.max(60,actorVitality(w)?.health);(Object.assign(w,p),Object.assign(w,{gone:false}),Object.assign(ensureActorInterior(w),{inside:false}),Object.assign(w,{state:kind==='raid'?'rival-raiding':'rival-arriving',route}),w);setRivalVisit(e,w,{kind,motive,stage:'arriving',gate,spot:spot.point,until:e.time+(kind==='raid'?RIVAL_RULES.raidDuration:RIVAL_RULES.visitDuration),nextSocial:e.time+3,attackAt:e.time+2,repathAt:0,traded:false});
  bringRelicOnVisit(e,w);for(const p of e.workers)ensureRivalBond(e,p,w);result.push(w);cue(e,w,kind==='raid'?'grumpy':'surprise');
 }
 if(result.length){remember(e,motive,result[0]);stageRivalCamp(e,result,kind,{needed:motive==='shelter'});settlementSchedule(s).nextVisit=e.time+RIVAL_RULES.visitGap+e.random()*50;if(kind==='raid'){settlementDiplomacy(s).warUntil=e.time+180;settlementDiplomacy(s).raidAt=null;settlementDiplomacy(s).grievance=Math.max(0,settlementDiplomacy(s).grievance-.4);remember(e,'raid',result[0]);joinRivalRaid(e,result);}}
 return result;
}
function endMeeting(e,w){
 const v=w.visit;if(!v?.meeting)return;const local=person(e,v.meeting.localId);
 if(local?.state==='rival-meeting')lifeIdle(e.life,local);delete v.meeting;
}
function leave(e,w){endMeeting(e,w);if(!w.visit)return;w.visit.leavingAt??=e.time;w.visit.stage='leaving';w.state='rival-leaving';w.route=[];w.visit.repathAt=0;}
function walk(e,w,target,dt){
 if(distance(w,target)<.65){w.vx=w.vz=0;return true;}
 const v=w.visit??w.rivalJourney;
 if(e.time>=(v.repathAt??0)){w.route=e.route(w,target)??[];v.repathAt=e.time+2;}
 if(w.route.length){const result=e.move(w,dt);if(result==='blocked')w.route=[];return result==='arrived';}return false;
}
export function outsiderWelcome(e,local,visitor){
 const r=ensureRivalBond(e,local,visitor),openness=({gentle:.25,outgoing:.3,playful:.15,thoughtful:.08,quiet:-.17,blunt:-.3})[(actorPersonality(local)?.trait)]??0;
 return clamp(skillLevel(local,'diplomacy')*.035+openness+civilisationAttitude(e,rivalFor(e,visitor)??e.rival)*.45+r.affinity*.55-(actorNeeds(local).hunger>65?.2:0)-((rivalFor(e,visitor)??e.rival).warUntil>e.time?.22:0));
}
export function tradeWithRival(e,w,local){return withRival(e,rivalFor(e,w)??e.rival,()=>trade(e,w,local));}
function trade(e,w,local){
 const s=e.rival;if(w.visit?.traded)return false;
 const offers=[['wood',3,'food',4],['stone',2,'food',4],['food',4,'wood',3],['wood',3,'stone',2],['food',4,'stone',2]];
 const reserve=living(e).length*2+4;
 const offer=rivalTradeOffer(e,offers);
 if(!offer){noteRivalTrade(e,w,false);cue(e,local,'confused',w);return false;} // Poverty is not an insult.
 if(outsiderWelcome(e,local,w)+e.random()*.35<-.12){w.visit.traded=true;noteRivalTrade(e,w,false);rivalIncident(e,-.09,'trade-refused',w,local);memoryMutual(e.life.memory,local,w,'rejected',-.1);cue(e,local,'grumpy',w);cue(e,w,'disappointed');return false;}
 const [pay,n,give,m]=offer;e.stock[pay]-=n;settlementEconomy(s).stock[pay]+=n;settlementEconomy(s).stock[give]-=m;e.stock[give]+=m;w.visit.traded=true;noteRivalTrade(e,w,true);
 e.emit('rival-trade',local,null,{pay,n,give,m,partnerId:w.id});memoryMutual(e.life.memory,local,w,'traded',.1);rivalIncident(e,.09,'trade',w,local);cue(e,local,'delight',w);cue(e,w,'delight');return true;
}
function meet(e,w,dt){
 const v=w.visit;
 if(v.meeting){
  const m=v.meeting,local=e.workers.find(p=>p.id===m.localId);
  if(!local||!outdoor(local)||local.state!=='rival-meeting'||actorNeeds(local).hunger>85||actorNeeds(local).energy<15||rivalThreats(e).length){endMeeting(e,w);return;}
  if(!m.until){if(!local.route.length&&distance(w,local)<2.5){w.route=[];local.facing=w.x<local.x?'left':'right';w.facing=local.x<w.x?'left':'right';m.until=e.time+RIVAL_RULES.conversation;cue(e,local,'thinking',w);cue(e,w,'thinking');}else if(e.time>m.deadline)endMeeting(e,w);return;}
  if(e.time<m.until)return;
  const r=ensureRivalBond(e,local,w),argument=outsiderWelcome(e,local,w)+r.compatibility*.3+e.random()*.25<-.08;
  r.meetings++;r.affinity=clamp(r.affinity+(argument?-.16:.12+Math.max(0,r.compatibility)*.06));memoryMutual(e.life.memory,local,w,argument?'argument':'time-together');
  actorNeeds(local).social=clamp(actorNeeds(local).social+(argument?2:20),0,100);actorNeeds(w).social=clamp(actorNeeds(w).social+15,0,100);
  const romance=romanceResolve(e.life.romance,local,w,r,argument?'argument':'chat');cue(e,local,argument?'grumpy':romance==='accepted'?'love':'humming',w);cue(e,w,argument?'grumpy':romance==='accepted'?'love':'humming');
  if(argument)rivalIncident(e,-.035,'argument',w,local);else rivalIncident(e,.02,'friendship',w,local);
  if(distance(w,e.depot)<3&&distance(local,e.depot)<3)tradeWithRival(e,w,local);
  endMeeting(e,w);v.nextSocial=e.time+8;considerMigration(e,w);return;
 }
 if(e.time<v.nextSocial)return;
 const candidates=e.workers.filter(available).sort((a,b)=>(ensureRivalBond(e,a,w).meetings-ensureRivalBond(e,b,w).meetings)*3+distance(a,e.depot)-distance(b,e.depot)),local=candidates[0];
 v.nextSocial=e.time+3;if(!local)return;
 // Meet beside the shared store, where a trade can actually happen.
 const spot=meetingSpot(e,local,w,1.4,true);if(!spot)return;const route=spot.route;
 survivalInterrupt(e.survival,local);local.state='rival-meeting';local.route=route;
 v.meeting={localId:local.id,until:0,deadline:e.time+25};
}
export function startMembershipCouncil(e,w){return withRival(e,rivalFor(e,w)??e.rival,()=>membershipCouncil(e,w));}
function membershipCouncil(e,w){
 const s=e.rival;if(!w.visit||settlementCouncil(s).council||w.visit.kind==='raid'||!newcomerTarget(e,w,{candidate:w}).valid)return false;
 const voters=living(e).filter(p=>!(personAge(p)?.child)),members=[];if(!voters.length)return false;
 for(const [i,p] of voters.entries()){
  if(!available(p))continue;const spot=meetingSpot(e,p,w);if(!spot)continue;const route=spot.route;
  survivalInterrupt(e.survival,p);p.state='rival-council';p.route=route;members.push({id:p.id,arrived:false});
 }
 if(members.length<=voters.length/2){for(const m of members)lifeIdle(e.life,person(e,m.id));return false;}
 endMeeting(e,w);settlementCouncil(s).council={candidateId:w.id,members,voterIds:voters.map(p=>p.id),deadline:e.time+RIVAL_RULES.councilDeadline,until:null};w.visit.stage='council';w.visit.until=Math.max(w.visit.until,settlementCouncil(s).council.deadline+12);w.state='rival-council';w.route=[];cue(e,w,'thinking');return true;
}
const safeCouncilCandidate=(e,w)=>settlementCouncil(e.rival).council?.candidateId===w.id;
function cancelCouncil(e){const c=settlementCouncil(e.rival).council;if(!c)return;for(const m of c.members){const w=person(e,m.id);if(w?.state==='rival-council')lifeIdle(e.life,w);}const p=person(e,c.candidateId);if(p?.visit){p.visit.stage='visiting';p.state='rival-visiting';p.visit.nextSocial=e.time+10;}settlementCouncil(e.rival).council=null;}
function admitRival(e,w){
 const check=newcomerTarget(e,w,{candidate:w});if(!check.valid||!e.rival.people.includes(w)||(actorVitality(w)?.dead))return false;
 for(const p of e.workers)ensureRivalBond(e,p,w);
 clearRivalVisit(e,w);delete w.captive;delete w.rivalJourney;delete w.gone;
 ((Object.assign(w,{tribeId:e.culture}),Object.assign(ensureActorResidence(w),{home:check.home}),Object.assign(w,{store:e.depot}),Object.assign(ensureActorInterior(w),{inside:false}),Object.assign(w,{joinedAt:e.time,state:'idle',route:[],job:null,node:null,cargo:null,wait:1}),w),Object.assign(ensureActorDailyActivity(w),{careAt:e.time+1}),Object.assign(ensureActorSocialActivity(w),{socialAfter:e.time+5}),w);
 transferPerson(e,w,'RivalCitizen','Resident');rivalIncident(e,.07,'joined',w);e.emit('villager-arrived',w,null,{source:'rival'});cue(e,w,'love');return true;
}
function council(e){
 const c=settlementCouncil(e.rival).council;if(!c)return;const w=person(e,c.candidateId);
 if(!w||!outdoor(w)||!w.visit||rivalThreats(e).length){cancelCouncil(e);return;}
 const ready=c.members.filter(m=>{const p=person(e,m.id);return p&&outdoor(p)&&p.state==='rival-council'&&m.arrived&&distance(p,w)<3;});
 if(!c.until){if(ready.length>c.voterIds.length/2){c.until=e.time+RIVAL_RULES.councilDuration;c.nextSpeakerAt=e.time+2;c.speaker=0;for(const m of ready)cue(e,person(e,m.id),'thinking');}else if(e.time>=c.deadline)cancelCouncil(e);return;}
 if(e.time<c.until){if(e.time>=(c.nextSpeakerAt??Infinity)&&ready.length){const speaker=person(e,ready[(c.speaker??0)%ready.length].id);cue(e,speaker,'thinking');w.facing=speaker.x<w.x?'left':'right';cue(e,w,'humming');c.speaker=(c.speaker??0)+1;c.nextSpeakerAt=e.time+2.2;}return;}
 const votes=ready.filter(m=>{const p=person(e,m.id),r=ensureRivalBond(e,p,w);return r.affinity>-.3&&outsiderWelcome(e,p,w)+r.affinity*.3>.02;});
 const accepted=votes.length>c.voterIds.length/2&&newcomerTarget(e,w,{candidate:w}).valid;
 for(const m of ready)cue(e,person(e,m.id),votes.includes(m)?'love':'grumpy');
 cancelCouncil(e);if(accepted)admitRival(e,w);else{w.visit.membershipAfter=e.time+180;remember(e,'membership-declined',w);cue(e,w,'disappointed');}
}
function localWellbeing(e,w){return clamp((actorNeeds(w).energy+(100-actorNeeds(w).hunger)+actorNeeds(w).social)/300+(e.stock.food>living(e).length*2?.1:-.15)-((actorResidence(w)?.homeless)?.2:0),0,1);}
export function considerMigration(e,w){return withRival(e,rivalFor(e,w)??e.rival,()=>considerMigrationOwned(e,w));}
function considerMigrationOwned(e,w){
 const s=e.rival;if(!w.visit||w.visit.kind==='raid'||w.visit.stage==='leaving')return false;
 if(w.visitorStory?.kind==='prodigal'&&w.visitorStory.kindness>0&&e.workers.some(p=>storyClose(e,p,w))&&startMembershipCouncil(e,w))return true;
 const lover=e.workers.find(p=>(actorRomance(p)?.sweetheartId)===w.id&&!(actorVitality(p)?.dead)&&!(personAge(p)?.child)),locals=living(e),average=locals.reduce((n,p)=>n+ensureRivalBond(e,p,w).affinity,0)/Math.max(1,locals.length),wellbeing=locals.reduce((n,p)=>n+localWellbeing(e,p),0)/Math.max(1,locals.length);
 if((lover||wellbeing>settlementDevelopment(s).prosperity+.18&&average>.2)&&(w.visit.membershipAfter??0)<=e.time&&startMembershipCouncil(e,w))return true;
 const local=lover??locals.find(p=>!(personAge(p)?.child)&&localWellbeing(e,p)<settlementDevelopment(s).prosperity-.25&&ensureRivalBond(e,p,w).affinity>.45);
 if(local&&available(local)&&locals.filter(p=>!(personAge(p)?.child)).length>1&&s.people.filter(p=>!(actorVitality(p)?.dead)).length<settlementDevelopment(s).capacity&&(lover||settlementDiplomacy(s).reputation>-.2)&&localWellbeing(e,local)+.1<settlementDevelopment(s).prosperity){return beginDeparture(e,local,w,false);}
 return false;
}
export function beginDeparture(e,local,escort,captured=false){return withRival(e,rivalFor(e,escort)??e.rival,()=>beginDepartureForSettlement(e,local,escort,captured));}
function beginDepartureForSettlement(e,local,escort,captured=false){
 if(e.rival.people.filter(w=>!(actorVitality(w)?.dead)).length+e.workers.filter(w=>w.rivalJourney).length>=settlementDevelopment(e.rival).capacity)return false;
 if(!outdoor(local)||(personAge(local)?.child)||local.role||!escort?.visit||local.rivalJourney||(familyBirthPlan(e.family))?.parents?.includes(local.id))return false;
 if(captured&&((actorVitality(local)?.health)>30||escort.visit.kind!=='raid'))return false;
 if(!captured&&living(e).filter(w=>!(personAge(w)?.child)).length<2)return false;
 if(!e.route(local,escort.visit.gate))return false;
 survivalInterrupt(e.survival,local);if(local.cargo){survivalDrop(e.survival,local,local.cargo.kind,local.cargo.amount);local.cargo=null;}
 local.rivalJourney={escortId:escort.id,captured,gate:{...escort.visit.gate},until:e.time+35,repathAt:0};local.state=captured?'rival-captive':'rival-leaving';leave(e,escort);escort.visit.until=e.time+40;cue(e,local,captured?'nervous':'love');
 if(captured){rivalIncident(e,-.25,'abduction-started',local,escort);memoryMutual(e.life.memory,local,escort,'abducted',-.65);}return true;
}
function finishDeparture(e,w){
 const j=w.rivalJourney;if(!j)return;const escort=person(e,j.escortId);
 for(const p of living(e).filter(p=>p!==w)){
  const r=ensureRivalBond(e,p,w),close=r.affinity>.28||(actorRomance(p)?.sweetheartId)===w.id||(personKinship(w)?.parents)?.includes(p.id)||(personKinship(p)?.parents)?.includes(w.id);
  if(close){ensureActorFeelings(p).heartbrokenUntil=e.time+60;memoryRemember(e.life.memory,p,w,j.captured?'taken-away':'farewell');cue(e,p,'heartbroken');if(j.captured&&escort){ensureRivalBond(e,p,escort).affinity=clamp(ensureRivalBond(e,p,escort).affinity-.55);memoryRemember(e.life.memory,p,escort,'abducted');}else if((actorRomance(p)?.sweetheartId)!==w.id)r.affinity=clamp(r.affinity+((actorPersonality(p)?.trait)==='gentle'?.02:-.08));}
 }
 survivalInterrupt(e.survival,w);if((familyBirthPlan(e.family))?.parents?.includes(w.id))setFamilyBirthPlan(e.family,null);
 transferPerson(e,w,'Resident','RivalCitizen');delete ensureActorResidence(w).home;delete w.store;delete w.rivalJourney;
 (Object.assign(w,{tribeId:e.rival.culture,state:'away'}),Object.assign(ensureActorInterior(w),{inside:false}),Object.assign(w,{gone:true,route:[],captive:!!j.captured,movedAt:e.time,job:null,node:null,cargo:null}),w);remember(e,j.captured?'abducted':'emigrated',w,escort);
 // Love survives consensual migration. Captivity never creates romance or consent.
}
export function handleRivalResident(e,w,dt){return withRival(e,rivalSettlements(e).find(s=>settlementCouncil(s).council?.voterIds.includes(w.id))??rivalFor(e,rivalPeople(e).find(p=>p.id===w.rivalJourney?.escortId))??e.rival,()=>handleRivalResidentOwned(e,w,dt));}
function handleRivalResidentOwned(e,w,dt){
 if(!e.rival)return false;
 if(w.rivalJourney){
  const j=w.rivalJourney,escort=person(e,j.escortId);
  if((actorVitality(w)?.dead)){delete w.rivalJourney;return false;}
  if(!escort||(actorVitality(escort)?.dead)||escort.divineHeld||!escort.visit||e.time>j.until||w.divineHeld){delete w.rivalJourney;lifeIdle(e.life,w);cue(e,w,'delight');return false;}
  w.state=j.captured?'rival-captive':'rival-leaving';
  if(distance(w,escort)>1.7){walk(e,w,escort,dt);return true;}
  if(walk(e,w,j.gate,dt)&&distance(escort,j.gate)<1.5)finishDeparture(e,w);return true;
 }
 if(w.state==='rival-council'){
  const c=settlementCouncil(e.rival).council,m=c?.members.find(m=>m.id===w.id);if(!m){lifeIdle(e.life,w);return false;}
  if(actorNeeds(w).hunger>85||actorNeeds(w).energy<15){cancelCouncil(e);return false;}
  const candidate=person(e,c.candidateId);if(m.arrived&&candidate)w.facing=candidate.x<w.x?'left':'right';
  if(!m.arrived){const result=w.route.length?e.move(w,dt):'arrived';m.arrived=result==='arrived';if(result==='blocked')cancelCouncil(e);}return true;
 }
 if(w.state==='rival-meeting'){
  const host=active(e).find(p=>p.visit.meeting?.localId===w.id);if(!host){lifeIdle(e.life,w);return false;}
  if(w.route.length&&e.move(w,dt)==='blocked')endMeeting(e,host);return true;
 }
 return false;
}
export function detainRivalForRitual(e,w,ritualId){return withRival(e,rivalFor(e,w)??e.rival,()=>detainRivalForRitualOwned(e,w,ritualId));}
function detainRivalForRitualOwned(e,w,ritualId){
 if(safeCouncilCandidate(e,w))cancelCouncil(e);endMeeting(e,w);survivalInterrupt(e.survival,w);
 Object.assign(w,{ritualId,state:'ritual-captive',route:[],vx:0,vz:0});rivalIncident(e,-.2,'ritual-capture',w,e.leadership.leader);cue(e,w,'nervous');
}
export function releaseRivalFromRitual(e,w){if(w.visit&&!(actorVitality(w)?.dead)){leave(e,w);w.visit.until=e.time+30;}}
export function damageRival(e,w,amount,cause='attack',source=null){return withRival(e,rivalFor(e,w)??e.rival,()=>damageRivalForSettlement(e,w,amount,cause,source));}
function damageRivalForSettlement(e,w,amount,cause='attack',source=null){
 if(cause==='attack'&&source&&refusesStoryAttack(e,source,w))return false;
 if(amount>0&&cause==='attack'&&(w?.storyTask||w?.storyHidden))interruptStory(e,w);
 if(amount>0&&curseFumbles(e,source,cause))return false;
 if(isRivalBeast(e,w))return damageRivalBeast(e,w,amount,cause,source);
 if(!w||(actorVitality(w)?.dead)||!(amount>0)||shieldBlocks(e,w,cause))return false;
 const raid=w.visit?.kind==='raid';ensureActorVitality(w).health=Math.max(0,(actorVitality(w)?.health)-amount);ensureActorVitality(w).lastDamageAt=e.time;if(cause!=='poison'&&(w.rivalHurtCueAt??0)<=e.time){cue(e,w,'dizzy');w.rivalHurtCueAt=e.time+.8;}
 if(source)ensureRivalBond(e,w,source).affinity=clamp(ensureRivalBond(e,w,source).affinity-.3);
 if(cause!=='poison'&&!rivalFor(e,source)&&(!raid||cause==='sacrifice')&&((actorVitality(w)?.health)===0||(w.rivalHarmAfter??0)<=e.time)){rivalIncident(e,(actorVitality(w)?.health)===0?-.7:-.15,cause==='sacrifice'?'outsider-sacrifice':(actorVitality(w)?.health)===0?'visitor-killed':'visitor-hurt',w,source);w.rivalHarmAfter=e.time+8;}
 if((actorVitality(w)?.health)===0){interruptStory(e,w);dropRelic(e,w,'death');returnRivalCargo(e,w,false);if(w.state==='ritual-bound'&&w.ritualPost)w.ritualDeathPost={...w.ritualPost};if(safeCouncilCandidate(e,w))cancelCouncil(e);endMeeting(e,w);(Object.assign(ensureActorVitality(w),{dead:true,diedAt:e.time,deathCause:cause}),Object.assign(w,{state:'dead',route:[],divineHeld:false}));if(e.divine?.held?.id===w.id)e.divine.held=null;remember(e,raid?'raider-killed':'visitor-death',w,source);
  for(const p of knownPeople(e))if(p!==w&&!(actorVitality(p)?.dead)&&((actorRomance(p)?.sweetheartId)===w.id||lifeRelation(e.life,p.id,w.id)?.affinity>.5)){ensureActorFeelings(p).heartbrokenUntil=e.time+60;if(source&&p!==source){ensureRivalBond(e,p,source).affinity=clamp(ensureRivalBond(e,p,source).affinity-.6);memoryRemember(e.life.memory,p,source,'killed-loved-one');}cue(e,p,'heartbroken');}
  if(cause==='sacrifice'){supportBereave(e,w);e.emit('outsider-died',w,null,{cause});}
 }else if(!['poison','sacrifice'].includes(cause)&&w.ritualId==null&&(!raid||(actorVitality(w)?.health)<25))leave(e,w);return true;
}
function raid(e,w,dt){
 const v=w.visit,locals=living(e);for(const p of locals)if(!p.rivalJourney&&distance(w,p)<9)survivalAlert(e.survival,p);
 const targets=locals.filter(p=>outdoor(p)&&!(personAge(p)?.child)&&!p.rivalJourney&&(actorRomance(p)?.sweetheartId)!==w.id&&(actorRomance(w)?.sweetheartId)!==p.id&&!refusesStoryAttack(e,w,p)&&!storyHidden(e,p)&&!((actorPersonality(w)?.trait)==='gentle'&&ensureRivalBond(e,w,p).affinity>.5)).sort((a,b)=>distance(w,a)-distance(w,b)+(ensureRivalBond(e,w,a).affinity-ensureRivalBond(e,w,b).affinity)*2),target=targets[0];
 if(!target){leave(e,w);return;}
 const pursued=v.motive==='pursuing-guest'&&storyPerson(e,e.rival.storyPursuitId);if(pursued&&storyHidden(e,pursued)){if(e.time-w.visit.until>0)leave(e,w);return;}
 w.combatTarget=target.id;w.victimId=target.id;w.combatKind='villager';
 if((actorVitality(target)?.health)<=30&&distance(w,target)<1.8&&e.rival.people.filter(p=>!(actorVitality(p)?.dead)).length<settlementDevelopment(e.rival).capacity&&e.random()<.35&&beginDeparture(e,target,w,true))return;
 if(distance(w,target)>1.5){w.state='rival-raiding';walk(e,w,target,dt);return;}
 w.vx=w.vz=0;w.facing=target.x<w.x?'left':'right';w.state='defending';
 if(e.time>=v.attackAt){v.attackAt=e.time+2.4;w.clock.reset('fight');v.strikeAt=e.time+.75;cue(e,w,'grumpy');}
 w.clock.advance(dt);
 if(v.strikeAt&&e.time>=v.strikeAt){v.strikeAt=null;if(distance(w,target)<1.9&&!target.rivalJourney){survivalDamage(e.survival,target,9,'attack',w);ensureRivalBond(e,target,w).affinity=clamp(ensureRivalBond(e,target,w).affinity-.2);}}
}
function intertribalEncounter(e,w,dt){
 const own=rivalFor(e,w);if(!own||w.visit.stage==='leaving')return false;
 const target=rivalPeople(e).filter(p=>p!==w&&!(actorVitality(p)?.dead)&&!p.divineHeld&&!p.gone&&p.visit&&p.visit.stage!=='leaving'&&rivalFor(e,p)!==own&&!refusesStoryAttack(e,w,p)&&!storyHidden(e,p)&&civilisationBond(e,own.culture,rivalFor(e,p)?.culture)?.warUntil>e.time&&distance(w,p)<9).sort((a,b)=>distance(w,a)-distance(w,b))[0];
 if(!target)return false;endMeeting(e,w);w.combatTarget=target.id;w.combatKind='outsider';w.victimId=target.id;
 if(distance(w,target)>1.6){w.state='rival-raiding';walk(e,w,target,dt);return true;}
 w.state='defending';w.facing=target.x<w.x?'left':'right';w.route=[];w.vx=w.vz=0;
 if(e.time>=w.visit.attackAt){w.visit.attackAt=e.time+2.4;w.clock.reset('fight');w.visit.strikeAt=e.time+.75;cue(e,w,'grumpy');}
 w.clock.advance(dt);if(w.visit.strikeAt&&e.time>=w.visit.strikeAt){w.visit.strikeAt=null;if(distance(w,target)<1.9)damageRival(e,target,9,'attack',w);}return true;
}
function progress(e){return progressRivalDevelopment(villageWorld(e),()=>makePerson(e));}
export function updateRival(e,dt){if(!(dt>0)||!e.rival)return;ensureRivalCivilisations(e);updateDiplomacy(e);updateRelicPolitics(e,startRivalVisit);for(const state of rivalSettlements(e))withRival(e,state,()=>updateSettlement(e,dt));}
function updateSettlement(e,dt){
 const s=e.rival;if(!s||!e.life||dt<=0)return;
 progress(e);
 for(const w of active(e))for(const local of e.workers)ensureRivalBond(e,local,w);
 council(e);
 if(!active(e).length&&lifeClock(e.life).hour>=7&&lifeClock(e.life).hour<18&&living(e).length){
  if(settlementDiplomacy(s).raidAt!==null&&e.time>=settlementDiplomacy(s).raidAt&&!chapterQuiet(e)){startRivalVisit(e,{kind:'raid',motive:settlementDiplomacy(s).raidMotive??'grievance'});settlementDiplomacy(s).raidMotive=null;settlementSchedule(s).nextVisit=e.time+RIVAL_RULES.visitGap;}
  else if(e.time>=settlementSchedule(s).nextVisit&&settlementRelicIntent(s)?.bearerId!=null){const visitor=s.people.find(w=>w.id===settlementRelicIntent(s)?.bearerId&&!actorVitality(w)?.dead&&!w.captive);setSettlementRelicIntent(s,{bearerId:null});startRivalVisit(e,{visitor,motive:'relic-display'});settlementSchedule(s).nextVisit=e.time+RIVAL_RULES.visitGap;}
  else if(e.time>=settlementSchedule(s).nextVisit){settlementSchedule(s).nextVisit=e.time+RIVAL_RULES.visitGap;const motive=chooseRivalMotive(e);if(motive!=='friendship'||e.random()<.72)startRivalVisit(e,{motive});}
 }
 for(const w of s.people){
  const v=w.visit;if(!v)continue;w.vx=w.vz=0;w.phase=(w.phase+dt*.51)%1;
  if((actorVitality(w)?.dead)){if(e.time-(actorVitality(w)?.diedAt)>8){clearRivalVisit(e,w);w.gone=true;}continue;}
  if(w.divineHeld){v.until+=dt;if(v.leavingAt!=null)v.leavingAt+=dt;continue;}
  const ritual=e.leadership?.rituals;if(ritual?.active?.stage!=='embers'&&w.ritualId!=null&&ritual?.active?.id===w.ritualId){v.until+=dt;ritual.handle(w,dt);continue;}
  if(e.time>=v.until&&v.stage!=='leaving'){if(settlementCouncil(s).council?.candidateId===w.id)cancelCouncil(e);leave(e,w);}
  if(v.stage==='leaving'){
   v.leavingAt??=e.time;
   const companion=e.workers.find(p=>p.rivalJourney?.escortId===w.id);
   if(companion&&distance(w,companion)>1.5)continue;
   const arrived=walk(e,w,v.gate,dt);
   if(!companion&&(arrived||e.time-v.leavingAt>65)){
    returnRelicFromVisit(e,w,arrived);returnRivalCargo(e,w,arrived);clearRivalVisit(e,w);w.gone=true;w.state='away';w.route=[];settlementSchedule(s).nextVisit=Math.max(settlementSchedule(s).nextVisit,e.time+RIVAL_RULES.visitGap);
   }
   continue;
  }
  if((actorRelicTask(w)?.task)&&handleRelicTask(e,w,dt))continue;
  if(handleStoryVisitor(e,w,dt,{walk,leave}))continue;
  if(intertribalEncounter(e,w,dt))continue;
  if(handleRivalCamp(e,w,dt))continue;
  if(handleRelicVisitor(e,w,dt,{walk,leave}))continue;
  if(v.motive==='theft'&&v.stage!=='leaving'){
   // A desperate visitor attempts a small theft, then physically takes it home.
   if(walk(e,w,e.depot,dt)){const reserve=living(e).length*2,amount=Math.min(4,Math.max(0,Math.floor(e.stock.food-reserve)));if(amount){e.stock.food-=amount;w.stolenCargo={kind:'food',amount};w.cargo={...w.stolenCargo};remember(e,'stole-food',w);const witness=living(e).find(p=>outdoor(p)&&distance(p,w)<7);if(witness){cue(e,witness,'surprise');ensureRivalBond(e,witness,w).affinity=Math.max(-1,ensureRivalBond(e,witness,w).affinity-.2);}}leave(e,w);}continue;
  }
  if(v.kind==='raid'){raid(e,w,dt);continue;}
  if(v.stage==='arriving'){if(walk(e,w,v.spot??e.depot,dt)){v.stage='visiting';w.state='rival-visiting';w.route=[];}}
  else if(v.stage==='visiting')meet(e,w,dt);
 }
 updateRivalBeast(e,dt);
}
export function validRivalState(e){const states=rivalSettlements(e);if(e.rivals!==undefined&&(!Array.isArray(e.rivals)||states.length>2||!states.includes(e.rival)||new Set(states.map(s=>s.culture)).size!==states.length))return false;if(!validDiplomacy(e)||!validRelicPolitics(e))return false;const ids=[...e.workers,...rivalPeople(e),...(e.leadership?.exiles??[])].map(w=>w.id);return new Set(ids).size===ids.length&&states.every(s=>withRival(e,s,()=>validSettlement(e)));}
function validSettlement(e){
 if(!validRivalBeast(e)||!validRivalNeeds(e.rival))return false;
 const s=e.rival;if(s==null)return true;
 const finite=n=>Number.isFinite(n)&&n>=0,point=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z),unique=a=>new Set(a).size===a.length;
 if((!isCulture(s.culture)||s.culture===e.culture)||!Array.isArray(s.people)||s.people.length>128||!settlementEconomy(s).stock||!['food','wood','stone'].every(k=>finite(settlementEconomy(s).stock[k]))||!Number.isFinite(settlementDiplomacy(s).reputation)||Math.abs(settlementDiplomacy(s).reputation)>1||!finite(settlementDiplomacy(s).grievance)||settlementDiplomacy(s).grievance>2||!finite(settlementSchedule(s).nextTick)||!finite(settlementSchedule(s).nextVisit)||!(settlementDiplomacy(s).raidAt===null||finite(settlementDiplomacy(s).raidAt))||!finite(settlementDevelopment(s).prosperity)||settlementDevelopment(s).prosperity>1||!Number.isSafeInteger(settlementDevelopment(s).capacity)||settlementDevelopment(s).capacity<2||settlementDevelopment(s).capacity>RIVAL_RULES.maxPopulation||!finite(settlementDevelopment(s).generated)||!finite(settlementDevelopment(s).development)||!finite(settlementDiplomacy(s).warUntil)||!Array.isArray(settlementHistory(s).history)||settlementHistory(s).history.length>40)return false;
 const all=[...e.workers,...s.people,...(e.leadership?.exiles??[])];if(!unique(all.map(w=>w.id)))return false;
 for(const w of s.people){
  if(!validRomanceInterest(w))return false;
  if(!Number.isSafeInteger(w.id)||w.id<0||typeof w.name!=='string'||!isCulture(w.culture)||!['female','male'].includes(w.sex)||!['straight','gay','bisexual','asexual'].includes((actorRomance(w)?.sexuality)??'bisexual')||![w.x,w.z,(actorVitality(w)?.health),w.phase,actorNeeds(w)?.hunger,actorNeeds(w)?.energy,actorNeeds(w)?.social].every(Number.isFinite)||(actorVitality(w)?.health)<0||(actorVitality(w)?.health)>100||!Array.isArray(w.route)||!w.route.every(point)||!(w.clock instanceof ActionClock))return false;
  const v=w.visit;if(!v)continue;
  if(!['raid','wanderer'].includes(v.kind)||!['arriving','visiting','council','leaving'].includes(v.stage)||!point(v.gate)||v.spot&&!point(v.spot)||![v.until,v.nextSocial,v.attackAt,v.repathAt].every(finite))return false;
  if(v.meeting&&(!e.workers.some(p=>p.id===v.meeting.localId)||!finite(v.meeting.until)||!finite(v.meeting.deadline)))return false;
 }
 const c=settlementCouncil(s).council;
 if(c&&(!s.people.some(w=>w.id===c.candidateId&&w.visit)||!Array.isArray(c.members)||!Array.isArray(c.voterIds)||!unique(c.voterIds)||!unique(c.members.map(m=>m.id))||!finite(c.deadline)||!(c.until===null||finite(c.until))||c.members.some(m=>!c.voterIds.includes(m.id)||!e.workers.some(w=>w.id===m.id))))return false;
 for(const w of e.workers){const j=w.rivalJourney;if(j&&(!rivalPeople(e).some(p=>p.id===j.escortId&&p.visit)||typeof j.captured!=='boolean'||!point(j.gate)||!finite(j.until)||!finite(j.repathAt)))return false;}
 return settlementHistory(s).history.every(h=>typeof h.kind==='string'&&finite(h.at)&&Number.isSafeInteger(h.personId));
}
