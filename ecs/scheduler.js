// Explicit order is part of the simulation contract. No automatic parallelism.
export class SystemSchedule {
 constructor(systems){
  this.systems=[...systems];const ids=new Set();
  for(const system of this.systems){if(!system.id||ids.has(system.id)||typeof system.run!=='function')throw Error('Invalid or duplicate system');for(const id of system.after??[])if(!ids.has(id))throw Error(system.id+' must run after '+id);ids.add(system.id);}
 }
 run(world,frame){for(const system of this.systems)if(!system.enabled||system.enabled(world,frame))system.run(world,frame)}
 describe(){return this.systems.map(({id,reads=[],writes=[],after=[]})=>({id,reads,writes,after}))}
}
