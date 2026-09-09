import {BeastRelationship,BeastRelationships} from './beast-relationships-data.js';
const indexes=new WeakMap(),empty=Object.freeze([]);
export function defineBeastRelationships(world){for(const d of [BeastRelationships,BeastRelationship])if(!world.stores.has(d.name))world.define(d);}
function index(world){
 defineBeastRelationships(world);let cached=indexes.get(world);if(!cached){cached={membership:-1,revision:-1,owners:new WeakMap()};indexes.set(world,cached);}const store=world.store('BeastRelationship');
 if(cached.membership!==store.membershipRevision||cached.revision!==store.valueRevision){
  const grouped=new Map(world.store('BeastRelationships').values.map(row=>[row.person,[]]));for(const id of world.query(['BeastRelationship'])){const row=store.get(id);let items=grouped.get(row.person);if(!items)grouped.set(row.person,items=[]);items.push({id,row});}
  const next=new WeakMap();for(const [owner,items]of grouped){items.sort((a,b)=>a.row.order-b.row.order);const prior=cached.owners.get(owner),values=items.map(x=>x.row.relationship),list=prior&&prior.list.length===values.length&&values.every((v,i)=>v===prior.list[i])?prior.list:Object.freeze(values),byTarget=new Map();for(const item of items){if(byTarget.has(item.row.relationship.id))throw Error('Duplicate beast relationship');byTarget.set(item.row.relationship.id,item);}next.set(owner,{list,items,byTarget});}
  cached.owners=next;cached.membership=store.membershipRevision;cached.revision=store.valueRevision;
 }return cached;
}
export const beastRelationshipList=(world,person)=>index(world).owners.get(person)?.list??empty;
export const findBeastRelationshipRow=(world,person,id)=>index(world).owners.get(person)?.byTarget.get(id);
function adopt(world,person,rows){const current=index(world),owner=current.owners.get(person);if(!owner){if(rows.length)throw Error('Invalid relationship projection');current.owners.set(person,{list:Object.freeze(rows),items:[],byTarget:new Map()});}else{if(rows.length!==owner.list.length||rows.some((r,i)=>r!==owner.list[i]))throw Error('Invalid relationship projection');owner.list=Object.freeze(rows);}}
export function installBeastRelationships(world,actorId,row){
 defineBeastRelationships(world);world.validate('BeastRelationships',row);if(world.get(actorId,'Beast')!==row.person)throw Error('Invalid beast relationship owner');
 const rows=row.relationships;world.add(actorId,'BeastRelationships',row);
 for(let order=0;order<rows.length;order++){const id=world.create({BeastRelationship:{person:row.person,relationship:rows[order],order}});world.own(actorId,id,{component:'BeastRelationships'});}
 Object.defineProperty(row,'relationships',{enumerable:true,configurable:true,get:()=>beastRelationshipList(world,row.person)});adopt(world,row.person,rows);return row;
}
export function appendBeastRelationship(world,actorId,person,relationship){
 defineBeastRelationships(world);world.validate('BeastRelationship',{person,relationship,order:0});const owner=index(world).owners.get(person);if(owner?.byTarget.has(relationship.id))throw Error('Duplicate beast relationship');
 const order=owner?.items.length?owner.items.at(-1).row.order+1:0,id=world.create({BeastRelationship:{person,relationship,order}});world.own(actorId,id,{component:'BeastRelationships'});return relationship;
}
export function replaceBeastRelationshipRows(world,actorId,person,rows){
 world.validate('BeastRelationships',{person,relationships:rows});const previous=index(world).owners.get(person)?.items??[],desired=new Set(rows);
 for(const item of previous)if(!desired.has(item.row.relationship))world.destroy(item.id);
 // Explicit replacement may reorder rows. Keep unchanged identities only where
 // their order is unchanged; ordinary affinity/romance edits keep every ID.
 for(let order=0;order<rows.length;order++){const relationship=rows[order],old=previous.find(item=>item.row.relationship===relationship);if(old&&old.row.order===order)continue;if(old)world.destroy(old.id);const id=world.create({BeastRelationship:{person,relationship,order}});world.own(actorId,id,{component:'BeastRelationships'});}
 adopt(world,person,rows);return beastRelationshipList(world,person);
}
