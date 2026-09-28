import {loadImages} from '../runtime.js';
import {studioTransport,transportKey} from '../authoring/transport.js';
import {portableProject} from '../authoring/project-transfer.js';
import {svgText} from '../vector/model.js';
import {renderExport} from '../fx/export.js';
import {artifact} from './artifacts.js';
import {createUIControls} from './ui-controls.js';

export function createEditorHost({studio,store,project,ui,dispatch,select,setMode,setTool,setTime,fit,pause,togglePlay,renderUI,importJSON,importArt,exportPlayer,timelineContext}){
 const controls=createUIControls(),{workspace,artwork,scene3d,arena}=studio;
 const view=()=>workspace.snapshot().view;
 const panels={speech:'speech-panel',illustration:'illustration-panel',entities:'entities-panel',library:'library-panel',styles:'styles-panel',environment:'backdrop-panel',ownership:'ownership-panel',actions:'actions-panel',sound:'sound-panel',bodyJoins:'body-joins-panel',timeline:'shared-timeline',resolved:'resolved-panel',references:'references-panel',fx:'fx-panel',motion:'motion-tool-panel',grading:'grading-panel'};
 const modules={speech:['show','hide','snapshot'],illustration:['show','hide','snapshot'],
  workspace:['capture','restore','editPuppet','editArtwork','back','snapshot'],
  bodyJoins:['show','hide','focus'],references:['show','open','label','refresh'],referenceNavigation:['open','back','snapshot','clear'],
  entities:['show','hide','context','restore','snapshot'],behaviours:['show'],library:['show','hide','context','restore','snapshot','audition'],
  resolved:['show','set','release','edit','bake','read','refresh','snapshot'],recording:['snapshot'],
  canvasControls:['snapshot','refresh'],artwork:['openAsset','restore','seek','select','review','snapshot','fit'],
  styles:['show'],timeline:['show','hide','focus','snapshot'],environment:['show','snapshot'],ownership:['show','snapshot'],actions:['show'],sound:['show','hide','context','restore'],
  arena:['seek','saveReference','snapshot'],scene3d:['pause','addPuppet','inspectEvent','refreshFields','recordTime','seek','setClip','selection','select','snapshot','portable']
 };
 // The manifest only advertises methods actually supplied by this build.
 for(const [name,methods]of Object.entries(modules))modules[name]=methods.filter(method=>typeof studio[name]?.[method]==='function');
 const file=value=>new File([value.base64?Uint8Array.from(atob(value.base64),c=>c.charCodeAt(0)):value.text??''],value.name??'project.json',{type:value.type??'application/json'});
 function clip(){const context=timelineContext();return context.asset?project().assets.find(a=>a.id===context.asset)?.vector:(context.dimension===3?project().scene3d:project()).clips.find(c=>c.id===context.clip);}
 function selection(args){
  if(view()==='scene'){if(args.id!==null&&!project().scene3d.nodes.some(n=>n.id===args.id))throw Error('Unknown scene node');scene3d.select(args.id,args.face);}
  else if(view()==='artwork'){const state=artwork.snapshot(),ids=args.ids??[args.id];if(ids.some(id=>!project().assets.find(a=>a.id===state.asset)?.vector?.shapes.some(s=>s.id===id)))throw Error('Unknown artwork shape');return artwork.restore({...state,selection:ids});}
  else{if(!project().joints.some(j=>j.id===args.id))throw Error('Unknown joint');select(args.id);}
 }
 async function playback(args){
  const current=view();
  if(args.clip){const document=current==='scene'?project().scene3d:project();if(!document.clips.some(c=>c.id===args.clip))throw Error('Unknown animation');if(current==='scene')scene3d.setClip(args.clip);else if(current==='puppet'){pause();ui.clip=args.clip;setTime(0,false);renderUI();}else throw Error('Choose the clip in the rig or scene workspace');}
  if(args.time!==undefined){if(!Number.isFinite(args.time))throw Error('Time must be finite');if(current==='scene')scene3d.seek(args.time);else if(current==='artwork')artwork.seek(args.time);else if(current==='preview')arena.seek(args.time);else{pause();setTime(args.time,false);}}
  if(args.transport){const context=timelineContext();studioTransport.set(transportKey(context),clip().duration,args.transport);}
  if(args.playing!==undefined){
   if(current==='puppet'){if(!!args.playing!==ui.playing)await togglePlay();}
   else await (current==='scene'?scene3d:current==='artwork'?artwork:arena).playback(args);
  }
 }
 async function exportArtifact(args){
  const source=structuredClone(project()),currentClip=source.clips.find(c=>c.id===(args.clip??ui.clip))??source.clips[0];
  const name=source.name.replace(/[^a-zA-Z0-9_.-]+/g,'-');
  if(args.format==='project')return{artifact:await artifact(JSON.stringify(await portableProject(source),null,2),name+'.puppet.json')};
  if(args.format==='clip')return{artifact:await artifact(JSON.stringify({format:source.format+'-clip',version:1,clip:currentClip}),currentClip.id+'.animation.json')};
  if(args.format==='runtime'){const response=await fetch('./runtime.portable.js');if(!response.ok)throw Error('Runtime is unavailable');return{artifact:await artifact(await response.text(),'puppet-runtime.js','text/javascript')};}
  if(args.format==='html'){await exportPlayer();return;}
  if(args.format==='scene-html'){if(!source.scene3d)throw Error('Create a scene first');const {exportPlayer}=await import('../scene3d/export.js');return{artifact:await artifact(await exportPlayer(await portableProject(source),{runtimeURL:new URL('./scene3d/player.bundle.js',document.baseURI).href}),name+'.html','text/html')};}
  if(args.format==='svg'){const asset=source.assets.find(a=>a.id===(args.asset??artwork.snapshot().asset));if(!asset?.vector)throw Error('Open the artwork once to import its vector document');return{artifact:await artifact(svgText(asset.vector,args.time??artwork.snapshot().time),asset.id+'.svg','image/svg+xml')};}
  if(args.format==='view'){
   const canvas=document.getElementById({puppet:'canvas',scene:'s3-canvas',artwork:'av-canvas',preview:'arena-canvas'}[view()]);
   if(view()==='scene')scene3d.runtime().render();
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('The current view could not be captured');return{artifact:await artifact(blob,name+'-view.png','image/png')};
  }
  if(!['png','gif','sheet','frames'].includes(args.format))throw Error('Unknown export format');
  const images=await loadImages(source);let output;try{output=await renderExport(source,images,currentClip,{...args.options,format:args.format,...args.time!==undefined?{time:args.time}:args.format==='png'?{time:ui.time}:{}});}finally{for(const draw of images.models?.values()??[])draw.dispose?.();}
  return{artifact:await artifact(output.bytes,name+'.'+output.extension,output.type),metadata:output.metadata};
 }
 return{
  context:()=>({view:view(),puppet:{selected:ui.selected,clip:ui.clip,mode:ui.mode,tool:ui.tool},artwork:{asset:artwork.snapshot().asset,selection:artwork.snapshot().selection,tool:artwork.snapshot().tool},scene:{selected:scene3d.selection().selected,clip:scene3d.selection().clip,face:scene3d.selection().face,tool:scene3d.selection().tool,autoKey:document.getElementById('s3-autokey')?.checked}}),
  modules,panels:Object.keys(panels),capabilities:studio.capabilities,revision:()=>store.revision,pending:()=>!!store.pending||!!ui.drag,project:()=>structuredClone(project()),dispatch,
  inspect:()=>({workspace:workspace.capture(),puppet:{selected:ui.selected,clip:ui.clip,time:ui.time,mode:ui.mode,tool:ui.tool,playing:ui.playing,zoom:ui.zoom,pan:ui.pan},history:{undo:store.undoStack.length,redo:store.redoStack.length},artwork:artwork.snapshot(),scene:scene3d.selection(),preview:{...arena.snapshot(),current:undefined,saved:undefined},timeline:studio.timeline.snapshot(),recording:studio.recording.snapshot()}),
  async invoke(target,method,args){if(!Array.isArray(args))throw Error('Method args must be an array');const result=await studio[target][method](...args);return result;},
  async perform(op,args){
   if(op==='document.graph')return studio.graph(args.mode);
   if(op==='runtime.inspect'){const runtime=scene3d.runtime();return{scene:runtime?.snapshot()??null,controllers:(runtime?.pipeline?.controllers??runtime?.controllers)?.snapshot()??{}};}
   if(op==='history.undo'||op==='history.redo'){pause();scene3d.pause();store[op.slice(8)]();return;}
   if(op==='workspace.open')return workspace.show(args.view,{drill:!!args.drill});
   if(op==='workspace.back')return workspace.back();
   if(op==='recording.set'){if(args.tolerance!==undefined&&(!Number.isFinite(args.tolerance)||args.tolerance<0))throw Error('Tolerance must be non-negative');if(args.armed!==undefined)studio.recording.armed=!!args.armed;if(args.tolerance!==undefined)studio.recording.tolerance=args.tolerance;return studio.recording.snapshot();}
   if(op==='panel.set'){
    const id=panels[args.panel],element=id&&document.getElementById(id);if(!element)throw Error('Unknown panel');
    if(args.panel==='fx'){if(args.open)await workspace.show('puppet');studio.fx.show(!!args.open);return;}
    if(args.open){if(!element.hidden)return;if(studio[args.panel]?.show)return studio[args.panel].show();return controls.activate({id:{motion:'motion-tools',grading:'grading-open'}[args.panel]});}
    if(element.hidden)return;if(studio[args.panel]?.hide)return studio[args.panel].hide();
    const close=element.querySelector('[data-close],button[id$="-close"]');if(close)return controls.activate({selector:'#'+id+' '+(close.id?'#'+CSS.escape(close.id):'[data-close]')});
    element.hidden=true;return;
   }
   if(op==='selection.set')return selection(args);
   if(op==='editor.mode'){if(!['rig','animate'].includes(args.mode))throw Error('Mode must be rig or animate');return setMode(args.mode);}
   if(op==='editor.tool'){
    const valid={puppet:['move','rotate','scale','pivot','ik'],scene:['translate','rotate','scale'],artwork:['select','direct','pen','rect','ellipse','hand']}[view()];if(!valid?.includes(args.tool))throw Error('Unknown tool for this workspace');
    if(view()==='puppet')setTool(args.tool);else await controls.activate({selector:view()==='scene'?`#scene3d-editor [data-tool="${args.tool}"]`:`#artwork-editor [data-av-tool="${args.tool}"]`});return;
   }
   if(op==='viewport.fit'){if(view()==='artwork')artwork.fit();else if(view()==='puppet')fit();else if(view()==='scene')scene3d.setCamera(project().scene3d.camera);else throw Error('Use the preview camera controls');return;}
   if(op==='viewport.set'){
    if(view()==='scene'){if(!args.camera)throw Error('A camera definition is required');scene3d.setCamera(args.camera);return;}
    if(args.zoom!==undefined&&(!Number.isFinite(args.zoom)||args.zoom<=0))throw Error('Zoom must be positive');if(args.pan&&![args.pan.x,args.pan.y].every(Number.isFinite))throw Error('Pan must be finite');
    if(view()==='artwork')return artwork.restore({...artwork.snapshot(),...args});if(view()!=='puppet')throw Error('Use the preview camera controls');
    if(args.zoom!==undefined)ui.zoom=args.zoom;if(args.pan)ui.pan={...args.pan};ui.dirty=true;return;
   }
   if(op==='playback.set')return playback(args);
   if(op==='runtime.event'){const runtime=scene3d.runtime(),controllers=runtime?.pipeline?.controllers??runtime?.controllers,actor=controllers?.actors.get(args.node);if(!actor)throw Error('No live controller for this node');controllers.runtime.dispatch(actor.controller,args.event,args.data);controllers.render();runtime.invalidate();return controllers.snapshot();}
   if(op==='import.project')return importJSON(file(args.file));
   if(op==='import.artwork')return importArt(args.files.map(file),args.replace);
   if(op==='export')return exportArtifact(args);
   throw Error('Unknown operation '+op);
  }
 };
}
