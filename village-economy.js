import {noticeActorEvent} from './village-actors.js';
import {snakeState} from './village-snakes.js';
import {restoreSnakeState} from './ecs/snake-state.js';
import {poisonRate} from './village-poison.js';
import {restorePoisonActors} from './ecs/poison-actors.js';
import {restorePerformanceActors} from './ecs/performance-actors.js';
import {restoreTheatreState} from './ecs/theatre-state.js';
import {restoreActorOakTask} from './ecs/actor-oak-task.js';
import {actorTradeTask,ensureActorTradeTask} from './ecs/actor-trade-task.js';
import {restoreActorTradeTask} from './ecs/actor-trade-task.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {restoreActorResidence} from './ecs/actor-residence.js';
import {restoreActorInterior} from './ecs/actor-interior.js';
import {restoreShelterState} from './ecs/shelter-state.js';
import {restoreHomeEntities} from './ecs/home-entities.js';
import {structuralCondition} from './ecs/home-entities.js';
import {restoreRepairState} from './ecs/repair-state.js';
import {restoreActorRepairTask} from './ecs/actor-repair-task.js';
import {actorConstructionTask,ensureActorConstructionTask} from './ecs/actor-construction-task.js';
import {restoreActorConstructionTask} from './ecs/actor-construction-task.js';
import {restoreHousingComponents} from './ecs/housing-state.js';
import {housingDomains} from './ecs/housing-data.js';
import {actorFarmingTask} from './ecs/actor-farming-task.js';
import {restoreActorFarmingTask} from './ecs/actor-farming-task.js';
import {restoreFarmingComponents} from './ecs/farming-state.js';
import {farmingDomains} from './ecs/farming-data.js';
import {restoreActorCombat,ensureActorCombat} from './ecs/actor-combat.js';
import {resourceGrowth,resourceHarvest} from "./ecs/resource-state.js";
import {restoreLifeState} from './ecs/life-state.js';
import {actorSocialActivity} from "./ecs/daily-activity-actors.js";
import {restoreDailyActivityActors} from './ecs/daily-activity-actors.js';
import {restoreFamilyEntities} from './ecs/family-entities.js';
import {restoreJealousyActors} from './ecs/jealousy-actors.js';
import {actorPersonality,actorWorkPreferences} from "./ecs/personality-actors.js";
import {restorePersonalityActors} from './ecs/personality-actors.js';
import {ratOwlState} from './village-rats-owls.js';
import {noticeGameplayEffectEvent} from './gameplay-effects/village-runtime.js';
import {noticeStoryEvent} from './village-stories.js';
import {restoreReligionActors} from './ecs/religion-actors.js';
import {createPrayers,restoreReligion} from './ecs/religion-state.js';
import {createFaith,faithNotice,faithSnapshot} from "./village-faith.js";
import {actorFaith,actorDivineIntent} from "./ecs/religion-actors.js";
import {restoreDevelopmentActors} from './ecs/development-actors.js';
import {restoreDevelopmentState} from './ecs/development-state.js';
import {restoreActorPlaces} from './ecs/actor-places.js';
import {restoreActorOccasion} from './ecs/actor-occasion.js';
import {restoreCommunity} from './ecs/community-entities.js';
import {createAttachments,attachmentsNotice,attachmentsSnapshot} from "./village-attachments.js";
import {createOccasions,occasionsNotice,occasionsSnapshot} from "./village-occasions.js";
import {restoreActorTraditions} from './ecs/actor-traditions.js';
import {restoreTraditions} from './ecs/tradition-entities.js';
import {restoreActorDiplomacy} from './ecs/actor-diplomacy.js';
import {restoreDiplomacy} from './ecs/diplomacy-entities.js';
import {settlementDiplomacy,settlementDevelopment,settlementEconomy,settlementHistory} from './ecs/rival-entities.js';
import {restoreRivalEntities,rivalComponentKeys} from './ecs/rival-entities.js';
import {restoreRelicEntities} from './ecs/relic-entities.js';
import {restoreActorCurseRelic} from './ecs/actor-curse-relic.js';
import {noticeRelicEvent} from './village-relics.js';
import {noticeCurseEvent} from './village-curse.js';
import {personKinship} from './ecs/person-kinship.js';
import {restorePersonKinship} from './ecs/person-kinship.js';
import {restoreAnimalEntities} from './ecs/animal-entities.js';
import {restoreAnimalParticipants} from './ecs/animal-participants.js';
import {createFarming,farmingSnapshot} from './village-farming.js';
import {createHousing,housingObstacles,housingSnapshot} from './village-housing.js';
import {createEcology,ecologyObstacles,ecologySnapshot} from './village-ecology.js';
import {createDiscovery,discoveryChoose,discoverySnapshot} from './village-discovery.js';
import {birdState} from './village-birds.js';
import {wildlifeState} from './village-wildlife.js';
import {noticeCommunityRecovery} from './village-community-recovery.js';
import {noticeSkillEvent} from './village-skills.js';
import {noticeAmbitionEvent} from './village-ambitions.js';
import {noticePlaceEvent} from './village-place-history.js';
import {actorMeal} from './ecs/actor-meal.js';
import {restoreActorMeal} from './ecs/actor-meal.js';
import {restoreActorCookingTask} from './ecs/actor-cooking-task.js';
import {createCooking,cookingSnapshot} from './village-cooking.js';
import {createCampfire,campfireSnapshot} from './village-campfire.js';
import {actorDeprivation} from './ecs/actor-deprivation.js';
import {restoreActorFeeding} from './ecs/actor-feeding.js';
import {restoreActorDeprivation} from './ecs/actor-deprivation.js';
import {restoreBeastEffects} from './ecs/beast-effects.js';
import {restoreBeastCommands} from './ecs/beast-commands.js';
import {restoreBeastAssociations} from './ecs/beast-associations.js';
import {restoreBeastEmotions} from './ecs/beast-emotions.js';
import {restoreBeastRelationships} from './ecs/beast-relationships.js';
import {restoreBeastLearning} from './ecs/beast-learning.js';
import {createBeasts,beastsSnapshot} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {restoreActorVitality} from './ecs/actor-vitality.js';
import {survivalRecover,survivalSnapshot} from './village-survival.js';
import {lifeSnapshot} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {restorePersonAge} from './ecs/person-age.js';
import {actorRomance} from './ecs/actor-romance.js';
import {restoreActorRomance} from './ecs/actor-romance.js';
import {actorFeelings} from './ecs/actor-feelings.js';
import {restoreActorFeelings} from './ecs/actor-feelings.js';
import {actorMemories} from './ecs/actor-memories.js';
import {restoreActorMemories} from './ecs/actor-memories.js';
import {restoreWatchParticipants} from './ecs/watch-participants.js';
import {restoreGhostExperiences} from './ecs/ghost-experiences.js';
import {createRaids,raiderSnapshot} from './village-raids.js';
import {createSlimes,slimeSnapshot} from './village-slimes.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {restoreActorNeeds} from './ecs/actor-needs.js';
import {careParticipant} from './ecs/care-participants.js';
import {restoreCareParticipants} from './ecs/care-participants.js';
import {dangerSnapshot} from './village-danger.js';
import {restoreSupportParticipants} from './ecs/support-participants.js';
import {supportParticipant} from './ecs/support-participants.js';
import {supportSnapshot} from './village-support.js';
import {familySnapshot} from './village-family.js';
import {registerPeople} from './ecs/person-entities.js';
import {resourceEntities} from './ecs/resource-entities.js';
import {updateVillageFrame} from './ecs/systems/village-frame.js';
import {RESOURCE_RULES} from './resource-rules.js';
export {RESOURCE_RULES} from './resource-rules.js';

import {initialiseCombatStyle} from './village-archery.js';
import {explorationState,updateExploration,exploredAt} from './village-exploration.js';
import {declinedDivineRequest} from './village-divine-request.js';
import {desirePathState,recordPathTravel} from './village-desire-paths.js';
import {createRivalState} from './village-rival.js';
import {chapterState,noticeChapterEvent} from './village-chapters.js';
import {createGhostState} from './village-ghosts.js';
import {initialiseBelief,noticeBeliefEvent} from './god-belief.js';
import {traditionState,noticeCustomEvent} from './village-traditions.js';

import {resolveCulture} from './village-cultures.js';
import {forageRules,isForage,harvestForage} from './village-foraging.js';

import {shelterState,assignBeds} from './village-shelter.js';
import {VillageFaith} from './village-faith.js';
import {VillageBeasts} from './village-beasts.js';
import {VillageLeadership} from './village-leadership.js';
import {VillageDiscovery} from './village-discovery.js';
import {VillageAttachments} from './village-attachments.js';

import {syncBeastCards} from './god-wishes.js';
import {VillageHousing} from './village-housing.js';
import {VillageEcology} from './village-ecology.js';
import {createSupport} from './village-support.js';
import {createDanger} from './village-danger.js';
import {VillageOccasions} from './village-occasions.js';
import {VillageFarming} from './village-farming.js';
import {initialiseWorkPreferences,rankWork} from './village-decisions.js';
import {createSurvival} from './village-survival.js';

import {updateWalkFacing} from './village-facing.js';
import {standingRoom} from './village-spacing.js';

import {initialiseAge,ageMovementRate} from './village-age.js';
import {createFamily} from './village-family.js';
import {ActionClock} from './action-timing.js';
import {findWalkPath,walkStep} from './village-walking.js';
import {createLife} from './village-life.js';
import {beastRiteObstacles} from './beast-rite-site.js';

import {createVillageNamePool} from './village-names.js';

// Runtime state only. Rendering and sound consume the returned events; they
// cannot award resources. Reservations, cargo and stock live here.
export class VillageEconomy{
 constructor({workers,nodes,depot,culture='hearth',heightAt,obstacles=()=>[],pathfind=findWalkPath,life=true,homes,socialSpots,family=false,capacity=Infinity,campfire=null,nightWatch=true,raids=false,slimes=false,farming=null,housing=null,ecology=null,faith=null,prayers=null,leadership=false,discovery=null,attachments=false,traditions=false,chapters=false,desirePaths=false,exploration=false,belief=false,ghosts=false,rival=false,wildlife=false,birds=false,ratsOwls=false,snakes=false,random=Math.random}){
  this.culture=resolveCulture(culture).id;
  Object.assign(this,{depot,heightAt,obstacles,pathfind,random});this.time=0;this.stock={food:0,wood:0,stone:0,key:0};this.deliveries=0;this.events=[];
  this.names=createVillageNamePool({random,culture:this.culture,reserved:workers.map(w=>w.name)});
  this.nodes=nodes.map(n=>({...n,state:'ready',reservedBy:null,hits:0,readyAt:0,growth:1}));resourceEntities(this);
  this.workers=workers.map((w,i)=>({...w,culture:resolveCulture(w.culture??this.culture).id,name:typeof w.name==='string'&&w.name.trim()?w.name:this.names.take(),job:null,store:w.store??depot,id:w.id??i,state:'idle',cargo:null,node:null,route:[],facing:'front',phase:i*.13,clock:new ActionClock('harvest'),wait:i*.65,vx:0,vz:0,retries:0}));
  registerPeople(this);restoreActorVitality(this);restoreActorCurseRelic(this);restoreActorDiplomacy(this);restoreActorTraditions(this);restoreActorPlaces(this);restoreActorOccasion(this);restoreDevelopmentActors(this);restoreReligionActors(this);restorePersonalityActors(this);restoreActorCombat(this);restoreActorFarmingTask(this);restoreActorConstructionTask(this);restoreActorRepairTask(this);restoreActorOakTask(this);restorePerformanceActors(this);restorePoisonActors(this);restoreTheatreState(this);restoreActorTradeTask(this);restoreActorResidence(this);restoreActorInterior(this);restoreJealousyActors(this);restoreDailyActivityActors(this);restoreReligion(this);restoreDevelopmentState(this);restoreCommunity(this);restoreTraditions(this);restoreRelicEntities(this);restoreRivalEntities(this);restoreDiplomacy(this);restoreActorFeeding(this);restoreActorMeal(this);restoreActorCookingTask(this);restoreActorDeprivation(this);restoreBeastLearning(this);restoreBeastEmotions(this);restoreBeastAssociations(this);restoreBeastEffects(this);restoreBeastCommands(this);restoreBeastRelationships(this);restoreActorNeeds(this);restoreActorMemories(this);restoreActorFeelings(this);restoreActorRomance(this);restorePersonAge(this);restorePersonKinship(this);restoreAnimalParticipants(this);restoreSupportParticipants(this);restoreCareParticipants(this);restoreGhostExperiences(this);restoreWatchParticipants(this);if(life)for(const w of this.workers){initialiseAge(w);initialiseCombatStyle(w,random);}
  if(snakes&&life)snakeState(this);restoreSnakeState(this);
  if(traditions&&life)traditionState(this);
  this.life=life?createLife(this,{homes,socialSpots,watch:nightWatch}):null;restoreLifeState(this);restoreHomeEntities(this);
  for(const w of this.workers)initialiseWorkPreferences(w);
  this.support=this.life?createSupport(this):null;
  this.danger=this.life?createDanger(this):null;
  this.occasions=this.life?createOccasions(this):null;
  this.campfire=campfire&&this.life?createCampfire(this,campfire):null;
  this.cooking=this.campfire?createCooking(this):null;
  if(this.campfire)this.obstacles=()=>[...obstacles(),{x:campfire.x,z:campfire.z,radius:.72}];
  this.family=family?createFamily(this,{capacity}):null;restoreFamilyEntities(this);
  this.farming=farming?createFarming(this,farming):null;restoreFarmingComponents(this);
  this.housing=housing&&this.life?createHousing(this,housing===true?{}:housing):null;restoreHousingComponents(this);restoreRepairState(this);restoreShelterState(this);
  if(this.housing){const existing=this.obstacles;this.obstacles=()=>[...existing(),...housingObstacles(this.housing)]}
  this.ecology=ecology?createEcology(this,ecology===true?{}:ecology):null;
  if(this.ecology){const existing=this.obstacles;this.obstacles=()=>[...existing(),...ecologyObstacles(this.ecology)]}
  this.ghosts=ghosts&&this.life?createGhostState(this):null;
  this.rival=rival&&this.life?createRivalState(this):null;
  this.survival=this.life?createSurvival(this):null;this.raids=raids&&this.life?createRaids(this,raids===true?{}:raids):null;
  this.prayers=prayers&&this.life?createPrayers(this,prayers):null;
  this.faith=faith&&this.life?createFaith(this,faith):null;
  this.leadership=leadership&&this.life?new VillageLeadership(this):null;
  this.beasts=this.leadership?createBeasts(this):null;
  if(this.beasts){const existing=this.obstacles;this.obstacles=()=>[...existing(),...beastRiteObstacles(this)]}
  this.discovery=discovery&&this.life?createDiscovery(this,discovery===true?{}:discovery):null;
  if(wildlife&&this.life)wildlifeState(this);if(birds&&this.life)birdState(this);if(ratsOwls)ratOwlState(this);restoreAnimalEntities(this);
  this.attachments=attachments&&this.life?createAttachments(this):null;
  this.slimes=slimes&&this.life?createSlimes(this,slimes===true?{}:slimes):null;
  if(this.life){shelterState(this);assignBeds(this);if(belief)initialiseBelief(this);if(chapters)chapterState(this);if(desirePaths)desirePathState(this);if(exploration){explorationState(this);updateExploration(this,{force:true});const previous=this.obstacles;this.obstacles=()=>[...previous(),...this.exploration.camps.map(c=>({x:c.fire.x,z:c.fire.z,radius:.72}))]}}
 }
 addResource(...records){return resourceEntities(this).add(...records)}
 removeResource(record){return resourceEntities(this).remove(record)}
 emit(type,worker,node,extra={}){const event={type,workerId:worker?.id,nodeId:node?.id,...extra};this.events.push(event);noticeActorEvent(this,event);noticeStoryEvent(this,event);noticeRelicEvent(this,event);noticeCurseEvent(this,event);noticeSkillEvent(this,event);noticeAmbitionEvent(this,event);noticePlaceEvent(this,event);noticeCommunityRecovery(this,event);noticeBeliefEvent(this,event);if(type==='beast-died')syncBeastCards(this);noticeChapterEvent(this,event);noticeCustomEvent(this,event);occasionsNotice(this.occasions,event);faithNotice(this.faith,event);attachmentsNotice(this.attachments,event);this.leadership?.notice(event);noticeGameplayEffectEvent(this,event)}

 route(worker,destination){return this.pathfind(worker,destination,this.heightAt,this.obstacles())}

 returnHome(worker){
  const spot=worker.store??this.depot;
  const route=this.route(worker,spot);
  if(route){worker.route=route;worker.state='returning';worker.retries=0}
  else{worker.state='waiting-return';worker.wait=1.5;worker.retries++}
 }

 move(w,dt){
  if(w.divineHeld)return 'blocked';
  const destination=w.route[0];if(!destination)return 'arrived';
  const fromX=w.x,fromZ=w.z;const next=walkStep(w,destination,dt*ageMovementRate(w)*poisonRate(w,this.time),this.heightAt,this.obstacles());w.vx=(next.x-w.x)/dt;w.vz=(next.z-w.z)/dt;w.x=next.x;w.z=next.z;recordPathTravel(this,w,fromX,fromZ);
  updateWalkFacing(w,dt,this.time,next.blocked);
  if(next.blocked)return 'blocked';if(next.done)w.route.shift();return w.route.length?'moving':'arrived';
 }
 update(dt,{hour,weather,lightning=[]}={}){return updateVillageFrame(this,dt,{hour,weather,lightning});}
 snapshot(){return {time:this.time,rival:this.rival?{culture:this.rival.culture,reputation:settlementDiplomacy(this.rival).reputation,prosperity:settlementDevelopment(this.rival).prosperity,population:this.rival.people.filter(w=>!(actorVitality(w)?.dead)).length,stock:{...settlementEconomy(this.rival).stock},history:settlementHistory(this.rival).history.map(h=>({...h}))}:null,ghosts:this.ghosts?structuredClone(this.ghosts):null,cooking:((cookingState)=>cookingState==null?undefined:(cookingSnapshot(cookingState)))(this.cooking)??null,beasts:beastsSnapshot(this.beasts)??null,shelter:this.shelter?{fires:this.shelter.fires.map(f=>({...f})),homes:(this.life?.homes??[]).map(h=>({id:h.id,health:(structuralCondition(h)?.health),destroyed:!!(structuralCondition(h)?.destroyed)}))}:null,faith:faithSnapshot(this.faith)??null,leadership:this.leadership?.snapshot()??null,discovery:((domainState)=>domainState==null?undefined:(discoverySnapshot(domainState)))(this.discovery)??null,attachments:attachmentsSnapshot(this.attachments)??null,occasions:occasionsSnapshot(this.occasions)??null,danger:dangerSnapshot(this)??null,support:supportSnapshot(this)??null,ecology:((domainState)=>domainState==null?undefined:(ecologySnapshot(domainState)))(this.ecology)??null,housing:((domainState)=>domainState==null?undefined:(housingSnapshot(domainState)))(this.housing)??null,farming:((domainState)=>domainState==null?undefined:(farmingSnapshot(domainState)))(this.farming)??null,survival:((this.survival)==null?undefined:(survivalSnapshot(this.survival)))??null,raids:raiderSnapshot(this.raids)??null,slimes:slimeSnapshot(this.slimes)??null,stock:{...this.stock},deliveries:this.deliveries,life:((this.life)==null?undefined:(lifeSnapshot(this.life)))??null,family:familySnapshot(this)??null,campfire:((campfireState)=>campfireState==null?undefined:(campfireSnapshot(campfireState)))(this.campfire)??null,inTransit:this.workers.reduce((n,w)=>n+(w.cargo?.amount??0),0),workers:this.workers.map(w=>({id:w.id,name:w.name,health:(actorVitality(w)?.health),dead:!!(actorVitality(w)?.dead),deathCause:(actorVitality(w)?.deathCause),starvingFor:(actorDeprivation(w)?.starvingFor),sex:w.sex,sexuality:(actorRomance(w)?.sexuality),romanceInterest:(actorRomance(w)?.romanceInterest),role:w.role,leaderTrait:w.leaderTrait,faith:(actorFaith(w)?.belief)?.value,ritualId:w.ritualId,child:!!(personAge(w)?.child),ageYears:(personAge(w)?.ageYears),elder:!!(personAge(w)?.elder),frailty:(personAge(w)?.frailty),parents:(personKinship(w)?.parents),matureAt:(personAge(w)?.matureAt),bornAt:(personAge(w)?.bornAt),carePartnerId:careParticipant(w)?.partnerId??null,careFood:careParticipant(w)?.food??0,supportPartnerId:supportParticipant(w)?.partnerId??null,supportFood:supportParticipant(w)?.food??0,trait:(actorPersonality(w)?.trait),workPreferences:{...(actorWorkPreferences(w)?.values)},decisionReason:w.decisionReason,divineRequest:(actorDivineIntent(w)?.request)?{...(actorDivineIntent(w)?.request)}:null,memories:(actorMemories(w)??[]).map(m=>({...m})),job:w.job,state:w.state,x:w.x,z:w.z,cargo:w.cargo?{...w.cargo}:null,houseId:(actorConstructionTask(w)?.projectId)??null,tradeCargo:(actorTradeTask(w)?.cargo)?{...(actorTradeTask(w)?.cargo)}:null,houseCargo:(actorConstructionTask(w)?.cargo)?{...(actorConstructionTask(w)?.cargo)}:null,farmPlotId:actorFarmingTask(w)?.plotId??null,firewood:w.firewood??0,firestone:w.firestone??0,mealCarry:!!(actorMeal(w)?.mealCarry),node:w.node?.id??null,needs:actorNeeds(w)?{...actorNeeds(w)}:null,home:(actorResidence(w)?.home)?.name,inside:(actorInterior(w)?.inside),partnerId:actorSocialActivity(w)?.partnerId,sweetheartId:(actorRomance(w)?.sweetheartId)??null,heartbrokenUntil:(actorFeelings(w)?.heartbrokenUntil)??0})),nodes:this.nodes.map(n=>({id:n.id,kind:n.kind,state:resourceGrowth(n)?.state,reservedBy:resourceHarvest(n)?.reservedBy,growth:resourceGrowth(n)?.growth,hits:resourceHarvest(n)?.hits,readyAt:resourceGrowth(n)?.readyAt}))}}
}
