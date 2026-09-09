import {homeCapacity} from './ecs/home-entities.js';
import {homeAvailability} from './ecs/home-entities.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {constructionProgress} from './ecs/housing-state.js';
import {ensureConstructionProgress} from './ecs/housing-state.js';
import {housingAccounting} from './ecs/housing-state.js';
import {actorConstructionTask,ensureActorConstructionTask} from './ecs/actor-construction-task.js';
import {releaseWork} from "./village-resources.js";
import {depleteResource} from "./village-resources.js";
import {resourceGrowth,resourceHarvest} from "./ecs/resource-state.js";
import {lifeClock,lifeMealAccounting} from "./ecs/life-state.js";
import {ensureActorDailyActivity,actorSleep,actorSocialActivity} from "./ecs/daily-activity-actors.js";
import {actorExpeditionTemperament} from "./ecs/personality-actors.js";
import {actorOccasion} from "./ecs/actor-occasion.js";
import {housingRouteTo} from './village-housing.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {supportCloseness} from './village-support.js';
import {survivalInterrupt,survivalDrop} from './village-survival.js';
import {memoryMutual} from './village-memory.js';
import {lifeIdle} from './village-life.js';
import {rivalPeople,rivalFor,rivalSettlements} from './rival-roster.js';
import {rememberPlace} from './village-place-history.js';
import {skillRate,resourceSkill} from './village-skills.js';
import {EXPEDITION_RULES as R,expeditionState,expeditionDistance as distance,expeditionResources,observeExpeditionPlaces,chooseExpedition,rememberJourneyPlace,leavesCareAtHome} from './expedition-planning.js';
import {placeCamp,finishCamp} from './village-camps.js';
import {CAMP_STAGES,CAMP_RULES,campProjects} from './camp-rules.js';
import {validHouseSite,houseEntrance} from './village-housing.js';
import {homeFire,unsafeHome} from './village-shelter.js';
import {standingRoute,standingRoom} from './village-spacing.js';
import {beginHouseExit,DOORWAY_DURATION} from './doorway-transition.js';
import {isBedtime,DAY_LENGTH_SECONDS} from './village-time.js';
import {temperatureOf} from './village-temperature.js';
import {visibleAt,exploredAt} from './village-exploration.js';
import {RESOURCE_RULES} from './village-economy.js';
import {isForage,forageRules} from './village-foraging.js';
import {ageWorkRate} from './village-age.js';

const clamp=n=>Math.max(0,Math.min(100,n));
const memberWorker=(e,m)=>[...e.workers,...(e.leadership?.exiles??[]),...rivalPeople(e)].find(w=>w.id===m.id);
const members=(e,t)=>t.members.map(m=>({m,w:memberWorker(e,m)})).filter(p=>!p.m.detached&&p.w&&!(actorVitality(p.w)?.dead)&&!p.w.exiled&&e.workers.includes(p.w));
const camp=(e,t)=>campProjects(e).find(p=>p.id===t.campId);
const packingStates=new Set(['returning','homecoming','finished']);
const combatStates=new Set(['defending','defense-bound','alerted','fleeing','sheltering','escort-bound','escorting']);
function cue(e,w,reaction,reason){if((w.expeditionCueAt??0)>e.time)return;w.expeditionCueAt=e.time+9;e.emit('expedition-cue',w,null,{reaction,reason});}
function enterPhase(e,w,m,phase){m.phase=phase;m.routeTo=null;m.retryAt=0;m.since=e.time;w.spacingRoute=null;releaseWork(e,w);w.wait=0;}
function exitTent(e,w){if((actorInterior(w)?.inside)){ensureActorInterior(w).inside=false;beginHouseExit(w,e.time);}if(w.state==='sleeping')w.state='idle';}
function clearJob(e,w){const p=e.housing?.projects.find(p=>p.id===(actorConstructionTask(w)?.projectId));if((constructionProgress(p)?.reservedBy)===w.id)ensureConstructionProgress(p).reservedBy=null;ensureActorConstructionTask(w).projectId=null;releaseWork(e,w);}
function siteFor(e,place){
 const angle=e.random()*Math.PI*2;
 for(const r of [5,7.5,10])for(let i=0;i<12;i++){
  const a=angle+i*Math.PI/6,p={kind:'camp',x:place.x+Math.cos(a)*r,z:place.z+Math.sin(a)*r};
  if(!exploredAt(e,p.x,p.z)||!validHouseSite(e,p)||e.workers.some(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&distance(w,p)<2.6))continue;
  if(e.route(e.depot,houseEntrance(p,e.heightAt,e.culture)))return p;
 }return null;
}
export function startExpedition(e,plan){
 if(!plan||!e.life||!e.housing||expeditionState(e).active||!leavesCareAtHome(e,plan.party)||campProjects(e).filter(p=>p.owner==='local'&&!['packed','destroyed'].includes((constructionProgress(p)?.state))).length>=CAMP_RULES.maxCamps)return null;
 const site=siteFor(e,plan.place);if(!site)return null;
 const spots=[];for(const [index,w] of plan.party.entries()){const route=standingRoute(e,w,{x:site.x+(index-1)*1.6,z:site.z+3.7}),spot=route?.at(-1);if(!spot||spots.some(p=>distance(p,spot)<1.15))return null;spots.push({x:spot.x,z:spot.z});}
 const s=e.expeditions,t={id:'expedition-'+s.nextId++,stage:'preparing',placeId:plan.place.id,place:{x:plan.place.x,z:plan.place.z,kind:plan.place.kind},site,spots,createdAt:e.time,deadline:e.time+90,departedAt:null,campId:null,reason:null,waitWeatherSince:null,lossIds:[],greetedIds:[],goalPerPerson:e.random()<.4?6:R.load,staySeconds:45+e.random()*90,packOnReturn:e.random()<.65,members:plan.party.map((w,i)=>({id:w.id,phase:'fetch',homeId:(actorResidence(w)?.home)?.id??null,since:e.time,routeTo:null,retryAt:0,prepared:false,arrived:false,done:false,food:0,wood:0,mealUntil:null,mealPaid:false,mealReturn:null,delivered:{food:0,wood:0,stone:0},index:i}))};
 s.active=t;s.nextDeparture=e.time+DAY_LENGTH_SECONDS*(2+e.random()*2);
 for(const {m,w} of members(e,t)){((e.survival)==null?undefined:(survivalInterrupt(e.survival,w)));w.expeditionId=t.id;w.expeditionPack={food:0,wood:0};w.wait=0;w.state='outbound';cue(e,w,m.index?'determined':'thinking','preparing');}
 e.emit('expedition-started',plan.party[0],null,{expeditionId:t.id,memberIds:t.members.map(m=>m.id),placeId:t.placeId});return t;
}
function finish(e,t){
 const s=e.expeditions,p=camp(e,t);
 rememberPlace(e,t.site,t.lossIds.length?'danger':'camp',t.members.map(m=>m.id));
 if(p){p.expeditionId=null;homeAvailability(p.home).expeditionId=null;if(!['packed','destroyed'].includes((constructionProgress(p)?.state))){p.abandonedAt=e.time;p.expiresAt=Math.max(e.time+60,p.expiresAt??e.time+120);}}
 const place=s.places.find(p=>p.id===t.placeId);if(place){place.visits++;place.lastVisitedAt=e.time;if(t.reason&&t.reason!=='full-load')place.avoidUntil=e.time+(t.lossIds.length?DAY_LENGTH_SECONDS*3:45);}
 s.history.unshift({id:t.id,placeId:t.placeId,departedAt:t.departedAt,returnedAt:e.time,outcome:t.reason??'gathered',lossIds:[...t.lossIds],members:t.members.map(m=>({id:m.id,delivered:{...m.delivered}})),campId:t.campId});s.history=s.history.slice(0,R.historyLimit);
 for(const {w}of members(e,t)){delete w.expeditionId;delete w.expeditionPack;w.expeditionAfter=e.time+60+e.random()*100;ensureActorDailyActivity(w).careAt=e.time;}
 t.stage='finished';s.active=null;
}
export function turnExpeditionHome(e,t,reason){
 if(!t||packingStates.has(t.stage))return;
 t.stage='returning';t.reason=reason;t.deadline=e.time+150;
 for(const {m,w}of members(e,t)){
  if(w.divineHeld||w.ritualId!=null)continue;
  clearJob(e,w);exitTent(e,w);const originalHome=e.life.homes.find(h=>h.id===m.homeId&&!unsafeHome(e,h));if(originalHome)ensureActorResidence(w).home=originalHome;enterPhase(e,w,m,'return');if(['danger','rival-camp','injury','loss'].includes(reason))w.expeditionRetreatUntil=e.time+90;m.arrived=false;cue(e,w,t.lossIds.length?'heartbroken':['danger','rival-camp','injury'].includes(reason)?'nervous':'rest',reason);
 }
}
function threatAt(e,w){
 const enemies=[...(e.raids?.enemies??[]),...(e.slimes?.enemies??[]),...rivalPeople(e).filter(p=>p.visit?.kind==='raid'&&p.visit.stage!=='leaving')];
 return enemies.find(p=>!(actorVitality(p)?.dead)&&!p.gone&&!p.divineHeld&&!['fading','departing','fleeing'].includes(p.state)&&distance(w,p)<11);
}
export function updateExpeditions(e,dt,weather={}){
 if(!e.life||!e.housing||!e.exploration)return;
 const s=expeditionState(e);let t=s.active;
 if(e.time>=s.nextCheck){s.nextCheck=e.time+R.check;observeExpeditionPlaces(e);if(!t&&e.time>=s.nextDeparture){s.nextDeparture=e.time+30+e.random()*50;if((weather.rain??0)<.45&&e.random()<.65)t=startExpedition(e,chooseExpedition(e));}}
 if(!t)return;
 for(const m of t.members){
  const w=memberWorker(e,m);if(!w){m.done=true;turnExpeditionHome(e,t,'separated');continue;}
  if((w.exiled||!e.workers.includes(w)||w.rivalJourney||w.divineHeld||w.ritualId!=null)&&w.expeditionId===t.id){for(const kind of ['food','wood'])if(w.expeditionPack?.[kind])((e.survival)==null?undefined:(survivalDrop(e.survival,w,kind,w.expeditionPack[kind])));delete w.expeditionPack;delete w.expeditionId;m.done=true;m.detached=true;turnExpeditionHome(e,t,'separated');continue;}
  if((actorVitality(w)?.dead)&&!t.lossIds.includes(w.id)){
   t.lossIds.push(w.id);for(const kind of ['food','wood'])if(w.expeditionPack?.[kind])((e.survival)==null?undefined:(survivalDrop(e.survival,w,kind,w.expeditionPack[kind])));delete w.expeditionPack;delete w.expeditionId;m.done=true;
   for(const {w:peer}of members(e,t)){rememberJourneyPlace(e,peer,w,{fear:1,lostId:w.id,outcome:'lost-companion'});cue(e,peer,'heartbroken','lost-companion');}
   turnExpeditionHome(e,t,'loss');
  }
 }
 const live=members(e,t),p=camp(e,t);
 if(!live.length){finish(e,t);return;}
 if(!packingStates.has(t.stage)){
  const injured=live.find(({w})=>(actorVitality(w)?.health)<52),missing=live.find(({w})=>w.divineHeld||w.ritualId!=null||w.rivalJourney||w.exiled||e.leadership?.isLeader(w));
  const threat=live.find(({w})=>threatAt(e,w));
  const rival=campProjects(e).find(p=>p.owner==='rival'&&!['packed','destroyed'].includes((constructionProgress(p)?.state))&&live.some(({w})=>distance(w,p)<14&&visibleAt(e,p.x,p.z)));
  if(rival){rival.seenAt??=e.time;for(const {w}of live)rememberJourneyPlace(e,w,rival,{fear:.6,outcome:'rival-camp'});turnExpeditionHome(e,t,'rival-camp');}
  else if(injured||missing||threat||p&&unsafeHome(e,p.home))turnExpeditionHome(e,t,injured?'injury':missing?'separated':'danger');
  else if(!leavesCareAtHome(e,live.map(p=>p.w))||e.workers.some(w=>!(actorVitality(w)?.dead)&&!w.expeditionId&&actorNeeds(w).hunger>90)&&e.stock.food<1)turnExpeditionHome(e,t,'needed-home');
  else if(e.time>t.deadline)turnExpeditionHome(e,t,'late');
  else if(t.stage==='preparing'&&(!leavesCareAtHome(e,live.map(p=>p.w))||live.some(({w})=>actorNeeds(w).hunger>70)))turnExpeditionHome(e,t,'needed-home');
 }
 if(t.stage==='preparing'&&live.every(({m})=>m.prepared&&m.arrived)){
  t.stage='travelling';t.departedAt=e.time;t.deadline=e.time+210;
  for(const {m,w}of live){enterPhase(e,w,m,'travel');m.arrived=false;cue(e,w,'determined','leaving');}
  for(let i=0;i<live.length;i++)for(let j=i+1;j<live.length;j++)memoryMutual(e.life.memory,live[i].w,live[j].w,'went-together',.04);
 }
 if(t.stage==='travelling'&&live.every(({m})=>m.arrived)){
  const builder=live.find(({w})=>w.expeditionPack?.wood>=R.wood);
  const project=builder&&placeCamp(e,t.site,{party:live.map(p=>p.w),supplies:builder.w.expeditionPack,expeditionId:t.id});
  if(!project){turnExpeditionHome(e,t,'no-campsite');return;}
  t.campId=project.id;t.stage='building';project.expeditionId=t.id;homeAvailability(project.home).expeditionId=t.id;t.deadline=e.time+180;
  for(const {m,w}of live){enterPhase(e,w,m,m.id===builder.w.id?'build':'camp-idle');}
 }
 if(t.stage==='working'){
  const rain=e.wishes?.rainUntil>e.time?1:weather.rain??0;
  if(rain>.6){t.waitWeatherSince??=e.time;if(e.time-t.waitWeatherSince>30+t.staySeconds*.35)turnExpeditionHome(e,t,'weather');}
  else t.waitWeatherSince=null;
  if(live.some(({w})=>actorNeeds(w).hunger>75&&!(w.expeditionPack?.food>0)))turnExpeditionHome(e,t,'supplies-low');
  else if(live.some(({w})=>temperatureOf(w)<12||temperatureOf(w)>88))turnExpeditionHome(e,t,'weather');
  else if(e.time>=t.workUntil&&live.some(({w})=>!isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))&&(live.every(({w})=>(w.cargo?.amount??0)>=t.goalPerPerson)||!expeditionResources(e,t.place).length)){
   const builder=live.find(({w})=>!(actorInterior(w)?.inside)&&!combatStates.has(w.state));
   if(t.packOnReturn&&p&&!p.damaged&&!homeFire(e,p.home)&&builder){
    t.stage='packing';p.packing=true;ensureConstructionProgress(p).state='building';ensureConstructionProgress(p).stage=2;ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).delivered=2;t.deadline=e.time+70;
    for(const {m,w}of live){exitTent(e,w);clearJob(e,w);enterPhase(e,w,m,w===builder.w?'pack':'camp-idle');}
   }else turnExpeditionHome(e,t,'full-load');
  }
 }
 if(t.stage==='returning'&&live.every(({m})=>m.done&&!m.mealPaid)){t.stage='homecoming';t.homecomingUntil=e.time+24;for(const {m,w}of live){delete w.expeditionPack;w.expeditionAfter=e.time+90;w.state='resting';ensureActorDailyActivity(w).activityUntil=e.time+18;w.wait=0;m.phase='home';}greet(e,t,live);}
 if(t.stage==='homecoming'&&e.time>=t.homecomingUntil)finish(e,t);
}
function greet(e,t,live){
 for(const {w} of live){
  rememberJourneyPlace(e,w,t.place,{fear:t.lossIds.length?.8:t.reason==='injury'?.4:0,outcome:t.reason??'gathered'});
  cue(e,w,t.lossIds.length?'disappointed':'delight','homecoming');
  const loved=e.workers.filter(p=>p!==w&&!(actorVitality(p)?.dead)&&!(actorInterior(p)?.inside)&&!p.expeditionId&&!t.members.some(m=>m.id===p.id)&&!t.greetedIds.includes(p.id)&&!p.cargo&&actorSocialActivity(p)?.partnerId==null&&(actorOccasion(p)?.id)==null&&['idle','outbound','resting'].includes(p.state)&&distance(p,w)<18&&(supportCloseness(e,w,p)??0)>0).sort((a,b)=>(supportCloseness(e,w,b)-supportCloseness(e,w,a)))[0];
  if(loved){
   const route=standingRoute(e,loved,w);if(route){survivalInterrupt(e.survival,loved);loved.route=route;loved.state='expedition-greeting';loved.journeyGreeting={workerId:w.id,tripId:t.id,until:e.time+16};t.greetedIds.push(loved.id);}
  }
 }
}
function walk(e,w,m,point,dt,state='outbound',{group=null}={}){
 const key=`${point.x.toFixed(2)}:${point.z.toFixed(2)}`;
 if(m.routeTo!==key){m.routeTo=key;m.retryAt=0;w.route=[];m.walkSince=e.time;}
 if(distance(w,point)<.3&&!w.route.length)return 'arrived';
 if(group&&members(e,group).some(({m:peer,w:p})=>p!==w&&!peer.arrived&&!peer.done&&!p.divineHeld&&distance(w,p)>7&&distance(p,point)>distance(w,point)+2)){w.vx=w.vz=0;w.state='waiting-friend';return 'moving';}
 if(!w.route.length){if(e.time<m.retryAt)return 'moving';m.retryAt=e.time+2;const route=e.route(w,point);if(!route)return 'blocked';w.route=route;}
 w.state=state;const result=e.move(w,dt);if(result==='blocked'){w.route=[];return e.time-m.walkSince>12?'blocked':'moving';}return result;
}
function campSpot(p,m,t){return t.spots[m.index];}
function meal(e,w,m,resume){
 if(!(w.expeditionPack.food>0))return false;
 w.expeditionPack.food--;m.food++;m.mealUntil=e.time+4;m.mealReturn=resume;m.mealPaid=true;w.state='eating';ensureActorDailyActivity(w).activityUntil=m.mealUntil;w.route=[];m.routeTo=null;cue(e,w,'humming','camp-meal');return true;
}
function campRest(e,w,m,t,dt){
 const p=camp(e,t);if(!p||unsafeHome(e,p.home)){turnExpeditionHome(e,t,'shelter-lost');return;}
 const spot=campSpot(p,m,t),night=isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour),weather=t.waitWeatherSince!==null;
 if((actorInterior(w)?.inside)){
  w.state='sleeping';if(actorNeeds(w).hunger<70&&(night||weather||actorNeeds(w).energy<75))return;
  exitTent(e,w);m.routeTo=null;return;
 }
 const sleepers=e.workers.filter(pw=>pw!==w&&!(actorVitality(pw)?.dead)&&(actorInterior(pw)?.inside)&&(actorInterior(pw)?.insideAt)===p.home).length;
 if((constructionProgress(p)?.state)==='complete'&&actorNeeds(w).hunger<60&&(night||weather||actorNeeds(w).energy<42)&&sleepers<CAMP_RULES.beds){
  const result=walk(e,w,m,p.home,dt,'homebound');if(result==='arrived'){ensureActorInterior(w).inside=true;ensureActorInterior(w).insideAt=p.home;ensureActorInterior(w).enteredAt=e.time;w.state='sleeping';w.route=[];cue(e,w,'sleepy','camp-sleep');}else if(result==='blocked')turnExpeditionHome(e,t,'blocked');return;
 }
 const status=walk(e,w,m,spot,dt);if(status==='blocked'){turnExpeditionHome(e,t,'blocked');return;}if(status!=='arrived')return;
 w.state='resting';ensureActorDailyActivity(w).activityUntil=e.time+4;
 if(actorNeeds(w).hunger>42&&meal(e,w,m,'camp-idle'))return;
 if((m.socialAt??0)<=e.time){m.socialAt=e.time+18+e.random()*14;const peer=members(e,t).find(({w:p})=>p!==w&&!(actorInterior(p)?.inside)&&distance(w,p)<4);if(peer){memoryMutual(e.life.memory,w,peer.w,'time-together',.015);actorNeeds(w).social=clamp(actorNeeds(w).social+8);cue(e,w,t.lossIds.length?'disappointed':'humming','camp-company');}}
 if(t.stage==='working'&&!weather&&!night&&actorNeeds(w).energy>60&&(w.cargo?.amount??0)<t.goalPerPerson){enterPhase(e,w,m,'gather');}
}
function build(e,w,m,t,dt,packing=false){
 const p=camp(e,t);if(!p||unsafeHome(e,p.home)){turnExpeditionHome(e,t,'shelter-lost');return;}
 if(!m.buildPoint){const route=housingRouteTo(e.housing,w,p);if(!route?.length){turnExpeditionHome(e,t,'blocked');return;}m.buildPoint={...route.at(-1)};}
 const point=m.buildPoint;
 if(w.state!=='house-building'){
  const status=walk(e,w,m,point,dt,'house-bound');if(status==='blocked'){turnExpeditionHome(e,t,'blocked');return;}if(status!=='arrived')return;
  w.state='house-building';ensureActorConstructionTask(w).projectId=p.id;ensureConstructionProgress(p).reservedBy=w.id;w.clock.reset('work');w.facing=p.x<w.x?'left':'right';ensureConstructionProgress(p).state='building';
 }
 for(const event of w.clock.advance(dt*skillRate(w,'building')*ageWorkRate(w))){
  if(event==='contact'){ensureConstructionProgress(p).strikes++;ensureConstructionProgress(p).lastHitAt=e.time;e.emit('house-hit',w,null,{houseId:p.id,stage:CAMP_STAGES[(constructionProgress(p)?.stage)].id});}
  if(event!=='finish')continue;
  if((constructionProgress(p)?.strikes)<2){w.clock.reset('work');continue;}
  if(packing){
   ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).stage--;
   if((constructionProgress(p)?.stage)>=0){w.clock.reset('work');continue;}
   ensureConstructionProgress(p).stage=0;ensureConstructionProgress(p).state='packed';p.packedAt=e.time;homeCapacity(p.home).beds=0;homeAvailability(p.home).retired=true;structuralCondition(p.home).destroyed=true;structuralCondition(p.home).destroyedAt=e.time;ensureConstructionProgress(p).reservedBy=null;
   const refund=!p.damaged&&!p.refunded?(constructionProgress(p)?.spent).wood:0;p.refunded=true;w.expeditionPack.wood+=refund;e.emit('camp-packed',w,null,{houseId:p.id,refund});turnExpeditionHome(e,t,'full-load');break;
  }
  const amount=CAMP_STAGES[(constructionProgress(p)?.stage)].amount;
  if(w.expeditionPack.wood<amount){turnExpeditionHome(e,t,'supplies-lost');break;}
  w.expeditionPack.wood-=amount;(constructionProgress(p)?.spent).wood+=amount;housingAccounting(e.housing).consumed.wood+=amount;ensureConstructionProgress(p).stage++;ensureConstructionProgress(p).strikes=0;ensureConstructionProgress(p).delivered=0;
  if((constructionProgress(p)?.stage)===3){finishCamp(e,p);t.stage='working';t.workUntil=e.time+t.staySeconds;t.deadline=e.time+DAY_LENGTH_SECONDS*1.5;e.emit('house-completed',w,null,{houseId:p.id,kind:'camp',beds:2});for(const {m:peer,w:pw}of members(e,t)){clearJob(e,pw);enterPhase(e,pw,peer,'gather');}break;}
  w.clock.reset('work');
 }
}
function gather(e,w,m,t,dt){
 if((w.cargo?.amount??0)>=t.goalPerPerson||actorNeeds(w).energy<40||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)||t.waitWeatherSince!==null){clearJob(e,w);enterPhase(e,w,m,'camp-idle');return;}
 if(actorNeeds(w).hunger>55&&w.expeditionPack.food){clearJob(e,w);enterPhase(e,w,m,'camp-idle');return;}
 if(w.node&&(resourceGrowth(w.node)?.state!=='ready'||resourceHarvest(w.node)?.reservedBy!==w.id)){clearJob(e,w);m.routeTo=null;}
 if(!w.node){
  if((m.nextGatherAt??0)>e.time)return;m.nextGatherAt=e.time+3;
  const nodes=expeditionResources(e,t.place).filter(n=>resourceHarvest(n)?.reservedBy===null&&(resourceHarvest(n)?.retryAt??0)<=e.time).sort((a,b)=>distance(w,a)-distance(w,b));
  for(const n of nodes.slice(0,3)){
   const reach=n.kind==='wood'?1.35:n.kind==='stone'?Math.max(1.15,(n.radius??.7)+.5):.85;
   for(const dx of [-reach,reach]){const point={x:n.x+dx,z:n.z+.12};if(!standingRoom(e,w,point))continue;const route=e.route(w,point);if(!route)continue;resourceHarvest(n).reservedBy=w.id;w.node=n;w.job=n.kind;w.route=route;m.workPoint=point;m.routeTo=null;w.state='outbound';break;}
   if(w.node)break;resourceHarvest(n).retryAt=e.time+12;
  }
  if(!w.node){enterPhase(e,w,m,'camp-idle');return;}
 }
 const node=w.node,rules=isForage(node)?forageRules(node):RESOURCE_RULES[node.kind];
 if(w.state!=='working'){
  const result=walk(e,w,m,m.workPoint,dt);if(result==='blocked'){resourceHarvest(node).retryAt=e.time+15;clearJob(e,w);return;}if(result!=='arrived')return;w.state='working';w.clock.reset(rules.action);w.facing=node.x<w.x?'left':'right';
 }
 for(const event of w.clock.advance(dt*skillRate(w,resourceSkill(node))*ageWorkRate(w))){
  if(event==='contact'){resourceHarvest(node).hits++;e.emit(rules.contact,w,node);}
  if(event==='finish'){
   if(resourceHarvest(node)?.hits<rules.hits){w.clock.reset(rules.action);continue;}
   depleteResource(e,node);w.cargo={kind:node.kind,amount:(w.cargo?.amount??0)+rules.amount,...(isForage(node)?{appearance:node.foodSource==='cactus'?'fruit':'mushroom'}:{})};e.emit('gathered',w,node);clearJob(e,w);m.routeTo=null;break;
  }
 }
}
export function handleExpedition(e,w,dt){
 if(w.journeyGreeting){const g=w.journeyGreeting,peer=e.workers.find(p=>p.id===g.workerId);if((actorVitality(w)?.dead)||!peer||(actorVitality(peer)?.dead)||w.state!=='expedition-greeting'||g.met&&distance(w,peer)>3||e.time>g.until){delete w.journeyGreeting;if(w.state==='expedition-greeting')releaseWork(e,w);return false;}if(w.route.length){if(e.move(w,dt)==='blocked'){delete w.journeyGreeting;releaseWork(e,w);}return true;}if(!g.met){g.met=true;g.until=e.time+5;memoryMutual(e.life.memory,w,peer,'welcomed-together',.08);cue(e,w,'love','reunion');cue(e,peer,peer.heartbrokenUntil>e.time?'disappointed':'love','reunion');}w.facing=peer.x<w.x?'left':'right';actorNeeds(w).social=clamp(actorNeeds(w).social+dt*3);actorNeeds(peer).social=clamp(actorNeeds(peer).social+dt*3);if(e.time>=g.until){delete w.journeyGreeting;lifeIdle(e.life,w);}return true;}
 const t=e.expeditions?.active;if(!w.expeditionId||!t||t.id!==w.expeditionId)return false;
 const m=t.members.find(m=>m.id===w.id);if(!m||(actorVitality(w)?.dead))return false;
 if(w.divineHeld||w.ritualId!=null||w.rivalJourney)return false;
 if(m.mealPaid){
  if(w.state!=='eating'){m.mealPaid=false;m.mealUntil=null;}
  else if(e.time<m.mealUntil)return true;
  else{actorNeeds(w).hunger=clamp(actorNeeds(w).hunger-62);actorNeeds(w).energy=clamp(actorNeeds(w).energy+7);lifeMealAccounting(e.life).consumed++;m.mealPaid=false;m.mealUntil=null;w.state='idle';m.routeTo=null;}
 }
 if((actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION)return true;
 if(t.stage==='returning'&&!['return','settle'].includes(m.phase)&&!m.done){exitTent(e,w);enterPhase(e,w,m,'return');}
 if(m.done){w.state='resting';ensureActorDailyActivity(w).activityUntil=e.time+3;return true;}
 if(m.phase==='fetch'){
  const result=walk(e,w,m,e.depot,dt);if(result==='blocked'){turnExpeditionHome(e,t,'blocked');return true;}if(result!=='arrived')return true;
  if(!m.prepared){const wood=m.index===0?R.wood:0,keep=e.workers.filter(p=>!(actorVitality(p)?.dead)&&!p.expeditionId).length;if(e.stock.food<R.foodEach+keep||e.stock.wood<wood){turnExpeditionHome(e,t,'supplies-short');return true;}e.stock.food-=R.foodEach;e.stock.wood-=wood;w.expeditionPack.food=R.foodEach;w.expeditionPack.wood=wood;m.prepared=true;}
  enterPhase(e,w,m,'meet');return true;
 }
 if(m.phase==='meet'){
  const point={x:e.depot.x+(m.index-1)*1.6,z:e.depot.z+3};const result=walk(e,w,m,point,dt);if(result==='blocked'){turnExpeditionHome(e,t,'blocked');return true;}if(result==='arrived'){m.arrived=true;w.state='waiting-friend';if(actorNeeds(w).hunger>45)meal(e,w,m,'meet');}return true;
 }
 if(m.phase==='travel'){
  const point=t.spots[m.index];const result=walk(e,w,m,point,dt,'outbound',{group:t});if(result==='arrived'){m.arrived=true;w.state='waiting-friend';}else if(result==='blocked')turnExpeditionHome(e,t,'blocked');return true;
 }
 if(m.phase==='build'||m.phase==='pack'){build(e,w,m,t,dt,m.phase==='pack');return true;}
 if(m.phase==='gather'){gather(e,w,m,t,dt);return true;}
 if(m.phase==='camp-idle'){campRest(e,w,m,t,dt);return true;}
 if(m.phase==='return'){
  if(actorNeeds(w).hunger>65&&w.expeditionPack?.food){meal(e,w,m,'return');return true;}
  exitTent(e,w);const point=e.depot;
  if(distance(w,point)<3&&members(e,t).some(({m:peer,w:p})=>p!==w&&peer.phase==='return'&&p.state==='unloading'&&distance(p,point)<.6)){w.vx=w.vz=0;w.state='waiting-friend';return true;}
  const result=walk(e,w,m,point,dt,'returning',{group:t});
  if(result==='blocked'){m.routeTo=null;cue(e,w,'nervous','blocked-return');return true;}if(result!=='arrived')return true;
  m.unloadAt??=e.time+.9;w.state='unloading';if(e.time<m.unloadAt)return true;
  const loads={food:w.expeditionPack.food,wood:w.expeditionPack.wood,stone:0};if(w.cargo)loads[w.cargo.kind]+=w.cargo.amount;
  for(const kind of ['food','wood','stone'])if(loads[kind]){e.stock[kind]+=loads[kind];m.delivered[kind]+=loads[kind];e.emit('delivered',w,null,{kind,amount:loads[kind]});}
  e.deliveries++;w.expeditionPack.food=w.expeditionPack.wood=0;w.cargo=null;enterPhase(e,w,m,'settle');
  // A returning worker takes a real meal from the shared store and rests.
  if(e.stock.food&&actorNeeds(w).hunger>30){e.stock.food--;w.expeditionPack.food=1;meal(e,w,m,'settle');}
  return true;
 }
 if(m.phase==='settle'){const point={x:e.depot.x+(m.index-1)*1.6,z:e.depot.z+3};if(!m.settlePoint){const route=standingRoute(e,w,point);m.settlePoint=route?.at(-1)??point;}const result=walk(e,w,m,m.settlePoint,dt);if(result==='arrived'){m.done=true;w.state='resting';ensureActorDailyActivity(w).activityUntil=e.time+18;}else if(result==='blocked'){m.settlePoint=null;cue(e,w,'confused','blocked-return');}return true;}
 return true;
}

export function validExpeditions(e){
 const s=e.expeditions;if(s==null)return e.workers.every(w=>w.expeditionId==null);
 const finite=n=>Number.isFinite(n)&&n>=0,point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z),kinds=['food','wood','stone'];
 if(s.version!==1||![s.nextId,s.nextCheck,s.nextDeparture].every(finite)||!Number.isSafeInteger(s.nextId)||!Array.isArray(s.places)||s.places.length>R.memoryLimit||!s.places.every(p=>point(p)&&kinds.includes(p.kind)&&typeof p.id==='string'&&finite(p.avoidUntil)&&finite(p.visits))||!Array.isArray(s.history)||s.history.length>R.historyLimit)return false;
 for(const w of e.workers){if((actorExpeditionTemperament(w)?.values)&&!['curiosity','caution','attachment'].every(k=>finite((actorExpeditionTemperament(w)?.values)[k])&&(actorExpeditionTemperament(w)?.values)[k]<=1))return false;if(w.journeyMemories&&(!Array.isArray(w.journeyMemories)||w.journeyMemories.length>R.memoryLimit||!w.journeyMemories.every(m=>point(m)&&finite(m.at)&&finite(m.fear)&&m.fear<=1)))return false;if(w.expeditionPack&&!['food','wood'].every(k=>finite(w.expeditionPack[k])))return false;}
 const t=s.active;if(!t)return e.workers.every(w=>w.expeditionId==null);
 return typeof t.id==='string'&&point(t.place)&&point(t.site)&&Array.isArray(t.spots)&&t.spots.length===t.members?.length&&t.spots.every(point)&&kinds.includes(t.place.kind)&&['preparing','travelling','building','working','packing','returning','homecoming'].includes(t.stage)&&finite(t.deadline)&&Array.isArray(t.lossIds)&&Array.isArray(t.greetedIds)&&Array.isArray(t.members)&&t.members.length>=2&&t.members.length<=3&&new Set(t.members.map(m=>m.id)).size===t.members.length&&t.members.every(m=>(!!memberWorker(e,m)||m.done)&&['fetch','meet','travel','build','pack','camp-idle','gather','return','settle','home'].includes(m.phase)&&finite(m.since)&&finite(m.retryAt)&&kinds.every(k=>finite(m.delivered?.[k])))&&e.workers.every(w=>w.expeditionId==null||w.expeditionId===t.id&&t.members.some(m=>m.id===w.id)&&(t.stage==='homecoming'||!!w.expeditionPack))&&(!t.campId||camp(e,t)?.expeditionId===t.id);
}
