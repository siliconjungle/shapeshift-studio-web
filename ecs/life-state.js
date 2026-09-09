import {villageWorld} from './village-world.js';
import {LifeIdentity,LifeClock,LifeMealAccounting,LifeSocialVenues,lifeDomains} from './life-data.js';
export {lifeDomains} from './life-data.js';
const bindings=new WeakMap();
export function lifeBinding(state){const b=bindings.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,'LifeIdentity')!==state||b.world.resources.get('Life')!==state||state.economy.life!==state)throw Error('Daily life state is no longer active');return b;}
export const lifeWorld=state=>lifeBinding(state).world;
const get=(state,key)=>{if(state==null)return undefined;const {world,id}=lifeBinding(state);return world.get(id,key);};
export const lifeClock=state=>get(state,'LifeClock'),lifeMealAccounting=state=>get(state,'LifeMealAccounting'),lifeSocialVenues=state=>get(state,'LifeSocialVenues');
function set(state,values,definition){const {world,id}=lifeBinding(state),row={...world.get(id,definition.name),...values,life:state};world.validate(definition.name,row);return world.add(id,definition.name,row);}
export const setLifeClock=(state,values)=>set(state,values,LifeClock),setLifeMealAccounting=(state,values)=>set(state,values,LifeMealAccounting),setLifeSocialVenues=(state,values)=>set(state,values,LifeSocialVenues);
function project(e,key,store,incoming){let cached=Object.freeze(incoming.length===store.values.length&&incoming.every((r,i)=>r===store.values[i])?incoming:store.values.slice()),membership=store.membershipRevision,revision=store.valueRevision;Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});}
export function bindLifeState(state){
 if(bindings.has(state)){lifeBinding(state);return state;}const e=state.economy,world=villageWorld(e);
 const inputs=lifeDomains.map(spec=>{const incoming=e[spec.key]??[],keys=Object.keys(spec.fields).filter(k=>Object.hasOwn(state,k));if(!Array.isArray(incoming)||incoming.length>1||incoming.some(r=>r.life!==state)||keys.length&&incoming.length)throw Error('Invalid or ambiguous '+spec.definition.name);const row=incoming[0]??Object.fromEntries([['life',state],...keys.map(k=>[spec.fields[k],state[k]])]);if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);return {spec,incoming,row};});
 const identity=Object.assign(Object.create(Object.getPrototypeOf(state)),state);for(const {spec}of inputs)for(const k of Object.keys(spec.fields))delete identity[k];if(!LifeIdentity.validate(identity))throw Error('Invalid daily life identity');
 for(const definition of [LifeIdentity,...lifeDomains.map(s=>s.definition)])if(!world.stores.has(definition.name))world.define(definition);
 for(const id of world.query(['LifeIdentity']))world.destroy(id);for(const {spec}of inputs)for(const k of Object.keys(spec.fields))delete state[k];const id=world.create({LifeIdentity:state});bindings.set(state,{world,id});world.setResource('Life',state);e.life=state;
 for(const {spec,row,incoming}of inputs){world.add(id,spec.definition.name,row);project(e,spec.key,world.store(spec.definition.name),incoming);}return state;
}
export function restoreLifeState(e){if(e.life){if(e.life.economy!==e)throw Error('Invalid daily life ownership');return bindLifeState(e.life);}const world=villageWorld(e);for(const definition of [LifeIdentity,...lifeDomains.map(s=>s.definition)])if(!world.stores.has(definition.name))world.define(definition);for(const {key}of lifeDomains)if(e[key]?.length)throw Error('Life component without daily life');for(const id of world.query(['LifeIdentity']))world.destroy(id);world.resources.delete('Life');for(const {key,definition}of lifeDomains)project(e,key,world.store(definition.name),e[key]??[]);}
