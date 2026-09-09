import {villageWorld} from './ecs/village-world.js';
import {VillageBeasts} from './ecs/beasts-data.js';
import {bindBeastsState,beastsWorld} from './ecs/beasts-state.js';
import * as systems from './ecs/systems/beasts.js';
export {VillageBeasts} from './ecs/beasts-data.js';
export {BEAST_RULES} from './ecs/systems/beasts.js';
export function createBeasts(economy){
 if(villageWorld(economy).resources.has('Beasts'))throw Error('Beasts are already active');
 return bindBeastsState(Object.assign(new VillageBeasts(),{economy,actors:[],progress:0,countedIds:[],nextId:0,summons:0,retryAt:0}));
}
export function beastsLiving(state,...args){if(!state)return undefined;return systems.beastsLiving(beastsWorld(state),...args);}
export function beastsRitualCompleted(state,...args){if(!state)return undefined;return systems.beastsRitualCompleted(beastsWorld(state),...args);}
export function beastsObstacles(state,...args){if(!state)return undefined;return systems.beastsObstacles(beastsWorld(state),...args);}
export function beastsSupported(state,...args){if(!state)return undefined;return systems.beastsSupported(beastsWorld(state),...args);}
export function beastsStoreRoute(state,...args){if(!state)return undefined;return systems.beastsStoreRoute(beastsWorld(state),...args);}
export function beastsRoute(state,...args){if(!state)return undefined;return systems.beastsRoute(beastsWorld(state),...args);}
export function beastsSummonPoint(state,...args){if(!state)return undefined;return systems.beastsSummonPoint(beastsWorld(state),...args);}
export function beastsTrySummon(state,...args){if(!state)return undefined;return systems.beastsTrySummon(beastsWorld(state),...args);}
export function beastsReinforce(state,...args){if(!state)return undefined;return systems.beastsReinforce(beastsWorld(state),...args);}
export function beastsCue(state,...args){if(!state)return undefined;return systems.beastsCue(beastsWorld(state),...args);}
export function beastsInterrupt(state,...args){if(!state)return undefined;return systems.beastsInterrupt(beastsWorld(state),...args);}
export function beastsDamage(state,...args){if(!state)return undefined;return systems.beastsDamage(beastsWorld(state),...args);}
export function beastsMove(state,...args){if(!state)return undefined;return systems.beastsMove(beastsWorld(state),...args);}
export function beastsEnemies(state,...args){if(!state)return undefined;return systems.beastsEnemies(beastsWorld(state),...args);}
export function beastsThreat(state,...args){if(!state)return undefined;return systems.beastsThreat(beastsWorld(state),...args);}
export function beastsFight(state,...args){if(!state)return undefined;return systems.beastsFight(beastsWorld(state),...args);}
export function beastsLash(state,...args){if(!state)return undefined;return systems.beastsLash(beastsWorld(state),...args);}
export function beastsStartLash(state,...args){if(!state)return undefined;return systems.beastsStartLash(beastsWorld(state),...args);}
export function beastsDecide(state,...args){if(!state)return undefined;return systems.beastsDecide(beastsWorld(state),...args);}
export function beastsForage(state,...args){if(!state)return undefined;return systems.beastsForage(beastsWorld(state),...args);}
export function beastsUpdate(state,...args){if(!state)return undefined;return systems.beastsUpdate(beastsWorld(state),...args);}
export function beastsSnapshot(state,...args){if(!state)return undefined;return systems.beastsSnapshot(beastsWorld(state),...args);}
