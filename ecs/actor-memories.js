import {allEnemies,enemyEntity} from './enemy-entities.js';
import {ActorMemories} from './memory-data.js';
import {actorComponent,setActorComponent} from './actor-entities.js';
import {personEntity} from './person-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
import {villageWorld} from './village-world.js';
export {ActorMemories} from './memory-data.js';
export const actorMemories=actor=>actorComponent(actor,'ActorMemories')?.values;
export function setActorMemories(actor,values){
 const row={person:actor,values};if(!ActorMemories.validate(row))throw Error('Invalid ActorMemories');
 setActorComponent(actor,ActorMemories,row);return values;
}
export function restoreActorMemories(e){
 const world=villageWorld(e);if(!world.stores.has('ActorMemories'))world.define(ActorMemories);
 const people=[...knownPeople(e),...allBeasts(e),...allEnemies(e)],incoming=e.actorMemories??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid actor memory records');
 const rows=new Map(world.store('ActorMemories').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorMemories',row);if(!people.includes(row.person))throw Error('Unknown memory owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor memories');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorMemories',row);if(!people.includes(row.person))throw Error('Unknown memory owner');}
 for(const id of world.query(['ActorMemories']))world.remove(id,'ActorMemories');
 for(const row of rows.values())world.add(e.raids?.enemies.includes(row.person)?enemyEntity(e,row.person,'Raider'):e.slimes?.enemies.includes(row.person)?enemyEntity(e,row.person,'Slime'):row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'ActorMemories',row);
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('ActorMemories');
 Object.defineProperty(e,'actorMemories',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
