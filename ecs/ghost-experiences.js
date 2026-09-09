import {villageWorld} from './village-world.js';
import {personEntity} from './person-entities.js';
import {actorComponent,ensureActorComponent} from './actor-entities.js';
import {knownPeople} from '../village-people.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,key,test)=>!Object.hasOwn(r,key)||r[key]===undefined||test(r[key]);
export const GhostExperience={name:'GhostExperience',validate:r=>record(r)&&record(r.person)&&
 optional(r,'conversationId',v=>typeof v==='string')&&optional(r,'conversationUntil',v=>Number.isFinite(v)&&v>=0)&&
 optional(r,'fearUntil',v=>Number.isFinite(v)&&v>=0)&&optional(r,'memories',v=>Array.isArray(v)&&v.length<=4&&v.every(m=>record(m)&&Number.isSafeInteger(m.ghostId)&&m.ghostId>=0&&typeof m.text==='string'&&Number.isFinite(m.at)&&m.at>=0))};
export const ghostExperience=person=>actorComponent(person,'GhostExperience');
export const ensureGhostExperience=person=>ensureActorComponent(person,GhostExperience);
const oldFields={ghostConversationId:'conversationId',ghostConversationUntil:'conversationUntil',ghostFearUntil:'fearUntil',ghostMemories:'memories'};
// Import is a one-time boundary. Runtime readers and writers use the component.
export function restoreGhostExperiences(e){
 const world=villageWorld(e);if(!world.stores.has('GhostExperience'))world.define(GhostExperience);
 const incoming=e.ghostExperiences??[],people=knownPeople(e);
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid ghost experiences');
 const rows=[...incoming],owners=new Set();
 for(const row of rows){world.validate('GhostExperience',row);if(!people.includes(row.person))throw Error('Unknown ghost experience');owners.add(row.person);}
 const converted=[];
 for(const person of people){
  const keys=Object.keys(oldFields).filter(k=>Object.hasOwn(person,k));if(!keys.length)continue;
  if(owners.has(person))throw Error('Ambiguous ghost experience state');
  const row={person};for(const key of keys)row[oldFields[key]]=person[key];
  world.validate('GhostExperience',row);rows.push(row);converted.push({person,keys});
 }
 for(const id of world.query(['GhostExperience']))world.remove(id,'GhostExperience');
 for(const row of rows)world.add(personEntity(e,row.person),'GhostExperience',row);
 for(const {person,keys} of converted)for(const key of keys)delete person[key];
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('GhostExperience');
 Object.defineProperty(e,'ghostExperiences',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
