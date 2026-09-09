import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';
import {validGhostVisit} from './ghost-data.js';
export const GhostVisit={name:'GhostVisit',validate:validGhostVisit,replaceable:false};
// A visit is an owned entity with a lifetime independent of its deceased person.
class GhostVisitRecords extends ComponentRecords {
 validate(rows){super.validate(rows);if(rows.length>1)throw Error('Only one ghost visit can be active');}
 add(row){if(this.list.length)throw Error('Only one ghost visit can be active');return super.add(row);}
}
const domains=new WeakMap();
export function ghostVisits(e,state=e.ghosts){
 if(!state)throw Error('Ghost state is absent');const world=villageWorld(e);let d=domains.get(state);
 if(d){if(d.world!==world)throw Error('Ghost state belongs to another world');return d;}
 d=new GhostVisitRecords(world,GhostVisit,state.actors??[]);domains.set(state,d);world.setResource('Ghosts',state);
 Object.defineProperty(state,'actors',{enumerable:true,configurable:true,get:()=>d.list,set:rows=>d.replace(rows)});return d;
}
export function restoreGhostVisits(e){
 const world=villageWorld(e),state=e.ghosts;
 if(state){
  const previous=domains.get(state);if(previous&&previous.world!==world)throw Error('Ghost state belongs to another world');
  const rows=previous?.pendingLoad??state.actors;
  // The decoder may populate an array after assigning it. Bind only its final graph.
  Object.defineProperty(state,'actors',{value:rows,writable:true,enumerable:true,configurable:true});domains.delete(state);ghostVisits(e,state);
 }else{
  if(world.stores.has('GhostVisit'))for(const id of world.query(['GhostVisit']))world.destroy(id);
  world.resources.delete('Ghosts');
 }
}
