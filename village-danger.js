import {dangerEntities,dangerAwareness} from './ecs/danger-entities.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/danger.js';
import {defineGameData} from './game-data.js';
export const DANGER_RULES=defineGameData('village-danger.DANGER_RULES',{radius:4.5,memoryLimit:4,retry:8,companionRange:18,meetingSeconds:1.2,maxSeparation:2.8,tripTimeout:70});
// Stable save type; components and resources contain data, systems own behaviour.
export class VillageDanger {}
export function createDanger(economy){const state=Object.assign(new VillageDanger(),{economy,trips:[],nextCheck:0,cleared:0,accompanied:0});dangerEntities(state);return state;}
export function dangerSourceKey(e,...args){if(!e.danger)return undefined;return systems.dangerSourceKey(villageWorld(e),...args);}
export function dangerIsActive(e,...args){if(!e.danger)return undefined;return systems.dangerIsActive(villageWorld(e),...args);}
export function dangerRemember(e,...args){if(!e.danger)return undefined;return systems.dangerRemember(villageWorld(e),...args);}
export function dangerRisk(e,...args){if(!e.danger)return undefined;return systems.dangerRisk(villageWorld(e),...args);}
export function dangerRefresh(e,...args){if(!e.danger)return undefined;return systems.dangerRefresh(villageWorld(e),...args);}
export function dangerCapable(e,...args){if(!e.danger)return undefined;return systems.dangerCapable(villageWorld(e),...args);}
export function dangerCompanion(e,...args){if(!e.danger)return undefined;return systems.dangerCompanion(villageWorld(e),...args);}
export function dangerBeside(e,...args){if(!e.danger)return undefined;return systems.dangerBeside(villageWorld(e),...args);}
export function dangerAbandon(e,...args){if(!e.danger)return undefined;return systems.dangerAbandon(villageWorld(e),...args);}
export function dangerRequest(e,...args){if(!e.danger)return undefined;return systems.dangerRequest(villageWorld(e),...args);}
export function dangerCancel(e,...args){if(!e.danger)return undefined;return systems.dangerCancel(villageWorld(e),...args);}
export function dangerInterrupt(e,...args){if(!e.danger)return undefined;return systems.dangerInterrupt(villageWorld(e),...args);}
export function dangerUpdate(e,...args){if(!e.danger)return undefined;return systems.dangerUpdate(villageWorld(e),...args);}
export function dangerArrive(e,...args){if(!e.danger)return undefined;return systems.dangerArrive(villageWorld(e),...args);}
export function dangerHandle(e,...args){if(!e.danger)return undefined;return systems.dangerHandle(villageWorld(e),...args);}
export function dangerSnapshot(e){const state=e.danger;if(!state)return undefined;return {cleared:state.cleared,accompanied:state.accompanied,memories:e.workers.flatMap(w=>(dangerAwareness(w)?.memories??[]).map(m=>({workerId:w.id,...m}))),trips:state.trips.map(t=>({leaderId:t.leader.id,companionId:t.buddy.id,phase:t.phase,goal:t.goal,source:t.memory.key}))};}
