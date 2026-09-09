import {operationNames,operationDefaults,editOperation,DOMAIN_OPERATIONS} from './ability-operations.js';
import {abilityPacket,isLittleGodsLibrary} from './abilities.js';
import {createAbilityPreview} from './ability-preview.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAbilities({project,dispatch,revision,toast,feedback,download,openVillage,references=()=>null}){
 const button=document.createElement('button');button.id='abilities-open';button.textContent='Abilities';document.getElementById('styles-open').before(button);
 const panel=document.createElement('aside');panel.id='abilities-panel';panel.className='author-panel';panel.hidden=true;document.body.append(panel);
 let selected=null,stamp=-1,simulation=null,playing=false,lastTime=0;
 const run=command=>{try{dispatch(command);stamp=-1;reset();render();return true}catch(error){toast(error.message,true);return false}};
 function reset(){playing=false;simulation?.dispose();simulation=null}
 function render(){
  if(panel.hidden||stamp===revision())return;stamp=revision();const p=project(),a=p.abilities,integration=isLittleGodsLibrary(a);
  if(!a){panel.innerHTML='<header><strong>Abilities</strong><button data-close aria-label="Close abilities">×</button></header><p>Build gameplay from targets, operations, lasting effects and reactions. Bind feedback to your existing animation and sound clips.</p><button data-init>Create ability library</button><button data-integration>Enable Little Gods integration</button>';return}
  selected=a.definitions.some(d=>d.id===selected)?selected:a.definitions[0]?.id;const d=a.definitions.find(d=>d.id===selected),binding=a.bindings[d?.presentation],dimension=binding?.dimension??2,clips=dimension===3?p.scene3d?.clips??[]:p.clips;
  const options=(values,value)=>values.map(v=>`<option value="${esc(v)}" ${value===v?'selected':''}>${esc(v)}</option>`).join('');
  panel.innerHTML=`<header><div><strong>Abilities & effects</strong><small>Gameplay definitions · 2D and 3D feedback</small></div><button data-close aria-label="Close abilities">×</button></header>
   ${integration?'<small>Little Gods integration enabled</small>':'<button data-integration>Enable Little Gods integration</button>'}
   <label>Definition<select data-select>${a.definitions.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(x.id)} · ${x.type}</option>`).join('')}</select></label>
   <div class="button-row"><button data-add="ability">+ Ability</button><button data-add="effect">+ Effect</button><button data-export>Export definitions</button><button data-import title="Replace ability definitions and clear presentation bindings; undo restores them">Replace from JSON</button><input data-import-file type="file" accept="application/json,.json" hidden></div>
   ${d?`<label>Name<input data-name value="${esc(d.name??d.id)}"></label><label>Required capabilities<input data-requires value="${esc((d.target?.requires??[]).join(', '))}" placeholder="Vitality, Ignitable"></label>
   ${d.type==='ability'?`<label>Cooldown (s)<input data-cooldown type="number" min="0" step=".1" value="${d.cooldown??0}"></label><div class="button-row"><label>Cost resource<input data-cost-resource value="${esc(d.costs?.[0]?.resource??'')}" placeholder="food"></label><label>Cost amount<input data-cost-amount type="number" min="0" value="${d.costs?.[0]?.amount??0}"></label></div>`:''}
   ${d.type==='effect'?`<div class="button-row"><label>Duration (s)<input type="number" min="0" step=".1" data-duration value="${d.duration??''}" placeholder="Until removed"></label><label>Tick interval (s)<input type="number" min=".001" step=".1" data-period value="${d.period??''}"></label></div><label>Reapplication<select data-stack>${options(['refresh','stack','replace','ignore'],d.stack?.mode??'refresh')}</select></label><label>Stack identity<select data-scope>${options(['target','source'],d.stack?.scope??'target')}</select></label>`:''}
   <h3>${d.type==='effect'?'Tick operations':'Operations'}</h3>${(d.type==='effect'?d.tick??[]:d.steps??[]).map((step,i)=>`<fieldset data-operation="${i}"><label>Operation ${i+1}<select data-operation-field="op">${options([...new Set([...operationNames(integration),step.op])],step.op)}</select></label>${step.amount!==undefined?`<label>Amount<input data-operation-field="amount" type="number" min="0" value="${step.amount}"></label>`:''}${step.effect?`<label>Effect<select data-operation-field="effect">${options(a.definitions.filter(x=>x.type==='effect').map(x=>x.id),step.effect)}</select><button data-open-effect="${esc(step.effect)}">Open effect</button></label>`:''}${integration&&DOMAIN_OPERATIONS[step.op]?`<label>Action<select data-operation-field="wish">${options(DOMAIN_OPERATIONS[step.op],step.wish)}</select></label>`:''}<label>Select from<select data-operation-field="from">${options(['target','source','world','eventTarget','eventSource'],step.select?.from??'target')}</select></label><div class="button-row"><label>Radius<input data-operation-field="radius" type="number" min="0" step=".25" value="${step.select?.radius??''}" placeholder="Single target"></label><label>Delay (s)<input data-operation-field="delay" type="number" min="0" step=".1" value="${step.delay??0}"></label></div><button data-operation-remove="${i}">Remove operation</button></fieldset>`).join('')}<button data-operation-add>Add operation</button>
   <details><summary>Operation JSON</summary><textarea data-steps rows="6" spellcheck="false">${esc(JSON.stringify(d.type==='effect'?d.tick??[]:d.steps??[],null,2))}</textarea></details>
   <details><summary>Triggers, modifiers, auras & advanced settings</summary><textarea data-definition rows="14" spellcheck="false">${esc(JSON.stringify(d,null,2))}</textarea><button data-apply-json>Apply definition</button></details>
   <h3>Presentation</h3><label>Role<input data-role value="${esc(d.presentation??'')}" placeholder="miracle.fire"></label><label>Scene<select data-dimension>${options(['2','3'],String(dimension))}</select></label>${['apply','tick','end'].map(stage=>`<label>${stage==='apply'?'On application':stage==='tick'?'On impact / tick':'On removal'}<select data-binding="${stage}"><option value="">None</option>${clips.map(c=>`<option value="${esc(c.id)}" ${binding?.[stage]===c.id?'selected':''}>${esc(c.name??c.id)}</option>`).join('')}</select>${binding?.[stage]?`<button data-open-clip="${esc(binding[stage])}" data-clip-dimension="${dimension}">Open animation</button>`:''}</label>`).join('')}
   ${integration?`<details><summary>Game feedback actions</summary><p>Use existing native sound, reaction, burst, flash and render actions. Targets accept $event:abilityTarget and positions accept $event:abilityPosition. Restore only redraws persistent visuals.</p><textarea data-native-binding rows="8" spellcheck="false">${esc(JSON.stringify(binding?.native??{},null,2))}</textarea></details>`:''}
   <h3>Interaction preview</h3><p>Three test actors use the real effect resolver. Move the friend outside an aura or advance time to inspect expiry.</p><div class="button-row"><button data-cast>${d.type==='effect'?'Apply effect':'Cast ability'}</button><button data-step>+1 second</button><button data-play>Run / pause</button><button data-reset>Reset</button>${integration?'<button data-village>Preview in village</button>':''}</div><label>Friend distance<input data-distance type="range" min="0" max="8" value="1" step=".25"></label><output data-status style="white-space:pre-wrap;font:12px/1.6 monospace"></output>`:''}`;
 }
 function preview(){return simulation??=createAbilityPreview(project(),{feedback})}
 function showStatus(message=''){
  const node=panel.querySelector('[data-status]');if(!node||!simulation)return;
  const r=simulation.runtime;node.textContent=(message?message+'\n':'')+`Time ${r.state.time.toFixed(2)}s\n`+simulation.actors.map(a=>`${a.id}: ${a.health} health · warmth ${r.modified({kind:'preview',id:a.id},'temperature',20).value}°\n`+simulation.inspect(a.id).map(x=>`  ${x.definition} · ${x.remaining===null?'persistent':x.remaining.toFixed(1)+'s left'} · next tick ${x.nextTickIn.toFixed(1)}s · source ${x.source?.id??'none'}`).join('\n')).join('\n')+'\n'+simulation.events.slice(-4).map(e=>`${e.type}${e.result?.amount!==undefined?' '+e.result.amount:''}`).join('\n');
 }
 panel.onchange=async e=>{const el=e.target,a=project().abilities,d=a?.definitions.find(d=>d.id===selected);if(el.hasAttribute('data-import-file')){try{const file=el.files[0];if(file){if(file.size>5*1024*1024)throw Error('Ability library must be under 5 MB');if(run({op:'ability.import',value:JSON.parse(await file.text())}))toast('Ability definitions replaced. Use Undo to restore the previous library and bindings.');}}catch(error){toast(error.message,true)}return}if(el.hasAttribute('data-select')){selected=el.value;stamp=-1;reset();render();return}if(el.hasAttribute('data-distance')){preview().move('friend',+el.value);preview().advance(.25);showStatus();return}if(!d)return;
  if(el.hasAttribute('data-operation-field')){try{run({op:'ability.upsert',value:editOperation(d,+el.closest('[data-operation]').dataset.operation,el.dataset.operationField,el.value,a.definitions,isLittleGodsLibrary(a))})}catch(error){toast(error.message,true)}return}
  const next=structuredClone(d);
  if(el.hasAttribute('data-cooldown'))next.cooldown=+el.value;
  else if(el.hasAttribute('data-cost-resource')||el.hasAttribute('data-cost-amount')){const resource=panel.querySelector('[data-cost-resource]').value.trim(),amount=+panel.querySelector('[data-cost-amount]').value;next.costs=resource?[{resource,amount},...(next.costs??[]).slice(1)]:[]}
  else if(el.hasAttribute('data-name'))next.name=el.value;
  else if(el.hasAttribute('data-requires'))next.target={...next.target,requires:el.value.split(',').map(s=>s.trim()).filter(Boolean)};
  else if(el.hasAttribute('data-duration'))next.duration=el.value===''?null:+el.value;
  else if(el.hasAttribute('data-period')){if(el.value==='')delete next.period;else next.period=+el.value}
  else if(el.hasAttribute('data-stack'))next.stack={...next.stack,mode:el.value};
  else if(el.hasAttribute('data-scope'))next.stack={mode:'refresh',...next.stack,scope:el.value};
  else if(el.hasAttribute('data-steps')){try{next[d.type==='effect'?'tick':'steps']=JSON.parse(el.value)}catch(error){toast(error.message,true);return}}
  else if(el.hasAttribute('data-role')){if(el.value)next.presentation=el.value;else delete next.presentation}
  else if(el.hasAttribute('data-native-binding')){try{if(!d.presentation)throw Error('Give this definition a presentation role first.');run({op:'ability.bind',id:d.presentation,value:{...(a.bindings[d.presentation]??{dimension:2}),native:JSON.parse(el.value)}})}catch(error){toast(error.message,true)}return}
  else if(el.hasAttribute('data-binding')||el.hasAttribute('data-dimension')){if(!d.presentation){toast('Give this definition a presentation role first.',true);return}const old=a.bindings[d.presentation]??{dimension:2};const value=el.hasAttribute('data-dimension')?{dimension:+el.value,...(old.native?{native:old.native}:{})}:{...old,[el.dataset.binding]:el.value};run({op:'ability.bind',id:d.presentation,value});return}
  else return;run({op:'ability.upsert',value:next});
 };
 panel.onclick=async e=>{const el=e.target.closest('button');if(!el)return;try{
  if(el.hasAttribute('data-close')){panel.hidden=true;playing=false;return}
  if(el.hasAttribute('data-open-effect')){await references()?.open({kind:'effect',id:el.dataset.openEffect});return}
  if(el.hasAttribute('data-open-clip')){await references()?.open({kind:'clip',id:el.dataset.openClip,dimension:+el.dataset.clipDimension});return}
  if(el.hasAttribute('data-import'))panel.querySelector('[data-import-file]').click();
  if(el.hasAttribute('data-village')){playing=false;await openVillage?.(selected);return}
  if(el.hasAttribute('data-operation-add')){const d=structuredClone(project().abilities.definitions.find(d=>d.id===selected));(d[d.type==='effect'?'tick':'steps']??=[]).push(operationDefaults('heal'));run({op:'ability.upsert',value:d})}
  if(el.hasAttribute('data-operation-remove')){const a=project().abilities;run({op:'ability.upsert',value:editOperation(a.definitions.find(d=>d.id===selected),+el.dataset.operationRemove,'remove',null,a.definitions)})}
  if(el.hasAttribute('data-init'))run({op:'ability.init'});
  if(el.hasAttribute('data-integration')){const {installLittleGodsAbilities}=await import('../integrations/little-gods/abilities.js');run(installLittleGodsAbilities())}
  if(el.hasAttribute('data-add')){selected='custom.'+crypto.randomUUID().slice(0,8);run({op:'ability.upsert',value:{id:selected,version:1,type:el.dataset.add,...(el.dataset.add==='effect'?{duration:5}:{}),steps:[]}})}
  if(el.hasAttribute('data-export'))download(JSON.stringify(abilityPacket(project()),null,2),'abilities.json');
  if(el.hasAttribute('data-apply-json'))run({op:'ability.upsert',value:JSON.parse(panel.querySelector('[data-definition]').value)});
  if(el.hasAttribute('data-reset')){reset();preview();showStatus()}
  if(el.hasAttribute('data-cast')){const d=project().abilities.definitions.find(d=>d.id===selected),s=preview(),result=d.type==='effect'?s.apply(selected):s.cast(selected);s.advance(0);showStatus(result?.valid===false?result.reason:'Applied')}
  if(el.hasAttribute('data-step')){preview().advance(1);showStatus()}
  if(el.hasAttribute('data-play')){preview();playing=!playing;lastTime=performance.now()}
 }catch(error){playing=false;toast(error.message,true)}};
 button.onclick=()=>{panel.hidden=!panel.hidden;stamp=-1;if(panel.hidden)playing=false;render()};
 const timer=setInterval(()=>{render();if(playing&&!panel.hidden){const now=performance.now();try{preview().advance(Math.min(.1,(now-lastTime)/1000));showStatus()}catch(error){playing=false;toast(error.message,true)}lastTime=now}},100);
 return{hide(){panel.hidden=true;playing=false},context:()=>({selected,visible:!panel.hidden,scroll:panel.scrollTop}),restore(state){selected=state.selected;panel.hidden=!state.visible;stamp=-1;reset();render();panel.scrollTop=state.scroll??0},show(id){if(id)selected=id;panel.hidden=false;stamp=-1;reset();render()},snapshot:()=>simulation?{actors:structuredClone(simulation.actors),state:structuredClone(simulation.runtime.state)}:null,dispose(){clearInterval(timer);reset();panel.remove();button.remove()}};
}
