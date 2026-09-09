import {ActorPlaces} from './community-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorPlaces} from './community-data.js';
export const actorPlaces=actor=>actorComponent(actor,'ActorPlaces');
export const ensureActorPlaces=actor=>ensureActorComponent(actor,ActorPlaces);
export function setActorPlaces(actor,values){
 const row={...values,person:actor};if(!ActorPlaces.validate(row))throw Error('Invalid ActorPlaces');
 return setActorComponent(actor,ActorPlaces,row);
}
export function restoreActorPlaces(e){
 const world=villageWorld(e);if(!world.stores.has('ActorPlaces'))world.define(ActorPlaces);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorPlaces??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid place attachment records');
 const rows=new Map(world.store('ActorPlaces').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorPlaces',row);if(!owners.has(row.person))throw Error('Unknown place attachment owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor places');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorPlaces',row);if(!owners.has(row.person))throw Error('Unknown place attachment owner');}
 for(const id of world.query(['ActorPlaces']))world.remove(id,'ActorPlaces');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorPlaces',row);
 const store=world.store('ActorPlaces'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorPlaces',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
