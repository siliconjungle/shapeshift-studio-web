import {villageWorld} from './village-world.js';
import {validArrowFlight} from './arrow-flights.js';
const bindings=new WeakMap();
export function validArcheryState(s){return s!=null&&typeof s==='object'&&!Array.isArray(s)&&
 Number.isSafeInteger(s.nextId)&&s.nextId>=0&&Array.isArray(s.arrows)&&s.arrows.length<256&&
 s.arrows.every(validArrowFlight)&&new Set(s.arrows.map(a=>a.id)).size===s.arrows.length&&s.arrows.every(a=>a.id<s.nextId)&&
 Object.keys(s).every(k=>['nextId','arrows'].includes(k));}
export function bindArcheryState(e,state){
 const world=villageWorld(e);
 if(!validArcheryState(state))throw Error('Invalid archery state');
 const owner=bindings.get(state);if(owner&&owner!==world)throw Error('Archery state belongs to another world');
 bindings.set(state,world);world.setResource('Archery',state);
 Object.defineProperty(e,'archery',{enumerable:true,configurable:true,get:()=>world.resources.get('Archery'),set(next){
  if(next===world.resources.get('Archery'))return;
  if(next!=null){if(!validArcheryState(next))throw Error('Invalid archery state');const owner=bindings.get(next);if(owner&&owner!==world)throw Error('Archery state belongs to another world');}
  if(world.stores.has('ArrowFlight'))for(const id of world.query(['ArrowFlight']))world.destroy(id);
  if(next==null)world.resources.delete('Archery');else bindArcheryState(e,next);
 }});
 return state;
}
