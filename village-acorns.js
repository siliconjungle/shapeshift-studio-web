import {defineGameData} from './game-data.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/oaks.js';
export const ACORN_RULES=defineGameData('village-acorns.ACORN_RULES',{maxWaiting:4,matureHeight:5.8,spacing:4.6,footprint:2.2,growSeconds:150,tendAfter:24,tendBonus:32,reach:1.05});
export const OAK_WORK_STATES=new Set(['oak-bound','oak-digging','oak-planting','oak-tending']);
export {waitingAcorn} from './ecs/systems/oaks.js';
export function hasOakRoom(e,...args){return systems.hasOakRoom(villageWorld(e),...args)}
export function acornTarget(e,...args){return systems.acornTarget(villageWorld(e),...args)}
export function placeAcorn(e,...args){return systems.placeAcorn(villageWorld(e),...args)}
export function interruptOak(e,...args){return systems.interruptOak(villageWorld(e),...args)}
export function updateAcorns(e,...args){return systems.updateAcorns(villageWorld(e),...args)}
export function handleOak(e,...args){return systems.handleOak(villageWorld(e),...args)}
export function chooseOak(e,...args){return systems.chooseOak(villageWorld(e),...args)}
export function validAcorns(e,...args){return systems.validAcorns(villageWorld(e),...args)}
