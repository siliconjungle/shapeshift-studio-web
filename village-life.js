import {restoreHomeEntities} from './ecs/home-entities.js';
import {villageWorld} from './ecs/village-world.js';
import {VillageLife} from './ecs/life-data.js';
import {bindLifeState,lifeWorld} from './ecs/life-state.js';
import * as systems from './ecs/systems/life.js';
export {VillageLife} from './ecs/life-data.js';
export {activityLabel,isCareState} from './village-activity.js';
export {relationshipLabel} from './relationship-label.js';
export function createLife(economy,{homes=[],socialSpots=[],watch=true}={}){
 if(villageWorld(economy).resources.has('Life'))throw Error('Daily life is already active');
 const state=Object.assign(new VillageLife(),{economy,hour:12,day:1,consumed:0,sessions:[],homes:homes.length?homes:[{id:'home',name:'Home',...economy.depot}],socialSpots:socialSpots.length?socialSpots:[economy.depot],relationships:[]});
 bindLifeState(state);systems.initialiseLife(lifeWorld(state),{watch});restoreHomeEntities(economy);return state;
}
export function lifeRelation(state,...args){if(!state)return undefined;return systems.lifeRelation(lifeWorld(state),...args);}
export function lifeAddRelationship(state,...args){if(!state)return undefined;return systems.lifeAddRelationship(lifeWorld(state),...args);}
export function lifeAddSocialMeeting(state,...args){if(!state)return undefined;return systems.lifeAddSocialMeeting(lifeWorld(state),...args);}
export function lifeEmit(state,...args){if(!state)return undefined;return systems.lifeEmit(lifeWorld(state),...args);}
export function lifeUpdate(state,...args){if(!state)return undefined;return systems.lifeUpdate(lifeWorld(state),...args);}
export function lifeIdle(state,...args){if(!state)return undefined;return systems.lifeIdle(lifeWorld(state),...args);}
export function lifeStartRoute(state,...args){if(!state)return undefined;return systems.lifeStartRoute(lifeWorld(state),...args);}
export function lifeRest(state,...args){if(!state)return undefined;return systems.lifeRest(lifeWorld(state),...args);}
export function lifeSocial(state,...args){if(!state)return undefined;return systems.lifeSocial(lifeWorld(state),...args);}
export function lifeCancelSocial(state,...args){if(!state)return undefined;return systems.lifeCancelSocial(lifeWorld(state),...args);}
export function lifeFinishSocial(state,...args){if(!state)return undefined;return systems.lifeFinishSocial(lifeWorld(state),...args);}
export function lifeHandle(state,...args){if(!state)return undefined;return systems.lifeHandle(lifeWorld(state),...args);}
export function lifeSnapshot(state,...args){if(!state)return undefined;return systems.lifeSnapshot(lifeWorld(state),...args);}
