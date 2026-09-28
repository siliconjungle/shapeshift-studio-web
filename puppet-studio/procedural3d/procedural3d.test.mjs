import {outlineTopology,silhouetteLoops} from '../scene3d/freehand-outline.js';
import {littleGodsMaterialStyle,sceneCapabilities} from '../scene3d/schema.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {primitiveWalkerScene} from '@shapeshift-labs/studio-core/procedural3d/builders';
import {unapplySceneProcedural} from '@shapeshift-labs/studio-core/procedural3d/math';
import {createSceneSampler} from '../scene3d/animation.js';
import {ProjectStore} from '../store.js';import {applyCommand} from '../fx/commands.js';
import {hybridWalkerProject} from './hybrid-walker.js';
import {primitiveGeometry,smoothOutlineGeometry} from '../scene3d/geometry.js';
import {nodeDefaults} from '../scene3d/schema.js';
import {shadingMode} from '../scene3d/core/materials.js';
const fixture=()=>({format:'inkwell-puppet',version:1,name:'3D walker',assets:[],joints:[{id:'root',name:'Root',parent:null,rest:{x:0,y:0,rotation:0,scaleX:1,scaleY:1},layer:0}],clips:[{id:'idle',name:'Idle',duration:1,fps:30,loop:true,tracks:{}}],scene3d:primitiveWalkerScene()});
test('smooth outlines refine curves and join hull normals without changing paint geometry',async()=>{
 const node={...nodeDefaults('sphere','sphere'),dimensions:[2,3,1],segments:12},coarse=await primitiveGeometry({...node,smoothOutline:false}),smooth=await primitiveGeometry(node);
 assert.ok(smooth.attributes.position.count>coarse.attributes.position.count*4);smooth.computeBoundingBox();assert.deepEqual(smooth.boundingBox.min.toArray(),[-1,-1.5,-.5]);assert.deepEqual(smooth.boundingBox.max.toArray(),[1,1.5,.5]);
 const box=await primitiveGeometry({...node,type:'box'}),before=Array.from(box.attributes.normal.array),hull=smoothOutlineGeometry(box),positions=new Map();
 for(let i=0;i<hull.attributes.position.count;i++){const a=hull.attributes.position,n=hull.attributes.normal,key=[a.getX(i),a.getY(i),a.getZ(i)].join(','),normal=[n.getX(i),n.getY(i),n.getZ(i)];assert.ok(Math.abs(Math.hypot(...normal)-1)<1e-6);if(positions.has(key))assert.deepEqual(normal,positions.get(key));positions.set(key,normal);}
 assert.deepEqual(Array.from(box.attributes.normal.array),before);assert.deepEqual(hull.attributes.position.array,box.attributes.position.array);assert.deepEqual(hull.attributes.uv.array,box.attributes.uv.array);assert.notDeepEqual(hull.attributes.normal.array,box.attributes.normal.array);
 for(const g of [coarse,smooth,box,hull])g.dispose();
});
test('SVG shading, colour bands and outline smoothing are independent durable controls',()=>{
 const store=new ProjectStore(fixture());assert.equal(shadingMode(store.project.scene3d.materials[0]),'svg');
 store.edit(p=>{applyCommand(p,{op:'scene3d.material.update',id:'ink',values:{shading:'svg',shadeContrast:.45,shadeSoftness:.01,creases:false}});applyCommand(p,{op:'scene3d.node.update',id:'shell',values:{smoothOutline:false}});});
 const after=JSON.stringify(store.project);store.undo();assert.equal(store.project.scene3d.nodes.find(n=>n.id==='shell').smoothOutline,true);store.redo();assert.equal(JSON.stringify(store.project),after);
 assert.equal(new ProjectStore(JSON.parse(after)).project.scene3d.materials[0].shadeContrast,.45);
 for(const values of [{shading:'bad'},{shadeContrast:-1},{shadeSoftness:1}])assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.material.update',id:'ink',values})),/invalid/);
 assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.node.update',id:'shell',values:{smoothOutline:'yes'}})),/invalid smooth/);assert.equal(JSON.stringify(store.project),after);
 assert.equal(shadingMode({flat:true}),'svg');assert.equal(shadingMode({flat:false}),'lit');assert.equal(shadingMode({flat:true,shading:'solid'}),'solid');
});
test('hybrid pieces retain their linked source through replay and transactional edits',()=>{
 const original=fixture(),saved=JSON.stringify(original),project=hybridWalkerProject(original),store=new ProjectStore(project),sampler=createSceneSampler(store.project.scene3d);
 assert.equal(JSON.stringify(original),saved);assert.equal(project.scene3d.nodes.find(n=>n.id==='shell').type,'sphere');
 assert.equal(project.scene3d.nodes.filter(n=>n.type==='puppet').length,8);
 for(const time of [0,1,4,8,11]){const sample=sampler.sample('walk',time);assert.ok(sample.procedural.chains.every(c=>c.error<.01));for(const c of sample.procedural.chains)for(const id of c.segments??project.scene3d.procedural.chains.find(x=>x.id===c.id).segments)assert.equal(sample.byId.get(id).puppet.fit,'bounds');}
 const at4=sampler.sample('walk',4);sampler.sample('walk',11);assert.deepEqual(sampler.sample('walk',4).procedural,at4.procedural);sampler.dispose();
 store.edit(p=>applyCommand(p,{op:'scene3d.material.update',id:'ink',values:{flat:false,creases:true}}));store.undo();assert.equal(store.project.scene3d.materials[0].flat,true);store.redo();assert.equal(store.project.scene3d.materials[0].creases,true);
 const before=JSON.stringify(store.project);
 for(const values of [{puppet:{...project.scene3d.nodes.find(n=>n.type==='puppet').puppet,fit:'wrong'}},{puppet:{...project.scene3d.nodes.find(n=>n.type==='puppet').puppet,facing:'wrong'}}])assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.node.update',id:'leg-0-link-0',values})),/invalid puppet/);
 assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.material.update',id:'ink',values:{flat:'yes'}})),/invalid flat/);assert.equal(JSON.stringify(store.project),before);
 assert.equal(new ProjectStore(JSON.parse(before)).project.scene3d.nodes.find(n=>n.type==='puppet').puppet.facing,'axis-y');
 const again=hybridWalkerProject(project);assert.doesNotThrow(()=>new ProjectStore(again));
});
test('3D procedural settings use transactional scene editing and round trip',()=>{const store=new ProjectStore(fixture()),before=JSON.stringify(store.project.scene3d.procedural);store.edit(p=>applyCommand(p,{op:'scene3d.settings',values:{procedural:{...p.scene3d.procedural,bodies:[{...p.scene3d.procedural.bodies[0],height:1.9}]}}}));assert.equal(store.project.scene3d.procedural.bodies[0].height,1.9);store.undo();assert.equal(JSON.stringify(store.project.scene3d.procedural),before);store.redo();const saved=JSON.stringify(store.project);assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.settings',values:{procedural:{...p.scene3d.procedural,terrains:['missing']}}})),/terrain must/);assert.equal(JSON.stringify(store.project),saved);assert.equal(new ProjectStore(JSON.parse(saved)).project.scene3d.procedural.bodies[0].height,1.9);});
test('dragging a supported 3D body removes the solved offset before authoring',()=>{const scene=primitiveWalkerScene(),sampler=createSceneSampler(scene),sample=sampler.sample('walk',4),node=sample.byId.get('walker'),current={position:[...node.position],rotation:[...node.rotation],scale:[...node.scale]};current.position[0]+=.5;const authored=unapplySceneProcedural(sample,'walker',current),base=sample.procedural.authored.find(n=>n.id==='walker');assert.ok(Math.abs(authored.position[0]-base.position[0]-.5)<1e-8);assert.ok(Math.abs(authored.position[1]-base.position[1])<1e-8);assert.ok(Math.abs(authored.rotation[0]-base.rotation[0])<1e-8);sampler.dispose();});

test('tracking controls survive save and undo, and invalid edits roll back',()=>{
 const store=new ProjectStore(fixture()),tracker={id:'head-look',node:'shell',target:'home-0',response:6,yaw:[-.4,.8]};
 store.edit(p=>applyCommand(p,{op:'scene3d.settings',values:{procedural:{...p.scene3d.procedural,trackers:[tracker]}}}));
 assert.deepEqual(store.project.scene3d.procedural.trackers,[tracker]);store.undo();assert.deepEqual(store.project.scene3d.procedural.trackers,[]);store.redo();
 const saved=JSON.stringify(store.project);assert.deepEqual(new ProjectStore(JSON.parse(saved)).project.scene3d.procedural.trackers,[tracker]);
 assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.settings',values:{procedural:{...p.scene3d.procedural,trackers:[{...tracker,target:'shell'}]}}})),/tracking dependency cycle/);assert.equal(JSON.stringify(store.project),saved);
});

test('movement is transactional, undoable and retained after JSON reload',()=>{
 const store=new ProjectStore(fixture()),mover={id:'seek',node:'walker',target:'floor',minDistance:1,maxDistance:3,moveSpeed:.8};
 store.edit(p=>applyCommand(p,{op:'scene3d.settings',values:{procedural:{...p.scene3d.procedural,movers:[mover]}}}));assert.deepEqual(store.project.scene3d.procedural.movers,[mover]);store.undo();assert.deepEqual(store.project.scene3d.procedural.movers,[]);store.redo();
 const saved=JSON.stringify(store.project);assert.deepEqual(new ProjectStore(JSON.parse(saved)).project.scene3d.procedural.movers,[mover]);assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.settings',values:{procedural:{...p.scene3d.procedural,movers:[{...mover,minDistance:4}]}}})),/maximum target distance/);assert.equal(JSON.stringify(store.project),saved);
});

test('Little Gods material preset persists and invalid outline settings roll back',()=>{
 const store=new ProjectStore(fixture()),original=JSON.stringify(store.project);
 store.edit(p=>applyCommand(p,{op:'scene3d.material.update',id:'ink',values:littleGodsMaterialStyle(p.scene3d.materials[0])}));
 const saved=JSON.stringify(store.project),material=store.project.scene3d.materials[0];
 assert.equal(material.strokeStyle,'freehand');assert.equal(material.strokeVariation,.65);assert.equal(material.outlineUnits,'world');assert.equal(material.outlineWorldWidth,.025);assert.equal(material.outlineWidth,.02);assert.equal(material.preservePaint,true);assert.equal(material.paintMode,'source');assert.equal(material.palette[3],'#161c17');
 store.undo();assert.equal(JSON.stringify(store.project),original);store.redo();assert.equal(JSON.stringify(store.project),saved);
 assert.deepEqual(new ProjectStore(JSON.parse(saved)).project.scene3d.materials[0],material);
 for(const values of [{strokeStyle:'fake'},{strokeVariation:2},{strokeSmoothing:-1},{outlineUnits:'invalid'},{outlineWorldWidth:-1},{outlineWorldWidth:11},{outlineWidth:-.1},{outlineWidth:.2},{preservePaint:'yes'}])assert.throws(()=>store.edit(p=>applyCommand(p,{op:'scene3d.material.update',id:'ink',values})),/invalid/);
 assert.equal(JSON.stringify(store.project),saved);assert.ok(sceneCapabilities().materials.presets.includes('little-gods'));
});

test('shader contour input welds UV seams and excludes internal mesh edges',async()=>{
 const geometry=await primitiveGeometry({...nodeDefaults('box','box'),dimensions:[2,2,2]}),topology=outlineTopology(geometry);
 for(const direction of [1,-1]){const projected=topology.positions.map(p=>[p[0]*direction,p[1],p[2]*direction]),loops=silhouetteLoops(topology,projected);assert.equal(loops.length,1);let perimeter=0;for(let i=0;i<loops[0].length;i++){const a=loops[0][i],b=loops[0][(i+1)%loops[0].length];assert.ok(Math.abs(Math.abs(a[0])-1)<1e-7||Math.abs(Math.abs(a[1])-1)<1e-7);perimeter+=Math.hypot(a[0]-b[0],a[1]-b[1]);}assert.ok(Math.abs(perimeter-8)<1e-6);assert.deepEqual(silhouetteLoops(topology,projected),loops);}
 geometry.dispose();
});
