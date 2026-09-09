import {villageWorld} from './village-world.js';
export function bindRomanceState(state){if(!state||state.life?.economy!==state.economy)throw Error('Invalid romance ownership');villageWorld(state.economy).setResource('Romance',state);return state;}
export function restoreRomanceState(e){const world=villageWorld(e),state=e.life?.romance;if(state){if(state.life!==e.life||state.economy!==e)throw Error('Invalid romance ownership');bindRomanceState(state);}else world.resources.delete('Romance');}
