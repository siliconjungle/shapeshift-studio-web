import {ActorVitality} from './vitality-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorVitality} from './vitality-data.js';
export const actorVitality=actor=>actorComponent(actor,'ActorVitality');
export const ensureActorVitality=actor=>ensureActorComponent(actor,ActorVitality);
export function setActorVitality(actor,values){
 const row={...values,person:actor};if(!ActorVitality.validate(row))throw Error('Invalid ActorVitality');
 return setActorComponent(actor,ActorVitality,row);
}
export function restoreActorVitality(e){
 const world=villageWorld(e);if(!world.stores.has('ActorVitality'))world.define(ActorVitality);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorVitality??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid vitality records');
 const rows=new Map(world.store('ActorVitality').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorVitality',row);if(!owners.has(row.person))throw Error('Unknown vitality owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor vitality');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorVitality',row);if(!owners.has(row.person))throw Error('Unknown vitality owner');}
 for(const id of world.query(['ActorVitality']))world.remove(id,'ActorVitality');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorVitality',row);
 const store=world.store('ActorVitality'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorVitality',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
