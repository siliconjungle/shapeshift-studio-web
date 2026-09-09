import {familyConfiguration} from "./ecs/family-entities.js";
import {personAge} from './ecs/person-age.js';
import {initialiseCombatStyle} from './village-archery.js';
import {defineGameData} from './game-data.js';
import {createChildcare,housingCapacity} from './village-childcare.js';
import {canRomance} from './village-romance.js';
import {villageWorld} from './ecs/village-world.js';
import {familyEntities} from './ecs/family-entities.js';
import * as systems from './ecs/systems/family.js';
export const FAMILY_RULES=defineGameData('village-family.FAMILY_RULES',{food:8,arrivalDelay:18,childhood:90,birthGap:100,visitGap:32});
export function canHaveOffspring(e,a,b){
 if(a?.species==='beast'||b?.species==='beast')return false;
 return !(personAge(a)?.elder)&&!(personAge(b)?.elder)&&canRomance(e,a,b)&&(a.sex==='female'&&b.sex==='male'||a.sex==='male'&&b.sex==='female');
}
// Stable save type only: family state has no behaviour methods or derived getters.
export {VillageFamily} from './ecs/family-data.js';
import {VillageFamily} from './ecs/family-data.js';
export function createFamily(economy,{capacity=Infinity}={}){
 const state=Object.assign(new VillageFamily(),{economy,care:createChildcare(economy),populationLimit:capacity,parents:economy.workers.slice(0,2).map(w=>w.id),pending:null,nextVisit:8,nextBirth:0,birthCooldowns:new Map(),born:0,foodConsumed:0});
 familyEntities(state,{creating:true});systems.initialiseFamily(villageWorld(economy));return state;
}
export function familyCapacity(e){return e.family?Math.min((familyConfiguration(e.family).populationLimit),housingCapacity(e.life?.homes??[])):undefined;}
export function familyUpdate(e,dt){if(!e.family)return undefined;return systems.familyUpdate(villageWorld(e),dt);}
export function familyRoomForFamily(e,home,parents){if(!e.family)return undefined;return systems.familyRoomForFamily(villageWorld(e),home,parents);}
export function familyFoodRequired(e){if(!e.family)return undefined;return systems.familyFoodRequired(villageWorld(e));}
export function familyHandle(e,w,dt){if(!e.family)return undefined;return systems.familyHandle(villageWorld(e),w,dt);}
export function familySnapshot(e){if(!e.family)return undefined;return systems.familySnapshot(villageWorld(e));}
