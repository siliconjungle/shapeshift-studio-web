import {VillageSurvival} from './ecs/survival-data.js';
import {bindSurvivalState,survivalWorld} from './ecs/survival-state.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/survival.js';
export {VillageSurvival,SURVIVAL_RULES,isAlive} from './ecs/survival-data.js';
export function createSurvival(economy){
 if(villageWorld(economy).resources.has('Survival'))throw Error('Survival is already active');
 const state=Object.assign(new VillageSurvival(),{economy,drops:[],memorials:[],deaths:0,nextDrop:0});
 bindSurvivalState(state);systems.initialiseSurvival(survivalWorld(state));return state;
}
export function survivalInitialise(state,...args){if(!state)return undefined;return systems.survivalInitialise(survivalWorld(state),...args);}
export function survivalDrop(state,...args){if(!state)return undefined;return systems.survivalDrop(survivalWorld(state),...args);}
export function survivalInterrupt(state,...args){if(!state)return undefined;return systems.survivalInterrupt(survivalWorld(state),...args);}
export function survivalDamage(state,...args){if(!state)return undefined;return systems.survivalDamage(survivalWorld(state),...args);}
export function survivalDie(state,...args){if(!state)return undefined;return systems.survivalDie(survivalWorld(state),...args);}
export function survivalUpdate(state,...args){if(!state)return undefined;return systems.survivalUpdate(survivalWorld(state),...args);}
export function survivalAlert(state,...args){if(!state)return undefined;return systems.survivalAlert(survivalWorld(state),...args);}
export function survivalRecover(state,...args){if(!state)return undefined;return systems.survivalRecover(survivalWorld(state),...args);}
export function survivalRefuge(state,...args){if(!state)return undefined;return systems.survivalRefuge(survivalWorld(state),...args);}
export function survivalCombatEnemy(state,...args){if(!state)return undefined;return systems.survivalCombatEnemy(survivalWorld(state),...args);}
export function survivalHandle(state,...args){if(!state)return undefined;return systems.survivalHandle(survivalWorld(state),...args);}
export function survivalSnapshot(state,...args){if(!state)return undefined;return systems.survivalSnapshot(survivalWorld(state),...args);}
