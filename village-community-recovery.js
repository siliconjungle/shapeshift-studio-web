import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/community-recovery.js';
export function recoveringVillager(e,...args){return systems.recoveringVillager(villageWorld(e),...args);}
export function noteHomeDisaster(e,...args){return systems.noteHomeDisaster(villageWorld(e),...args);}
export function restoreGuestHomes(e,...args){return systems.restoreGuestHomes(villageWorld(e),...args);}
export function shareEmergencyShelter(e,...args){return systems.shareEmergencyShelter(villageWorld(e),...args);}
export function disasterRepairPriority(e,...args){return systems.disasterRepairPriority(villageWorld(e),...args);}
export function recoveryBond(e,...args){return systems.recoveryBond(villageWorld(e),...args);}
export function noticeCommunityRecovery(e,...args){return systems.noticeCommunityRecovery(villageWorld(e),...args);}
export function updateCommunityRecovery(e,...args){return systems.updateCommunityRecovery(villageWorld(e),...args);}
export function validCommunityRecovery(e,...args){return systems.validCommunityRecovery(villageWorld(e),...args);}
