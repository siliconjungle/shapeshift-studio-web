import {villageWorld} from './village-world.js';
import {animalPopulationBinding,bindAnimalPopulation} from './animal-entities.js';
import {SnakeSchedule} from './snake-data.js';
export function snakeSchedule(state){if(!state)return undefined;const {world,id,e}=animalPopulationBinding(state);if(e.snakes!==state)throw Error('Snake population is no longer active');return world.get(id,'SnakeSchedule');}
export function setSnakeSchedule(state,values){const {world,id}=animalPopulationBinding(state),row={...snakeSchedule(state),...values,snakes:state};world.validate('SnakeSchedule',row);return world.add(id,'SnakeSchedule',row);}
function project(e,store,incoming){let rows=Object.freeze(incoming.length===store.values.length&&incoming.every((r,i)=>r===store.values[i])?incoming:store.values.slice()),revision=store.valueRevision;Object.defineProperty(e,'snakeSchedules',{enumerable:true,configurable:true,get(){if(revision!==store.valueRevision){rows=Object.freeze(store.values.slice());revision=store.valueRevision;}return rows;}});}
export function restoreSnakeState(e){
 const world=villageWorld(e);if(!world.stores.has('SnakeSchedule'))world.define(SnakeSchedule);
 const incoming=e.snakeSchedules??[];if(!Array.isArray(incoming)||incoming.length>1)throw Error('Invalid snake schedules');
 if(!e.snakes){if(incoming.length)throw Error('Snake schedule without population');for(const id of world.query(['SnakeSchedule']))world.remove(id,'SnakeSchedule');project(e,world.store('SnakeSchedule'),incoming);return;}
 bindAnimalPopulation(e,'Snakes',{hydrating:true});const {id}=animalPopulationBinding(e.snakes),old=world.get(id,'SnakeSchedule'),keys=['nextAt','nextId'].filter(k=>Object.hasOwn(e.snakes,k));
 if(keys.length&&(incoming.length||old))throw Error('Ambiguous snake schedule');const row=incoming[0]??old??{snakes:e.snakes,nextAt:e.snakes.nextAt,nextId:e.snakes.nextId};
 if(row.snakes!==e.snakes||old&&incoming.length&&old!==row||!SnakeSchedule.validate(row))throw Error('Invalid snake schedule');
 for(const key of keys)delete e.snakes[key];world.add(id,'SnakeSchedule',row);project(e,world.store('SnakeSchedule'),incoming);
}
export function createSnakeState(e,firstAt){if(e.snakes){snakeSchedule(e.snakes);return e.snakes;}e.snakes={animals:[],nextId:0,nextAt:e.time+firstAt};restoreSnakeState(e);return e.snakes;}
