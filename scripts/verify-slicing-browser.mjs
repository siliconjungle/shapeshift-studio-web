import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {slicingDefaults} from '../puppet-studio/slicing/model.js';
import {sceneDefaults,nodeDefaults} from '../puppet-studio/scene3d/schema.js';
import {svgText} from '../puppet-studio/vector/model.js';
import {illustratedMaterialInputs as watcherMaterialInputs} from '@shapeshift-labs/studio-core/scene3d/core/materials';
const rect=(id,x,y,w,h,fill)=>({id,name:id,commands:['M','L','L','L','Z'],points:[x,y,x+w,y,x+w,y+h,x,y+h],fill,stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero',lineCap:'butt',lineJoin:'miter',hidden:false,locked:false});
const vector={version:1,viewBox:[0,0,100,100],duration:2,loop:false,swatches:[],tracks:[],shapes:[rect('background',0,0,100,100,'#e5c47c'),rect('middle',20,20,60,60,'#447b78'),rect('left',0,0,20,20,'#ba4d47'),rect('right',80,0,20,20,'#496887'),rect('bottom',0,80,20,20,'#6a8146')]};
const scene=sceneDefaults();scene.camera={...scene.camera,position:[10,7,12],target:[0,3,0],size:9};scene.environment.background='#e5dfd3';scene.materials[0].scribble=0;scene.materials[0].ink=.6;
const profile=[[0,0],[.8,0],[.8,.2],[.55,.2],[.55,1.8],[.8,1.8],[.8,2],[0,2]];
scene.nodes=[{...nodeDefaults('pillar','lathe'),name:'Resizable pillar',profile,position:[1.6,3,0]},{...nodeDefaults('reference','lathe'),name:'Original pillar',profile,position:[-1.6,1,0]}];
const project={format:'inkwell-puppet',version:1,name:'N-slicing verification',assets:[{id:'frame',name:'Vector frame',src:'data:image/svg+xml,'+encodeURIComponent(svgText(vector)),vector}],joints:[{id:'root',name:'Resizable frame',parent:null,layer:0,rest:{x:0,y:0,rotation:0,scaleX:1,scaleY:1},sprite:{asset:'frame',width:100,height:100,pivotX:.5,pivotY:.5}}],clips:[{id:'idle',name:'Idle',duration:2,fps:30,loop:false,tracks:{}}],scene3d:scene};
await build({stdin:{contents:"export * from './puppet-studio/slicing/canvas.js'; export * from './puppet-studio/slicing/model.js'; export * as T from './puppet-studio/scene3d/vendor.js';",resolveDir:process.cwd()},bundle:true,format:'esm',outfile:'dist/slicing-test.js'});
await fs.mkdir('work/slicing',{recursive:true});const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html');await page.waitForFunction(()=>window.shapeshiftStudio);
 await page.locator('#file-input').setInputFiles({name:'slicing.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.name==='N-slicing verification');
 await page.evaluate(()=>window.shapeshiftStudio.workspace.show('puppet'));
 const inspector=page.locator('#inspector');await inspector.locator('summary').filter({hasText:/^N-slicing$/}).click();await inspector.locator('[data-slicing="enabled"]').check();
 const field=async(locator,value)=>{await locator.fill(String(value));await locator.press('Tab');};
 await field(inspector.locator('[data-field="sprite.width"]'),240);await field(inspector.locator('[data-field="sprite.height"]'),150);
 const sprite=()=>page.evaluate(()=>window.shapeshiftStudio.snapshot().project.joints[0].sprite);
 assert.deepEqual((await sprite()).slicing.sourceSize,[100,100]);assert.equal((await sprite()).width,240);
 await field(inspector.getByLabel('X slicing cuts'),'10, 30, 50, 80');assert.equal((await sprite()).slicing.axes[0].cuts.length,4);
 await inspector.locator('[data-slicing-band="0:0"]').click();assert.equal((await sprite()).slicing.axes[0].fixed[0],false);
 await page.locator('#undo').click();assert.equal((await sprite()).slicing.axes[0].fixed[0],true);
 // Restore the 20/80 frame bands without changing the captured reference size.
 await field(inspector.getByLabel('X slicing cuts'),'20, 80');await inspector.locator('summary').filter({hasText:/^N-slicing$/}).scrollIntoViewIfNeeded();await page.screenshot({path:'work/slicing/editor-2d.png'});
 const proof2d=await page.evaluate(async()=>{
  const {drawSlicedImage,slicingDefaults}=await import('/slicing-test.js'),{loadImages,renderFrame,validateProject}=await import('./runtime.js');
  const project=window.shapeshiftStudio.snapshot().project,images=await loadImages(project);validateProject(JSON.parse(JSON.stringify(project)));
  const output=renderFrame(project,images,project.clips[0],0,{width:280,height:190,camera:[1,0,0,1,140,95]}),ctx=output.getContext('2d'),pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data);
  const checks=[pixel(25,25),pixel(39,39),pixel(41,41),pixel(255,25),pixel(25,165)];
  // Raster and cropped atlas paths use the same reference dimensions.
  const source=document.createElement('canvas');source.width=200;source.height=100;const sc=source.getContext('2d');sc.fillStyle='#111111';sc.fillRect(0,0,200,100);sc.fillStyle='#ff0000';sc.fillRect(100,0,20,100);sc.fillStyle='#00ff00';sc.fillRect(120,0,60,100);sc.fillStyle='#0000ff';sc.fillRect(180,0,20,100);
  const canvas=document.createElement('canvas');canvas.width=240;canvas.height=100;const rc=canvas.getContext('2d');drawSlicedImage(rc,source,slicingDefaults([100,100]),0,0,240,100,[.5,0,.5,1]);
  return {checks,crop:[19,22,217,220].map(x=>Array.from(rc.getImageData(x,50,1,1).data))};
 });
 assert.deepEqual(proof2d.checks,[[186,77,71,255],[186,77,71,255],[68,123,120,255],[73,104,135,255],[106,129,70,255]]);assert.deepEqual(proof2d.crop,[[255,0,0,255],[0,255,0,255],[0,255,0,255],[0,0,255,255]]);
 await page.evaluate(()=>window.shapeshiftStudio.workspace.show('scene'));await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading);await page.evaluate(()=>window.shapeshiftStudio.scene3d.select('pillar'));
 const sceneFields=page.locator('#s3-fields');await sceneFields.locator('summary').filter({hasText:/^N-slicing$/}).click();await sceneFields.locator('[data-slicing="enabled"]').check();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes[0].slicing?.enabled);
 await field(sceneFields.locator('[data-field="dimensions.1"]'),6);await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes[0].dimensions[1]===6);
 await page.locator('#undo').click();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes[0].dimensions[1]===2);
 await page.locator('#redo').click();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes[0].dimensions[1]===6);
 await sceneFields.locator('summary').filter({hasText:/^N-slicing$/}).scrollIntoViewIfNeeded();await page.screenshot({path:'work/slicing/editor-3d.png'});
 const proof3d=await page.evaluate(async inputs=>{
  const {createScenePlayer}=await import('./scene3d/runtime.js'),{T,slicingDefaults}=await import('/slicing-test.js'),project=window.shapeshiftStudio.snapshot().project,rows=[],images={};
  const canvas=document.createElement('canvas');document.body.append(canvas);canvas.style.cssText='position:fixed;left:0;top:0;width:640px;height:640px;pointer-events:none';
  // A face-decorated panel exercises source UVs and zoom-driven SVG LOD rebuilds.
  project.scene3d.nodes.push({...structuredClone(project.scene3d.nodes[0]),id:'panel',name:'Panel',type:'box',position:[-4,2.5,0],dimensions:[2,5,.2],slicing:slicingDefaults([2,2,.2]),surfaces:{front:{asset:'frame'}}});
  const player=await createScenePlayer(canvas,project,{width:640,height:640}),runtime=player.scene;
  const measure=()=>{const mesh=runtime.pickables.find(m=>m.userData.node==='pillar'&&!m.userData.face),p=mesh.geometry.attributes.position,ys=[];for(let i=0;i<p.count;i++)if(Math.hypot(p.getX(i),p.getZ(i))>.99&&p.getY(i)>2.5)ys.push(p.getY(i));mesh.geometry.computeBoundingBox();return {height:mesh.geometry.boundingBox.max.y-mesh.geometry.boundingBox.min.y,capHeight:Math.max(...ys)-Math.min(...ys)};};
  for(const pipeline of ['standard','illustrated']){
   if(pipeline==='illustrated'){project.scene3d.rendering={pipeline,inputs};project.scene3d.nodes.find(n=>n.id==='panel').illustration={chamfer:.08};}else delete project.scene3d.rendering;
   await runtime.load(project);runtime.seek(0);runtime.render(true);images[pipeline]=canvas.toDataURL();const measured=measure();
   const point=new T.Vector3(1.6,5.9,0).project(runtime.camera),box=canvas.getBoundingClientRect(),hit=runtime.pick(box.left+(point.x+1)*box.width/2,box.top+(1-point.y)*box.height/2);
   const face=runtime.pickables.find(m=>m.userData.node==='panel'&&m.userData.face==='front')??runtime.pipeline?.faces.find(f=>f.mesh.userData.node==='panel')?.mesh;
   const before=face?.geometry.attributes.position.count;runtime.camera.zoom=2;runtime.camera.updateProjectionMatrix();if(runtime.pipeline){runtime.pipeline.wantedBucket=null;await runtime.updateVectorDetail();runtime.pipeline.zoomAt=0;}await runtime.updateVectorDetail();runtime.render(true);
   const faceGeo=face?.geometry;faceGeo?.computeBoundingBox();rows.push({pipeline,...measured,picked:hit?.object.userData.node,faceHeight:faceGeo?.boundingBox.max.y-faceGeo?.boundingBox.min.y,faceBefore:before,faceAfter:faceGeo?.attributes.position.count});
  }
  player.dispose();canvas.remove();return {rows,images};
 },watcherMaterialInputs);
 for(const row of proof3d.rows){assert.ok(Math.abs(row.height-6)<1e-5,JSON.stringify(row));assert.ok(Math.abs(row.capHeight-.2)<1e-5,JSON.stringify(row));assert.equal(row.picked,'pillar');assert.ok(Math.abs(row.faceHeight-(row.pipeline==='illustrated'?4.92:5))<1e-5,JSON.stringify(row));}
 for(const [name,data]of Object.entries(proof3d.images))await fs.writeFile(`work/slicing/${name}.png`,Buffer.from(data.split(',')[1],'base64'));delete proof3d.images;
 assert.deepEqual(errors,[]);await fs.writeFile('work/slicing/results.json',JSON.stringify({errors,proof2d,proof3d},null,2));console.log(JSON.stringify({errors,proof2d,proof3d},null,2));
}finally{await browser.close();await fs.rm('dist/slicing-test.js',{force:true});}
