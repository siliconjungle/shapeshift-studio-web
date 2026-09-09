import {enemyEntities} from './ecs/enemy-entities.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/slimes.js';
import {defineGameData} from './game-data.js';
import {WORLD_BOUNDS} from './village-layout.js';
const clamp=t=>Math.max(0,Math.min(1,t));
export const SLIME_TYPES=defineGameData('village-slimes.SLIME_TYPES',{
 large:{name:'Great ink slime',health:72,scale:1.35,speed:.72,damage:7,child:'normal'},
 normal:{name:'Ink slime',health:36,scale:1,speed:.84,damage:5,child:'small'},
 small:{name:'Small ink slime',health:18,scale:.72,speed:.96,damage:3,child:'mini'},
 mini:{name:'Ink droplet',health:12,scale:.48,speed:1.08,damage:2}
});
export const SLIME_RULES=defineGameData('village-slimes.SLIME_RULES',{firstMin:150,firstMax:240,intervalMin:420,intervalMax:720,maxAlive:8,lifetime:240,notice:3.8,assist:5.5,leash:7,windup:.72,cooldown:2.25,flightDuration:1});
export function slimeFlightHeight(t){t=clamp(t);return t<.6?.85*(1-(1-t/.6)**3):.85*(1-((t-.6)/.4)**3)}
// Stable save type; behaviour belongs to systems.
export class VillageSlimes {}
export function createSlimes(e,{bounds=WORLD_BOUNDS,firstDelay,intervalMin=SLIME_RULES.intervalMin,intervalMax=SLIME_RULES.intervalMax}={}){const state=Object.assign(new VillageSlimes(),{economy:e,bounds,enemies:[],nextId:0,encounters:0,intervalMin,intervalMax});state.nextAt=e.time+(firstDelay??SLIME_RULES.firstMin+(SLIME_RULES.firstMax-SLIME_RULES.firstMin)*e.random());enemyEntities(state,'Slime');return state;}
export function slimeRoll(state,...args){if(!state)return undefined;return systems.slimeRoll(villageWorld(state.economy),...args);}
export function slimeCue(state,...args){if(!state)return undefined;return systems.slimeCue(villageWorld(state.economy),...args);}
export function slimeSupported(state,...args){if(!state)return undefined;return systems.slimeSupported(villageWorld(state.economy),...args);}
export function slimeClear(state,...args){if(!state)return undefined;return systems.slimeClear(villageWorld(state.economy),...args);}
export function slimeSpawn(state,...args){if(!state)return undefined;return systems.slimeSpawn(villageWorld(state.economy),...args);}
export function slimeTrySpawn(state,...args){if(!state)return undefined;return systems.slimeTrySpawn(villageWorld(state.economy),...args);}
export function slimeThreatFor(state,...args){if(!state)return undefined;return systems.slimeThreatFor(villageWorld(state.economy),...args);}
export function slimeDamage(state,...args){if(!state)return undefined;return systems.slimeDamage(villageWorld(state.economy),...args);}
export function slimeMove(state,...args){if(!state)return undefined;return systems.slimeMove(villageWorld(state.economy),...args);}
export function slimeUpdate(state,...args){if(!state)return undefined;return systems.slimeUpdate(villageWorld(state.economy),...args);}
export function slimeSnapshot(state,...args){if(!state)return undefined;return systems.slimeSnapshot(villageWorld(state.economy),...args);}
