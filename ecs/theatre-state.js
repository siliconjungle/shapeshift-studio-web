import {villageWorld} from './village-world.js';
import {TheatreIdentity,TheatreSchedule,TheatreHistory,TheatrePerformance,theatreDomains} from './performance-data.js';
export {theatreDomains} from './performance-data.js';
const bindings=new WeakMap();
export function theatreBinding(state){const b=bindings.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,'TheatreIdentity')!==state||b.world.resources.get('Theatre')!==state||state.economy.theatre!==state)throw Error('Daily theatre state is no longer active');return b;}
export const theatreWorld=state=>theatreBinding(state).world;
const get=(state,key)=>{if(state==null)return undefined;const {world,id}=theatreBinding(state);return world.get(id,key);};
export const theatreSchedule=state=>get(state,'TheatreSchedule'),theatreHistory=state=>get(state,'TheatreHistory'),theatrePerformance=state=>get(state,'TheatrePerformance');
function set(state,values,definition){const {world,id}=theatreBinding(state),row={...world.get(id,definition.name),...values,theatre:state};world.validate(definition.name,row);return world.add(id,definition.name,row);}
export const setTheatreSchedule=(state,values)=>set(state,values,TheatreSchedule),setTheatreHistory=(state,values)=>set(state,values,TheatreHistory),setTheatrePerformance=(state,values)=>set(state,values,TheatrePerformance);
function project(e,key,store,incoming){let cached=Object.freeze(incoming.length===store.values.length&&incoming.every((r,i)=>r===store.values[i])?incoming:store.values.slice()),membership=store.membershipRevision,revision=store.valueRevision;Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});}
export function bindTheatreState(state){
 if(bindings.has(state)){theatreBinding(state);return state;}const e=state.economy,world=villageWorld(e);
 const inputs=theatreDomains.map(spec=>{const incoming=e[spec.key]??[],keys=Object.keys(spec.fields).filter(k=>Object.hasOwn(state,k));if(!Array.isArray(incoming)||incoming.length>1||incoming.some(r=>r.theatre!==state)||keys.length&&incoming.length)throw Error('Invalid or ambiguous '+spec.definition.name);const row=incoming[0]??Object.fromEntries([['theatre',state],...keys.map(k=>[spec.fields[k],state[k]])]);if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);return {spec,incoming,row};});
 const identity=Object.assign(Object.create(Object.getPrototypeOf(state)),state);for(const {spec}of inputs)for(const k of Object.keys(spec.fields))delete identity[k];if(!TheatreIdentity.validate(identity))throw Error('Invalid theatre identity');
 for(const definition of [TheatreIdentity,...theatreDomains.map(s=>s.definition)])if(!world.stores.has(definition.name))world.define(definition);
 for(const id of world.query(['TheatreIdentity']))world.destroy(id);for(const {spec}of inputs)for(const k of Object.keys(spec.fields))delete state[k];const id=world.create({TheatreIdentity:state});bindings.set(state,{world,id});world.setResource('Theatre',state);e.theatre=state;
 for(const {spec,row,incoming}of inputs){world.add(id,spec.definition.name,row);project(e,spec.key,world.store(spec.definition.name),incoming);}return state;
}
export function restoreTheatreState(e){if(e.theatre){if(e.theatre.economy===undefined)e.theatre.economy=e;if(e.theatre.economy!==e)throw Error('Invalid theatre ownership');return bindTheatreState(e.theatre);}const world=villageWorld(e);for(const definition of [TheatreIdentity,...theatreDomains.map(s=>s.definition)])if(!world.stores.has(definition.name))world.define(definition);for(const {key}of theatreDomains)if(e[key]?.length)throw Error('Life component without theatre');for(const id of world.query(['TheatreIdentity']))world.destroy(id);world.resources.delete('Theatre');for(const {key,definition}of theatreDomains)project(e,key,world.store(definition.name),e[key]??[]);}

export function createTheatreState(e,firstAt){if(e.theatre){theatreBinding(e.theatre);return e.theatre;}e.theatre={economy:e,nextAt:firstAt,nextId:0,session:null,history:[]};return bindTheatreState(e.theatre);}
