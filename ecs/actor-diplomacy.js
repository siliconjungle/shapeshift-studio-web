import {ActorDiplomacy} from './diplomacy-actor-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorDiplomacy} from './diplomacy-actor-data.js';
export const actorDiplomacy=actor=>actorComponent(actor,'ActorDiplomacy');
export const ensureActorDiplomacy=actor=>ensureActorComponent(actor,ActorDiplomacy);
export function setActorDiplomacy(actor,values){
 const row={...values,person:actor};if(!ActorDiplomacy.validate(row))throw Error('Invalid ActorDiplomacy');
 return setActorComponent(actor,ActorDiplomacy,row);
}
export function restoreActorDiplomacy(e){
 const world=villageWorld(e);if(!world.stores.has('ActorDiplomacy'))world.define(ActorDiplomacy);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorDiplomacy??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid diplomacy records');
 const rows=new Map(world.store('ActorDiplomacy').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorDiplomacy',row);if(!owners.has(row.person))throw Error('Unknown diplomacy owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor diplomacy');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorDiplomacy',row);if(!owners.has(row.person))throw Error('Unknown diplomacy owner');}
 for(const id of world.query(['ActorDiplomacy']))world.remove(id,'ActorDiplomacy');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorDiplomacy',row);
 const store=world.store('ActorDiplomacy'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorDiplomacy',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
