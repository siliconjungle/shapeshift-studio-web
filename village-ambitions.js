import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/ambitions.js';
export {ambitionLabel,ambitionWorkBias,ambitionSocialBias,validAmbitions} from './ecs/systems/ambitions.js';
export function finishAmbition(e,...args){return systems.finishAmbition(villageWorld(e),...args);}
export function updateAmbitions(e,...args){return systems.updateAmbitions(villageWorld(e),...args);}
export function noticeAmbitionEvent(e,...args){return systems.noticeAmbitionEvent(villageWorld(e),...args);}
export function pursueAmbition(e,...args){return systems.pursueAmbition(villageWorld(e),...args);}
