

import {defineGameData} from './game-data.js';

import {WORLD_BOUNDS} from './village-layout.js';

export const DISCOVERY_RULES=defineGameData('village-discovery.DISCOVERY_RULES',{maxChests:12,firstSpawn:8,respawn:170,minimumDistance:12,spacing:10,openSeconds:3.2,lockedChance:1/3,keyFirstSpawn:90,keyRespawn:180,maxLooseKeys:2,maxKeys:4});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const states=new Set(['discovery-bound','discovering','treasure-wait','scouting','finding-bound','finding-study']);

import {bindEnvironment,environmentBinding} from './ecs/environment-entities.js';
import * as systems from './ecs/systems/discovery.js';
// Stable save type; behaviour executes in world-first systems.
export class VillageDiscovery {}
export function createDiscovery(e,{bounds=WORLD_BOUNDS}={}){const state=new VillageDiscovery();
state.economy=e;state.bounds=bounds;state.chests=[];state.nextId=0;state.nextSpawn=e.time+DISCOVERY_RULES.firstSpawn;state.opened=0;state.nextKeySpawn=e.time+DISCOVERY_RULES.keyFirstSpawn
 bindEnvironment(state,'Discovery');return state;
}
export function discoveryClear(state,...args){if(state==null)return undefined;return systems.discoveryClear(environmentBinding(state).world,...args);}
export function discoverySpawn(state,...args){if(state==null)return undefined;return systems.discoverySpawn(environmentBinding(state).world,...args);}
export function discoveryKeysAvailable(state,...args){if(state==null)return undefined;return systems.discoveryKeysAvailable(environmentBinding(state).world,...args);}
export function discoverySpawnKey(state,...args){if(state==null)return undefined;return systems.discoverySpawnKey(environmentBinding(state).world,...args);}
export function discoveryUpdate(state,...args){if(state==null)return undefined;return systems.discoveryUpdate(environmentBinding(state).world,...args);}
export function discoveryCapable(state,...args){if(state==null)return undefined;return systems.discoveryCapable(environmentBinding(state).world,...args);}
export function discoveryChoose(state,...args){if(state==null)return undefined;return systems.discoveryChoose(environmentBinding(state).world,...args);}
export function discoveryInterrupt(state,...args){if(state==null)return undefined;return systems.discoveryInterrupt(environmentBinding(state).world,...args);}
export function discoveryOpen(state,...args){if(state==null)return undefined;return systems.discoveryOpen(environmentBinding(state).world,...args);}
export function discoveryHandle(state,...args){if(state==null)return undefined;return systems.discoveryHandle(environmentBinding(state).world,...args);}
export function discoverySnapshot(state,...args){if(state==null)return undefined;return systems.discoverySnapshot(environmentBinding(state).world,...args);}

// Old villages predate keys: their existing chests remain unlocked.
export function validDiscoveryKeys(e){
 e.stock.key??=0;
 if(!Number.isSafeInteger(e.stock.key)||e.stock.key<0)return false;
 if(e.discovery){
  if(e.discovery.nextKeySpawn!==undefined&&(!Number.isFinite(e.discovery.nextKeySpawn)||e.discovery.nextKeySpawn<0))return false;
  for(const c of e.discovery.chests){c.locked??=false;if(typeof c.locked!=='boolean')return false;}
 }
 return [...(e.survival?.drops??[]),...e.workers.map(w=>w.cargo).filter(Boolean)].every(d=>d.kind!=='key'||Number.isSafeInteger(d.amount)&&d.amount>0);
}
