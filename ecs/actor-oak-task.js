import {ActorOakTask} from './oak-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorOakTask} from './oak-data.js';
export const actorOakTask=actor=>actorComponent(actor,'ActorOakTask');
export const ensureActorOakTask=actor=>ensureActorComponent(actor,ActorOakTask);
export function setActorOakTask(actor,values){
 const row={...values,person:actor};if(!ActorOakTask.validate(row))throw Error('Invalid ActorOakTask');
 return setActorComponent(actor,ActorOakTask,row);
}
export function restoreActorOakTask(e){
 const world=villageWorld(e);if(!world.stores.has('ActorOakTask'))world.define(ActorOakTask);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorOakTasks??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid oak task records');
 const rows=new Map(world.store('ActorOakTask').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorOakTask',row);if(!owners.has(row.person))throw Error('Unknown oak task owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor oak task');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorOakTask',row);if(!owners.has(row.person))throw Error('Unknown oak task owner');}
 for(const id of world.query(['ActorOakTask']))world.remove(id,'ActorOakTask');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorOakTask',row);
 const store=world.store('ActorOakTask'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorOakTasks',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
