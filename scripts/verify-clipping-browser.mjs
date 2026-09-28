// Run npm run build and npm start first. Tests the production editor and render modules.
import {chromium} from 'playwright';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await build({stdin:{contents:"export * from './puppet-studio/vector/model.js'; export * from './puppet-studio/vector/render.js'; export * from './puppet-studio/vector/import.js';",resolveDir:process.cwd()},bundle:true,format:'esm',outfile:'dist/clipping-test.js'});
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4354/puppet-studio/index.html?artwork');await page.waitForFunction(()=>window.shapeshiftStudio?.artwork);
 const proof=await page.evaluate(async()=>{
  const {renderVector,svgText,importVector,vectorClipContains,sampleVector}=await import('/clipping-test.js');
  const rect=(id,x=0,y=0,w=100,h=100)=>({id,name:id,commands:['M','L','L','L','Z'],points:[x,y,x+w,y,x+w,y+h,x,y+h],fill:'#e85a54',stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round',hidden:false,locked:false});
  const v={version:1,viewBox:[0,0,100,100],duration:2,loop:false,swatches:[],tracks:[],shapes:[{...rect('target'),clips:[{source:'source',rule:'nonzero'}]},{...rect('source',20,20,60,60),hidden:true}]};
  window.clippingFixture=structuredClone(v);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=100;const ctx=canvas.getContext('2d');
  const pixel=(x,y)=>Array.from(ctx.getImageData(x,y,1,1).data),source=s=>({src:'data:image/svg+xml,'+encodeURIComponent(s)});
  renderVector(ctx,v);const inside=pixel(50,50),outside=pixel(10,10),hits=[vectorClipContains(ctx,v,v.shapes[0],v.shapes,50,50),vectorClipContains(ctx,v,v.shapes[0],v.shapes,10,10)];
  const compare=async vector=>{ctx.clearRect(0,0,100,100);renderVector(ctx,vector);const before=ctx.getImageData(0,0,100,100).data;const svg=svgText(vector),image=new Image();image.src=source(svg).src;await image.decode();ctx.clearRect(0,0,100,100);ctx.drawImage(image,0,0);const after=ctx.getImageData(0,0,100,100).data;let differences=0;for(let i=0;i<before.length;i++)if(before[i]!==after[i])differences++;const imported=await importVector(source(svg));ctx.clearRect(0,0,100,100);renderVector(ctx,imported);const again=ctx.getImageData(0,0,100,100).data;let roundtrip=0;for(let i=0;i<before.length;i++)if(before[i]!==again[i])roundtrip++;return {differences,roundtrip};};
  const normal=await compare(v);v.shapes[0].clips[0].inverse=true;const inverse=await compare(v);const inverseInside=pixel(50,50),inverseOutside=pixel(10,10);
  v.shapes[0].clips[0].inverse=false;v.shapes.push({...rect('second',0,0,50,100),hidden:true});v.shapes[0].clips.push({source:'second',rule:'evenodd'});const multiple=await compare(v);
  const compound=rect('compound');compound.commands.push('M','L','L','L','Z');compound.points.push(30,30,70,30,70,70,30,70);compound.hidden=true;v.shapes.push(compound);v.shapes[0].clips=[{source:'compound',rule:'evenodd'}];const evenodd=await compare(v),hole=pixel(50,50);
  v.shapes[0].clips=[{source:'source',rule:'nonzero'}];v.tracks=[{shape:'source',channel:'points',keys:[{time:0,value:rect('s',20,20,60,60).points,easing:'linear'},{time:2,value:rect('s',40,20,60,60).points,easing:'linear'}]}];ctx.clearRect(0,0,100,100);renderVector(ctx,v,2);const moved=[pixel(25,50)[3],pixel(45,50)[3]];
  // Group-level clipping with different transforms: the source follows its owner's space.
  const grouped=await importVector(source('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><clipPath id="c"><rect width="20" height="40"/></clipPath></defs><g transform="translate(20 10)" clip-path="url(#c)"><rect width="60" height="60" fill="#ff0000"/><rect transform="translate(0 20)" width="60" height="20" fill="#00ff00"/></g></svg>'));
  ctx.clearRect(0,0,100,100);renderVector(ctx,grouped);const groupPixels=[pixel(25,15),pixel(25,35),pixel(45,35)];
  const api=window.shapeshiftStudio;await api.dispatch({op:'vector.create',id:'clipping-proof',src:source(svgText(window.clippingFixture)).src});await api.dispatch({op:'vector.init',asset:'clipping-proof',value:{...window.clippingFixture,shapes:window.clippingFixture.shapes.map(s=>({...s,clips:[],hidden:false}))}});await api.artwork.openAsset('clipping-proof');api.artwork.select('target');
  return {inside,outside,hits,normal,inverse,inverseInside,inverseOutside,multiple,evenodd,hole,moved,groupPixels};
 });
 assert.equal(proof.inside[3],255);assert.equal(proof.outside[3],0);assert.deepEqual(proof.hits,[true,false]);
 for(const key of ['normal','inverse','multiple','evenodd'])assert.deepEqual(proof[key],{differences:0,roundtrip:0},key);
 assert.equal(proof.inverseInside[3],0);assert.equal(proof.inverseOutside[3],255);assert.equal(proof.hole[3],0);assert.deepEqual(proof.moved,[0,255]);assert.deepEqual(proof.groupPixels,[[255,0,0,255],[0,255,0,255],[0,0,0,0]]);
 // Author via inspector, with persisted state and history.
 await page.locator('#av-clip-source').selectOption('source');await page.locator('#av-clip-add').click();
 const state=()=>page.evaluate(()=>window.shapeshiftStudio.snapshot().project.assets.find(a=>a.id==='clipping-proof').vector);
 assert.equal((await state()).shapes[0].clips[0].source,'source');assert.equal((await state()).shapes[1].hidden,true);
 await page.locator('[data-clip-operation="source"]').selectOption('outside');assert.equal((await state()).shapes[0].clips[0].inverse,true);
 await page.locator('#av-canvas').click({position:{x:5,y:5}});await page.keyboard.press('Meta+z');await page.waitForTimeout(150);assert.equal((await state()).shapes[0].clips[0].inverse,undefined);
 await page.keyboard.press('Meta+Shift+z');await page.waitForTimeout(150);assert.equal((await state()).shapes[0].clips[0].inverse,true);
 await page.evaluate(()=>window.shapeshiftStudio.artwork.select('target'));
 await page.locator('[data-clip-remove="source"]').click();assert.equal((await state()).shapes[0].clips.length,0);
 await page.locator('#av-clip-pick').click();await page.locator('[data-shape="source"] span').click();assert.equal((await state()).shapes[0].clips[0].source,'source');
 const downloadPromise=page.waitForEvent('download');await page.locator('#av-export').click();const download=await downloadPromise;await fs.mkdir('work/clipping',{recursive:true});await download.saveAs('work/clipping/export.svg');
 await page.screenshot({path:'work/clipping/editor.png'});await fs.writeFile('work/clipping/results.json',JSON.stringify({errors,...proof},null,2));assert.deepEqual(errors,[]);console.log(JSON.stringify({errors,...proof},null,2));
}finally{await browser.close();await fs.rm('dist/clipping-test.js',{force:true});}
