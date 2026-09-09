// Owned component records with a retained, read-only projection for serialization
// and presentation. Writes go to the records; membership goes through the world.
export class ComponentRecords {
 constructor(world,definition,records=[]){
  this.world=world;this.name=definition.name;
  if(!world.stores.has(this.name))world.define(definition);
  this.store=world.store(this.name);this.listRevision=-1;this.listMembership=-1;this.cachedList=Object.freeze([]);this.pendingLoad=null;
  this.replace(records,false);
 }
 get ids(){return this.world.query([this.name])}
 get list(){
  if(this.listRevision!==this.store.valueRevision||this.listMembership!==this.store.membershipRevision){
   this.cachedList=Object.freeze(this.ids.map(id=>this.store.get(id)));this.listRevision=this.store.valueRevision;this.listMembership=this.store.membershipRevision;
  }
  return this.cachedList;
 }
 validate(records){
  if(!Array.isArray(records))throw Error(this.name+' records must be an array');
  for(const record of records)this.world.validate(this.name,record);
  if(new Set(records).size!==records.length)throw Error('Duplicate '+this.name+' record');
 }
 replace(records,loading=true){
  this.validate(records);
  for(const id of this.ids)this.world.destroy(id);
  for(const record of records)this.world.create({[this.name]:record});
  this.pendingLoad=loading?records:null;
 }
 finishLoad(){if(this.pendingLoad){const records=this.pendingLoad;this.replace(records,false);}}
 add(record){this.world.validate(this.name,record);if(this.list.includes(record))throw Error('Duplicate '+this.name+' record');this.pendingLoad=null;return this.world.create({[this.name]:record});}
 remove(record){const id=this.ids.find(id=>this.store.get(id)===record);if(id===undefined)return false;this.pendingLoad=null;return this.world.destroy(id);}
}
