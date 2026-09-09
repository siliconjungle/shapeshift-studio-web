import {farmingDomains} from './farming-data.js';
import {environmentComponent,environmentOwner,setEnvironmentComponent} from './environment-entities.js';
import {villageWorld} from './village-world.js';
export {farmingDomains} from './farming-data.js';
export const plotPreparation=plot=>environmentComponent(plot,'PlotPreparation');
export const farmingSchedule=state=>environmentComponent(state,'FarmingSchedule');
export const farmingHistory=state=>environmentComponent(state,'FarmingHistory');
export const farmingSites=state=>environmentComponent(state,'FarmingSites');
function replace(owner,name,values){const spec=farmingDomains.find(s=>s.definition.name===name),b=environmentOwner(owner);if(!b||(b.name??b.component)!==spec.kind)throw Error('Invalid '+name+' owner');const row={...values,[spec.owner]:owner};if(!spec.definition.validate(row))throw Error('Invalid '+name);return setEnvironmentComponent(owner,spec.definition,row);}
export const setPlotPreparation=(p,values)=>replace(p,'PlotPreparation',values);
export const setFarmingSchedule=(s,values)=>replace(s,'FarmingSchedule',values);
export const setFarmingHistory=(s,values)=>replace(s,'FarmingHistory',values);
export const setFarmingSites=(s,values)=>replace(s,'FarmingSites',values);
export function plotInput(plot){const row=plotPreparation(plot);if(!row)throw Error('Missing plot preparation');const {plot:_,...fields}=row;return {...plot,...fields};}
export function restoreFarmingComponents(e){
 const world=villageWorld(e),plans=farmingDomains.map(spec=>{const {definition,key,kind,owner}=spec;if(!world.stores.has(definition.name))world.define(definition);const owners=new Map();if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.[owner])).size!==incoming.length)throw Error('Invalid '+key);
 const rows=new Map(world.store(definition.name).values.map(r=>[r[owner],r]));for(const row of incoming){world.validate(definition.name,row);if(!owners.has(row[owner]))throw Error('Unknown '+key+' owner');if(rows.has(row[owner])&&rows.get(row[owner])!==row)throw Error('Ambiguous '+key);rows.set(row[owner],row);}
 for(const row of rows.values()){world.validate(definition.name,row);if(!owners.has(row[owner]))throw Error('Unknown '+key+' owner');}for(const value of owners.keys())if(!rows.has(value))throw Error('Missing '+definition.name);
 return {spec,incoming,rows,owners};});
 for(const {spec:{definition,key,owner},incoming,rows,owners} of plans){for(const id of world.query([definition.name]))world.remove(id,definition.name);for(const row of rows.values())world.add(owners.get(row[owner]),definition.name,row);
 const store=world.store(definition.name),sorted=()=>store.values.slice().sort((a,b)=>String(a[owner].id??'').localeCompare(String(b[owner].id??''))),initial=sorted();let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});
 }
}
