import {actorComponent,ensureActorComponent,actorKind} from './actor-entities.js';
import {animalParticipationDomains,animalParticipationInput,WildlifeParticipant,BirdParticipant,AnimalRelationships} from './animal-participation-data.js';
import {personEntity} from './person-entities.js';
import {villageWorld} from './village-world.js';
import {knownPeople} from '../village-people.js';
export {WildlifeParticipant,BirdParticipant,AnimalRelationships} from './animal-participation-data.js';
export const wildlifeParticipant=p=>actorComponent(p,'WildlifeParticipant');
export const birdParticipant=p=>actorComponent(p,'BirdParticipant');
export const animalRelationships=p=>actorComponent(p,'AnimalRelationships');
function ensure(p,definition){if(actorKind(p)!=='Person')throw Error('Animal interaction owner must be a live Person');return ensureActorComponent(p,definition);}
export const ensureWildlifeParticipant=p=>ensure(p,WildlifeParticipant);
export const ensureBirdParticipant=p=>ensure(p,BirdParticipant);
export const ensureAnimalRelationships=p=>ensure(p,AnimalRelationships);
export function restoreAnimalParticipants(e){
 const world=villageWorld(e),people=knownPeople(e),owners=new Set(people),converted=people.flatMap(animalParticipationInput),plans=[];
 // Validate every domain before replacing any live component or old-save field.
 for(const spec of animalParticipationDomains){const {definition,key}=spec,name=definition.name;
  if(!world.stores.has(name))world.define(definition);
  const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid '+name+' records');
  const rows=new Map(world.store(name).values.map(r=>[r.person,r]));
  for(const row of [...incoming,...converted.filter(c=>c.definition===definition).map(c=>c.row)]){
   if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous '+name+' state');rows.set(row.person,row);
  }
  for(const row of rows.values()){world.validate(name,row);if(!owners.has(row.person))throw Error('Unknown '+name+' owner');}
  plans.push({...spec,rows,incoming});
 }
 for(const {definition,key,rows,incoming} of plans){const name=definition.name;
  for(const id of world.query([name]))world.remove(id,name);
  for(const row of rows.values())world.add(personEntity(e,row.person),name,row);
  const store=world.store(name),ordered=store.values.slice().sort((a,b)=>a.person.id-b.person.id);
  let cached=Object.freeze(incoming.length===ordered.length&&incoming.every((r,i)=>r===ordered[i])?incoming:ordered),revision=store.valueRevision;
  Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){
   if(revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>a.person.id-b.person.id));revision=store.valueRevision;}return cached;
  }});
 }
 for(const {row,keys} of converted)for(const key of keys)delete row.person[key];
}
