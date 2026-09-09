import {villageWorld} from './village-world.js';
import {defineResourceStores,resourcePlan,bindResourcePlan,resourceBinding,resourceDomains} from './resource-state.js';
const collections=new WeakMap();
export class ResourceEntities {
 constructor(e){this.economy=e;this.world=villageWorld(e);this.cachedList=Object.freeze([]);this.revision=-1;this.membership=-1;this.pendingLoad=null;defineResourceStores(this.world);this.replace(e.nodes,false);this.projectComponents();}
 get ids(){return this.world.query(['ResourceNode'])}
 get list(){const store=this.world.store('ResourceNode');if(this.revision!==store.valueRevision||this.membership!==store.membershipRevision){this.cachedList=Object.freeze(this.ids.map(id=>store.get(id)));this.revision=store.valueRevision;this.membership=store.membershipRevision;}return this.cachedList;}
 inputs(records){const incoming={};for(const {key}of resourceDomains){const rows=this.economy[key]??[];if(!Array.isArray(rows)||new Set(rows.map(r=>r?.node)).size!==rows.length)throw Error('Invalid '+key);incoming[key]=new Map(rows.map(r=>[r.node,r]));for(const node of incoming[key].keys())if(!records.includes(node))throw Error('Unknown '+key+' owner');}return incoming;}
 replace(records,loading=true){
  if(!Array.isArray(records)||new Set(records).size!==records.length)throw Error('Invalid resource records');
  // Runtime replacement is immediate. Retain the input separately because
  // the decoder assigns an empty array before filling its complete graph.
  const incoming=loading?undefined:this.inputs(records),plans=records.map(node=>resourcePlan(this.world,node,incoming));
  for(const id of this.ids)this.world.destroy(id);for(const plan of plans)bindResourcePlan(this.world,plan);this.pendingLoad=loading?records:null;
  const store=this.world.store('ResourceNode');this.cachedList=Object.freeze(loading?records.slice():records);this.revision=store.valueRevision;this.membership=store.membershipRevision;
 }
 finishLoad(){if(this.pendingLoad!==null){const records=this.pendingLoad;this.replace(records,false);this.projectComponents();}}
 projectComponents(){for(const {key,definition}of resourceDomains){const store=this.world.store(definition.name),incoming=this.economy[key]??[],sorted=()=>this.ids.map(id=>store.get(id)).filter(Boolean),initial=sorted();let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;Object.defineProperty(this.economy,key,{configurable:true,enumerable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});}}
 add(...records){if(new Set(records).size!==records.length||records.some(n=>resourceBinding(n)))throw Error('Resource already belongs to a world');const plans=records.map(n=>resourcePlan(this.world,n));for(const plan of plans)bindResourcePlan(this.world,plan);this.pendingLoad=null;return this.ids.length;}
 remove(record){const id=this.id(record);if(id===undefined)return false;this.pendingLoad=null;return this.world.destroy(id);}
 id(record){const b=resourceBinding(record);return b?.world===this.world?b.id:undefined;}
 view(id){return this.world.get(id,'ResourceNode')}
}
export function resourceEntities(e){let collection=collections.get(e);if(!collection){collection=new ResourceEntities(e);collections.set(e,collection);Object.defineProperty(e,'nodes',{configurable:true,enumerable:true,get:()=>collection.list,set:records=>collection.replace(records)});}return collection;}
export function restoreResourceEntities(e){const collection=resourceEntities(e);collection.finishLoad();return collection;}
