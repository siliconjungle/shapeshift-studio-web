import {allEnemies,enemyEntity} from './enemy-entities.js';
import {ActorFeelings} from './feelings-data.js';
import {actorComponent,ensureActorComponent,setActorComponent} from './actor-entities.js';
import {personEntity} from './person-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
import {villageWorld} from './village-world.js';
export {ActorFeelings} from './feelings-data.js';
export const actorFeelings=actor=>actorComponent(actor,'ActorFeelings');
export const ensureActorFeelings=actor=>ensureActorComponent(actor,ActorFeelings);
export function setActorFeelings(actor,values){
 const row={...values,person:actor};if(!ActorFeelings.validate(row))throw Error('Invalid ActorFeelings');
 return setActorComponent(actor,ActorFeelings,row);
}
export function restoreActorFeelings(e){
 const world=villageWorld(e);if(!world.stores.has('ActorFeelings'))world.define(ActorFeelings);
 const people=[...knownPeople(e),...allBeasts(e),...allEnemies(e)],incoming=e.actorFeelings??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid actor feelings records');
 const rows=new Map(world.store('ActorFeelings').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorFeelings',row);if(!people.includes(row.person))throw Error('Unknown feelings owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor feelings');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorFeelings',row);if(!people.includes(row.person))throw Error('Unknown feelings owner');}
 for(const id of world.query(['ActorFeelings']))world.remove(id,'ActorFeelings');
 for(const row of rows.values())world.add(e.raids?.enemies.includes(row.person)?enemyEntity(e,row.person,'Raider'):e.slimes?.enemies.includes(row.person)?enemyEntity(e,row.person,'Slime'):row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'ActorFeelings',row);
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('ActorFeelings');
 Object.defineProperty(e,'actorFeelings',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
