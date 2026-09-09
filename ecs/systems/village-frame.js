import {updateSnakes} from './snakes.js';
import {syncAppleResources} from './apples.js';
import {updatePoison,handlePoisonCare} from './poison.js';
import {updateActors,handleActor} from './performances.js';
import {updateAcorns,handleOak,chooseOak} from './oaks.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {chooseWork,releaseWork} from "../../village-resources.js";
import {harvestResourceStep} from './resource-harvesting.js';
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {lifeClock} from "../life-state.js";
import {updateRatsOwls} from '../../village-rats-owls.js';
import {updateStories} from '../../village-stories.js';
import {handleStoryTask,chooseStoryAid,chooseSecretMeeting} from '../../village-story-journeys.js';
import {faithUpdate,faithHandle} from "../../village-faith.js";
import {actorOffering} from "../religion-actors.js";
import {actorOccasion} from "../actor-occasion.js";
import {attachmentsUpdate,attachmentsHandle} from "../../village-attachments.js";
import {occasionsUpdate,occasionsHandle} from "../../village-occasions.js";
import {actorCurse} from '../actor-curse-relic.js';
import {updateRelics,handleRelicTask,chooseRelicTask} from './relics.js';
import {updateCurses,handleCurseCare,isCursed} from './curses.js';
import {TRANSITIONS} from '../../animation-transitions.js';
import {ensureWildlifeParticipant} from '../animal-participants.js';
import {farmingUpdate,farmingHandle} from './farming.js';
import {housingUpdate,housingHandle} from './housing.js';
import {ecologyUpdate} from './ecology.js';
import {discoveryUpdate,discoveryHandle} from './discovery.js';
import {chooseScarecrow,handleScarecrow} from '../../village-scarecrows.js';
import {updateDreams} from '../../nature-wishes.js';
import {birdState} from '../../village-birds.js';
import {updateBirds,handleBird,chooseBirdResponse} from './birds.js';
import {wildlifeState} from '../../village-wildlife.js';
import {updateWildlife,handleWildlife,chooseWildlife} from './wildlife.js';
import {updateMagic,handleMagic} from '../../village-magic.js';
import {noticeCommunityRecovery,updateCommunityRecovery} from '../../village-community-recovery.js';
import {noticeSkillEvent,skillRate,resourceSkill} from '../../village-skills.js';
import {updateAmbitions,noticeAmbitionEvent,pursueAmbition} from '../../village-ambitions.js';
import {noticePlaceEvent} from '../../village-place-history.js';
import {updateApprenticeships,handleApprenticeship,handleMentor} from '../../village-apprenticeships.js';
import {updatePings,handlePing} from '../../village-pings.js';
import {updateExpeditions,handleExpedition} from '../../village-expeditions.js';
import {cookingUpdate,cookingHandle} from './cooking.js';
import {cookingEntity} from '../cooking-entities.js';
import {campfireUpdate,campfireHandle} from './campfire.js';
import {campfireEntity} from '../campfire-entities.js';
import {beastCommands} from '../beast-commands.js';
import {beastsUpdate} from './beasts.js';
import {beastsLiving} from '../../village-beasts.js';
import {survivalUpdate,survivalHandle} from './survival.js';
import {lifeUpdate,lifeIdle,lifeHandle} from './life.js';
import {updateGhostsSystem} from './ghosts.js';
import {raiderUpdate} from '../../village-raids.js';
import {slimeUpdate} from '../../village-slimes.js';
import {dangerUpdate,dangerHandle} from '../../village-danger.js';
import {updateWatchtowers} from '../../village-watchtowers.js';
import {updateArcherySystem} from './archery.js';
import {supportUpdate,supportHandle} from '../../village-support.js';
import {childcareHandle} from '../../village-childcare.js';
import {familyUpdate,familyHandle} from '../../village-family.js';

import {updateExploration} from '../../village-exploration.js';
import {observeDivineRequest} from '../../village-divine-request.js';
import {updateDesirePaths} from '../../village-desire-paths.js';
import {updateRival,handleRivalResident,startRivalVisit} from '../../village-rival.js';
import {updateChapters} from '../../village-chapters.js';
import {handleGhostConversation} from '../../village-ghosts.js';
import {updateBelief} from '../../god-belief.js';
import {updateTraditions} from '../../village-traditions.js';
import {handlePlacementChoice} from '../../village-placement-choice.js';
import {observeWishWeather} from '../../wish-draw.js';
import {updateTemperature,handleTemperature} from '../../village-temperature.js';

import {forageRules,isForage,syncForage} from '../../village-foraging.js';
import {updateRepairs,handleRepair} from '../../village-repairs.js';
import {updateEmergency} from '../../village-emergency.js';
import {updatePrayers,handlePrayer} from '../../village-prayers.js';
import {updateShelter} from '../../village-shelter.js';

import {updateLightning} from '../../village-lightning.js';

import {updateWishes,syncBeastCards} from '../../god-wishes.js';

import {reconsiderWork} from '../../village-decisions.js';

import {updateStandingSpace} from '../../village-spacing.js';
import {beginHouseExit} from '../../doorway-transition.js';
import {updateAges,ageMovementRate,ageWorkRate} from '../../village-age.js';

import {advanceHour} from '../../village-time.js';

import {RESOURCE_RULES} from '../../resource-rules.js';
import {SystemSchedule} from '../scheduler.js';
import {villageWorld} from '../village-world.js';
export {villageWorld} from '../village-world.js';
import {updateResourceGrowth} from './resource-growth.js';

export const VILLAGE_SYSTEMS=[
 {id:"updateExploration",after:[],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateExploration(e);
 }},
 {id:"updateDesirePaths",after:["updateExploration"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateDesirePaths(e,weather);
 }},
 {id:"updateAges",after:["updateDesirePaths"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateAges(e,dt);
 }},
 {id:"observeWishWeather",after:["updateAges"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  observeWishWeather(e,weather);
 }},
 {id:"updateShelter",after:["observeWishWeather"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateShelter(e,dt,weather);
 }},
 {id:"life.update",after:["updateShelter"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  ((e.life)==null?undefined:(lifeUpdate(world,dt,hour??advanceHour(lifeClock(e.life).hour,dt))));updatePoison(world,dt);updateCurses(world,dt);updateRelics(world,dt);
 }},
 {id:"campfire.update",after:["life.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  if(e.campfire)campfireUpdate(world,campfireEntity(e.campfire),dt,weather);
 }},
 {id:"cooking.update",after:["campfire.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  if(e.cooking)cookingUpdate(world,cookingEntity(e.cooking));
 }},
 {id:"exploration.camps-",after:["cooking.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  for(const c of e.exploration?.camps??[]){campfireUpdate(world,campfireEntity(c.fire),dt,weather);cookingUpdate(world,cookingEntity(c.cooking));}
 }},
 {id:"updateTemperature",after:["exploration.camps-"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateTemperature(e,dt,weather);
 }},
 {id:"updateWishes",after:["updateTemperature"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateWishes(e,weather);
 }},
 {id:"updateLightning",after:["updateWishes"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateLightning(e,dt,weather,lightning);
 }},
 {id:"survival.update",after:["updateLightning"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  ((e.survival)==null?undefined:(survivalUpdate(world,dt)));
 }},
 {id:"updateRival",after:["survival.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateRival(e,dt);updateStories(e,dt,startRivalVisit);
 }},
 {id:"updateGhosts",after:["updateRival"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateGhostsSystem(world,dt);
 }},
 {id:"updateWatchtowers",after:["updateGhosts"],run(world){updateWatchtowers(world.resource('Village'));}},
 {id:"raids.update",after:["updateWatchtowers"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  raiderUpdate(e.raids,dt);
 }},
 {id:"updateArchery",after:["raids.update"],run: updateArcherySystem},
 {id:"updateEmergency",after:["updateArchery"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateEmergency(e);
 }},
 {id:"updateRepairs",after:["updateEmergency"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateRepairs(e);
 }},
 {id:"updateCommunityRecovery",after:["updateRepairs"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateCommunityRecovery(e);}},
 {id:"slimes.update",after:["updateCommunityRecovery"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  slimeUpdate(e.slimes,dt);
 }},
 {id:"updateWildlife",after:["slimes.update"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateWildlife(world,dt);}},
 {id:"updateBirds",after:["updateWildlife"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateBirds(world,dt);updateRatsOwls(e,dt);updateSnakes(world,dt);}},
 {id:"danger.update",after:["updateBirds"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  dangerUpdate(e);
 }},
 {id:"support.update",after:["danger.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  supportUpdate(e,dt);
 }},
 {id:"family.update",after:["support.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  familyUpdate(e,dt);
 }},
 {id:"farming.update",after:["family.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  (e.farming?farmingUpdate(world,dt):undefined);
 }},
 {id:"housing.update",after:["farming.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  (e.housing?housingUpdate(world,dt):undefined);
 }},
 {id:"ecology.update",after:["housing.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  (e.ecology?ecologyUpdate(world,dt,weather):undefined);
 }},
 {id:"updateAcorns",after:["ecology.update"],run(world){updateAcorns(world);}},
 {id:"syncForage",after:["updateAcorns"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  syncForage(e);
 }},
 {id:"syncAppleResources",after:["syncForage"],run(world){syncAppleResources(world);}},
 {id:"updateExpeditions",after:["syncAppleResources"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateExpeditions(e,dt,weather);}},
 {id:"updateActors",after:["updateExpeditions"],run(world){updateActors(world);}},
 {id:"occasions.update",after:["updateActors"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  occasionsUpdate(e.occasions,dt);
 }},
 {id:"updateChapters",after:["occasions.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateChapters(e);
 }},
 {id:"updateTraditions",after:["updateChapters"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateTraditions(e);
 }},
 {id:"updatePings",after:["updateTraditions"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updatePings(e);}},
 {id:"updateDreams",after:["updatePings"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateDreams(e);}},
 {id:"updateAmbitions",after:["updateDreams"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateAmbitions(e);}},
 {id:"updateApprenticeships",after:["updateAmbitions"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateApprenticeships(e);}},
 {id:"updatePrayers",after:["updateApprenticeships"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updatePrayers(e);
 }},
 {id:"faith.update",after:["updatePrayers"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  faithUpdate(e.faith,dt,weather);
 }},
 {id:"updateBelief",after:["faith.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateBelief(e,dt);
 }},
 {id:"discovery.update",after:["updateBelief"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  (e.discovery?discoveryUpdate(world):undefined);
 }},
 {id:"updateMagic",after:["discovery.update"],run(world,frame){const e=world.resource('Village'),{dt,weather}=frame;updateMagic(e);}},
 {id:"attachments.update",after:["updateMagic"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  attachmentsUpdate(e.attachments);
 }},
 {id:"leadership.update",after:["attachments.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  e.leadership?.update(dt,weather);
 }},
 {id:"beasts.update",after:["leadership.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  if(e.beasts)beastsUpdate(world,dt);
 }},
 {id:"syncBeastCards",after:["beasts.update"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  syncBeastCards(e);
 }},
 {id:"nodes",after:["syncBeastCards"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateResourceGrowth(world);
 }},
 {id:"workers",after:["nodes"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  for(const w of e.workers){
   w.vx=w.vz=0;w.phase=(w.phase+dt*.51*ageMovementRate(w))%1;
   if(w.divineHeld){w.state='held';continue}
   observeDivineRequest(e,w);
   if(handlePoisonCare(world,w,dt))continue;
   if(e.leadership?.handleExclusive(w,dt))continue;
   if(w.rivalJourney&&handleRivalResident(e,w,dt))continue;
   if(handleStoryTask(e,w,dt)||chooseSecretMeeting(e,w))continue;
   if(((e.survival)==null?undefined:(survivalHandle(world,w,dt))))continue;
   if(handleRelicTask(world,w,dt))continue;
   if(handleCurseCare(world,w,dt))continue;
   if(isCursed(w,e.time)&&(actorCurse(w)?.effect).workUntil>e.time)continue;
   if(handleRivalResident(e,w,dt))continue;
   if(handleExpedition(e,w,dt))continue;
   if(handleActor(world,w,dt))continue;
   if(handleMagic(e,w,dt))continue;
   if(handleOak(world,w,dt))continue;
   if(handleScarecrow(e,w,dt))continue;
   if(handleBird(world,w,dt))continue;
   if(handleWildlife(world,w,dt))continue;
   if(handleGhostConversation(e,w))continue;
   if(e.cooking&&cookingHandle(world,cookingEntity(e.cooking),w,dt,{serveOnly:true}))continue;
   if(handleTemperature(e,w,dt))continue;
   if(chooseStoryAid(e,w))continue;
   if(chooseRelicTask(world,w))continue;
   if(w.state==='beast-playing'){if(beastsLiving(e.beasts)?.id===w.beastPlayId&&(beastCommands(beastsLiving(e.beasts))?.playOrder)?.villagerId===w.id)continue;delete w.beastPlayId;lifeIdle(world,w);}
   if(e.leadership?.isLeader(w)&&handlePlacementChoice(e,w,dt))continue;
   if((actorOccasion(w)?.id)!=null&&occasionsHandle(e.occasions,w,dt))continue;
   if(e.leadership?.handleLeader(w,dt))continue;
   if(dangerHandle(e,w,dt))continue;
   if(occasionsHandle(e.occasions,w,dt))continue;
   if(supportHandle(e,w,dt))continue;
   reconsiderWork(e,w);
   if(childcareHandle(e,w,dt))continue;
   if(handlePing(e,w,dt))continue;
   if(handleApprenticeship(e,w,dt)||handleMentor(e,w))continue;
   if(handlePlacementChoice(e,w,dt))continue;
   if(chooseScarecrow(e,w))continue;
   if(chooseOak(world,w))continue;
   if((e.farming?farmingHandle(world,w,dt):undefined))continue;
   if(handleRepair(e,w,dt))continue;
   if(e.cooking&&cookingHandle(world,cookingEntity(e.cooking),w,dt))continue;
   if(e.campfire&&campfireHandle(world,campfireEntity(e.campfire),w,dt))continue;
   if((e.housing?housingHandle(world,w,dt):undefined))continue;
   if(attachmentsHandle(e.attachments,w,dt))continue;
   if((e.discovery?discoveryHandle(world,w,dt):undefined))continue;
   if((actorOffering(w)?.kind)&&faithHandle(e.faith,w,dt))continue;
   if(handlePrayer(e,w,dt))continue;
   if(((e.life)==null?undefined:(lifeHandle(world,w,dt))))continue;
   if(faithHandle(e.faith,w,dt))continue;
   if(familyHandle(e,w,dt))continue;
   if(w.spacingRoute?.length)continue;
   if(w.wait>0){w.wait-=dt;continue}
   if(w.state==='idle'){if(chooseBirdResponse(world,w))continue;if(chooseWildlife(world,w))continue;if(pursueAmbition(e,w))continue;chooseWork(e,w);continue}
   if(w.state==='waiting-return'){e.returnHome(w);continue}
   if(w.state==='outbound'||w.state==='returning'){
    const status=e.move(w,dt);
    if(status==='arrived'){if(w.state==='returning'){w.state='unloading';w.wait=TRANSITIONS.deposit+.6;ensureActorInterior(w).insideAt=w.store;ensureActorInterior(w).inside=!!w.store?.door;ensureActorInterior(w).enteredAt=e.time+TRANSITIONS.deposit;w.facing='back'}else{w.state='working';w.facing=w.node.x<w.x?'left':'right';w.clock.reset((isForage(w.node)?forageRules(w.node):RESOURCE_RULES[w.node.kind]).action)}}
    else if(status==='blocked'){if(w.cargo)e.returnHome(w);else releaseWork(e,w)}continue;
   }
   if(w.state==='working'){harvestResourceStep(world,w,dt);continue}
   if(w.state==='unloading'){
    if(w.cargo){if(w.cargo.appearance==='meat')ensureWildlifeParticipant(w).meal=true;const {kind,amount}=w.cargo;e.stock[kind]=(e.stock[kind]??0)+amount;w.lastJob=kind;e.deliveries++;e.emit('delivered',w,null,{kind,amount});w.cargo=null}
    w.state='idle';w.job=null;w.decisionReason=null;w.wait=.65;beginHouseExit(w,e.time);
   }
  }
 }},
 {id:"updateStandingSpace",after:["workers"],run(world,frame){const e=world.resource('Village'),{dt,hour,weather,lightning}=frame;
  updateStandingSpace(e,dt);
 }}
];
const schedule=new SystemSchedule(VILLAGE_SYSTEMS);
export function updateVillageFrame(e,dt,{hour,weather,lightning=[]}={}){
 e.events=e.wishes?.pending.splice(0)??[];
 if(!(dt>0))return e.events;
 dt=Math.min(dt,.1);
 e.time+=dt;
 schedule.run(villageWorld(e),{dt,hour,weather,lightning});
 return e.events;
}
