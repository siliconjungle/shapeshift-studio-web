import {createLiveAPI} from './api/live.js';
import {createEditorHost} from './api/editor-host.js';
import {connectEditor} from './api/connection.js';
import {trackTask,reportActivityError} from './api/activity.js';
import {downloadFile} from './api/artifacts.js';
import {mountBehaviour} from './authoring/behaviour-editor.js';
import {mountBodyJoins} from './body-join-editor.js';
import {portableProject} from './authoring/project-transfer.js';
import {resolveReference} from './references/catalog.js';
import {createReferenceNavigation} from './references/navigation.js';
import {mountReferences} from './references/picker.js';
import {mountEntities} from './entities/editor.js';
import {mountLibrary} from './authoring/library-editor.js';
import {channelOverrides,finalChannels} from './authoring/resolved-channels.js';
import {mountResolvedEditor} from './authoring/resolved-editor.js';
import {gestureRecorder} from './authoring/recording.js';
import {studioTransport} from './authoring/transport.js';
import {mountCanvasControls} from './authoring/canvas-editor.js';
import {mountSound} from './authoring/sound-editor.js';
import {ClipAudio} from './authoring/sound.js';
const clipAudio=new ClipAudio();
import {mountPreview} from './authoring/preview-editor.js';
import {mountActions} from './authoring/actions-editor.js';
import {mountOwnership} from './authoring/ownership-editor.js';
import {mountBackdrop} from './authoring/backdrop-editor.js';
import {mountTimeline} from './authoring/timeline-editor.js';
import {mountStyles} from './authoring/styles-editor.js';
import {starterProject} from './authoring/starter.js';
import {mountArtwork} from './vector/editor.js';
import {mountGrading} from './grading-editor.js';
import {mountMotionTools} from './motion-tools/editor.js';
import {ghostTimes,cleanToolReferences} from './motion-tools/core.js';
import {reviewSamples} from './motion-tools/review.js';
import {mountWorkspace} from './workspace-shell.js';
import {installCanvasNavigation} from './canvas-navigation.js';
import {lightingFrame} from './lighting-2d.js';
import {lightingFields,hexRGB} from './scene3d/lighting-editor.js';
import {sampleLighting2D,lightPreset2D} from './lighting-state.js';
import {coloringDefaults,LIGHT_CHANNELS} from './scene3d/core/lighting-definition.js';
import {mountVirtualRows} from './virtual-rows.js';
import {mountScene3D} from './scene3d/editor.js';
import {presentationTime} from './fx/presentation.js';
import {easeNames} from './fx/math.js';
import {mountFX} from './fx/editor.js';
import {applyCommand,capabilities} from './fx/commands.js';
import {renderFrame,presentationAt,animationTime} from './runtime.js';
import {frameCamera} from './fx/render.js';
import {FORMAT,CHANNELS,identity,clone,clamp,point,inverse,matrix,poseAt,enableIK,setKey,sampleTrack,moveOrigin,removeJoint,validateProject,loadImages,drawPuppet,bounds,motionBounds,createPlayer} from './runtime.js';
import {ProjectStore} from './store.js';
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const canvas=$('canvas'),ctx=canvas.getContext('2d');
let fxEditor,scene3dEditor,workspace,resolved,liveAPI;
const overrideContext2=()=>({dimension:2,clip:ui.clip,selected:ui.selected,time:ui.time,mode:ui.mode});
const overrides2=()=>ui.mode==='animate'?channelOverrides.values(overrideContext2()):[];
let store,images=new Map(),imageSignature='',imageGeneration=0,pendingImages=null,saveTimer,toastTimer,db;
const ui={tree:'joints',selected:'head',clip:'idle',time:0,mode:'animate',tool:'move',playing:false,bones:true,onion:false,zoom:1,pan:{x:0,y:0},width:1,height:1,dirty:true,space:false,key:null,drag:null};
const project=()=>store.project,clip=()=>project().clips.find(c=>c.id===ui.clip)??project().clips[0],joint=()=>project().joints.find(j=>j.id===ui.selected),snap=t=>clamp(Math.round(t*clip().fps)/clip().fps,0,clip().duration);
function toast(message,error=false){if(error)reportActivityError(message);$('toast').textContent=message;$('toast').classList.toggle('error',error);$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),5000);}
function guard(fn){return trackTask((async()=>{try{return await fn();}catch(e){console.error(e);toast(e.message??String(e),true);}})());}
function requestDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('puppet-studio',1);r.onupgradeneeded=()=>r.result.createObjectStore('projects');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function readSaved(){db=await requestDB();return new Promise((resolve,reject)=>{const r=db.transaction('projects').objectStore('projects').get('current');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
let deviceSaveGeneration=0;
function saveToDevice(){
 const generation=++deviceSaveGeneration;clearTimeout(saveTimer);saveTimer=null;
 try{if(!db||!store)throw Error('Storage unavailable');const tx=db.transaction('projects','readwrite');
  // A pending gesture is a preview; persist its committed baseline until release.
  tx.objectStore('projects').put(clone(store.pending??project()),'current');
  tx.oncomplete=()=>{if(generation===deviceSaveGeneration&&!saveTimer)$('save-status').textContent='Saved on this device';};
  tx.onerror=()=>{$('save-status').textContent='Autosave unavailable — save a project file';};
 }catch{$('save-status').textContent='Autosave unavailable — save a project file';}
}
function autosave(){deviceSaveGeneration++;clearTimeout(saveTimer);$('save-status').textContent='Saving on this device…';saveTimer=setTimeout(saveToDevice,250);}
window.addEventListener('pagehide',()=>{if(store&&db&&saveTimer)saveToDevice();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&store&&db&&saveTimer)saveToDevice();});

async function refreshImages(){const signature=JSON.stringify([project().appearance,project().assets,[...(project().fx?.models??[]),...project().clips.flatMap(c=>c.fx?.models??[])].map(({id,src,mtl,format,width,height})=>({id,src,mtl,format,width,height})),[...(project().fx?.emitters??[]),...project().clips.flatMap(c=>c.fx?.emitters??[])].map(e=>e.contour)]);if(signature===imageSignature)return;if(pendingImages?.signature===signature)return pendingImages.promise;const generation=++imageGeneration,p=clone(project()),promise=loadImages(p).then(loaded=>{if(generation===imageGeneration){for(const draw of images.models?.values()??[])draw.dispose?.();images=loaded;imageSignature=signature;ui.dirty=true;}else for(const draw of loaded.models?.values()??[])draw.dispose?.();}).finally(()=>{if(pendingImages?.signature===signature)pendingImages=null;});pendingImages={signature,promise};return promise;}
function changed(reason,change){
  liveAPI?.notify(reason,change);
  ui.dirty=true;ui.motionArc=null;if(reason==='preview')return;
  if(!joint())ui.selected=project().joints[0]?.id;
  if(!project().clips.some(c=>c.id===ui.clip))ui.clip=project().clips[0].id;
  ui.time=clamp(ui.time,0,clip().duration);
  const scopes=new Set(change?.scopes??['joints','clips','assets','fx','entityDefinitions','scene3d','name','source']);
  if(['joints','clips','assets','fx','name','source'].some(k=>scopes.has(k)))renderUI();
  $('undo').disabled=!store.undoStack.length;$('redo').disabled=!store.redoStack.length;
  if(!change||change.scene3d)trackTask(scene3dEditor?.refresh(change?.scene3d));
  if(scopes.has('assets')||scopes.has('appearance')||scopes.has('fx')||scopes.has('clips'))guard(refreshImages);autosave();
}
function edit(fn){guard(()=>store.edit(fn));}
function clearOverrides(dimension){for(const [key,t]of channelOverrides.entries)if(!dimension||t.dimension===dimension)channelOverrides.entries.delete(key);channelOverrides.revision++;ui.dirty=true;const r=scene3dEditor?.runtime();if(r)r.setChannelOverrides([...channelOverrides.entries.values()].filter(t=>t.dimension===3));}
let activeReferenceNavigation=null;
function replaceProject(value){store.replace(value);activeReferenceNavigation?.clear();clearOverrides();}
function pause(){clipAudio.stop();ui.playing=false;$('play').textContent='▶';}
function select(id){ui.selected=id;fxEditor?.refresh();ui.key=null;ui.dirty=true;renderHierarchy();renderInspector();renderTimeline();hierarchyWindow?.reveal((ui.tree==='layers'?[...project().joints].filter(j=>j.sprite).sort((a,b)=>b.layer-a.layer):store.graph.rows()).findIndex(j=>j.id===id));timelineWindow?.reveal(project().joints.findIndex(j=>j.id===id));}
function setTime(t,quantize=true){ui.time=quantize?snap(t):clamp(t,0,clip().duration);ui.dirty=true;updateTime();renderInspector();}
function motionTime(){return animationTime(clip(),ui.time);}
function activePose(){return poseAt(project(),ui.mode==='animate'?clip():null,ui.mode==='animate'?animationTime(clip(),ui.time):ui.time,{overrides:overrides2()});}
function fit(){const b=motionBounds(project(),ui.mode==='animate'?clip():null);ui.zoom=Math.min(ui.width/(b.maxX-b.minX+170),ui.height/(b.maxY-b.minY+110));ui.zoom=clamp(ui.zoom,.1,6);ui.pan={x:-(b.minX+b.maxX)/2*ui.zoom,y:-(b.minY+b.maxY)/2*ui.zoom};ui.dirty=true;updateTime();}
function camera(){return [ui.zoom,0,0,ui.zoom,ui.width/2+ui.pan.x,ui.height/2+ui.pan.y];}
function localMouse(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function worldMouse(e){return point(inverse(frameCamera(camera(),ui.mode==='animate'?presentationAt(clip(),ui.time):{x:0,y:0,rotation:0,scale:1},ui.width,ui.height)),localMouse(e));}
let hierarchyWindow,timelineWindow,assetWindow;
function renderHierarchy(){
  $('joint-count').textContent=project().joints.length;
  $('tree-joints').classList.toggle('active',ui.tree==='joints');$('tree-layers').classList.toggle('active',ui.tree==='layers');
  if(!hierarchyWindow)hierarchyWindow=mountVirtualRows($('hierarchy'),{rowHeight:34,render:row=>{const j=project().joints.find(j=>j.id===row.id);return `<button ${ui.tree==='layers'?`draggable="true" data-layer-joint="${esc(j.id)}"`:''} data-joint="${esc(j.id)}" class="joint-row ${j.id===ui.selected?'active':''} ${j.hidden?'hidden':''}" style="padding-left:${8+row.depth*13}px"><span class="joint-dot">${ui.tree==='layers'?'⠿':j.sprite?'◆':'○'}</span><span>${esc(j.name)}</span><span class="visibility">${ui.tree==='layers'?j.layer:j.hidden?'−':''}</span></button>`;}});
  const rows=ui.tree==='layers'?[...project().joints].filter(j=>j.sprite).sort((a,b)=>b.layer-a.layer).map(j=>({id:j.id,depth:0})):store.graph.rows('2d');
  hierarchyWindow.set(rows,{header:ui.tree==='layers'?'<div class="layer-caption" style="height:24px">FRONT · drag pieces to reorder</div>':'',footer:ui.tree==='layers'?'<div class="layer-caption" style="height:24px">BACK</div>':'',top:ui.tree==='layers'?24:0,bottom:ui.tree==='layers'?24:0});
}
function numberField(label,path,value,{step=.1,min,max}={}){return `<label class="field">${label}<input type="number" data-field="${path}" value="${Number(value.toFixed(3))}" step="${step}" ${min!==undefined?`min="${min}"`:''} ${max!==undefined?`max="${max}"`:''}></label>`;}
function puppetLightingFields(j){
 const sampled=ui.mode==='animate'?sampleLighting2D(project(),clip(),motionTime(),overrides2()).get(j.id):j;
 const fields=lightingFields(sampled,(label,path,value)=>numberField(label,path,value)).replaceAll('data-field=', 'data-light-field=').replaceAll('data-rgb=', 'data-light-rgb=').replaceAll('s3-coloring-enable','puppet-coloring-enable').replaceAll('metres','pixels').replaceAll('node','joint').replace(/<label>Glow face<select[\s\S]*?<\/label>/,'');
 const keys=(clip().lightingTracks??[]).filter(t=>t.node===j.id).flatMap(t=>t.keys.map(k=>`<button data-light-key="${t.channel}" data-light-time="${k.time}" title="Remove this light key">${t.channel} · ${k.time.toFixed(2)}s ×</button>`)).join('');
 return `<div class="property-section"><h3>LIGHT & COLOUR</h3><label class="field">Night preview<input id="puppet-night" type="range" min="0" max="1" step=".01" value="${project().lighting?.night??0}"></label><label class="field">Environment light colour<input id="puppet-light-color" type="color" value="${project().lighting?.lightColor??'#f0bf4b'}"></label>${fields}<p class="hint">Reach and attachment offsets use pixels. In Animate mode, changes to colour, brightness, reach or offset add a key at the playhead.</p>${keys}</div>`;
}
function changePuppetLighting(path,value){
 if(resolved?.edit(overrideContext2(),path,value))return;
 const source=sampleLighting2D(project(),clip(),motionTime(),overrides2()).get(joint().id),next=structuredClone(source),parts=path.split('.');let target=next;for(const k of parts.slice(0,-1))target=target[k];target[parts.at(-1)]=value;
 const channel=LIGHT_CHANNELS.find(c=>path===c||path.startsWith(c+'.'));
 edit(p=>{if(ui.mode==='animate'&&channel)applyCommand(p,{op:'lighting.key',joint:joint().id,clip:ui.clip,time:motionTime(),channel,value:channel.split('.').reduce((v,k)=>v[k],next)});else applyCommand(p,{op:'lighting.node',joint:joint().id,values:{[parts[0]]:next[parts[0]]}});});
}
function renderInspector(){
  const j=joint();if(!j){$('inspector').innerHTML='<p class="empty">Select a joint on the stage.</p>';return;}
  const ik=clip().ik?.[j.id],canIK=!!project().joints.find(n=>n.id===project().joints.find(n=>n.id===j.parent)?.parent)?.parent;
  const animated=ui.mode==='animate',t=animated?{...sampleTrack(clip().tracks[j.id],motionTime()),...Object.fromEntries(finalChannels(clip(),motionTime(),overrides2()).filter(o=>o.node===j.id&&CHANNELS.includes(o.channel)).map(o=>[o.channel,o.value]))}:j.rest,s=j.sprite,atKey=clip().tracks[j.id]?.find(k=>Math.abs(k.time-motionTime())<.00001);
  $('inspector').innerHTML=`<div class="inspector-title"><strong>${esc(j.name)}</strong><small>${esc(j.id)}</small>${animated?`<div class="key-tag">${atKey?'◆ Keyframe':'◇ Interpolated pose'} · ${ui.time.toFixed(2)}s</div>`:'<div class="key-tag">Rest pose · affects every animation</div>'}</div>
+<div class="property-section"><h3>${animated?(ik?'IK TARGET OFFSET':'POSE OFFSET'):'JOINT TRANSFORM'}</h3><div class="field-grid">${numberField('Position X','x',t.x)}${numberField('Position Y','y',t.y)}${numberField('Rotation °','rotation',t.rotation,{step:1})}${numberField('Draw order','layer',j.layer,{step:1})}${numberField('Scale X','scaleX',t.scaleX,{step:.05,...(animated?{min:.01}:{})})}${numberField('Scale Y','scaleY',t.scaleY,{step:.05,...(animated?{min:.01}:{})})}</div><div class="button-row"><button id="layer-forward" title="Move in front of the next piece">Forward ↑</button><button id="layer-back" title="Move behind the next piece">Back ↓</button></div><div class="button-row"><button id="layer-front">To front</button><button id="layer-bottom">To back</button></div><div class="button-row"><button id="flip-x" title="Mirror this joint and its children across its local X axis">Flip horizontal</button><button id="flip-y" title="Mirror this joint and its children across its local Y axis">Flip vertical</button></div><div class="button-row"><button id="reset-transform">${animated?'Reset pose':'Reset rotation / scale'}</button><button id="toggle-visible">${j.hidden?'Show piece':'Hide piece'}</button></div>${animated?'<p class="hint">Offsets are relative to the rig. Changing a value adds a key at the playhead.</p>':''}</div>
+${s?`<div class="property-section"><h3>ARTWORK & ORIGIN</h3><div class="field-grid">${numberField('Image width','sprite.width',s.width,{min:1})}${numberField('Image height','sprite.height',s.height,{min:1})}${numberField('Origin X %','sprite.pivotX',s.pivotX*100,{step:1})}${numberField('Origin Y %','sprite.pivotY',s.pivotY*100,{step:1})}</div><div class="button-row"><button id="edit-source-art">Edit artwork</button><button id="replace-art">Replace art</button></div><p class="hint">Artwork settings belong to the rig. Origin changes keep the rest artwork in place. Use <kbd>P</kbd> to drag the origin.</p></div>`:''}
+${puppetLightingFields(j)}
+${animated&&canIK?`<div class="property-section"><h3>CONNECTED MOVEMENT</h3><div class="button-row"><button id="toggle-ik" class="${ik?'active':''}">${ik?'✓ IK connected':'Enable two-bone IK'}</button></div>${ik?`<div class="field-grid" style="margin-top:10px"><label class="field">Elbow direction<select id="ik-bend"><option value="1" ${ik.bend===1?'selected':''}>Bend left</option><option value="-1" ${ik.bend===-1?'selected':''}>Bend right</option></select></label><label class="field">Max stretch<input id="ik-stretch" type="number" min="1" max="2" step=".05" value="${ik.stretch}"></label></div><p class="hint">Drag this endpoint with Move or IK. The parent joints rotate to reach it. Stretch 1 locks length; 1.2 allows 20% extra reach. Target keys solve at every animation frame.</p>`:'<p class="hint">Uses the parent and grandparent as a two-bone chain. For arms, select a wrist.</p>'}</div>`:''}
+${animated?`<div class="property-section"><h3>MOTION EFFECTS</h3><div class="button-row"><button id="motion-effects">Dynamic effects & presets</button></div><p class="hint">${(clip().effects??[]).filter(e=>e.joint===j.id).length} effects on this joint · layered over keyframes</p></div>`:''}
+${animated?`<div class="property-section"><h3>KEYFRAME</h3><label class="field">Interpolation to next key<select id="easing"><option value="smooth" ${atKey?.easing==='smooth'?'selected':''}>Smooth</option><option value="linear" ${atKey?.easing==='linear'?'selected':''}>Linear</option><option value="step" ${atKey?.easing==='step'?'selected':''}>Hold / step</option>${easeNames.filter(n=>!['smooth','linear','step'].includes(n)).map(n=>`<option value="${n}" ${atKey?.easing===n?'selected':''}>${n}</option>`).join('')}</select></label><div class="button-row"><button id="copy-pose">Copy pose</button><button id="paste-pose">Paste pose</button><button id="delete-key" ${!atKey?'disabled':''}>Delete key</button></div></div>`:''}
+<div class="property-section"><h3>JOINT</h3><label class="field">Display name<input id="joint-name" value="${esc(j.name)}" maxlength="100"></label><p class="hint">Animation binding: <strong>${esc(j.id)}</strong><br></p><label class="field">Parent<select id="joint-parent"><option value="">Stage</option>${project().joints.filter(n=>n.id!==j.id).map(n=>`<option value="${esc(n.id)}" ${j.parent===n.id?'selected':''}>${esc(n.name)}</option>`).join('')}</select></label><div class="button-row">${!s?'<button id="replace-art">Attach image</button>':''}<button id="rename-joint">Rename binding</button><button id="delete-joint" class="danger" ${j.id==='root'?'disabled':''}>Delete joint</button></div></div>`.replace(/^\+/gm,'');
}
function renderTimeline(){
  const c=clip();$('clip').innerHTML=project().clips.map(c=>`<option value="${esc(c.id)}" ${c.id===ui.clip?'selected':''}>${esc(c.name)}</option>`).join('');
  const ticks=Array.from({length:11},(_,i)=>`<span class="tick" style="left:${i*10}%">${(i*c.duration/10).toFixed(1)}</span>`).join('');
  const row=(j)=>`<div class="timeline-row ${j.id===ui.selected?'selected':''}"><div class="track-label" tabindex="0" data-select="${esc(j.id)}">${esc(j.name)}</div><div class="track" data-track="${esc(j.id)}">${(c.tracks[j.id]??[]).map(k=>`<button class="key ${j.id===ui.selected&&Math.abs(k.time-motionTime())<.00001?'selected':''}" data-key="${esc(j.id)}" data-time="${k.time}" style="left:${presentationTime(c,k.time)/c.duration*100}%" aria-label="${esc(j.name)} key at ${k.time.toFixed(2)} seconds" title="${k.time.toFixed(2)}s · ${k.easing}"></button>`).join('')}</div></div>`;
  $('timeline-grid').classList.add('timeline-grid');
  if(!timelineWindow)timelineWindow=mountVirtualRows($('timeline-grid'),{scroller:$('timeline-scroll'),rowHeight:26,render:j=>timelineWindow.renderRow(j),onRendered:updateTime});
  timelineWindow.renderRow=row;
  timelineWindow.set(project().joints,{header:`<div class="timeline-row ruler"><div class="track-label">CHANNEL / JOINT</div><div class="track" data-track="ruler">${ticks}</div></div>${(c.cues??[]).length?`<div class="timeline-row presentation-track"><div class="track-label">✦ Presentation</div><div class="track">${c.cues.map(q=>`<button class="presentation-cue" data-presentation="${esc(q.id)}" style="left:${q.time/c.duration*100}%;width:${Math.min(q.duration,c.duration-q.time)/c.duration*100}%">${esc(q.type)}</button>`).join('')}</div></div>`:''}`,footer:'<div class="playhead" id="playhead"></div>',top:26+((c.cues??[]).length?26:0)});
  $('key-count').textContent=Object.values(c.tracks).reduce((n,keys)=>n+keys.length,0)+' keyframes';$('timeline-info').textContent=`${c.fps} FPS · ${c.loop?'LOOP':'ONCE'}`;updateTime();
}
function updateTime(){
  fxEditor?.clock();const c=clip();$('time-label').textContent=`${ui.time.toFixed(2)} / ${c.duration.toFixed(2)} s`;$('zoom-label').textContent=Math.round(ui.zoom*100)+'%';
  const track=document.querySelector('.ruler .track'),head=$('playhead');if(track&&head)head.style.left=track.offsetLeft+ui.time/c.duration*track.clientWidth+'px';
}
function renderUI(){
  $('project-name').value=project().name;$('character-name').textContent=project().source?.asset?project().name:project().source?characters.find(c=>c.id===project().source.character)?.label??'Custom puppet':'Custom puppet';$('character-detail').textContent=(project().source?.view??(project().source?.asset?'Object':'Custom rig'))+' · '+project().joints.length+' joints';
  $('undo').disabled=!store.undoStack.length;$('redo').disabled=!store.redoStack.length;
  for(const mode of ['animate','rig'])$('mode-'+mode).classList.toggle('active',ui.mode===mode);
  $('mode-hint').textContent=ui.mode==='rig'?'Changes apply to every frame':'Changes create keyframes';$('stage-mode').textContent=ui.mode==='rig'?'RIG SETUP':'ANIMATION';
  document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===ui.tool));
  $('onion').classList.toggle('active',ui.onion);$('bones').classList.toggle('active',ui.bones);
  $('stage-caption').textContent=ui.tool==='pivot'?'Drag an origin · artwork and children stay in place in the rest pose':ui.tool==='rotate'?'Drag around the selected joint to rotate · Shift snaps to 15°':ui.tool==='ik'?'Drag a wrist: the elbow bends and the shoulder rotates to reach it':ui.tool==='scale'?'Drag corners to resize · side handles adjust width or height':'Drag a joint to pose it · two fingers to pan · pinch to zoom';
  renderHierarchy();renderInspector();renderTimeline();fxEditor?.refresh();
}
function pieceHandles(){
  const j=joint();if(!j?.sprite)return [];const s=j.sprite,m=activePose().get(j.id).world,handles=[];
  for(const [u,v,axis]of [[0,0,'both'],[1,0,'both'],[1,1,'both'],[0,1,'both'],[0,.5,'x'],[1,.5,'x'],[.5,0,'y'],[.5,1,'y']])handles.push({...point(m,{x:(u-s.pivotX)*s.width,y:(v-s.pivotY)*s.height}),tool:'scale',axis});
  const top=point(m,{x:(.5-s.pivotX)*s.width,y:-s.pivotY*s.height}),center=point(m,{x:(.5-s.pivotX)*s.width,y:(.5-s.pivotY)*s.height}),len=Math.hypot(top.x-center.x,top.y-center.y)||1;
  handles.push({x:top.x+(top.x-center.x)/len*28/ui.zoom,y:top.y+(top.y-center.y)/len*28/ui.zoom,tool:'rotate',top});return handles;
}
function hitHandle(world){if(ui.tool==='pivot'||ui.tool==='ik')return null;const selected=joint(),m=selected?activePose().get(selected.id).world:null;if(ui.tool==='move'&&m&&Math.hypot(m[4]-world.x,m[5]-world.y)<12/ui.zoom)return null;return pieceHandles().find(h=>Math.hypot(h.x-world.x,h.y-world.y)<9/ui.zoom);}
function draw(){
  const dpr=Math.min(devicePixelRatio,2);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,ui.width,ui.height);
  const cam=frameCamera(camera(),ui.mode==='animate'?presentationAt(clip(),ui.time):{x:0,y:0,rotation:0,scale:1},ui.width,ui.height);const spacing=clamp(30*ui.zoom,12,80);ctx.fillStyle='#626262';for(let x=(cam[4]%spacing+spacing)%spacing;x<ui.width;x+=spacing)for(let y=(cam[5]%spacing+spacing)%spacing;y<ui.height;y+=spacing){ctx.beginPath();ctx.arc(x,y,.65,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.transform(...cam);ctx.lineWidth=1/ui.zoom;ctx.strokeStyle='#89898944';ctx.beginPath();ctx.moveTo(-ui.width/ui.zoom,0);ctx.lineTo(ui.width/ui.zoom,0);ctx.stroke();
  ctx.fillStyle='#0b121338';ctx.beginPath();ctx.ellipse(0,1,115,12,0,0,Math.PI*2);ctx.fill();
  const pose=activePose();if(ui.onion&&ui.mode==='animate'){for(const t of ghostTimes(clip(),ui.time,{mode:'keys'}))drawPuppet(ctx,project(),images,poseAt(project(),clip(),t),{alpha:.13});}
  ctx.restore();ctx.drawImage(renderFrame(project(),images,ui.mode==='animate'?clip():null,ui.time,{width:ui.width,height:ui.height,camera:camera(),overrides:overrides2()}),0,0);ctx.save();ctx.transform(...cam);
  if(ui.motionArc?.joint===ui.selected){ctx.strokeStyle='#efc787';ctx.fillStyle='#d6eabf';ctx.lineWidth=1.5/ui.zoom;ctx.beginPath();for(const p of ui.motionArc.points)ctx.lineTo(p[0],p[1]);ctx.stroke();for(const p of ui.motionArc.points){ctx.beginPath();ctx.arc(p[0],p[1],2.5/ui.zoom,0,Math.PI*2);ctx.fill();}}
  for(const p of pose.values())if(p.contactTarget){ctx.strokeStyle='#f3bc73';ctx.lineWidth=1.5/ui.zoom;const t=p.contactTarget;ctx.strokeRect(t.x-5/ui.zoom,t.y-5/ui.zoom,10/ui.zoom,10/ui.zoom);}
  if(ui.bones){for(const j of project().joints){const p=point(pose.get(j.id).world,{x:0,y:0});if(j.parent){const parent=point(pose.get(j.parent).world,{x:0,y:0});ctx.strokeStyle='#adc9f26b';ctx.setLineDash([3/ui.zoom,4/ui.zoom]);ctx.beginPath();ctx.moveTo(parent.x,parent.y);ctx.lineTo(p.x,p.y);ctx.stroke();}ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.x,p.y,(j.id===ui.selected?5:3.2)/ui.zoom,0,Math.PI*2);ctx.fillStyle=j.id===ui.selected?'#8cbbff':'#30343b';ctx.fill();ctx.strokeStyle='#8cbbffbb';ctx.stroke();}}
  const j=joint();if(j){const m=pose.get(j.id).world,p=point(m,{x:0,y:0});if(j.sprite){const s=j.sprite;ctx.save();ctx.transform(...m);ctx.strokeStyle='#8cbbff99';ctx.setLineDash([4/ui.zoom,4/ui.zoom]);ctx.lineWidth=1/ui.zoom;ctx.strokeRect(-s.pivotX*s.width,-s.pivotY*s.height,s.width,s.height);ctx.restore();}
    ctx.lineWidth=1.4/ui.zoom;ctx.strokeStyle=ui.tool==='pivot'?'#c5b1ff':'#8cbbff';ctx.beginPath();ctx.arc(p.x,p.y,(ui.tool==='rotate'?42:10)/ui.zoom,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x-15/ui.zoom,p.y);ctx.lineTo(p.x+15/ui.zoom,p.y);ctx.moveTo(p.x,p.y-15/ui.zoom);ctx.lineTo(p.x,p.y+15/ui.zoom);ctx.stroke();}
  if(ui.tool!=='pivot'&&ui.tool!=='ik')for(const h of pieceHandles()){
    ctx.lineWidth=1.2/ui.zoom;ctx.strokeStyle='#b4d4ff';ctx.fillStyle='#30343b';
    if(h.tool==='rotate'){ctx.beginPath();ctx.moveTo(h.top.x,h.top.y);ctx.lineTo(h.x,h.y);ctx.stroke();ctx.beginPath();ctx.arc(h.x,h.y,5/ui.zoom,0,Math.PI*2);ctx.fill();ctx.stroke();}
    else{ctx.beginPath();ctx.rect(h.x-3.5/ui.zoom,h.y-3.5/ui.zoom,7/ui.zoom,7/ui.zoom);ctx.fill();ctx.stroke();}
  }
  if(ui.mode==='animate')for(const [endId,chain]of Object.entries(clip().ik??{})){const target=pose.get(endId)?.ikTarget;if(!target)continue;ctx.strokeStyle='#d4b8ff';ctx.lineWidth=1.5/ui.zoom;ctx.beginPath();ctx.arc(target.x,target.y,8/ui.zoom,0,Math.PI*2);ctx.moveTo(target.x-12/ui.zoom,target.y);ctx.lineTo(target.x+12/ui.zoom,target.y);ctx.moveTo(target.x,target.y-12/ui.zoom);ctx.lineTo(target.x,target.y+12/ui.zoom);ctx.stroke();}
  ctx.restore();ui.dirty=false;
}
function pick(world){
  const pose=activePose();if(ui.mode==='animate')for(const [id,p]of pose)if(p.ikTarget&&Math.hypot(p.ikTarget.x-world.x,p.ikTarget.y-world.y)<12/ui.zoom)return id;if(ui.bones){let best=null,distance=12/ui.zoom;for(const j of project().joints){const p=point(pose.get(j.id).world,{x:0,y:0}),d=Math.hypot(p.x-world.x,p.y-world.y);if(d<distance){best=j.id;distance=d;}}if(best)return best;}
  for(const j of [...project().joints].sort((a,b)=>b.layer-a.layer)){if(!j.sprite||j.hidden)continue;const p=point(inverse(pose.get(j.id).world),world),s=j.sprite;if(p.x>=-s.width*s.pivotX&&p.x<=s.width*(1-s.pivotX)&&p.y>=-s.height*s.pivotY&&p.y<=s.height*(1-s.pivotY))return j.id;}
  return null;
}
function keyValue(p,id,time,value,easing='smooth'){
  time=animationTime(p.clips.find(c=>c.id===ui.clip),time);
  const c=p.clips.find(c=>c.id===ui.clip)??p.clips[0];if(!c.tracks[id]?.length&&time>0)setKey(c,id,0,identity());setKey(c,id,time,value,easing);
}
function poseKey(all=false){pause();if(ui.mode==='rig')setMode('animate');edit(p=>{for(const j of all?p.joints:[joint()])if(j)keyValue(p,j.id,ui.time,sampleTrack(clip().tracks[j.id],motionTime()));});}
function setMode(mode){pause();ui.mode=mode;if(mode==='animate'&&ui.tool==='pivot')ui.tool='move';ui.dirty=true;renderUI();}
function setTool(tool){if(tool==='ik'&&ui.mode==='rig')setMode('animate');if(tool==='pivot')setMode('rig');ui.tool=tool;ui.dirty=true;renderUI();}
canvas.addEventListener('pointerdown',e=>guard(()=>{
  if(e.button!==0&&e.button!==1)return;e.preventDefault();pause();if(gestureRecorder.armed&&ui.tool!=='pivot'&&ui.mode!=='animate')setMode('animate');canvas.setPointerCapture(e.pointerId);
  const mouse=localMouse(e);if(ui.space||e.button===1){ui.drag={kind:'pan',start:mouse,pan:{...ui.pan}};return;}
  const world=worldMouse(e),handle=hitHandle(world),picked=pick(world);
  if(handle){ui.tool=handle.tool;renderUI();}
  // Rotate/scale may begin outside the artwork around the selected origin.
  if(!handle&&(ui.tool==='move'||ui.tool==='pivot'||ui.tool==='ik')){if(picked)select(picked);else return;}
  const j=joint();if(!j)return;
  if(ui.tool==='ik'&&!clip().ik?.[j.id])store.edit(p=>enableIK(p,p.clips.find(c=>c.id===ui.clip),j.id,motionTime(),{bend:j.id.endsWith('_r')?-1:1}));
  const controlled=['move','ik'].includes(ui.tool)?['x','y']:ui.tool==='rotate'?['rotation']:ui.tool==='scale'?['scaleX','scaleY']:[],overridden=ui.mode==='animate'&&controlled.some(k=>resolved?.isControlled(overrideContext2(),k)),overrideDrags=overridden?controlled.map(channel=>resolved.beginGesture(overrideContext2(),{channel,kind:'transform'},true)):null;
  const pose=activePose(),m=pose.get(j.id).world,ik=ui.mode==='animate'&&!overridden?clip().ik?.[j.id]:null,ikParent=ik?project().joints.find(n=>n.id===ik.root).parent:null,parent=ik?pose.get(ikParent).world:j.parent?pose.get(j.parent).world:[1,0,0,1,0,0];
  if(!overridden)store.begin();if(!overridden&&ui.tool!=='pivot'&&gestureRecorder.begin({dimension:2,clip:ui.clip,time:ui.time,duration:clip().duration,fps:clip().fps,cues:clip().cues}))gestureRecorder.capture([{op:'key',clip:ui.clip,joint:j.id,value:sampleTrack(clip().tracks[j.id],motionTime())}]);ui.drag={kind:'joint',overrideDrags,axis:handle?.axis??'both',tool:ui.tool,ik:!!ik,before:clone(project()),id:j.id,start:world,parent,world:m,base:overridden?clone(pose.get(j.id).transform):ui.mode==='rig'?clone(j.rest):sampleTrack(clip().tracks[j.id],motionTime()),moved:false};
}));
canvas.addEventListener('pointermove',e=>guard(()=>{
  const d=ui.drag;if(!d)return;
  if(d.kind==='pan'){const m=localMouse(e);ui.pan={x:d.pan.x+m.x-d.start.x,y:d.pan.y+m.y-d.start.y};ui.dirty=true;return;}
  const world=worldMouse(e),a=point(inverse(d.parent),d.start),b=point(inverse(d.parent),world),old=d.before.joints.find(j=>j.id===d.id);let dx=b.x-a.x,dy=b.y-a.y;
  if(Math.hypot(world.x-d.start.x,world.y-d.start.y)*ui.zoom<2&&!d.moved)return;d.moved=true;
  const applyDrag=p=>{
    const j=p.joints.find(j=>j.id===d.id),value={...d.base};
    if(ui.tool==='pivot'){const localA=point(inverse(d.world),d.start),localB=point(inverse(d.world),world);moveOrigin(p,j.id,{x:localB.x-localA.x,y:localB.y-localA.y});return;}
    if(ui.tool==='move'||ui.tool==='ik'){if(e.shiftKey){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0;}value.x+=dx;value.y+=dy;}
    if(ui.tool==='rotate'){
      const center=point(inverse(d.parent),point(d.world,{x:0,y:0}));let delta=(Math.atan2(b.y-center.y,b.x-center.x)-Math.atan2(a.y-center.y,a.x-center.x))*180/Math.PI;delta=((delta+540)%360)-180;value.rotation+=delta;if(e.shiftKey)value.rotation=Math.round(value.rotation/15)*15;
    }
    if(ui.tool==='scale'){const center=point(d.world,{x:0,y:0}),ratio=clamp(Math.hypot(world.x-center.x,world.y-center.y)/Math.max(10/ui.zoom,Math.hypot(d.start.x-center.x,d.start.y-center.y)),.05,20),la=point(inverse(d.world),d.start),lb=point(inverse(d.world),world),rx=d.axis==='x'?clamp(lb.x/(Math.abs(la.x)<.01?.01:la.x),.05,20):ratio,ry=d.axis==='y'?clamp(lb.y/(Math.abs(la.y)<.01?.01:la.y),.05,20):ratio;if(d.axis!=='y')value.scaleX=Math.sign(value.scaleX)*Math.max(.01,Math.abs(value.scaleX)*rx);if(d.axis!=='x')value.scaleY=Math.sign(value.scaleY)*Math.max(.01,Math.abs(value.scaleY)*ry);}
    if(d.overrideDrags){for(const t of d.overrideDrags)resolved.set(t.context,t.channel,value[t.channel]);return;}
    if(ui.mode==='rig')j.rest=value;else if(gestureRecorder.take){const commands=gestureRecorder.capture([{op:'key',clip:ui.clip,joint:j.id,value}]);for(const c of commands)applyCommand(p,c);ui.time=gestureRecorder.at();}else keyValue(p,j.id,ui.time,value);
  };if(d.overrideDrags)applyDrag(d.before);else{store.project=clone(d.before);store.preview(applyDrag);}
}));
function finishDrag(cancel=false){if(ui.drag?.kind==='joint'){if(ui.drag.overrideDrags){if(cancel||!ui.drag.moved)for(const t of ui.drag.overrideDrags)resolved.cancelGesture(t);else resolved.show(ui.drag.overrideDrags[0].channel);}else if(cancel||!ui.drag.moved){const recording=gestureRecorder.cancel();if(recording)ui.time=recording.time;store.cancel();if(recording)updateTime();}else guard(()=>{const take=gestureRecorder.finish();if(take)store.preview(p=>applyCommand(p,take));store.commit();});}ui.drag=null;ui.dirty=true;}
canvas.addEventListener('pointerup',()=>finishDrag());canvas.addEventListener('pointercancel',()=>finishDrag(true));canvas.addEventListener('lostpointercapture',()=>{if(ui.drag)finishDrag(true);});
installCanvasNavigation(canvas,{start:()=>{finishDrag(true);pause();},transform:({from,to,scale})=>{const w=point(inverse(camera()),from);ui.zoom=clamp(ui.zoom*scale,.08,12);ui.pan={x:to.x-ui.width/2-w.x*ui.zoom,y:to.y-ui.height/2-w.y*ui.zoom};ui.dirty=true;updateTime();}});
$('hierarchy').addEventListener('click',e=>{const b=e.target.closest('[data-joint]');if(b)select(b.dataset.joint);});
function reorderLayer(id,direction,targetId=null){
  edit(p=>{const order=[...p.joints].sort((a,b)=>a.layer-b.layer),from=order.findIndex(j=>j.id===id);if(from<0)return;const [item]=order.splice(from,1);let to=direction==='front'?order.length:direction==='bottom'?0:direction==='forward'?Math.min(order.length,from+1):Math.max(0,from-1);if(targetId){const target=order.findIndex(j=>j.id===targetId);if(target<0)return;to=target+(direction==='before'?1:0);}order.splice(to,0,item);order.forEach((j,i)=>j.layer=i);});
}
$('tree-joints').onclick=()=>{ui.tree='joints';renderHierarchy();};$('tree-layers').onclick=()=>{ui.tree='layers';renderHierarchy();};
let layerDrag=null;
$('hierarchy').addEventListener('dragstart',e=>{const item=e.target.closest('[data-layer-joint]');if(!item)return;layerDrag=item.dataset.layerJoint;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',layerDrag);});
$('hierarchy').addEventListener('dragover',e=>{if(!layerDrag)return;const item=e.target.closest('[data-layer-joint]');if(!item)return;e.preventDefault();document.querySelectorAll('.layer-drop').forEach(n=>n.classList.remove('layer-drop'));item.classList.add('layer-drop');});
$('hierarchy').addEventListener('drop',e=>{if(!layerDrag)return;e.preventDefault();const item=e.target.closest('[data-layer-joint]');if(item&&item.dataset.layerJoint!==layerDrag){const box=item.getBoundingClientRect();reorderLayer(layerDrag,e.clientY<box.y+box.height/2?'before':'after',item.dataset.layerJoint);}layerDrag=null;document.querySelectorAll('.layer-drop').forEach(n=>n.classList.remove('layer-drop'));});
$('hierarchy').addEventListener('dragend',()=>{layerDrag=null;document.querySelectorAll('.layer-drop').forEach(n=>n.classList.remove('layer-drop'));});
let clipboardPose=null,replacingArt=false;
$('inspector').addEventListener('change',e=>guard(()=>{
  pause();const j=joint(),el=e.target,path=el.dataset.field;if(el.id==='puppet-light-color'){edit(p=>applyCommand(p,{op:'lighting.settings',values:{lightColor:el.value}}));return;}if(el.id==='puppet-night'){edit(p=>applyCommand(p,{op:'lighting.settings',values:{night:Number(el.value)}}));return;}if(el.dataset.lightField||el.dataset.lightRgb){changePuppetLighting(el.dataset.lightField??el.dataset.lightRgb,el.dataset.lightRgb?hexRGB(el.value):el.type==='number'?Number(el.value):el.type==='checkbox'?el.checked:el.value);return;}
  if(path){const value=Number(e.target.value);if(!Number.isFinite(value))throw Error('Enter a finite number.');if(resolved?.edit(overrideContext2(),path,value))return;edit(p=>{
    const target=p.joints.find(n=>n.id===j.id);
    if(path.startsWith('sprite.')){const prop=path.split('.')[1];if(prop.startsWith('pivot')){const delta={x:0,y:0};delta[prop==='pivotX'?'x':'y']=(value/100-target.sprite[prop])*target.sprite[prop==='pivotX'?'width':'height'];moveOrigin(p,target.id,delta);}else target.sprite[prop]=Math.max(1,value);}
    else if(path==='layer')target.layer=value;
    else if(ui.mode==='rig')target.rest[path]=value;
    else {const v=sampleTrack(clip().tracks[j.id],motionTime());v[path]=value;keyValue(p,j.id,ui.time,v,clip().tracks[j.id]?.find(k=>Math.abs(k.time-motionTime())<.00001)?.easing??'smooth');}
  });}
  if(e.target.id==='ik-bend')edit(p=>p.clips.find(c=>c.id===ui.clip).ik[j.id].bend=Number(e.target.value));
  if(e.target.id==='ik-stretch')edit(p=>p.clips.find(c=>c.id===ui.clip).ik[j.id].stretch=Number(e.target.value));
  if(e.target.id==='joint-parent')edit(p=>p.joints.find(n=>n.id===j.id).parent=e.target.value||null);
  if(e.target.id==='joint-name')edit(p=>p.joints.find(n=>n.id===j.id).name=e.target.value||j.id);
  if(e.target.id==='easing')edit(p=>keyValue(p,j.id,ui.time,sampleTrack(clip().tracks[j.id],motionTime()),e.target.value));
}));
$('inspector').addEventListener('click',e=>guard(()=>{
  const button=e.target.closest('button'),id=button?.id,j=joint();if(!j)return;if(button?.dataset.lightPreset){edit(p=>applyCommand(p,{op:'lighting.node',joint:j.id,values:{light:lightPreset2D(button.dataset.lightPreset)}}));return;}if(button?.dataset.lightKey){edit(p=>applyCommand(p,{op:'lighting.key',joint:j.id,clip:ui.clip,channel:button.dataset.lightKey,time:Number(button.dataset.lightTime),remove:true}));return;}if(id==='edit-source-art'){workspace.editArtwork(j.sprite.asset);return;}if(id==='puppet-coloring-enable'){edit(p=>applyCommand(p,{op:'lighting.node',joint:j.id,values:{coloring:coloringDefaults()}}));return;}if(!id)return;
  if(id.startsWith('layer-')){reorderLayer(j.id,id.replace('layer-',''));return;}
  if(id==='toggle-ik'){if(clip().ik?.[j.id])confirmDialog('Bake connected motion?', 'This converts IK and motion effects in this clip into editable keys, preserving the visible animation at its frame rate. Undo restores the live controls.',()=>edit(p=>bakeMotion(p,p.clips.find(c=>c.id===ui.clip))));else{edit(p=>enableIK(p,p.clips.find(c=>c.id===ui.clip),j.id,motionTime(),{bend:j.id.endsWith('_r')?-1:1}));toast('IK enabled. Drag the wrist to bend the connected arm.');}return;}
  if(id==='motion-effects'){showEffects();return;}
  if(id==='reset-transform')edit(p=>{if(ui.mode==='animate')keyValue(p,j.id,ui.time,identity());else Object.assign(p.joints.find(n=>n.id===j.id).rest,{rotation:0,scaleX:1,scaleY:1});});
  if(id==='toggle-visible')edit(p=>{const target=p.joints.find(n=>n.id===j.id);target.hidden=!target.hidden;});
  if(id==='flip-x'||id==='flip-y'){pause();edit(p=>p.joints.find(n=>n.id===j.id).rest[id==='flip-x'?'scaleX':'scaleY']*=-1);}
  if(id==='replace-art'){replacingArt=j.id;$('art-input').click();}
  if(id==='delete-key')deleteKey();
  if(id==='copy-pose'){clipboardPose=sampleTrack(clip().tracks[j.id],motionTime());toast('Joint pose copied. Select a joint or time, then paste.');}
  if(id==='paste-pose'){if(!clipboardPose)throw Error('Copy a joint pose first.');edit(p=>keyValue(p,j.id,ui.time,clipboardPose));}
  if(id==='delete-joint')confirmDialog('Delete this joint?',`This also removes its child joints and their animation tracks. You can undo this.`,()=>edit(p=>removeJoint(p,j.id)));
  if(id==='rename-joint')renameBinding();
}));
function deleteKey(){pause();edit(p=>{const c=p.clips.find(c=>c.id===ui.clip);if(c.tracks[ui.selected])c.tracks[ui.selected]=c.tracks[ui.selected].filter(k=>Math.abs(k.time-motionTime())>.00001);});ui.key=null;}
let timelineDrag=null;
$('timeline-grid').addEventListener('pointerdown',e=>{
  const selectRow=e.target.closest('[data-select]');if(selectRow){select(selectRow.dataset.select);return;}
  const track=e.target.closest('[data-track]');if(!track)return;e.preventDefault();pause();
  const key=e.target.closest('[data-key]'),rect=track.getBoundingClientRect();
  if(ui.mode==='rig')setMode('animate');
  if(key){ui.selected=key.dataset.key;const sourceTime=Number(key.dataset.time);ui.time=presentationTime(clip(),sourceTime);ui.key={id:ui.selected,time:sourceTime};store.begin();timelineDrag={id:ui.selected,oldTime:sourceTime,rect,startX:e.clientX,keys:clone(clip().tracks[ui.selected]),moved:false};}
  else {if(track.dataset.track&&track.dataset.track!=='ruler')ui.selected=track.dataset.track;timelineDrag={scrub:true,rect};ui.time=snap((e.clientX-rect.left)/rect.width*clip().duration);ui.key=null;}
  renderHierarchy();renderInspector();renderTimeline();ui.dirty=true;
});
window.addEventListener('pointermove',e=>{const d=timelineDrag;if(!d)return;const t=snap((e.clientX-d.rect.left)/d.rect.width*clip().duration);if(d.scrub){setTime(t);return;}if(Math.abs(e.clientX-d.startX)<3&&!d.moved)return;d.moved=true;store.preview(p=>{const c=p.clips.find(c=>c.id===ui.clip),key=clone(d.keys.find(k=>k.time===d.oldTime));key.time=animationTime(c,t);c.tracks[d.id]=[...clone(d.keys).filter(k=>k.time!==d.oldTime&&Math.abs(k.time-key.time)>.00001),key].sort((a,b)=>a.time-b.time);});ui.time=t;ui.key={id:d.id,time:t};renderTimeline();});
window.addEventListener('pointerup',()=>{if(timelineDrag){if(!timelineDrag.scrub)guard(()=>store.commit());timelineDrag=null;renderInspector();}});
function showDialog(html){assetWindow?.dispose();assetWindow=null;pause();$('dialog').classList.remove('wide');$('dialog-content').onclick=null;$('dialog-content').onchange=null;$('dialog-content').innerHTML=html;$('dialog').showModal();}
function closeDialog(){assetWindow?.dispose();assetWindow=null;$('dialog').close();}
$('dialog').addEventListener('close',()=>{assetWindow?.dispose();assetWindow=null;});
function confirmDialog(title,body,action){showDialog(`<h2>${esc(title)}</h2><p>${esc(body)}</p><div class="dialog-actions"><button data-close>Cancel</button><button id="confirm-action" class="primary">Continue</button></div>`);$('confirm-action').onclick=()=>{closeDialog();action();};}
$('dialog').addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeDialog();});
function renameBinding(){
  const j=joint();showDialog(`<h2>Joint binding</h2><p>This name matches animation tracks across characters. Renaming updates all clips in this project.</p><label class="field">Binding name<input id="binding-name" value="${esc(j.id)}" maxlength="80"></label><div class="dialog-actions"><button data-close>Cancel</button><button id="apply-binding" class="primary">Rename</button></div>`);
  $('apply-binding').onclick=()=>guard(()=>{const next=$('binding-name').value;if(next===j.id){closeDialog();return;}store.edit(p=>applyCommand(p,{op:'joint.rename',id:j.id,newId:next}));ui.selected=next;renderUI();closeDialog();});
}
$('load-preset').onclick=()=>guard(showPreset);
let libraryEditor;
function showPreset(){
 showDialog(`<h2>Examples</h2><p>Start with editable artwork or explore a soft body attachment. You can import your own artwork and projects.</p><div class="export-options"><button id="example-starter">Simple artwork</button><button id="example-body">Body joins</button></div><div class="dialog-actions"><button data-close>Close</button></div>`);
 $('example-starter').onclick=()=>guard(async()=>{replaceProject(starterProject());await refreshImages();closeDialog();fit();});
 $('example-body').onclick=()=>guard(async()=>{closeDialog();await openJoinExample();});
}
$('add-joint').onclick=()=>{showDialog(`<h2>Add a joint</h2><p>Joints can hold an image or simply act as attachment points for other joints.</p><div class="field-grid"><label class="field full">Binding name<input id="new-joint-id" placeholder="tail, wing_l, hat…"></label><label class="field full">Parent<select id="new-joint-parent"><option value="">Stage (no parent)</option>${project().joints.map(j=>`<option value="${j.id}" ${j.id===ui.selected?'selected':''}>${esc(j.name)}</option>`).join('')}</select></label></div><div class="dialog-actions"><button data-close>Cancel</button><button id="create-joint" class="primary">Add joint</button></div>`);$('create-joint').onclick=()=>guard(()=>{const id=$('new-joint-id').value.trim(),parent=$('new-joint-parent').value||null;store.edit(p=>applyCommand(p,{op:'joint.add',id,parent}));select(id);setMode('rig');closeDialog();});};
function settings(isNew=false){const c=clip();showDialog(`<h2>${isNew?'New animation':'Animation settings'}</h2><div class="field-grid"><label class="field full">Name<input id="clip-name" value="${isNew?'Untitled':esc(c.name)}" maxlength="100"></label><label class="field">Duration (seconds)<input id="clip-duration" type="number" min=".1" max="120" step=".1" value="${isNew?2:c.duration}"></label><label class="field">Frames per second<input id="clip-fps" type="number" min="1" max="120" step="1" value="${c.fps}"></label><label class="field full"><span><input id="clip-loop" type="checkbox" ${isNew||c.loop?'checked':''}> Loop animation</span></label></div><p>Changing duration stretches existing keyframes to fit.</p><div class="dialog-actions">${!isNew?'<button id="duplicate-clip">Duplicate</button><button id="remove-clip" class="danger">Delete</button>':''}<button data-close>Cancel</button><button id="apply-clip" class="primary">${isNew?'Create':'Apply'}</button></div>`);
  $('apply-clip').onclick=()=>guard(()=>{const duration=Number($('clip-duration').value),fps=Number($('clip-fps').value),name=$('clip-name').value||'Untitled',loop=$('clip-loop').checked,id=isNew?crypto.randomUUID():c.id;store.edit(p=>applyCommand(p,{op:isNew?'clip.add':'clip.update',id,values:{name,duration,fps,loop}}));ui.clip=id;ui.time=0;renderUI();closeDialog();});
  if(!isNew){$('duplicate-clip').onclick=()=>{const copy=clone(c);copy.id=crypto.randomUUID();copy.name+=' copy';edit(p=>applyCommand(p,{op:'clip.duplicate',id:c.id,newId:copy.id,name:copy.name}));ui.clip=copy.id;renderUI();closeDialog();};$('remove-clip').onclick=()=>{if(project().clips.length===1){toast('Keep at least one animation.',true);return;}edit(p=>applyCommand(p,{op:'clip.remove',id:c.id}));closeDialog();};}
}
function showEffects(){
  const j=joint(),effects=clip().effects??[];
  showDialog(`<h2>Make ${esc(j.name).toLowerCase()} feel alive.</h2><p>Effects layer over the keyed pose and run in the exported player. Cycles are per clip; whole numbers loop cleanly. Squash preserves area by widening as the joint compresses.</p><div class="effect-list">${effects.map((e,i)=>e.joint===j.id?`<div class="effect-card"><strong>${esc(e.type)}</strong><div class="field-grid"><label class="field">Amount ${e.type==='squash'?'%':['wiggle','hit','fall'].includes(e.type)?'°':'px'}<input data-effect="${i}" data-prop="amount" type="number" step="1" min="0" max="${e.type==='squash'?85:360}" value="${e.amount}"></label><label class="field">Cycles / clip<input data-effect="${i}" data-prop="cycles" type="number" min="0" max="40" step=".25" value="${e.cycles}"></label><label class="field">Phase °<input data-effect="${i}" data-prop="phase" type="number" step="15" value="${e.phase}"></label><label class="field">Start (seconds)<input data-effect="${i}" data-prop="delay" type="number" min="0" step=".1" value="${e.delay??0}"></label><label class="field">Effect duration<input data-effect="${i}" data-prop="span" type="number" min=".1" step=".1" value="${e.span??clip().duration}"></label>${['hit','bounce'].includes(e.type)?`<label class="field">Damping<input data-effect="${i}" data-prop="decay" type="number" min="0" max="20" step=".5" value="${e.decay??4}"></label>`:''}<button data-remove-effect="${i}">Remove</button></div></div>`:'').join('')}</div><div class="button-row">${['squash','wiggle','bob','sway','hit','fall','reveal','bounce'].map(type=>`<button data-add-effect="${type}">＋ ${type}</button>`).join('')}</div><p><b>Hit</b> is a damped wobble; <b>fall</b> tips around the origin; <b>reveal</b> grows and rises into place; <b>bounce</b> lands and settles. Put a tree’s origin at its base for falling. These effects animate the selected piece and its children.</p><div class="button-row"><button data-motion-preset="tree-hit">Tree hit</button><button data-motion-preset="tree-fall">Tree fall</button><button data-motion-preset="chest-found">Chest found</button><button data-motion-preset="breathing">Breathing</button></div><div class="dialog-actions"><button id="bake-motion">Bake clip to keys</button><button id="preview-motion" class="primary">Preview motion</button></div>`);
  $('dialog-content').onchange=e=>{const index=e.target.dataset.effect,prop=e.target.dataset.prop;if(index===undefined)return;guard(()=>store.edit(p=>p.clips.find(c=>c.id===ui.clip).effects[Number(index)][prop]=Number(e.target.value)));};
  $('dialog-content').onclick=e=>{const add=e.target.dataset.addEffect,remove=e.target.dataset.removeEffect,preset=e.target.dataset.motionPreset;if(preset){edit(p=>{const c=p.clips.find(c=>c.id===ui.clip);c.effects??=[];const base={joint:j.id,phase:0,delay:0,span:c.duration,decay:4,volume:true};const list=preset==='tree-hit'?[{type:'hit',amount:18,cycles:4}]:preset==='tree-fall'?[{type:'fall',amount:88,cycles:1}]:preset==='chest-found'?[{type:'reveal',amount:28,cycles:1},{type:'bounce',amount:12,cycles:3}]:[{type:'squash',amount:5,cycles:1},{type:'bob',amount:3,cycles:1}];for(const effect of list)c.effects.push({...base,...effect});c.loop=preset==='breathing';});closeDialog();showEffects();return;}if(add){edit(p=>{const c=p.clips.find(c=>c.id===ui.clip);c.effects??=[];c.effects.push({joint:j.id,type:add,amount:add==='squash'?12:add==='wiggle'?8:add==='fall'?85:add==='reveal'?24:add==='bounce'?25:add==='hit'?16:6,cycles:add==='hit'?4:2,phase:0,volume:true,delay:0,span:clip().duration,decay:4});});closeDialog();showEffects();}if(remove!==undefined){edit(p=>p.clips.find(c=>c.id===ui.clip).effects.splice(Number(remove),1));closeDialog();showEffects();}};
  $('preview-motion').onclick=()=>{closeDialog();ui.time=0;fit();if(!ui.playing)togglePlay();};
  $('bake-motion').onclick=()=>{edit(p=>applyCommand(p,{op:'clip.bake',id:ui.clip}));closeDialog();toast('IK and effects baked to editable keys for this clip. Undo restores the live controls.');};
}
$('new-clip').onclick=()=>settings(true);$('clip-settings').onclick=()=>settings();$('clip').onchange=e=>{pause();ui.clip=e.target.value;ui.time=0;ui.key=null;ui.dirty=true;renderUI();};
$('mode-animate').onclick=()=>setMode('animate');$('mode-rig').onclick=()=>setMode('rig');document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$('fit').onclick=fit;$('onion').onclick=()=>{ui.onion=!ui.onion;ui.dirty=true;renderUI();};$('bones').onclick=()=>{ui.bones=!ui.bones;ui.dirty=true;renderUI();};
const pauseHistory=()=>{pause();scene3dEditor?.pause();};$('undo').onclick=()=>{pauseHistory();store.undo();};$('redo').onclick=()=>{pauseHistory();store.redo();};$('project-name').onchange=e=>edit(p=>p.name=e.target.value||'Untitled puppet');
$('add-key').onclick=()=>poseKey();$('key-pose').onclick=()=>poseKey(true);
function togglePlay(){if(ui.mode==='rig')setMode('animate');if(ui.time>=clip().duration)ui.time=0;ui.playing=!ui.playing;if(!ui.playing)clipAudio.stop();else clipAudio.begin(clip(),ui.time);$('play').textContent=ui.playing?'Ⅱ':'▶';ui.dirty=true;}
$('play').onclick=togglePlay;
function neighborKey(direction){pause();const times=[...new Set(Object.values(clip().tracks).flatMap(keys=>keys.map(k=>presentationTime(clip(),k.time))))].sort((a,b)=>a-b);const next=direction>0?times.find(t=>t>ui.time+.0001):times.toReversed().find(t=>t<ui.time-.0001);setTime(next??(direction>0?clip().duration:0),false);renderTimeline();}
$('previous-key').onclick=()=>neighborKey(-1);$('next-key').onclick=()=>neighborKey(1);
function filename(s){return s.replace(/[^a-zA-Z0-9_.-]+/g,'-').slice(0,100)||'puppet';}
const download=downloadFile;
async function embeddedProject(){return portableProject(project());}
function readDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
async function saveProject(){const p=await embeddedProject();download(JSON.stringify(p,null,2),filename(p.name)+'.puppet.json');toast('Project exported with all image pieces included.');}
$('save').onclick=()=>guard(saveProject);
$('export').onclick=()=>{if(document.body.dataset.workspace==='scene'){document.getElementById('s3-export').click();return;}showDialog(`<h2>Take your puppet with you.</h2><p>Project JSON keeps the editable rig, curves, procedural effects and every animation. The live player evaluates them at runtime. PNG and GIF exports bake the result into image frames. Clips transfer motion between matching joint names.</p><div class="export-options"><button id="export-project">Project JSON<small>Editable rig + effects + embedded art + all clips</small></button><button id="export-clip">Animation JSON<small>Current clip, reusable on another rig</small></button><button id="export-player">Animated HTML<small>Live puppet + effects runtime, plays offline</small></button><button id="export-png">Pose PNG<small>Flattened frame with effects and transparency</small></button><button id="export-runtime">JavaScript player<small>Dependency-free runtime for your own app</small></button><button id="import-clip">Import animation<small>Load a clip onto this character</small></button></div><div class="dialog-actions"><button data-close>Close</button></div>`);
  $('export-project').onclick=()=>guard(saveProject);$('export-clip').onclick=()=>{download(JSON.stringify({format:FORMAT+'-clip',version:1,clip:clone(clip())},null,2),filename(clip().name)+'.animation.json');toast('Animation exported.');};
  $('export-runtime').onclick=()=>guard(async()=>{const r=await fetch('./runtime.portable.js');if(!r.ok)throw Error('Could not load the runtime.');download(await r.text(),'puppet-runtime.js','text/javascript');toast('Runtime downloaded. Usage is in Help.');});
  $('export-player').onclick=()=>guard(exportPlayer);$('export-png').onclick=()=>guard(exportPNG);$('import-clip').onclick=()=>{closeDialog();$('file-input').click();};
};
async function exportPlayer(){
  const selectedClip=clip().id,p=await embeddedProject(),response=await fetch('./runtime.portable.js');if(!response.ok)throw Error('Could not load the runtime.');const code=await response.text(),moduleURL='data:text/javascript;base64,'+btoa(unescape(encodeURIComponent(code))),data=JSON.stringify(p).replace(/</g,'\\u003c'),current=JSON.stringify(selectedClip).replace(/</g,'\\u003c');
  const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(p.name)}</title><style>body{margin:0;background:#202629;color:#d5efbc;font:14px system-ui;display:grid;place-items:center;min-height:100vh}canvas{max-width:90vw;max-height:80vh}select,button{background:#364331;color:#d5efbc;border:1px solid #687b5d;border-radius:6px;padding:9px}header{display:flex;gap:12px;align-items:center}h1{font-size:16px}</style><header><h1>${esc(p.name)}</h1><select id="clips"></select><button id="toggle">Pause</button></header><canvas id="puppet" width="900" height="800"></canvas><script type="module">const {loadImages,createPlayer}=await import(${JSON.stringify(moduleURL)});\nconst p=${data};const images=await loadImages(p);const player=createPlayer(document.querySelector('canvas'),p,images);const menu=document.querySelector('select');for(const c of p.clips){const option=document.createElement('option');option.value=c.id;option.textContent=c.name;menu.append(option);}menu.value=${current};player.play(menu.value);let playing=true;menu.onchange=()=>{player.play(menu.value);playing=true;document.querySelector('button').textContent='Pause';};document.querySelector('button').onclick=e=>{playing=!playing;if(playing)player.play(menu.value);else player.stop();e.target.textContent=playing?'Pause':'Play';};<\/script>`;
  download(html,filename(p.name)+'.html','text/html');toast('Standalone animated HTML exported — images and player included.');
}
async function exportPNG(){const out=renderFrame(project(),images,clip(),ui.time),blob=out.convertToBlob?await out.convertToBlob({type:'image/png'}):await new Promise(r=>out.toBlob(r));download(blob,filename(project().name)+'-pose.png');toast('Frame exported with effects.');}
$('open').onclick=()=>$('file-input').click();
async function importJSON(file){
  const revision=store.revision;const check=()=>{if(store.revision!==revision||store.pending)throw Error('The project changed while importing; import again against the current revision.');};
  if(file.size>50*1024*1024)throw Error('Project files must be under 50 MB.');const data=JSON.parse(await file.text());check();
  if(data.format===FORMAT+'-clip'&&data.version===1){
    const c=clone(data.clip),ids=new Set(project().joints.map(j=>j.id)),skipped=Object.keys(c.tracks??{}).filter(id=>!ids.has(id));cleanToolReferences(c,ids);if(c.resolvedTracks)c.resolvedTracks=c.resolvedTracks.filter(t=>ids.has(t.node));for(const id of skipped)delete c.tracks[id];if(c.effects)c.effects=c.effects.filter(e=>ids.has(e.joint));if(c.lightingTracks)c.lightingTracks=c.lightingTracks.filter(t=>ids.has(t.node)&&project().joints.find(j=>j.id===t.node)?.[t.channel.split('.')[0]]);for(const [end,chain]of Object.entries(c.ik??{}))if(!ids.has(end)||!ids.has(chain.root)||!ids.has(chain.mid))delete c.ik[end];if(!Object.keys(c.tracks??{}).length&&!c.effects?.length&&!Object.keys(c.ik??{}).length&&!c.cues?.length&&!c.lightingTracks?.length)throw Error('No matching joint names. Rename the rig bindings to match the animation first.');c.id=crypto.randomUUID();const next=clone(project());next.clips.push(c);validateProject(next);replaceProject(next);ui.clip=c.id;ui.time=0;renderUI();toast('Animation imported.'+(skipped.length?' Skipped unmatched joints: '+skipped.join(', '):''));return;
  }
  const p=validateProject(data);const loaded=await loadImages(p);for(const draw of loaded.models?.values()??[])draw.dispose?.();check();replaceProject(p);await refreshImages();ui.time=0;ui.clip=p.clips[0].id;select(p.joints[0].id);fit();toast('Project opened.');
}
$('file-input').onchange=e=>guard(async()=>{const f=e.target.files[0];e.target.value='';if(f)await importJSON(f);});
$('import-art').onclick=()=>{replacingArt=false;$('art-input').click();};
async function importArt(files,replace=false){
  const revision=store.revision,parent=ui.selected;
  const additions=[];for(const file of files){if(!['image/png','image/svg+xml','image/jpeg','image/webp'].includes(file.type))throw Error('Use PNG, SVG, JPEG or WebP image pieces.');if(file.size>12*1024*1024)throw Error('Each image must be under 12 MB.');const src=await readDataURL(file),img=new Image();img.src=src;await img.decode();additions.push({src,width:img.naturalWidth,height:img.naturalHeight,name:file.name.replace(/\.[^.]+$/,'')});if(replace)break;}
  if(store.revision!==revision||store.pending)throw Error('The project changed while importing artwork; try again.');
  let last;store.edit(p=>{for(const a of additions){let id=filename(a.name).toLowerCase(),n=2;while(p.assets.some(x=>x.id===id)||p.joints.some(x=>x.id===id))id=filename(a.name).toLowerCase()+'_'+n++;p.assets.push({id,src:a.src});if(replace){const target=p.joints.find(j=>j.id===replace);if(!target)throw Error('Select a joint to replace.');if(target.sprite)target.sprite.asset=id;else target.sprite={asset:id,width:100,height:100*a.height/a.width,pivotX:.5,pivotY:.5};last=target.id;}else{const scale=Math.min(1,180/Math.max(a.width,a.height));p.joints.push({id,name:a.name,parent:parent??null,rest:identity(),layer:40+p.joints.length,sprite:{asset:id,width:Math.max(1,a.width*scale),height:Math.max(1,a.height*scale),pivotX:.5,pivotY:.5}});last=id;}}});
  await refreshImages();if(last)select(last);setMode('rig');toast(replace?'Artwork replaced. Rig and animation are preserved.':'Image pieces added. Position them in Rig setup.');
}
$('art-input').onchange=e=>guard(async()=>{const files=[...e.target.files],replace=replacingArt;e.target.value='';replacingArt=false;if(files.length)await importArt(files,replace);});
$('stage').addEventListener('dragover',e=>{e.preventDefault();$('stage').classList.add('drop-active');});$('stage').addEventListener('dragleave',()=>$('stage').classList.remove('drop-active'));
$('stage').addEventListener('drop',e=>{e.preventDefault();$('stage').classList.remove('drop-active');guard(async()=>{const files=[...e.dataTransfer.files];if(files.length===1&&files[0].name.endsWith('.json'))await importJSON(files[0]);else await importArt(files);});});
$('help').onclick=()=>showDialog(`<h2>A small studio for your puppets.</h2><p><strong>1. Fit the character.</strong> In <b>Rig setup</b>, move joints, rotate or resize pieces. The purple origin tool moves a pivot while keeping rest artwork and children stationary.</p><p><strong>2. Make it move.</strong> Choose <b>Animate</b>, click a time, then pose a joint. Edits automatically create keyframes. Drag timeline diamonds to change timing. Use <b>Key pose</b> to capture every joint.</p><p><strong>3. Reuse the motion.</strong> Change characters or import an animation. Tracks bind to joint names such as <b>head</b>, <b>upper_arm_l</b>, and <b>hand_r</b>. Rig proportions stay separate.</p><p><strong>4. Save your work.</strong> Autosave stays in this browser. <b>Save project</b> downloads all art and clips. Export HTML to play offline, or use the exported JavaScript runtime.</p><h3>Connected motion & scene tools</h3><p>Select a wrist and use <b>I / IK</b> to bend its elbow and shoulder. Adjust bend direction and max stretch in the inspector. Use <b>Dynamic effects & presets</b> for squash, wiggle, hit wobble, falling, reveal and bounce; bake the clip to ordinary keys when wanted. Corner and side handles resize artwork; the round handle rotates. The <b>Draw order</b> tab controls front/back without changing joint parents.</p><p><b>Examples</b> opens self-contained sample projects. Import artwork and save reusable pieces to your Library. These are reusable animation tools; the Effects workspace adds presentation cues, particles, fluids, smears and compositing. Game triggers and audio are still connected by your game code.</p><h3>Shortcuts</h3><p><kbd>V</kbd> Move &nbsp; <kbd>R</kbd> Rotate &nbsp; <kbd>S</kbd> Scale &nbsp; <kbd>P</kbd> Origin &nbsp; <kbd>I</kbd> IK<br><kbd>Space</kbd> Play / pause · hold and drag to pan<br><kbd>K</kbd> Add key &nbsp; <kbd>F</kbd> Fit &nbsp; <kbd>←</kbd> <kbd>→</kbd> Step frame<br><kbd>⌘ Z</kbd> Undo &nbsp; <kbd>⇧ ⌘ Z</kbd> Redo &nbsp; <kbd>⌘ S</kbd> Save<br><kbd>Delete</kbd> Delete key at playhead &nbsp; <kbd>Esc</kbd> Cancel drag</p><h3>Generic cutout format</h3><p>This editor uses Shapeshift Studio v1 JSON for 2D image puppets, with nested joints and rest-relative animation. It doesn't import Spine, DragonBones or 3D skeleton files.</p><h3>Use in your own app</h3><pre style="font-size:10px;overflow:auto;line-height:1.8">import {loadImages, createPlayer}
  from './puppet-runtime.js';
const images = await loadImages(project);
const player = createPlayer(canvas, project, images);
player.play(project.clips[0].id);
// player.stop(); player.draw(0.5);</pre><div class="dialog-actions"><button data-close class="primary">Got it</button></div>`);
let spacePressed=false,spacePanned=false;
window.addEventListener('keydown',e=>{
  if(document.body.classList.contains('artwork-open')||document.body.classList.contains('scene3d-open')||e.target.matches('input,select,textarea')||$('dialog').open)return;
  if(e.code==='Space'){e.preventDefault();if(!e.repeat){ui.space=true;spacePressed=true;spacePanned=false;}return;}
  const mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();pause();e.shiftKey?store.redo():store.undo();return;}
  if(mod&&e.key.toLowerCase()==='s'){e.preventDefault();guard(saveProject);return;}
  if(mod)return;
  if(e.key==='Escape'){finishDrag(true);if(timelineDrag){store.cancel();timelineDrag=null;renderUI();}return;}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();if(ui.mode==='animate')deleteKey();return;}
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();pause();setTime(ui.time+(e.key==='ArrowRight'?1:-1)/clip().fps);renderTimeline();return;}
  if(e.key.toLowerCase()==='f')fit();if(e.key.toLowerCase()==='k')poseKey();
  const tool={v:'move',r:'rotate',s:'scale',p:'pivot',i:'ik'}[e.key.toLowerCase()];if(tool)setTool(tool);
});
canvas.addEventListener('pointermove',()=>{if(ui.space&&ui.drag?.kind==='pan')spacePanned=true;});
window.addEventListener('keyup',e=>{if(e.code==='Space'){if(spacePressed&&!spacePanned&&!e.target.matches('input,select,textarea')&&!$('dialog').open)togglePlay();ui.space=false;spacePressed=false;}});
window.addEventListener('blur',()=>{ui.space=false;spacePressed=false;finishDrag(true);if(timelineDrag){store.cancel();timelineDrag=null;}pause();});
async function start(){
  let references;
  let saved;try{saved=await readSaved();if(saved)validateProject(saved);}catch(e){saved=null;toast('Could not restore autosave. You can open a saved project file.',true);}
  const p=saved??starterProject();store=new ProjectStore(p,changed);ui.clip=p.clips[0].id;ui.selected=p.joints.find(j=>j.id==='head')?.id??p.joints[0].id;await refreshImages();
  const resize=new ResizeObserver(()=>{const r=$('stage').getBoundingClientRect();const first=ui.width===1;ui.width=r.width;ui.height=r.height;const dpr=Math.min(devicePixelRatio,2);canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr);if(first)fit();ui.dirty=true;updateTime();});resize.observe($('stage'));
  renderUI();$('save-status').textContent=saved?'Restored from this device':'Ready · save a project to keep a portable copy';
  let last=performance.now();function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(ui.playing){const advance=studioTransport.advance('2:'+ui.clip,ui.time,dt,clip());ui.time=advance.time;if(advance.ended)pause();clipAudio.sync(project(),clip(),ui.time,{audible:ui.playing});ui.dirty=true;updateTime();}if(ui.dirty)draw();requestAnimationFrame(frame);}requestAnimationFrame(frame);
  const dispatch=command=>{let results;store.edit(p=>{results=(Array.isArray(command)?command:[command]).map(c=>applyCommand(p,{clip:ui.clip,joint:ui.selected,...c}));});if((Array.isArray(command)?command:[command]).some(c=>c.op==='project.replace')){activeReferenceNavigation?.clear();clearOverrides();}else if((Array.isArray(command)?command:[command]).some(c=>['scene3d.new','scene3d.replace'].includes(c.op)))clearOverrides(3);return Array.isArray(command)?results:results[0];};
  fxEditor=mountFX($('fx-panel'),{project,clip,selected:()=>ui.selected,time:()=>ui.time,dispatch,toast,download,images:async()=>{await refreshImages();return images;},invalidate:()=>{ui.dirty=true;},seek:t=>{pause();setTime(t,false);},play:togglePlay,replaceImage:async(id,src,width,height)=>{store.edit(p=>{const asset=p.assets.find(a=>a.id===id);asset.originalSrc??=asset.src;asset.src=src;delete asset.frames;});await refreshImages();},importFrames:async(frames,width,height,fps,name,frameDurations)=>{const id='animated-'+crypto.randomUUID();store.edit(p=>{p.assets.push({id,src:frames[0],frames,...(frameDurations?{frameDurations}:{})});p.joints.push({id,name,parent:null,rest:identity(),layer:50,sprite:{asset:id,width:Math.min(200,width),height:Math.min(200,width)*height/width,pivotX:.5,pivotY:.5,fps}});});await refreshImages();select(id);}});
  scene3dEditor=mountScene3D({project,dispatch,revision:()=>store.revision,toast,editOverride:(c,path,value)=>resolved?.edit(c,path,value),hasOverride:(c,path)=>channelOverrides.has(c,path),overrides:()=>[...channelOverrides.entries.values()].filter(t=>t.dimension===3),graph:()=>store.graph,undo:()=>store.undo(),redo:()=>store.redo(),replace:p=>replaceProject(p),onClose:()=>workspace.show('puppet'),editArtwork:id=>workspace.editArtwork(id),editPuppet:(id,sourceClip)=>workspace.editPuppet(id,sourceClip)});$('scene3d-open').onclick=()=>guard(()=>{pause();return scene3dEditor.show();});
  workspace=mountWorkspace({scene:scene3dEditor,pause,fx:fxEditor,project,fitPuppet:fit,puppetState:()=>({selected:ui.selected,clip:ui.clip,time:ui.time,mode:ui.mode,pan:{...ui.pan},zoom:ui.zoom}),restorePuppet:state=>{Object.assign(ui,{selected:project().joints.some(j=>j.id===state.selected)?state.selected:project().joints[0].id,clip:project().clips.some(c=>c.id===state.clip)?state.clip:project().clips[0].id,time:state.time,mode:state.mode,...(state.pan?{pan:{...state.pan}}:{}),...(state.zoom?{zoom:state.zoom}:{})});setTime(state.time,false);renderUI();}});$('fx-open').onclick=()=>guard(async()=>{await workspace.show('puppet');fxEditor.show();});$('timeline-grid').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.select){e.preventDefault();select(e.target.dataset.select);}});$('timeline-grid').addEventListener('click',e=>{if(e.target.dataset.presentation)fxEditor.selectCue(e.target.dataset.presentation);});
  const motionContext=()=>{const scene=document.body.dataset.workspace==='scene',state=scene?scene3dEditor.selection():{selected:ui.selected,clip:ui.clip,time:ui.time},doc=scene?project().scene3d:project();return{dimension:scene?3:2,selected:state.selected,clip:doc.clips.find(c=>c.id===state.clip)??doc.clips[0],clips:doc.clips,nodes:scene?doc.nodes:doc.joints,time:state.time};};
  const artwork=mountArtwork({project,dispatch,revision:()=>store.revision,toast,workspace,attachAsset:(id,box)=>{store.edit(p=>p.joints.push({id:'art-'+crypto.randomUUID().slice(0,8),name:'Artwork',parent:null,rest:identity(),layer:50,sprite:{asset:id,width:200,height:200*box[3]/box[2],pivotX:.5,pivotY:.5}}));},preferredAsset:()=>{if(project().scene3d&&scene3dEditor){const state=scene3dEditor.snapshot(),n=project().scene3d.nodes.find(n=>n.id===state.selected);if(n?.surfaces?.[state.face??'front']?.asset)return n.surfaces[state.face??'front'].asset;if(n?.svg)return n.svg;}return joint()?.sprite?.asset;}});
  mountGrading({project,dispatch,revision:()=>store.revision,toast});
  const styles=mountStyles({project,dispatch,revision:()=>store.revision,toast});
  const motionTools=mountMotionTools({context:motionContext,revision:()=>store.revision,dispatch,toast,pause:()=>{pause();if(document.body.dataset.workspace==='scene'){const state=scene3dEditor.selection();scene3dEditor.seek(state.time);}},select:id=>document.body.dataset.workspace==='scene'?scene3dEditor.select(id):select(id),clip:id=>{if(document.body.dataset.workspace==='scene')scene3dEditor.setClip(id);else{ui.clip=id;setTime(0,false);renderUI();}},seek:t=>document.body.dataset.workspace==='scene'?scene3dEditor.seek(t):setTime(t,false),contactPoint:(n,ground)=>{const r=scene3dEditor.runtime(),o=r.objects.get(n.id),v=o.position.clone().set(0,-n.dimensions[1]/2,0);o.localToWorld(v);if(ground)v.y=0;return v.toArray();},review:kind=>{if(document.body.dataset.workspace==='scene'){import('./motion-tools/scene-review.js').then(m=>{const r=scene3dEditor.runtime();const result=m.sceneReview(r,motionContext().selected,kind);if(result)toast(result);});return;}if(kind==='ghosts'){ui.onion=!ui.onion;ui.dirty=true;renderUI();return;}if(kind==='arc'&&ui.motionArc){ui.motionArc=null;ui.dirty=true;return;}const samples=Array.from({length:49},(_,i)=>{const t=i*clip().duration/48,p=poseAt(project(),clip(),t).get(ui.selected);return{time:t,position:[p.world[4],p.world[5]],rotation:[Math.atan2(p.world[1],p.world[0])*180/Math.PI],contactError:p.contactError};});if(kind==='arc'){ui.motionArc={joint:ui.selected,points:samples.map(s=>s.position)};ui.dirty=true;return;}return reviewSamples(samples,{duration:clip().duration,loop:clip().loop});}});
  const openJoinExample=async()=>{pause();const {bodyJoinExample}=await import('./body-join-example/project.js');replaceProject(await bodyJoinExample());await refreshImages();await workspace.show('puppet');ui.clip='sway';ui.selected='head';ui.mode='animate';ui.bones=false;ui.time=0;renderUI();timeline.hide();bodyJoins.focus(innerWidth<900);fit();if(innerWidth>=900)bodyJoins.show();else bodyJoins.hide();togglePlay();};
  const bodyJoins=mountBodyJoins({project,dispatch,toast,canvas,camera,select,fit,context:()=>({selected:ui.selected,playing:ui.playing,time:ui.time,clip:ui.clip}),clip:id=>{pause();ui.clip=id;setTime(0,false);renderUI();fit();},seek:t=>{pause();setTime(t,false);},rest:()=>setMode('rig'),play:togglePlay,example:openJoinExample});
  const timelineContext=()=>{const view=workspace.snapshot().view;if(view==='artwork'){const state=artwork.snapshot();return{dimension:2,clip:ui.clip,asset:state.asset,time:state.time,guides:state.guides};}if(view==='scene'){const state=scene3dEditor.selection();return{dimension:3,clip:state.clip,time:state.time};}return{dimension:2,clip:ui.clip,time:ui.time};};
  const timeline=mountTimeline({project,review:kind=>workspace.snapshot().view==='artwork'?artwork.review(kind):motionTools.review(kind),context:timelineContext,revision:()=>store.revision,dispatch,toast,seek:t=>workspace.snapshot().view==='scene'?scene3dEditor.seek(t):workspace.snapshot().view==='artwork'?artwork.seek(t):setTime(t,false),play:()=>workspace.snapshot().view==='scene'?$('s3-play').click():workspace.snapshot().view==='artwork'?$('av-play').click():togglePlay(),clip:id=>{if(workspace.snapshot().view==='scene')scene3dEditor.setClip(id);else{ui.clip=id;setTime(0,false);renderUI();}},select:row=>{if(row.node){if(workspace.snapshot().view==='scene')scene3dEditor.select(row.node);else select(row.node);}}});timeline.show();
  const ownershipContext=()=>({...timelineContext(),mode:ui.mode,selected:workspace.snapshot().view==='scene'?scene3dEditor.selection().selected:ui.selected});
  resolved=mountResolvedEditor({project,context:ownershipContext,scene:()=>scene3dEditor.runtime(),pause:()=>{pause();if(workspace.snapshot().view==='scene')scene3dEditor.seek(scene3dEditor.selection().time);},changed:()=>{ui.dirty=true;renderInspector();const r=scene3dEditor.runtime();if(r)r.setChannelOverrides([...channelOverrides.entries.values()].filter(t=>t.dimension===3));scene3dEditor.refreshFields();},dispatch,toast});
  const ownership=mountOwnership({project,resolved,context:()=>({...timelineContext(),mode:ui.mode,selected:workspace.snapshot().view==='scene'?scene3dEditor.selection().selected:ui.selected}),runtime:()=>scene3dEditor.runtime(),dispatch,toast,source:s=>{if(['track','event','artwork'].includes(s.kind))timeline.focus({node:s.selected,channel:s.channel,id:s.id});else if(s.kind==='override')resolved.show(s.channel);else if(s.kind==='style')styles.show();else if(s.kind==='controller')actions.show();else if(['tool','motion'].includes(s.kind))$('motion-tools').click();else if(s.dimension===2)setMode('rig');}});
  const sound=mountSound({project,context:timelineContext,dispatch,toast});
  const actions=mountActions({project,context:timelineContext,dispatch,revision:()=>store.revision,openClip:id=>{if(workspace.snapshot().view==='scene')scene3dEditor.setClip(id);else{ui.clip=id;setTime(0,false);renderUI();}},toast});
  const library=libraryEditor=mountLibrary({project,browseExamples:showPreset,activateDimension:dimension=>workspace.show(dimension===3?'scene':'puppet'),context:ownershipContext,dispatch,revision:()=>store.revision,toast,
    select:id=>workspace.snapshot().view==='scene'?scene3dEditor.select(id):select(id),
    openClip:id=>{if(workspace.snapshot().view==='scene')scene3dEditor.setClip(id);else{ui.clip=id;setTime(0,false);renderUI();}},
    stage:()=>workspace.snapshot().view==='scene'?document.getElementById('s3-stage'):document.getElementById('stage'),
    dropPoint:e=>{if(workspace.snapshot().view!=='scene'){const p=worldMouse(e);return[p.x,p.y];}const r=scene3dEditor.runtime(),rect=r.canvas.getBoundingClientRect(),x=(e.clientX-rect.left)/rect.width*2-1,y=1-(e.clientY-rect.top)/rect.height*2,a=r.camera.position.clone().set(x,y,-1).unproject(r.camera),b=r.camera.position.clone().set(x,y,1).unproject(r.camera),d=b.sub(a);if(Math.abs(d.y)<1e-6)throw Error('Tilt the camera toward the ground to place an object');const t=-a.y/d.y;if(t<0)throw Error('Drop onto visible ground');return a.addScaledVector(d,t).toArray();}
  });
  const arena=mountPreview({project,dispatch,context:()=>({...timelineContext(),subject:workspace.snapshot().view==='scene'?scene3dEditor.selection().selected:ui.selected}),toast});workspace.register('preview','Preview',arena);
  const environment=mountBackdrop({project,dispatch,revision:()=>store.revision,time:()=>timelineContext().time,toast});
  const behaviours=mountBehaviour({project,dispatch,scene:scene3dEditor,toast});
  const entities=mountEntities({project,dispatch,revision:()=>store.revision,toast,download,references:()=>references});
  const referencePanels={entities,sound,library};
  const referenceNavigation=createReferenceNavigation({
    resolve:r=>resolveReference(project(),r),
    capture:()=>({workspace:workspace.capture(),panels:Object.fromEntries(Object.entries(referencePanels).map(([id,panel])=>[id,panel.context()]))}),
    restore:async state=>{await workspace.restore(state.workspace);for(const [id,panel] of Object.entries(referencePanels))panel.restore(state.panels[id]);},
    open:async r=>{
      pause();scene3dEditor.pause();for(const panel of Object.values(referencePanels))panel.hide();
      if(r.kind==='asset'){await workspace.show('artwork',{drill:true});await artwork.openAsset(r.id);}
      else if(r.kind==='entity'||r.kind==='component')entities.show(r);
      else if(r.kind==='library-source'){await workspace.show(r.dimension===3?'scene':'puppet',{drill:true});library.show(r.id);}
      else if(r.kind==='audio-library'){await workspace.show(r.dimension===3?'scene':'puppet',{drill:true});sound.show(r.id);}
      else if(r.kind==='scene-node'){await workspace.show('scene',{drill:true});scene3dEditor.select(r.id);}
      else if(r.kind==='clip'){await workspace.show(r.dimension===3?'scene':'puppet',{drill:true});if(r.dimension===3){scene3dEditor.setClip(r.id);scene3dEditor.seek(0);}else{ui.clip=r.id;setTime(0,false);renderUI();}}
      else if(r.kind==='joint'||r.kind==='rig'){await workspace.show('puppet',{drill:true});select(r.kind==='joint'?r.id:r.id==='$project'?project().joints[0].id:project().puppetSources.find(s=>s.id===r.id).roots[0]);}
      else throw Error('Cannot open reference '+r.kind);
    },changed:()=>references?.refresh()
  });
  activeReferenceNavigation=referenceNavigation;
  references=mountReferences({project,navigation:referenceNavigation,toast});
  const canvasControls=mountCanvasControls({project,environment,toast,resolved,overrides:overrides2,overrideRevision:()=>channelOverrides.revision,inspectTarget:d=>{if(d.kind==='eye'){scene3dEditor.select(d.node,d.face);resolved.show('eye.gaze');}else if(d.kind==='decal')scene3dEditor.inspectEvent(d.targetId);else if(d.kind==='light'){const selector=workspace.snapshot().view==='scene'?'#s3-fields [data-field="light.range"]':'#inspector [data-light-field="light.range"]';document.querySelector(selector)?.closest('details,.property-section')?.scrollIntoView({block:'nearest'});}},recordTime:t=>{if(workspace.snapshot().view==='scene')scene3dEditor.recordTime(t);else{ui.time=t;ui.dirty=true;updateTime();}},
    context:()=>({...timelineContext(),mode:workspace.snapshot().view==='scene'?'scene':ui.mode,view:workspace.snapshot().view,selected:workspace.snapshot().view==='scene'?scene3dEditor.selection().selected:ui.selected,animate:workspace.snapshot().view==='scene'?$('s3-autokey').checked:ui.mode==='animate'}),
    stage:()=>workspace.snapshot().view==='scene'?scene3dEditor.runtime()?.canvas:canvas,
    pose:activePose,camera:()=>frameCamera(camera(),ui.mode==='animate'?presentationAt(clip(),ui.time):{x:0,y:0,rotation:0,scale:1},ui.width,ui.height),scene:()=>scene3dEditor.runtime(),
    select:id=>workspace.snapshot().view==='scene'?scene3dEditor.select(id):select(id),
    pause:()=>{pause();if(workspace.snapshot().view==='scene')scene3dEditor.seek(scene3dEditor.selection().time);},
    gesture:{begin:()=>store.begin(),preview:commands=>{store.preview(p=>commands.forEach(c=>applyCommand(p,c)));ui.dirty=true;if(workspace.snapshot().view==='scene')scene3dEditor.refresh({animation:true,appearance:true,nodeIds:[scene3dEditor.selection().selected]});},commit:()=>store.commit(),cancel:()=>store.cancel()}
  });
  // Agent commands and UI both mutate the same validated project store.

  window.shapeshiftStudio=window.puppetStudio={fx:fxEditor,bodyJoins,references,referenceNavigation,entities,behaviours,library,resolved,recording:gestureRecorder,canvasControls,workspace,artwork,styles,timeline,environment,ownership,actions,sound,arena,graph:mode=>store.graph.inspect(mode),history:()=>({revision:store.revision,undo:store.undoStack.length,redo:store.redoStack.length,lastChange:store.lastChange}),scene3d:scene3dEditor,capabilities,dispatch:async command=>{const result=dispatch(command);await pendingImages?.promise;return result;},seek:t=>{pause();setTime(t,false);return presentationAt(clip(),ui.time);},render:async(time=ui.time,options={})=>{await refreshImages();return renderFrame(project(),images,clip(),time,options);},snapshot:()=>({project:clone(project()),lights:lightingFrame(project(),clip(),motionTime(),activePose(),overrides2()).lights??[],ui:{selected:ui.selected,clip:ui.clip,time:ui.time,mode:ui.mode,tool:ui.tool,playing:ui.playing,zoom:ui.zoom,pan:{...ui.pan},width:ui.width,height:ui.height},pose:[...activePose()].map(([id,p])=>({id,world:p.world,ikTarget:p.ikTarget,ikError:p.ikError,contactTarget:p.contactTarget,contactError:p.contactError})),handles:pieceHandles(),imageCount:images.size})};
  liveAPI=createLiveAPI(createEditorHost({studio:window.shapeshiftStudio,store,project,ui,dispatch,select,setMode,setTool,setTime,fit,pause,togglePlay,renderUI,importJSON,importArt,exportPlayer,timelineContext}));
  window.shapeshiftStudio.api=liveAPI;
  const connection=connectEditor(liveAPI,{name:()=>project().name,revision:()=>store.revision});
  liveAPI.connection=connection;
  if(new URLSearchParams(location.search).get('example')==='body-joins')await openJoinExample();
  if(new URLSearchParams(location.search).has('body-joins'))bodyJoins.show();
  if(new URLSearchParams(location.search).has('entities'))entities.show();
  if(new URLSearchParams(location.search).has('3d'))await workspace.show('scene');
  if(new URLSearchParams(location.search).has('artwork'))await workspace.show('artwork');
  if(new URLSearchParams(location.search).has('motion-tools'))$('motion-tools').click();
}
guard(start);
