import {VillageOccasions} from './ecs/community-data.js';
import {bindCommunity,communityBinding} from './ecs/community-entities.js';
import * as systems from './ecs/systems/occasions.js';
export {VillageOccasions} from './ecs/community-data.js';
export {OCCASION_RULES} from './ecs/systems/occasions.js';
export function createOccasions(e){const state=new VillageOccasions();state.economy=e;state.queue=[];state.recent=[];state.session=null;state.nextCheck=0;state.after=0;state.completed={house:0,birth:0,memorial:0};state.meals=0;return bindCommunity(e,'OccasionsState',state);}
export function occasionsNotice(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsNotice(world,id,...args);}
export function occasionsSubject(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsSubject(world,id,...args);}
export function occasionsCenter(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsCenter(world,id,...args);}
export function occasionsSafe(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsSafe(world,id,...args);}
export function occasionsWell(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsWell(world,id,...args);}
export function occasionsAvailable(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsAvailable(world,id,...args);}
export function occasionsSpot(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsSpot(world,id,...args);}
export function occasionsPlans(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsPlans(world,id,...args);}
export function occasionsAdmit(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsAdmit(world,id,...args);}
export function occasionsStart(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsStart(world,id,...args);}
export function occasionsLeave(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsLeave(world,id,...args);}
export function occasionsCancel(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsCancel(world,id,...args);}
export function occasionsInterrupt(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsInterrupt(world,id,...args);}
export function occasionsFace(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsFace(world,id,...args);}
export function occasionsBegin(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsBegin(world,id,...args);}
export function occasionsFinish(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsFinish(world,id,...args);}
export function occasionsUpdate(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsUpdate(world,id,...args);}
export function occasionsHandle(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsHandle(world,id,...args);}
export function occasionsSnapshot(state,...args){if(state==null)return undefined;const {world,id}=communityBinding(state,'OccasionsState');return systems.occasionsSnapshot(world,id,...args);}
