import {allEnemies,enemyEntity} from './enemy-entities.js';
import {ActorNeeds} from './needs-data.js';
import {actorComponent,setActorComponent} from './actor-entities.js';
import {personEntity} from './person-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
import {villageWorld} from './village-world.js';
export {ActorNeeds} from './needs-data.js';
export const actorNeeds=actor=>actorComponent(actor,'ActorNeeds')?.values;
export function setActorNeeds(actor,values){
 const row={person:actor,values};if(!ActorNeeds.validate(row))throw Error('Invalid ActorNeeds');
 setActorComponent(actor,ActorNeeds,row);return values;
}
export function restoreActorNeeds(e){
 const world=villageWorld(e);if(!world.stores.has('ActorNeeds'))world.define(ActorNeeds);
 const people=[...knownPeople(e),...allBeasts(e),...allEnemies(e)],incoming=e.actorNeeds??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid actor needs records');
 const rows=new Map(world.store('ActorNeeds').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorNeeds',row);if(!people.includes(row.person))throw Error('Unknown needs owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor needs');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorNeeds',row);if(!people.includes(row.person))throw Error('Unknown needs owner');}
 for(const id of world.query(['ActorNeeds']))world.remove(id,'ActorNeeds');
 for(const row of rows.values())world.add(e.raids?.enemies.includes(row.person)?enemyEntity(e,row.person,'Raider'):e.slimes?.enemies.includes(row.person)?enemyEntity(e,row.person,'Slime'):row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'ActorNeeds',row);
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('ActorNeeds');
 Object.defineProperty(e,'actorNeeds',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
