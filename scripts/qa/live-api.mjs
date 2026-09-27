import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createStudioServer} from '../api-server.mjs';

const exec=promisify(execFile),server=createStudioServer();
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--mute-audio']});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const cli=async(...args)=>{try{return JSON.parse((await exec(process.execPath,['scripts/studio.mjs',...args,'--url',url],{maxBuffer:40*1024*1024})).stdout);}catch(error){if(error.stdout||error.stderr)return JSON.parse(error.stdout||error.stderr);throw error;}};
let session;
async function call(op,args={},extra={}){const response=await cli('call',op,'--session',session,'--json',JSON.stringify(args),...extra.revision!==undefined?['--revision',String(extra.revision)]:[]);assert.equal(response.ok,true,JSON.stringify(response));return response;}
try{
 await page.goto(url+'/puppet-studio/index.html');await page.waitForFunction(()=>window.puppetStudio?.api?.connection.status().connected);
 session=(await cli('sessions')).sessions[0].id;
 await call('workspace.open',{view:'scene'});
 const autoplay=await cli('call','playback.set','--session',session,'--json',JSON.stringify({playing:true}),'--timeout','2000');assert.ok(autoplay.ok||/enable sound/.test(autoplay.error?.message??''),JSON.stringify(autoplay));
 await call('playback.set',{playing:false});await call('playback.set',{playing:true,audible:false});assert.equal((await call('editor.invoke',{target:'scene3d',method:'snapshot'})).result.playing,true);await call('playback.set',{playing:false});await call('workspace.open',{view:'puppet'});
 const initial=await call('editor.inspect',{project:true});assert.equal(initial.result.workspace.view,'puppet');console.log('Connected CLI to editor',session);
 await call('document.dispatch',{commands:[{op:'project.rename',name:'API round trip'},{op:'joint.add',id:'api-origin',parent:initial.result.project.joints[0].id}]});
 assert.equal(await page.inputValue('#project-name'),'API round trip');
 await call('history.undo');assert.equal((await call('document.read')).result.joints.some(j=>j.id==='api-origin'),false);
 await call('history.redo');await call('selection.set',{id:'api-origin'});await call('editor.mode',{mode:'rig'});await call('editor.tool',{tool:'rotate'});
 await call('viewport.set',{zoom:1.2,pan:{x:12,y:-8}});
 const stale=await cli('call','document.dispatch','--session',session,'--revision','-1','--json',JSON.stringify({commands:{op:'project.rename',name:'Stale'}}));assert.equal(stale.error.code,'REVISION_CONFLICT');
 await call('editor.invoke',{target:'timeline',method:'hide'});await call('ui.activate',{id:'new-clip'});await call('ui.set',{id:'clip-name',value:'API animation'});await call('ui.activate',{id:'apply-clip'});
 assert.equal((await call('document.read')).result.clips.at(-1).name,'API animation');
 // Human drafts and active hardware gestures must never be swallowed by AI work.
 await page.fill('#project-name','Human draft');
 let conflict=await cli('call','document.dispatch','--session',session,'--json',JSON.stringify({commands:{op:'project.rename',name:'Overwrite'}}));assert.equal(conflict.error.code,'EDITOR_BUSY');
 await page.locator('#project-name').press('Tab');assert.equal((await call('document.read')).result.name,'Human draft');
 await call('document.dispatch',{commands:{op:'project.rename',name:'API round trip'}});
 await page.mouse.move(800,300);await page.mouse.down();
 conflict=await cli('call','history.undo','--session',session);assert.equal(conflict.error.code,'EDITOR_BUSY');await page.mouse.up();
 await call('ui.activate',{id:'new-clip'});await page.fill('#clip-name','Unapplied human animation');await page.locator('#clip-duration').click();
 conflict=await cli('call','ui.close','--session',session);assert.equal(conflict.error.code,'EDITOR_BUSY');await page.locator('#dialog [data-close]').click();
 const old=(await call('ui.inspect')).result.controls.find(c=>c.id==='joint-name');assert.ok(old);
 const selectionContext=(await call('editor.inspect')).result.context;await call('selection.set',{id:'body'});
 const contextConflict=await cli('call','editor.tool','--session',session,'--context',selectionContext,'--json',JSON.stringify({tool:'move'}));assert.equal(contextConflict.error.code,'CONTEXT_CONFLICT');
 conflict=await cli('call','ui.set','--session',session,'--json',JSON.stringify({ref:old.ref,value:'Stale control'}));assert.match(conflict.error.message,/Stale/);
 const fresh=(await call('editor.inspect')).result.ui.controls.find(c=>c.id==='joint-name');await call('ui.set',{ref:fresh.ref,value:'Named through a live ref'});assert.equal((await call('document.read')).result.joints.find(j=>j.id==='body').name,'Named through a live ref');
 console.log('Revision, human draft, gesture and stale control checks passed');
 await call('workspace.open',{view:'artwork'});const art=(await call('editor.inspect')).result.artwork;assert.ok(art.asset);
 await call('editor.tool',{tool:'rect'});await call('ui.pointer',{id:'av-canvas',events:[{type:'pointerdown',x:100,y:100,button:0,buttons:1},{type:'pointermove',x:160,y:150,buttons:1},{type:'pointerup',x:160,y:150,button:0}]});
 const svg=await call('export',{format:'svg'});assert.ok(Buffer.from(svg.result.artifact.data,'base64').toString().includes('<svg'));
 await call('workspace.open',{view:'scene'});await call('ui.activate',{id:'s3-example'});
 assert.ok((await call('document.read')).result.scene3d.nodes.some(n=>n.id==='emitter'));
 await call('selection.set',{id:'emitter'});await call('playback.set',{time:0});
 const runtime=await call('runtime.event',{node:'emitter',event:'activate'});assert.ok(runtime.result.emitter);
 await call('editor.tool',{tool:'translate'});await call('viewport.set',{camera:{type:'orthographic',position:[0,3,12],target:[0,1,0],size:8}});
 // Registered editor modules expose panel state and temporary channel overrides.
 for(const target of ['entities','library','styles','environment','ownership','actions','sound','bodyJoins','timeline','resolved','references']){
  await call('editor.invoke',{target,method:'show'});
 }
 await call('editor.invoke',{target:'behaviours',method:'show'});assert.equal((await call('ui.inspect')).result.modal.label,'Entity behaviour');await call('ui.close');
 await call('editor.invoke',{target:'sound',method:'hide'});await call('editor.invoke',{target:'entities',method:'hide'});await call('editor.invoke',{target:'library',method:'hide'});
 await call('workspace.open',{view:'preview'});await call('playback.set',{time:.2});await call('editor.invoke',{target:'arena',method:'saveReference'});assert.equal((await call('document.read')).result.preview.references.length,1);
 console.log('Scene, controller, panels and preview capture passed');
 await call('workspace.open',{view:'puppet'});
 const png=await call('export',{format:'png',options:{width:64,height:64}});assert.equal(Buffer.from(png.result.artifact.data,'base64')[0],137);
 const project=await call('export',{format:'project'});assert.equal(JSON.parse(Buffer.from(project.result.artifact.data,'base64')).name,'API round trip');
 // All portable render formats use the same rendering path as UI exports.
 for(const format of ['gif','sheet','frames','runtime','html','scene-html']){
  const output=await call('export',{format,options:{width:32,height:32,fps:1}});const value=output.result?.artifact??output.artifacts?.[0];assert.ok(value?.data,format);
 }
 await call('editor.invoke',{target:'entities',method:'show'});
 const packet=await call('ui.activate',{selector:'#entities-panel [data-export]'});assert.equal(JSON.parse(Buffer.from(packet.artifacts[0].data,'base64')).format,'shapeshift-entities');
 await call('editor.invoke',{target:'entities',method:'hide'});
 // Imported file bytes arrive through the same input handler, without OS dialogs.
 const input={name:'triangle.svg',type:'image/svg+xml',text:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><path d="M0 40L20 0L40 40Z" fill="red"/></svg>'};
 await call('ui.files',{id:'art-input',files:[input]});assert.ok((await call('document.read')).result.assets.some(a=>a.id==='triangle'));
 await call('ui.files',{id:'art-input',files:[{name:'raster.png',type:'image/png',base64:png.result.artifact.data}]});
 await call('panel.set',{panel:'fx',open:true});await call('ui.activate',{selector:'#fx-panel [data-fx-tab="sprite"]'});await call('ui.activate',{id:'fx-paint-image'});
 await call('ui.set',{selector:'.pixel-editor input[type=color]',value:'#00ff00'});
 await call('ui.pointer',{selector:'.pixel-editor canvas',events:[{type:'pointerdown',x:10,y:10},{type:'pointermove',x:30,y:30},{type:'pointerup',x:30,y:30}]});
 const painted=await call('ui.activate',{selector:'.pixel-editor [data-op="save"]'});assert.ok(painted.ok);assert.equal((await call('ui.inspect')).result.modal,null);
 assert.notEqual((await call('document.read')).result.assets.find(a=>a.id==='raster').src.split(',')[1],png.result.artifact.data);
 await call('ui.activate',{selector:'#fx-panel [data-fx-tab="render"]'});
 const answered=await cli('call','ui.activate','--session',session,'--json',JSON.stringify({id:'fx-text'}),'--answers','["API lettering"]');assert.equal(answered.ok,true,JSON.stringify(answered));
 const noAnswer=await cli('call','ui.activate','--session',session,'--json',JSON.stringify({id:'fx-text'}));assert.match(noAnswer.error.message,/needs an answer/);
 await call('panel.set',{panel:'fx',open:false});
 // Capture, place, export and import reusable content using live panel controls.
 await call('document.dispatch',{commands:{op:'library.capture',id:'api-piece',name:'API piece',category:'props',dimension:2,node:'raster'}});
 await call('editor.invoke',{target:'library',method:'show',args:['api-piece']});
 const library=await call('ui.activate',{selector:'#library-panel [data-export]'});assert.equal(JSON.parse(Buffer.from(library.artifacts[0].data,'base64')).format,'shapeshift-library');
 await call('ui.activate',{selector:'#library-panel [data-place]'});assert.ok((await call('document.read')).result.joints.some(j=>j.librarySource));await call('panel.set',{panel:'library',open:false});
 for(const panel of ['grading','motion','styles','environment','ownership','actions','sound','bodyJoins','timeline','resolved','references']){await call('panel.set',{panel,open:true});await call('panel.set',{panel,open:false});}
 await call('recording.set',{armed:true,tolerance:.1});assert.equal((await call('editor.inspect')).result.recording.armed,true);await call('recording.set',{armed:false});
 console.log('Pixel gestures, prompt answers, reusable Library content and panel lifecycle passed');
 // A delayed import must not replace edits made while its assets are loading.
 let loaded,release;const loading=new Promise(resolve=>loaded=resolve),gate=new Promise(resolve=>release=resolve);
 await page.route('**/slow-api.svg',async route=>{loaded();await gate;await route.fulfill({contentType:'image/svg+xml',body:input.text});});
 const imported={format:'inkwell-puppet',version:1,name:'Delayed import',assets:[{id:'slow',src:url+'/slow-api.svg'}],joints:[{id:'root',name:'Root',parent:null,rest:{x:0,y:0,rotation:0,scaleX:1,scaleY:1},layer:0,sprite:{asset:'slow',width:40,height:40,pivotX:.5,pivotY:.5}}],clips:[{id:'idle',name:'Idle',duration:1,fps:30,loop:true,tracks:{}}]};
 const importing=cli('call','import.project','--session',session,'--json',JSON.stringify({file:{name:'slow.json',text:JSON.stringify(imported)}}));await loading;
 await page.fill('#project-name','Human during import');await page.locator('#project-name').press('Tab');release();
 assert.match((await importing).error.message,/changed while importing/);assert.equal((await call('document.read')).result.name,'Human during import');
 await call('import.project',{file:{name:'restore.json',base64:project.result.artifact.data}});
 assert.equal((await call('document.read')).result.name,'API round trip');
 const restored=(await call('document.read')).result;await call('editor.invoke',{target:'resolved',method:'set',args:[{dimension:2,clip:restored.clips[0].id,selected:'root',time:0,mode:'animate'},'rotation',15]});
 await call('document.dispatch',{commands:{op:'project.replace',value:restored}});assert.equal((await call('editor.invoke',{target:'resolved',method:'snapshot'})).result.entries.length,0);
 console.log('File inputs, all export formats and delayed import protection passed');
 const second=await context.newPage();await second.goto(url+'/puppet-studio/index.html');await second.waitForFunction(()=>window.puppetStudio?.api?.connection.status().connected);
 assert.match((await cli('inspect')).error,/Choose an editor/);
 const originalSession=session;session=await second.evaluate(()=>window.puppetStudio.api.connection.status().id);
 await second.evaluate(()=>{AudioContext.prototype.resume=()=>new Promise(()=>{});});
 await call('workspace.open',{view:'scene'});const blockedAudio=await cli('call','playback.set','--session',session,'--json',JSON.stringify({playing:true}),'--timeout','5000');assert.match(blockedAudio.error?.message??'',/enable sound/);await call('playback.set',{playing:false});await call('document.read');session=originalSession;
 await second.close();
 const previous=session;await page.reload();await page.waitForFunction(()=>window.puppetStudio?.api?.connection.status().connected);session=await page.evaluate(()=>window.puppetStudio.api.connection.status().id);assert.notEqual(session,previous);
 const disconnected=await fetch(url+'/api/sessions/'+previous+'/call',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'history.undo'})});assert.equal(disconnected.status,410);
 console.log('Live API smoke passed; page errors:',errors);assert.deepEqual(errors,[]);
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
