import {previewDefaults,previewSegment} from './preview.js';
import {freezeReference} from './preview-snapshot.js';
import {PreviewPlayer} from './preview-player.js';
import {propertyDrivers} from './ownership.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountPreview({project,dispatch,context,toast}){
 const panel=document.createElement('section');panel.id='preview-arena';panel.hidden=true;
 panel.innerHTML='<aside id="arena-controls"></aside><div class="arena-stage"><div id="arena-surface"><span class="arena-lane-label">Current</span></div><div id="arena-reference" hidden><span class="arena-lane-label">Saved reference</span></div><output id="arena-status"></output></div><footer><button id="arena-play">▶ Play</button><button id="arena-reset">Reset</button><input id="arena-time" type="range" min="0" max="6" step=".01" value="0"><output id="arena-clock">0.00 s</output><label><input type="checkbox" id="arena-sound" checked> Sound</label><select id="arena-audio" aria-label="Sound source"><option value="current">Current sound</option><option value="reference">Reference sound</option></select><button id="arena-capture">Save reference</button></footer>';
 document.body.append(panel);const $=id=>panel.querySelector('#'+id);
 let scenario=null,current=null,saved=null,time=0,playing=false,visible=false,generation=0,last=0,reference='',recording=false,layout='split',cameraMode='current',raf=0,disposed=false,loading=false;
 const clips=()=>scenario?.dimension===3?project().scene3d?.clips??[]:project().clips;
 const run=fn=>Promise.resolve().then(fn).catch(e=>{pause();toast(e.message,true);});
 const selectedReference=()=>project().preview?.references?.find(r=>r.id===reference&&r.scenario.dimension===scenario?.dimension);
 const duration=()=>Math.max(scenario?.duration??0,selectedReference()?.scenario.duration??0);
 const audible=lane=>playing&&$('arena-sound').checked&&$('arena-audio').value===lane;
 function controls(){const p=project(),s=scenario,doc=s.dimension===3?p.scene3d:p,nodes=s.dimension===3?doc?.nodes??[]:p.joints,options=list=>list.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');$('arena-controls').innerHTML=`<h2>Preview</h2><p>Play your scene in a repeatable test situation.</p><h3>Comparison</h3><select id="arena-reference-choice"><option value="">Current only</option>${options((p.preview?.references??[]).filter(r=>r.scenario.dimension===s.dimension).map(r=>({...r,name:r.name+(r.project?'':' · legacy stills')})))}</select><label>Layout<select id="arena-layout"><option value="split">Side by side</option><option value="overlay">Overlay</option></select></label><label>Camera<select id="arena-camera"><option value="current">Match current view</option><option value="saved">Match saved view</option><option value="independent">Independent views</option></select></label><label>Overlay<input id="arena-mix" type="range" min="0" max="1" step=".01" value=".5"></label><button id="arena-delete-reference">Delete reference</button><h3>Scenario setup</h3><label>Scenario<select id="arena-scenario">${options(p.preview?.scenarios??[s])}</select></label><label>Name<input id="arena-name" value="${esc(s.name)}"></label><label>View<select id="arena-dimension"><option value="2">2D rig</option><option value="3" ${p.scene3d?'':'disabled'}>3D scene</option></select></label><label>Starting clip<select id="arena-clip">${options(clips())}</select></label><label>Subject<select id="arena-subject">${options(nodes)}</select></label><label>Duration<input id="arena-duration" type="number" min=".1" max="120" step=".1" value="${s.duration}"></label><label>Style<select id="arena-variant"><option value="">Project style</option>${options(p.appearance?.variants??[])}</select></label><h3>Ground</h3><label><input id="arena-ground" type="checkbox" ${s.ground.enabled?'checked':''}> Uneven ground</label>${['height','amplitude','span'].map(k=>`<label>${k}<input type="number" data-arena-ground="${k}" step=".1" value="${s.ground[k]}"></label>`).join('')}<h3>Attention</h3><label><input id="arena-gaze" type="checkbox" ${s.gaze.enabled?'checked':''}> Moving gaze target</label><p>${s.dimension===3?'Uses the existing pointer-gaze input. Action ownership still takes precedence.':'A look constraint turns the selected joint towards the target.'}</p><h3>Interruptions / hits</h3><div>${s.events.map((e,i)=>`<div class="arena-event">${e.time.toFixed(2)} s · ${esc(clips().find(c=>c.id===e.clip)?.name??e.clip)} <button data-arena-remove="${i}">×</button></div>`).join('')}</div><select id="arena-hit-clip">${options(clips())}</select><button id="arena-hit">Trigger at playhead</button><button id="arena-add-hit">Schedule at playhead</button>`;
 for(const [id,value]of [['scenario',s.id],['dimension',s.dimension],['clip',s.clip],['subject',s.subject],['variant',s.variant],['reference-choice',reference],['layout',layout],['camera',cameraMode]])$('arena-'+id).value=value;$('arena-time').max=duration();$('arena-delete-reference').disabled=!reference||!!selectedReference()?.protected;
 }
 function pause(){playing=false;$('arena-play').textContent='▶ Play';current?.pause();saved?.pause();}
 function save(){dispatch({op:'preview.scenario',value:scenario});}
 function makeLane(host,id){const canvas=document.createElement('canvas');canvas.id=id;host.querySelector('canvas')?.remove();host.querySelector('img')?.remove();host.append(canvas);return new PreviewPlayer(canvas);}
 async function load(){
  pause();const token=++generation;loading=true;current?.dispose();saved?.dispose();current=saved=null;
  const lane=makeLane($('arena-surface'),'arena-canvas');current=lane;
  try{await lane.load(project(),scenario);if(token!==generation)return;await loadReference(token);if(token!==generation)return;resize();seek(Math.min(time,duration()));}
  catch(error){if(token===generation){lane.dispose();current=null;saved?.dispose();saved=null;}throw error;}
  finally{if(token===generation)loading=false;}
 }
 async function loadReference(token=generation){
  saved?.dispose();saved=null;const r=selectedReference(),host=$('arena-reference');host.hidden=!r;host.querySelector('canvas')?.remove();host.querySelector('img')?.remove();
  if(r){host.querySelector('span').textContent=r.name+(r.project?'':' · legacy stills (no sound)');
   if(r.project){const lane=makeLane(host,'arena-reference-canvas');saved=lane;try{await lane.load(r.project,r.scenario,{camera:r.camera,framing:r.framing});}catch(error){lane.dispose();if(saved===lane)saved=null;host.querySelector('span').textContent='Reference could not load: '+error.message;throw error;}if(token!==generation){lane.dispose();return;}}
   else{const img=document.createElement('img');img.alt='Legacy saved frame';host.append(img);}
  }
  setLayout();
 }
 function setLayout(){const r=selectedReference();panel.querySelector('.arena-stage').dataset.layout=r?layout:'single';$('arena-reference').style.opacity=layout==='overlay'?$('arena-mix')?.value??.5:1;resize();}
 function resize(){for(const [lane,id]of [[current,'arena-surface'],[saved,'arena-reference']]){const r=$(id).getBoundingClientRect();if(lane)lane.resize(r.width,r.height);}}
 function matchCamera(lane,definition){if(JSON.stringify(lane.cameraDefinition())!==JSON.stringify(definition))lane.setCamera(definition);}
 function cameras(){if(!current||!saved)return;if(current.scene&&saved.scene){
   if(cameraMode==='current'){current.scene.controls?.update();matchCamera(saved.scene,current.scene.cameraDefinition());}
   else if(cameraMode==='saved'){const camera=selectedReference()?.camera??saved.source.scene3d.camera;matchCamera(current.scene,camera);matchCamera(saved.scene,camera);}
   current.scene.controls.enabled=cameraMode!=='saved';saved.scene.controls.enabled=cameraMode==='independent';
  }else if(!current.scene&&!saved.scene){current.framing=cameraMode==='saved'?(selectedReference()?.framing??saved.framing):current.ownFraming??current.framing;saved.framing=cameraMode==='current'?current.framing:selectedReference()?.framing??saved.ownFraming??saved.framing;}
 }
 function status(){const part=previewSegment(scenario,Math.min(time,scenario.duration)),rows=current?propertyDrivers(current.source,{dimension:scenario.dimension,selected:scenario.subject,clip:part.clip,time:part.time},current.scene):[];$('arena-status').textContent=[...new Set(rows.map(r=>r.owner))].join(' · ');$('arena-time').value=time;$('arena-time').max=duration();$('arena-clock').textContent=time.toFixed(2)+' s';}
 function seek(at,{continuous=false}={}){
  if(!current||loading&& !current.source)return;time=Math.max(0,Math.min(duration(),at));cameras();current.seek(time,{continuous,audible:audible('current')});saved?.seek(time,{continuous,audible:audible('reference')});current.render();saved?.render();
  const r=selectedReference();if(r&&!r.project){const f=r.frames.reduce((a,b)=>Math.abs(b.time-time)<Math.abs(a.time-time)?b:a);$('arena-reference').querySelector('img').src=f.image;}status();
 }
 async function start(){
  if(loading||recording||!current)return;if(time>=duration())seek(0);playing=true;
  await Promise.all([current?.play(audible('current')),saved?.play(audible('reference'))]);last=performance.now();$('arena-play').textContent='Ⅱ Pause';
 }
 async function capture(){
  if(recording||loading||!current)return;pause();recording=true;$('arena-capture').disabled=true;$('arena-capture').textContent='Saving artwork…';
  const snapshot=structuredClone(scenario),camera=current.scene?.cameraDefinition(),framing=current.framing&&structuredClone(current.framing),source=project(),token=generation;
  try{const frozen=await freezeReference(source),id='reference-'+crypto.randomUUID().slice(0,8);if(token!==generation){toast('Reference capture cancelled because the preview changed.');return;}dispatch({op:'preview.reference',value:{version:2,id,name:snapshot.name+' · '+new Date().toLocaleTimeString(),createdAt:new Date().toISOString(),scenario:snapshot,project:frozen,...camera&&{camera},...framing&&{framing}}});reference=id;controls();await loadReference();resize();seek(time);toast('Saved a playable reference with its artwork and sound.');}
  finally{recording=false;$('arena-capture').disabled=false;$('arena-capture').textContent='Save reference';}
 }
 panel.onchange=e=>run(async()=>{
  const el=e.target,id=el.id;
  if(['arena-sound','arena-audio'].includes(id)){current?.pause();saved?.pause();if(playing)await start();return;}
  if(id==='arena-reference-choice'){pause();reference=el.value;const token=++generation;loading=true;try{await loadReference(token);if(token!==generation)return;resize();seek(time);controls();}finally{if(token===generation)loading=false;}return;}
  if(id==='arena-layout'){layout=el.value;setLayout();seek(time);return;}
  if(id==='arena-camera'){cameraMode=el.value;seek(time);return;}
  if(id==='arena-mix'){setLayout();return;}
  if(id==='arena-scenario'){scenario=structuredClone(project().preview.scenarios.find(s=>s.id===el.value));controls();await load();return;}
  if(id==='arena-dimension'){scenario=previewDefaults(project(),{dimension:+el.value});scenario.id='scenario-'+el.value;reference='';save();controls();await load();return;}
  const key=id.slice(6);if(['name','clip','subject','variant'].includes(key))scenario[key]=el.value;else if(key==='duration')scenario.duration=+el.value;else if(key==='ground')scenario.ground.enabled=el.checked;else if(key==='gaze')scenario.gaze.enabled=el.checked;else if(el.dataset.arenaGround)scenario.ground[el.dataset.arenaGround]=+el.value;else return;save();controls();await load();
 });
 panel.oninput=e=>{if(e.target.id==='arena-time'){pause();if(!loading)run(()=>seek(+e.target.value));}if(e.target.id==='arena-mix')setLayout();};
 panel.onclick=e=>run(async()=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.id==='arena-play'){if(playing)pause();else await start();}
  if(b.id==='arena-reset'){pause();seek(0);}
  if(b.id==='arena-capture')await capture();
  if(b.dataset.arenaRemove!==undefined){scenario.events.splice(+b.dataset.arenaRemove,1);save();controls();await load();}
  if(['arena-hit','arena-add-hit'].includes(b.id)){scenario.events.push({id:'event-'+crypto.randomUUID().slice(0,8),time:Math.min(time,scenario.duration-.01),clip:$('arena-hit-clip').value});if(b.id==='arena-add-hit')save();controls();await load();if(b.id==='arena-hit')await start();}
  if(b.id==='arena-delete-reference'){pause();dispatch({op:'preview.removeReference',id:reference});reference='';controls();await loadReference();seek(time);}
 });
 const observer=new ResizeObserver(()=>{if(visible&&!recording&&!loading&&current){resize();run(()=>seek(time));}});observer.observe(panel.querySelector('.arena-stage'));
 const onVisibility=()=>{if(document.hidden)pause();};document.addEventListener('visibilitychange',onVisibility);
 function tick(now){if(disposed)return;if(visible&&!recording&&!loading&&current){try{if(playing){const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;seek(time+dt,{continuous:true});if(time>=duration())pause();}else if(current.scene){cameras();current.render({idle:true});saved?.render({idle:true});}}catch(e){pause();toast(e.message,true);}}raf=requestAnimationFrame(tick);}raf=requestAnimationFrame(tick);
 return{
  async show(){visible=true;panel.hidden=false;const c=context();scenario=structuredClone(project().preview?.scenarios.find(s=>s.dimension===c.dimension)??previewDefaults(project(),c));if(!selectedReference())reference='';controls();await load();},
  hide(){visible=false;panel.hidden=true;pause();generation++;current?.dispose();saved?.dispose();current=saved=null;loading=false;},seek,saveReference:capture,
  runtime:()=>current?.scene,referenceRuntime:()=>saved?.scene,
  snapshot:()=>({time,playing,loading,recording,scenario:structuredClone(scenario),reference,layout,cameraMode,current:current?.snapshot(),saved:saved?.snapshot()}),
  dispose(){disposed=true;generation++;pause();cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',onVisibility);current?.dispose();saved?.dispose();panel.remove();}
 };
}
