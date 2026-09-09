import {BeastCommands} from './beast-commands-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {BeastCommands} from './beast-commands-data.js';
export const beastCommands=actor=>actorComponent(actor,'BeastCommands');
export const ensureBeastCommands=actor=>{if(actorKind(actor)!=='Beast')throw Error('Commands owner must be a live Beast');return ensureActorComponent(actor,BeastCommands);};
export function setBeastCommands(actor,values){
 if(actorKind(actor)!=='Beast')throw Error('Commands owner must be a live Beast');
 const row={...values,person:actor};if(!BeastCommands.validate(row))throw Error('Invalid BeastCommands');
 return setActorComponent(actor,BeastCommands,row);
}
export function restoreBeastCommands(e){
 const world=villageWorld(e);if(!world.stores.has('BeastCommands'))world.define(BeastCommands);
 const owners=new Map();for(const kind of ['Beast'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.beastCommands??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid beast commands records');
 const rows=new Map(world.store('BeastCommands').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('BeastCommands',row);if(!owners.has(row.person))throw Error('Unknown beast commands owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor beast commands');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('BeastCommands',row);if(!owners.has(row.person))throw Error('Unknown beast commands owner');}
 for(const id of world.query(['BeastCommands']))world.remove(id,'BeastCommands');
 for(const row of rows.values())world.add(owners.get(row.person),'BeastCommands',row);
 const store=world.store('BeastCommands'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'beastCommands',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
