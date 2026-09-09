import {villageWorld} from './ecs/village-world.js';
import {memoryContacts} from './ecs/memory-contacts.js';
import * as systems from './ecs/systems/memory.js';
export {MEMORY_RULES,memoryDescription} from './ecs/social-memory-data.js';
export class VillageMemory {}
export function createMemory(e){const state=Object.assign(new VillageMemory(),{economy:e,pairs:new Map()});memoryContacts(state);return state;}
export function memoryRemember(state,...args){if(!state)return undefined;return systems.memoryRemember(villageWorld(state.economy),...args);}
export function memoryCount(state,...args){if(!state)return undefined;return systems.memoryCount(villageWorld(state.economy),...args);}
export function memoryFeeling(state,...args){if(!state)return undefined;return systems.memoryFeeling(villageWorld(state.economy),...args);}
export function memoryMutual(state,...args){if(!state)return undefined;return systems.memoryMutual(villageWorld(state.economy),...args);}
export function memoryUpdate(state,...args){if(!state)return undefined;return systems.memoryUpdate(villageWorld(state.economy),...args);}
