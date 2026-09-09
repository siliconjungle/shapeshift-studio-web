import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/age.js';
export {AGE_RULES} from './ecs/age-rules.js';
export {initialiseAge,ageMovementRate,ageWorkRate,familyRelation,ageWishTarget} from './ecs/systems/age.js';
export const matureVillager=(e,w)=>systems.matureVillager(villageWorld(e),w);
export const updateAges=(e,dt)=>systems.updateAges(villageWorld(e),dt);
export const changeVillagerAge=(e,w,kind)=>systems.changeVillagerAge(villageWorld(e),w,kind);
