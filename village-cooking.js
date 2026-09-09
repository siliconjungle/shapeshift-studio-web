import {VillageCooking} from './ecs/cooking-data.js';
import {bindCooking,cookingBinding} from './ecs/cooking-entities.js';
import * as systems from './ecs/systems/cooking.js';
export {VillageCooking} from './ecs/cooking-data.js';
export {COOKING_RULES} from './ecs/systems/cooking.js';
export function createCooking(economy,fire=null){return bindCooking(economy,Object.assign(new VillageCooking(),{economy,fire,placed:false,cookId:null,ingredients:0,progress:0,servings:0,batches:0,meals:0,after:12,nextSound:0,readyAt:0,potDrop:null}));}
export function cookingSiteFire(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingSiteFire(world,id,...args);}
export function cookingSiteId(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingSiteId(world,id,...args);}
export function cookingPoint(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingPoint(world,id,...args);}
export function cookingStatus(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingStatus(world,id,...args);}
export function cookingSafe(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingSafe(world,id,...args);}
export function cookingWell(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingWell(world,id,...args);}
export function cookingAvailable(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingAvailable(world,id,...args);}
export function cookingBatchSize(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingBatchSize(world,id,...args);}
export function cookingWantsHeat(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingWantsHeat(world,id,...args);}
export function cookingSpot(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingSpot(world,id,...args);}
export function cookingSeat(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingSeat(world,id,...args);}
export function cookingRoute(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingRoute(world,id,...args);}
export function cookingInterrupt(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingInterrupt(world,id,...args);}
export function cookingFinish(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingFinish(world,id,...args);}
export function cookingUpdate(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingUpdate(world,id,...args);}
export function cookingHandle(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingHandle(world,id,...args);}
export function cookingSnapshot(row,...args){if(row==null)return undefined;const {world,id}=cookingBinding(row);return systems.cookingSnapshot(world,id,...args);}
