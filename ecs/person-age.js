import {PersonAge} from './age-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {personEntity} from './person-entities.js';
import {knownPeople} from '../village-people.js';
import {villageWorld} from './village-world.js';
export {PersonAge} from './age-data.js';
export const personAge=actor=>actorComponent(actor,'PersonAge');
const requirePerson=actor=>{if(actorKind(actor)!=='Person')throw Error('Age owner must be a live Person');};
export const ensurePersonAge=actor=>{requirePerson(actor);return ensureActorComponent(actor,PersonAge);};
export function setPersonAge(actor,values){
 requirePerson(actor);const row={...values,person:actor};if(!PersonAge.validate(row))throw Error('Invalid PersonAge');
 return setActorComponent(actor,PersonAge,row);
}
export function restorePersonAge(e){
 const world=villageWorld(e);if(!world.stores.has('PersonAge'))world.define(PersonAge);
 const people=knownPeople(e),incoming=e.personAge??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid person age records');
 const rows=new Map(world.store('PersonAge').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('PersonAge',row);if(!people.includes(row.person))throw Error('Unknown age owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous person age');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('PersonAge',row);if(!people.includes(row.person))throw Error('Unknown age owner');}
 for(const id of world.query(['PersonAge']))world.remove(id,'PersonAge');
 for(const row of rows.values())world.add(personEntity(e,row.person),'PersonAge',row);
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('PersonAge');
 Object.defineProperty(e,'personAge',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
