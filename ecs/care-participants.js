import {villageWorld} from './village-world.js';
import {personEntity} from './person-entities.js';
import {actorComponent,ensureActorComponent} from './actor-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,key,test)=>!Object.hasOwn(r,key)||r[key]===undefined||test(r[key]);
export const CareParticipant={name:'CareParticipant',validate:r=>record(r)&&record(r.person)&&
 optional(r,'partnerId',v=>v===null||Number.isSafeInteger(v)&&v>=0)&&
 optional(r,'food',v=>Number.isFinite(v)&&v>=0)&&
 optional(r,'nextAt',Number.isFinite)&&optional(r,'elderVisit',v=>typeof v==='boolean')};
export const careParticipant=person=>actorComponent(person,'CareParticipant');
export const ensureCareParticipant=person=>ensureActorComponent(person,CareParticipant);
const oldFields={carePartnerId:'partnerId',careFood:'food',nextCareAt:'nextAt',elderVisit:'elderVisit'};
// Import is a one-time boundary. Runtime readers and writers use the component.
export function restoreCareParticipants(e){
 const world=villageWorld(e);if(!world.stores.has('CareParticipant'))world.define(CareParticipant);
 const incoming=e.careParticipants??[],people=[...knownPeople(e),...allBeasts(e)];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid care participants');
 const rows=[...incoming],owners=new Set();
 for(const row of rows){world.validate('CareParticipant',row);if(!people.includes(row.person))throw Error('Unknown care participant');owners.add(row.person);}
 const converted=[];
 for(const person of people){
  const keys=Object.keys(oldFields).filter(k=>Object.hasOwn(person,k));if(!keys.length)continue;
  if(owners.has(person))throw Error('Ambiguous care participant state');
  const row={person};for(const key of keys)row[oldFields[key]]=person[key];
  world.validate('CareParticipant',row);rows.push(row);converted.push({person,keys});
 }
 for(const id of world.query(['CareParticipant']))world.remove(id,'CareParticipant');
 for(const row of rows)world.add(row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'CareParticipant',row);
 for(const {person,keys} of converted)for(const key of keys)delete person[key];
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('CareParticipant');
 Object.defineProperty(e,'careParticipants',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
