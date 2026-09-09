import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/resource-harvesting.js';
export function depleteResource(e,node,options){return systems.depleteResource(villageWorld(e),node,options)}

export function chooseWork(e,worker,options){return systems.chooseWork(villageWorld(e),worker,options)}
export function releaseWork(e,worker){return systems.releaseWork(villageWorld(e),worker)}
