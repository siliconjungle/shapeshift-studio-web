import sharp from 'sharp';
import {chromium} from 'playwright';
import {getStroke} from '@shapeshift-labs/studio-core/scene3d/core/perfect-freehand';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const curve=Array.from({length:32},(_,i)=>[45+i*9,200+Math.sin(i*.23)*65,.2+i/45]);
const cases=[
 {name:'pressure',points:curve},
 {name:'streamline',points:curve,options:{streamline:.8}},
 {name:'simulated-pressure',points:curve,options:{simulatePressure:true}},
 {name:'taper',points:curve,options:{start:{taper:80},end:{taper:120}}},
 {name:'flat-caps',points:curve,options:{start:{cap:false},end:{cap:false}}},
 {name:'sharp-corners',points:[[60,250,.5],[160,80,.3],[130,220,.7],[310,90,.6],[220,290,.8],[330,280,.2]]},
 {name:'two-points',points:[[70,180,.4],[320,220,.8]]},
 {name:'dot',points:[[200,200,.6]]},
 {name:'stationary',points:[[200,200,.6],[200,200,.6],[200,200,.6]]},
 {name:'default-pressure',points:[[200,200]]},
 {name:'unfinished',points:curve,options:{last:false,streamline:.6}},
 {name:'coincident',points:[[120,180,.5],[120,180,.5],[121,180,.5],[180,240,.8],[250,130,.2]]}
].map(c=>{const options={size:18,thinning:.7,smoothing:.6,streamline:0,simulatePressure:false,last:true,...c.options};return {...c,options,outline:getStroke(c.points.map(p=>[p[0],400-p[1],p[2]]),options).map(p=>[p[0],400-p[1]])};});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1050}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon')){errors.push(m.text());console.log(m.text().slice(0,500));}else if(m.type()==='log')console.log(m.text());});
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?procedural3d=hybrid');
 await page.waitForFunction(()=>window.shapeshiftStudio?.scene3d.runtime()?.freehand.stats.arcs>0&&!window.shapeshiftStudio.scene3d.snapshot().loading,{},{timeout:60000});
 await page.locator('.s3-procedural [data-close]').click();await page.evaluate(()=>window.shapeshiftStudio.scene3d.select('shell'));
 await page.locator('[data-material="strokeStyle"]').selectOption('hull');await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].strokeStyle==='hull');
 await page.locator('[data-material="strokeStyle"]').selectOption('freehand');await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().freehand.stats.arcs>0);
 await page.locator('[data-material="strokeVariation"]').fill('.85');await page.locator('[data-material="strokeVariation"]').dispatchEvent('change');await page.waitForFunction(()=>window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].strokeVariation===.85);
 await page.locator('#undo').click();await page.waitForFunction(()=>!window.shapeshiftStudio.scene3d.snapshot().loading&&window.shapeshiftStudio.scene3d.runtime().project.scene3d.materials[0].strokeVariation===.65);
 const proof=await page.evaluate(async cases=>{
  const api=window.shapeshiftStudio,r=api.scene3d.runtime();api.scene3d.select(null);r.resize(640,480);r.seek(4,'walk');r.render(true);const hybrid=r.canvas.toDataURL(),stats={...r.freehand.stats};
  const source=[...r.freehand.entries.values()].flat()[0],scene=new r.scene.constructor(),material=source.material.clone(),geometry=source.geometry.clone(),mesh=new source.constructor(geometry,material);scene.add(mesh);const p=geometry.attributes.position;p.setXYZ(0,-1,-1,0);p.setXYZ(1,1,-1,0);p.setXYZ(2,1,1,0);p.setXYZ(3,-1,1,0);p.needsUpdate=true;
  r.resize(400,400);r.renderer.setClearColor('#ffffff',1);material.uniforms.ink.value.set('#000000');material.uniforms.variation.value=0;material.uniforms.depthBias.value=0;material.uniforms.pass.value=0;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=400;const ctx=canvas.getContext('2d'),results=[],images={hybrid};
  for(const c of cases){
   const u=material.uniforms,o=c.options;u.inputCount.value=c.points.length;c.points.forEach((p,i)=>u.inputPoints.value[i].set(p[0],400-p[1],p[2]??-1,0));for(const key of ['size','thinning','smoothing','streamline'])u[key].value=o[key];u.simulatePressure.value=o.simulatePressure?1:0;u.complete.value=o.last?1:0;u.taperStart.value=o.start?.taper??0;u.taperEnd.value=o.end?.taper??0;u.capStart.value=o.start?.cap===false?0:1;u.capEnd.value=o.end?.cap===false?0:1;
   r.renderer.setRenderTarget(null);r.renderer.clear();r.renderer.render(scene,r.camera);ctx.drawImage(r.canvas,0,0);const actual=ctx.getImageData(0,0,400,400).data;images[c.name+'-gpu']=r.canvas.toDataURL();
   ctx.fillStyle='#fff';ctx.fillRect(0,0,400,400);ctx.fillStyle='#000';ctx.beginPath();c.outline.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();const expected=ctx.getImageData(0,0,400,400).data;images[c.name+'-reference']=canvas.toDataURL();
   let intersection=0,union=0,error=0;for(let i=0;i<actual.length;i+=4){const a=actual[i]<128,b=expected[i]<128;if(a&&b)intersection++;if(a||b)union++;error+=Math.abs(actual[i]-expected[i])/255;}
   results.push({name:c.name,iou:union?intersection/union:1,normalisedError:error/Math.max(1,union)});
  }
  material.dispose();geometry.dispose();return {stats,results,images};
 },cases);
 // Compare the upstream polygon with the shader's exact coverage sample pattern.
 // This distinguishes stroke-construction errors from Canvas2D antialiasing.
 const offsets=[[-.375,-.125],[-.125,.375],[.125,-.375],[.375,.125],[-.375,.375],[-.125,-.125],[.125,.125],[.375,-.375]];
 for(const c of cases){const coverage=new Uint8Array(400*400),outline=c.outline;
  for(const [ox,oy]of offsets)for(let y=0;y<400;y++){const qy=y+.5-oy,hits=[];
   for(let i=0;i<outline.length;i++){const a=outline[i],b=outline[(i+1)%outline.length];if((a[1]>qy)!==(b[1]>qy))hits.push([(b[0]-a[0])*(qy-a[1])/(b[1]-a[1])+a[0],b[1]>a[1]?1:-1]);}
   hits.sort((a,b)=>a[0]-b[0]);let j=0,winding=0;for(let x=0;x<400;x++){while(j<hits.length&&hits[j][0]<=x+.5+ox)winding+=hits[j++][1];if(winding)coverage[y*400+x]++;}
  }
  const {data,info}=await sharp(Buffer.from(proof.images[c.name+'-gpu'].split(',')[1],'base64')).raw().toBuffer({resolveWithObject:true});let mismatch=0,maxError=0;
  for(let i=0;i<coverage.length;i++){const error=Math.abs((1-data[i*info.channels]/255)-coverage[i]/8);if(error>1.01/255)mismatch++;maxError=Math.max(maxError,error);}
  Object.assign(proof.results.find(r=>r.name===c.name),{coverageMismatchPixels:mismatch,maxCoverageError:maxError});
 }
 await fs.mkdir('work',{recursive:true});for(const [name,data]of Object.entries(proof.images))await fs.writeFile('work/freehand-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));delete proof.images;
 await fs.writeFile('work/freehand-shader-proof.json',JSON.stringify({errors,...proof},null,2));console.log(JSON.stringify({errors,...proof},null,2));assert.deepEqual(errors,[]);assert.ok(proof.stats.arcs>0);for(const r of proof.results){assert.ok(r.coverageMismatchPixels<=12,r.name+' coverage pixels '+r.coverageMismatchPixels);assert.ok(r.maxCoverageError<=.125+1.01/255,r.name+' coverage error '+r.maxCoverageError);}
}finally{await browser.close();}
