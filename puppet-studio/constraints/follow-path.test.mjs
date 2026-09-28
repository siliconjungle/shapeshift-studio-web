import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePath} from '../vector/model.js';
import {poseAt,validateProject,identity,removeJoint} from '../runtime.js';
import {applyCommand} from '../fx/commands.js';
import {ProjectStore} from '../store.js';
import {constraintDefaults,validateConstraints} from './model.js';
import {followPathExample} from './path-example.js';
import {timelineRows,applyTimelineCommand} from '../authoring/timeline.js';
import {bindVector} from '../bone-binding/model.js';
import {puppetSource} from '../puppet-sources.js';
import {libraryPreviewProject} from '../authoring/library.js';
const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} ≠ ${b}`),close=(a,b)=>a.forEach((v,i)=>near(v,b[i]));
function fixture(){const p=followPathExample(),v=p.assets[0].vector;v.viewBox=[0,0,100,100];v.shapes[0].commands=['M','L'];v.shapes[0].points=[0,0,100,0];p.joints[1].sprite={asset:'route-art',width:100,height:100,pivotX:0,pivotY:0};p.clips[0].constraintTracks=[];p.clips[0].loop=false;return p;}
const solved=(p,t=0)=>poseAt(p,p.clips[0],t).get('plane');
test('path sampling uses arc length, wraps either direction and preserves exact endpoints',()=>{
 const shape={commands:['M','C'],points:[0,0,0,0,0,0,100,0]};for(const [t,x]of [[0,0],[.25,25],[.5,50],[1,100],[2,100],[1.25,25],[-.25,75]])close(samplePath(shape,t).position,[x,0]);close(samplePath(shape,0).tangent,[1,0]);close(samplePath(shape,1).position,[100,0]);
 shape.points=[0,0,0,100,100,100,100,0];close(samplePath(shape,.5).position,[50,75]);close(samplePath(shape,.5).tangent,[1,0]);
 shape.commands=['M','L','M','L'];shape.points=[0,0,100,0,0,20,300,20];close(samplePath(shape,.5).position,[100,20]);assert.equal(samplePath({commands:['M','L'],points:[1,1,1,1]},.5),null);
});
test('Follow Path handles keyed distance, partial strength, offset, orientation and scrubbing without drift',()=>{
 const p=fixture(),c=p.constraints[0];c.distance=.5;Object.assign(p.joints[2].rest,{x:10,y:20,rotation:40});validateProject(p);close(solved(p).world.slice(4),[50,0]);near(solved(p).transform.rotation,0);c.ownerOffset=true;close(solved(p).world.slice(4),[60,20]);c.orient=false;near(solved(p).transform.rotation,40);c.strength=.5;close(solved(p).world.slice(4),[35,20]);
 c.ownerOffset=false;c.strength=1;for(const [time,value]of [[0,0],[6,1]])applyCommand(p,{op:'constraint.key',id:c.id,clip:'fly',channel:'distance',time,value});for(const t of [6,3,0,3])near(solved(p,t).world[4],100*t/6);
});
test('world path distances and tangent orientation survive mirrored nonuniform parents',()=>{
 const p=fixture();p.joints.push({id:'parent',name:'Parent',parent:'root',layer:0,rest:{...identity(),x:30,y:-20,rotation:32,scaleX:-2,scaleY:.4}});p.joints[2].parent='parent';p.joints[2].rest.scaleX=-1.5;p.joints[1].rest={...identity(),x:20,y:30,rotation:60,scaleX:2,scaleY:.6};p.constraints[0].distance=.5;const pose=poseAt(p,p.clips[0],0),route=pose.get('route').world,plane=pose.get('plane').world;close(plane.slice(4),[route[0]*50+route[4],route[1]*50+route[5]]);near(plane[0]/Math.hypot(plane[0],plane[1]),.5);near(plane[1]/Math.hypot(plane[0],plane[1]),Math.sqrt(3)/2);near(pose.get('plane').transform.scaleX,-1.5);
});
test('targets resolve before followers and degenerate paths leave the authored pose intact',()=>{
 const p=fixture();p.joints.push({id:'goal',name:'Goal',parent:'root',layer:0,rest:{...identity(),x:80,y:90}});p.constraints.push(constraintDefaults('move','route','translation',2,'goal'));p.constraints[0].distance=.5;close(solved(p).world.slice(4),[130,90]);p.assets[0].vector.shapes[0].points=[0,0,0,0];close(solved(p).world.slice(4),[0,0]);
});
test('hidden paths, point morphs and in-place edits use current geometry',()=>{
 const p=fixture(),v=p.assets[0].vector;p.constraints[0].distance=.5;v.shapes[0].hidden=true;v.shapes[0].trimMode='sequential';v.shapes[0].trimEnd=0;v.tracks=[{shape:'flight-path',channel:'points',keys:[{time:0,value:[0,0,100,0],easing:'linear'},{time:6,value:[0,0,200,100],easing:'linear'}]}];close(solved(p,3).world.slice(4),[75,25]);v.tracks=[];close(solved(p).world.slice(4),[50,0]);v.shapes[0].points[2]=200;close(solved(p).world.slice(4),[100,0]);
});
test('bone-bound path targets follow constrained bones and reject feedback cycles',()=>{
 const p=fixture();p.joints.push({id:'bone',name:'Bone',parent:'root',layer:0,rest:identity()});p.constraints[0].distance=.5;p.joints[1].sprite.boneBinding=bindVector(p,'route',poseAt(p,p.clips[0],0,{constraints:false}),['bone']);p.clips[0].tracks.bone=[{time:0,value:{...identity(),y:30},easing:'linear'}];validateProject(p);close(solved(p).world.slice(4),[50,30]);p.constraints.push(constraintDefaults('feedback','bone','translation',2,'plane'));assert.throws(()=>validateProject(p),/cyclic/);
});
test('path properties are undoable, saveable, retimable and deleted with their constraint',()=>{
 const store=new ProjectStore(fixture()),edit=c=>store.edit(p=>applyCommand(p,{id:'flight',clip:'fly',...c}));for(const [channel,value]of [['distance',.7],['orient',false],['ownerOffset',true]])edit({op:'constraint.key',channel,time:2,value});validateProject(JSON.parse(JSON.stringify(store.project)));let rows=timelineRows(store.project,{clip:'fly'}).filter(r=>r.id.startsWith('constraint:'));assert.equal(rows.length,3);assert.ok(rows.find(r=>r.id.endsWith(':orient')).boolean);store.edit(p=>applyTimelineCommand(p,{op:'timeline.edit',clip:'fly',keys:[{row:'constraint:flight:orient',time:2}],value:true,delta:1}));assert.equal(store.project.clips[0].constraintTracks[1].keys[0].time,3);assert.equal(store.project.clips[0].constraintTracks[1].keys[0].value,true);store.undo();assert.equal(store.project.clips[0].constraintTracks[1].keys[0].value,false);store.redo();edit({op:'constraint.remove'});assert.equal(store.project.clips[0].constraintTracks.length,0);store.undo();store.edit(p=>removeJoint(p,'route'));assert.equal(store.project.constraints.length,0);assert.equal(store.project.clips[0].constraintTracks.length,0);
});
test('invalid path targets, cycles and malformed keys roll back without changing data',()=>{
 const store=new ProjectStore(fixture()),before=JSON.stringify(store.project);for(const values of [{target:'plane'},{target:'root'},{path:'missing'},{distance:Infinity},{orient:1}]){assert.throws(()=>store.edit(p=>applyCommand(p,{op:'constraint.update',id:'flight',values})));assert.equal(JSON.stringify(store.project),before);}assert.throws(()=>store.edit(p=>applyCommand(p,{op:'constraint.key',id:'flight',clip:'fly',channel:'orient',time:1,value:1})));assert.throws(()=>validateConstraints({nodes:store.project.joints,clips:[],constraints:store.project.constraints},3),/2D rig/);const p=fixture();p.joints[1].parent='plane';assert.throws(()=>validateProject(p),/cyclic/);
});
test('library characters remap path targets and animation and survive source updates',()=>{
 const p=followPathExample();applyCommand(p,{op:'library.capture',id:'flight-source',dimension:2,category:'characters',node:'root',name:'Flight'});const preview=libraryPreviewProject(p,p.library.items[0]);validateProject(preview.project);applyCommand(p,{op:'library.place',id:'flight-source',instance:'copy',position:[800,50]});validateProject(p);const link=p.joints.find(j=>j.id==='copy').librarySource,c=p.constraints.find(c=>c.id===link.motion.constraintBindings.flight),clip=p.clips.find(c=>c.id===link.motion.bindings.fly);assert.equal(c.target,link.bindings.route);assert.equal(clip.constraintTracks[0].constraint,c.id);close(poseAt(p,clip,1.5).get(c.node).world.slice(4),[800,175]);applyCommand(p,{op:'constraint.update',id:c.id,values:{orient:false}});applyCommand(p,{op:'library.updateSource',id:'flight-source',instance:'copy'});validateProject(JSON.parse(JSON.stringify(p)));assert.equal(p.library.items[0].motion.constraints[0].orient,false);validateProject(puppetSource(p));
});
test('joystick source timelines scrub path distance and discrete orientation',()=>{
 const p=fixture();p.clips.push({id:'source',name:'Path source',duration:1,fps:30,loop:false,tracks:{},constraintTracks:[{constraint:'flight',channel:'distance',keys:[{time:0,value:0,easing:'linear'},{time:1,value:1,easing:'linear'}]},{constraint:'flight',channel:'orient',keys:[{time:0,value:true,easing:'step'},{time:1,value:false,easing:'step'}]}]});applyCommand(p,{op:'joystick.create',id:'driver',position:[0,0]});applyCommand(p,{op:'joystick.configure',node:'driver',values:{axes:{x:{clip:'source',invert:false},y:null}}});validateProject(p);near(solved(p).world[4],50);applyCommand(p,{op:'joystick.default',node:'driver',value:[1,0]});p.joints[2].rest.rotation=40;near(solved(p).world[4],100);near(solved(p).transform.rotation,40);
});
test('property inspector identifies constrained position and orientation and opens their source',async()=>{
 const {propertyDrivers,driversForField,ownershipSource}=await import('../authoring/ownership.js'),p=fixture(),context={dimension:2,clip:'fly',selected:'plane',time:0,mode:'animate'},rows=propertyDrivers(p,context),position=driversForField(rows,'x')[0];assert.equal(position.owner,'Follow Path constraint');assert.equal(ownershipSource(position,context).kind,'constraint');assert.equal(driversForField(rows,'rotation')[0].owner,'Follow Path constraint');p.constraints[0].orient=false;assert.equal(driversForField(propertyDrivers(p,context),'rotation').length,0);
});
