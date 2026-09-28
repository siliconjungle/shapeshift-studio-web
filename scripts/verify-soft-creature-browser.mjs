// npm run build; npm start; node scripts/verify-soft-creature-browser.mjs
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=soft-creature');
 await page.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Soft creature attachments',{},{timeout:60000});
 const panel=page.locator('#procedural-panel');await panel.locator('[data-attachment]').selectOption('hip-0-attachment');await panel.locator('[data-attachment-weights]').fill('3, 7');await panel.locator('[data-attachment-x]').fill('4');await panel.locator('[data-attachment-y]').fill('28');await panel.locator('[data-update-attachment]').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.attachments.find(a=>a.id==='hip-0-attachment').weights[0]===3);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.attachments.find(a=>a.id==='hip-0-attachment').weights[0]===.2);
 await page.locator('#redo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.attachments.find(a=>a.id==='hip-0-attachment').weights[0]===3);
 await panel.locator('[data-surface]').selectOption('body-surface');await panel.locator('[data-layer-shape]').selectOption('0');
 await panel.locator('[data-curve]').fill('0.75');await panel.locator('[data-curve]').dispatchEvent('change');
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.surfaces[0].shapes[0].curve===.75);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.surfaces[0].shapes[0].curve===1);
 await page.locator('#redo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.surfaces[0].shapes[0].curve===.75);
 await page.evaluate(()=>window.shapeshiftStudio.seek(4));
 const proof=await page.evaluate(async()=>{
  const api=window.shapeshiftStudio,snapshot=api.snapshot(),p=JSON.parse(JSON.stringify(snapshot.project)),points=new Map(snapshot.procedural.points),a=p.procedural.attachments.find(a=>a.id==='hip-0-attachment');
  const from=points.get(a.orient[0]),to=points.get(a.orient[1]),dx=to[0]-from[0],dy=to[1]-from[1],length=Math.hypot(dx,dy),u=dx/length,v=dy/length,total=a.weights.reduce((s,v)=>s+v,0),expected=[0,0];a.sources.forEach((id,i)=>points.get(id).forEach((x,k)=>expected[k]+=x*a.weights[i]/total));expected[0]+=u*a.offset[0]-v*a.offset[1];expected[1]+=v*a.offset[0]+u*a.offset[1];
  const error=Math.hypot(...points.get(a.particle).map((v,i)=>v-expected[i])),body=p.procedural.areas[0],ring=body.particles.map(id=>points.get(id));let area=0;for(let i=0;i<ring.length;i++){const q=ring[(i+1)%ring.length];area+=ring[i][0]*q[1]-ring[i][1]*q[0];}
  const {loadImages,renderFrame}=await import('./runtime.js'),images=await loadImages(p),options={width:640,height:480,framing:{minX:-190,maxX:190,minY:-200,maxY:180},background:'#eef0e8'},actual=await api.render(4,options),portable=renderFrame(p,images,p.clips[0],4,options),left=actual.getContext('2d').getImageData(0,0,640,480).data,right=portable.getContext('2d').getImageData(0,0,640,480).data;let differingChannels=0;for(let i=0;i<left.length;i++)if(left[i]!==right[i])differingChannels++;
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.getContext('2d').drawImage(portable,0,0);
  return {curvature:p.procedural.surfaces[0].shapes[0].curve,attachmentError:error,areaRatio:area/2/body.area,contacts:snapshot.procedural.collisions.length,differingChannels,attachments:p.procedural.attachments.length,image:canvas.toDataURL('image/png')};
 });
 assert.equal(proof.curvature,.75);assert.ok(proof.attachmentError<1e-6);assert.ok(Math.abs(proof.areaRatio-1)<.01);assert.ok(proof.contacts>0);assert.equal(proof.differingChannels,0);assert.equal(proof.attachments,10);assert.deepEqual(errors,[]);
 await fs.mkdir('work',{recursive:true});await fs.writeFile('work/soft-creature-portable.png',Buffer.from(proof.image.split(',')[1],'base64'));delete proof.image;
 await panel.locator('[data-attachment]').scrollIntoViewIfNeeded();await page.screenshot({path:'work/soft-creature-editor.png'});
 console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();}
