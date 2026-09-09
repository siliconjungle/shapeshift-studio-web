// Rendering consumes outcomes. No visual update can change gameplay or draw from
// the simulation RNG. Call restore after loading, and dispose on scene changes.
export function createAbilityPresentation({registry,bindings={},play,start,stop,update}={}){
 const active=new Map();let lastEvent=0;
 const binding=d=>bindings[d?.presentation]??null;
 function finish(id,silent=false){const entry=active.get(id);if(entry){stop?.(entry.handle,{...entry,silent});active.delete(id)}}
 function begin(x,{restoring=false}={}){const d=registry.get(x.definition),b=binding(d);if(!b)return;finish(x.id);const entry={id:x.id,target:x.target,source:x.source,binding:b,definition:d.id};entry.handle=start?.(b,{...entry,restoring});active.set(x.id,entry)}
 return{
  consume(event){
   if(!Number.isSafeInteger(event.id)||event.id<=lastEvent)return;lastEvent=event.id;
   if(event.type==='effect.applied')begin({id:event.effectId,definition:event.definition,target:event.target,source:event.source});
   else if(event.type==='effect.ended')finish(event.effectId);
   else if(event.type==='effect.refreshed')update?.(active.get(event.effectId)?.handle,event);
   else if(event.type.startsWith('operation.')&&event.result?.changed&&!active.has(event.result.effectId)){const d=registry.get(event.ability)??registry.get(event.definition),b=active.get(event.effectId)?.binding??binding(d);if(b)play?.(b,event,active.get(event.effectId)?.handle)}
  },
  restore(state){for(const id of [...active.keys()])finish(id,true);lastEvent=state.nextEvent-1;for(const x of Object.values(state.instances))begin(x,{restoring:true})},
  snapshot:()=>({lastEvent,active:[...active.values()].map(({handle,...entry})=>entry)}),
  dispose(){for(const id of [...active.keys()])finish(id,true)},
 };
}
