import {villageWorld} from './ecs/village-world.js';
import {bindWatchState} from './ecs/watch-state.js';
import * as systems from './ecs/systems/watch.js';
export {WATCH_RULES} from './ecs/watch-data.js';
// Stable saved data type. All behaviour lives in the watch systems.
export class VillageWatch {}
export function createWatch(life){const state=Object.assign(new VillageWatch(),{life,economy:life.economy,guard:null,relief:null,started:0,reliefAt:0,retryAt:0,handoverAt:0,handovers:0});bindWatchState(state);return state;}
export function watchWorker(state,...args){if(!state)return undefined;return systems.watchWorker(villageWorld(state.economy),...args);}
export function watchAssigned(state,...args){if(!state)return undefined;return systems.watchAssigned(villageWorld(state.economy),...args);}
export function watchActive(state,...args){if(!state)return undefined;return systems.watchActive(villageWorld(state.economy),...args);}
export function watchCandidates(state,...args){if(!state)return undefined;return systems.watchCandidates(villageWorld(state.economy),...args);}
export function watchPrepare(state,...args){if(!state)return undefined;return systems.watchPrepare(villageWorld(state.economy),...args);}
export function watchRelease(state,...args){if(!state)return undefined;return systems.watchRelease(villageWorld(state.economy),...args);}
export function watchUpdate(state,...args){if(!state)return undefined;return systems.watchUpdate(villageWorld(state.economy),...args);}
export function watchHandOver(state,...args){if(!state)return undefined;return systems.watchHandOver(villageWorld(state.economy),...args);}
export function watchPost(state,...args){if(!state)return undefined;return systems.watchPost(villageWorld(state.economy),...args);}
export function watchHandle(state,...args){if(!state)return undefined;return systems.watchHandle(villageWorld(state.economy),...args);}
export function watchSnapshot(state,...args){if(!state)return undefined;return systems.watchSnapshot(villageWorld(state.economy),...args);}
