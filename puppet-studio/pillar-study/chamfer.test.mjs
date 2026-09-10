import test from 'node:test';import assert from 'node:assert/strict';
import * as T from '../scene3d/vendor.js';import {bodyFace,chamferArtwork,projectChamfer} from './chamfer.js';
const W=1.3,H=4.6,B=.055;
test('six chamfered patches form a closed solid with the requested dimensions',()=>{
 const defs=[...Array.from({length:4},(_,i)=>[W,H,W,0,i*Math.PI/2]),[W,W,H,-Math.PI/2,0],[W,W,H,Math.PI/2,0]];
 const edges=new Map(),box=new T.Box3();let volume=0;
 for(const [w,h,d,rx,ry]of defs){const g=bodyFace(w,h,d,B).applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(rx,ry,0))),p=g.attributes.position;
  for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j));v.forEach(a=>box.expandByPoint(a));volume+=v[0].dot(v[1].clone().cross(v[2]))/6;
   for(let j=0;j<3;j++){const key=[v[j],v[(j+1)%3]].map(a=>a.toArray().map(n=>Math.round(n*1e6)).join(',')).sort().join('|');edges.set(key,(edges.get(key)||0)+1);}
  }
 }
 assert.ok([...edges.values()].every(n=>n===2),'every boundary edge must have two incident triangles');
 const size=box.getSize(new T.Vector3());assert.ok(Math.abs(size.x-W)<1e-6&&Math.abs(size.y-H)<1e-6&&Math.abs(size.z-W)<1e-6);
 assert.ok(volume>W*H*W*.95&&volume<W*H*W,'outward winding and bevelled volume');
});
test('large artwork triangles are cut at creases and retain source UVs',()=>{
 const source=new T.PlaneGeometry(W,H);source.setAttribute('sourcePaint',new T.Float32BufferAttribute(new Float32Array(source.attributes.position.count*3).fill(.5),3));
 const g=chamferArtwork(source,W,H,W,B),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;assert.ok(p.count>6);
 for(let i=0;i<p.count;i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j)),normal=new T.Vector3().fromBufferAttribute(n,i);const actual=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();assert.ok(actual.dot(normal)>.999,'triangles stay on their flat face or chamfer plane');
  for(let j=0;j<3;j++){const k=i+j,expected=projectChamfer((uv.getX(k)-.5)*W,(uv.getY(k)-.5)*H,W,H,W,B).position;assert.ok(v[j].distanceTo(new T.Vector3(...expected))<2e-6);}
 }
});
