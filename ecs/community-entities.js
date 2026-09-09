import {villageWorld} from './village-world.js';
import {PlaceAttachmentsState,OccasionsState,OccasionSession} from './community-data.js';
const definitions={PlaceAttachmentsState,OccasionsState},bindings=new WeakMap();
function define(world){for(const d of [PlaceAttachmentsState,OccasionsState,OccasionSession])if(!world.stores.has(d.name))world.define(d);}
export function communityBinding(state,name){const b=bindings.get(state);if(!b||b.name!==name||!b.world.alive(b.id)||b.world.get(b.id,name)!==state||b.world.resources.get(name)!==state)throw Error(name+' is not a live entity');return b;}
export const occasionSession=state=>{if(state==null)return null;const {world,id}=communityBinding(state,'OccasionsState');return world.get(id,'OccasionSession')?.value??null;};
function validateSession(e,row){if(!OccasionSession.validate(row)||row.occasions.economy!==e||row.value.members.some(m=>!e.workers.includes(m.worker)))throw Error('Invalid OccasionSession ownership or data');}
function project(e,incoming){const world=villageWorld(e),store=world.store('OccasionSession'),sorted=()=>store.values.slice().sort((a,b)=>bindings.get(a.occasions).id-bindings.get(b.occasions).id),initial=sorted();let cached=Object.freeze(incoming?.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,'occasionSessions',{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});
}
function validateState(e,name,state){if(!definitions[name].validate(state)||state.economy!==e)throw Error('Invalid '+name+' ownership or data');const b=bindings.get(state);if(b&&(communityBinding(state,name).world!==villageWorld(e)))throw Error('Foreign '+name);}
function install(e,name,state){const world=villageWorld(e),bound=bindings.get(state);if(bound)return bound;const old=world.resources.get(name);if(old&&old!==state){const b=bindings.get(old);if(b)world.destroy(b.id);}const id=world.create({[name]:state}),b={world,id,name};bindings.set(state,b);world.setResource(name,state);return b;}
export function bindCommunity(e,name,state){const world=villageWorld(e);validateState(e,name,state);define(world);const inline=name==='OccasionsState'&&Object.hasOwn(state,'session'),value=inline?state.session:null,row=value==null?null:{occasions:state,value};if(row)validateSession(e,row);const b=install(e,name,state);if(inline){if(world.has(b.id,'OccasionSession'))throw Error('Ambiguous OccasionSession');if(row)world.add(b.id,'OccasionSession',row);delete state.session;}project(e,e.occasionSessions);return state;}
export function setOccasionSession(state,value){const {world,id}=communityBinding(state,'OccasionsState');if(value==null){world.remove(id,'OccasionSession');return null;}const row={occasions:state,value};validateSession(state.economy,row);world.add(id,'OccasionSession',row);return value;}
export function restoreCommunity(e){
 const world=villageWorld(e),states=[['PlaceAttachmentsState',e.attachments],['OccasionsState',e.occasions]].filter(([,s])=>s!=null),incoming=e.occasionSessions??[];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.occasions)).size!==incoming.length)throw Error('Invalid occasion session collection');
 for(const [name,state] of states)validateState(e,name,state);
 const rows=new Map();for(const row of incoming){validateSession(e,row);if(row.occasions!==e.occasions)throw Error('Unknown occasion session owner');rows.set(row.occasions,row);}
 const state=e.occasions;if(state&&Object.hasOwn(state,'session')){if(rows.has(state))throw Error('Ambiguous OccasionSession');if(state.session!=null){const row={occasions:state,value:state.session};validateSession(e,row);rows.set(state,row);}}
 define(world);
 for(const [name] of Object.entries(definitions)){const keep=states.find(([n])=>n===name)?.[1];for(const id of [...world.query([name])])if(world.get(id,name)!==keep)world.destroy(id);if(!keep)world.resources.delete(name);}
 for(const [name,state] of states)install(e,name,state);
 for(const id of [...world.query(['OccasionSession'])])world.remove(id,'OccasionSession');
 for(const row of rows.values())world.add(bindings.get(row.occasions).id,'OccasionSession',row);
 if(state)delete state.session;project(e,incoming);
}
