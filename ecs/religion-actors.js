import {religionDomains} from './religion-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';import {villageWorld} from './village-world.js';
export {religionDomains} from './religion-data.js';
import {ActorFaith} from './religion-data.js';
export const actorFaith=p=>actorComponent(p,'ActorFaith'),ensureActorFaith=p=>ensureActorComponent(p,ActorFaith);
export function setActorFaith(p,values){const row={...values,person:p};if(!ActorFaith.validate(row))throw Error('Invalid ActorFaith');return setActorComponent(p,ActorFaith,row);}
import {ActorOffering} from './religion-data.js';
export const actorOffering=p=>actorComponent(p,'ActorOffering'),ensureActorOffering=p=>ensureActorComponent(p,ActorOffering);
export function setActorOffering(p,values){const row={...values,person:p};if(!ActorOffering.validate(row))throw Error('Invalid ActorOffering');return setActorComponent(p,ActorOffering,row);}
import {ActorPrayer} from './religion-data.js';
export const actorPrayer=p=>actorComponent(p,'ActorPrayer'),ensureActorPrayer=p=>ensureActorComponent(p,ActorPrayer);
export function setActorPrayer(p,values){const row={...values,person:p};if(!ActorPrayer.validate(row))throw Error('Invalid ActorPrayer');return setActorComponent(p,ActorPrayer,row);}
import {ActorDivineIntent} from './religion-data.js';
export const actorDivineIntent=p=>actorComponent(p,'ActorDivineIntent'),ensureActorDivineIntent=p=>ensureActorComponent(p,ActorDivineIntent);
export function setActorDivineIntent(p,values){const row={...values,person:p};if(!ActorDivineIntent.validate(row))throw Error('Invalid ActorDivineIntent');return setActorComponent(p,ActorDivineIntent,row);}
import {ActorDivineResponse} from './religion-data.js';
export const actorDivineResponse=p=>actorComponent(p,'ActorDivineResponse'),ensureActorDivineResponse=p=>ensureActorComponent(p,ActorDivineResponse);
export function setActorDivineResponse(p,values){const row={...values,person:p};if(!ActorDivineResponse.validate(row))throw Error('Invalid ActorDivineResponse');return setActorComponent(p,ActorDivineResponse,row);}
export function restoreReligionActors(e){
 const world=villageWorld(e),owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const plans=religionDomains.map(spec=>{const {definition,key}=spec;if(!world.stores.has(definition.name))world.define(definition);const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid '+key+' records');const rows=new Map(world.store(definition.name).values.map(r=>[r.person,r]));for(const row of incoming){world.validate(definition.name,row);if(!owners.has(row.person))throw Error('Unknown '+key+' owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous '+key);rows.set(row.person,row);}for(const row of rows.values()){world.validate(definition.name,row);if(!owners.has(row.person))throw Error('Unknown '+key+' owner');}return {spec,incoming,rows};});
 for(const {spec:{definition,key},incoming,rows} of plans){for(const id of world.query([definition.name]))world.remove(id,definition.name);for(const row of rows.values())world.add(owners.get(row.person),definition.name,row);
  const store=world.store(definition.name),compare=(a,b)=>{const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;},sorted=()=>store.values.slice().sort(compare),initial=sorted();let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
  Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});
 }
}
