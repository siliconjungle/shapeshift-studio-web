import {createEffectState,createEffectRuntime} from '../../gameplay-effects/runtime.js';
import {createRegistry} from '../../gameplay-effects/definitions.js';
import {createAbilityPresentation} from '../../gameplay-effects/presentation.js';
// A disposable simulation fixture. Project data is never used as live state.
export function createAbilityPreview(project,{feedback=()=>{}}={}){
 const registry=createRegistry(project.abilities.definitions),state=createEffectState(),events=[];
 const actors=[{id:'subject',health:60,alive:true,position:{x:0,z:0}},{id:'friend',health:80,alive:true,position:{x:1,z:0}},{id:'distant',health:100,alive:true,position:{x:6,z:0}}];
 const ref=id=>({kind:'preview',id}),resolve=r=>{if(r?.kind==='god')return{alive:true,capabilities:['Source'],position:null};const a=actors.find(a=>a.id===r?.id);return a?{...a,capabilities:['Vitality','Healable','Mortal','Ignitable','Protectable','Spatial']}:null};
 let seed=7;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 const presentation=createAbilityPresentation({registry,bindings:project.abilities.bindings,
  play:(binding,event)=>feedback(binding,event.effectId?'tick':'apply',event),
  start:(binding,entry)=>{if(!entry.restoring)feedback(binding,'apply',entry);return binding},
  stop:(binding,entry)=>{if(!entry.silent)feedback(binding,'end',entry)},
 });
 const change=(ctx,amount)=>{const a=actors.find(a=>a.id===ctx.target.id);if(!a||!a.alive)return{changed:false,amount:0};const before=a.health;a.health=Math.max(0,Math.min(100,a.health+amount));a.alive=a.health>0;return{changed:before!==a.health,amount:Math.abs(a.health-before)}};
 let runtime;const host={resolve,query:()=>actors.map(a=>ref(a.id)),relation:()=> 'ally',random,outcome:event=>{events.push(event);presentation.consume(event)},commands:{
  damage:(s,c)=>change(c,runtime.modified(c.target,'protection',0).value>0?0:-s.amount),heal:(s,c)=>change(c,s.amount),restore:(_s,c)=>change(c,100),kill:(_s,c)=>change(c,-100),
  ignite:(s,c)=>{const effect=runtime.apply(s.effect??'burning',c.target,c);return{changed:!!effect,effectId:effect?.id??null}},
  embers:()=>({changed:true}),
 }};
 runtime=createEffectRuntime({state,registry,host});
 return{runtime,actors,events,preview:(id,target='subject')=>runtime.preview(id,{target:ref(target),source:ref('subject')}),
  cast:(id,target='subject')=>runtime.cast(id,{target:ref(target),source:ref('subject')}),
  apply:id=>runtime.apply(id,ref('subject'),{source:ref('subject')}),
  advance:dt=>runtime.advance(state.time+dt),
  move:(id,x)=>{actors.find(a=>a.id===id).position.x=x},
  inspect:id=>runtime.inspect(ref(id)),
  dispose:()=>presentation.dispose(),
 };
}
