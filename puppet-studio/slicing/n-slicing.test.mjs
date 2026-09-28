import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../scene3d/vendor.js';
import {slicingDefaults,slicingAxis,slicingMaps,sliceCoordinate,validateSlicing} from './model.js';
import {sliceGeometry,faceSlicing} from './geometry.js';
import {slicingEdit} from './editor.js';
import {primitiveGeometry} from '../scene3d/geometry.js';
import {sceneDefaults,nodeDefaults,validateScene,applySceneCommand} from '../scene3d/schema.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} ≈ ${b}`);
test('arbitrary fixed islands retain size; stretch bands share remaining space proportionally',()=>{
 const axis={cuts:[.1,.3,.5,.8],fixed:[true,false,true,false,true]},bands=slicingAxis(axis,100,250);
 assert.deepEqual(bands.map(b=>Math.round(b.end-b.start)),[10,80,20,120,20]);
 near(sliceCoordinate(100,bands),250);for(let i=1;i<bands.length;i++)near(bands[i-1].end,bands[i].start);
 const small=slicingAxis(axis,100,25);assert.deepEqual(small.map(b=>Math.round(b.end-b.start)),[5,0,10,0,10]);
 for(let x=1;x<=100;x++)assert.ok(sliceCoordinate(x,small)>=sliceCoordinate(x-1,small));
});
test('reference size stays fixed across resize, disable and JSON roundtrip',()=>{
 const value=slicingDefaults([100,100]);const saved=JSON.parse(JSON.stringify(value));validateSlicing(saved,2);
 for(const size of [250,70,100,300]){const maps=slicingMaps(saved,[size,size]);near(maps[0][0].end,20);near(maps[0].at(-1).end,size);}
 assert.deepEqual(saved,value);saved.enabled=false;assert.equal(slicingMaps(saved,[250,200])[0].length,1);
});
test('validation rejects unordered cuts, empty stretch allocation and malformed dimensions',()=>{
 for(const patch of [{sourceSize:[0,100]},{sourceSize:[100]},{axes:[{cuts:[.8,.2],fixed:[true,false,true]},{cuts:[],fixed:[false]}]},{axes:[{cuts:[],fixed:[true]},{cuts:[],fixed:[false]}]}])assert.throws(()=>validateSlicing({...slicingDefaults([100,100]),...patch},2),/N-slicing/);
 const el={dataset:{slicing:'cuts',axis:'0'},value:'10, 25, 60, 90'};const edited=slicingEdit(undefined,[100,100],el);assert.deepEqual(edited.axes[0].fixed,[true,false,true,false,true]);el.value='20,,80';assert.throws(()=>slicingEdit(edited,[100,100],el),/cuts/);
});
test('mesh triangles split at exact cut planes, retaining UVs, normals and material groups',()=>{
 const source=new T.BoxGeometry(2,2,2),slicing=slicingDefaults([2,2,2]),g=sliceGeometry(source,slicing,[2,6,2]),p=g.attributes.position,uv=g.attributes.uv,n=g.attributes.normal;
 assert.equal(g.groups.length,6);assert.ok(p.count>36);assert.equal(p.count,uv.count);
 near(g.boundingBox.min.y,-3);near(g.boundingBox.max.y,3);
 assert.ok(Array.from({length:p.count},(_,i)=>p.getY(i)).some(y=>Math.abs(y+2.6)<1e-5));
 for(let i=0;i<p.count;i++){assert.ok(Number.isFinite(uv.getX(i)));near(Math.hypot(n.getX(i),n.getY(i),n.getZ(i)),1);}
 // Each triangle lies within a single affine band; none bridges a boundary.
 for(let i=0;i<p.count;i+=3){const ys=[0,1,2].map(k=>p.getY(i+k));for(const cut of [-2.6,2.6])assert.ok(!(Math.min(...ys)<cut-1e-5&&Math.max(...ys)>cut+1e-5));}
 g.dispose();
});
test('lathe pillar caps retain their authored height when the shaft grows',async()=>{
 const node={...nodeDefaults('pillar','lathe'),profile:[[.8,0],[.8,.2],[.5,.2],[.5,1.8],[.8,1.8],[.8,2]],dimensions:[2,2,2],slicing:slicingDefaults([2,2,2])};
 node.slicing.axes[1].cuts=[.1,.9];node.dimensions=[2,6,2];const g=await primitiveGeometry(node),p=g.attributes.position;
 const ys=[...new Set(Array.from({length:p.count},(_,i)=>Number(p.getY(i).toFixed(5))))].sort((a,b)=>a-b);
 assert.deepEqual(ys,[-3,-2.8,2.8,3]);near(g.boundingBox.max.x-g.boundingBox.min.x,2);g.dispose();
});
test('reversed 3D faces preserve asymmetric bands and clipping dimensions',()=>{
 const n={slicing:slicingDefaults([2,4,6])};n.slicing.axes[0]={cuts:[.1,.6],fixed:[true,false,true]};
 const back=faceSlicing(n,'back');assert.deepEqual(back.axes[0].cuts,[.4,.9]);assert.deepEqual(back.sourceSize,[2,4,1]);
 assert.deepEqual(faceSlicing(n,'right',true).sourceSize,[6,4,2]);
});
test('3D commands and scene serialization retain slicing with safe validation',()=>{
 const p={scene3d:sceneDefaults(),assets:[]};applySceneCommand(p,{op:'scene3d.node.add',id:'pillar',type:'cylinder',values:{slicing:slicingDefaults([2,2,2]),dimensions:[2,6,2]}});
 const saved=JSON.parse(JSON.stringify(p.scene3d));validateScene(saved);assert.equal(saved.nodes[0].slicing.sourceSize[1],2);
 saved.nodes[0].slicing.axes[1].cuts=[1.2];assert.throws(()=>validateScene(saved),/N-slicing/);
});
