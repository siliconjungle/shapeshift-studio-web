import {villageWorld} from './village-world.js';
import {Campfire,validCampfire} from './campfire-data.js';
const bindings=new WeakMap();
export function bindCampfire(e,state){
 if(!validCampfire(state)||state.economy!==e)throw Error('Invalid campfire state or ownership');
 const world=villageWorld(e),bound=bindings.get(state);
 if(bound){if(bound.world!==world||!world.alive(bound.id)||world.get(bound.id,'Campfire')!==state)throw Error('Campfire is no longer active');return state;}
 if(!world.stores.has('Campfire'))world.define(Campfire);
 const id=world.create({Campfire:state});bindings.set(state,{world,id});return state;
}
export function campfireBinding(state){const bound=bindings.get(state);if(!bound||!bound.world.alive(bound.id)||bound.world.get(bound.id,'Campfire')!==state||bound.world.resource('Village')!==state.economy)throw Error('Campfire is not a live entity');return bound;}
export const campfireEntity=state=>campfireBinding(state).id;
export function retireCampfire(state){const {world,id}=campfireBinding(state);world.destroy(id);}
export function restoreCampfires(e){
 const states=[...new Set([e.campfire,...(e.exploration?.camps??[]).map(c=>c.fire)].filter(s=>s!=null))];
 if(states.some(s=>!validCampfire(s)||s.economy!==e))throw Error('Invalid campfire state or ownership');
 const world=villageWorld(e);
 for(const state of states){const bound=bindings.get(state);if(bound&&(bound.world!==world||!world.alive(bound.id)||world.get(bound.id,'Campfire')!==state))throw Error('Campfire is no longer active');}
 if(!world.stores.has('Campfire'))world.define(Campfire);
 // Decode has supplied fresh records. Retire all prior fires, including outposts.
 for(const id of [...world.query(['Campfire'])]){const old=world.get(id,'Campfire');if(!states.includes(old))world.destroy(id);}
 for(const state of states)bindCampfire(e,state);
}
