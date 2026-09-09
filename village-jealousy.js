import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/jealousy.js';
export {JEALOUSY_RULES,jealousyOf,strongestJealousy} from './ecs/systems/jealousy.js';
export const noticeFavor=(faith,c,check)=>systems.noticeFavor(villageWorld(faith.economy),faith,c,check);
export const settleJealousy=(e,dt)=>systems.settleJealousy(villageWorld(e),dt);
export const jealousAccusation=(e,leader,eligible)=>systems.jealousAccusation(villageWorld(e),leader,eligible);
export const recordJealousAccusation=(e,r,accusation)=>systems.recordJealousAccusation(villageWorld(e),r,accusation);
