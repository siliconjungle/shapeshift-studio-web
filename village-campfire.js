import {VillageCampfire} from './ecs/campfire-data.js';
import {bindCampfire,campfireBinding} from './ecs/campfire-entities.js';
import * as systems from './ecs/systems/campfire.js';
export {VillageCampfire} from './ecs/campfire-data.js';
export {CAMPFIRE_RULES} from './ecs/systems/campfire.js';
export function createCampfire(e,point){return bindCampfire(e,Object.assign(new VillageCampfire(),{economy:e},point,{built:point.built===true,stoneUsed:0,lit:false,fuel:0,woodUsed:0,tender:null,wetUntil:0,rain:0,rainExposure:0,extinguished:0}));}
export function campfireStoneCost(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireStoneCost(world,id,...args);}
export function campfireDry(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireDry(world,id,...args);}
export function campfireSocialSpots(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireSocialSpots(world,id,...args);}
export function campfireSeat(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireSeat(world,id,...args);}
export function campfireUpdate(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireUpdate(world,id,...args);}
export function campfireFinish(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireFinish(world,id,...args);}
export function campfireTakeMeal(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireTakeMeal(world,id,...args);}
export function campfireHandle(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireHandle(world,id,...args);}
export function campfireSnapshot(state,...args){if(state==null)return undefined;const {world,id}=campfireBinding(state);return systems.campfireSnapshot(world,id,...args);}
