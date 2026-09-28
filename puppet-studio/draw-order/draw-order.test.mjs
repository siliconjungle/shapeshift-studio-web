import test from 'node:test';
import assert from 'node:assert/strict';
import {drawOrderExample} from './example.js';
import {resolvedDrawOrder,drawOrderLayers,activeDrawOrder} from './model.js';
import {poseAt,validateProject,removeJoint} from '../runtime.js';
import {applyCommand} from '../fx/commands.js';
import {ProjectStore} from '../store.js';
import {timelineRows} from '../authoring/timeline.js';
import {libraryPacket} from '../authoring/library-transfer.js';
import {libraryPreviewProject} from '../authoring/library.js';
import {puppetSource} from '../puppet-sources.js';
const order=(p,t=0,c=p.clips[0])=>resolvedDrawOrder(p,c,t),edit=(s,c)=>s.edit(p=>applyCommand(p,c));
test('group rules switch at the exact hold key and Normal restores base order',()=>{
 const p=validateProject(drawOrderExample());for(const t of [0,.5,.999,2,2.9,4])assert.deepEqual(order(p,t),['sleeve','hand','body']);for(const t of [1,1.5,3,3.5])assert.deepEqual(order(p,t),['body','sleeve','hand']);assert.equal(activeDrawOrder(p.drawOrder[0],p.clips[0],.999),null);
});
test('defaults work in rig mode, unkeyed clips and before the first key',()=>{
 const p=drawOrderExample();p.clips[0].drawOrderTracks[0].keys=p.clips[0].drawOrderTracks[0].keys.slice(1);applyCommand(p,{op:'drawOrder.default',node:'arm',rule:'front'});assert.deepEqual(order(p,0,null),['body','sleeve','hand']);applyCommand(p,{op:'drawOrder.default',node:'arm',rule:null});assert.deepEqual(order(p,.5),['sleeve','hand','body']);assert.deepEqual(order(p,1),['body','sleeve','hand']);
});
test('sampling preserves hierarchy, transforms and authored layers without scrub history',()=>{
 const p=drawOrderExample(),before=JSON.stringify(p),reference=poseAt({...p,drawOrder:[]},p.clips[0],1.5);for(const t of [1.5,3,0,4,1.5]){const pose=poseAt(p,p.clips[0],t);if(t===1.5){for(const [id,n]of pose)assert.deepEqual(n.world,reference.get(id).world);assert.ok(pose.drawOrderLayers.get('sleeve')>pose.drawOrderLayers.get('body'));}}assert.equal(JSON.stringify(p),before);
});
test('single pieces, reverse relative links and equal base layers resolve deterministically',()=>{
 const p=drawOrderExample();p.drawOrder=[];p.clips[0].drawOrderTracks=[];p.joints.forEach(j=>j.layer=0);applyCommand(p,{op:'drawOrder.add',node:'body',id:'below',target:'sleeve',placement:'below'});applyCommand(p,{op:'drawOrder.default',node:'body',rule:'below'});assert.deepEqual(order(p),['body','sleeve','hand']);const layers=drawOrderLayers(p,null,0);assert.ok(layers.get('body')<layers.get('sleeve')&&layers.get('sleeve')<layers.get('hand'));
});
test('nested groups preserve internal rules when the parent group moves',()=>{
 const p=drawOrderExample();applyCommand(p,{op:'drawOrder.add',node:'hand',id:'first',target:'sleeve',placement:'below'});applyCommand(p,{op:'drawOrder.default',node:'hand',rule:'first'});assert.deepEqual(order(p,1),['body','hand','sleeve']);
});
test('invalid targets, active cycles and non-hold keys roll back atomically',()=>{
 const p=drawOrderExample(),before=JSON.stringify(p);for(const target of ['arm','sleeve','missing','root']){assert.throws(()=>applyCommand(p,{op:'drawOrder.add',node:'arm',target}));assert.equal(JSON.stringify(p),before);}applyCommand(p,{op:'drawOrder.add',node:'body',target:'sleeve',placement:'above',id:'loop'});const valid=JSON.stringify(p);assert.throws(()=>applyCommand(p,{op:'drawOrder.key',node:'body',clip:'cross',time:1,rule:'loop'}),/cycle|conflict/);assert.equal(JSON.stringify(p),valid);p.clips[0].drawOrderTracks[0].keys[0].easing='linear';assert.throws(()=>validateProject(p),/held/);
});
test('held timeline values can be changed, retimed and deleted, but cannot gain interpolation',()=>{
 const store=new ProjectStore(drawOrderExample()),ref={row:'drawOrder:arm',time:1};assert.equal(timelineRows(store.project,{clip:'cross'}).find(r=>r.id===ref.row).discrete,true);edit(store,{op:'timeline.edit',clip:'cross',keys:[ref],delta:.25,value:'behind'});assert.equal(activeDrawOrder(store.project.drawOrder[0],store.project.clips[0],1.25),'behind');assert.throws(()=>edit(store,{op:'timeline.edit',clip:'cross',keys:[{...ref,time:1.25}],easing:'bezier'}),/hold/);edit(store,{op:'timeline.edit',clip:'cross',keys:[{...ref,time:1.25}],remove:true});store.undo();assert.ok(store.project.clips[0].drawOrderTracks[0].keys.some(k=>k.time===1.25));
});
test('deleting rules or targets converts dangling keys to Normal and undo restores them',()=>{
 const store=new ProjectStore(drawOrderExample());edit(store,{op:'drawOrder.remove',node:'arm',id:'front'});assert.equal(store.project.clips[0].drawOrderTracks[0].keys[1].value,null);store.undo();assert.equal(store.project.clips[0].drawOrderTracks[0].keys[1].value,'front');store.edit(p=>removeJoint(p,'body'));assert.equal(store.project.drawOrder[0].rules.length,0);validateProject(store.project);store.undo();store.edit(p=>removeJoint(p,'arm'));assert.equal(store.project.drawOrder.length,0);assert.equal(store.project.clips[0].drawOrderTracks.length,0);
});
test('project save/load and 3D puppet source extraction retain animated order',()=>{
 const p=validateProject(JSON.parse(JSON.stringify(drawOrderExample()))),source=puppetSource(p);assert.deepEqual(order(source,1),['body','sleeve','hand']);p.puppetSources=[{id:'character',name:'Character',roots:['root'],clips:['cross']}];validateProject(p);assert.deepEqual(order(puppetSource(p,undefined,'character'),1),['body','sleeve','hand']);
});
test('library capture, independent placement, publishing and preview retain relative rules',()=>{
 const src=new ProjectStore(drawOrderExample());edit(src,{op:'library.capture',id:'character',name:'Character',category:'characters',node:'root'});const preview=libraryPreviewProject(src.project,src.project.library.items[0]);validateProject(preview.project);assert.deepEqual(order(preview.project,1),['body','sleeve','hand']);const p=drawOrderExample();p.drawOrder=[];p.clips[0].drawOrderTracks=[];const dest=new ProjectStore(p);edit(dest,{op:'library.import',value:libraryPacket(src.project,src.project.library.items[0])});for(const instance of ['a','b'])edit(dest,{op:'library.place',id:'character',instance,position:[300,0]});for(const id of ['a','b']){const link=dest.project.joints.find(j=>j.id===id).librarySource,c=dest.project.clips.find(c=>c.id===link.motion.bindings.cross),sequence=order(dest.project,1,c);assert.ok(sequence.indexOf(link.bindings.sleeve)>sequence.indexOf(link.bindings.body));}const link=dest.project.joints.find(j=>j.id==='a').librarySource;edit(dest,{op:'drawOrder.update',node:link.bindings.arm,id:'front',values:{name:'Reach forward'}});edit(dest,{op:'library.updateSource',id:'character',instance:'a'});assert.ok(dest.project.drawOrder.every(e=>e.rules.find(r=>r.id==='front').name==='Reach forward'));validateProject(JSON.parse(JSON.stringify(dest.project)));
});
