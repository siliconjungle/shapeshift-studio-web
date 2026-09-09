import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/diplomacy.js';
export function diplomacyState(e,...args){return systems.diplomacyState(villageWorld(e),...args);}
export function civilisationBond(e,...args){return systems.civilisationBond(villageWorld(e),...args);}
export function civilisationAttitude(e,...args){return systems.civilisationAttitude(villageWorld(e),...args);}
export function noteDiplomaticIncident(e,...args){return systems.noteDiplomaticIncident(villageWorld(e),...args);}
export function updateDiplomacy(e,...args){return systems.updateDiplomacy(villageWorld(e),...args);}
export function validDiplomacy(e,...args){return systems.validDiplomacy(villageWorld(e),...args);}
export function diplomacyDetails(e,...args){return systems.diplomacyDetails(villageWorld(e),...args);}
export function noteVisitorMiracle(e,...args){return systems.noteVisitorMiracle(villageWorld(e),...args);}
