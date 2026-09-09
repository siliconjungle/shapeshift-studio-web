import {ActorRepairTask} from './repair-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {ActorRepairTask} from './repair-data.js';
export const actorRepairTask=actor=>actorComponent(actor,'ActorRepairTask');
export const ensureActorRepairTask=actor=>ensureActorComponent(actor,ActorRepairTask);
export function setActorRepairTask(actor,values){
 const row={...values,person:actor};if(!ActorRepairTask.validate(row))throw Error('Invalid ActorRepairTask');
 return setActorComponent(actor,ActorRepairTask,row);
}
export function restoreActorRepairTask(e){
 const world=villageWorld(e);if(!world.stores.has('ActorRepairTask'))world.define(ActorRepairTask);
 const owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.actorRepairTasks??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid repair task records');
 const rows=new Map(world.store('ActorRepairTask').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('ActorRepairTask',row);if(!owners.has(row.person))throw Error('Unknown repair task owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor repair task');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('ActorRepairTask',row);if(!owners.has(row.person))throw Error('Unknown repair task owner');}
 for(const id of world.query(['ActorRepairTask']))world.remove(id,'ActorRepairTask');
 for(const row of rows.values())world.add(owners.get(row.person),'ActorRepairTask',row);
 const store=world.store('ActorRepairTask'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'actorRepairTasks',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
