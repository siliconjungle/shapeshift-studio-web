import {villageWorld} from './village-world.js';
import {personEntity,existingPerson,validatePersonOwner,definePersonStore} from './person-entities.js';
import {rivalSettlements} from '../rival-roster.js';
export const POPULATION_GROUPS=['Resident','RivalCitizen','Exile'];
const populations=new WeakMap();
class Population {
 constructor(e){
  this.economy=e;this.world=villageWorld(e);this.groups=new Map();definePersonStore(this.world);
  for(const name of POPULATION_GROUPS){
   if(!this.world.stores.has(name))this.world.define({name,validate:v=>Number.isSafeInteger(v?.order)&&v.order>=0&&(name!=='RivalCitizen'||v.settlement!==null&&typeof v.settlement==='object'),prepare:v=>Object.freeze(v)});
   this.groups.set(name,{name,store:this.world.store(name),nextOrder:0,views:new Map()});
  }
 }
 group(name){const group=this.groups.get(name);if(!group)throw Error('Unknown population group: '+name);return group;}
 scope(name,owner){return name==='RivalCitizen'?(owner??this.economy.rival):null;}
 view(name,owner){const group=this.group(name),scope=this.scope(name,owner);let view=group.views.get(scope);if(!view){view={cached:Object.freeze([]),membership:-1,revision:-1,personRevision:-1,pending:null,owner:null};group.views.set(scope,view);}return view;}
 ids(name,owner){const group=this.group(name),scope=this.scope(name,owner);return this.world.query([name,'Person']).filter(id=>name!=='RivalCitizen'||group.store.get(id).settlement===scope);}
 list(name,owner){
  const group=this.group(name),view=this.view(name,owner),people=this.world.stores.get('Person');if(!people)return view.cached;
  if(view.membership!==group.store.membershipRevision||view.revision!==group.store.valueRevision||view.personRevision!==people.valueRevision){
   view.cached=Object.freeze(this.ids(name,owner).sort((a,b)=>group.store.get(a).order-group.store.get(b).order).map(id=>people.get(id)));
   view.membership=group.store.membershipRevision;view.revision=group.store.valueRevision;view.personRevision=people.valueRevision;
  }return view.cached;
 }
 belongs(id){return POPULATION_GROUPS.some(name=>this.world.has(id,name));}
 validate(rows){
  if(!Array.isArray(rows)||new Set(rows).size!==rows.length)throw Error('Invalid population records');
  const visits=rows.map(p=>p?.visit).filter(v=>v!==undefined);if(new Set(visits).size!==visits.length)throw Error('Shared visit identity');
  for(const p of rows){if(!p||typeof p!=='object'||!Number.isSafeInteger(p.id)||p.id<0)throw Error('Invalid person record');validatePersonOwner(this.economy,p);}
 }
 membership(name,owner){const group=this.group(name),settlement=this.scope(name,owner);if(name==='RivalCitizen'&&!settlement)throw Error('Rival settlement required');return {order:group.nextOrder++,...(name==='RivalCitizen'?{settlement}:{})};}
 add(person,name,owner){
  const group=this.group(name);this.validate([person]);if(name==='RivalCitizen'&&!this.scope(name,owner))throw Error('Rival settlement required');const id=personEntity(this.economy,person);
  if(group.store.has(id))throw Error('Person already belongs to '+name);
  this.world.add(id,name,this.membership(name,owner));this.view(name,owner).pending=null;return id;
 }
 remove(person,name){
  const group=this.group(name),id=existingPerson(this.economy,person);if(id===undefined||!group.store.has(id))return false;
  const scope=group.store.get(id).settlement;this.world.remove(id,name);this.view(name,scope).pending=null;
  if(!this.belongs(id))this.world.destroy(id);return true;
 }
 transfer(person,from,to,owner){
  const source=this.group(from),target=this.group(to),id=existingPerson(this.economy,person);
  if(id===undefined||!source.store.has(id)||target.store.has(id))throw Error('Invalid population transfer');
  const oldScope=source.store.get(id).settlement,row=this.membership(to,owner);
  // Membership changes have no observer between them, so components keep identity.
  this.world.add(id,to,row);this.world.remove(id,from);this.view(from,oldScope).pending=this.view(to,owner).pending=null;return id;
 }
 replace(name,rows,{loading=true,owner}={}){
  this.validate(rows);const group=this.group(name),scope=this.scope(name,owner),previous=this.ids(name,owner);
  if(name==='RivalCitizen'){
   if(!scope)throw Error('Rival settlement required');
   for(const p of rows){const id=existingPerson(this.economy,p);if(id!==undefined&&group.store.has(id)&&group.store.get(id).settlement!==scope)throw Error('Person already belongs to another rival settlement');}
  }
  const ids=rows.map(p=>personEntity(this.economy,p));
  for(const id of previous)this.world.remove(id,name);
  for(const id of ids)this.world.add(id,name,this.membership(name,owner));
  for(const id of previous)if(!this.belongs(id))this.world.destroy(id);
  this.view(name,owner).pending=loading?rows:null;
 }
 bind(owner,key,name){
  const view=this.view(name,owner);if(view.owner===owner)return;
  const rows=owner[key]??[];this.replace(name,rows,{loading:false,owner});view.owner=owner;
  Object.defineProperty(owner,key,{enumerable:true,configurable:true,get:()=>this.list(name,owner),set:rows=>this.replace(name,rows,{owner})});
 }
 restore(){
  const e=this.economy,owners=[[e,'workers','Resident'],...rivalSettlements(e).map(s=>[s,'people','RivalCitizen']),[e.leadership,'exiles','Exile']];
  const incoming=owners.filter(([owner])=>owner).map(([owner,key,name])=>({owner,key,name,rows:(this.view(name,owner).owner===owner?this.view(name,owner).pending??owner[key]:owner[key])??[]}));
  for(const {rows} of incoming)this.validate(rows);
  const rivals=incoming.filter(r=>r.name==='RivalCitizen').flatMap(r=>r.rows);if(new Set(rivals).size!==rivals.length)throw Error('Person belongs to multiple rival settlements');
  if(this.world.stores.has('Person'))for(const id of this.world.query(['Person']))this.world.destroy(id);
  for(const group of this.groups.values()){group.views.clear();group.nextOrder=0;}
  for(const {owner,key,name,rows} of incoming){
   this.replace(name,rows,{loading:false,owner});const view=this.view(name,owner);view.owner=owner;
   Object.defineProperty(owner,key,{enumerable:true,configurable:true,get:()=>this.list(name,owner),set:records=>this.replace(name,records,{owner})});
  }
 }
}
export function populationEntities(e){let p=populations.get(e);if(!p){p=new Population(e);populations.set(e,p);}return p;}
export function bindPopulation(e){const p=populationEntities(e);p.bind(e,'workers','Resident');for(const s of rivalSettlements(e))p.bind(s,'people','RivalCitizen');if(e.leadership)p.bind(e.leadership,'exiles','Exile');return p;}
export const addPerson=(e,person,group='Resident',owner)=>populationEntities(e).add(person,group,owner);
export const removePerson=(e,person,group='Resident')=>populationEntities(e).remove(person,group);
export const transferPerson=(e,person,from,to,owner)=>populationEntities(e).transfer(person,from,to,owner);
export const restorePopulation=e=>populationEntities(e).restore();

// Save hydration only: the decoder fills this array after assigning it.
// Live readers continue to use the canonical population view.
export const incomingResidents=e=>populations.get(e)?.view('Resident').pending??e.workers;
