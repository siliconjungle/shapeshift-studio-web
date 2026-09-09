import {bindAnimalPopulation} from './ecs/animal-entities.js';


import {defineGameData} from './game-data.js';

export const WILDLIFE_RULES=defineGameData('wildlife.rules',{maxAnimals:3,firstAt:24,spawnEvery:95,health:24,hit:12,meat:5,sight:9,walkSpeed:.95,fleeSpeed:2.15,corpseSeconds:2.4});
export const WILDLIFE_SPECIES=defineGameData('wildlife.species',{hearth:{name:'Woodland deer',voice:'wildlife-hearth-v1'},solis:{name:'Dune gazelle',voice:'wildlife-solis-v1'},cryos:{name:'Snow reindeer',voice:'wildlife-cryos-v1'}});

export function wildlifeState(e){e.wildlife??= {animals:[],nextId:0,nextAt:e.time+WILDLIFE_RULES.firstAt,kills:0};return bindAnimalPopulation(e,'Wildlife');}

import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/wildlife.js';
// Public JSON/CLI APIs enter the same world-driven behaviour systems as gameplay.
export function seesWildlife(e,...args){return systems.seesWildlife(villageWorld(e),...args);}
export function wildlifeDisposition(e,...args){return systems.wildlifeDisposition(villageWorld(e),...args);}
export function spawnWildlife(e,...args){return systems.spawnWildlife(villageWorld(e),...args);}
export function interruptWildlife(e,...args){return systems.interruptWildlife(villageWorld(e),...args);}
export function chooseWildlife(e,...args){return systems.chooseWildlife(villageWorld(e),...args);}
export function killWildlife(e,...args){return systems.killWildlife(villageWorld(e),...args);}
export function hitWildlife(e,...args){return systems.hitWildlife(villageWorld(e),...args);}
export function updateWildlife(e,...args){return systems.updateWildlife(villageWorld(e),...args);}
export function handleWildlife(e,...args){return systems.handleWildlife(villageWorld(e),...args);}
export function validWildlife(e,...args){return systems.validWildlife(villageWorld(e),...args);}
