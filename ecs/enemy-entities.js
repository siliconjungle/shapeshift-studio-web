import {villageWorld} from './village-world.js';
import {actorEntity,existingActor,validateActorOwner,actorKind} from './actor-entities.js';
import {actorNeedsInput} from './needs-data.js';
const record=r=>r!==null&&typeof r==='object'&&!Array.isArray(r);
export const Raider={name:'Raider',replaceable:false,validate:r=>record(r)&&Number.isSafeInteger(r.id)&&r.id>=0};
export const Slime={name:'Slime',replaceable:false,validate:r=>record(r)&&typeof r.id==='string'&&r.id.startsWith('slime-')&&r.species==='slime'};
const membership={name:'EncounterMember',validate:r=>record(r)&&Number.isSafeInteger(r.order)&&r.order>=0};
const kinds={Raider,Slime},resources={Raider:'Raids',Slime:'Slimes'},domains=new WeakMap();
export const enemyEntity=(e,actor,kind)=>actorEntity(e,actor,kinds[kind]);
function define(world,kind){if(!world.stores.has(kind))world.define(kinds[kind]);if(!world.stores.has(membership.name))world.define(membership);}
export function enemyEntities(state,kind){
 let domain=domains.get(state);if(domain){if(domain.kind!==kind)throw Error('Enemy domain kind cannot change');return domain;}
 const e=state.economy,world=villageWorld(e);define(world,kind);const store=world.store(kind),members=world.store(membership.name);let nextOrder=0,cached=Object.freeze([]),revision=-1,membershipRevision=-1,orderRevision=-1;
 function validate(rows){if(!Array.isArray(rows)||new Set(rows).size!==rows.length||new Set(rows.map(r=>r?.id)).size!==rows.length)throw Error('Invalid '+kind+' population');for(const r of rows){world.validate(kind,r);validateActorOwner(e,r);if(actorKind(r)&&actorKind(r)!==kind)throw Error('Actor kind cannot change');const bound=existingActor(e,r,kind);if(bound===undefined)actorNeedsInput(r);}}
 domain={world,kind,pending:null,
  get list(){if(revision!==store.valueRevision||membershipRevision!==store.membershipRevision||orderRevision!==members.valueRevision){cached=Object.freeze(world.query([kind,membership.name]).slice().sort((a,b)=>members.get(a).order-members.get(b).order).map(id=>store.get(id)));revision=store.valueRevision;membershipRevision=store.membershipRevision;orderRevision=members.valueRevision;}return cached;},
  add(r){validate([r]);if(this.list.some(p=>p===r||p.id===r.id))throw Error('Duplicate '+kind+' member');const id=enemyEntity(e,r,kind);world.add(id,membership.name,{order:nextOrder++});this.pending=null;return id;},
  remove(r){const id=existingActor(e,r,kind);if(id===undefined||!world.has(id,membership.name))return false;this.pending=null;return world.destroy(id);},
  replace(rows,loading=false){validate(rows);const previous=this.list;for(const r of previous)if(!rows.includes(r))this.remove(r);for(const r of rows)if(!previous.includes(r))this.add(r);for(const r of rows)world.add(enemyEntity(e,r,kind),membership.name,{order:nextOrder++});this.pending=loading?rows:null;}
 };
 domain.replace(state.enemies??[]);domains.set(state,domain);world.setResource(resources[kind],state);
 Object.defineProperty(state,'enemies',{enumerable:true,configurable:true,get:()=>domain.list,set:rows=>domain.replace(rows,true)});return domain;
}
export function restoreEnemyEntities(e){
 const world=villageWorld(e);
 for(const [key,kind] of [['raids','Raider'],['slimes','Slime']]){
  define(world,kind);const state=e[key],rows=state?(domains.get(state)?.pending??state.enemies??[]):[];
  for(const id of world.query([kind]))world.destroy(id);
  world.resources.delete(resources[kind]);
  if(state){domains.delete(state);Object.defineProperty(state,'enemies',{value:rows,writable:true,enumerable:true,configurable:true});enemyEntities(state,kind);}
 }
}
export const allEnemies=e=>[...(e.raids?.enemies??[]),...(e.slimes?.enemies??[])];
