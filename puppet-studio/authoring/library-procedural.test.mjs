import test from 'node:test';
import assert from 'node:assert/strict';
import {ProceduralTimeline} from '@shapeshift-labs/studio-core/procedural/simulation';
import {primitiveWalkerScene} from '@shapeshift-labs/studio-core/procedural3d/builders';
import {sceneDefaults,nodeDefaults} from '../scene3d/schema.js';
import {createSceneSampler} from '../scene3d/animation.js';
import {proceduralExample} from '../procedural/examples.js';
import {ProjectStore} from '../store.js';
import {applyCommand} from '../fx/commands.js';
import {validateProject,poseAt,identity} from '../runtime.js';
import {libraryPacket} from './library-transfer.js';
import {libraryPreviewProject} from './library.js';
import {puppetSource} from '../puppet-sources.js';
import {makeSpriteBinding} from '@shapeshift-labs/studio-core/procedural/bindings';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const command=(store,c)=>store.edit(p=>applyCommand(p,c));
const blank=()=>({format:'inkwell-puppet',version:1,name:'Destination',assets:[],joints:[{id:'root',name:'Root',parent:null,rest:identity(),layer:0}],clips:[{id:'idle',name:'Idle',duration:12,fps:60,loop:true,tracks:{}}]});
const capture=(store,dimension=2,node=dimension===3?'walker':'root')=>command(store,{op:'library.capture',id:'creature',name:'Reusable creature',category:'characters',dimension,node});
const place=(store,instance,position)=>command(store,{op:'library.place',id:'creature',instance,position});
function transfer(source,destination){const value=JSON.parse(JSON.stringify(libraryPacket(source.project,source.project.library.items[0])));command(destination,{op:'library.import',value});}

test('2D library transfer retains generated motion, gaits, layers and independent placements',()=>{
 const source=new ProjectStore(proceduralExample('walker'));capture(source);
 const preview=libraryPreviewProject(source.project,source.project.library.items[0]);validateProject(preview.project);assert.equal(preview.project.procedural.gaits.length,1);
 const target=new ProjectStore(blank());transfer(source,target);place(target,'left',[400,50]);place(target,'right',[-400,20]);
 const p=target.project;assert.equal(p.procedural.particles.length,32);assert.equal(p.procedural.gaits.length,2);assert.equal(p.procedural.surfaces.length,2);
 const actual=new ProceduralTimeline(p.procedural).sample(2).points,expected=new ProceduralTimeline(source.project.procedural).sample(2).points;
 for(const id of ['left','right']){const link=p.joints.find(n=>n.id===id).librarySource.procedural;for(const [from,to]of Object.entries(link.bindings.particles)){close(actual.get(to)[0],expected.get(from)[0]+link.delta[0]);close(actual.get(to)[1],expected.get(from)[1]+link.delta[1]);}}
 const saved=JSON.stringify(p);target.undo();assert.equal(target.project.procedural.gaits.length,1);target.redo();assert.equal(JSON.stringify(target.project),saved);validateProject(JSON.parse(saved));
});

test('soft and rigid library bodies retain gravity and drag in a different destination',()=>{
 const source=new ProjectStore(proceduralExample('soft'));capture(source);
 const other=proceduralExample('swimmer');other.procedural.damping=8;const target=new ProjectStore(other);transfer(source,target);place(target,'falling',[1000,0]);
 const p=target.project,link=p.joints.find(n=>n.id==='falling').librarySource.procedural,actual=new ProceduralTimeline(p.procedural).sample(1).points,expected=new ProceduralTimeline(source.project.procedural).sample(1).points;
 for(const [from,to]of Object.entries(link.bindings.particles)){close(actual.get(to)[0],expected.get(from)[0]+1000);close(actual.get(to)[1],expected.get(from)[1]);}
 assert.deepEqual(p.procedural.gravity,[0,0]);assert.ok(p.procedural.particles.filter(n=>n.owner==='falling').every(n=>n.gravity[1]===300&&n.damping===3));
});

test('sprite binding matrices and opted-in generated outline connections follow placement',()=>{
 const p=proceduralExample('swimmer');p.assets=[{id:'art',src:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>')}];
 p.joints.push({id:'piece',name:'Piece',parent:'root',rest:identity(),layer:8,sprite:{asset:'art',width:20,height:20,pivotX:.5,pivotY:.5}});
 p.procedural.bindings=[makeSpriteBinding(p.procedural,'piece',['spine-0','spine-1'],[1,0,0,1,0,0])];p.procedural.connections=[{id:'join',joint:'piece',surface:'spine-surface',particle:'spine-0',radius:30}];
 const source=new ProjectStore(p);capture(source);const target=new ProjectStore(blank());transfer(source,target);place(target,'copy',[500,200]);
 const link=target.project.joints.find(n=>n.id==='copy').librarySource,bound=target.project.procedural.bindings[0],connection=target.project.procedural.connections[0];
 assert.equal(bound.joint,link.bindings.piece);assert.deepEqual(bound.bindMatrix.slice(4),[500,200]);assert.equal(connection.surface,link.procedural.bindings.surfaces['spine-surface']);assert.equal(connection.joint,bound.joint);
 const a=poseAt(source.project,source.project.clips[0],1).get('piece').world,b=poseAt(target.project,target.project.clips.find(c=>c.id===link.motion.bindings.motion),1).get(bound.joint).world;
 for(let i=0;i<4;i++)close(a[i],b[i]);close(b[4],a[4]+500);close(b[5],a[5]+200);
});

test('native 3D library captures all primitive links and terrain with translated animation',()=>{
 const p=blank();p.scene3d=primitiveWalkerScene();for(const c of p.scene3d.procedural.chains){c.footOrientation='terrain';c.footUp=[0,0,1];}const source=new ProjectStore(p);capture(source,3);
 const item=source.project.library.items[0];assert.equal(item.nodes.length,60);assert.equal(item.procedural.chains.length,8);validateProject(libraryPreviewProject(source.project,item).project);
 const q=blank();q.scene3d=sceneDefaults();const target=new ProjectStore(q);transfer(source,target);place(target,'spider',[10,1.6,-2.4]);
 const root=target.project.scene3d.nodes.find(n=>n.id==='spider'),link=root.librarySource,s1=createSceneSampler(source.project.scene3d),s2=createSceneSampler(target.project.scene3d);
 try{const a=s1.sample('walk',4).procedural,b=s2.sample(link.motion.bindings.walk,4).procedural;for(const chain of a.chains){const other=b.chains.find(c=>c.id===link.procedural.bindings.chains[chain.id]);for(let j=0;j<chain.points.length;j++)for(let k=0;k<3;k++)close(other.points[j][k],chain.points[j][k]+(k===0?10:0));assert.equal(other.grounded,chain.grounded);for(let k=0;k<4;k++)close(other.footRotation[k],chain.footRotation[k]);}close(b.bodies[0].offset,a.bodies[0].offset);}finally{s1.dispose();s2.dispose();}
 target.undo();assert.equal(target.project.scene3d.procedural,undefined);target.redo();validateProject(JSON.parse(JSON.stringify(target.project)));
});

for(const dimension of [2,3])test(`${dimension}D source updates preserve a copy's local procedural edits`,()=>{
 const p=proceduralExample('walker');if(dimension===3)p.scene3d=primitiveWalkerScene();const store=new ProjectStore(p);capture(store,dimension);place(store,'copy',dimension===3?[10,1.6,-2.4]:[500,0]);
 store.edit(p=>{const d=dimension===3?p.scene3d:p,root=(d.nodes??d.joints).find(n=>n.id==='copy'),id=root.librarySource.procedural.bindings.chains['leg-0'];d.procedural.chains.find(c=>c.id===id).stepHeight=dimension===3?.7:70;d.procedural.chains.find(c=>c.id==='leg-0').stepHeight=dimension===3?.6:60;d.procedural.chains.find(c=>c.id==='leg-1').stepHeight=dimension===3?.5:50;});
 command(store,{op:'library.updateSource',id:'creature',instance:dimension===3?'walker':'root'});
 const d=dimension===3?store.project.scene3d:store.project,link=(d.nodes??d.joints).find(n=>n.id==='copy').librarySource.procedural;
 assert.equal(d.procedural.chains.find(c=>c.id===link.bindings.chains['leg-0']).stepHeight,dimension===3?.7:70);assert.equal(d.procedural.chains.find(c=>c.id===link.bindings.chains['leg-1']).stepHeight,dimension===3?.5:50);
 validateProject(JSON.parse(JSON.stringify(store.project)));
});

test('3D puppet library dependencies retain generated-only 2D rigs in their linked source',()=>{
 const p=proceduralExample('walker');p.scene3d=sceneDefaults();p.scene3d.nodes=[{...nodeDefaults('puppet','puppet'),puppet:{clip:'motion',pixelsPerUnit:100}}];const source=new ProjectStore(p);capture(source,3,'puppet');
 const q=blank();q.scene3d=sceneDefaults();const target=new ProjectStore(q);transfer(source,target);place(target,'placed',[0,0,0]);
 const node=target.project.scene3d.nodes.find(n=>n.id==='placed'),rig=puppetSource(target.project,undefined,node.puppet.source);assert.equal(rig.procedural.chains.length,4);assert.equal(rig.procedural.gaits.length,1);assert.equal(rig.procedural.surfaces.length,1);assert.ok(poseAt(rig,rig.clips[0],1).procedural.points.size>=16);
 const count=target.project.procedural.particles.length;place(target,'again',[2,0,0]);assert.equal(target.project.procedural.particles.length,count);
});

test('invalid procedural library data rolls back the entire import',()=>{
 const source=new ProjectStore(proceduralExample('walker'));capture(source);const value=libraryPacket(source.project,source.project.library.items[0]);value.item.procedural.chains[0].target='missing';const target=new ProjectStore(blank()),before=JSON.stringify(target.project);
 assert.throws(()=>command(target,{op:'library.import',value}),/missing target/);assert.equal(JSON.stringify(target.project),before);
});

test('publishing from a translated 3D instance keeps terrain nodes and tracks in source coordinates',()=>{
 const p=blank();p.scene3d=primitiveWalkerScene();p.scene3d.clips[0].tracks.push({node:'floor',channel:'position',keys:[{time:0,value:[0,-.2,0],easing:'linear'},{time:12,value:[0,.2,0],easing:'linear'}]});
 const store=new ProjectStore(p);capture(store,3);place(store,'copy',[10,1.6,-2.4]);
 store.edit(p=>{const chain=p.scene3d.nodes.find(n=>n.id==='copy').librarySource.procedural.bindings.chains['leg-0'];p.scene3d.procedural.chains.find(c=>c.id===chain).stepHeight=.8;});
 command(store,{op:'library.updateSource',id:'creature',instance:'copy'});
 const item=store.project.library.items[0],d=store.project.scene3d,root=d.nodes.find(n=>n.id==='copy');
 assert.deepEqual(item.nodes.find(n=>n.id==='floor').position,[0,-.2,0]);assert.deepEqual(d.nodes.find(n=>n.id==='floor').position,[0,-.2,0]);assert.deepEqual(d.nodes.find(n=>n.id===root.librarySource.bindings.floor).position,[10,-.2,0]);
 assert.deepEqual(item.motion.clips[0].tracks.find(t=>t.node==='floor').keys[0].value,[0,-.2,0]);assert.equal(d.procedural.chains.find(c=>c.id==='leg-0').stepHeight,.8);
});

test('tracking-only library components retain external targets, remap children and publish local overrides',()=>{
 const p=blank();p.scene3d=sceneDefaults();p.scene3d.nodes=[{...nodeDefaults('actor','group'),position:[0,0,0]},{...nodeDefaults('head','sphere'),parent:'actor',position:[0,1,0]},{...nodeDefaults('eye','sphere'),parent:'head',position:[.2,.1,.2]},{...nodeDefaults('target','group'),position:[3,2,4]}];
 p.scene3d.procedural={version:1,chains:[],terrains:[],gaits:[],bodies:[],trackers:[{id:'head-look',node:'head',target:'target',response:4},{id:'eye-look',node:'eye',target:'target',origin:'head',yaw:[-.4,.7],response:12}]};
 const source=new ProjectStore(p);capture(source,3,'actor');const item=source.project.library.items[0];assert.equal(item.nodes.length,4);assert.equal(item.procedural.trackers.length,2);
 const q=blank();q.scene3d=sceneDefaults();const target=new ProjectStore(q);transfer(source,target);place(target,'copy',[8,0,0]);
 const d=target.project.scene3d,link=d.nodes.find(n=>n.id==='copy').librarySource;assert.equal(d.procedural.trackers[1].origin,link.bindings.head);assert.equal(d.procedural.trackers[1].target,link.bindings.target);
 const a=createSceneSampler(source.project.scene3d),b=createSceneSampler(d);try{const x=a.sample(source.project.scene3d.clips[0].id,1).procedural.trackers,y=b.sample(d.clips[0].id,1).procedural.trackers;for(let i=0;i<x.length;i++){close(x[i].yaw,y[i].yaw);close(x[i].pitch,y[i].pitch);}}finally{a.dispose();b.dispose();}
 // Publishing an existing component keeps each copy's local response override.
 place(source,'second',[8,0,0]);const second=source.project.scene3d.nodes.find(n=>n.id==='second').librarySource;
 source.edit(p=>{const ts=p.scene3d.procedural.trackers;ts.find(t=>t.id===second.procedural.bindings.trackers['eye-look']).response=20;ts.find(t=>t.id==='head-look').response=7;ts.find(t=>t.id==='eye-look').response=15;});
 command(source,{op:'library.updateSource',id:'creature',instance:'actor'});
 assert.equal(source.project.scene3d.procedural.trackers.find(t=>t.id===second.procedural.bindings.trackers['head-look']).response,7);assert.equal(source.project.scene3d.procedural.trackers.find(t=>t.id===second.procedural.bindings.trackers['eye-look']).response,20);validateProject(JSON.parse(JSON.stringify(source.project)));
});

test('movement-only library components retain target paths and translated trajectories',()=>{
 const p=blank();p.scene3d=sceneDefaults();p.scene3d.nodes=[{...nodeDefaults('actor','sphere'),position:[0,0,0]},{...nodeDefaults('target','group'),position:[0,0,6]}];
 p.scene3d.procedural={version:1,chains:[],terrains:[],gaits:[],bodies:[],movers:[{id:'seek',node:'actor',target:'target',moveSpeed:1,minDistance:2,maxDistance:3}]};
 p.scene3d.clips[0].tracks=[{node:'target',channel:'position',keys:[{time:0,value:[0,0,6],easing:'linear'},{time:6,value:[3,0,6],easing:'linear'}]}];
 const source=new ProjectStore(p);capture(source,3,'actor');const item=source.project.library.items[0];assert.equal(item.nodes.length,2);assert.equal(item.procedural.movers.length,1);
 const q=blank();q.scene3d=sceneDefaults();const target=new ProjectStore(q);transfer(source,target);place(target,'copy',[8,0,0]);const d=target.project.scene3d,link=d.nodes.find(n=>n.id==='copy').librarySource;
 assert.equal(d.procedural.movers[0].target,link.bindings.target);const a=createSceneSampler(source.project.scene3d),b=createSceneSampler(d);try{const x=a.sample('idle',4).procedural.movers[0],y=b.sample(link.motion.bindings.idle,4).procedural.movers[0];for(let i=0;i<3;i++){close(y.position[i],x.position[i]+(i===0?8:0));close(y.velocity[i],x.velocity[i]);}close(y.turn,x.turn);}finally{a.dispose();b.dispose();}
 target.undo();assert.equal(target.project.scene3d.procedural,undefined);target.redo();validateProject(JSON.parse(JSON.stringify(target.project)));
 place(source,'second',[8,0,0]);const copy=source.project.scene3d.nodes.find(n=>n.id==='second').librarySource;
 source.edit(p=>{p.scene3d.procedural.movers.find(m=>m.id==='seek').moveSpeed=1.5;});command(source,{op:'library.updateSource',id:'creature',instance:'actor'});assert.equal(source.project.scene3d.procedural.movers.find(m=>m.id===copy.procedural.bindings.movers.seek).moveSpeed,1.5);
});
