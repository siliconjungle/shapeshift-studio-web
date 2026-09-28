// Run after npm run build, with the local server on :4354.
import {illustratedMaterialInputs as watcherMaterialInputs} from '@shapeshift-labs/studio-core/scene3d/core/materials';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];page.setDefaultTimeout(30000);
 page.on('console',m=>{if(m.type()==='log')console.log(m.text());});
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=hybrid');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.puppets.entries.size===8&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 await page.locator('.s3-procedural [data-close]').click();
 await page.evaluate(()=>window.shapeshiftStudio.scene3d.select('shell'));
 await page.locator('[data-material="outlineUnits"]').selectOption('screen');
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].outlineUnits==='screen');
 await page.locator('#s3-style-little-gods').click();
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].outlineUnits==='world');
 await page.locator('[data-material="outlineUnits"]').selectOption('object');
 await page.locator('[data-outline-percent]').fill('3');await page.locator('[data-outline-percent]').dispatchEvent('change');
 await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].outlineWidth===.03);
 await page.locator('#undo').click();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].outlineWidth===.02);
 await page.locator('[data-material="preservePaint"]').uncheck();await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].preservePaint===false);
 await page.locator('[data-material="preservePaint"]').check();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].preservePaint===true);
 console.log('Preset, thickness and paint controls passed.');
 const proof=await page.evaluate(async inputs=>{
  const {createScenePlayer}=await import('./scene3d/runtime.js'),project=structuredClone(window.shapeshiftStudio.snapshot().project),s=project.scene3d;
  delete s.procedural;s.nodes=s.nodes.filter(n=>n.id==='shell');const n=s.nodes[0];n.parent=null;n.position=[0,0,0];n.rotation=[0,0,0];n.dimensions=[1.6,1.6,1.6];n.scale=[1,1,1];
  s.clips=[{id:'idle',name:'Idle',duration:1,loop:true,tracks:[],events:[]}];s.camera={...s.camera,type:'orthographic',position:[0,0,8],target:[0,0,0],size:4,zoom:1};s.environment.shadows=false;s.environment.background='#edf0dc';s.environment.inkWeight=1;
  const m=s.materials.find(m=>m.id===n.material);m.scribble=0;m.shading='svg';m.strokeStyle='hull';
  const images={},widths=[],paint=[];
  const pixels=c=>{const a=document.createElement('canvas');a.width=c.width;a.height=c.height;const ctx=a.getContext('2d');ctx.drawImage(c,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
  function inkRuns(c){const data=pixels(c),runs=[];let run=0;for(let x=0;x<c.width;x++){const i=(Math.floor(c.height/2)*c.width+x)*4,ink=Math.max(...data.slice(i,i+3))<75;if(ink)run++;else if(run){runs.push(run);run=0;}}if(run)runs.push(run);return runs;}
  for(const pipeline of ['standard','illustrated']){console.log('Checking '+pipeline);
   if(pipeline==='illustrated')s.rendering={pipeline,inputs};else delete s.rendering;
   for(const units of ['object','screen']){
    m.outlineUnits=units;m.ink=units==='object'?1:3;
    const c=document.createElement('canvas'),player=await createScenePlayer(c,project,{width:400,height:400}),r=player.scene;
    for(const zoom of [1,2]){r.setCamera({...s.camera,zoom});r.render(true);widths.push({pipeline,units,zoom,runs:inkRuns(c)});if(units==='object'&&zoom===1)images[pipeline+'-little-gods']=c.toDataURL();}
    player.dispose();
   }
   // Exact source paints, a thick ink band and a hole. Light changes must not
   // repaint these source regions when Preserve artwork shading is enabled.
   const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M10 10H190V190H10Z M80 80V120H120V80Z" fill-rule="evenodd" fill="#161c17"/><path d="M20 20H180V180H20Z M70 70V130H130V70Z" fill-rule="evenodd" fill="#a25338"/><path d="M20 20H180V65H20Z" fill="#d29362"/></svg>';
   project.assets.push({id:'paint-test-'+pipeline,src:'data:image/svg+xml,'+encodeURIComponent(svg)});n.type='svg';n.svg='paint-test-'+pipeline;n.dimensions=[2,2,.01];m.outlineUnits='object';m.ink=1;
   for(const artType of ['svg','extrude']){n.type=artType;
   const c=document.createElement('canvas'),player=await createScenePlayer(c,project,{width:400,height:400}),r=player.scene;
   const shot=(preserve,light)=>{const mat=r.project.scene3d.materials.find(v=>v.id===m.id);mat.preservePaint=preserve;r.project.scene3d.environment.lightPosition=light;r.applyAppearance();if(r.pipeline){r.pipeline.kits.get(n.id).uniforms.light.value.fromArray(light).normalize();}r.render(true);return pixels(c);};
   const a=shot(true,[0,0,8]),b=shot(true,[0,0,-8]);let changes=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])changes++;
   const at=(x,y)=>Array.from(a.slice((y*400+x)*4,(y*400+x)*4+3));
   paint.push({pipeline,artType,changes,base:at(150,240),highlight:at(150,140),ink:at(114,200),hole:at(200,200)});images[pipeline+'-'+artType+'-source-paint']=c.toDataURL();
   const lit=shot(false,[0,0,-8]);let repainted=0;for(let i=0;i<a.length;i++)if(a[i]!==lit[i])repainted++;paint.at(-1).repainted=repainted;
   player.dispose();}
   n.type='sphere';delete n.svg;n.dimensions=[1.6,1.6,1.6];m.preservePaint=true;
  }
  return {widths,paint,images};
 },watcherMaterialInputs);
 await fs.mkdir('work',{recursive:true});for(const [name,data]of Object.entries(proof.images))await fs.writeFile('work/'+name+'.png',Buffer.from(data.split(',')[1],'base64'));delete proof.images;
 await fs.writeFile('work/little-gods-style-proof.json',JSON.stringify({errors,...proof},null,2));console.log(JSON.stringify({errors,...proof},null,2));assert.deepEqual(errors,[]);
 for(const pipeline of ['standard','illustrated'])for(const units of ['object','screen']){
  const [a,b]=proof.widths.filter(w=>w.pipeline===pipeline&&w.units===units);assert.equal(a.runs.length,2);assert.equal(b.runs.length,2);
  if(units==='object')assert.ok(b.runs[0]>=a.runs[0]*1.6&&b.runs[0]<=a.runs[0]*2.5);else assert.ok(Math.abs(a.runs[0]-b.runs[0])<=1);
 }
 for(const p of proof.paint){assert.equal(p.changes,0);assert.deepEqual(p.base,[162,83,56]);assert.deepEqual(p.highlight,[210,147,98]);assert.ok(p.ink.every((v,i)=>Math.abs(v-[22,28,23][i])<=1));assert.deepEqual(p.hole,[237,240,220]);assert.ok(p.repainted>100);}
}finally{await browser.close();}
