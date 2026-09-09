import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/rival-needs.js';
export {validRivalNeeds} from './ecs/systems/rival-needs.js';
export function rivalNeeds(e,...args){return systems.rivalNeeds(villageWorld(e),...args);}
export function chooseRivalMotive(e,...args){return systems.chooseRivalMotive(villageWorld(e),...args);}
export function progressRivalNeeds(e,...args){return systems.progressRivalNeeds(villageWorld(e),...args);}
export function rivalTradeOffer(e,...args){return systems.rivalTradeOffer(villageWorld(e),...args);}
export function noteRivalTrade(e,...args){return systems.noteRivalTrade(villageWorld(e),...args);}
export function returnRivalCargo(e,...args){return systems.returnRivalCargo(villageWorld(e),...args);}
