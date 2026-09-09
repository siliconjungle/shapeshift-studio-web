import {villageWorld} from './village-world.js';
const personId=id=>id===null||Number.isSafeInteger(id)&&id>=0;
export function validWatchState(state){return state!==null&&typeof state==='object'&&personId(state.guard)&&personId(state.relief)&&['started','reliefAt','retryAt','handoverAt'].every(k=>Number.isFinite(state[k])&&state[k]>=0)&&Number.isSafeInteger(state.handovers)&&state.handovers>=0;}
export function bindWatchState(state){
 if(!validWatchState(state)||state.life?.economy!==state.economy)throw Error('Invalid night watch state');
 const world=villageWorld(state.economy),life=state.life;world.setResource('Watch',state);
 // This is a projection of the canonical resource. Disabling the watch removes it.
 Object.defineProperty(life,'watch',{enumerable:true,configurable:true,get(){const current=world.resources.get('Watch');return current?.life===life?current:null;},set(next){
  if(next===null||next===undefined){if(world.resources.get('Watch')?.life===life)world.resources.delete('Watch');return;}
  if(next.life!==life||next.economy!==state.economy||!validWatchState(next))throw Error('Invalid night watch ownership');world.setResource('Watch',next);
 }});return state;
}
export function restoreWatchState(e){
 const state=e.life?.watch,world=villageWorld(e);
 if(state){if(state.life!==e.life||state.economy!==e)throw Error('Invalid night watch ownership');bindWatchState(state);}
 else world.resources.delete('Watch');
}
