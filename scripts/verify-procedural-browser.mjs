// Run after npm run build with npm start listening on port 4354.
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=sprites');
 await page.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Outlined puppet · procedural head');
 await page.evaluate(()=>window.shapeshiftStudio.seek(1.5));
 await page.locator('[data-piece]').selectOption('head');await page.locator('[data-join-body]').selectOption('body');await page.locator('[data-recognize]').click();
 assert.match(await page.locator('#procedural-panel [data-status]').textContent(),/Connected contours/);
 await fs.mkdir('work',{recursive:true});await page.screenshot({path:'work/procedural-sprites.png'});
 const result=await page.evaluate(async()=>{
  const {validateProject,loadImages,renderFrame,poseAt,drawPuppet}=await import('./runtime.js');
  const identity={x:0,y:0,rotation:0,scaleX:1,scaleY:1};
  const art='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path d="M4 4H96V96H4Z" fill="#80aabb" stroke="#39588f" stroke-width="8"/><circle cx="55" cy="40" r="7" fill="#39588f"/></svg>');
  const p={format:'inkwell-puppet',version:1,name:'Hybrid outline',assets:[{id:'art',src:art}],joints:[{id:'head',name:'Head',parent:null,rest:{...identity,x:80,y:40},layer:2,sprite:{asset:'art',width:60,height:60,pivotX:0,pivotY:0}}],clips:[{id:'motion',name:'Motion',duration:2,fps:30,loop:true,tracks:{}}],procedural:{version:1,gravity:[0,0],damping:3,iterations:16,particles:[['a',20,40],['b',100,40],['c',100,100],['d',20,100],['join',90,70]].map(([id,x,y])=>({id,position:[x,y],mass:0,radius:4})),distances:[],bends:[],areas:[],rigid:[],chains:[],drivers:[],colliders:[],bindings:[],surfaces:[{id:'body',name:'Body',layer:1,fill:'#80aabb',stroke:'#39588f',strokeWidth:5,outline:'round',shapes:[{type:'polygon',particles:['a','b','c','d']}]}],connections:[{id:'neck',joint:'head',surface:'body',particle:'join',radius:64,enabled:false}]}};
  validateProject(p);const images=await loadImages(p),options={width:160,height:140,camera:[1,0,0,1,0,0],background:'transparent'},sample=(c,x,y)=>Array.from(c.getContext('2d').getImageData(x,y,1,1).data);
  const before=renderFrame(p,images,p.clips[0],0,options);p.procedural.connections[0].enabled=true;const after=renderFrame(p,images,p.clips[0],0,options);
  const raw=document.createElement('canvas');raw.width=160;raw.height=140;drawPuppet(raw.getContext('2d'),p,images,poseAt(p,p.clips[0],0));
  const samples={before:sample(before,82,65),after:sample(after,82,65),outerBefore:sample(before,82,41),outerAfter:sample(after,82,41),markBefore:sample(before,113,64),markAfter:sample(after,113,64),raw:sample(raw,82,65)};
  for(const point of p.procedural.particles){point.joint='head';point.offset=[point.position[0]-80,point.position[1]-40];}
  p.clips[0].tracks.head=[{time:0,value:{...identity,x:20,y:10},easing:'linear'}];
  const moving=renderFrame(p,images,p.clips[0],0,options);samples.moving=sample(moving,102,75);
  p.clips[0].tracks={};p.procedural.connections=[];p.procedural.surfaces=[];p.procedural.particles=[{id:'a',position:[80,40],mass:0,radius:1},{id:'b',position:[140,100],mass:0,radius:1}];p.procedural.bindings=[{joint:'head',mode:'soft',particles:['a','b'],rest:[[80,40],[140,100]],bindMatrix:[1,0,0,1,80,40],strength:1}];p.procedural.drivers=[{particle:'b',type:'target',origin:[155,110],amplitude:[0,0],frequency:0}];
  const soft=renderFrame(p,images,p.clips[0],0,options),pixels=soft.getContext('2d').getImageData(95,60,30,25).data;let cracks=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<250)cracks++;
  const data=async canvas=>{const blob=await canvas.convertToBlob();return await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});};
  return {samples,cracks,hybrid:await data(after),soft:await data(soft)};
 });
 assert.deepEqual(result.samples.before,[57,88,143,255]);assert.deepEqual(result.samples.after,[128,170,187,255]);assert.deepEqual(result.samples.raw,result.samples.after);assert.deepEqual(result.samples.outerAfter,result.samples.outerBefore);assert.deepEqual(result.samples.markAfter,result.samples.markBefore);assert.deepEqual(result.samples.moving,result.samples.after);assert.equal(result.cracks,0);assert.deepEqual(errors,[]);
 for(const name of ['hybrid','soft'])await fs.writeFile(`work/procedural-${name}.png`,Buffer.from(result[name].split(',')[1],'base64'));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural=walker');
 await page.waitForFunction(()=>window.shapeshiftStudio?.snapshot().project.name==='Walking limbs');
 await page.evaluate(()=>window.shapeshiftStudio.seek(11));
 await page.locator('[data-step-chain]').selectOption('leg-0');await page.locator('[data-step-height]').fill('35');await page.locator('[data-step-height]').press('Tab');
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.chains[0].stepHeight===35);
 await page.locator('[data-foot][value="leg-0"]').check();await page.locator('[data-foot][value="leg-2"]').check();await page.locator('[data-add-group]').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.gaits[0].groups.length===3);
 assert.deepEqual(await page.evaluate(()=>window.shapeshiftStudio.snapshot().project.procedural.gaits[0].groups),[['leg-3'],['leg-1'],['leg-0','leg-2']]);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.gaits[0].groups.length===2);
 await page.locator('[data-support-height]').fill('105');await page.locator('[data-support-height]').press('Tab');
 await page.waitForFunction(()=>window.shapeshiftStudio.snapshot().project.procedural.supports[0].height===105);
 const locomotion=await page.evaluate(()=>window.shapeshiftStudio.snapshot().procedural);
 assert.ok(locomotion.supports[0].angle<-.02);assert.ok(locomotion.contacts.filter(c=>c.grounded).length>=2);assert.ok(locomotion.contacts.every(c=>c.error<.01));assert.deepEqual(errors,[]);
 await page.locator('[data-step-chain]').scrollIntoViewIfNeeded();await page.screenshot({path:'work/procedural-walker.png'});
 console.log(JSON.stringify({errors,samples:result.samples,softInteriorCracks:result.cracks,locomotion:{support:locomotion.supports[0],grounded:locomotion.contacts.filter(c=>c.grounded).length}},null,2));
}finally{await browser.close();}
