import {ActorTraditions} from './tradition-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorTraditions} from './tradition-data.js';
export const actorTraditions=actor=>actorComponent(actor,'ActorTraditions');
export const ensureActorTraditions=actor=>ensureActorComponent(actor,ActorTraditions);
export function setActorTraditions(actor,values){
 const row={...values,person:actor};if(!ActorTraditions.validate(row))throw Error('Invalid ActorTraditions');
 return setActorComponent(actor,ActorTraditions,row);
}
export function restoreActorTraditions(e){
 const world=villageWorld(e);if(!world.stores.has('ActorTraditions'))world.define(ActorTraditions);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorTraditions??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid traditions records');
 const rows=new Map(world.store('ActorTraditions').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorTraditions',row);if(!owners.has(row.person))throw Error('Unknown traditions owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor traditions');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorTraditions',row);if(!owners.has(row.person))throw Error('Unknown traditions owner');}
 for(const id of world.query(['ActorTraditions']))world.remove(id,'ActorTraditions');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorTraditions',row);
 const store=world.store('ActorTraditions'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorTraditions',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
