import {ResourceOak,ResourceNode,ResourceHarvest,ResourceGrowth,ResourceCultivation,ResourceWoodland,ResourceCondition,resourceDomains} from './resource-data.js';
export {resourceDomains} from './resource-data.js';
const bindings=new WeakMap();
export function resourceBinding(node){const b=bindings.get(node);if(!b||!b.world.alive(b.id)||b.world.store('ResourceNode').get(b.id)!==node)return undefined;return b;}
export function resourceHarvest(node){const b=resourceBinding(node);return b?.world.store('ResourceHarvest').get(b.id);}
export function resourceGrowth(node){const b=resourceBinding(node);return b?.world.store('ResourceGrowth').get(b.id);}
function set(node,values,definition){const b=resourceBinding(node);if(!b)throw Error('Resource is not a live entity');const row={...b.world.store(definition.name).get(b.id),...values,node};b.world.validate(definition.name,row);return b.world.add(b.id,definition.name,row);}
export const setResourceHarvest=(node,values)=>set(node,values,ResourceHarvest),setResourceGrowth=(node,values)=>set(node,values,ResourceGrowth);
export function defineResourceStores(world){for(const definition of [ResourceNode,...resourceDomains.map(s=>s.definition)])if(!world.stores.has(definition.name))world.define(definition);}
export function resourcePlan(world,node,incoming){
 if(!node||typeof node!=='object'||Array.isArray(node))throw Error('Invalid resource node');const b=resourceBinding(node);if(!b&&bindings.has(node))throw Error('Cannot rebind a retired resource identity');if(b&&b.world!==world)throw Error('Resource belongs to another world');const identity={...node},rows={};
 for(const spec of resourceDomains){const keys=spec.fields.filter(k=>Object.hasOwn(node,k)),existing=b?.world.store(spec.definition.name).get(b.id),supplied=incoming?.[spec.key]?.get(node);if(keys.length&&(existing||supplied)||existing&&supplied&&existing!==supplied)throw Error('Ambiguous '+spec.definition.name);const row=supplied??existing??Object.fromEntries([['node',node],...keys.map(k=>[k,node[k]])]);if(row.node!==node||!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);rows[spec.definition.name]=row;for(const key of spec.fields)delete identity[key];}
 if(!ResourceNode.validate(identity))throw Error('Invalid resource identity');return {node,rows};
}
export function bindResourcePlan(world,{node,rows}){for(const spec of resourceDomains)for(const key of spec.fields)delete node[key];const id=world.create({ResourceNode:node,...rows});bindings.set(node,{world,id});return id;}

// Explicit construction input for a new entity. Used when loading a save that
// predates a map expansion; retired entities never retain hidden state.
export function resourceInput(node){
 const b=resourceBinding(node);if(!b)throw Error('Resource is not a live entity');const input={...node};
 for(const spec of resourceDomains){const row=b.world.get(b.id,spec.definition.name);for(const key of spec.fields)if(Object.hasOwn(row,key))input[key]=row[key];}
 return input;
}

export function resourceCultivation(node){const b=resourceBinding(node);return b?.world.store('ResourceCultivation').get(b.id);}
export const setResourceCultivation=(node,values)=>set(node,values,ResourceCultivation);

export function resourceWoodland(node){const b=resourceBinding(node);return b?.world.store('ResourceWoodland').get(b.id);}
export const setResourceWoodland=(node,values)=>set(node,values,ResourceWoodland);

export function resourceCondition(node){const b=resourceBinding(node);return b?.world.store('ResourceCondition').get(b.id);}
export const setResourceCondition=(node,values)=>set(node,values,ResourceCondition);

export function resourceOak(node){const b=resourceBinding(node);return b?.world.store('ResourceOak').get(b.id);}
export const setResourceOak=(node,values)=>set(node,values,ResourceOak);
