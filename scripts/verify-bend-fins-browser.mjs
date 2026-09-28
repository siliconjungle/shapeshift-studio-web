// Build and serve first. Exercises bend response authoring and portable drawing.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=bend-fins');await page.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Bend-driven fins');
 const panel=page.locator('#procedural-panel');await panel.locator('[data-attachment]').selectOption('dorsal-6-attachment');await panel.locator('[data-bend-controls]').evaluate(el=>el.open=true);
 await panel.locator('[data-bend-y]').fill('8');await panel.locator('[data-bend-limit]').fill('180');await panel.locator('[data-update-attachment]').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.attachments.find(a=>a.particle==='dorsal-6').bend.scale[1]===8);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.attachments.find(a=>a.particle==='dorsal-6').bend.scale[1]===4);
 await page.locator('#redo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.attachments.find(a=>a.particle==='dorsal-6').bend.scale[1]===8);
 const proof=await page.evaluate(async()=>{
  const api=window.shapeshiftStudio,p=JSON.parse(JSON.stringify(api.snapshot().project)),{loadImages,renderFrame}=await import('./runtime.js'),images=await loadImages(p),options={width:640,height:480,framing:{minX:-150,maxX:300,minY:-150,maxY:150},background:'#eef0e8'};
  let differences=0,maxOffsetError=0,measured=[],image;
  for(const time of [1,3,5]){
   api.seek(time);const frame=new Map(api.snapshot().procedural.points),a=p.procedural.attachments.find(a=>a.particle==='dorsal-6'),ids=a.bend.particles;let turn=0,previous;
   for(let i=1;i<ids.length;i++){const x=frame.get(ids[i-1]),y=frame.get(ids[i]),angle=Math.atan2(y[1]-x[1],y[0]-x[0]);if(previous!==undefined)turn+=Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));previous=angle;}
   const from=frame.get(a.orient[0]),to=frame.get(a.orient[1]),axis=to.map((v,k)=>v-from[k]),len=Math.hypot(...axis),offset=a.offset[1]+Math.max(-Math.PI,Math.min(Math.PI,turn))*8,actual=frame.get(a.particle),expected=[from[0]-axis[1]/len*offset,from[1]+axis[0]/len*offset];maxOffsetError=Math.max(maxOffsetError,Math.hypot(...actual.map((v,k)=>v-expected[k])));measured.push(offset);
   const editor=await api.render(time,options),portable=renderFrame(p,images,p.clips[0],time,options),left=editor.getContext('2d').getImageData(0,0,640,480).data,right=portable.getContext('2d').getImageData(0,0,640,480).data;for(let i=0;i<left.length;i++)if(left[i]!==right[i])differences++;
   if(time===3){const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.getContext('2d').drawImage(portable,0,0);image=canvas.toDataURL('image/png');}
  }
  return {differences,maxOffsetError,measured,image,limit:p.procedural.attachments.find(a=>a.particle==='dorsal-6').bend.limit};
 });
 assert.equal(proof.differences,0);assert.ok(proof.maxOffsetError<1e-7);assert.ok(Math.max(...proof.measured)-Math.min(...proof.measured)>1);assert.equal(proof.limit,Math.PI);assert.deepEqual(errors,[]);
 await fs.mkdir('work',{recursive:true});await fs.writeFile('work/bend-fins-portable.png',Buffer.from(proof.image.split(',')[1],'base64'));delete proof.image;
 await panel.locator('[data-bend-controls]').scrollIntoViewIfNeeded();await page.screenshot({path:'work/bend-fins-editor.png'});console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();}
