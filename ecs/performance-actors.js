import {ActorPerformanceCareer,ActorPerformanceParticipation,performanceActorDomains} from './performance-data.js';
import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {villageWorld} from './village-world.js';
export {performanceActorDomains} from './performance-data.js';
export const actorPerformanceCareer=p=>actorComponent(p,'ActorPerformanceCareer'),ensureActorPerformanceCareer=p=>ensureActorComponent(p,ActorPerformanceCareer);
export const actorPerformanceParticipation=p=>actorComponent(p,'ActorPerformanceParticipation'),ensureActorPerformanceParticipation=p=>ensureActorComponent(p,ActorPerformanceParticipation);
function set(p,definition,values){return setActorComponent(p,definition,{...values,person:p});}
export const setActorPerformanceCareer=(p,v)=>set(p,ActorPerformanceCareer,v),setActorPerformanceParticipation=(p,v)=>set(p,ActorPerformanceParticipation,v);
export function restorePerformanceActors(e){
 const world=villageWorld(e),owners=new Map();for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const plans=performanceActorDomains.map(spec=>{const {definition,key}=spec;if(!world.stores.has(definition.name))world.define(definition);const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid '+key+' records');const rows=new Map(world.store(definition.name).values.map(r=>[r.person,r]));for(const row of incoming){world.validate(definition.name,row);if(!owners.has(row.person))throw Error('Unknown '+key+' owner');if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous '+key);rows.set(row.person,row);}for(const row of rows.values()){world.validate(definition.name,row);if(!owners.has(row.person))throw Error('Unknown '+key+' owner');}return {spec,incoming,rows};});
 for(const {spec:{definition,key},incoming,rows} of plans){for(const id of world.query([definition.name]))world.remove(id,definition.name);for(const row of rows.values())world.add(owners.get(row.person),definition.name,row);
  const store=world.store(definition.name),compare=(a,b)=>{const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;},sorted=()=>store.values.slice().sort(compare),initial=sorted();let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
  Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});
 }
}
