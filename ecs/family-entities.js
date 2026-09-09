import {actorResidence,ensureActorResidence} from './actor-residence.js';
import {villageWorld} from './village-world.js';
import {FamilyIdentity,FamilyConfiguration,FamilySchedule,FamilyHistory,BirthPlan,familyDomains} from './family-data.js';
export {BirthPlan,familyDomains} from './family-data.js';
const bindings=new WeakMap();
export function familyBinding(state){const b=bindings.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,'FamilyIdentity')!==state||b.world.resources.get('Family')!==state)throw Error('Family is not active');return b;}
const component=(state,name)=>{if(state==null)return undefined;const {world,id}=familyBinding(state);return world.get(id,name);};
export const familyConfiguration=state=>component(state,'FamilyConfiguration'),familySchedule=state=>component(state,'FamilySchedule'),familyHistory=state=>component(state,'FamilyHistory');
export function familyBirthPlan(state){if(state==null)return undefined;const {world}=familyBinding(state),plans=world.store('BirthPlan').values;if(plans.length>1)throw Error('Multiple pending births');const plan=plans[0]??null;if(plan&&plan.family!==state)throw Error('Foreign BirthPlan owner');return plan;}
export function setFamilyBirthPlan(state,value){
 const {world}=familyBinding(state),previous=familyBirthPlan(state);if(previous===value)return value;
 if(value!==null){if(value.family!==undefined&&value.family!==state)throw Error('Foreign BirthPlan owner');world.validate('BirthPlan',{...value,family:state});}
 for(const id of world.query(['BirthPlan']))world.destroy(id);
 if(value!==null){value.family=state;world.create({BirthPlan:value});}return value;
}
function set(state,values,definition){const {world,id}=familyBinding(state),row={...world.get(id,definition.name),...values,family:state};world.validate(definition.name,row);return world.add(id,definition.name,row);}
export const setFamilyConfiguration=(state,values)=>set(state,values,FamilyConfiguration),setFamilySchedule=(state,values)=>set(state,values,FamilySchedule),setFamilyHistory=(state,values)=>set(state,values,FamilyHistory);
function projection(e,key,store,incoming){let cached=Object.freeze(incoming.length===store.values.length&&incoming.every((r,i)=>r===store.values[i])?incoming:store.values.slice()),membership=store.membershipRevision,revision=store.valueRevision;Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});}
export function familyEntities(state,{creating=false}={}){
 const e=state.economy,world=villageWorld(e),bound=bindings.get(state);if(bound){familyBinding(state);return bound;}
 const pending=Object.hasOwn(state,'pending')?state.pending:undefined,inputs=familyDomains.map(spec=>{const keys=spec.fields.filter(k=>Object.hasOwn(state,k)),incoming=creating?[]:e[spec.key]??[];if(!Array.isArray(incoming)||incoming.length>1||incoming.some(r=>r.family!==state)||keys.length&&incoming.length)throw Error('Invalid or ambiguous '+spec.definition.name);const row=incoming[0]??Object.fromEntries([['family',state],...keys.map(k=>[k,state[k]])]);if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);return {spec,row,incoming};});
 const plans=creating?[]:e.familyBirthPlans??[];if(!Array.isArray(plans)||plans.length>1||!creating&&Object.hasOwn(state,'pending')&&e.familyBirthPlans!==undefined)throw Error('Invalid or ambiguous BirthPlan');const plan=plans[0]??pending??null;
 if(plan){if(plan.family!==undefined&&plan.family!==state||!BirthPlan.validate({...plan,family:state}))throw Error('Invalid BirthPlan');}
 const identity=Object.assign(Object.create(Object.getPrototypeOf(state)),state);for(const {spec}of inputs)for(const k of spec.fields)delete identity[k];delete identity.pending;if(!FamilyIdentity.validate(identity)||identity.economy!==e)throw Error('Invalid FamilyIdentity');
 if(!world.stores.has('FamilyIdentity'))world.define(FamilyIdentity);if(!world.stores.has('BirthPlan'))world.define(BirthPlan);for(const {spec}of inputs)if(!world.stores.has(spec.definition.name))world.define(spec.definition);
 for(const id of world.query(['BirthPlan']))world.destroy(id);for(const id of world.query(['FamilyIdentity']))world.destroy(id);
 for(const {spec}of inputs)for(const key of spec.fields)delete state[key];delete state.pending;
 const id=world.create({FamilyIdentity:state});bindings.set(state,{world,id});world.setResource('Family',state);e.family=state;
 for(const {spec,row,incoming}of inputs){world.add(id,spec.definition.name,row);projection(e,spec.key,world.store(spec.definition.name),incoming);}
 if(plan){plan.family=state;world.create({BirthPlan:plan});}projection(e,'familyBirthPlans',world.store('BirthPlan'),plans);return bindings.get(state);
}
export function restoreFamilyEntities(e){
 if(e.family)return familyEntities(e.family);
 const world=villageWorld(e);for(const definition of [FamilyIdentity,BirthPlan,...familyDomains.map(s=>s.definition)])if(!world.stores.has(definition.name))world.define(definition);
 for(const spec of [...familyDomains,{key:'familyBirthPlans'}])if(e[spec.key]?.length)throw Error('Family component without a family');
 for(const id of world.query(['BirthPlan']))world.destroy(id);for(const id of world.query(['FamilyIdentity']))world.destroy(id);world.resources.delete('Family');for(const {definition,key}of [...familyDomains,{definition:BirthPlan,key:'familyBirthPlans'}])projection(e,key,world.store(definition.name),e[key]??[]);
}
// Resolve authored home IDs to the actual household record, not a JSON copy.
export function scheduleFamilyBirth(state,{parents,arrivesAt,homeId}={}){
 familyBinding(state);const e=state.economy,pair=parents??familyConfiguration(state).parents,home=homeId===undefined?(actorResidence(e.workers.find(w=>w.id===pair?.[0]))?.home):e.life?.homes.find(h=>h.id===homeId);
 if(!home)throw Error('Unknown family home');return setFamilyBirthPlan(state,{parents:pair,arrivesAt,home});
}
