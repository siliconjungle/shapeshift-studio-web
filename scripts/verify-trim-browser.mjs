// Run npm run build and npm start first.
import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await build({stdin:{contents:"export * from './puppet-studio/vector/model.js'; export * from './puppet-studio/vector/render.js'; export * from './puppet-studio/vector/import.js';",resolveDir:process.cwd()},bundle:true,format:'esm',outfile:'dist/trim-test.js'});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?artwork');await page.waitForFunction(()=>window.shapeshiftStudio?.artwork);
 const proof=await page.evaluate(async()=>{
  const {renderVector,vectorCanvas,svgText,pathData,trimStroke,importVector,vectorStrokeContains}=await import('/trim-test.js');
  const shape={id:'line',name:'Two flowing strokes',commands:['M','C','M','L'],points:[10,50,10,0,90,0,90,50,10,80,90,80],fill:'none',stroke:'#368ba0',strokeWidth:6,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round',hidden:false,locked:false,trimMode:'sequential',trimStart:.1,trimEnd:.75,trimOffset:0};
  const v={version:1,viewBox:[0,0,100,100],duration:2,loop:false,swatches:[],tracks:[],shapes:[shape]};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=100;const ctx=canvas.getContext('2d');
  const source=svg=>({src:'data:image/svg+xml,'+encodeURIComponent(svg)}),pixels=()=>ctx.getImageData(0,0,100,100).data;
  const difference=(a,b)=>{let count=0,max=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)count++;max=Math.max(max,d);}return {count,max};};
  const compare=async vector=>{ctx.clearRect(0,0,100,100);renderVector(ctx,vector);const original=pixels(),svg=svgText(vector),image=new Image();image.src=source(svg).src;await image.decode();ctx.clearRect(0,0,100,100);ctx.drawImage(image,0,0);const exported=difference(original,pixels()),imported=await importVector(source(svg));ctx.clearRect(0,0,100,100);renderVector(ctx,imported);return {exported,roundtrip:difference(original,pixels()),shapeCount:imported.shapes.length,mode:imported.shapes[0].trimMode};};
  const cases={};for(const mode of ['sequential','synced'])for(const offset of [0,.8,-.25]){shape.trimMode=mode;shape.trimOffset=offset;cases[mode+offset]=await compare(v);}
  shape.commands=['M','L','L','L','Z'];shape.points=[20,20,80,20,80,80,20,80];shape.fill='#efcc80';shape.opacity=.6;shape.trimStart=0;shape.trimEnd=.5;shape.trimOffset=.75;
  cases.closed=await compare(v);shape.trimEnd=0;cases.empty=await compare(v);shape.trimEnd=1;cases.full=await compare(v);
  shape.trimMode='off';cases.off=await compare(v);shape.trimMode='synced';
  shape.trimEnd=.5;shape.stroke={type:'linear',units:'objectBoundingBox',x1:0,y1:0,x2:1,y2:0,stops:[{offset:0,color:'#ff0000'},{offset:1,color:'#0000ff'}]};cases.gradient=await compare(v);
  shape.stroke='#368ba0';shape.clips=[{source:'clip',rule:'nonzero'}];v.shapes.push({...shape,id:'clip',name:'Clip',clips:[],points:[30,0,100,0,100,100,30,100],hidden:true});cases.clipped=await compare(v);
  // Compare curve cut points against Chromium's independent SVG length evaluator.
  let endpointError=0;const native=document.createElementNS('http://www.w3.org/2000/svg','path');
  for(const points of [[0,0,0,0,0,0,100,0],[0,0,0,100,100,100,100,0],[0,0,200,0,-100,0,100,0],[10,20,70,-90,-80,110,90,70]]){
   const curve={...shape,commands:['M','C'],points,trimMode:'synced',trimOffset:0};native.setAttribute('d',pathData(curve));const length=native.getTotalLength();
   for(const fraction of [.01,.15,.33,.6,.95]){curve.trimStart=0;curve.trimEnd=fraction;const result=trimStroke(curve),expected=native.getPointAtLength(length*fraction);endpointError=Math.max(endpointError,Math.hypot(result.points.at(-2)-expected.x,result.points.at(-1)-expected.y));}
  }
  const line={...shape,commands:['M','L'],points:[10,50,90,50],fill:'none',clips:[],stroke:'#368ba0',opacity:1,trimOffset:0,trimEnd:.5};
  const hits=[vectorStrokeContains(ctx,line,30,50),vectorStrokeContains(ctx,line,70,50)];
  const animated={...v,shapes:[line],tracks:[{shape:'line',channel:'trimEnd',keys:[{time:0,value:0,easing:'linear'},{time:2,value:1,easing:'linear'}]}]};
  const alpha=t=>vectorCanvas(animated,t,100,100).getContext('2d').getImageData(70,50,1,1).data[3];const animation=[alpha(0),alpha(1),alpha(2)];
  const api=window.shapeshiftStudio,fixture={...v,shapes:[{...line,name:'Draw-on stroke',commands:['M','C','M','C'],points:[10,40,20,0,80,80,90,40,10,75,25,45,75,105,90,75],trimMode:'off'}],tracks:[]};
  await api.dispatch({op:'vector.create',id:'trim-proof',src:source(svgText(fixture)).src});await api.dispatch({op:'vector.init',asset:'trim-proof',value:fixture});await api.artwork.openAsset('trim-proof');api.artwork.select('line');
  return {cases,endpointError,hits,animation};
 });
 for(const [name,result] of Object.entries(proof.cases)){assert.ok(result.exported.count<80&&result.exported.max<=8,`${name} export: ${JSON.stringify(result)}`);assert.ok(result.roundtrip.count<80&&result.roundtrip.max<=8,`${name} roundtrip: ${JSON.stringify(result)}`);assert.equal(result.shapeCount,name==='clipped'?2:1);}
 assert.ok(proof.endpointError<.02,JSON.stringify(proof));assert.deepEqual(proof.hits,[true,false]);assert.deepEqual(proof.animation,[0,0,255]);
 const state=()=>page.evaluate(()=>window.shapeshiftStudio.snapshot().project.assets.find(a=>a.id==='trim-proof').vector);
 await page.getByLabel('Trim path mode').selectOption('sequential');
 const set=async(label,value)=>{await page.getByLabel(label,{exact:true}).fill(String(value));await page.getByLabel(label,{exact:true}).press('Tab');};
 await set('Trim end percent',65);assert.equal((await state()).shapes[0].trimEnd,.65);
 await page.locator('#av-canvas').click({position:{x:5,y:5}});await page.keyboard.press('Meta+z');await page.waitForTimeout(150);assert.equal((await state()).shapes[0].trimEnd,.5);
 await page.keyboard.press('Meta+Shift+z');await page.waitForTimeout(150);assert.equal((await state()).shapes[0].trimEnd,.65);
 await page.evaluate(()=>window.shapeshiftStudio.artwork.select('line'));
 await page.getByLabel('Trim path mode').selectOption('synced');await page.locator('#av-record').check();
 await page.evaluate(()=>window.shapeshiftStudio.artwork.seek(2));await set('Trim offset percent',100);
 const track=(await state()).tracks.find(t=>t.channel==='trimOffset');assert.deepEqual(track.keys.map(k=>k.value),[0,1]);
 await page.evaluate(()=>window.shapeshiftStudio.artwork.seek(1));assert.equal(Number(await page.getByLabel('Trim offset percent',{exact:true}).inputValue()),50);
 await page.locator('#av-trim-key').click();assert.ok((await state()).tracks.some(t=>t.channel==='trimStart'));
 await page.getByLabel('Stroke cap',{exact:true}).selectOption('butt');assert.equal((await state()).shapes[0].lineCap,'butt');
 // Canvas picking follows the visible stroke; direct selection still has the original anchors.
 await page.locator('[data-trim="trimEnd"]').scrollIntoViewIfNeeded();
 await fs.mkdir('work/trim',{recursive:true});await page.screenshot({path:'work/trim/editor.png'});
 const downloadPromise=page.waitForEvent('download');await page.locator('#av-export').click();const download=await downloadPromise;await download.saveAs('work/trim/export.svg');
 assert.deepEqual(errors,[]);await fs.writeFile('work/trim/results.json',JSON.stringify({errors,...proof},null,2));console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();await fs.rm('dist/trim-test.js',{force:true});}
