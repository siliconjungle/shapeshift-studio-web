// npm run build; npm start; node scripts/verify-procedural-movement-browser.mjs
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=seeking');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.sample?.procedural?.movers?.length===1&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 const section=page.locator('[data-movement]');await section.evaluate(el=>el.open=true);await section.locator('[data-mover]').selectOption('body-movement');
 await section.locator('[data-moveSpeed]').fill('.7');await section.locator('[data-turnSpeed]').fill('45');await section.locator('[data-save]').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.movers[0].moveSpeed===.7);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.movers[0].moveSpeed===.9);
 await page.locator('#redo').click();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.movers[0].moveSpeed===.7);
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.seek(4));
 const proof=await page.evaluate(async()=>{
  const api=window.shapeshiftStudio,r=api.scene3d.runtime(),project=JSON.parse(JSON.stringify(api.snapshot().project)),{createScenePlayer}=await import('./scene3d/runtime.js'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.style.display='none';document.body.append(canvas);
  const player=await createScenePlayer(canvas,project,{width:640,height:480});player.seek(4,'walk');let maxMatrixError=0;
  for(const id of ['walker','head','left-eye','right-eye',...project.scene3d.procedural.chains.flatMap(c=>c.segments)])for(let i=0;i<16;i++)maxMatrixError=Math.max(maxMatrixError,Math.abs(r.objects.get(id).matrixWorld.elements[i]-player.scene.objects.get(id).matrixWorld.elements[i]));
  const p=player.scene.sample.procedural,result={maxMatrixError,mover:p.movers[0],trackers:p.trackers.length,grounded:p.chains.filter(c=>c.grounded).length,maxReachError:Math.max(...p.chains.map(c=>c.error)),rootHasKeys:project.scene3d.clips[0].tracks.some(t=>t.node==='walker'),turnSpeed:project.scene3d.procedural.movers[0].turnSpeed,image:canvas.toDataURL('image/png')};player.dispose();canvas.remove();return result;
 });
 assert.equal(proof.maxMatrixError,0);assert.equal(proof.trackers,3);assert.ok(proof.grounded>=2);assert.ok(proof.maxReachError<.01);assert.equal(proof.rootHasKeys,false);assert.ok(Math.hypot(...proof.mover.offset)>.5);assert.ok(Math.abs(proof.turnSpeed-Math.PI/4)<1e-10);assert.deepEqual(errors,[]);
 await fs.mkdir('work',{recursive:true});await fs.writeFile('work/procedural-movement-portable.png',Buffer.from(proof.image.split(',')[1],'base64'));await page.screenshot({path:'work/procedural-movement-editor.png'});delete proof.image;console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();}
