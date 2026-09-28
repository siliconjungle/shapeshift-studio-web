// npm run build; npm start; node scripts/verify-procedural-library-browser.mjs
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true}),errors=[];
try{
 await fs.mkdir('work',{recursive:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 async function captureUI(page,name){
  await page.locator('#library-open').click();const panel=page.locator('#library-panel');
  await panel.locator('.library-capture').evaluate(el=>el.open=true);await panel.locator('[data-name]').fill(name);await panel.locator('[data-capture-kind]').selectOption('characters');await panel.locator('[data-capture]').click();
  await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.library?.items.length===1);
  await panel.locator('[data-item]').hover();await page.waitForFunction(()=>window.shapeshiftStudio.library.snapshot().previewState?.frames>=3,{},{timeout:60000});
  return panel;
 }
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=walker');await page.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Walking limbs');
 await page.locator('#procedural-panel [data-close]').click();const panel=await captureUI(page,'Walking component');
 await page.screenshot({path:'work/procedural-library-2d.png'});
 const download=page.waitForEvent('download');await panel.locator('[data-export]').click();const file=await download;await file.saveAs('work/walking-component.shapeshift-library.json');
 const packet=JSON.parse(await fs.readFile('work/walking-component.shapeshift-library.json','utf8'));assert.equal(packet.item.procedural.chains.length,4);assert.equal(packet.item.procedural.supports.length,1);
 // Import through the real file control into a separate project and browser storage.
 const destination=await browser.newContext({viewport:{width:1440,height:1000}}),other=await destination.newPage();other.on('pageerror',e=>errors.push(e.message));
 await other.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=reach');await other.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Reaching tentacles');
 await other.locator('#procedural-panel [data-close]').click();await other.locator('#library-import-file').setInputFiles('work/walking-component.shapeshift-library.json');
 await other.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.library?.items.length===1);await other.locator('#library-panel [data-place]').click();
 await other.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.chains.length===7);
 const imported=await other.evaluate(()=>{const api=window.shapeshiftStudio;api.seek(2);const s=api.snapshot(),root=s.project.joints.find(n=>n.librarySource),link=root.librarySource.procedural;return{chains:s.project.procedural.chains.length,gaits:s.project.procedural.gaits.length,connections:s.project.procedural.connections.length,finite:s.procedural.points.every(([,p])=>p.every(Number.isFinite)),owned:s.project.procedural.particles.filter(p=>p.owner===root.id).length,gravity:s.project.procedural.particles.find(p=>p.id===link.bindings.particles['hip-0']).gravity};});
 assert.equal(imported.gaits,1);assert.equal(imported.owned,16);assert.equal(imported.finite,true);assert.deepEqual(imported.gravity,[0,0]);await destination.close();
 // Native 3D shelf preview must include the independent leg primitives too.
 await context.clearCookies();await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=walker');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.sample?.procedural?.chains.length===8&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 // The study replaces the scene while leaving the reusable shelf intact.
 await page.evaluate(async()=>{const api=window.shapeshiftStudio;for(const item of api.snapshot().project.library?.items??[])await api.dispatch({op:'library.remove',id:item.id});});
 await page.locator('.s3-procedural [data-close]').click();const panel3=await captureUI(page,'Primitive spider');
 const native=await page.evaluate(()=>{const item=window.shapeshiftStudio.snapshot().project.library.items[0];return{nodes:item.nodes.length,chains:item.procedural.chains.length,terrains:item.procedural.terrains.length,preview:window.shapeshiftStudio.library.snapshot().previewState};});
 assert.equal(native.nodes,60);assert.equal(native.chains,8);assert.equal(native.terrains,2);assert.ok(native.preview.frames>=3);
 await page.screenshot({path:'work/procedural-library-3d.png'});
 await page.evaluate(async()=>{const api=window.shapeshiftStudio,item=api.snapshot().project.library.items[0];api.library.hide();await api.dispatch({op:'library.place',id:item.id,instance:'moved-spider',position:[10,1.6,-2.4]});});
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().objects.has('moved-spider'));
 await page.evaluate(async()=>{const api=window.shapeshiftStudio,p=api.snapshot().project,root=p.scene3d.nodes.find(n=>n.id==='moved-spider'),id=root.librarySource.procedural.bindings.chains['leg-0'];p.scene3d.procedural.chains.find(c=>c.id===id).stepHeight=.8;await api.dispatch({op:'scene3d.settings',values:{procedural:p.scene3d.procedural}});api.scene3d.select('moved-spider');api.library.show(p.library.items[0].id);});
 await panel3.locator('[data-update]').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.library.items[0].revision===2);
 const published=await page.evaluate(()=>{const p=window.shapeshiftStudio.snapshot().project;return{sourceFloor:p.library.items[0].nodes.find(n=>n.id==='floor').position,originalFloor:p.scene3d.nodes.find(n=>n.id==='floor').position,lift:p.scene3d.procedural.chains.find(c=>c.id==='leg-0').stepHeight};});
 assert.deepEqual(published.sourceFloor,[0,-.2,0]);assert.deepEqual(published.originalFloor,[0,-.2,0]);assert.equal(published.lift,.8);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,imported,native,published},null,2));
}finally{await browser.close();}
