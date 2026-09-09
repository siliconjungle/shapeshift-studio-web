import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/support.js';
import {supportVisits} from './ecs/care-entities.js';
import {supportParticipant} from './ecs/support-participants.js';
import {defineGameData} from './game-data.js';
export const SUPPORT_RULES=defineGameData('village-support.SUPPORT_RULES',{visitSeconds:6,interval:2,cooldown:45,retry:6,range:18,defendRange:9,maxVisits:2,griefSeconds:90});
// Stable save type; behaviour lives in systems.
export class VillageSupport {}
export function createSupport(economy){const state=Object.assign(new VillageSupport(),{economy,sessions:[],meals:0,visits:0,comforts:0,defenses:0});supportVisits(state);return state;}
export function supportCloseness(e,...args){if(!e.support)return undefined;return systems.supportCloseness(villageWorld(e),...args);}
export function supportAvailable(e,...args){if(!e.support)return undefined;return systems.supportAvailable(villageWorld(e),...args);}
export function supportNeed(e,...args){if(!e.support)return undefined;return systems.supportNeed(villageWorld(e),...args);}
export function supportNearbySpot(e,...args){if(!e.support)return undefined;return systems.supportNearbySpot(villageWorld(e),...args);}
export function supportStart(e,...args){if(!e.support)return undefined;return systems.supportStart(villageWorld(e),...args);}
export function supportCancel(e,...args){if(!e.support)return undefined;return systems.supportCancel(villageWorld(e),...args);}
export function supportInterrupt(e,...args){if(!e.support)return undefined;return systems.supportInterrupt(villageWorld(e),...args);}
export function supportUpdate(e,...args){if(!e.support)return undefined;return systems.supportUpdate(villageWorld(e),...args);}
export function supportHandle(e,...args){if(!e.support)return undefined;return systems.supportHandle(villageWorld(e),...args);}
export function supportBereave(e,...args){if(!e.support)return undefined;return systems.supportBereave(villageWorld(e),...args);}
export function supportProtection(e,...args){if(!e.support)return undefined;return systems.supportProtection(villageWorld(e),...args);}
export function supportProtect(e,...args){if(!e.support)return undefined;return systems.supportProtect(villageWorld(e),...args);}
export function supportDefended(e,...args){if(!e.support)return undefined;return systems.supportDefended(villageWorld(e),...args);}
export function supportSnapshot(e){const state=e.support;if(!state)return undefined;return {meals:state.meals,visits:state.visits,comforts:state.comforts,defenses:state.defenses,sessions:state.sessions.map(s=>({helperId:s.helper.id,recipientId:s.recipient.id,kind:s.kind,until:s.until,food:supportParticipant(s.helper)?.food??0}))};}
