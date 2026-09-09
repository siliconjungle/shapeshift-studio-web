import {defineGameData} from './game-data.js';
import {villageWorld} from './ecs/village-world.js';
import {personKinship} from './ecs/person-kinship.js';
import {validAdoptiveParents} from './ecs/kinship-data.js';
import {adoptionUpdate} from './ecs/systems/adoption.js';
export const ADOPTION_RULES=defineGameData('village-adoption.ADOPTION_RULES',Object.freeze({settle:6,retry:3}));
export const updateAdoptions=e=>adoptionUpdate(villageWorld(e));
export const validAdoption=w=>validAdoptiveParents(w,personKinship(w)?.adoptiveParents);
