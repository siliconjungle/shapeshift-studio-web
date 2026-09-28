import {queryCatalog,commandInfo,expandRecipe,featureCatalog} from '@shapeshift-labs/studio-core/catalog';
import {createUIControls} from './ui-controls.js';
import {clearActivityError,waitForActivity,activityState,reportActivityError} from './activity.js';
import {beginArtifacts,endArtifacts,beginAnswers,endAnswers} from './artifacts.js';

const contracts={
 'catalog.search':{query:'search terms (optional)',category:'category (optional)',scope:'core|web (optional)'},'catalog.feature':{id:'feature ID'},'catalog.recipe':{id:'recipe ID',inputs:'validated recipe inputs; returns requests without executing them'},'catalog.command':{op:'authoring command name'},
 'api.describe':{},'document.graph':{mode:'2d|3d'},'runtime.inspect':{},'editor.inspect':{project:'boolean (default false)'},'document.read':{},
 'document.dispatch':{commands:'command or command[]; one undo entry'},'document.patch':{patches:'{op:set|insert|remove|test,path:(string|integer)[],value?:JSON}[]'},
 'history.undo':{},'history.redo':{},'workspace.open':{view:'puppet|scene|artwork|preview',drill:'boolean'},'workspace.back':{},
 'panel.set':{panel:'panel name from api.describe',open:'boolean'},'recording.set':{armed:'boolean',tolerance:'non-negative number'},
 'selection.set':{id:'joint/node/shape ID',ids:'artwork shape IDs',face:'3D face'},
 'editor.mode':{mode:'rig|animate'},'editor.tool':{tool:'tool ID for the active workspace'},
 'viewport.set':{zoom:'2D zoom',pan:'{x,y}',camera:'3D camera definition'},'viewport.fit':{},
 'playback.set':{clip:'clip ID',time:'seconds',playing:'boolean',audible:'boolean for scene/preview playback',all:'play the scene sequence',transport:'{speed,loop,from,to}'},
 'runtime.event':{node:'controller node ID',event:'event name',data:'JSON payload'},
 'editor.invoke':{target:'module from modules',method:'method from modules',args:'positional JSON arguments'},
 'import.project':{file:'{name,type,text|base64}'},'import.artwork':{files:'{name,type,text|base64}[]',replace:'joint ID (optional)'},
 'export':{format:'project|clip|runtime|html|scene-html|svg|png|gif|sheet|frames|view',asset:'SVG asset ID',time:'seconds',options:'render export options'},
 'ui.inspect':{},'ui.activate':{ref:'current control ref (or id/unique selector)'},'ui.set':{ref:'current control ref (or id/unique selector)',value:'string|boolean',commit:'boolean'},
 'ui.files':{ref:'file control ref (or id/unique selector)',files:'{name,type,text|base64}[]'},
 'ui.focus':{ref:'current control ref (or id/unique selector)'},'ui.scroll':{ref:'control ref (or id/unique selector)',x:'pixels',y:'pixels'},
 'ui.close':{ref:'dialog ref; omit for top dialog'},'ui.key':{key:'key name',code:'physical key code',ctrlKey:'boolean',shiftKey:'boolean'},
 'ui.pointer':{ref:'canvas/control ref (or id/unique selector)',events:'[{type:pointerdown|pointermove|pointerup|pointercancel|dblclick|wheel,x,y,...PointerEvent options}]'},
 'ui.batch':{actions:'[{op:ui.set|ui.activate|...,args:{...}}]; ordered; not a document transaction'}
};
const reads=new Set(['catalog.search','catalog.feature','catalog.recipe','catalog.command','api.describe','editor.inspect','document.read','document.graph','runtime.inspect','ui.inspect']);
const jsonCopy=value=>value===undefined?null:JSON.parse(JSON.stringify(value));
const failure=(code,message)=>Object.assign(Error(message),{code});

export function createLiveAPI(host){
 const controls=createUIControls(),drafts=new Set(),pointers=new Set();let queue=Promise.resolve(),sequence=0,active=null;
 const subscribers=new Set();
 window.addEventListener('error',event=>{if(active)reportActivityError(event.error??event.message);});
 window.addEventListener('unhandledrejection',event=>{if(active)reportActivityError(event.reason);});
 document.addEventListener('input',event=>{if(event.isTrusted&&event.target.matches('input,textarea,[contenteditable=true]'))drafts.add(event.target);},true);
 document.addEventListener('change',event=>{if(event.isTrusted&&event.target.tagName!=='TEXTAREA'&&!event.target.closest('dialog'))drafts.delete(event.target);},true);
 document.addEventListener('click',event=>{
  if(!event.isTrusted)return;const button=event.target.closest('button'),scope=button?.closest('details,fieldset,dialog');if(!scope)return;const revision=host.revision();
  queueMicrotask(()=>{if(host.revision()>revision)for(const element of drafts)if(scope.contains(element))drafts.delete(element);});
 },true);
 document.addEventListener('pointerdown',event=>{if(event.isTrusted)pointers.add(event.pointerId);},true);
 for(const type of ['pointerup','pointercancel'])window.addEventListener(type,event=>pointers.delete(event.pointerId),true);
 window.addEventListener('blur',()=>pointers.clear());
 function busy(){for(const element of drafts)if(!element.isConnected||element.closest('dialog:not([open]),[hidden]'))drafts.delete(element);return host.pending()||pointers.size||drafts.size;}
 function contextKey(){return JSON.stringify(host.context());}
 function describe(){return{version:1,documentation:'docs/live-api.md',catalogue:{version:featureCatalog.version,features:featureCatalog.features.length,recipes:featureCatalog.recipes.length,offline:'npm run studio -- catalog',json:'features/catalog.json',documentation:'docs/features.md',search:'catalog.search'},examples:[{op:'workspace.open',args:{view:'artwork'}},{op:'panel.set',args:{panel:'timeline',open:true}},{op:'document.dispatch',args:{commands:{op:'joint.add',id:'socket',parent:'root'}}},{op:'document.patch',args:{patches:[{op:'set',path:['name'],value:'My project'}]}},{op:'ui.set',args:{ref:'use a ref from ui.inspect',value:'New value'}},{op:'export',args:{format:'project'}}],operations:contracts,modules:host.modules,panels:host.panels,commands:host.capabilities(),request:{op:'operation name',args:'operation arguments',expectedRevision:'optional committed project revision',expectedContext:'optional context token from editor.inspect',answers:'optional ordered native prompt answers'},rules:['Commands share the current editor and undo history.','UI refs expire when their elements are replaced. Inspect again after edits.','A busy human gesture or uncommitted human form returns EDITOR_BUSY.','Document batches are atomic; UI batches stop on error and retain completed actions.','Exports return base64 artifacts; no native file dialogs or arbitrary evaluation.']};}
 function inspect(args={}){return{...host.inspect(),context:contextKey(),ui:controls.inspect(),revision:host.revision(),busy:!!busy(),activity:activityState(),request:active,...args.project?{project:host.project()}: {}};}
 async function perform(op,args){
  if(op==='catalog.search')return queryCatalog({query:args.query,category:args.category,scope:args.scope});
  if(op==='catalog.feature')return queryCatalog({id:args.id??''});
  if(op==='catalog.recipe')return expandRecipe(args.id,args.inputs);
  if(op==='catalog.command')return commandInfo(args.op);
  if(op==='api.describe')return describe();
  if(op==='editor.inspect')return inspect(args);
  if(op==='document.read')return host.project();
  if(op==='document.dispatch')return host.dispatch(args.commands);
  if(op==='document.patch')return host.dispatch({op:'project.patch',patches:args.patches});
  if(op==='editor.invoke'){
   if(!host.modules[args.target]?.includes(args.method))throw failure('UNKNOWN_METHOD','Unknown editor method; see api.describe modules');
   return host.invoke(args.target,args.method,args.args??[]);
  }
  if(op==='ui.batch'){
   if(!Array.isArray(args.actions)||args.actions.length>100)throw Error('Expected up to 100 UI actions');
   const results=[];for(const action of args.actions){if(!action.op?.startsWith('ui.')||action.op==='ui.batch')throw Error('UI batch accepts UI actions only');results.push(await perform(action.op,action.args??{}));await waitForActivity();}return results;
  }
  if(op.startsWith('ui.')){const method=op.slice(3);if(!Object.hasOwn(controls,method))throw failure('UNKNOWN_OPERATION','Unknown UI operation');return controls[method](args);}
  if(!Object.hasOwn(contracts,op))throw failure('UNKNOWN_OPERATION','Unknown operation '+op);
  return host.perform(op,args);
 }
 async function execute(input){
  const before=host.revision(),id=input?.id??'browser-'+ ++sequence;let artifacts=[];active=id;
  try{
   if(!input||typeof input.op!=='string')throw Error('An operation is required');
   if(input.expectedRevision!==undefined&&input.expectedRevision!==before)throw failure('REVISION_CONFLICT',`Expected revision ${input.expectedRevision}, current revision is ${before}`);
   if(!reads.has(input.op)&&busy())throw failure('EDITOR_BUSY','Finish the current human gesture or form edit before running this operation.');
   // Let existing image/geometry work finish before beginning a new operation.
   await waitForActivity({errors:false});clearActivityError();
   if(input.expectedRevision!==undefined&&input.expectedRevision!==host.revision())throw failure('REVISION_CONFLICT','The project changed while waiting for editor work');
   if(!reads.has(input.op)&&busy())throw failure('EDITOR_BUSY','The editor has an unfinished human edit');
   if(input.expectedContext!==undefined&&input.expectedContext!==contextKey())throw failure('CONTEXT_CONFLICT','The human selection, view, or tool changed; inspect the editor again');
   beginArtifacts();beginAnswers(input.answers);
   const result=await perform(input.op,input.args??{});await waitForActivity();
   artifacts=await endArtifacts();
   return{ok:true,id,revision:host.revision(),result:jsonCopy(result),...artifacts.length?{artifacts}:{}};
  }catch(error){artifacts=await endArtifacts().catch(()=>[]);return{ok:false,id,revision:host.revision(),error:{code:error.code??'OPERATION_FAILED',message:error.message},...artifacts.length?{artifacts}:{}};}
  finally{endAnswers();active=null;}
 }
 const api={version:1,describe,inspect,call(input){const command=jsonCopy(input);const next=queue.then(()=>execute(command));queue=next.catch(()=>{});return next;},subscribe(listener){subscribers.add(listener);return()=>subscribers.delete(listener);},notify(reason,change){const event={type:'document.changed',reason,revision:host.revision(),scopes:change?.scopes??[]};for(const listener of subscribers)try{listener(event);}catch(error){console.error(error);}}};
 return api;
}
