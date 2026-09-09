import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/shelter.js';
export {SHELTER_RULES,homePosition,homeFire,unsafeHome} from './ecs/systems/shelter.js';
export function shelterState(e,...args){return systems.shelterState(villageWorld(e),...args);}
export function sleepingHome(e,...args){return systems.sleepingHome(villageWorld(e),...args);}
export function assignBeds(e,...args){return systems.assignBeds(villageWorld(e),...args);}
export function igniteHouse(e,...args){return systems.igniteHouse(villageWorld(e),...args);}
export function damageHouse(e,...args){return systems.damageHouse(villageWorld(e),...args);}
export function updateShelter(e,...args){return systems.updateShelter(villageWorld(e),...args);}
