import {settlementDomains,settlementPartInput,settlementInput} from './settlement-data.js';
export {settlementDomains} from './settlement-data.js';
import {villageWorld} from './village-world.js';
import {existingActor} from './actor-entities.js';
import {rivalSettlements} from '../rival-roster.js';
import {RivalSettlement,RivalVisit,RivalVisitOwner,RelicMission,SettlementRelicIntent,visitMissionInput,settlementRelicInput} from './rival-state-data.js';
const settlements=new WeakMap(),visits=new WeakMap();
const specs=[{definition:RelicMission,key:'relicMissions',owner:'visit',bindings:visits,input:visitMissionInput},{definition:SettlementRelicIntent,key:'settlementRelicIntents',owner:'settlement',bindings:settlements,input:settlementRelicInput},...settlementDomains.map(spec=>({...spec,owner:'settlement',bindings:settlements,required:true,input:s=>settlementPartInput(s,spec)}))];
export const rivalComponentKeys=specs.map(s=>s.key);
function define(world){for(const d of [RivalSettlement,RivalVisit,RivalVisitOwner,...specs.map(s=>s.definition)])if(!world.stores.has(d.name))world.define(d);}
function active(binding,name,value){return binding&&binding.world.alive(binding.id)&&binding.world.get(binding.id,name)===value;}
export function rivalVisitEntity(v){const b=visits.get(v);if(!active(b,'RivalVisit',v))throw Error('Visit is not a live entity');return b.id;}
export function rivalSettlementEntity(s){const b=settlements.get(s);if(!active(b,'RivalSettlement',s))throw Error('Settlement is not a live entity');return b.id;}
export function relicMission(v){const b=visits.get(v);return active(b,'RivalVisit',v)?b.world.get(b.id,'RelicMission'):undefined;}
export function settlementRelicIntent(s){const b=settlements.get(s);return active(b,'RivalSettlement',s)?b.world.get(b.id,'SettlementRelicIntent'):undefined;}
export function settlementComponent(s,name){const b=settlements.get(s);return active(b,'RivalSettlement',s)?b.world.get(b.id,name):undefined;}
function setSettlement(s,name,values){const id=rivalSettlementEntity(s),b=settlements.get(s);return b.world.add(id,name,{...values,settlement:s});}
export const settlementEconomy=s=>settlementComponent(s,'SettlementEconomy');
export const setSettlementEconomy=(s,v)=>setSettlement(s,'SettlementEconomy',v);
export const settlementDevelopment=s=>settlementComponent(s,'SettlementDevelopment');
export const setSettlementDevelopment=(s,v)=>setSettlement(s,'SettlementDevelopment',v);
export const settlementSchedule=s=>settlementComponent(s,'SettlementSchedule');
export const setSettlementSchedule=(s,v)=>setSettlement(s,'SettlementSchedule',v);
export const settlementDiplomacy=s=>settlementComponent(s,'SettlementDiplomacy');
export const setSettlementDiplomacy=(s,v)=>setSettlement(s,'SettlementDiplomacy',v);
export const settlementHistory=s=>settlementComponent(s,'SettlementHistory');
export const setSettlementHistory=(s,v)=>setSettlement(s,'SettlementHistory',v);
export const settlementCouncil=s=>settlementComponent(s,'SettlementCouncil');
export const setSettlementCouncil=(s,v)=>setSettlement(s,'SettlementCouncil',v);
export function setRelicMission(v,values){const id=rivalVisitEntity(v),b=visits.get(v);return b.world.add(id,'RelicMission',{...values,visit:v});}
export function setSettlementRelicIntent(s,values){const id=rivalSettlementEntity(s),b=settlements.get(s);return b.world.add(id,'SettlementRelicIntent',{...values,settlement:s});}
export function clearRelicMission(v){const b=visits.get(v);return active(b,'RivalVisit',v)&&b.world.remove(b.id,'RelicMission');}
function validateSettlement(e,s){if(!RivalSettlement.validate(s))throw Error('Invalid RivalSettlement');settlementRelicInput(s);settlementInput(s);const b=settlements.get(s);if(b&&(!active(b,'RivalSettlement',s)||b.world!==villageWorld(e)))throw Error('Foreign or retired settlement');}
export function validateRivalVisitOwner(e,person,visit=person.visit){
 if(visit===undefined)return;if(!RivalVisit.validate(visit))throw Error('Invalid RivalVisit');visitMissionInput(visit);const b=visits.get(visit);
 if(b&&(!active(b,'RivalVisit',visit)||b.world!==villageWorld(e)||b.person!==person))throw Error('Foreign or retired visit');
}
function bindVisit(e,person,visit){
 validateRivalVisitOwner(e,person,visit);const world=villageWorld(e),personId=existingActor(e,person,'Person');if(personId===undefined)throw Error('Visit owner is not a Person entity');
 const input=visitMissionInput(visit),old=visits.get(visit);if(old){if(input&&relicMission(visit))throw Error('Ambiguous RelicMission');if(input){world.add(old.id,'RelicMission',input);delete visit.relicMission;}return old.id;}
 define(world);const id=world.create({RivalVisit:visit,RivalVisitOwner:{person}});world.own(personId,id);visits.set(visit,{world,id,person});
 if(input){world.add(id,'RelicMission',input);delete visit.relicMission;}return id;
}
export function bindRivalVisit(e,person){if(person.visit!==undefined)return bindVisit(e,person,person.visit);}
export function setRivalVisit(e,person,visit){
 const old=person.visit;validateRivalVisitOwner(e,person,old);bindVisit(e,person,visit);if(old&&old!==visit){const b=visits.get(old);if(active(b,'RivalVisit',old))b.world.destroy(b.id);}person.visit=visit;return visit;
}
export function clearRivalVisit(e,person){
 const v=person.visit;if(v===undefined)return false;validateRivalVisitOwner(e,person,v);const b=visits.get(v);if(b)b.world.destroy(b.id);delete person.visit;return true;
}
export function bindRivalSettlement(e,s){
 validateSettlement(e,s);const world=villageWorld(e),parts=specs.filter(p=>p.owner==='settlement').map(spec=>({...spec,row:spec.input(s)})),old=settlements.get(s);
 for(const spec of parts){const current=old&&world.get(old.id,spec.definition.name);if(spec.row&&current)throw Error('Ambiguous '+spec.definition.name);if(spec.required&&!spec.row&&!current)throw Error('Missing '+spec.definition.name);}
 define(world);const id=old?.id??world.create({RivalSettlement:s});if(!old)settlements.set(s,{world,id});
 for(const spec of parts)if(spec.row){world.add(id,spec.definition.name,spec.row);for(const key of spec.fields??['relicBearerId'])delete s[key];}return id;
}
export function clearRivalSettlementEntities(e){const world=villageWorld(e);if(world.stores.has('RivalSettlement'))for(const id of world.query(['RivalSettlement']))world.destroy(id);}
function project(e,world,incoming){
 for(const spec of specs){const store=world.store(spec.definition.name),key=row=>spec.owner==='visit'?visits.get(row.visit).person.id:row.settlement.culture,sorted=()=>store.values.slice().sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0),initial=sorted(),input=incoming.get(spec.key)??[];
  let cached=Object.freeze(input.length===initial.length&&input.every((r,i)=>r===initial[i])?input:initial),revision=store.valueRevision;
  Object.defineProperty(e,spec.key,{enumerable:true,configurable:true,get(){if(revision!==store.valueRevision){cached=Object.freeze(sorted());revision=store.valueRevision;}return cached;}});
 }
}
export function restoreRivalEntities(e){
 const world=villageWorld(e),states=rivalSettlements(e),people=world.stores.get('Person')?.values??[],pairs=people.filter(p=>p.visit!==undefined).map(person=>({person,visit:person.visit})),incoming=new Map(),plans=[];
 if(new Set(states).size!==states.length||new Set(states.map(s=>s?.culture)).size!==states.length)throw Error('Duplicate settlements');
 if(new Set(pairs.map(p=>p.visit)).size!==pairs.length)throw Error('Shared visit identity');
 for(const s of states)validateSettlement(e,s);for(const {person,visit} of pairs)validateRivalVisitOwner(e,person,visit);
 for(const spec of specs){const owners=new Set(spec.owner==='visit'?pairs.map(p=>p.visit):states),rows=new Map(),input=e[spec.key]??[];if(!Array.isArray(input)||new Set(input.map(r=>r?.[spec.owner])).size!==input.length)throw Error('Invalid '+spec.definition.name+' collection');incoming.set(spec.key,input);
  for(const row of world.stores.get(spec.definition.name)?.values??[])if(owners.has(row[spec.owner]))rows.set(row[spec.owner],row);
  const converted=[...owners].map(spec.input).filter(Boolean);
  for(const row of [...input,...converted]){if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);const owner=row[spec.owner];if(!owners.has(owner))throw Error('Unknown '+spec.definition.name+' owner');if(rows.has(owner)&&rows.get(owner)!==row)throw Error('Ambiguous '+spec.definition.name);rows.set(owner,row);}
  if(spec.required&&[...owners].some(owner=>!rows.has(owner)))throw Error('Missing '+spec.definition.name);plans.push({...spec,rows});
 }
 // Restore validation is complete before any live membership changes.
 define(world);const currentVisits=new Set(pairs.map(p=>p.visit)),currentStates=new Set(states);
 for(const id of world.query(['RivalVisit']))if(!currentVisits.has(world.get(id,'RivalVisit')))world.destroy(id);
 for(const id of world.query(['RivalSettlement']))if(!currentStates.has(world.get(id,'RivalSettlement')))world.destroy(id);
 // Inline state is installed by the plans below, avoiding a second conversion.
 for(const {person,visit} of pairs){if(!visits.has(visit)){const id=world.create({RivalVisit:visit,RivalVisitOwner:{person}});world.own(existingActor(e,person,'Person'),id);visits.set(visit,{world,id,person});}delete visit.relicMission;}
 for(const s of states){if(!settlements.has(s)){const id=world.create({RivalSettlement:s});settlements.set(s,{world,id});}delete s.relicBearerId;for(const part of settlementDomains)for(const key of part.fields)delete s[key];}
 for(const spec of plans)for(const [owner,row] of spec.rows)world.add(spec.bindings.get(owner).id,spec.definition.name,row);
 project(e,world,incoming);
}
