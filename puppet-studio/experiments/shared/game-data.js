import {validateArtPaletteSettings} from './art-palette.js';
// Shared authoring data. Defaults keep their object identity: maps, simulations,
// and views may already hold references to nested rule or reaction records.
const records=new Map();
const copy=v=>structuredClone(v);
export function jsonValue(value,path='data'){
 if(value===null||typeof value==='boolean'||typeof value==='string')return;
 if(typeof value==='number'&&Number.isFinite(value))return;
 if(!value||typeof value!=='object'||(!Array.isArray(value)&&Object.prototype.toString.call(value)!=='[object Object]'))throw Error(path+' must be finite JSON data');
 for(const [key,v] of Object.entries(value)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Reserved property '+key);jsonValue(v,path+'.'+key);}
}
function overlay(target,patch,path){
 for(const [key,value] of Object.entries(patch)){
  if(!Object.hasOwn(target,key))throw Error('Unknown game parameter '+path+'.'+key);
  const old=target[key];
  if(old!==null&&typeof old==='object'){
   if(!value||typeof value!=='object'||Array.isArray(old)!==Array.isArray(value))throw Error('Invalid parameter '+path+'.'+key);
   if(path.startsWith('audio.recipes')&&Array.isArray(old)){target[key]=copy(value);continue;}
   if(Array.isArray(old)&&old.length!==value.length)throw Error('Preserve entries in '+path+'.'+key);
   overlay(old,value,path+'.'+key);
  }else{if(typeof value!==typeof old)throw Error('Invalid parameter '+path+'.'+key);target[key]=copy(value);}
 }
}
function assign(target,source){if(Array.isArray(target))target.length=source.length;for(const k of Object.keys(target))if(!Object.hasOwn(source,k))delete target[k];for(const [k,v] of Object.entries(source)){if(v&&typeof v==='object'){if(!target[k]||typeof target[k]!=='object')target[k]=copy(v);else assign(target[k],v);}else target[k]=v;}}
function check(id,value){
 if(id==='action-timing.ACTION_DURATION'&&Object.values(value).some(v=>v<=0||v>120))throw Error('Action duration must be between 0 and 120 seconds');
 if(id==='action-timing.CONTACT_PHASE'&&Object.values(value).some(v=>v<0||v>1))throw Error('Contact phase must be between 0 and 1');
 if(id==='audio.recipes')for(const r of Object.values(value)){if(r.pitch.length!==2||r.pitch.some(v=>!Number.isFinite(v)||v<=0||v>4)||r.variants.length!==4)throw Error('Invalid sound pitch or variants');for(const layers of r.variants){if(!layers.length||layers.length>128)throw Error('Sound recipes require 1–128 layers');for(const l of layers){if(!['tone','noise'].includes(l.type)||!Array.isArray(l.args))throw Error('Invalid sound layer');const a=l.args,duration=l.type==='tone'?a[2]:a[0],gain=l.type==='tone'?a[3]:a[1],delay=(l.type==='tone'?a[5]:a[3])??0;if(!Number.isFinite(duration)||duration<=.004||duration>30||!Number.isFinite(gain)||gain<=0||gain>1||!Number.isFinite(delay)||delay<0||delay>30)throw Error('Invalid sound envelope');if(l.type==='tone'&&(a[0]<=0||a[1]<=0||!['sine','triangle','sawtooth','square'].includes(a[4]??'sine')))throw Error('Invalid tone');}}}
}

let active={};
export function defineGameData(id,defaults){
 jsonValue(defaults,id);if(records.has(id))throw Error('Duplicate game data '+id);
 const value=copy(defaults);if(active[id])overlay(value,active[id],id);
 check(id,value);records.set(id,{defaults:copy(defaults),value});return value;
}
export function gameDataCatalog(){return Object.fromEntries([...records].sort(([a],[b])=>a.localeCompare(b)).map(([id,r])=>[id,{defaults:copy(r.defaults),value:copy(r.value)}]));}
function plannedGameData(patches={}, {allowPending=false}={}){
 jsonValue(patches);const pending=[];
 for(const [id,patch] of Object.entries(patches)){
  // Artwork palette data is consumed by its own loader, outside gameplay rules.
  if(id==='art.palette'){validateArtPaletteSettings(patch);continue;}
  const r=records.get(id);if(!r){if(!allowPending)throw Error('Unknown game data '+id);continue;}const next=copy(r.defaults);overlay(next,patch,id);check(id,next);pending.push([r.value,next]);}
 // Reset omitted overrides too. Validate the whole batch before any mutation.
 for(const [id,r] of records)if(!Object.hasOwn(patches,id))pending.push([r.value,copy(r.defaults)]);
 return pending;
}

// Checking a loaded world must not reset campaign-derived grids or layout data.
export function validateGameData(patches={},options={}){plannedGameData(patches,options);return true;}
export function configureGameData(patches={},options={}){const pending=plannedGameData(patches,options);for(const [target,next]of pending)assign(target,next);active=copy(patches);}

export function instanceGameData(id,defaults){return records.get(id)?.value??defineGameData(id,defaults);}

export const gameQuery=()=>globalThis.__littleGodsPreviewQuery??globalThis.location?.search;
