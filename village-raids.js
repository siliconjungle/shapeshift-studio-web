import {enemyEntities} from './ecs/enemy-entities.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/raiders.js';
import {defineGameData} from './game-data.js';
export const RAID_RULES=defineGameData('village-raids.RAID_RULES',{health:36,damage:12,windup:.8,cooldown:2.2,alarmDuration:10});
export const isRaidNight=hour=>hour>=20.5||hour<6;
// Stable save type; behaviour belongs to systems.
export class VillageRaids {}
export function createRaids(e,{entrances=[{x:-12,z:6},{x:10,z:10}],delay=18}={}){const state=Object.assign(new VillageRaids(),{economy:e,entrances,delay,enemies:[],nextId:0,alarmUntil:0,nightTime:0,wasNight:false,spawned:false,nights:0});enemyEntities(state,'Raider');return state;}
export function raiderCue(state,...args){if(!state)return undefined;return systems.raiderCue(villageWorld(state.economy),...args);}
export function raiderSpawn(state,...args){if(!state)return undefined;return systems.raiderSpawn(villageWorld(state.economy),...args);}
export function raiderAlarm(state,...args){if(!state)return undefined;return systems.raiderAlarm(villageWorld(state.economy),...args);}
export function raiderFlee(state,...args){if(!state)return undefined;return systems.raiderFlee(villageWorld(state.economy),...args);}
export function raiderDamage(state,...args){if(!state)return undefined;return systems.raiderDamage(villageWorld(state.economy),...args);}
export function raiderMove(state,...args){if(!state)return undefined;return systems.raiderMove(villageWorld(state.economy),...args);}
export function raiderSpawnWave(state,...args){if(!state)return undefined;return systems.raiderSpawnWave(villageWorld(state.economy),...args);}
export function raiderUpdate(state,...args){if(!state)return undefined;return systems.raiderUpdate(villageWorld(state.economy),...args);}
export function raiderSnapshot(state,...args){if(!state)return undefined;return systems.raiderSnapshot(villageWorld(state.economy),...args);}
