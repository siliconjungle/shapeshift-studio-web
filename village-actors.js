import {defineGameData} from './game-data.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';
import {villageWorld} from './ecs/village-world.js';
import {createTheatreState} from './ecs/theatre-state.js';
import * as systems from './ecs/systems/performances.js';
export const ACTOR_RULES=defineGameData('village-actors.ACTOR_RULES',{firstAt:DAY_LENGTH_SECONDS,interval:105,retry:12,arriveTimeout:22,duration:12,bow:1.4,range:12,audience:5,promoteShows:3,peoplePerActor:10});
export {isActor} from './ecs/systems/performances.js';
export function actorState(e){return createTheatreState(e,ACTOR_RULES.firstAt);}
export function noticeActorEvent(e,...args){return systems.noticeActorEvent(villageWorld(e),...args)}
export function promoteActor(e,...args){return systems.promoteActor(villageWorld(e),...args)}
export function leavePerformance(e,...args){return systems.leavePerformance(villageWorld(e),...args)}
export function updateActors(e,...args){return systems.updateActors(villageWorld(e),...args)}
export function handleActor(e,...args){return systems.handleActor(villageWorld(e),...args)}
export function validActors(e,...args){return systems.validActors(villageWorld(e),...args)}
