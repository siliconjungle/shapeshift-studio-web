import {villageWorld} from './village-world.js';
import {lifeBinding} from './life-state.js';
import {HomeIdentity,StructuralCondition,HomeMembership,homeDomains} from './home-data.js';
export {HomeIdentity,StructuralCondition,HomeCapacity,HomeAvailability} from './home-data.js';
const bindings=new WeakMap(),collections=new WeakMap();
function define(world){for(const d of [HomeIdentity,HomeMembership,...homeDomains.map(d=>d.definition)])if(!world.stores.has(d.name))world.define(d);}
function live(b,home){return b&&b.world.alive(b.id)&&b.world.get(b.id,'HomeIdentity')===home;}
export function homeBinding(home){const b=bindings.get(home);if(!live(b,home))throw Error('Home is no longer a live entity');return b;}
export function structuralCondition(home){const b=bindings.get(home);return live(b,home)?b.world.get(b.id,'StructuralCondition'):undefined;}
export function setStructuralCondition(home,values){const {world,id}=homeBinding(home);return world.add(id,'StructuralCondition',{...values,home});}
export function homeCapacity(home){const b=bindings.get(home);return live(b,home)?b.world.get(b.id,'HomeCapacity'):undefined;}
export function homeAvailability(home){const b=bindings.get(home);return live(b,home)?b.world.get(b.id,'HomeAvailability'):undefined;}
export function setHomeCapacity(home,values){const {world,id}=homeBinding(home);return world.add(id,'HomeCapacity',{...values,home});}
export function setHomeAvailability(home,values){const {world,id}=homeBinding(home);return world.add(id,'HomeAvailability',{...values,home});}
export function homeInput(home){const b=bindings.get(home),out={...home};for(const {definition,fields} of homeDomains){const row=live(b,home)?b.world.get(b.id,definition.name):undefined;if(row)for(const field of fields)if(Object.hasOwn(row,field))out[field]=row[field];}return out;}
function plan(e,home,id){
 if(home===null||typeof home!=='object'||Array.isArray(home))throw Error('Invalid home input');const old=bindings.get(home),world=villageWorld(e);if(live(old,home)&&old.world!==world)throw Error('Home belongs to another world');
 const identity={...home,id:home.id??id},components=[];
 for(const spec of homeDomains){const keys=spec.fields.filter(k=>Object.hasOwn(home,k)),incoming=e[spec.key]??[];if(!Array.isArray(incoming))throw Error('Invalid '+spec.definition.name+' collection');const rows=incoming.filter(r=>r?.home===home);if(rows.length>1)throw Error('Ambiguous '+spec.definition.name);const mergeRebuilt=spec.definition.name==='StructuralCondition'&&rows.length===1&&keys.length===1&&keys[0]==='rebuilt'&&!Object.hasOwn(rows[0],'rebuilt')&&!live(old,home);if(rows.length&&keys.length&&!mergeRebuilt)throw Error('Ambiguous '+spec.definition.name);
  for(const key of keys)delete identity[key];const row=(mergeRebuilt?{...rows[0],rebuilt:home.rebuilt}:rows[0])??(live(old,home)?old.world.get(old.id,spec.definition.name):null)??Object.fromEntries([['home',home],...keys.map(k=>[k,home[k]])]);if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name);components.push({spec,keys,row,adopt:mergeRebuilt?rows[0]:null});
 }
 if(!HomeIdentity.validate(identity))throw Error('Invalid home identity');return {home,components,id:identity.id};
}
function install(e,prepared,parent,kind,order){const world=villageWorld(e),{home,components}=prepared;let b=bindings.get(home);if(live(b,home)){if(world.owner(b.id)!==parent)throw Error('Home belongs to another owner');world.add(b.id,'HomeMembership',{kind,order});return home;}home.id=prepared.id;for(const {keys} of components)for(const k of keys)delete home[k];const id=world.create({HomeIdentity:home,...Object.fromEntries(components.map(({spec,row,adopt})=>[spec.definition.name,adopt?Object.assign(adopt,row):row])),HomeMembership:{kind,order}});world.own(parent,id,{component:kind==='village'?'LifeIdentity':'ConstructionProject'});bindings.set(home,{world,id,e});return home;}
function list(b){const homes=b.world.store('HomeIdentity'),members=b.world.store('HomeMembership');if(b.revision!==homes.valueRevision||b.members!==members.valueRevision){b.cached=Object.freeze(b.world.query(['HomeIdentity','HomeMembership']).filter(id=>b.world.owner(id)===b.parent&&members.get(id).kind==='village').sort((a,c)=>members.get(a).order-members.get(c).order).map(id=>homes.get(id)));b.revision=homes.valueRevision;b.members=members.valueRevision;}return b.cached;}
export function replaceHomes(e,rows){const s=e.life,b=s&&collections.get(s);if(!b||lifeBinding(s).id!==b.parent)throw Error('Home collection is not active');if(!Array.isArray(rows)||new Set(rows).size!==rows.length||new Set(rows.map((h,i)=>h?.id??'home-'+i)).size!==rows.length)throw Error('Duplicate/invalid homes');const plans=rows.map((h,i)=>plan(e,h,'home-'+i));for(const p of plans){const old=bindings.get(p.home);if(live(old,p.home)&&old.world.owner(old.id)!==b.parent)throw Error('Home belongs to another owner');}for(const home of list(b))if(!rows.includes(home))b.world.destroy(bindings.get(home).id);plans.forEach((p,i)=>install(e,p,b.parent,'village',i));b.revision=-1;const current=list(b);if(rows.length===current.length&&rows.every((h,i)=>h===current[i]))b.cached=Object.freeze(rows);return b.cached;}
export function addHome(e,home){replaceHomes(e,[...e.life.homes,home]);return home;}
export function removeHome(e,home){if(!e.life.homes.includes(home))return false;replaceHomes(e,e.life.homes.filter(h=>h!==home));return true;}
export function applyHomeInput(home,input){const {world,id}=homeBinding(home);if(input.id!==undefined&&input.id!==home.id)throw Error('Home ID cannot change');const identity={...home,...input},rows=[];for(const spec of homeDomains){const row={...world.get(id,spec.definition.name),home};for(const key of spec.fields){if(Object.hasOwn(input,key))row[key]=input[key];delete identity[key];}world.validate(spec.definition.name,row);rows.push({spec,row});}world.validate('HomeIdentity',identity);Object.assign(home,identity);for(const {spec,row} of rows)world.add(id,spec.definition.name,row);return home;}
export function registerRivalHome(world,project,parent){if(project.owner!=='rival'||!project.home)return;define(world);const e=world.resource('Village');install(e,plan(e,project.home,project.id),parent,'rival',0);}
export function restoreHomeEntities(e){const world=villageWorld(e);define(world);const homes=[...(e.life?.homes??[]),...(e.housing?.projects??[]).filter(p=>p.owner==='rival'&&p.home).map(p=>p.home)],inputs=new Map();
 for(const spec of homeDomains){const incoming=e[spec.key]??[];if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.home)).size!==incoming.length)throw Error('Invalid '+spec.definition.name+' collection');for(const row of incoming)if(!spec.definition.validate(row)||!homes.includes(row.home))throw Error('Invalid '+spec.definition.name+' owner');inputs.set(spec.key,incoming);}
 for(const [i,h]of homes.entries())plan(e,h,'home-'+i);
 if(e.life){const parent=lifeBinding(e.life).id;let b=collections.get(e.life);if(!b){const rows=e.life.homes;b={world,parent,revision:-1,members:-1,cached:Object.freeze([])};collections.set(e.life,b);Object.defineProperty(e.life,'homes',{enumerable:true,configurable:true,get(){return list(b)}});replaceHomes(e,rows);}}
 // Rival homes are registered when their construction entity is created.
 for(const home of homes)homeBinding(home);
 for(const spec of homeDomains){const store=world.store(spec.definition.name),incoming=inputs.get(spec.key);let revision=-1,cached;Object.defineProperty(e,spec.key,{enumerable:true,configurable:true,get(){if(revision!==store.valueRevision){const rows=store.values.slice().sort((a,b)=>(a.home.id<b.home.id?-1:a.home.id>b.home.id?1:0));cached=Object.freeze(incoming.length===rows.length&&incoming.every((r,i)=>r===rows[i])?incoming:rows);revision=store.valueRevision;}return cached;}});}
}

export function addHomes(e,...homes){return replaceHomes(e,[...e.life.homes,...homes]).length;}

export function validateRivalHome(world,project,parent){if(project.owner!=='rival'||!project.home)return;plan(world.resource('Village'),project.home,project.id);const b=bindings.get(project.home);if(live(b,project.home)&&world.owner(b.id)!==parent)throw Error('Home belongs to another owner');}
