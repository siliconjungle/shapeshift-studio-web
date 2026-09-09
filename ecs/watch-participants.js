import {allEnemies,enemyEntity} from './enemy-entities.js';
import {villageWorld} from './village-world.js';
import {personEntity} from './person-entities.js';
import {actorComponent,ensureActorComponent} from './actor-entities.js';
import {allBeasts,beastEntity} from './beast-entities.js';
import {knownPeople} from '../village-people.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,key,test)=>!Object.hasOwn(r,key)||r[key]===undefined||test(r[key]);
const nonnegative=v=>Number.isFinite(v)&&v>=0;
export const WatchParticipant={name:'WatchParticipant',validate:r=>record(r)&&record(r.person)&&
 optional(r,'total',nonnegative)&&optional(r,'sleepDebt',nonnegative)&&optional(r,'unavailableUntil',nonnegative)&&
 optional(r,'announced',v=>typeof v==='boolean')&&optional(r,'post',v=>Number.isSafeInteger(v)&&v>=0)&&optional(r,'pauseUntil',v=>nonnegative(v)||v===Infinity)};
export const watchParticipant=person=>actorComponent(person,'WatchParticipant');
export const ensureWatchParticipant=person=>ensureActorComponent(person,WatchParticipant);
const oldFields={watchTotal:'total',watchSleepDebt:'sleepDebt',watchUnavailableUntil:'unavailableUntil',watchAnnounced:'announced',watchPost:'post',watchPauseUntil:'pauseUntil'};
// Import is a one-time boundary. Runtime readers and writers use the component.
export function restoreWatchParticipants(e){
 const world=villageWorld(e);if(!world.stores.has('WatchParticipant'))world.define(WatchParticipant);
 const incoming=e.watchParticipants??[],people=[...knownPeople(e),...allBeasts(e),...allEnemies(e)];
 if(!Array.isArray(incoming)||new Set(incoming.map(r=>r?.person)).size!==incoming.length)throw Error('Invalid watch participants');
 const rows=[...incoming],owners=new Set();
 for(const row of rows){world.validate('WatchParticipant',row);if(!people.includes(row.person))throw Error('Unknown watch participant');owners.add(row.person);}
 const converted=[];
 for(const person of people){
  const keys=Object.keys(oldFields).filter(k=>Object.hasOwn(person,k));if(!keys.length)continue;
  if(owners.has(person))throw Error('Ambiguous watch participant state');
  const row={person};for(const key of keys)row[oldFields[key]]=person[key];
  world.validate('WatchParticipant',row);rows.push(row);converted.push({person,keys});
 }
 for(const id of world.query(['WatchParticipant']))world.remove(id,'WatchParticipant');
 for(const row of rows)world.add(e.raids?.enemies.includes(row.person)?enemyEntity(e,row.person,'Raider'):e.slimes?.enemies.includes(row.person)?enemyEntity(e,row.person,'Slime'):row.person.species==='beast'?beastEntity(e,row.person):personEntity(e,row.person),'WatchParticipant',row);
 for(const {person,keys} of converted)for(const key of keys)delete person[key];
 let cached=Object.freeze([]),membership=-1,revision=-1;const store=world.store('WatchParticipant');
 Object.defineProperty(e,'watchParticipants',{enumerable:true,configurable:true,get(){
  if(membership!==store.membershipRevision||revision!==store.valueRevision){cached=Object.freeze(store.values.slice().sort((a,b)=>typeof a.person.id==='number'&&typeof b.person.id==='number'?a.person.id-b.person.id:String(a.person.id)<String(b.person.id)?-1:String(a.person.id)>String(b.person.id)?1:0));membership=store.membershipRevision;revision=store.valueRevision;}return cached;
 }});
}
