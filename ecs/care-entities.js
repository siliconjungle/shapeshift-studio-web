import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const CareVisit={name:'CareVisit',validate:s=>record(s)&&record(s.adult)&&record(s.child)&&s.adult!==s.child};
export const SupportVisit={name:'SupportVisit',validate:s=>record(s)&&record(s.helper)&&record(s.recipient)&&s.helper!==s.recipient};
const domains=new WeakMap();
function visits(owner,definition,resource){
 let domain=domains.get(owner);
 if(!domain){
  const world=villageWorld(owner.economy);domain=new ComponentRecords(world,definition,owner.sessions??[]);domains.set(owner,domain);
  world.setResource(resource,owner);
  Object.defineProperty(owner,'sessions',{configurable:true,enumerable:true,get:()=>domain.list,set:records=>domain.replace(records)});
 }
 return domain;
}
export const careVisits=care=>visits(care,CareVisit,'Childcare');
export const supportVisits=support=>visits(support,SupportVisit,'Support');
export function restoreCareEntities(e){
 if(e.family?.care)careVisits(e.family.care).finishLoad();
 else {const w=villageWorld(e);if(w.stores.has('CareVisit'))for(const id of w.query(['CareVisit']))w.destroy(id);w.resources.delete('Childcare');}
 if(e.support)supportVisits(e.support).finishLoad();
 else {const w=villageWorld(e);if(w.stores.has('SupportVisit'))for(const id of w.query(['SupportVisit']))w.destroy(id);w.resources.delete('Support');}
}
