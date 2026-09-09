import {villageWorld} from './village-world.js';
import {Cooking,validCooking} from './cooking-data.js';
import {campfireBinding} from './campfire-entities.js';
const bindings=new WeakMap();
function owner(e,row){if(!validCooking(row)||row.economy!==e)throw Error('Invalid cooking state or ownership');const fire=campfireBinding(row.fire??e.campfire);if(fire.world!==villageWorld(e))throw Error('Invalid cooking fire ownership');return fire;}
export function cookingBinding(row){const bound=bindings.get(row);if(!bound||!bound.world.alive(bound.id)||bound.world.get(bound.id,'Cooking')!==row||!bound.world.has(bound.world.owner(bound.id),'Campfire')||bound.world.resource('Village')!==row.economy)throw Error('Cooking is not a live entity');return bound;}
export const cookingEntity=row=>cookingBinding(row).id;
export function bindCooking(e,row){
 const fire=owner(e,row),world=fire.world,bound=bindings.get(row);
 if(bound){if(cookingBinding(row).world!==world||world.owner(bound.id)!==fire.id)throw Error('Invalid cooking fire ownership');return row;}
 if(!world.stores.has('Cooking'))world.define(Cooking);
 if(world.owned(fire.id).some(id=>world.has(id,'Cooking')))throw Error('Fire already owns a cooking pot');
 const id=world.create({Cooking:row});world.own(fire.id,id,{component:'Campfire'});bindings.set(row,{world,id});return row;
}
export function restoreCooking(e){
 const rows=[...new Set([e.cooking,...(e.exploration?.camps??[]).map(c=>c.cooking)].filter(r=>r!=null))],world=villageWorld(e),owners=rows.map(row=>owner(e,row));
 if(new Set(owners.map(o=>o.id)).size!==rows.length)throw Error('Duplicate cooking fire ownership');
 for(let i=0;i<rows.length;i++){const bound=bindings.get(rows[i]);if(bound&&(cookingBinding(rows[i]).world!==world||world.owner(bound.id)!==owners[i].id))throw Error('Invalid cooking fire ownership');}
 if(!world.stores.has('Cooking'))world.define(Cooking);
 for(const id of [...world.query(['Cooking'])])if(!rows.includes(world.get(id,'Cooking')))world.destroy(id);
 for(const row of rows)bindCooking(e,row);
}
