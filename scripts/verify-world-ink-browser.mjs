import {chromium} from 'playwright';
import {sceneDefaults,nodeDefaults,materialDefaults,littleGodsMaterialStyle} from '@shapeshift-labs/studio-core/scene3d/schema';
import {illustratedMaterialInputs as watcherMaterialInputs} from '@shapeshift-labs/studio-core/scene3d/core/materials';
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const scene=sceneDefaults(),material=materialDefaults('ink');Object.assign(material,littleGodsMaterialStyle(material),{shading:'solid',strokeVariation:0,scribble:0,outlineWorldWidth:.06});scene.materials=[material];scene.nodes=[1,2].map((size,i)=>({...nodeDefaults('sphere-'+i,'sphere'),dimensions:[size,size,size],position:[i?1.2:-1.2,0,0]}));scene.camera={...scene.camera,type:'orthographic',position:[0,0,8],target:[0,0,0],size:4,zoom:1};scene.environment.shadows=false;scene.environment.background='#edf0dc';
const project={format:'inkwell-puppet',version:1,name:'World ink regression',assets:[],joints:[{id:'root',name:'Root',parent:null,rest:{x:0,y:0,rotation:0,scaleX:1,scaleY:1},layer:0}],clips:[{id:'idle',name:'Idle',duration:1,fps:30,loop:true,tracks:{}}],scene3d:scene};
const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html');
 const proof=await page.evaluate(async ({project,inputs})=>{
  const {createScenePlayer}=await import('./scene3d/runtime.js'),canvas=document.createElement('canvas'),player=await createScenePlayer(canvas,project,{width:600,height:400}),r=player.scene,results=[],images={};
  const read=()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);const data=ctx.getImageData(0,0,600,400).data,runs=[];let run=0;for(let x=0;x<600;x++){const i=(200*600+x)*4,ink=Math.max(...data.slice(i,i+3))<85;if(ink)run++;else if(run){runs.push(run);run=0;}}if(run)runs.push(run);return runs;};
  for(const pipeline of ['standard','illustrated']){
   if(pipeline==='illustrated')project.scene3d.rendering={pipeline,inputs};else delete project.scene3d.rendering;
   await r.load(project);
   for(const style of ['freehand','hull']){
    r.project.scene3d.materials[0].strokeStyle=style;r.applyAppearance();
    for(const type of ['orthographic','perspective'])for(const distance of [8,16]){
     r.setCamera({...project.scene3d.camera,type,position:[0,0,distance]});r.render(true);results.push({pipeline,style,type,distance,runs:read(),sizes:[...r.freehand.entries.values()].map(list=>list[0]?.material.uniforms.size.value)});
     if(type==='orthographic'&&distance===8&&style==='freehand')images[pipeline]=canvas.toDataURL();
    }
    r.setCamera(project.scene3d.camera);r.objects.get('sphere-0').scale.setScalar(2);r.updateRigTransforms('sphere-0');r.render(true);results.push({pipeline,style,type:'scaled',runs:read()});r.objects.get('sphere-0').scale.setScalar(1);r.updateRigTransforms('sphere-0');
   }
  }
  player.dispose();return {results,images};
 },{project,inputs:watcherMaterialInputs});
 for(const [name,data]of Object.entries(proof.images))await fs.writeFile('work/world-ink-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));delete proof.images;
 await fs.writeFile('work/world-ink-proof.json',JSON.stringify({errors,...proof},null,2));console.log(JSON.stringify({errors,...proof},null,2));assert.deepEqual(errors,[]);
 for(const pipeline of ['standard','illustrated'])for(const style of ['freehand','hull']){
  const rows=proof.results.filter(r=>r.pipeline===pipeline&&r.style===style);for(const r of rows){assert.equal(r.runs.length,4,JSON.stringify(r));assert.ok(Math.max(...r.runs)-Math.min(...r.runs)<=2,JSON.stringify(r));}
  const ortho=rows.filter(r=>r.type==='orthographic');assert.deepEqual(ortho[0].runs,ortho[1].runs);
  const perspective=rows.filter(r=>r.type==='perspective');assert.ok(perspective[0].runs[0]>=perspective[1].runs[0]*1.5,JSON.stringify(perspective));
  assert.ok(Math.abs(rows.find(r=>r.type==='scaled').runs[0]-ortho[0].runs[0])<=1);
 }
}finally{await browser.close();}
