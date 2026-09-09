import {actorWorld,actorKind,actorComponent,existingActor} from './actor-entities.js';
import {BeastRelationships} from './beast-relationships-data.js';
import {defineBeastRelationships,installBeastRelationships,beastRelationshipList,findBeastRelationshipRow,appendBeastRelationship,replaceBeastRelationshipRows} from './beast-relationships-store.js';
import {villageWorld} from './village-world.js';
function context(person){const world=actorWorld(person);if(!world||actorKind(person)!=='Beast')throw Error('Relationship owner must be a live Beast');return {world,id:existingActor(world.resource('Village'),person,'Beast')};}
export function beastRelationships(person){const world=actorWorld(person);return world&&actorComponent(person,'BeastRelationships')?beastRelationshipList(world,person):undefined;}
export function ensureBeastRelationships(person){const {world,id}=context(person);if(!actorComponent(person,'BeastRelationships'))installBeastRelationships(world,id,{person,relationships:[]});return beastRelationshipList(world,person);}
export function findBeastRelationship(person,targetId){const world=actorWorld(person);return world&&actorComponent(person,'BeastRelationships')?findBeastRelationshipRow(world,person,targetId)?.row.relationship:undefined;}
export function addBeastRelationship(person,relationship){const {world,id}=context(person);defineBeastRelationships(world);world.validate('BeastRelationship',{person,relationship,order:0});ensureBeastRelationships(person);return appendBeastRelationship(world,id,person,relationship);}
export function setBeastRelationships(person,relationships){const {world,id}=context(person);defineBeastRelationships(world);world.validate('BeastRelationships',{person,relationships});if(!actorComponent(person,'BeastRelationships'))return installBeastRelationships(world,id,{person,relationships}).relationships;return replaceBeastRelationshipRows(world,id,person,relationships);}
export function removeBeastRelationships(person){const {world,id}=context(person);if(!world.stores.has('BeastRelationships')||!world.has(id,'BeastRelationships'))return false;for(const child of world.owned(id))if(world.has(child,'BeastRelationship'))world.destroy(child);return world.remove(id,'BeastRelationships');}
export function restoreBeastRelationships(e){
 const world=villageWorld(e);defineBeastRelationships(world);const owners=new Map();if(world.stores.has('Beast'))for(const id of world.query(['Beast']))owners.set(world.get(id,'Beast'),id);
 const incoming=e.beastRelationships??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid beast relationship records');
 const rows=new Map(world.store('BeastRelationships').values.map(row=>[row.person,row]));
 for(const row of incoming){world.validate('BeastRelationships',row);if(!owners.has(row.person))throw Error('Unknown beast relationship owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous beast relationships');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('BeastRelationships',row);if(!owners.has(row.person))throw Error('Unknown beast relationship owner');}
 // Existing rows came from one-time inline input and already own their edges.
 for(const row of rows.values())if(!world.has(owners.get(row.person),'BeastRelationships'))installBeastRelationships(world,owners.get(row.person),row);
 const store=world.store('BeastRelationships'),sorted=()=>store.values.slice().sort((a,b)=>a.person.id<b.person.id?-1:a.person.id>b.person.id?1:0),initial=sorted();let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'beastRelationships',{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});
}
