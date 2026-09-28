import {illustratedMaterialInputs as watcherMaterialInputs} from '@shapeshift-labs/studio-core/scene3d/core/materials';
// npm run build; npm start; node scripts/verify-hybrid-flat-browser.mjs
import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=hybrid');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.puppets.entries.size===8&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.select('shell'));
 const shading=page.locator('[data-material="shading"]'),creases=page.locator('[data-material="creases"]');
 await shading.selectOption('solid');await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].shading==='solid');
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].shading==='svg');
 await creases.check();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].creases===true);await creases.uncheck();
 await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading);
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.select('leg-0-link-0'));
 await page.locator('[data-field="puppet.fit"]').selectOption('original');await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.fit==='original');
 await page.locator('[data-field="puppet.fit"]').selectOption('bounds');await page.locator('[data-field="puppet.facing"]').selectOption('fixed');await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.facing==='fixed');
 await page.locator('[data-field="puppet.facing"]').selectOption('axis-y');await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.nodes.find(n=>n.id==='leg-0-link-0').puppet.facing==='axis-y');
 const proof=await page.evaluate(async ({inputs,quick})=>{
  const api=window.shapeshiftStudio,r=api.scene3d.runtime(),{createScenePlayer}=await import('./scene3d/runtime.js'),T={Vector3:r.camera.position.constructor};
  api.scene3d.select(null);r.resize(640,480);r.controls.enabled=false;
  const project=JSON.parse(JSON.stringify(api.snapshot().project)),saved=JSON.stringify(project),canvas=document.createElement('canvas');canvas.style.display='none';document.body.append(canvas);
  const player=await createScenePlayer(canvas,project,{width:640,height:480}),p=player.scene;let endpointError=0,matrixError=0,differences=0,sourceChanged=false,socketError=0;const images={};
  function pixels(canvas){const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,c.width,c.height).data;}
  for(const type of ['orthographic','perspective'])for(const [index,position]of ([[7,5.5,8],[-7,4,7],[0,4,-10]].slice(0,quick?1:3)).entries())for(const time of (quick?[0,4]:[0,1,4])){
   const camera={...project.scene3d.camera,type,position};r.setCamera(camera);p.setCamera(camera);r.seek(time,'walk');r.render(true);player.seek(time,'walk');p.render(true);
   for(const c of r.sample.procedural.chains){const def=project.scene3d.procedural.chains.find(d=>d.id===c.id);for(const [i,id]of def.segments.entries()){
    const mesh=r.puppets.entries.get(id).mesh,other=p.puppets.entries.get(id).mesh;
    for(const [j,y]of [-.5,.5].entries()){const point=new T.Vector3(0,y,0).applyMatrix4(mesh.matrixWorld);endpointError=Math.max(endpointError,point.distanceTo(new T.Vector3(...c.points[i+j])));}
    mesh.matrixWorld.elements.forEach((v,k)=>matrixError=Math.max(matrixError,Math.abs(v-other.matrixWorld.elements[k])));
   }}
   const a=pixels(r.canvas),b=pixels(canvas);if(a.length!==b.length)throw Error('Pixel dimensions differ');for(let i=0;i<a.length;i++)if(a[i]!==b[i])differences++;
   if(type==='orthographic'&&index===0&&time===4)images.hybrid=canvas.toDataURL();
  }
  const entry=p.puppets.entries.get('leg-0-link-0'),mark=project.joints.find(j=>j.name==='Animated leg marking');
  player.seek(0,'walk');const before=entry.canvas.toDataURL();player.seek(1,'walk');sourceChanged=before!==entry.canvas.toDataURL();
  const binding=p.sample.byId.get('leg-0-link-0'),matrix=p.puppets.jointMatrix(binding.id,mark.id),actual=new T.Vector3().setFromMatrixPosition(matrix),expected=new T.Vector3(0,.2,0).applyQuaternion(entry.facing.quaternion);socketError=actual.distanceTo(expected);
  const authoredUnchanged=JSON.stringify(project)===saved;
  player.dispose();canvas.remove();
  const isolated=JSON.parse(saved),s=isolated.scene3d;s.nodes=s.nodes.filter(n=>n.id==='shell');s.nodes[0].parent=null;s.nodes[0].position=[0,0,0];s.nodes[0].dimensions=[2,2,2];s.nodes[0].segments=24;delete s.procedural;s.clips=[{id:'idle',name:'Idle',duration:1,loop:true,tracks:[],events:[]}];s.camera={...s.camera,position:[3,2,6],target:[0,0,0],size:3};s.environment.shadows=false;s.environment.background='#edf0dc';
  const stats=[];let creaseDifferences=0;
  for(const pipeline of ['standard','illustrated']){
   if(pipeline==='illustrated')s.rendering={pipeline:'illustrated',inputs};else delete s.rendering;
   for(const value of ['svg','solid','lit']){s.materials[0].shading=value;const c=document.createElement('canvas'),player=await createScenePlayer(c,isolated,{width:400,height:400});player.scene.render(true);const data=pixels(c),colours=new Set();for(let y=165;y<235;y++)for(let x=165;x<235;x++){const i=(y*400+x)*4;colours.add(data.slice(i,i+3).join(','));}stats.push({pipeline,shading:value,interiorColours:colours.size,vertices:player.scene.pickables.find(m=>m.userData.node==='shell').geometry.attributes.position.count});images[pipeline+'-'+value]=c.toDataURL();player.dispose();}
  }
  delete s.rendering;s.nodes[0].type='box';s.materials[0].shading='svg';s.materials[0].creases=false;
  const c=document.createElement('canvas'),cube=await createScenePlayer(c,isolated,{width:400,height:400});cube.scene.render(true);const noCreases=pixels(c);cube.scene.project.scene3d.materials[0].creases=true;cube.scene.applyAppearance();cube.scene.render(true);const withCreases=pixels(c);for(let i=0;i<noCreases.length;i++)if(noCreases[i]!==withCreases[i])creaseDifferences++;cube.dispose();
  return {endpointError,matrixError,differences,sourceChanged,socketError,authoredUnchanged,creaseDifferences,stats,images};
 },{inputs:watcherMaterialInputs,quick:process.env.PFH_QUICK==='1'});
 await fs.mkdir('work',{recursive:true});for(const [name,data]of Object.entries(proof.images))await fs.writeFile('work/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));delete proof.images;
 console.log(JSON.stringify({errors,...proof},null,2));assert.deepEqual(errors,[]);assert.ok(proof.endpointError<1e-7);assert.ok(proof.matrixError<1e-7);assert.equal(proof.differences,0);assert.ok(proof.sourceChanged);assert.ok(proof.socketError<1e-7);assert.ok(proof.authoredUnchanged);assert.ok(proof.creaseDifferences>100);
 for(const stat of proof.stats)assert.ok(stat.shading==='solid'?stat.interiorColours===1:stat.interiorColours>1,JSON.stringify(stat));
}finally{await browser.close();}
