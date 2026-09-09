import {registerRivalHome,validateRivalHome} from './home-entities.js';
import {housingInput} from './housing-data.js';
import {farmingInput} from './farming-data.js';
import {villageWorld} from './village-world.js';
import {ENVIRONMENT_DOMAINS,environmentDefinitions} from './environment-data.js';
export {ENVIRONMENT_DOMAINS} from './environment-data.js';
const bindings=new WeakMap(),recordBindings=new WeakMap();
function define(world,name){const spec=ENVIRONMENT_DOMAINS[name];if(!spec)throw Error('Unknown environment domain');
 for(const def of [environmentDefinitions[name],environmentDefinitions[spec.component],environmentDefinitions.EnvironmentMember])if(!world.stores.has(def.name))world.define(def);
 return spec;
}
export function environmentBinding(state){const b=bindings.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,b.name)!==state||b.world.resource(b.name)!==state)throw Error('Environment domain is no longer active');return b;}
function ids(b){return b.world.query([b.spec.component,'EnvironmentMember']).filter(id=>b.world.owner(id)===b.id).sort((a,c)=>b.world.get(a,'EnvironmentMember').order-b.world.get(c,'EnvironmentMember').order);}
function list(b){const store=b.world.store(b.spec.component),members=b.world.store('EnvironmentMember');
 if(b.revision!==store.valueRevision||b.membership!==members.valueRevision){const rows=ids(b).map(id=>b.world.get(id,b.spec.component));if(rows.length!==b.cached.length||rows.some((r,i)=>r!==b.cached[i]))b.cached=Object.freeze(rows);b.revision=store.valueRevision;b.membership=members.valueRevision;}
 return b.cached;
}
function validateRows(b,rows){
 if(!Array.isArray(rows)||new Set(rows).size!==rows.length||new Set(rows.map(r=>r?.id)).size!==rows.length)throw Error('Invalid '+b.spec.component+' collection');
 for(const r of rows){b.world.validate(b.spec.component,r);farmingInput(r,b.spec.component);housingInput(r,b.spec.component);const old=recordBindings.get(r);if(b.spec.component==='ConstructionProject')validateRivalHome(b.world,r,old?.id);if(old&&old.world.alive(old.id)&&(old.domain!==b.id||old.world!==b.world))throw Error('Environment record belongs to another domain');}
}
export function replaceEnvironmentRecords(state,rows){const b=environmentBinding(state);validateRows(b,rows);const old=new Map(ids(b).map(id=>[b.world.get(id,b.spec.component),id]));
 for(const [r,id] of old)if(!rows.includes(r))b.world.destroy(id);
 for(const [order,r] of rows.entries()){let id=old.get(r);if(id===undefined){id=b.world.create({[b.spec.component]:r,EnvironmentMember:{domain:b.id,order}});b.world.own(b.id,id,{component:b.name});recordBindings.set(r,{world:b.world,id,domain:b.id,component:b.spec.component});installFarmingParts(b.world,id,r,b.spec.component);}else b.world.add(id,'EnvironmentMember',{domain:b.id,order});}
 b.pending=null;b.revision=-1;const current=list(b);
 // Preserve saved collection aliases without retaining a mutable second list.
 if(rows.length===current.length&&rows.every((r,i)=>r===current[i]))b.cached=Object.freeze(rows);
 return b.cached;
}
export function addEnvironmentRecords(state,...rows){const b=environmentBinding(state);return replaceEnvironmentRecords(state,[...list(b),...rows]).length;}
export function removeEnvironmentRecord(state,row){const b=environmentBinding(state),before=list(b);if(!before.includes(row))return false;replaceEnvironmentRecords(state,before.filter(r=>r!==row));return true;}
export function environmentRecordEntity(state,row){const b=environmentBinding(state),found=recordBindings.get(row);if(!found||found.world!==b.world||found.domain!==b.id||!b.world.alive(found.id))throw Error('Environment record is not a live entity');return found.id;}
export function bindEnvironment(state,name){
 const world=villageWorld(state.economy),spec=define(world,name),existing=bindings.get(state);
 if(existing){if(existing.world!==world||existing.name!==name)throw Error('Invalid environment ownership');environmentBinding(state);if(existing.pending!==null)replaceEnvironmentRecords(state,existing.pending);return state;}
 world.validate(name,state);farmingInput(state,name);housingInput(state,name);const incoming=state[spec.collection];
 // Validate the incoming collection before retiring a previous domain.
 const probe={world,spec,id:undefined};validateRows(probe,incoming);
 const old=world.resources.get(name),oldBinding=old&&bindings.get(old);if(oldBinding)world.destroy(oldBinding.id);
 const id=world.create({[name]:state}),b={world,id,name,spec,pending:null,revision:-1,membership:-1,cached:Object.freeze([])};bindings.set(state,b);world.setResource(name,state);installFarmingParts(world,id,state,name);
 Object.defineProperty(state,spec.collection,{enumerable:true,configurable:true,get(){return list(b)},set(rows){b.pending=rows}});
 replaceEnvironmentRecords(state,incoming);return state;
}
export function restoreEnvironment(e){
 const world=villageWorld(e);
 // Check every incoming domain before making any collection changes.
 for(const [name,spec] of Object.entries(ENVIRONMENT_DOMAINS)){const state=e[spec.key];if(!state)continue;if(state.economy!==e)throw Error('Invalid environment ownership');define(world,name);world.validate(name,state);farmingInput(state,name);housingInput(state,name);const b=bindings.get(state);validateRows({world,spec,id:b?.id},b?.pending??state[spec.collection]);}
 for(const [name,spec] of Object.entries(ENVIRONMENT_DOMAINS)){const state=e[spec.key];if(state)bindEnvironment(state,name);else{const old=world.resources.get(name),b=old&&bindings.get(old);if(b)world.destroy(b.id);world.resources.delete(name);}}
}

function installFarmingParts(world,id,value,kind){for(const {definition,row,keys} of [...farmingInput(value,kind),...housingInput(value,kind)]){if(!world.stores.has(definition.name))world.define(definition);world.add(id,definition.name,row);for(const key of keys)delete value[key];}if(kind==='ConstructionProject')registerRivalHome(world,value,id);}
export function environmentOwner(value){
 const b=bindings.get(value)??recordBindings.get(value);if(!b||!b.world.alive(b.id)||b.world.get(b.id,b.name??b.component)!==value)return undefined;return b;
}
export function environmentComponent(value,name){const b=environmentOwner(value);return b?.world.stores.get(name)?.get(b.id);}
export function setEnvironmentComponent(value,definition,row){const b=environmentOwner(value);if(!b)throw Error('Environment owner is not a live entity');if(!b.world.stores.has(definition.name))b.world.define(definition);return b.world.add(b.id,definition.name,row);}
