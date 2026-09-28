import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {sample,prepare,frame,beats,DURATION,mouthWeights} from './performance.js';
import {validateVector,svgText} from '@shapeshift-labs/studio-core/vector/model';
const load=p=>fs.readFile(new URL(p,import.meta.url),'utf8').then(JSON.parse);
const drawings=await load('./assets/svg/drawings.json'),original=await load('../assets/performance/drawings.json'),manifest=await load('../audio/babble/manifest.json'),art=prepare(drawings,original);
test('production drawings are genuine vectors on the shared canvas',async()=>{
 const pipeline=await load('./assets/svg/pipeline.json');assert.equal(pipeline.perDrawingScale,false);assert.equal(pipeline.metrics.length,8);
 for(const d of Object.values(drawings)){validateVector(d);assert.deepEqual(d.viewBox,[0,0,640,640]);assert.doesNotMatch(svgText(d),/<image|data:image\/png/);}
});
test('anticipation retains the same artwork and moves an eyelid over the pupil',()=>{
 const p=sample(.765);assert.equal(p.drawing,'composed');assert.ok(p.lid>.99);assert.equal(sample(.86).lid,0);
 const q={...p,headY:0,tilt:0,sx:1,sy:1,hat:0};
 for(const id of ['composed-18','composed-20'])assert.deepEqual(frame(art,q).find(s=>s.id===id).points,drawings.composed.shapes.find(s=>s.id===id).points);
});
test('movement controls stay continuous across every drawing change and seeking is deterministic',()=>{
 for(const [at]of beats.slice(1)){const a=sample(at-1e-6),b=sample(at+1e-6);for(const key of ['headY','tilt','sx','sy','hat'])assert.ok(Math.abs(a[key]-b[key])<.001,key+' jumped at '+at);}
 const times=Array.from({length:70},(_,i)=>i*DURATION/69),first=times.map(t=>frame(art,sample(t)));
 for(const [i,t]of times.entries()){const reverse=frame(art,sample(times.toReversed()[i]));assert.deepEqual(reverse,first[first.length-1-i]);for(const s of frame(art,sample(t)))assert.ok(s.points.every(Number.isFinite));}
 assert.deepEqual(frame(art,sample(0)),frame(art,sample(DURATION)));
});
test('voice changes only the local mouth and tongue, with tongue clipped to the opening',()=>{
 const pose=sample(2),baseline=frame(art,{...pose,drawing:'settle'});
 for(const id of ['AI','E','O','MBP']){
  const result=frame(art,{...pose,drawing:'settle'},{AI:0,E:0,O:0,MBP:0,[id]:1});
  assert.deepEqual(result.filter(s=>!['settle-3','settle-9'].includes(s.id)),baseline.filter(s=>!['settle-3','settle-9'].includes(s.id)));
  assert.equal(result.find(s=>s.id==='settle-9').clip,'settle-3');
  if(id==='MBP')assert.equal(result.find(s=>s.id==='settle-9').opacity,0);
 }
 for(let t=0;t<manifest.clips.excited.duration;t+=.005){const w=mouthWeights(manifest.clips.excited.cues,t);assert.ok(Math.abs(Object.values(w).reduce((a,b)=>a+b)-1)<1e-8);const result=frame(art,{...pose,drawing:'settle'},w);assert.ok(result.every(s=>s.points.every(Number.isFinite)));}
});
