import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/curses.js';
export {CURSE_RULES,isCursed,curseRemaining,curseDescription,curseSkullVisible,curseFeedbackEvents} from './ecs/systems/curses.js';
export function curseActors(e,...args){return systems.curseActors(villageWorld(e),...args);}
export function applyCurse(e,...args){return systems.applyCurse(villageWorld(e),...args);}
export function clearCurse(e,...args){return systems.clearCurse(villageWorld(e),...args);}
export function noticeCurseEvent(e,...args){return systems.noticeCurseEvent(villageWorld(e),...args);}
export function curseFumbles(e,...args){return systems.curseFumbles(villageWorld(e),...args);}
export function curseAccident(e,...args){return systems.curseAccident(villageWorld(e),...args);}
export function curseSocialResponse(e,...args){return systems.curseSocialResponse(villageWorld(e),...args);}
export function handleCurseCare(e,...args){return systems.handleCurseCare(villageWorld(e),...args);}
export function updateCurses(e,...args){return systems.updateCurses(villageWorld(e),...args);}
export function cursedAnimalThreat(e,...args){return systems.cursedAnimalThreat(villageWorld(e),...args);}
export function validCurses(e,...args){return systems.validCurses(villageWorld(e),...args);}
