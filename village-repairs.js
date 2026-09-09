import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/repairs.js';
export {REPAIR_RULES,REPAIR_STATES,repairKind} from './ecs/systems/repairs.js';
export function repairSafe(e,...args){return systems.repairSafe(villageWorld(e),...args);}
export function repairDemand(e,...args){return systems.repairDemand(villageWorld(e),...args);}
export function constructionReserve(e,...args){return systems.constructionReserve(villageWorld(e),...args);}
export function fuelReserve(e,...args){return systems.fuelReserve(villageWorld(e),...args);}
export function repairContact(e,...args){return systems.repairContact(villageWorld(e),...args);}
export function spareRepairMaterial(e,...args){return systems.spareRepairMaterial(villageWorld(e),...args);}
export function interruptRepair(e,...args){return systems.interruptRepair(villageWorld(e),...args);}
export function updateRepairs(e,...args){return systems.updateRepairs(villageWorld(e),...args);}
export function handleRepair(e,...args){return systems.handleRepair(villageWorld(e),...args);}
