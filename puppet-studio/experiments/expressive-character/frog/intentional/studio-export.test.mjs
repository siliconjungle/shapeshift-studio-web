import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {sampleVector} from '@shapeshift-labs/studio-core/vector/model';
import {validateProject} from '../../../../runtime.js';
import {prepare,beats,DURATION} from './performance.js';
import {nativeFrame} from './studio-export.js';
const load=p=>fs.readFile(new URL(p,import.meta.url),'utf8').then(JSON.parse);
const [project,drawings,original,manifest,native]=await Promise.all(['./frog-intentional.puppet.json','./assets/svg/drawings.json','../assets/performance/drawings.json','../audio/babble/manifest.json','./assets/native/artwork.json'].map(load));
const art=prepare(drawings,original),variants=new Set(beats.map(b=>b[1]));
test('portable project contains editable vectors with separate wardrobe, acting and eyelid layers',()=>{
 validateProject(project);assert.equal(project.assets.length,10);
 assert.deepEqual(project.joints.filter(j=>j.layer===4).map(j=>j.id),['hat']);
 for(const a of project.assets){assert.ok(a.vector.shapes.every(s=>!s.clip));assert.ok(!a.src.includes('image/png'));assert.ok(a.vector.tracks.length);}
});
test('exactly one authored face/hand drawing is visible across every boundary, including reverse seeking',()=>{
 for(const t of [...beats.flatMap(([t])=>[Math.max(0,t-.000002),t,t+.000002]),DURATION].toReversed()){
  const expected=nativeFrame(art,native,manifest,t).pose.drawing;
  const visible=project.assets.filter(a=>variants.has(a.id)&&sampleVector(a.vector,t).some(s=>s.opacity>.5)).map(a=>a.id);
  assert.deepEqual(visible,[expected],'Drawing switch at '+t);
 }
});
test('reduced native keys retain the browser controls and local mouth performance',()=>{
 const times=[0,.64,.765,.80,.86,.97,1,1.075,1.18,1.29,1.43,2,2.3,2.76,3.55,4.08,4.45,5.1,6.85,7.02,7.16,7.25,7.31,7.5,8.8];let worst=0;
 for(const t of times){const expected=nativeFrame(art,native,manifest,t);
  for(const layer of expected.layers){const a=project.assets.find(a=>a.id===layer.id),actual=sampleVector(a.vector,t);assert.equal(actual.length,layer.shapes.length);
   for(let i=0;i<actual.length;i++){const s=actual[i],ref=layer.shapes[i];if(ref.opacity===0)continue;
    assert.equal(s.points.length,ref.points.length,s.id);const error=s.points.reduce((m,p,j)=>Math.max(m,Math.abs(p-ref.points[j])),0);worst=Math.max(worst,error);
    assert.ok(error<.5,`${s.id} at ${t}: ${error.toFixed(3)}px`);
   }
  }
 }
 console.log('Native point error at review poses:',worst.toFixed(3)+'px');
});
