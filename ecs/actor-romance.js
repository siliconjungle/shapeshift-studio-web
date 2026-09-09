import {allEnemies,enemyEntity} from './enemy-entities.js';
import {ActorRomance} from './romance-data.js';
import {actorComponent,ensureActorComponent,setActorComponent} from './actor-entities.js';
import {personEntity} from './person-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
import {villageWorld} from './village-world.js';
export {ActorRomance} from './romance-data.js';
export const actorRomance=actor=>actorComponent(actor,'ActorRomance');
export const ensureActorRomance=actor=>ensureActorComponent(actor,ActorRomance);
export function setActorRomance(actor,values){
 const row={...values,person:actor};if(!ActorRomance.validate(row))throw Error('Invalid ActorRomance');
 return setActorComponent(actor,ActorRomance,row);
}
export function restoreActorRomance(e){
 const world=villageWorld(e);if(!world.stores.has('ActorRomance'))world.define(ActorRomance);
 const people=[...knownPeople(e),...allBeasts(e),...allEnemies(e)],incoming=e.actorRomance??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid actor romance records');
 const rows=new Map(world.store('ActorRomance').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorRomance',row);if(!people.includes(row.person))throw Error('Unknown romance owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor romance');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorRomance',row);if(!people.includes(row.person))throw Error('Unknown romance owner');}
 for(const id of world.query(['ActorRomance']))world.remove(id,'ActorRomance');
 for(const row of rows.values())world.add(e.raids?.enemies.includes(row.person)?enemyEntity(e,row.person,'Raider'):e.slimes?.enemies.includes(row.person)?enemyEntity(e,row.person,'Slime'):row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'ActorRomance',row);
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('ActorRomance');
 Object.defineProperty(e,'actorRomance',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
