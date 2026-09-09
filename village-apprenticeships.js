import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/apprenticeships.js';
export {validApprenticeship} from './ecs/systems/apprenticeships.js';
export function updateApprenticeships(e,...args){return systems.updateApprenticeships(villageWorld(e),...args);}
export function handleApprenticeship(e,...args){return systems.handleApprenticeship(villageWorld(e),...args);}
export function handleMentor(e,...args){return systems.handleMentor(villageWorld(e),...args);}
