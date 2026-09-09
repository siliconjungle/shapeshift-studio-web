import {rivalSettlements,rivalBeasts} from '../rival-roster.js';
import {villageWorld} from './village-world.js';
import {actorEntity,existingActor,validateActorOwner} from './actor-entities.js';
export const Beast={name:'Beast',replaceable:false,validate:b=>b!==null&&typeof b==='object'&&b.species==='beast'&&typeof b.id==='string'&&b.id.length>0};
const tags=['VillageBeast','RivalBeast'],domains=new WeakMap(),groups=new WeakMap();
export const beastEntity=(e,b)=>actorEntity(e,b,Beast);
function define(world){if(!world.stores.has('Beast'))world.define(Beast);for(const name of tags)if(!world.stores.has(name))world.define({name,validate:v=>Number.isSafeInteger(v?.order)&&v.order>=0});}
function validate(e,rows){const w=villageWorld(e);define(w);if(!Array.isArray(rows)||new Set(rows).size!==rows.length)throw Error('Invalid beast population');for(const b of rows){w.validate('Beast',b);validateActorOwner(e,b);}}
function group(e,name,settlement=null){
 const world=villageWorld(e);define(world);const store=world.store(name),actors=world.store('Beast');let cached=Object.freeze([]),membership=-1,revision=-1,actorRevision=-1,nextOrder=0,active=true;
 const assertActive=()=>{if(!active)throw Error('Beast population is no longer active');};
 const ids=()=>world.query([name,'Beast']).filter(id=>name!=='RivalBeast'||store.get(id).settlement===settlement);
 const domain={world,name,pending:null,deactivate(){active=false;},adopt(rows){assertActive();const current=this.list;if(rows.length!==current.length||rows.some((b,i)=>b!==current[i]))throw Error('Invalid beast projection');cached=Object.freeze(rows);},get list(){assertActive();if(membership!==store.membershipRevision||revision!==store.valueRevision||actorRevision!==actors.valueRevision){cached=Object.freeze(ids().slice().sort((a,b)=>store.get(a).order-store.get(b).order).map(id=>actors.get(id)));membership=store.membershipRevision;revision=store.valueRevision;actorRevision=actors.valueRevision;}return cached;},
  add(b){assertActive();validate(e,[b]);const id=beastEntity(e,b);if(store.has(id))throw Error('Duplicate beast membership');world.add(id,name,{order:nextOrder++,...(name==='RivalBeast'?{settlement}:{})});this.pending=null;return id;},
  remove(b){assertActive();const id=existingActor(e,b,'Beast');if(id===undefined||!store.has(id))return false;world.remove(id,name);if(!tags.some(t=>world.has(id,t)))world.destroy(id);this.pending=null;return true;},
  replace(rows,loading=false){assertActive();validate(e,rows);if(name==='RivalBeast'&&rows.length>1)throw Error('Multiple rival beasts');const previous=this.list;for(const b of rows)if(!previous.includes(b))this.add(b);for(const b of previous)if(!rows.includes(b))this.remove(b);for(const b of rows)world.add(beastEntity(e,b),name,{order:nextOrder++,...(name==='RivalBeast'?{settlement}:{})});this.pending=loading?rows:null;}
 };let owned=groups.get(world);if(!owned){owned=new Set();groups.set(world,owned);}owned.add(domain);return domain;
}
export function villageBeasts(state){let d=domains.get(state);if(d)return d;d=group(state.economy,'VillageBeast');d.replace(state.actors??[]);domains.set(state,d);Object.defineProperty(state,'actors',{enumerable:true,configurable:true,get:()=>d.list,set:rows=>d.replace(rows,true)});return d;}
export function rivalBeastEntities(e,state=e.rival){
 if(!state)return null;let d=domains.get(state);if(d)return d;
 const enumerable=Object.getOwnPropertyDescriptor(state,'beast')?.enumerable??false;let empty=state.beast==null?state.beast:undefined;
 d=group(e,'RivalBeast',state);d.replace(state.beast?[state.beast]:[]);domains.set(state,d);
 Object.defineProperty(state,'beast',{enumerable,configurable:true,get:()=>d.list[0]??empty,set:b=>{d.replace(b?[b]:[]);empty=b==null?b:undefined;Object.defineProperty(state,'beast',{enumerable:true});}});return d;
}
export const allBeasts=e=>[...(e.beasts?.actors??[]),...rivalBeasts(e)];
export function restoreBeastEntities(e){
 const w=villageWorld(e);define(w);
 const resident=e.beasts?(domains.get(e.beasts)?.pending??e.beasts.actors??[]):[],rivals=rivalSettlements(e).map(state=>({state,beast:state.beast,enumerable:Object.getOwnPropertyDescriptor(state,'beast')?.enumerable??false}));
 validate(e,resident);const all=[...resident,...rivals.map(r=>r.beast).filter(Boolean)];validate(e,all);
 for(const domain of groups.get(w)??[])domain.deactivate();groups.delete(w);
 for(const id of w.query(['Beast']))w.destroy(id);
 if(e.beasts){domains.delete(e.beasts);Object.defineProperty(e.beasts,'actors',{value:resident,writable:true,enumerable:true,configurable:true});villageBeasts(e.beasts).adopt(resident);}
 for(const {state,beast,enumerable} of rivals){domains.delete(state);Object.defineProperty(state,'beast',{value:beast,writable:true,enumerable,configurable:true});rivalBeastEntities(e,state);}
}
