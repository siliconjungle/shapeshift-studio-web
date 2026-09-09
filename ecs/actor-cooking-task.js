import {ActorCookingTask} from './cooking-task-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorCookingTask} from './cooking-task-data.js';
export const actorCookingTask=actor=>actorComponent(actor,'ActorCookingTask');
export const ensureActorCookingTask=actor=>ensureActorComponent(actor,ActorCookingTask);
export function setActorCookingTask(actor,values){
 const row={...values,person:actor};if(!ActorCookingTask.validate(row))throw Error('Invalid ActorCookingTask');
 return setActorComponent(actor,ActorCookingTask,row);
}
export function restoreActorCookingTask(e){
 const world=villageWorld(e);if(!world.stores.has('ActorCookingTask'))world.define(ActorCookingTask);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorCookingTask??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid cookingTask records');
 const rows=new Map(world.store('ActorCookingTask').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorCookingTask',row);if(!owners.has(row.person))throw Error('Unknown cookingTask owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor cookingTask');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorCookingTask',row);if(!owners.has(row.person))throw Error('Unknown cookingTask owner');}
 for(const id of world.query(['ActorCookingTask']))world.remove(id,'ActorCookingTask');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorCookingTask',row);
 const store=world.store('ActorCookingTask'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorCookingTask',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
