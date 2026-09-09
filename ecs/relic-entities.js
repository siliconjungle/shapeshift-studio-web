import {villageWorld} from './village-world.js';
import {Relic,RelicsRuntime,RelicMember,RelicPolitics,relicDomains,relicInput} from './relic-data.js';
export {relicDomains} from './relic-data.js';
const bindings=new WeakMap(),states=new WeakMap();
function live(b,r){return !!b&&b.world.alive(b.id)&&b.world.get(b.id,'Relic')===r;}
function define(world){for(const d of [Relic,RelicsRuntime,RelicMember,...relicDomains.map(s=>s.definition)])if(!world.stores.has(d.name))world.define(d);}
export function relicEntity(r){const b=bindings.get(r);if(!live(b,r))throw Error('Relic is not a live entity');return b.id;}
export function relicComponent(r,name){const b=bindings.get(r);return live(b,r)?b.world.stores.get(name)?.get(b.id):undefined;}
export const relicSpatial=r=>relicComponent(r,'RelicSpatial');
export const relicCustody=r=>relicComponent(r,'RelicCustody');
export const relicCondition=r=>relicComponent(r,'RelicCondition');
export const relicInfluence=r=>relicComponent(r,'RelicInfluence');
export const relicProvenance=r=>relicComponent(r,'RelicProvenance');
export const relicPoliticsData=r=>relicComponent(r,'RelicPolitics');
export function ensureRelicPolitics(r){const id=relicEntity(r),b=bindings.get(r);return b.world.get(id,'RelicPolitics')??b.world.add(id,'RelicPolitics',{relic:r});}
function set(r,name,values){const id=relicEntity(r),b=bindings.get(r);return b.world.add(id,name,{...values,relic:r});}
export const setRelicSpatial=(r,v)=>set(r,'RelicSpatial',v);
export const setRelicCustody=(r,v)=>set(r,'RelicCustody',v);
export const setRelicCondition=(r,v)=>set(r,'RelicCondition',v);
export const setRelicInfluence=(r,v)=>set(r,'RelicInfluence',v);
export const setRelicProvenance=(r,v)=>set(r,'RelicProvenance',v);
export const setRelicPolitics=(r,v)=>set(r,'RelicPolitics',v);
export function relicRuntimeEntity(state){const b=states.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,'RelicsRuntime')!==state||b.world.resources.get('Relics')!==state)throw Error('Relic domain is no longer active');return b.id;}
function members(b){return b.world.query(['Relic','RelicMember']).filter(id=>b.world.owner(id)===b.id).sort((a,c)=>b.world.get(a,'RelicMember').order-b.world.get(c,'RelicMember').order);}
function list(b){const store=b.world.store('Relic'),member=b.world.store('RelicMember');if(b.revision!==store.valueRevision||b.membership!==member.valueRevision){const rows=members(b).map(id=>store.get(id));if(b.cached.length!==rows.length||rows.some((r,i)=>r!==b.cached[i]))b.cached=Object.freeze(rows);b.revision=store.valueRevision;b.membership=member.valueRevision;}return b.cached;}
function validateRecords(world,state,records){
 if(!RelicsRuntime.validate(state))throw Error('Invalid RelicsRuntime');
 if(!Array.isArray(records)||new Set(records).size!==records.length||new Set(records.map(r=>r?.id)).size!==records.length||new Set(records.map(r=>r?.culture+':'+r?.kind)).size!==records.length)throw Error('Invalid relic collection');
 for(const r of records){if(!Relic.validate(r))throw Error('Invalid Relic identity');const b=bindings.get(r);if(b&&(!live(b,r)||b.world!==world||b.state!==state))throw Error('Relic belongs to another or retired domain');}
}
function projections(e,world,incoming=new Map()){
 for(const spec of relicDomains){const store=world.store(spec.definition.name),ordered=()=>store.values.slice().sort((a,b)=>bindings.get(a.relic).id-bindings.get(b.relic).id),initial=ordered(),input=incoming.get(spec.key)??[];
  let cached=Object.freeze(input.length===initial.length&&input.every((r,i)=>r===initial[i])?input:initial),revision=store.valueRevision;
  Object.defineProperty(e,spec.key,{configurable:true,enumerable:true,get(){if(revision!==store.valueRevision){cached=Object.freeze(ordered());revision=store.valueRevision;}return cached;}});
 }
}
function installRecord(world,state,parent,record,parts,order){
 const id=world.create({Relic:record,RelicMember:{order}});world.own(parent,id,{component:'RelicsRuntime'});bindings.set(record,{world,state,id});
 for(const {definition,row,keys=[]} of parts){world.add(id,definition.name,row);for(const key of keys)delete record[key];}return id;
}
export function addRelicRecord(e,record){
 const world=villageWorld(e),state=e.relics,parent=relicRuntimeEntity(state),b=states.get(state);
 if(b.world!==world)throw Error('Foreign relic domain');validateRecords(world,state,[...state.items,record]);if(bindings.has(record))throw Error('Relic already has an identity');
 const parts=relicInput(record);for(const spec of relicDomains)if(spec.required&&!parts.some(p=>p.definition===spec.definition))throw Error('Missing '+spec.definition.name);
 installRecord(world,state,parent,record,parts,b.nextOrder++);return record;
}
export function removeRelicRecord(e,record){const b=bindings.get(record),world=villageWorld(e);if(!live(b,record))return false;if(b.world!==world||b.state!==e.relics)throw Error('Foreign relic');return world.destroy(b.id);}
export function createRelicState(e,nextCheck){
 const world=villageWorld(e);if(world.resources.has('Relics')||e.relics!==undefined)throw Error('Relics already exist');
 const state={version:1,items:[],nextId:0,nextCheck};if(!RelicsRuntime.validate(state))throw Error('Invalid RelicsRuntime');
 const descriptor=Object.getOwnPropertyDescriptor(e,'relics');e.relics=state;try{restoreRelicEntities(e);}catch(error){if(descriptor)Object.defineProperty(e,'relics',descriptor);else delete e.relics;throw error;}return state;
}
export function restoreRelicEntities(e){
 const world=villageWorld(e),state=e.relics,old=world.resources.get('Relics'),existing=state&&states.get(state),records=state?.items??[],plans=[],incoming=new Map();
 if(existing){if(existing.world!==world)throw Error('Foreign relic domain');relicRuntimeEntity(state);}
 if(state!==undefined)validateRecords(world,state,records);
 const converted=records.flatMap(relicInput),owners=new Set(records);
 for(const spec of relicDomains){const rows=new Map(),input=e[spec.key]??[];if(!Array.isArray(input)||new Set(input.map(r=>r?.relic)).size!==input.length)throw Error('Invalid '+spec.definition.name+' collection');incoming.set(spec.key,input);
  if(existing&&world.stores.has(spec.definition.name))for(const row of world.store(spec.definition.name).values)if(owners.has(row.relic))rows.set(row.relic,row);
  for(const row of [...input,...converted.filter(p=>p.definition===spec.definition).map(p=>p.row)]){if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);if(!owners.has(row.relic))throw Error('Unknown relic component owner');if(rows.has(row.relic)&&rows.get(row.relic)!==row)throw Error('Ambiguous '+spec.definition.name);rows.set(row.relic,row);}
  if(spec.required&&records.some(r=>!rows.has(r)))throw Error('Missing '+spec.definition.name);plans.push({...spec,rows});
 }
 // Nothing above mutates live entities. Restore is committed only after every
 // identity, component, owner and ambiguous old/new field has been checked.
 define(world);
 if(old&&old!==state){const b=states.get(old);if(b)world.destroy(b.id);world.resources.delete('Relics');}
 if(state!==undefined){
  let b=existing;
  if(!b){const id=world.create({RelicsRuntime:state});b={world,id,state,cached:Object.freeze([]),revision:-1,membership:-1,nextOrder:records.length};states.set(state,b);world.setResource('Relics',state);
   for(const [order,record] of records.entries()){const parts=plans.filter(p=>p.rows.has(record)).map(p=>({definition:p.definition,row:p.rows.get(record),keys:converted.find(c=>c.definition===p.definition&&c.row.relic===record)?.keys??[]}));installRecord(world,state,id,record,parts,order);}
   b.cached=Object.freeze(records);Object.defineProperty(state,'items',{configurable:true,enumerable:true,get:()=>list(b)});
  }else{relicRuntimeEntity(state);for(const p of plans)for(const row of p.rows.values())world.add(relicEntity(row.relic),p.definition.name,row);}
 }
 projections(e,world,incoming);return state;
}
