import {villageWorld} from './village-world.js';import {rivalSettlements} from '../rival-roster.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>Number.isFinite(v)&&v>=0,culture=v=>['hearth','solis','cryos'].includes(v);
export const DiplomacyState={name:'DiplomacyState',replaceable:false,validate:d=>record(d)&&d.version===1&&Array.isArray(d.history)&&d.history.length<=32&&d.history.every(h=>record(h)&&finite(h.at)&&typeof h.kind==='string'&&culture(h.culture)&&culture(h.otherCulture))};
export const DiplomacyLink={name:'DiplomacyLink',replaceable:false,validate:l=>record(l)&&culture(l.a)&&culture(l.b)&&l.a!==l.b&&Number.isFinite(l.affinity)&&Math.abs(l.affinity)<=1&&finite(l.warUntil)&&finite(l.nextAt),prepare:l=>{for(const key of ['a','b'])Object.defineProperty(l,key,{value:l[key],enumerable:true,writable:false,configurable:false});}};
const LinkOrder={name:'DiplomacyLinkOrder',validate:o=>Number.isSafeInteger(o?.order)&&o.order>=0};
const domains=new WeakMap(),links=new WeakMap();
function define(world){for(const d of [DiplomacyState,DiplomacyLink,LinkOrder])if(!world.stores.has(d.name))world.define(d);}
function active(b,name,value){return b&&b.world.alive(b.id)&&b.world.get(b.id,name)===value;}
export function diplomacyEntity(d){const b=domains.get(d);if(!active(b,'DiplomacyState',d)||b.world.resources.get('Diplomacy')!==d)throw Error('Diplomacy is not active');return b.id;}
export function diplomacyLinkEntity(l){const b=links.get(l);if(!active(b,'DiplomacyLink',l))throw Error('Diplomacy link is not active');return b.id;}
export function currentDiplomacy(e){if(e.diplomacy==null)return null;diplomacyEntity(e.diplomacy);return e.diplomacy;}
function members(b){return b.world.query(['DiplomacyLink','DiplomacyLinkOrder']).filter(id=>b.world.owner(id)===b.id).sort((a,c)=>b.world.get(a,'DiplomacyLinkOrder').order-b.world.get(c,'DiplomacyLinkOrder').order);}
function list(b){const store=b.world.store('DiplomacyLink');if(b.revision!==store.valueRevision||b.structure!==b.world.structuralRevision){const rows=members(b).map(id=>store.get(id));if(rows.length!==b.cached.length||rows.some((l,i)=>l!==b.cached[i]))b.cached=Object.freeze(rows);b.revision=store.valueRevision;b.structure=b.world.structuralRevision;}return b.cached;}
function validate(e,d,records){
 if(!DiplomacyState.validate(d)||!Array.isArray(records)||records.length>3||new Set(records).size!==records.length)throw Error('Invalid DiplomacyState');
 const cultures=new Set(rivalSettlements(e).map(s=>s.culture)),seen=new Set(),world=villageWorld(e);
 for(const l of records){const key=[l?.a,l?.b].sort().join(':');if(!DiplomacyLink.validate(l)||!cultures.has(l.a)||!cultures.has(l.b)||seen.has(key))throw Error('Invalid or duplicate DiplomacyLink');seen.add(key);const b=links.get(l);if(b&&(!active(b,'DiplomacyLink',l)||b.world!==world||b.state!==d))throw Error('Foreign or retired DiplomacyLink');}
 if(d.history.some(h=>!cultures.has(h.culture)||!cultures.has(h.otherCulture)))throw Error('Unknown diplomacy history culture');
 const b=domains.get(d);if(b&&(!active(b,'DiplomacyState',d)||b.world!==world))throw Error('Foreign or retired DiplomacyState');
}
function install(world,d,parent,l,order){const id=world.create({DiplomacyLink:l,DiplomacyLinkOrder:{order}});world.own(parent,id,{component:'DiplomacyState'});links.set(l,{world,id,state:d});return id;}
export function createDiplomacy(e){if(e.diplomacy!=null||villageWorld(e).resources.has('Diplomacy'))throw Error('Diplomacy already exists');const d={version:1,links:[],history:[]};e.diplomacy=d;restoreDiplomacy(e);return d;}
export function addDiplomacyLink(e,l){const d=currentDiplomacy(e),b=domains.get(d);if(!b||b.world!==villageWorld(e))throw Error('Foreign diplomacy');validate(e,d,[...d.links,l]);if(links.has(l))throw Error('Diplomacy link already exists');install(b.world,d,b.id,l,b.nextOrder++);return l;}
export function setDiplomacyLinkData(l,values){const id=diplomacyLinkEntity(l),b=links.get(l),next={...l,...values,a:l.a,b:l.b};if(Object.keys(values).some(k=>!['affinity','warUntil','nextAt'].includes(k)))throw Error('Only diplomacy link state may change');b.world.validate('DiplomacyLink',next);Object.assign(l,values);return l;}
export function restoreDiplomacy(e){
 const world=villageWorld(e),d=e.diplomacy,old=world.resources.get('Diplomacy'),records=d?.links??[];if(d!=null)validate(e,d,records);define(world);
 if(old&&old!==d){const b=domains.get(old);if(b)world.destroy(b.id);world.resources.delete('Diplomacy');}
 if(d==null)return d;let b=domains.get(d);
 if(!b){const id=world.create({DiplomacyState:d});b={world,id,state:d,cached:Object.freeze(records),revision:-1,structure:-1,nextOrder:records.length};domains.set(d,b);world.setResource('Diplomacy',d);for(const [i,l] of records.entries())install(world,d,id,l,i);Object.defineProperty(d,'links',{enumerable:true,configurable:true,get:()=>list(b)});}else diplomacyEntity(d);
 return d;
}
