import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {frogRig,reaction,speak} from '../experiments/expressive-character/frog/rig.js';
import {prepareArtwork,frogFrame} from '../experiments/expressive-character/frog/puppet.js';
import {validatePortrait,blendControls,VISEMES} from './controls.js';
import {bakePortrait} from './studio-export.js';
import {validateProject,poseAt} from '../runtime.js';
import {validateVector,sampleVector} from '@shapeshift-labs/studio-core/vector/model';
import {point} from '@shapeshift-labs/studio-core/joint-transforms';
const art=prepareArtwork(JSON.parse(fs.readFileSync(new URL('../experiments/expressive-character/frog/assets/artwork.json',import.meta.url))));
test('nine reaction timelines validate, are reversible and preserve valid vector paths',()=>{
 validatePortrait(frogRig);
 for(const clip of frogRig.clips){const before=frogFrame(art,reaction(frogRig,clip.id,.4));frogFrame(art,reaction(frogRig,clip.id,2));assert.deepEqual(frogFrame(art,reaction(frogRig,clip.id,.4)),before);
 for(let t=0;t<=clip.duration;t+=.1)for(const l of frogFrame(art,reaction(frogRig,clip.id,t),t).layers)if(l.shapes.length)validateVector({version:1,viewBox:[-410,-400,820,820],duration:4,loop:false,swatches:[],shapes:l.shapes,tracks:[]});}
});
test('mouth stays above chin in all reaction and speech extremes',()=>{
 for(const clip of frogRig.clips)for(const viseme of Object.values(VISEMES)){
 const p={...clip.target,...viseme},f=frogFrame(art,p),mouth=f.layers.find(l=>l.id==='features').shapes.find(s=>s.id==='mouth'),face=f.layers.find(l=>l.id==='face');
 const mouthBottom=Math.max(...mouth.points.filter((_,i)=>i%2)),faceBottom=Math.max(...face.shapes.flatMap(s=>s.points.filter((_,i)=>i%2)));assert.ok(mouthBottom<faceBottom-12,clip.id+' mouth outside face');}
});
test('finger-to-chin contact follows rotated and translated head',()=>{
 const p={...frogRig.defaults,point:1,tilt:22,headY:14,headX:8},f=frogFrame(art,p),hand=f.layers.find(l=>l.id==='hand-left'),tip=point(hand.world,{x:10,y:-138}),target=f.anchors.left.contact;
 assert.ok(Math.hypot(tip.x-target.x,tip.y-target.y)<.001);
});
test('interruptions and speech keep finite continuous controls',()=>{
 const a=frogRig.clips.find(c=>c.id==='croak').target,b=frogRig.clips.find(c=>c.id==='panic').target;
 for(let t=0;t<=1;t+=.01){const p=blendControls(frogRig,a,b,t);assert.ok(Object.values(p).every(Number.isFinite));}
 const cues=[{start:.1,end:.3,pose:'O'},{start:.28,end:.5,pose:'MBP'}];let previous=speak(a,cues,0);
 for(let t=.005;t<.7;t+=.005){const next=speak(a,cues,t);assert.ok(Math.abs(next.jaw-previous.jaw)<.1);previous=next;}
});
test('native Studio bake validates and retains matching morph topology',()=>{
 const p=bakePortrait({name:'Frog test',duration:2.5,frameAt:t=>frogFrame(art,reaction(frogRig,'delight',t),t)});validateProject(p);assert.equal(p.joints.length,12);assert.ok(p.assets.some(a=>a.vector.tracks.some(t=>t.channel==='points')));
 for(const t of [0,.5,1,2.5]){const poses=poseAt(p,p.clips[0],t);assert.equal(poses.size,12);for(const a of p.assets)for(const shape of sampleVector(a.vector,t))assert.ok(shape.points.every(Number.isFinite));}
});
test('Hume chunk phonemes use measured recording times and cover vowel groups',()=>{
 const m=JSON.parse(fs.readFileSync(new URL('../experiments/expressive-character/frog/audio/babble/manifest.json',import.meta.url)));const used=new Set();assert.equal(Object.keys(m.clips).length,6);
 for(const c of Object.values(m.clips)){assert.ok(c.duration>1&&c.duration<4);for(const q of c.cues){assert.ok(q.start>=0&&q.end>q.start&&q.end<=c.duration+.001);assert.ok(q.phoneme);used.add(q.pose);}}
 for(const v of ['AI','E','O','U','MBP','FV','L'])assert.ok(used.has(v),v);
});
