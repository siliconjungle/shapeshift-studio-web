import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=sprite-walker');await page.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Sprite pieces with stepping limbs');
 const panel=page.locator('#procedural-panel');await panel.locator('[data-step-chain]').selectOption('leg-0');await panel.locator('[data-step-height]').fill('30');await panel.locator('[data-step-height]').press('Tab');
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.chains[0].stepHeight===30);
 const proof=await page.evaluate(async()=>{
  const api=window.shapeshiftStudio,p=JSON.parse(JSON.stringify(api.snapshot().project)),{loadImages,renderFrame,poseAt}=await import('./runtime.js'),images=await loadImages(p),options={width:640,height:480,framing:{minX:-280,maxX:320,minY:-130,maxY:220},background:'#e5e8df'};
  let differences=0,maxMatrixError=0,maxReachError=0,minimumPlanted=4,image;
  for(const time of [1,3,7,11]){
   api.seek(time);const frame=api.snapshot().procedural,portablePose=poseAt(p,p.clips[0],time);minimumPlanted=Math.min(minimumPlanted,frame.contacts.filter(c=>c.grounded).length);maxReachError=Math.max(maxReachError,...frame.contacts.map(c=>c.error));
   const points=new Map(frame.points);for(const binding of p.procedural.bindings){const m=portablePose.get(binding.joint).world,root=points.get(binding.particles[0]);maxMatrixError=Math.max(maxMatrixError,Math.abs(m[4]-root[0]),Math.abs(m[5]-root[1]),Math.abs(Math.hypot(m[0],m[1])-1));}
   const editor=await api.render(time,options),portable=renderFrame(p,images,p.clips[0],time,options),a=editor.getContext('2d').getImageData(0,0,640,480).data,b=portable.getContext('2d').getImageData(0,0,640,480).data;for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
   if(time===11){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.getContext('2d').drawImage(portable,0,0);image=canvas.toDataURL();}
  }
  return {differences,maxMatrixError,maxReachError,minimumPlanted,pieces:p.procedural.bindings.length,linksPerLeg:p.procedural.chains.map(c=>c.particles.length-1),image};
 });
 assert.equal(proof.differences,0);assert.ok(proof.maxMatrixError<1e-7);assert.ok(proof.maxReachError<.01);assert.ok(proof.minimumPlanted>=2);assert.equal(proof.pieces,13);assert.deepEqual(proof.linksPerLeg,[3,3,3,3]);assert.deepEqual(errors,[]);
 await fs.mkdir('work',{recursive:true});await fs.writeFile('work/sprite-walker-portable.png',Buffer.from(proof.image.split(',')[1],'base64'));delete proof.image;await panel.locator('[data-close]').click();await page.screenshot({path:'work/sprite-walker-editor.png'});console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();}
