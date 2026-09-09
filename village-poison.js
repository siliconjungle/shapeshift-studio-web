import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/poison.js';
export {POISON_RULES} from './ecs/poison-data.js';
export {poisoned,poisonRate,poisonDescription} from './ecs/systems/poison.js';
export function applyPoison(e,...args){return systems.applyPoison(villageWorld(e),...args)}
export function clearPoison(e,...args){return systems.clearPoison(villageWorld(e),...args)}
export function endPoisonCare(e,...args){return systems.endPoisonCare(villageWorld(e),...args)}
export function updatePoison(e,...args){return systems.updatePoison(villageWorld(e),...args)}
export function handlePoisonCare(e,...args){return systems.handlePoisonCare(villageWorld(e),...args)}
export function validPoison(e,...args){return systems.validPoison(villageWorld(e),...args)}
