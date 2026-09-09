import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/feelings.js';
export {FEELING_RULES} from './ecs/feeling-rules.js';
export {directedAttraction,activeHeartbreak,refusingFood,sociallyWithdrawn,emotionalAttachment,clearRomanticFeelings,validFeelings} from './ecs/systems/feelings.js';
export const hurtRomantically=(e,...args)=>systems.hurtRomantically(villageWorld(e),...args);
export const comfortHeartbreak=(e,...args)=>systems.comfortHeartbreak(villageWorld(e),...args);
export const updateFeelings=(e,dt)=>systems.updateFeelings(villageWorld(e),dt);
