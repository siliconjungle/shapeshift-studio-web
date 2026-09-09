import {VillageFaith} from './ecs/religion-data.js';
import {bindReligion,religionBinding} from './ecs/religion-state.js';
import * as systems from './ecs/systems/faith.js';
export {VillageFaith} from './ecs/religion-data.js';
export {FAITH_RULES} from './ecs/systems/faith.js';
export function createFaith(e,{shrine,offeringsEnabled=true}={}){const state=new VillageFaith();Object.assign(state,{economy:e,shrine,offeringsEnabled,wishes:systems.FAITH_RULES.initialWishes,offerings:0,nextCheck:0,lastOfferingAt:-Infinity,rain:0,dryFor:0});bindReligion(e,'faith',state);for(const w of e.workers)faithPerson(state,w);return state;}
export function faithPerson(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithPerson(world,id,...args);}
export function faithChange(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithChange(world,id,...args);}
export function faithBenefit(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithBenefit(world,id,...args);}
export function faithWitnesses(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithWitnesses(world,id,...args);}
export function faithBeforeWish(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithBeforeWish(world,id,...args);}
export function faithAfterWish(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithAfterWish(world,id,...args);}
export function faithNotice(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithNotice(world,id,...args);}
export function faithAvailable(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithAvailable(world,id,...args);}
export function faithCancelDisabledOfferings(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithCancelDisabledOfferings(world,id,...args);}
export function faithUpdate(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithUpdate(world,id,...args);}
export function faithStart(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithStart(world,id,...args);}
export function faithInterrupt(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithInterrupt(world,id,...args);}
export function faithHandle(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithHandle(world,id,...args);}
export function faithSnapshot(state,...args){if(state==null)return undefined;const {world,id}=religionBinding(state,'FaithState');return systems.faithSnapshot(world,id,...args);}
