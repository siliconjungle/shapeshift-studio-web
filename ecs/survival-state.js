import {villageWorld} from './village-world.js';
import {validSurvivalState} from './survival-data.js';
import {validateSurvivalRecords,survivalRecords,restoreSurvivalRecords} from './survival-records.js';
export function bindSurvivalState(state,{restoring=false}={}){
 if(!validSurvivalState(state))throw Error('Invalid survival state');validateSurvivalRecords(state);
 villageWorld(state.economy).setResource('Survival',state);state.economy.survival=state;(restoring?restoreSurvivalRecords:survivalRecords)(state);return state;
}
export function survivalWorld(state){const world=villageWorld(state.economy);if(world.resources.get('Survival')!==state||state.economy.survival!==state)throw Error('Survival state is no longer active');return world;}
export function restoreSurvivalState(e){
 const world=villageWorld(e),state=e.survival;
 if(state){
  // One-time import for saves from before memorials existed.
  state.memorials??=[];
  if(state.economy!==e)throw Error('Invalid survival ownership');bindSurvivalState(state,{restoring:true});
 }else{
  for(const name of ['DroppedResource','Memorial'])if(world.stores.has(name))for(const id of world.query([name]))world.destroy(id);
  world.resources.delete('Survival');
 }
}
