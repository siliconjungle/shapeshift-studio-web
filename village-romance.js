import {villageWorld} from './ecs/village-world.js';
import {bindRomanceState} from './ecs/romance-state.js';
import * as systems from './ecs/systems/romance.js';
export {ROMANCE_RULES} from './ecs/romance-rules.js';
export {canFormAdultPair,areRelated,hasUnrelatedOption,canRomance} from './ecs/systems/romance.js';
export class VillageRomance {}
export function createRomance(life){return bindRomanceState(Object.assign(new VillageRomance(),{life,economy:life.economy}));}
export function romancePartner(state,...args){if(!state)return undefined;return systems.romancePartner(villageWorld(state.economy),...args);}
export function romanceWilling(state,...args){if(!state)return undefined;return systems.romanceWilling(villageWorld(state.economy),...args);}
export function romanceHeartbreak(state,...args){if(!state)return undefined;return systems.romanceHeartbreak(villageWorld(state.economy),...args);}
export function romanceBetray(state,...args){if(!state)return undefined;return systems.romanceBetray(villageWorld(state.economy),...args);}
export function romanceBreakUp(state,...args){if(!state)return undefined;return systems.romanceBreakUp(villageWorld(state.economy),...args);}
export function romanceResolve(state,...args){if(!state)return undefined;return systems.romanceResolve(villageWorld(state.economy),...args);}
