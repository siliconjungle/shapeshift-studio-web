import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';

const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const personId=value=>Number.isSafeInteger(value)&&value>=0;
export const Relationship={name:'Relationship',validate:r=>record(r)&&personId(r.a)&&personId(r.b)&&r.a!==r.b,prepare:r=>{
 // Endpoints identify an edge and never change during its life. Affinity,
 // attraction, memories and romance remain ordinary writable data. Retargeting
 // is an explicit component replacement, so the pair index can invalidate.
 for(const key of ['a','b'])Object.defineProperty(r,key,{value:r[key],writable:false,configurable:false,enumerable:true});
}};
export const SocialMeeting={name:'SocialMeeting',validate:s=>record(s)&&Array.isArray(s.workers)&&s.workers.length===2&&s.workers.every(record)&&s.workers[0]!==s.workers[1]};

function putPair(index,a,b,value){const lo=Math.min(a,b),hi=Math.max(a,b);let row=index.get(lo);if(!row)index.set(lo,row=new Map());if(row.has(hi))throw Error('Duplicate relationship pair');row.set(hi,value);}
class Relationships extends ComponentRecords {
 constructor(world,records){super(world,Relationship,records);this.pairs=new Map();this.indexRevision=-1;this.indexMembership=-1;}
 validate(records){super.validate(records);const pairs=new Map();for(const r of records)putPair(pairs,r.a,r.b,r);}
 refresh(){
  if(this.indexRevision===this.store.valueRevision&&this.indexMembership===this.store.membershipRevision)return;
  this.pairs.clear();for(const id of this.ids){const r=this.store.get(id);putPair(this.pairs,r.a,r.b,id);}
  this.indexRevision=this.store.valueRevision;this.indexMembership=this.store.membershipRevision;
 }
 find(a,b){this.refresh();const id=this.pairs.get(Math.min(a,b))?.get(Math.max(a,b));return id===undefined?undefined:this.store.get(id);}
 add(r){
  this.world.validate(this.name,r);this.refresh();if(this.find(r.a,r.b))throw Error('Duplicate relationship pair');
  this.pendingLoad=null;const id=this.world.create({Relationship:r});putPair(this.pairs,r.a,r.b,id);
  this.indexRevision=this.store.valueRevision;this.indexMembership=this.store.membershipRevision;return id;
 }
}
const domains=new WeakMap();
export function socialEntities(life){
 let domain=domains.get(life);
 if(!domain){
  const world=villageWorld(life.economy);
  domain={world,relationships:new Relationships(world,life.relationships??[]),meetings:new ComponentRecords(world,SocialMeeting,life.sessions??[])};
  domains.set(life,domain);
  Object.defineProperty(life,'relationships',{configurable:true,enumerable:true,get:()=>domain.relationships.list,set:records=>domain.relationships.replace(records)});
  Object.defineProperty(life,'sessions',{configurable:true,enumerable:true,get:()=>domain.meetings.list,set:records=>domain.meetings.replace(records)});
 }
 return domain;
}
export function restoreSocialEntities(e){
 if(!e.life){const world=villageWorld(e);for(const name of ['Relationship','SocialMeeting'])if(world.stores.has(name))for(const id of world.query([name]))world.destroy(id);return;}
 const domain=socialEntities(e.life);domain.relationships.finishLoad();domain.meetings.finishLoad();
}
