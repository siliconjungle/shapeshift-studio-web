import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.goto('http://127.0.0.1:4354/puppet-studio/experiments/sunflower-puppet/index.html');await page.waitForFunction(()=>window.sunflowerDemo?.ready);
 for(const facing of ['front','back','right','left']){await page.click(`#views button[data-view="${facing}"]`);assert.equal(await page.evaluate(()=>sunflowerDemo.state.facing),facing);await page.click('#actions button[data-clip="walk"]');await page.waitForTimeout(120);assert.equal(await page.locator('#puppet').getAttribute('data-view'),['left','right'].includes(facing)?'side':facing);}
 await page.click('#pause');const before=await page.evaluate(()=>sunflowerDemo.state.clock);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>sunflowerDemo.state.clock),before);await page.click('#pause');
 await page.click('#actions button[data-clip="idle"]');await page.locator('#stage').focus();const x=await page.evaluate(()=>sunflowerDemo.state.x);await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');assert.ok(await page.evaluate(()=>sunflowerDemo.state.x)>x);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>sunflowerDemo.state.clip),'idle');
 // Walk to a real clicked stage coordinate and stop at it.
 const point=await page.evaluate(()=>{const s=document.getElementById('stage'),p=new DOMPoint(sunflowerDemo.state.x+18,sunflowerDemo.state.y).matrixTransform(s.getScreenCTM());return{x:p.x,y:p.y};});await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>sunflowerDemo.state.target===null);assert.equal(await page.evaluate(()=>sunflowerDemo.state.clip),'idle');
 await page.click('#pieces');await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>sunflowerDemo.state.explode)>.8);await page.click('#pieces');await page.click('#joints');await page.waitForTimeout(100);assert.equal(await page.locator('#puppet g[data-view="side"] [data-joints] circle').count(),6);await page.click('#joints');
 const projects=await page.evaluate(async()=>{
  const runtime=await import('/puppet-studio/runtime.js'),results=[];
  for(const view of ['front','back','side']){const p=runtime.validateProject(await(await fetch('/assets/sunflower-puppet/sunflower-'+view+'.puppet.json')).json()),images=await runtime.loadImages(p);const frame=runtime.renderFrame(p,images,p.clips.find(c=>c.id==='walk'),.4,{width:500,height:600,background:'#f8f4e7',camera:[1,0,0,1,250,520]}),c=document.createElement('canvas');c.width=500;c.height=600;c.getContext('2d').drawImage(frame,0,0);results.push({view,joints:p.joints.length,clips:p.clips.length,meshes:p.joints.filter(j=>j.sprite?.mesh).length,png:c.toDataURL()});}return results;
 });
 for(const p of projects){await fs.writeFile('assets/sunflower-puppet/native-'+p.view+'.png',Buffer.from(p.png.split(',')[1],'base64'));delete p.png;}
 await page.click('#views button[data-view="front"]');await page.waitForTimeout(250);await page.screenshot({path:'assets/sunflower-puppet/preview-front.png',fullPage:true});
 for(const view of ['back','right']){await page.click(`#views button[data-view="${view}"]`);await page.click('#actions button[data-clip="walk"]');await page.waitForTimeout(220);await page.locator('#stage').screenshot({path:'assets/sunflower-puppet/preview-walk-'+view+'.png'});}
 await page.setViewportSize({width:390,height:844});await page.reload();await page.waitForFunction(()=>window.sunflowerDemo?.ready);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const report={passed:true,projects,checks:['four-way facing','walk controls','pause freezes clock','keyboard travel and stop','pointer travel and arrival','exploded parts','joint overlay','native Studio validation and rendering, all 3 views','mobile width','no page errors or failed requests']};await fs.writeFile('assets/sunflower-puppet/verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
