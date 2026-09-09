import {BeastEmotions} from './beast-emotions-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {BeastEmotions} from './beast-emotions-data.js';
export const beastEmotions=actor=>actorComponent(actor,'BeastEmotions');
export const ensureBeastEmotions=actor=>{if(actorKind(actor)!=='Beast')throw Error('Emotion owner must be a live Beast');return ensureActorComponent(actor,BeastEmotions);};
export function setBeastEmotions(actor,values){
 if(actorKind(actor)!=='Beast')throw Error('Emotion owner must be a live Beast');
 const row={...values,person:actor};if(!BeastEmotions.validate(row))throw Error('Invalid BeastEmotions');
 return setActorComponent(actor,BeastEmotions,row);
}
export function restoreBeastEmotions(e){
 const world=villageWorld(e);if(!world.stores.has('BeastEmotions'))world.define(BeastEmotions);
 const owners=new Map();for(const kind of ['Beast'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e.beastEmotions??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid beast emotions records');
 const rows=new Map(world.store('BeastEmotions').values.map(r=>[r.person,r]));
 for(const row of incoming){world.validate('BeastEmotions',row);if(!owners.has(row.person))throw Error('Unknown beast emotions owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous actor beast emotions');rows.set(row.person,row);}
 for(const row of rows.values()){world.validate('BeastEmotions',row);if(!owners.has(row.person))throw Error('Unknown beast emotions owner');}
 for(const id of world.query(['BeastEmotions']))world.remove(id,'BeastEmotions');
 for(const row of rows.values())world.add(owners.get(row.person),'BeastEmotions',row);
 const store=world.store('BeastEmotions'),compare=(a,b)=>{
  const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;
 };
 const sorted=()=>store.values.slice().sort(compare),initial=sorted();
 // Decode has finished filling this array. Adopt it so saved collection aliases
 // remain aliases; later structural changes produce a fresh immutable view.
 let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'beastEmotions',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
