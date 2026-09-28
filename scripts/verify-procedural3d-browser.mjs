// npm run build; npm start; node scripts/verify-procedural3d-browser.mjs
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=walker');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.sample?.procedural?.chains.length===8&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.seek(4));
 const initial=await page.evaluate(()=>window.shapeshiftStudio.scene3d.runtime().sample.procedural);
 assert.equal(initial.chains.length,8);assert.ok(initial.chains.filter(c=>c.grounded).length>=4);assert.ok(initial.chains.every(c=>c.error<.01));assert.ok(initial.chains.some(c=>c.terrain==='ramp'));assert.ok(initial.bodies[0].offset>.2);
 const panel=page.locator('.s3-procedural');await panel.locator('[data-chain]').selectOption('leg-0');await panel.locator('[data-edit="stepHeight"]').fill('.45');await panel.locator('[data-edit="stepHeight"]').press('Tab');
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.chains[0].stepHeight===.45);
 await page.evaluate(async()=>{const api=window.shapeshiftStudio;await api.dispatch({op:'scene3d.node.add',id:'custom-link',type:'cone',values:{name:'Existing cone piece',dimensions:[.2,1,.2],position:[4,1,0]}});});
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().objects.has('custom-link'));
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.procedural.show());await panel.locator('[data-link="0"]').evaluate(el=>el.closest('details').open=true);await panel.locator('[data-link="0"]').selectOption('custom-link');
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.chains[0].segments[0]==='custom-link');
 await page.evaluate(async()=>{await window.shapeshiftStudio.dispatch({op:'scene3d.node.update',id:'leg-0-link-0',values:{visible:false}});});await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.runtime().objects.get('leg-0-link-0').visible);
 await page.evaluate(async()=>{await window.shapeshiftStudio.dispatch({op:'scene3d.node.add',id:'custom-foot',type:'box',values:{name:'Existing shaped foot',dimensions:[.35,.08,.5]}});});
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().objects.has('custom-foot'));
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.procedural.show());
 await panel.locator('[data-foot]').evaluate(el=>el.closest('details').open=true);await panel.locator('[data-foot]').selectOption('custom-foot');
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.chains[0].joints.at(-1)==='custom-foot');
 await panel.locator('[data-edit="footOrientation"]').selectOption('terrain');
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.procedural.chains[0].footOrientation==='terrain');
 await page.evaluate(async()=>{await window.shapeshiftStudio.dispatch({op:'scene3d.node.update',id:'leg-0-joint-2',values:{visible:false}});});
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.seek(4));
 const proof=await page.evaluate(async()=>{
  const api=window.shapeshiftStudio,r=api.scene3d.runtime(),project=JSON.parse(JSON.stringify(api.snapshot().project)),{createScenePlayer}=await import('./scene3d/runtime.js'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;canvas.style.display='none';document.body.append(canvas);
  const player=await createScenePlayer(canvas,project,{width:640,height:480});player.seek(4,'walk');
  const portable=player.scene.sample.procedural,actual=r.sample.procedural,link=r.objects.get('custom-link'),portableLink=player.scene.objects.get('custom-link');
  let maxMatrixError=0;for(let i=0;i<16;i++)maxMatrixError=Math.max(maxMatrixError,Math.abs(link.matrixWorld.elements[i]-portableLink.matrixWorld.elements[i]));
  let maxFootMatrixError=0;const foot=r.objects.get('custom-foot'),portableFoot=player.scene.objects.get('custom-foot');for(let i=0;i<16;i++)maxFootMatrixError=Math.max(maxFootMatrixError,Math.abs(foot.matrixWorld.elements[i]-portableFoot.matrixWorld.elements[i]));
  const result={maxFootMatrixError,footRotation:portable.chains[0].footRotation,maxMatrixError,chains:portable.chains.length,grounded:portable.chains.filter(c=>c.grounded).length,body:portable.bodies[0],customPrimitive:project.scene3d.nodes.find(n=>n.id==='custom-link').type,meshChildren:link.children.filter(c=>c.isMesh).length,image:canvas.toDataURL('image/png')};
  player.dispose();canvas.remove();return result;
 });
 assert.ok(proof.maxFootMatrixError<1e-8);assert.equal(proof.footRotation.length,4);assert.ok(proof.maxMatrixError<1e-8);assert.equal(proof.chains,8);assert.ok(proof.grounded>=4);assert.equal(proof.customPrimitive,'cone');assert.ok(proof.meshChildren>=2);assert.deepEqual(errors,[]);
 await fs.mkdir('work',{recursive:true});await fs.writeFile('work/procedural3d-portable.png',Buffer.from(proof.image.split(',')[1],'base64'));
 await panel.locator('[data-close]').click();await page.screenshot({path:'work/procedural3d-walker.png'});delete proof.image;console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();}
