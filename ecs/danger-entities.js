import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';
import {personEntity} from './person-entities.js';
import {actorComponent} from './actor-entities.js';
import {knownPeople} from '../village-people.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,key,test)=>!Object.hasOwn(r,key)||r[key]===undefined||test(r[key]);
export const DangerAwareness={name:'DangerAwareness',validate:r=>record(r)&&record(r.person)&&
 optional(r,'memories',v=>Array.isArray(v)&&v.every(m=>record(m)&&typeof m.key==='string'&&[m.x,m.z,m.radius,m.attackedAt].every(Number.isFinite)&&m.radius>=0))&&
 optional(r,'retryAt',Number.isFinite)&&optional(r,'cueAt',Number.isFinite)&&optional(r,'partnerId',v=>v===null||Number.isSafeInteger(v)&&v>=0)};
export const EscortTrip={name:'EscortTrip',validate:t=>record(t)&&record(t.leader)&&record(t.buddy)&&t.leader!==t.buddy&&record(t.memory)&&record(t.goal)};
const domains=new WeakMap();
const oldFields={dangerMemories:'memories',dangerRetryAt:'retryAt',dangerCueAt:'cueAt',dangerPartnerId:'partnerId'};
export const dangerAwareness=person=>actorComponent(person,'DangerAwareness');
export function ensureDangerAwareness(e,person){
 const world=villageWorld(e),id=personEntity(e,person);
 if(!world.stores.has('DangerAwareness'))world.define(DangerAwareness);
 return world.get(id,'DangerAwareness')??world.add(id,'DangerAwareness',{person});
}
function awarenessList(world){return world.query(['DangerAwareness']).map(id=>world.get(id,'DangerAwareness')).sort((a,b)=>a.person.id-b.person.id);}
export function dangerEntities(owner){
 let domain=domains.get(owner);if(domain)return domain;
 const e=owner.economy,world=villageWorld(e),incoming=owner.awareness??[];
 if(!world.stores.has('DangerAwareness'))world.define(DangerAwareness);
 // Validate all imported data before replacing membership. The graph loader
 // calls this only after references and arrays have been fully populated.
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid danger awareness records');
 const people=knownPeople(e);
 for(const row of incoming){world.validate('DangerAwareness',row);if(!people.includes(row.person))throw Error('Unknown danger awareness owner');}
 for(const id of world.query(['DangerAwareness']))world.remove(id,'DangerAwareness');
 for(const row of incoming)world.add(personEntity(e,row.person),'DangerAwareness',row);
 // One-time old-save conversion; no old field readers or forwarding at runtime.
 for(const person of people){
  const fields=Object.keys(oldFields).filter(key=>Object.hasOwn(person,key));if(!fields.length)continue;
  if(dangerAwareness(person))throw Error('Ambiguous danger awareness state');
  const row={person};for(const key of fields)row[oldFields[key]]=person[key];world.validate('DangerAwareness',row);
  world.add(personEntity(e,person),'DangerAwareness',row);for(const key of fields)delete person[key];
 }
 const trips=new ComponentRecords(world,EscortTrip,owner.trips??[]);
 domain={world,trips};domains.set(owner,domain);world.setResource('Danger',owner);
 let cached=Object.freeze([]),revision=-1,membership=-1;const store=world.store('DangerAwareness');
 Object.defineProperty(owner,'awareness',{enumerable:true,configurable:true,get(){
  if(revision!==store.valueRevision||membership!==store.membershipRevision){cached=Object.freeze(awarenessList(world));revision=store.valueRevision;membership=store.membershipRevision;}return cached;
 }});
 Object.defineProperty(owner,'trips',{enumerable:true,configurable:true,get:()=>trips.list,set:rows=>trips.replace(rows)});
 return domain;
}
export function restoreDangerEntities(e){
 if(e.danger)return dangerEntities(e.danger);
 const world=villageWorld(e);
 if(world.stores.has('EscortTrip'))for(const id of world.query(['EscortTrip']))world.destroy(id);
 if(world.stores.has('DangerAwareness'))for(const id of world.query(['DangerAwareness']))world.remove(id,'DangerAwareness');
 world.resources.delete('Danger');
}
