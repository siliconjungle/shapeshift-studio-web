import test from 'node:test';import assert from 'node:assert/strict';
import {emptyProcedural} from '@shapeshift-labs/studio-core/procedural/model';
import {makeSpriteBinding} from '@shapeshift-labs/studio-core/procedural/bindings';
import {identity,poseAt,validateProject,removeJoint} from '../runtime.js';
import {ProjectStore} from '../store.js';import {applyCommand} from '../fx/commands.js';import {puppetSource} from '../puppet-sources.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(){const p={format:'inkwell-puppet',version:1,name:'Procedural cutout',assets:[],joints:[{id:'root',name:'Root',parent:null,rest:identity(),layer:0},{id:'piece',name:'Piece',parent:'root',rest:identity(),layer:1},{id:'detail',name:'Detail',parent:'piece',rest:{...identity(),x:10},layer:2}],clips:[{id:'motion',name:'Motion',duration:2,fps:30,loop:true,tracks:{}}],procedural:emptyProcedural()};
 p.procedural.gravity=[0,0];p.procedural.particles=[{id:'a',position:[0,0],mass:0,radius:1},{id:'b',position:[10,0],mass:0,radius:1}];return p;}
function bind(p,strength=1){const value=makeSpriteBinding(p.procedural,'piece',['a','b'],[1,0,0,1,0,0],{strength});applyCommand(p,{op:'procedural.bind',value});p.procedural.drivers.push({particle:'b',type:'target',origin:[-10,0],amplitude:[0,0],frequency:0});}
test('partial procedural turns preserve sprite size and carry detail children',()=>{const p=fixture();bind(p,.5);const pose=poseAt(p,p.clips[0],0);close(Math.hypot(pose.get('piece').world[0],pose.get('piece').world[1]),1);close(pose.get('piece').transform.rotation,90);close(pose.get('detail').world[4],0);close(pose.get('detail').world[5],10);});
test('bindings are opt-in and cache follows edits, undo, redo and JSON reload',()=>{const p=fixture(),store=new ProjectStore(p);const raw=poseAt(p,p.clips[0],0);store.edit(p=>bind(p));close(poseAt(store.project,store.project.clips[0],0).get('detail').world[4],-10);store.undo();assert.deepEqual(poseAt(store.project,store.project.clips[0],0).get('detail').world,raw.get('detail').world);store.redo();const loaded=validateProject(JSON.parse(JSON.stringify(store.project)));close(poseAt(loaded,loaded.clips[0],0).get('detail').world[4],-10);loaded.procedural.bindings[0].enabled=false;close(poseAt(loaded,loaded.clips[0],0).get('detail').world[4],10);});
test('linked puppet sources retain connected motion and reject cross-rig connections',()=>{const p=fixture();bind(p);assert.deepEqual(puppetSource(p).procedural,p.procedural);p.joints.push({id:'other',name:'Other',parent:null,rest:identity(),layer:0});p.puppetSources=[{id:'one',name:'One',roots:['root'],clips:['motion']}];assert.equal(puppetSource(p,undefined,'one').procedural.bindings.length,1);p.procedural.particles[0].joint='other';assert.throws(()=>puppetSource(p,undefined,'one'),/crosses linked/);});
test('deleting bound art leaves no dangling binding',()=>{const p=fixture();bind(p);removeJoint(p,'piece');assert.equal(p.procedural.bindings.length,0);validateProject(p);});

test('outline connections are validated, undoable, and removed with their endpoints',()=>{
 const p=fixture();p.assets.push({id:'art',src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>')});p.joints[1].sprite={asset:'art',width:10,height:10,pivotX:.5,pivotY:.5};p.procedural.surfaces.push({id:'skin',name:'Skin',layer:0,fill:'#abcdef',stroke:'#334455',strokeWidth:3,outline:'ink',shapes:[{type:'tube',particles:['a','b']}]});
 const store=new ProjectStore(p),connection={id:'neck',joint:'piece',surface:'skin',particle:'a',radius:20,enabled:true};store.edit(p=>applyCommand(p,{op:'procedural.connection',value:connection}));assert.deepEqual(store.project.procedural.connections,[connection]);store.undo();assert.equal(store.project.procedural.connections.length,0);store.redo();
 const saved=JSON.stringify(store.project);assert.throws(()=>store.edit(p=>applyCommand(p,{op:'procedural.connection',value:{...connection,particle:'missing'}})),/missing outline/);assert.equal(JSON.stringify(store.project),saved);
 assert.equal(puppetSource(store.project).procedural.connections.length,1);store.edit(p=>applyCommand(p,{op:'procedural.remove',surface:'skin'}));assert.equal(store.project.procedural.connections.length,0);store.undo();store.edit(p=>removeJoint(p,'piece'));assert.equal(store.project.procedural.connections.length,0);
});

import {proceduralExample} from './examples.js';
test('authored gait and support edits survive undo, redo and the portable puppet source',()=>{
 const store=new ProjectStore(proceduralExample('walker'));
 store.edit(p=>applyCommand(p,{op:'procedural.chain',id:'leg-0',values:{stepHeight:37,overshoot:.8}}));
 store.edit(p=>applyCommand(p,{op:'procedural.support',value:{...p.procedural.supports[0],height:100}}));
 const source=puppetSource(validateProject(JSON.parse(JSON.stringify(store.project))));assert.equal(source.procedural.chains[0].stepHeight,37);assert.equal(source.procedural.supports[0].height,100);assert.deepEqual(source.procedural.gaits[0].groups,[['leg-0','leg-3'],['leg-1','leg-2']]);
 const snapshot=poseAt(store.project,store.project.clips[0],11).procedural;store.undo();assert.equal(store.project.procedural.supports[0].height,120);store.redo();assert.deepEqual(poseAt(store.project,store.project.clips[0],11).procedural,snapshot);assert.ok(snapshot.supports[0].angle<-.02);assert.ok(snapshot.contacts.filter(c=>c.grounded).length>=2);
});

import {signedArea} from '@shapeshift-labs/studio-core/procedural/model';
import {ProceduralTimeline} from '@shapeshift-labs/studio-core/procedural/simulation';
test('soft creature keeps its area while its weighted shoulders and sprite face follow deformation',()=>{
 const p=proceduralExample('soft-creature'),timeline=new ProceduralTimeline(p.procedural),f=timeline.sample(6),area=p.procedural.areas[0],ratio=signedArea(area.particles.map(id=>f.points.get(id)))/area.area;
 assert.ok(Math.abs(ratio-1)<.01);assert.ok(f.collisions.length>0);
 const a=p.procedural.attachments.find(a=>a.particle==='hip-0'),left=f.points.get(a.sources[0]),right=f.points.get(a.sources[1]),u=f.points.get(a.orient[0]),v=f.points.get(a.orient[1]),length=Math.hypot(v[0]-u[0],v[1]-u[1]),x=(v[0]-u[0])/length,y=(v[1]-u[1])/length,expected=left.map((value,k)=>(value*a.weights[0]+right[k]*a.weights[1])/(a.weights[0]+a.weights[1]));
 close(f.points.get('hip-0')[0],expected[0]+x*a.offset[0]-y*a.offset[1]);close(f.points.get('hip-0')[1],expected[1]+y*a.offset[0]+x*a.offset[1]);
 const pose=poseAt(p,p.clips[0],6),face=pose.get('face-piece').world;close(face[4],f.points.get('face')[0]);close(face[5],f.points.get('face')[1]);
 for(const n of p.procedural.particles.filter(n=>n.mass))assert.ok(f.points.get(n.id)[1]<=150-n.radius+1e-6);
 timeline.sample(.1);assert.deepEqual(timeline.sample(6),f);
});

test('weighted attachments are editable, undoable and remapped with a library copy',()=>{
 const store=new ProjectStore(proceduralExample('soft-creature')),original=store.project.procedural.attachments[0];
 store.edit(p=>applyCommand(p,{op:'procedural.attachment',value:{...original,weights:[1,4],offset:[8,15]}}));assert.deepEqual(store.project.procedural.attachments.at(-1).weights,[1,4]);store.undo();assert.deepEqual(store.project.procedural.attachments[0],original);store.redo();
 store.edit(p=>applyCommand(p,{op:'library.capture',id:'soft',name:'Soft creature',category:'characters',node:'root'}));store.edit(p=>applyCommand(p,{op:'library.place',id:'soft',instance:'copy',position:[500,0]}));
 const p=validateProject(JSON.parse(JSON.stringify(store.project))),link=p.joints.find(n=>n.id==='copy').librarySource.procedural,definition=p.procedural.attachments.find(a=>a.id===link.bindings.attachments[original.id]);assert.equal(definition.particle,link.bindings.particles[original.particle]);assert.deepEqual(definition.sources,original.sources.map(id=>link.bindings.particles[id]));assert.deepEqual(definition.orient,original.orient.map(id=>link.bindings.particles[id]));assert.equal(puppetSource(p).procedural.attachments.length,20);const surface=p.procedural.surfaces.find(s=>s.id===link.bindings.surfaces['body-surface']);assert.equal(surface.shapes[0].curve,1);
});

test('an explicit live frame drives sprite bindings and children without changing timeline sampling',()=>{
 const p=fixture();bind(p);const before=JSON.stringify(p),ordinary=poseAt(p,p.clips[0],.5).get('piece').world.slice();
 const frame={time:.5,points:new Map([['a',[20,30]],['b',[20,40]]]),surfaces:[]},live=poseAt(p,p.clips[0],.5,{proceduralPose:frame});
 assert.equal(live.procedural,frame);close(live.get('piece').world[4],20);close(live.get('piece').world[5],30);close(live.get('detail').world[4],20);close(live.get('detail').world[5],40);assert.deepEqual(poseAt(p,p.clips[0],.5).get('piece').world,ordinary);assert.equal(JSON.stringify(p),before);
});

test('the top-down spine and limb study keeps attachments and planted steps consistent',()=>{
 const p=proceduralExample('spine-limbs');validateProject(p);const timeline=new ProceduralTimeline(p.procedural);let stepping=false,previous;
 for(let i=0;i<=240;i++){
  const f=timeline.sample(i/60);for(const c of f.contacts){if(c.moving)stepping=true;if(c.grounded&&previous?.contacts.find(v=>v.id===c.id)?.grounded){const old=previous.contacts.find(v=>v.id===c.id);assert.ok(Math.hypot(...c.position.map((v,k)=>v-old.position[k]))<.01);}assert.ok(c.error<.01);}
  for(const c of p.procedural.chains.filter(c=>c.mode==='step'))for(let j=1;j<c.particles.length;j++)assert.ok(Math.abs(Math.hypot(...f.points.get(c.particles[j]).map((v,k)=>v-f.points.get(c.particles[j-1])[k]))-c.lengths[j-1])<.01);
  previous=f;
 }
 assert.ok(stepping);const expected=timeline.sample(3);timeline.sample(0);assert.deepEqual(timeline.sample(3),expected);
});

test('three-segment sprite legs keep their lengths, artwork and planted contacts across terrain',()=>{
 const p=validateProject(proceduralExample('sprite-walker')),timeline=new ProceduralTimeline(p.procedural),before=JSON.stringify(p);let previous,stepped=false;
 for(let i=0;i<=660;i++){
  const frame=timeline.sample(i/60);assert.ok(frame.contacts.filter(c=>c.grounded).length>=2);
  for(const c of frame.contacts){assert.ok(c.error<.01);stepped||=c.moving;const prior=previous?.contacts.find(v=>v.id===c.id);if(c.grounded&&prior?.grounded)assert.ok(Math.hypot(...c.position.map((v,k)=>v-prior.position[k]))<.01);}
  for(const c of p.procedural.chains)for(let j=1;j<c.particles.length;j++)close(Math.hypot(...frame.points.get(c.particles[j]).map((v,k)=>v-frame.points.get(c.particles[j-1])[k])),c.lengths[j-1]);previous=frame;
 }
 const pose=poseAt(p,p.clips[0],11);for(const b of p.procedural.bindings){const m=pose.get(b.joint).world,point=pose.procedural.points.get(b.particles[0]);close(m[4],point[0]);close(m[5],point[1]);close(Math.hypot(m[0],m[1]),1);}
 assert.equal(p.procedural.bindings.length,13);assert.ok(stepped);assert.equal(JSON.stringify(p),before);timeline.sample(0);assert.deepEqual(timeline.sample(11),previous);
});
