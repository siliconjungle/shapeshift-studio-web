import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/relic-politics.js';
export {RELIC_POLITICS_RULES} from './ecs/systems/relic-politics.js';
export function learnRelicRumour(e,...args){return systems.learnRelicRumour(villageWorld(e),...args);}
export function relicMissionIntent(e,...args){return systems.relicMissionIntent(villageWorld(e),...args);}
export function assignRelicMission(e,...args){return systems.assignRelicMission(villageWorld(e),...args);}
export function returnRelicFromVisit(e,...args){return systems.returnRelicFromVisit(villageWorld(e),...args);}
export function bringRelicOnVisit(e,...args){return systems.bringRelicOnVisit(villageWorld(e),...args);}
export function resolveRelicRequest(e,...args){return systems.resolveRelicRequest(villageWorld(e),...args);}
export function handleRelicVisitor(e,...args){return systems.handleRelicVisitor(villageWorld(e),...args);}
export function updateRelicPolitics(e,...args){return systems.updateRelicPolitics(villageWorld(e),...args);}
export function validRelicPolitics(e,...args){return systems.validRelicPolitics(villageWorld(e),...args);}
