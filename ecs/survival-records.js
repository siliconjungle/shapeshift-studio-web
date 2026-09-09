import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';
const record=r=>r!==null&&typeof r==='object'&&!Array.isArray(r),id=n=>Number.isSafeInteger(n)&&n>=0,point=r=>Number.isFinite(r.x)&&Number.isFinite(r.z);
export const DroppedResource={name:'DroppedResource',replaceable:false,validate:r=>record(r)&&id(r.id)&&point(r)&&typeof r.kind==='string'&&r.kind.length>0&&Number.isFinite(r.amount)&&r.amount>0&&(r.reservedBy===null||id(r.reservedBy))};
export const Memorial={name:'Memorial',replaceable:false,validate:r=>record(r)&&typeof r.id==='string'&&r.id.length>0&&id(r.workerId)&&point(r)&&Number.isFinite(r.diedAt)&&r.diedAt>=0};
function validateRows(rows,definition,key){if(!Array.isArray(rows)||rows.some(r=>!definition.validate(r)))throw Error('Invalid '+definition.name+' records');if(new Set(rows.map(r=>r[key])).size!==rows.length)throw Error('Duplicate '+definition.name+' identity');}
export function validateSurvivalRecords(state){validateRows(state.drops,DroppedResource,'id');validateRows(state.memorials,Memorial,'workerId');if(new Set(state.memorials.map(r=>r.id)).size!==state.memorials.length)throw Error('Duplicate Memorial identity');}
class SurvivalRecords extends ComponentRecords {
 replace(rows,loading=true){
  super.replace(rows,loading);
  // Once decoding is complete, keep the imported collection's graph identity.
  // Future structural changes produce a fresh immutable projection.
  if(!loading){this.cachedList=Object.freeze(rows);this.listRevision=this.store.valueRevision;this.listMembership=this.store.membershipRevision;}
 }
 validate(rows){super.validate(rows);const key=this.name==='DroppedResource'?'id':'workerId';validateRows(rows,this.world.definitions.get(this.name),key);if(this.name==='Memorial'&&new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Duplicate Memorial identity');}
 add(row){this.validate([...this.list,row]);return super.add(row);}
}
const domains=new WeakMap();
export function survivalRecords(state){
 const world=villageWorld(state.economy);if(world.resources.get('Survival')!==state||state.economy.survival!==state)throw Error('Survival state is no longer active');
 let domain=domains.get(state);if(domain)return domain;
 validateSurvivalRecords(state);
 domain={world,drops:new SurvivalRecords(world,DroppedResource,state.drops),memorials:new SurvivalRecords(world,Memorial,state.memorials)};domains.set(state,domain);
 for(const key of ['drops','memorials'])Object.defineProperty(state,key,{enumerable:true,configurable:true,get:()=>domain[key].list,set:rows=>domain[key].replace(rows)});
 return domain;
}
export function restoreSurvivalRecords(state){
 const previous=domains.get(state);
 if(previous){for(const key of ['drops','memorials'])Object.defineProperty(state,key,{value:previous[key].pendingLoad??state[key],writable:true,enumerable:true,configurable:true});domains.delete(state);}
 return survivalRecords(state);
}
