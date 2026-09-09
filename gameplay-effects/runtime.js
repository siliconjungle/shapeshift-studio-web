import {assertData,validateDefinition} from './definitions.js';
import {queryTargets,targetRef,targetKey,sameTarget} from './targets.js';
import {schedule,takeDue} from './schedule.js';

export function createEffectState(time=0){return{version:1,time,nextEffect:1,nextEvent:1,nextJob:1,instances:{},jobs:[],cooldowns:{},recent:[],fault:null}}
export function validateEffectState(state,registry){
 try{
  assertData(state);if(state.version!==1||!Number.isFinite(state.time)||state.time<0) return false;
  for(const key of ['nextEffect','nextEvent','nextJob'])if(!Number.isSafeInteger(state[key])||state[key]<1)return false;
  const record=x=>x&&typeof x==='object'&&!Array.isArray(x),ref=x=>record(x)&&typeof x.kind==='string'&&x.kind.length>0&&(x.id===null||typeof x.id==='string'||Number.isSafeInteger(x.id));
  if(!record(state.instances)||!Array.isArray(state.jobs)||!Array.isArray(state.recent)||!record(state.cooldowns)||state.jobs.length>100000||state.recent.length>128)return false;
  for(const value of Object.values(state.cooldowns))if(!Number.isFinite(value)||value<0)return false;
  for(const [key,x] of Object.entries(state.instances)){
   const d=registry.get(x.definition),serial=Number(key.slice(6));
   if(!/^effect[1-9]\d*$/.test(key)||serial>=state.nextEffect||key!==x.id||d?.type!=='effect'||!ref(x.target)||x.source!==null&&!ref(x.source)||x.instigator!==null&&!ref(x.instigator)||!Number.isFinite(x.startedAt)||x.startedAt<0||!Number.isFinite(x.nextTick)||x.nextTick<x.startedAt||!Number.isSafeInteger(x.revision)||x.revision<1||!Number.isInteger(x.stacks)||x.stacks<1||x.stacks>(d.stack?.max??99)||(x.until!==null&&(!Number.isFinite(x.until)||x.until<x.startedAt))||!record(x.data))return false;
   if(x.castId!==undefined&&x.castId!==null&&(!Number.isSafeInteger(x.castId)||x.castId<1||x.castId>=state.nextEvent))return false;
   if(x.socialHandled!==undefined&&typeof x.socialHandled!=='boolean')return false;
   if(x.parent!==null&&!state.instances[x.parent])return false;
   const ancestry=new Set([x.id]);let parent=x.parent;while(parent!==null){if(ancestry.has(parent))return false;ancestry.add(parent);parent=state.instances[parent]?.parent??null}
  }
  const orders=new Set();for(let i=0;i<state.jobs.length;i++){const j=state.jobs[i];if(!['tick','expire','aura','steps'].includes(j.type)||!Number.isFinite(j.at)||j.at<0||!Number.isSafeInteger(j.order)||j.order<1||j.order>=state.nextJob||orders.has(j.order))return false;orders.add(j.order);
   if(j.type==='steps'){validateDefinition({id:'queued',version:1,type:'ability',steps:[j.step]});if(!record(j.context)||j.targets!==null&&(!Array.isArray(j.targets)||!j.targets.every(ref)))return false}
   else if(typeof j.id!=='string'||!Number.isSafeInteger(j.revision)||j.revision<1)return false;
   if(i){const p=state.jobs[(i-1)>>1];if(j.at<p.at||j.at===p.at&&j.order<p.order)return false}}
  let previous=0;for(const event of state.recent){if(!Number.isSafeInteger(event.id)||event.id<=previous||event.id>=state.nextEvent||typeof event.type!=='string'||!Number.isFinite(event.time)||event.time<0)return false;previous=event.id}
  return true;
 }catch{return false}
}

// Hosts own entity data and domain commands. This controller is never saved.
// All continuing gameplay, including queued work, is held in the supplied state.
export function createEffectRuntime({state,registry,host,maxChain=2048}){
 if(!validateEffectState(state,registry))throw new TypeError('Invalid ability runtime state');
 let work=[],events=[],running=false,budget=0,clock=state.time,current=null,modifierIndex=null;
 const fault=message=>{state.fault={at:clock,message};host.diagnostic?.(state.fault);throw new Error(message)};
 const spend=()=>{if(++budget>maxChain)fault('Ability event chain exceeded its budget')};
 function emit(type,data={}){
  const event={id:state.nextEvent++,parentId:current?.id??null,time:clock,type,...data};
  events.push(event);state.recent.push(event);if(state.recent.length>128)state.recent.shift();return event;
 }
 function contextFor(x){const p=host.resolve(x.target)?.position;return{source:x.source,target:x.target,instigator:x.instigator,ability:x.ability,castId:x.castId??null,socialHandled:x.socialHandled??false,effectId:x.id,point:p?{x:p.x,z:p.z}:null}}
 function steps(list,context){for(const step of list??[])work.push({step,context})}
 function end(id,reason='cancelled'){
  const x=state.instances[id];if(!x)return false;delete state.instances[id];modifierIndex=null;
  for(const child of Object.values(state.instances))if(child.parent===id)end(child.id,'source-ended');
  const d=registry.get(x.definition);steps(d.end,contextFor(x));emit('effect.ended',{...contextFor(x),definition:d.id,reason});host.effectEnded?.(x,reason);return true;
 }
 function apply(definition,target,context={},options={}){
  const d=registry.get(definition);if(d?.type!=='effect')throw new Error(`Unknown effect ${definition}`);
  const entity=host.resolve(target);if(!entity||(!entity.alive&&!d.surviveDeath))return null;
  if(d.target&&!queryTargets(host,d.target,{...context,target}).valid)return null;
  const now=clock,policy=d.stack??{mode:'refresh',scope:'target'},matches=Object.values(state.instances).filter(x=>x.definition===definition&&sameTarget(x.target,target)&&(policy.scope!=='source'||sameTarget(x.source,context.source))&&(x.parent??null)===(options.parent??null));
  let existing=matches[0];
  if(existing&&policy.mode==='ignore')return existing;
  if(existing&&policy.mode==='replace'){for(const x of matches)end(x.id,'replaced');existing=null}
  const duration=Object.hasOwn(options,'duration')?options.duration:d.duration;if(duration!==null&&(!Number.isFinite(duration)||duration<0))throw new TypeError('Invalid effect duration');const until=duration===null?null:now+duration;
  if(existing){
   if(policy.mode==='stack')existing.stacks=Math.min(policy.max??99,existing.stacks+1);
   existing.until=until;existing.revision++;
   if(d.resetCadence)existing.nextTick=now+(d.period??0);
   queueInstance(existing,d);emit('effect.refreshed',{...contextFor(existing),definition,stacks:existing.stacks});host.effectChanged?.(existing);return existing;
  }
  const x={id:'effect'+state.nextEffect++,definition,target:targetRef(target),source:targetRef(context.source),instigator:targetRef(context.instigator??context.source),ability:context.ability??null,castId:context.castId??null,socialHandled:!!context.socialHandled,parent:options.parent??null,startedAt:now,until,nextTick:now+(d.period??0),stacks:1,revision:1,data:structuredClone(options.data??{})};
  state.instances[x.id]=x;modifierIndex=null;queueInstance(x,d);steps(d.apply,contextFor(x));emit('effect.applied',{...contextFor(x),definition});host.effectChanged?.(x);return x;
 }
 function queueInstance(x,d){
  if(d.period&&(x.until===null||x.nextTick<=x.until))schedule(state,{type:'tick',at:x.nextTick,id:x.id,revision:x.revision});
  if(d.aura)schedule(state,{type:'aura',at:clock,id:x.id,revision:x.revision});
  if(x.until!==null)schedule(state,{type:'expire',at:x.until,id:x.id,revision:x.revision});
  if(state.jobs.length>Math.max(128,Object.keys(state.instances).length*8))state.jobs=state.jobs.filter(j=>j.type==='steps'?(!j.context.effectId||state.instances[j.context.effectId]):state.instances[j.id]?.revision===j.revision).sort((a,b)=>a.at-b.at||a.order-b.order);
 }
 function execute({step,context}){
  spend();if(step.chance!==undefined&&host.random()>=step.chance)return;
  if(step.delay>0){const targets=step.capture==='snapshot'?queryTargets(host,step.select??{from:'target'},context).targets:null;schedule(state,{type:'steps',at:clock+step.delay,step:{...step,delay:0},context:structuredClone(context),targets});return}
  const selection=context.capturedTargets?{targets:context.capturedTargets}:queryTargets(host,step.select??{from:'target'},context);
  for(const target of selection.targets){
   if(!host.resolve(target))continue;
   const ctx={...context,target,time:clock};let result;
   if(step.op==='apply'){const before=state.nextEvent,x=apply(step.effect,target,ctx,step);result={changed:state.nextEvent!==before,effectId:x?.id??null}}
   else if(step.op==='dispel'){let count=0;for(const x of Object.values(state.instances))if(sameTarget(x.target,target)&&(!step.effect||x.definition===step.effect)){end(x.id,'dispelled');count++}result={changed:count>0,amount:count}}
   else{const command=Object.hasOwn(host.commands,step.op)&&host.commands[step.op];if(typeof command!=='function')throw new Error(`Unregistered ability operation ${step.op}`);result=command(step,ctx,api)??{changed:false}}
   if(result.changed)host.invalidateQueries?.();
   emit(`operation.${step.op}`,{parentId:ctx.parentEventId??null,source:ctx.source??null,instigator:ctx.instigator??ctx.source??null,target,ability:ctx.ability??null,castId:ctx.castId??null,socialHandled:!!ctx.socialHandled,effectId:ctx.effectId??null,result});
  }
 }
 function dispatch(event){
  spend();current=event;host.outcome?.(event);
  // Snapshot participants before any listener runs. New effects wait for the next event.
  const listeners=Object.values(state.instances).flatMap(x=>(registry.get(x.definition).triggers??[]).filter(t=>t.event===event.type).map(t=>({id:x.id,t})));
  for(const {id,t} of listeners){const x=state.instances[id];if(!x)continue;if(t.changed!==false&&event.result?.changed===false)continue;
   if(t.subject!=='any'&&!sameTarget(t.subject==='source'?event.source:event.target,x.target))continue;
   if(t.chance!==undefined&&host.random()>=t.chance)continue;
   steps(t.steps,{...contextFor(x),event,parentEventId:event.id});
  }current=null;
 }
 function cleanup(){
  for(const x of Object.values(state.instances)){
   if(!state.instances[x.id])continue;
   const d=registry.get(x.definition),entity=host.resolve(x.target),source=host.resolve(x.source);
   if(!entity)end(x.id,'target-removed');else if(!entity.alive&&!d.surviveDeath)end(x.id,'death');else if(d.sourceBound&&(!source||!source.alive))end(x.id,'source-removed');
  }
 }
 function flush(){
  if(running)return;running=true;budget=0;
  try{while(work.length||events.length){while(work.length)execute(work.shift());host.resolveDeaths?.();cleanup();if(events.length)dispatch(events.shift());}}
  catch(error){work=[];events=[];if(!state.fault)state.fault={at:clock,message:error.message};throw error}
  finally{running=false;current=null}
 }
 function aura(x,d){
  const context=contextFor(x),targets=queryTargets(host,d.aura.select,context).targets,keys=new Set(targets.map(targetKey));
  for(const child of Object.values(state.instances))if(child.parent===x.id&&!keys.has(targetKey(child.target)))end(child.id,'left-aura');
  for(const target of targets)if(!Object.values(state.instances).some(child=>child.parent===x.id&&sameTarget(child.target,target)))apply(d.aura.effect,target,context,{parent:x.id,duration:null});
  schedule(state,{type:'aura',at:clock+(d.aura.interval??.25),id:x.id,revision:x.revision});
 }
 function advance(time){
  if(!Number.isFinite(time)||time<state.time)throw new Error('Effect time must move forwards');
  host.invalidateQueries?.();
  clock=time;
  cleanup();
  flush();let job,processed=0;
  while((job=takeDue(state,time))){if(++processed>100000)fault('Ability catch-up exceeded its budget');clock=job.at;
   if(job.type==='steps'){if(!job.context.effectId||state.instances[job.context.effectId]){work.push({step:job.step,context:{...job.context,...(job.targets?{capturedTargets:job.targets}:{})}});flush()}continue}
   const x=state.instances[job.id];if(!x||x.revision!==job.revision)continue;const d=registry.get(x.definition);
   if(job.type==='tick'){
    // A tick exactly at expiry happens before removal, including after save/load.
    if(x.until===null||clock<=x.until){steps(d.tick,contextFor(x));flush();if(state.instances[x.id]){x.nextTick=clock+d.period;if(x.until===null||x.nextTick<=x.until)schedule(state,{type:'tick',at:x.nextTick,id:x.id,revision:x.revision})}}
   }else if(job.type==='expire'){
    if(d.period&&x.nextTick<=clock){steps(d.tick,contextFor(x));x.nextTick=clock+d.period;flush()}
    end(x.id,'expired');flush();
   }else if(job.type==='aura'){aura(x,d);flush()}
  }
  clock=time;state.time=time;
 }
 function unsupported(definition,seen=new Set()){
  if(seen.has(definition.id))return null;seen.add(definition.id);
  for(const step of [definition.steps,definition.apply,definition.tick,definition.end,...(definition.triggers??[]).map(t=>t.steps)].flatMap(s=>s??[])){
   if(!['apply','dispel'].includes(step.op)&&(!Object.hasOwn(host.commands,step.op)||typeof host.commands[step.op]!=='function'))return step.op;
   if(step.effect){const missing=unsupported(registry.get(step.effect),seen);if(missing)return missing}
  }
  return definition.aura?unsupported(registry.get(definition.aura.effect),seen):null;
 }
 function preview(ability,context){
  host.invalidateQueries?.();const d=registry.get(ability);if(d?.type!=='ability')return{valid:false,reason:'Unknown ability',targets:[]};
  const result=queryTargets(host,d.target??{},context);if(!result.valid)return result;
  const missing=unsupported(d);if(missing)return{...result,valid:false,reason:'Operation requires a compatible scene: '+missing};
  const now=host.time?.()??clock,until=state.cooldowns[JSON.stringify([targetKey(context.source),ability])]??0;
  if(until>now)return{...result,valid:false,reason:'Ability is recharging',remaining:until-now};
  const costs=(d.costs??[]).map(c=>({...c,available:host.available?.(c.resource,context)??0}));
  const insufficient=costs.find(c=>!Number.isFinite(c.available)||c.available<c.amount);
  if(insufficient)return{...result,valid:false,reason:'Not enough '+insufficient.resource,costs};
  if(costs.some(c=>c.amount>0)&&typeof host.pay!=='function')return{...result,valid:false,reason:'Scene cannot pay ability costs',costs};
  return host.validate?.(d,context,{...result,costs})??{...result,costs};
 }
 function cast(ability,context){
  const result=preview(ability,context);if(!result.valid)return result;const d=registry.get(ability),ctx={...context,ability,castId:state.nextEvent,source:targetRef(context.source),instigator:targetRef(context.instigator??context.source)};
  // Hosts commit the complete cost list atomically after target/operation checks.
  if(d.costs?.some(c=>c.amount>0)&&host.pay(d.costs,ctx)!==true)return{...result,valid:false,reason:'Ability costs changed; try again'};
  const firstEvent=state.nextEvent;
  for(const target of result.targets)steps(d.steps,{...ctx,target});if(d.cooldown)state.cooldowns[JSON.stringify([targetKey(ctx.source),ability])]=clock+d.cooldown;flush();return{...result,ability,outcomes:state.recent.filter(e=>e.id>=firstEvent&&e.type.startsWith('operation.'))};
 }
 function modified(target,stat,base,{min=-Infinity,max=Infinity,at=host.time?.()??clock}={}){
  let add=0,multiply=1,override=null;const contributions=[];
  if(!modifierIndex){modifierIndex=new Map();for(const x of Object.values(state.instances)){const key=targetKey(x.target);let byStat=modifierIndex.get(key);if(!byStat)modifierIndex.set(key,byStat=new Map());for(const m of registry.get(x.definition).modifiers??[]){let entries=byStat.get(m.stat);if(!entries)byStat.set(m.stat,entries=[]);entries.push({x,m})}}}
  for(const {x,m} of modifierIndex.get(targetKey(target))?.get(stat)??[])if(x.until===null||x.until>at){contributions.push({effectId:x.id,definition:x.definition,source:x.source,stacks:x.stacks,...m});if(m.mode==='add')add+=m.value*x.stacks;else if(m.mode==='multiply')multiply*=m.value**x.stacks;else if(!override||(m.priority??0)>=(override.priority??0))override=m;}
  return{value:Math.min(max,Math.max(min,override?override.value:(base+add)*multiply)),contributions};
 }
 const api={state,registry,preview,cast,advance,modified,query:(selector,context)=>queryTargets(host,selector,context),
  apply:(definition,target,context,options)=>{const x=apply(definition,target,context,options);flush();return x},
  end:(id,reason)=>{const ended=end(id,reason);flush();return ended},
  notify:(type,data)=>{emit(type,data);flush()},
  run:(list,context)=>{validateDefinition({id:'command',version:1,type:'ability',steps:list});steps(list,context);flush()},
  inspect:target=>Object.values(state.instances).filter(x=>sameTarget(x.target,target)).map(x=>({...structuredClone(x),remaining:x.until===null?null:Math.max(0,x.until-clock),nextTickIn:Math.max(0,x.nextTick-clock)})),
  restorePresentation:()=>{for(const x of Object.values(state.instances))host.effectRestored?.(x)}
 };
 // Explicit recovery is a reset of continuing work, never a retry of a paid
 // command. Preserve committed entity/resource changes and event identity.
 api.recover=({mode}={})=>{
  if(mode!=='clear-effects')throw Error('Recovery requires mode clear-effects');
  if(!state.fault)return{recovered:false,clearedEffects:0,discardedJobs:0};
  const previousFault=structuredClone(state.fault),instances=Object.values(state.instances),discardedJobs=state.jobs.length;
  work=[];events=[];state.instances={};state.jobs=[];modifierIndex=null;clock=Math.max(state.time,state.fault.at,host.time?.()??0);state.time=clock;state.fault=null;
  for(const x of instances){host.effectEnded?.(x,'recovery');emit('effect.ended',{...contextFor(x),definition:x.definition,reason:'recovery'})}
  emit('runtime.recovered',{clearedEffects:instances.length,discardedJobs});flush();
  return{recovered:true,clearedEffects:instances.length,discardedJobs,previousFault};
 };
 // Save-boundary migration only: no application callbacks, triggers or sounds.
 api.hydrate=record=>{
  assertData(record);const d=registry.get(record.definition);if(d?.type!=='effect')throw Error('Unknown restored effect');
  const x={id:'effect'+state.nextEffect,definition:d.id,target:targetRef(record.target),source:targetRef(record.source),instigator:targetRef(record.instigator??record.source),ability:record.ability??null,parent:null,startedAt:record.startedAt,until:record.until,nextTick:record.nextTick??record.startedAt+(d.period??0),stacks:record.stacks??1,revision:1,data:structuredClone(record.data??{})};
  const candidate={...state,nextEffect:state.nextEffect+1,instances:{...state.instances,[x.id]:x}};if(!validateEffectState(candidate,registry))throw Error('Invalid restored effect');
  state.nextEffect++;state.instances[x.id]=x;modifierIndex=null;queueInstance(x,d);return x;
 };
 return api;
}
