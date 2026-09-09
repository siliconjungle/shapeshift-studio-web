import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const SharedExperience={name:'SharedExperience',validate:r=>record(r)&&typeof r.key==='string'&&record(r.pair)&&Number.isFinite(r.pair.seconds)&&r.pair.seconds>=0&&Number.isFinite(r.pair.after)&&r.pair.after>=0,prepare:r=>{
 for(const key of ['key','pair'])Object.defineProperty(r,key,{value:r[key],enumerable:true,writable:false,configurable:false});
}};
const deny=()=>{throw Error('Shared experience membership is read-only; use memoryContacts commands');};
class MemoryContacts extends ComponentRecords {
 constructor(world,map){
  if(!(map instanceof Map))throw Error('Memory contacts must be a Map');
  super(world,SharedExperience,[...map].map(([key,pair])=>({key,pair})));this.projected=map;this.index=new Map();this.indexMembership=-1;this.indexRevision=-1;
  for(const key of ['set','delete','clear'])Object.defineProperty(map,key,{value:deny,enumerable:false,configurable:true});this.refresh();
 }
 validate(rows){super.validate(rows);if(new Set(rows.map(r=>r.key)).size!==rows.length)throw Error('Duplicate shared experience key');}
 stamp(){this.indexMembership=this.store.membershipRevision;this.indexRevision=this.store.valueRevision;}
 refresh(){
  if(this.indexMembership===this.store.membershipRevision&&this.indexRevision===this.store.valueRevision)return;
  this.index.clear();Map.prototype.clear.call(this.projected);
  for(const id of this.ids){const row=this.store.get(id);if(this.index.has(row.key))throw Error('Duplicate shared experience key');this.index.set(row.key,id);Map.prototype.set.call(this.projected,row.key,row.pair);}this.stamp();
 }
 get map(){this.refresh();return this.projected;}
 get(key){this.refresh();const id=this.index.get(key);return id===undefined?undefined:this.store.get(id).pair;}
 set(key,pair){
  this.world.validate(this.name,{key,pair});this.refresh();let id=this.index.get(key);
  if(id!==undefined&&this.store.get(id).pair===pair)return pair;
  if(id===undefined){id=this.world.create({SharedExperience:{key,pair}});this.index.set(key,id);}else this.world.add(id,this.name,{key,pair});
  Map.prototype.set.call(this.projected,key,pair);this.stamp();return pair;
 }
 delete(key){this.refresh();const id=this.index.get(key);if(id===undefined)return false;this.world.destroy(id);this.index.delete(key);Map.prototype.delete.call(this.projected,key);this.stamp();return true;}
}
const domains=new WeakMap();
export function memoryContacts(state){
 let d=domains.get(state);if(d)return d;const world=villageWorld(state.economy);d=new MemoryContacts(world,state.pairs??new Map());domains.set(state,d);world.setResource('Memory',state);
 Object.defineProperty(state,'pairs',{enumerable:true,configurable:true,get:()=>d.map});return d;
}
export function restoreMemoryContacts(e){
 const world=villageWorld(e),state=e.life?.memory;
 if(state){if(state.economy!==e)throw Error('Invalid memory ownership');memoryContacts(state);}
 else{if(world.stores.has('SharedExperience'))for(const id of world.query(['SharedExperience']))world.destroy(id);world.resources.delete('Memory');}
}
