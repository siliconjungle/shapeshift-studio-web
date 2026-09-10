import test from 'node:test';import assert from 'node:assert/strict';
import {makeBodyJoin,bodyJoinFrame,deformBodyPoint,deformBodyPositions,validateBodyJoins} from './body-joins.js';
import {identity,poseAt,setKey,validateProject,moveOrigin,removeJoint,bounds} from './runtime.js';
import {ProjectStore} from './store.js';import {applyCommand} from './fx/commands.js';import {puppetSource} from './puppet-sources.js';
const art='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><path fill="green" d="M0 0H100V100H0Z"/></svg>');
function fixture(){return {format:'inkwell-puppet',version:1,name:'Join test',assets:[{id:'art',src:art}],joints:[{id:'root',name:'Root',parent:null,rest:identity(),layer:0},{id:'body',name:'Body',parent:'root',rest:identity(),layer:1,sprite:{asset:'art',width:200,height:100,pivotX:.5,pivotY:.5}},{id:'head',name:'Head',parent:'body',rest:{...identity(),x:80},layer:2,sprite:{asset:'art',width:50,height:50,pivotX:0,pivotY:.5}}],clips:[{id:'turn',name:'Turn',duration:2,fps:30,loop:true,tracks:{}}]};}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function animated(p,rotation=90,x=0,y=0){setKey(p.clips[0],'head',0,{...identity(),rotation,x,y});return poseAt(p,p.clips[0],0);}
test('opt-in: absent, disabled, zero strength and rest joins leave original artwork unchanged',()=>{
 const p=fixture();assert.equal(bodyJoinFrame(p,animated(p)).size,0);p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');assert.equal(bodyJoinFrame(p,poseAt(p,null,0)).size,0);
 for(const v of [{enabled:false,strength:1},{enabled:true,strength:0}]){Object.assign(p.joints[2].bodyJoin,v);assert.equal(bodyJoinFrame(p,animated(p)).size,0);}
});
test('the attached collar follows the head exactly while the distant body stays fixed',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body',{radius:80});const joins=bodyJoinFrame(p,animated(p,90,15,8)).get('body');
 assert.deepEqual(deformBodyPoint(-60,20,joins),{x:-60,y:20});const a=deformBodyPoint(80,0,joins);close(a.x,95);close(a.y,8);const b=deformBodyPoint(85,0,joins);close(b.x,95);close(b.y,13);
});
test('rotational blending preserves radius at a half-weight 180-degree turn',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body',{radius:100});const joins=bodyJoinFrame(p,animated(p,180)).get('body'),x=80-59,a=deformBodyPoint(x,0,joins);close(Math.hypot(a.x-80,a.y),59);close(a.x,80);
});
test('mirrored and scaled ancestors do not introduce spurious deformation',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');setKey(p.clips[0],'body',0,{...identity(),rotation:35,scaleX:1.8,scaleY:.7});p.joints[0].rest.scaleX=-1;assert.equal(bodyJoinFrame(p,poseAt(p,p.clips[0],0)).size,0);
 const joins=bodyJoinFrame(p,animated(p,30,8,12)).get('body'),at=deformBodyPoint(80,0,joins);close(at.x,88);close(at.y,12);
});
test('vector vertices use the same solver, preserve depth and restore on disable',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');const joins=bodyJoinFrame(p,animated(p)).get('body'),rest=new Float32Array([80,0,.2,85,0,.3,-100,40,.4]),out=new Float32Array(rest.length);
 deformBodyPositions(rest,out,joins);for(let i=0;i<rest.length;i+=3){const a=deformBodyPoint(rest[i],rest[i+1],joins);close(out[i],a.x);close(out[i+1],a.y);assert.equal(out[i+2],rest[i+2]);}deformBodyPositions(rest,out,[]);assert.deepEqual(out,rest);
});
test('join commands are validated, undoable and retain original animation keys',()=>{
 const p=fixture();animated(p);const tracks=structuredClone(p.clips),store=new ProjectStore(p);
 store.edit(p=>applyCommand(p,{op:'bodyJoin.create',joint:'head',body:'body'}));assert.ok(store.project.joints[2].bodyJoin);assert.deepEqual(store.project.clips,tracks);store.undo();assert.equal(store.project.joints[2].bodyJoin,undefined);store.redo();assert.ok(store.project.joints[2].bodyJoin);
 const valid=JSON.stringify(store.project);assert.throws(()=>store.edit(p=>applyCommand(p,{op:'bodyJoin.update',joint:'head',values:{radius:0}})),/reach/);assert.equal(JSON.stringify(store.project),valid);
});
test('joins survive JSON and linked puppet sources, and deleting a body removes dangling joins',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');const roundtrip=validateProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(puppetSource(roundtrip).joints[2].bodyJoin,p.joints[2].bodyJoin);
 p.joints[2].parent='root';removeJoint(p,'body');assert.equal(p.joints.find(j=>j.id==='head').bodyJoin,undefined);validateBodyJoins(p);
});
test('changing the body origin preserves its authored attachment location',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');moveOrigin(p,'body',{x:12,y:9});assert.deepEqual(p.joints[2].bodyJoin.anchor,[68,-9]);assert.equal(bodyJoinFrame(p,poseAt(p,null,0)).size,0);
});
test('bounds include the moving artwork, and missing/self targets fail validation',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body',{radius:150});const b=bounds(p,animated(p,90,200,0));assert.ok(b.maxX>=280);p.joints[2].bodyJoin.targetNode='missing';assert.throws(()=>validateProject(p),/Body join/);p.joints[2].bodyJoin.targetNode='head';assert.throws(()=>validateProject(p),/Body join/);
});
test('library copies bind joins to their own body rather than the source character',()=>{
 const p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');const store=new ProjectStore(p);
 store.edit(p=>applyCommand(p,{op:'library.capture',id:'snake',name:'Snake',category:'characters',dimension:2,node:'root'}));
 store.edit(p=>applyCommand(p,{op:'library.place',id:'snake',instance:'second-snake',position:[400,0]}));
 const second=store.project.joints.find(j=>j.id==='second-snake-2');assert.equal(second.bodyJoin.targetNode,'second-snake-1');assert.deepEqual(second.bodyJoin.anchor,p.joints[2].bodyJoin.anchor);
});

import {matchJoinSections,mapJoinCrossSection} from './body-join-profiles.js';
import {joinSeamPixels} from './body-join-seams.js';
test('outline matching aligns both silhouettes and the green-to-belly boundary',()=>{
 const green=[130,145,70,255],belly=[240,220,180,255],ink=[20,15,10,255];
 const section=(width,split)=>Array.from({length:81},(_,i)=>{const at=(i/80*2-1)*width;return{at,colour:i<4||i>76?ink:at<split?green:belly};});
 const match=matchJoinSections(section(40,0),section(22,5));assert.ok(match);close(mapJoinCrossSection(-40,match.knots),-22);close(mapJoinCrossSection(40,match.knots),22);assert.ok(mapJoinCrossSection(0,match.knots)>3);assert.equal(match.matches.length,2);
});
test('seam repair removes the internal cut line but protects exterior ink and internal markings',()=>{
 const size=64,body=new Uint8ClampedArray(size*size*4),part=new Uint8ClampedArray(body.length),ink=[20,15,10,255],green=[130,145,70,255],belly=[240,220,180,255];
 function rectangle(data,x0,x1){for(let y=8;y<56;y++)for(let x=x0;x<x1;x++)data.set(x<x0+2||x>=x1-2||y<10||y>=54?ink:y<32?green:belly,(y*size+x)*4);}
 rectangle(body,5,42);rectangle(part,30,60);body.set(ink,(26*size+20)*4);
 const patch=joinSeamPixels(body,part,size,size),at=(x,y)=>Array.from(patch.subarray((y*size+x)*4,(y*size+x)*4+4));
 assert.deepEqual(at(30,25),green);assert.deepEqual(at(30,38),belly);assert.equal(at(30,8)[3],0);assert.equal(at(20,26)[3],0);assert.equal(at(2,32)[3],0);
 // A fading part must not be covered by an opaque seam patch.
 for(let i=3;i<part.length;i+=4)if(part[i])part[i]=200;
 const faded=joinSeamPixels(body,part,size,size);assert.equal(faded[(25*size+30)*4+3],0);
});

test('several parts sharing an anchor keep their own contour profile and identity',()=>{
 const p=fixture();p.joints.push({...structuredClone(p.joints[2]),id:'other'});
 for(const part of p.joints.slice(2))part.bodyJoin=makeBodyJoin(p,part.id,'body');
 const profiles=new Map([['head',{axis:[1,0],halfWidth:20,knots:[[-20,-10],[20,10]]}],['other',{axis:[1,0],halfWidth:20,knots:[[-20,-30],[20,30]]}]]);
 const joins=bodyJoinFrame(p,poseAt(p,null,0),profiles).get('body');
 assert.deepEqual(joins.map(j=>j.partId),['head','other']);assert.equal(joins[0].profile,profiles.get('head'));assert.equal(joins[1].profile,profiles.get('other'));
});

test('a Three geometry can deform and restore without losing its UVs, indices or depth',async()=>{
 const {BufferGeometry,Float32BufferAttribute}=await import('three');const {bindBodyJoinGeometry}=await import('./body-joins.js');
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute([80,0,2,85,0,2,80,5,2],3));geometry.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,0,1],2));geometry.setIndex([0,1,2]);
 const original=geometry.getAttribute('position').array.slice(),uv=geometry.getAttribute('uv'),indices=geometry.index,p=fixture();p.joints[2].bodyJoin=makeBodyJoin(p,'head','body');const binding=bindBodyJoinGeometry(geometry);
 binding.update(bodyJoinFrame(p,animated(p,90,10,4)).get('body'));close(geometry.getAttribute('position').getX(0),90);close(geometry.getAttribute('position').getY(0),4);close(geometry.getAttribute('position').getZ(0),2);assert.equal(geometry.getAttribute('uv'),uv);assert.equal(geometry.index,indices);assert.ok(geometry.boundingSphere.radius>0);
 binding.restore();assert.deepEqual(geometry.getAttribute('position').array,original);geometry.dispose();
});
