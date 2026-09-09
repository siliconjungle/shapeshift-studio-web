import {villageWorld} from './village-world.js';
import {actorEntity,actorKind,existingActor,validateActorOwner} from './actor-entities.js';
import {Wildlife,Bird,BirdNest,animalComponents,animalInput,validateAnimalSpawnInput} from './animal-data.js';
const stateBindings=new WeakMap(),nestBindings=new WeakMap();
const specs={Snakes:{key:'snakes',lists:{animals:Wildlife}},Wildlife:{key:'wildlife',lists:{animals:Wildlife}},Birds:{key:'birds',lists:{flock:Bird,nests:BirdNest}}};
const rootDef=name=>({name:name+'State',replaceable:false,validate:v=>v!==null&&typeof v==='object'&&!Array.isArray(v)});
function define(world,name){for(const d of [rootDef(name),...Object.values(specs[name].lists),{name:'AnimalMember',validate:r=>Number.isSafeInteger(r.order)&&r.order>=0}])if(!world.stores.has(d.name))world.define(d);}
function bindActor(e,actor,def){const world=villageWorld(e),found=existingActor(e,actor,def.name);if(found!==undefined)return found;
 const parts=animalInput(actor,def.name);validateActorOwner(e,actor);const id=actorEntity(e,actor,def);
 for(const {definition,row,keys} of parts){if(!world.stores.has(definition.name))world.define(definition);world.add(id,definition.name,row);for(const k of keys)delete actor[k];}return id;
}
function ids(b,def){return b.world.query([def.name,'AnimalMember']).filter(id=>b.world.owner(id)===b.id).sort((a,c)=>b.world.get(a,'AnimalMember').order-b.world.get(c,'AnimalMember').order);}
function list(b,key){const def=b.spec.lists[key],store=b.world.store(def.name),members=b.world.store('AnimalMember'),cache=b.cache[key]??={rows:Object.freeze([]),revision:-1,membership:-1};
 if(cache.revision!==store.valueRevision||cache.membership!==members.valueRevision){const rows=ids(b,def).map(id=>store.get(id));if(rows.length!==cache.rows.length||rows.some((r,i)=>r!==cache.rows[i]))cache.rows=Object.freeze(rows);cache.revision=store.valueRevision;cache.membership=members.valueRevision;}return cache.rows;
}
function validate(b,key,rows){const def=b.spec.lists[key];if(!def||!Array.isArray(rows)||new Set(rows).size!==rows.length||new Set(rows.map(r=>r?.id)).size!==rows.length)throw Error('Invalid animal collection');
 for(const r of rows){b.world.validate(def.name,r);if(def===BirdNest){const old=nestBindings.get(r);if(old&&old.world.alive(old.id)&&(old.world!==b.world||old.root!==b.id))throw Error('Nest already belongs to another population');}
 else {validateActorOwner(b.e,r);const kind=actorKind(r);if(kind&&kind!==def.name)throw Error('Animal kind cannot change');const id=existingActor(b.e,r,def.name);if(id!==undefined&&b.world.owner(id)!==b.id)throw Error('Animal already belongs to another population');if(id===undefined){animalInput(r,def.name);if(!b.hydrating)validateAnimalSpawnInput(r,def.name);}}}
}
function binding(state){const b=stateBindings.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,b.name+'State')!==state||b.world.resources.get(b.name+'State')!==state)throw Error('Animal population is no longer active');return b;}
export const animalPopulationBinding=state=>binding(state);
export function replaceAnimals(state,key,rows){const b=binding(state),def=b.spec.lists[key];validate(b,key,rows);const old=new Map(ids(b,def).map(id=>[b.world.get(id,def.name),id]));
 for(const [r,id] of old)if(!rows.includes(r))b.world.destroy(id);
 for(const [order,r] of rows.entries()){let id=old.get(r);if(id===undefined){id=def===BirdNest?b.world.create({BirdNest:r}):bindActor(b.e,r,def);b.world.own(b.id,id,{component:b.name+'State'});if(def===BirdNest)nestBindings.set(r,{world:b.world,id,root:b.id});}b.world.add(id,'AnimalMember',{order});}
 const current=list(b,key);if(rows.length===current.length&&rows.every((r,i)=>r===current[i]))b.cache[key].rows=Object.freeze(rows);return b.cache[key].rows;
}
export function addAnimal(state,key,row){replaceAnimals(state,key,[...list(binding(state),key),row]);return row;}
export function bindAnimalPopulation(e,name,{hydrating=false}={}){const state=e[specs[name].key];if(!state)return state;const world=villageWorld(e);define(world,name);const prior=stateBindings.get(state);if(prior){if(prior.e!==e||prior.name!==name)throw Error('Foreign animal population');binding(state);return state;}
 const b={e,world,name,hydrating,spec:specs[name],id:undefined,cache:{}},incoming=Object.fromEntries(Object.keys(b.spec.lists).map(k=>[k,state[k]]));for(const [key,rows] of Object.entries(incoming))validate(b,key,rows);
 const previous=world.resources.get(name+'State'),previousBinding=previous&&stateBindings.get(previous);if(previousBinding)world.destroy(previousBinding.id);
 b.id=world.create({[name+'State']:state});world.setResource(name+'State',state);stateBindings.set(state,b);
 for(const [key,rows] of Object.entries(incoming)){Object.defineProperty(state,key,{enumerable:true,configurable:true,get:()=>list(b,key),set:rows=>replaceAnimals(state,key,rows)});replaceAnimals(state,key,rows);}b.hydrating=false;return state;
}
export function restoreAnimalEntities(e){const world=villageWorld(e);
 for(const [name,spec] of Object.entries(specs)){if(e[spec.key])bindAnimalPopulation(e,name,{hydrating:true});else {const old=world.resources.get(name+'State'),b=old&&stateBindings.get(old);if(b)world.destroy(b.id);world.resources.delete(name+'State');}}
 const owners=new Map();for(const kind of ['Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const plans=[];
 for(const spec of animalComponents){const {definition,key}=spec;if(!world.stores.has(definition.name))world.define(definition);const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid '+definition.name+' records');const rows=new Map(world.store(definition.name).values.map(r=>[r.person,r]));
 for(const row of incoming){if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous '+definition.name);rows.set(row.person,row);}
 for(const row of rows.values()){world.validate(definition.name,row);if(!owners.has(row.person)||spec.kind&&actorKind(row.person)!==spec.kind)throw Error('Unknown '+definition.name+' owner');}plans.push({...spec,incoming,rows});
 }
 for(const {definition,key,incoming,rows} of plans){const name=definition.name;for(const id of world.query([name]))world.remove(id,name);for(const row of rows.values())world.add(owners.get(row.person),name,row);
 const store=world.store(name),sort=()=>store.values.slice().sort((a,b)=>String(a.person.id).localeCompare(String(b.person.id))),initial=sort();let cached=Object.freeze(initial.length===incoming.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),revision=store.valueRevision;
 Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(revision!==store.valueRevision){cached=Object.freeze(sort());revision=store.valueRevision;}return cached;}});
 }
}
