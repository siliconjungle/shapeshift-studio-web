import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/prayers.js';
export function interruptPrayer(e,...args){return systems.interruptPrayer(villageWorld(e),...args);}
export function prayerNeed(e,...args){return systems.prayerNeed(villageWorld(e),...args);}
export function updatePrayers(e,...args){return systems.updatePrayers(villageWorld(e),...args);}
export function handlePrayer(e,...args){return systems.handlePrayer(villageWorld(e),...args);}
