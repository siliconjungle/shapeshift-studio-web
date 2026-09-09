import {ActorCombat} from './combat-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorCombat} from './combat-data.js';
export const actorCombat=actor=>actorComponent(actor,'ActorCombat');
export const ensureActorCombat=actor=>ensureActorComponent(actor,ActorCombat);
export function setActorCombat(actor,values){
 const row={...values,person:actor};if(!ActorCombat.validate(row))throw Error('Invalid ActorCombat');
 return setActorComponent(actor,ActorCombat,row);
}
export function restoreActorCombat(e){
 const world=villageWorld(e);if(!world.stores.has('ActorCombat'))world.define(ActorCombat);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorCombats??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid combat records');
 const rows=new Map(world.store('ActorCombat').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorCombat',row);if(!owners.has(row.person))throw Error('Unknown combat owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor combat');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorCombat',row);if(!owners.has(row.person))throw Error('Unknown combat owner');}
 for(const id of world.query(['ActorCombat']))world.remove(id,'ActorCombat');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorCombat',row);
 const store=world.store('ActorCombat'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorCombats',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
