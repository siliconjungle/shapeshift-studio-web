import {actorComponent,ensureActorComponent,setActorComponent,actorKind} from './actor-entities.js';
import {ActorCurse,ActorCurseCare,ActorCurseMemories,ActorRelicAttachment,ActorRelicTask,ActorRelicMemories,curseRelicDomains} from './curse-relic-data.js';
import {villageWorld} from './village-world.js';
export {ActorCurse,ActorCurseCare,ActorCurseMemories,ActorRelicAttachment,ActorRelicTask,ActorRelicMemories} from './curse-relic-data.js';
export const actorCurse=p=>actorComponent(p,'ActorCurse');
export const actorCurseCare=p=>actorComponent(p,'ActorCurseCare');
export const actorCurseMemories=p=>actorComponent(p,'ActorCurseMemories');
export const actorRelicAttachment=p=>actorComponent(p,'ActorRelicAttachment');
export const actorRelicTask=p=>actorComponent(p,'ActorRelicTask');
export const actorRelicMemories=p=>actorComponent(p,'ActorRelicMemories');
export const ensureActorCurse=p=>ensureActorComponent(p,ActorCurse);
export const ensureActorCurseCare=p=>ensureActorComponent(p,ActorCurseCare);
export const ensureActorCurseMemories=p=>ensureActorComponent(p,ActorCurseMemories);
export const ensureActorRelicAttachment=p=>ensureActorComponent(p,ActorRelicAttachment);
export const ensureActorRelicTask=p=>ensureActorComponent(p,ActorRelicTask);
export const ensureActorRelicMemories=p=>ensureActorComponent(p,ActorRelicMemories);
function set(p,definition,values){return setActorComponent(p,definition,{...values,person:p});}
export const setActorCurse=(p,values)=>set(p,ActorCurse,values);
export const setActorCurseCare=(p,values)=>set(p,ActorCurseCare,values);
export const setActorCurseMemories=(p,values)=>set(p,ActorCurseMemories,values);
export const setActorRelicAttachment=(p,values)=>set(p,ActorRelicAttachment,values);
export const setActorRelicTask=(p,values)=>set(p,ActorRelicTask,values);
export const setActorRelicMemories=(p,values)=>set(p,ActorRelicMemories,values);
export function restoreActorCurseRelic(e){
 const world=villageWorld(e),owners=new Map(),plans=[];
 for(const kind of ['Person','Beast','Raider','Slime','Wildlife','Bird'])if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 // Validate all six domains and owners before changing any live memberships.
 for(const spec of curseRelicDomains){const {definition,key}=spec,name=definition.name;
  const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid '+name+' records');
  const rows=new Map((world.stores.get(name)?.values??[]).map(r=>[r.person,r]));
  for(const row of incoming){if(!definition.validate(row))throw Error('Invalid '+name);if(rows.has(row.person)&&rows.get(row.person)!==row)throw Error('Ambiguous '+name+' state');rows.set(row.person,row);}
  for(const row of rows.values()){if(!definition.validate(row))throw Error('Invalid '+name);if(!owners.has(row.person))throw Error('Unknown '+name+' owner');}
  plans.push({...spec,rows,incoming});
 }
 const compare=(a,b)=>{const x=actorKind(a.person),y=actorKind(b.person);return x<y?-1:x>y?1:typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0;};
 for(const {definition,key,rows,incoming} of plans){const name=definition.name;
  if(!world.stores.has(name))world.define(definition);
  for(const id of world.query([name]))world.remove(id,name);
  for(const row of rows.values())world.add(owners.get(row.person),name,row);
  const store=world.store(name),sorted=()=>store.values.slice().sort(compare),initial=sorted();
  let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),revision=store.valueRevision;
  Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(revision!==store.valueRevision){cached=Object.freeze(sorted());revision=store.valueRevision;}return cached;}});
 }
}
