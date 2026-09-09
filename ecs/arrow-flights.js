import {bindArcheryState} from './archery-state.js';
import {villageWorld} from './village-world.js';
import {ComponentRecords} from './component-records.js';
export const validArrowFlight=a=>a!==null&&typeof a==='object'&&!Array.isArray(a)&&Number.isSafeInteger(a.id)&&a.id>=0&&Number.isSafeInteger(a.sourceId)&&a.sourceId>=0&&(typeof a.targetId==='string'||Number.isSafeInteger(a.targetId)&&a.targetId>=0)&&(a.resolved===undefined||typeof a.resolved==='boolean')&&(a.critical===undefined||typeof a.critical==='boolean')&&['villager','raider','outsider'].includes(a.sourceKind)&&['villager','raider','slime','outsider','beast'].includes(a.targetKind)&&[a.at,a.arriveAt,a.damage,a.from?.x,a.from?.y,a.from?.z,a.to?.x,a.to?.y,a.to?.z].every(Number.isFinite)&&a.arriveAt>a.at&&a.damage>0&&a.damage<=100;
export const ArrowFlight={name:'ArrowFlight',validate:validArrowFlight};
const domains=new WeakMap();
export function arrowFlights(e){
 const state=e.archery;if(!state)throw Error('Archery state is absent');let d=domains.get(state);if(d){if(d.world!==villageWorld(e))throw Error('Arrow flights belong to another world');return d;}
 bindArcheryState(e,state);d=new ComponentRecords(villageWorld(e),ArrowFlight,state.arrows);domains.set(state,d);
 Object.defineProperty(state,'arrows',{enumerable:true,configurable:true,get:()=>d.list,set:rows=>d.replace(rows)});return d;
}
export function restoreArrowFlights(e){
 if(e.archery)return arrowFlights(e).finishLoad();
 const world=villageWorld(e);world.resources.delete('Archery');if(world.stores.has('ArrowFlight'))for(const id of world.query(['ArrowFlight']))world.destroy(id);
}
