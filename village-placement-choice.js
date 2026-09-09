import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/placement-choice.js';
export {PLACEMENT_CHOICE_RULES,interruptedTask} from './ecs/systems/placement-choice.js';
export function queuePlacementChoice(e,...args){return systems.queuePlacementChoice(villageWorld(e),...args);}
export function handlePlacementChoice(e,...args){return systems.handlePlacementChoice(villageWorld(e),...args);}
