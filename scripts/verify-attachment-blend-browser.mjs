import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {illustratedMaterialInputs as watcherMaterialInputs} from '@shapeshift-labs/studio-core/scene3d/core/materials';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.setDefaultTimeout(30000);
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=hybrid');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.puppets.entries.size===8&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 console.log('loaded');await page.locator('.s3-procedural [data-close]').click();await page.evaluate(()=>window.shapeshiftStudio.scene3d.select('leg-0-link-0'));
 await page.locator('summary').filter({hasText:/^Attachment blend$/}).click();const toggle=page.locator('[data-puppet-join]');assert.equal(await toggle.isChecked(),false);
 console.log('enable');if(!await toggle.isVisible())await page.locator('summary').filter({hasText:/^Attachment blend$/}).click();await toggle.check();console.log('checked');await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.join?.enabled);
 console.log('join ready');assert.equal(await page.locator('[data-field="puppet.join.target"]').inputValue(),'shell');
 await page.locator('[data-field="puppet.join.length"]').fill('.3');await page.locator('[data-field="puppet.join.length"]').dispatchEvent('change');
 await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.join?.length===.3);
 console.log('undo');await page.locator('#undo').click();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.join?.length===.15);
 console.log('undo');await page.locator('#undo').click();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&!window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.join?.enabled);
 console.log('enable');if(!await toggle.isVisible())await page.locator('summary').filter({hasText:/^Attachment blend$/}).click();await toggle.check();console.log('checked');await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.join?.enabled);
 await page.screenshot({path:'work/attachment-blend-controls.png'});
 console.log('ui passed');const proof=await page.evaluate(async inputs=>{
  const api=window.shapeshiftStudio,project=structuredClone(api.snapshot().project),original=JSON.stringify(project),{createScenePlayer}=await import('./scene3d/runtime.js'),canvas=document.createElement('canvas'),p=await createScenePlayer(canvas,project,{width:640,height:480}),r=p.scene,rows=[],images={};
  const pixels=entry=>entry.canvas.getContext('2d').getImageData(0,0,entry.canvas.width,entry.canvas.height).data.slice();
  for(const pipeline of ['standard','illustrated']){
   if(pipeline==='illustrated')project.scene3d.rendering={pipeline,inputs};else delete project.scene3d.rendering;
   await r.load(project);const n=project.scene3d.nodes.find(n=>n.id==='leg-0-link-0');
   for(const time of [0,1]){
    n.puppet.join.enabled=false;await r.sync(project,{animation:true});r.seek(time,'walk');r.render(true);const entry=r.puppets.entries.get(n.id),before=pixels(entry),matrix=entry.mesh.matrixWorld.toArray(),raw=entry.canvas.toDataURL();
    if(time===0)images[pipeline+'-off']=canvas.toDataURL();
    n.puppet.join.enabled=true;await r.sync(project,{animation:true});r.seek(time,'walk');r.render(true);const after=pixels(entry);let changed=0,alphaChanged=0,outside=0;for(let i=0;i<before.length;i++){if(before[i]!==after[i]){changed++;if(i%4===3)alphaChanged++;if(Math.floor(i/4/entry.canvas.width)<entry.canvas.height/2)outside++;}}
    const matrixSame=JSON.stringify(matrix)===JSON.stringify(entry.mesh.matrixWorld.toArray());
    if(time===0){images[pipeline+'-on']=canvas.toDataURL();images[pipeline+'-art-on']=entry.canvas.toDataURL();images[pipeline+'-art-off']=raw;}
    n.puppet.join.enabled=false;await r.sync(project,{animation:true});r.seek(time,'walk');r.render(true);const restored=entry.canvas.toDataURL()===raw;
    rows.push({pipeline,time,changed,alphaChanged,outside,matrixSame,restored});
   }
  }
  p.dispose();project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.join.enabled=true;delete project.scene3d.rendering;return {rows,images,authoredUnchanged:JSON.stringify(project)===original};
 },watcherMaterialInputs);
 await fs.mkdir('work',{recursive:true});for(const [name,data]of Object.entries(proof.images))await fs.writeFile('work/attachment-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));delete proof.images;
 await fs.writeFile('work/attachment-blend-proof.json',JSON.stringify({errors,...proof},null,2));console.log(JSON.stringify({errors,...proof},null,2));assert.deepEqual(errors,[]);assert.ok(proof.authoredUnchanged);for(const r of proof.rows){assert.ok(r.changed>0,JSON.stringify(r));assert.equal(r.alphaChanged,0);assert.equal(r.outside,0);assert.ok(r.matrixSame);assert.ok(r.restored);}
}finally{await browser.close();}
