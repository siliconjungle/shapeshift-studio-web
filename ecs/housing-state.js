import {homeInput} from './home-entities.js';
import {ConstructionProgress,housingDomains} from './housing-data.js';
import {addEnvironmentRecords,environmentComponent,environmentOwner,setEnvironmentComponent} from './environment-entities.js';
import {villageWorld} from './village-world.js';
export {housingDomains} from './housing-data.js';
export const housingSchedule=state=>environmentComponent(state,'HousingSchedule');
export const housingAccounting=state=>environmentComponent(state,'HousingAccounting');
export const housingSites=state=>environmentComponent(state,'HousingSites');
export const constructionProgress=p=>environmentComponent(p,'ConstructionProgress');
export const constructionDefinition=p=>environmentComponent(p,'ConstructionDefinition');
function replace(owner,name,values){const spec=housingDomains.find(s=>s.definition.name===name),b=environmentOwner(owner);if(!b||(b.name??b.component)!==spec.kind)throw Error('Invalid '+name+' owner');const row={...values,[spec.owner]:owner};if(!spec.definition.validate(row))throw Error('Invalid '+name);return setEnvironmentComponent(owner,spec.definition,row);}
export const setHousingSchedule=(s,values)=>replace(s,'HousingSchedule',values);
export const setHousingAccounting=(s,values)=>replace(s,'HousingAccounting',values);
export const setHousingSites=(s,values)=>replace(s,'HousingSites',values);
export function addConstructionProject(housing,input){
 const b=environmentOwner(housing);if(!b||b.name!=='Housing')throw Error('Invalid housing owner');
 if(!input||!Number.isFinite(input.x)||!Number.isFinite(input.z)||!['state','stage','strikes','delivered','reservedBy','spent'].every(k=>Object.hasOwn(input,k)))throw Error('Incomplete construction project');
 const project={...input};addEnvironmentRecords(housing,project);return project;
}
export const setConstructionProgress=(p,values)=>replace(p,'ConstructionProgress',values);
export const setConstructionDefinition=(p,values)=>replace(p,'ConstructionDefinition',values);
export function ensureConstructionProgress(p){return constructionProgress(p)??setConstructionProgress(p,{});}
// Explicit DTO conversion and creation-input application, never live field forwarding.
export function constructionInput(p){const result={...p};if(p.home)result.home=homeInput(p.home);for(const spec of housingDomains.filter(s=>s.kind==='ConstructionProject')){const row=environmentComponent(p,spec.definition.name);if(row)for(const key of spec.fields)if(Object.hasOwn(row,key))result[key]=row[key];}return result;}
export function applyConstructionInput(p,input){
 const b=environmentOwner(p);if(!b||b.component!=='ConstructionProject')throw Error('Invalid construction owner');
 if(Object.hasOwn(input,'id')&&input.id!==p.id)throw Error('Cannot change construction identity');
 const identity={...input},plans=[];
 for(const spec of housingDomains.filter(s=>s.kind==='ConstructionProject')){
  const keys=spec.fields.filter(k=>Object.hasOwn(input,k));if(!keys.length)continue;
  const row={...environmentComponent(p,spec.definition.name),project:p};for(const key of keys){row[key]=input[key];delete identity[key];}
  if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);plans.push({spec,row});
 }
 b.world.validate('ConstructionProject',{...p,...identity});Object.assign(p,identity);
 for(const {spec,row}of plans)setEnvironmentComponent(p,spec.definition,row);return p;
}
export function restoreHousingComponents(e){
 const world=villageWorld(e),plans=housingDomains.map(spec=>{const {definition,key,kind,owner}=spec;if(!world.stores.has(definition.name))world.define(definition);const owners=new Map();if(world.stores.has(kind))for(const id of world.query([kind]))owners.set(world.get(id,kind),id);
 const incoming=e[key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.[owner])).size!==incoming.length)throw Error('Invalid '+key);
 const rows=new Map(world.store(definition.name).values.map(r=>[r[owner],r]));for(const row of incoming){world.validate(definition.name,row);if(!owners.has(row[owner]))throw Error('Unknown '+key+' owner');if(rows.has(row[owner])&&rows.get(row[owner])!==row)throw Error('Ambiguous '+key);rows.set(row[owner],row);}
 for(const row of rows.values()){world.validate(definition.name,row);if(!owners.has(row[owner]))throw Error('Unknown '+key+' owner');}for(const value of owners.keys())if(spec.required!==false&&!rows.has(value))throw Error('Missing '+definition.name);
 return {spec,incoming,rows,owners};});
 for(const {spec:{definition,key,owner},incoming,rows,owners} of plans){for(const id of world.query([definition.name]))world.remove(id,definition.name);for(const row of rows.values())world.add(owners.get(row[owner]),definition.name,row);
 const store=world.store(definition.name),sorted=()=>store.values.slice().sort((a,b)=>String(a[owner].id??'').localeCompare(String(b[owner].id??''))),initial=sorted();let cached=Object.freeze(incoming.length===initial.length&&incoming.every((r,i)=>r===initial[i])?incoming:initial),membership=store.membershipRevision,revision=store.valueRevision;
 Object.defineProperty(e,key,{enumerable:true,configurable:true,get(){if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(sorted());membership=store.membershipRevision;revision=store.valueRevision;}return cached;}});
 }
}
