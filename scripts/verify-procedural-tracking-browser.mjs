// npm run build; npm start; node scripts/verify-procedural-tracking-browser.mjs
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=tracking');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.sample?.procedural?.trackers?.length===3&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 const section=page.locator('[data-tracking]');await section.evaluate(el=>el.open=true);await section.locator('[data-tracker]').selectOption('left-tracking');
 await section.locator('[data-yaw]').fill('-35, 20');await section.locator('[data-response]').fill('18');await section.locator('[data-save]').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.trackers.find(t=>t.id==='left-tracking').response===18);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.trackers.find(t=>t.id==='left-tracking').response===14);
 await page.locator('#redo').click();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.trackers.find(t=>t.id==='left-tracking').response===18);
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.seek(4));
 const proof=await page.evaluate(async()=>{
  const api=window.shapeshiftStudio,r=api.scene3d.runtime(),project=JSON.parse(JSON.stringify(api.snapshot().project)),{createScenePlayer}=await import('./scene3d/runtime.js'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.style.display='none';document.body.append(canvas);
  const player=await createScenePlayer(canvas,project,{width:640,height:480});player.seek(4,'walk');
  let maxMatrixError=0;for(const id of ['head','left-eye','right-eye','left-pupil','right-pupil'])for(let i=0;i<16;i++)maxMatrixError=Math.max(maxMatrixError,Math.abs(r.objects.get(id).matrixWorld.elements[i]-player.scene.objects.get(id).matrixWorld.elements[i]));
  const result={maxMatrixError,trackers:player.scene.sample.procedural.trackers,chains:player.scene.sample.procedural.chains.length,image:canvas.toDataURL('image/png')};player.seek(1,'walk');result.frontImage=canvas.toDataURL('image/png');player.dispose();canvas.remove();return result;
 });
 assert.equal(proof.trackers.length,3);assert.equal(proof.chains,4);assert.ok(proof.maxMatrixError<1e-8);const left=proof.trackers.find(t=>t.id==='left-tracking');assert.ok(left.yaw>=-35*Math.PI/180-1e-8&&left.yaw<=20*Math.PI/180+1e-8);assert.deepEqual(errors,[]);
 await fs.mkdir('work',{recursive:true});await fs.writeFile('work/procedural-tracking-portable.png',Buffer.from(proof.image.split(',')[1],'base64'));await fs.writeFile('work/procedural-tracking-front.png',Buffer.from(proof.frontImage.split(',')[1],'base64'));await page.screenshot({path:'work/procedural-tracking-editor.png'});delete proof.image;delete proof.frontImage;console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();}
