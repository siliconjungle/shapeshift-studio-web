import {villageWorld} from './village-world.js';
import {personEntity} from './person-entities.js';
import {actorComponent,ensureActorComponent} from './actor-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,key,test)=>!Object.hasOwn(r,key)||r[key]===undefined||test(r[key]);
export const SupportParticipant={name:'SupportParticipant',validate:r=>record(r)&&record(r.person)&&
 optional(r,'partnerId',v=>v===null||Number.isSafeInteger(v)&&v>=0)&&
 optional(r,'food',v=>Number.isFinite(v)&&v>=0)&&
 ['receiveAfter','checkAt','helpAfter'].every(k=>optional(r,k,Number.isFinite))};
export const supportParticipant=person=>actorComponent(person,'SupportParticipant');
export const ensureSupportParticipant=person=>ensureActorComponent(person,SupportParticipant);
const oldFields={supportPartnerId:'partnerId',supportFood:'food',supportAfter:'receiveAfter',supportCheckAt:'checkAt',helpAfter:'helpAfter'};
// Import is a one-time boundary. Runtime readers and writers use the component.
export function restoreSupportParticipants(e){
 const world=villageWorld(e);if(!world.stores.has('SupportParticipant'))world.define(SupportParticipant);
 const incoming=e.supportParticipants??[],people=[...knownPeople(e),...allBeasts(e)];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid support participants');
 const rows=[...incoming],owners=new Set();
 for(const row of rows){world.validate('SupportParticipant',row);if(!people.includes(row.person))throw Error('Unknown support participant');owners.add(row.person);}
 const converted=[];
 for(const person of people){
  const keys=Object.keys(oldFields).filter(k=>Object.hasOwn(person,k));if(!keys.length)continue;
  if(owners.has(person))throw Error('Ambiguous support participant state');
  const row={person};for(const key of keys)row[oldFields[key]]=person[key];
  world.validate('SupportParticipant',row);rows.push(row);converted.push({person,keys});
 }
 for(const id of world.query(['SupportParticipant']))world.remove(id,'SupportParticipant');
 for(const row of rows)world.add(row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'SupportParticipant',row);
 for(const {person,keys} of converted)for(const key of keys)delete person[key];
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('SupportParticipant');
 Object.defineProperty(e,'supportParticipants',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
