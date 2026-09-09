import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/divine-request.js';
export {DIVINE_REQUEST_RULES,validDivineRequest} from './ecs/systems/divine-request.js';
export function inferDivineRequest(e,...args){return systems.inferDivineRequest(villageWorld(e),...args);}
export function declinedDivineRequest(e,...args){return systems.declinedDivineRequest(villageWorld(e),...args);}
export function answerDivineRequest(e,...args){return systems.answerDivineRequest(villageWorld(e),...args);}
export function observeDivineRequest(e,...args){return systems.observeDivineRequest(villageWorld(e),...args);}
export function fulfilDivineRequest(e,...args){return systems.fulfilDivineRequest(villageWorld(e),...args);}
