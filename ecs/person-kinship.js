import {PersonKinship} from './kinship-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {personEntity} from './person-entities.js';
import {knownPeople} from '../village-people.js';
import {villageWorld} from './village-world.js';
export {PersonKinship} from './kinship-data.js';
export const personKinship=actor=>actorComponent(actor,'PersonKinship');
const requirePerson=actor=>{if(actorKind(actor)!=='Person')throw Error('Kinship owner must be a live Person');};
export const ensurePersonKinship=actor=>{requirePerson(actor);return ensureActorComponent(actor,PersonKinship);};
export function setPersonKinship(actor,values){
 requirePerson(actor);const row={...values,person:actor};if(!PersonKinship.validate(row))throw Error('Invalid PersonKinship');
 return setActorComponent(actor,PersonKinship,row);
}
export function restorePersonKinship(e){
 const world=villageWorld(e);if(!world.stores.has('PersonKinship'))world.define(PersonKinship);
 const people=knownPeople(e),incoming=e.personKinship??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid person kinship records');
 const rows=new Map(world.store('PersonKinship').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('PersonKinship',row);if(!people.includes(row.person))throw Error('Unknown kinship owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous person kinship');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('PersonKinship',row);if(!people.includes(row.person))throw Error('Unknown kinship owner');}
 for(const id of world.query(['PersonKinship']))world.remove(id,'PersonKinship');
 for(const row of rows.values())world.add(personEntity(e,row.person),'PersonKinship',row);
 const store=world.store('PersonKinship'),sorted=()=>store.values.slice().sort((a,b)=>a.person.id-b.person.id),initial=sorted();
 // Adopt the decoded projection so other saved references retain their aliases.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'personKinship',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
