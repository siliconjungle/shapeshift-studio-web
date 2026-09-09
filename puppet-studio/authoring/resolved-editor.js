import {animationTime} from '../fx/presentation.js';
import {channelOverrides,finalChannels,writePath} from './resolved-channels.js';
import {availableResolvedChannels,readPuppetChannel,sampleResolvedTrack} from './baking.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountResolvedEditor(host){
 const {project,context,scene,pause,changed,dispatch,toast}=host;
 const panel=document.createElement('aside');panel.id='resolved-panel';panel.className='author-panel';panel.hidden=true;document.body.append(panel);
 let channel=null,stamp='',busy=false,range=null,binding='';
 const entries=c=>channelOverrides.values(c);
 function read(c,key){return c.dimension===3?scene()?.readChannel(c.selected,key):readPuppetChannel(project(),c,key,entries(c));}
 function update(){changed();stamp='';refresh();}
 function set(c,key,value){if(!availableResolvedChannels(project(),c).includes(key))throw Error('This channel is not available on the selection');channelOverrides.set(c,key,value);update();}
 function release(c,key){channelOverrides.clear(c,key);update();}
 function edit(c,path,value){const key=availableResolvedChannels(project(),c).find(k=>path===k||path.startsWith(k+'.'));if(!key)return false;const clip=(c.dimension===3?project().scene3d:project()).clips.find(x=>x.id===c.clip),time=c.dimension===3?c.time:animationTime(clip,c.time),baked=finalChannels(clip,time).find(t=>t.node===c.selected&&t.channel===key);if(!channelOverrides.has(c,key)&&!baked)return false;const holder={value:read(c,key)};if(path===key)holder.value=value;else writePath(holder,'value'+path.slice(key.length),value);if(channelOverrides.has(c,key))set(c,key,holder.value);else{dispatch({op:'ownership.key',dimension:c.dimension,clip:c.clip,id:baked.id,time,value:holder.value});update();}return true;}
 function beginGesture(c,d,force=false){const key=d.kind==='eye'?'eye.gaze':d.channel;if(!key||!availableResolvedChannels(project(),c).includes(key))return null;const node=(c.dimension===3?project().scene3d.nodes:project().joints).find(n=>n.id===c.selected),old=entries(c).find(t=>t.node===c.selected&&t.channel===key),clip=(c.dimension===3?project().scene3d:project()).clips.find(x=>x.id===c.clip),baked=finalChannels(clip,c.dimension===3?c.time:animationTime(clip,c.time)).some(t=>t.node===c.selected&&t.channel===key);if(!force&&!old&&!baked&&!(d.kind==='eye'&&(node.facial||node.controller)))return null;const previous=old?structuredClone(old.value):undefined;set(c,key,read(c,key));return{context:c,channel:key,previous,created:!old};}
 function isControlled(c,key){const clip=(c.dimension===3?project().scene3d:project()).clips.find(x=>x.id===c.clip);return channelOverrides.has(c,key)||finalChannels(clip,c.dimension===3?c.time:animationTime(clip,c.time)).some(t=>t.node===c.selected&&t.channel===key);}
 function cancelGesture(t){if(t.created)release(t.context,t.channel);else set(t.context,t.channel,t.previous);}

 async function bake(c,key,{start,end,fps=60}={}){
  if(busy)throw Error('A bake is already running');pause();busy=true;stamp='';refresh();let renderer;
  const source=structuredClone(project()),overrides=structuredClone(entries(c));
  try{
   let readAt;
   if(c.dimension===3){
    const [{IllustratedScene},{applySceneResolved}]=await Promise.all([import('../scene3d/runtime.js'),import('../scene3d/resolved-channels.js')]);
    renderer=new IllustratedScene(document.createElement('canvas'));renderer.resize(64,64);renderer.channelOverrides=overrides;await renderer.load(source);renderer.effects.muted=true;
    if(!renderer.pipeline){renderer.facials.actors.clear();renderer.facials.configure(renderer.project.scene3d.nodes);renderer.facials.last=0;renderer.facials.pointer=scene()?.facials.pointer?.clone()??null;}
    let elapsed=0,first=true;
    readAt=t=>{
     if(renderer.pipeline){renderer.seek(t,c.clip,{continuous:!first,audible:false});first=false;}
     else{while(elapsed<t-1e-10){elapsed=Math.min(t,elapsed+1/60);renderer.seek(elapsed,c.clip);renderer.facials.update(elapsed*1000);}renderer.seek(t,c.clip);renderer.facials.update(t*1000);applySceneResolved(renderer,{eyesOnly:true});}
     return renderer.readChannel(c.selected,key);
    };
   }else readAt=t=>readPuppetChannel(source,{...c,time:t},key,overrides);
   const track=await sampleResolvedTrack({project:source,context:c,channel:key,start,end,fps,readAt,progress:n=>{const el=panel.querySelector('[data-bake-progress]');if(el)el.textContent='Sampling '+Math.round(n*100)+'%';}});
   // The project may be edited while asynchronous geometry loads. Never bake
   // against an obsolete source silently.
   if(JSON.stringify(project())!==JSON.stringify(source))throw Error('The project changed while sampling. Bake again from the updated source.');
   dispatch({op:'ownership.bake',dimension:c.dimension,clip:c.clip,track});release(c,key);toast('Baked '+track.keys.length+' editable keys. Original drivers are preserved.');return track;
  }finally{renderer?.dispose();busy=false;stamp='';refresh();}
 }
 function refresh(){
  if(panel.hidden)return;const c=context(),doc=c.dimension===3?project().scene3d:project(),clip=doc?.clips.find(x=>x.id===c.clip),channels=availableResolvedChannels(project(),c),id=[c.dimension,c.clip,c.selected,c.mode].join(':');
  if(binding!==id){binding=id;range=null;stamp='';}if(!channels.includes(channel))channel=channels[0];
  const current=channel?read(c,channel):undefined,active=channelOverrides.has(c,channel),tracks=(clip?.resolvedTracks??[]).filter(t=>t.node===c.selected);
  if(!active&&current!==undefined)for(const input of panel.querySelectorAll('[data-value]'))input.value=Number((Array.isArray(current)?current[+input.dataset.value]:current).toFixed(4));
  const next=JSON.stringify([id,channel,active,channelOverrides.revision,tracks,busy]);if(next===stamp)return;stamp=next;
  panel.innerHTML=`<header><div><strong>Control & bake</strong><small>${esc(c.selected??'Select an object')}</small></div><button data-close>×</button></header>${!channel?'<p>Select an animated joint or scene object.</p>':`<label>Property<select data-channel>${channels.map(k=>`<option ${k===channel?'selected':''}>${esc(k)}</option>`).join('')}</select></label><p>${active?'Temporary override · final local value':'Sampled output · after animation and constraints'}</p><div class="resolved-values">${(Array.isArray(current)?current:[current]).map((v,i)=>`<label>${Array.isArray(current)?(/color|tint/i.test(channel)?['Red','Green','Blue']:['X','Y','Z'])[i]:'Value'}<input data-value="${i}" type="number" step=".01" value="${Number(v?.toFixed?.(4)??0)}" ${active?'':'disabled'}></label>`).join('')}</div><div class="button-row"><button data-take ${busy||active?'disabled':''}>Take control</button><button data-release ${busy||!active?'disabled':''}>Release</button></div><p>Overrides stay in this session. Release returns to the running drivers. Bake saves the resolved local values for the chosen interval.</p><fieldset ${busy?'disabled':''}><legend>Bake sampled output</legend><label>From (s)<input data-start type="number" min="0" step=".01" value="${range?.start??0}"></label><label>To (s)<input data-end type="number" min="0" step=".01" value="${range?.end??clip.duration}"></label><label>Samples / second<select data-fps>${[24,30,60,120].map(n=>`<option ${n===(range?.fps??60)?'selected':''}>${n}</option>`).join('')}</select></label><button data-bake>${busy?'Sampling…':'Bake to editable keys'}</button><small data-bake-progress></small></fieldset>${tracks.map(t=>`<div class="owner-row"><strong>${esc(t.channel)} · ${t.keys.length} keys</strong><small>${t.start.toFixed(2)}–${t.end.toFixed(2)} s ${c.dimension===2?'animation time':''}</small><label><input type="checkbox" data-enabled="${esc(t.id)}" ${t.enabled!==false?'checked':''}> Active</label><button data-remove="${esc(t.id)}">Remove baked track</button></div>`).join('')}`}`;
 }
 const run=fn=>Promise.resolve().then(fn).catch(e=>toast(e.message,true));
 panel.addEventListener('click',e=>run(()=>{const c=context();if(e.target.closest('[data-close]'))panel.hidden=true;if(e.target.closest('[data-take]')){pause();set(c,channel,read(c,channel));}if(e.target.closest('[data-release]'))release(c,channel);if(e.target.closest('[data-bake]'))return bake(c,channel,range??{start:0,end:(c.dimension===3?project().scene3d:project()).clips.find(x=>x.id===c.clip).duration,fps:60});const b=e.target.closest('[data-remove]');if(b){dispatch({op:'ownership.removeBake',...c,id:b.dataset.remove});stamp='';refresh();}}));
 panel.addEventListener('change',e=>run(()=>{const c=context(),el=e.target;if(el.matches('[data-channel]')){channel=el.value;stamp='';refresh();}if(el.matches('[data-value]')){let value=read(c,channel);if(Array.isArray(value))value[+el.dataset.value]=+el.value;else value=+el.value;set(c,channel,value);}if(el.matches('[data-start],[data-end],[data-fps]'))range={start:+panel.querySelector('[data-start]').value,end:+panel.querySelector('[data-end]').value,fps:+panel.querySelector('[data-fps]').value};if(el.dataset.enabled){dispatch({op:'ownership.bakeSettings',...c,id:el.dataset.enabled,values:{enabled:el.checked}});stamp='';refresh();}}));
 setInterval(refresh,200);
 return {show(path){const c=context();channel=availableResolvedChannels(project(),c).find(k=>path===k||path?.startsWith(k+'.'))??channel;panel.hidden=false;stamp='';refresh();},set,release,edit,bake,read,refresh,beginGesture,cancelGesture,isControlled,snapshot:()=>({channel,busy,entries:structuredClone(entries(context()))})};
}
