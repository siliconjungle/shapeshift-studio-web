import test from 'node:test';import assert from 'node:assert/strict';
import * as T from 'three';
import {MapShadows} from './map-shadows.js';
import {createMapBird} from './map-bird-puppet.js';
import {MapButterfly,butterflyAssets} from './map-butterfly.js';
const assets=()=>new Map([...['body','head','wing','tail'].map(p=>'map-wren-'+p),...butterflyAssets].map(id=>[id,{data:{image:{width:100,height:100}},geometry:new T.PlaneGeometry(1,1)}]));
test('generated puppets keep connected pivots, finite poses and bounded visits',()=>{
 const a=assets(),bird=createMapBird(a),butterfly=new MapButterfly(new T.Scene(),a,()=>0);
 for(let t=0;t<2;t+=.03){bird.render({facing:t<1?'right':'left'},t);bird.root.updateMatrixWorld(true);bird.root.traverse(n=>assert.ok(n.matrixWorld.elements.every(Number.isFinite)));}
 const visit={kind:'butterfly',at:6,until:54,seed:.5,side:1};butterfly.tick(6,false,visit);assert.equal(butterfly.root.visible,true);
 butterfly.tick(7,false,visit);assert.notEqual(butterfly.wings[0].scale.x,butterfly.wings[1].scale.x);
 butterfly.tick(54,false,visit);assert.equal(butterfly.root.visible,false);
 butterfly.tick(55,true,visit);assert.equal(butterfly.root.visible,false);
});
test('puppet shadows share geometry, track articulation and hide between visits',()=>{
 const root=new T.Group(),part=new T.Mesh(new T.PlaneGeometry(1,1));root.add(part);root.position.set(100,-200,0);part.position.set(2,3,0);
 const shadows=new MapShadows(T,new T.Scene(),{getCTM:()=>({inverse:()=>({})})});const removeShadow=shadows.addPuppet(root);
 assert.equal(shadows.layers.length,2);const caster=shadows.puppets[0].casters[0];assert.equal(caster.mesh.geometry,part.geometry);
 let draws=0;const renderer={getRenderTarget:()=>null,getClearAlpha:()=>0,getClearColor:()=>{},setClearColor(){},setRenderTarget(){},clear(){},render(){draws++;},autoClear:true};
 shadows.render(renderer,new T.Camera());assert.equal(draws,2);assert.ok(Math.abs(caster.mesh.matrix.elements[12]-103.95)<1e-6);assert.ok(Math.abs(caster.mesh.matrix.elements[13]+202.4)<1e-6);
 root.userData.flightPosition={z:200,height:50};root.position.y=-150;shadows.render(renderer,new T.Camera());assert.ok(Math.abs(caster.mesh.matrix.elements[12]-136.45)<1e-6);assert.ok(Math.abs(caster.mesh.matrix.elements[13]+242.4)<1e-6);
 part.rotation.z=.8;shadows.render(renderer,new T.Camera());assert.notEqual(caster.mesh.matrix.elements[0],1);
 root.visible=false;shadows.render(renderer,new T.Camera());assert.equal(caster.mesh.visible,false);removeShadow();assert.equal(shadows.puppets.length,0);assert.equal(caster.mesh.parent,null);removeShadow();
});


test('shared wildlife scheduler leaves a random quiet interval and never overlaps visitors',async()=>{
 const {WildlifeVisits}=await import('./wildlife-visits.js');let seed=5;const random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),schedule=new WildlifeVisits(random);
 assert.ok(schedule.next>=18&&schedule.next<=45);let previous=null,ended=null;const kinds=new Set();
 for(let time=0;time<1200;time+=.1){const visit=schedule.tick(time);if(previous&&!visit){ended=time;assert.ok(schedule.next-time>=25&&schedule.next-time<=70);}if(visit&&visit!==previous){if(ended!==null)assert.ok(time-ended>=25);kinds.add(visit.kind);}previous=visit;}
 assert.deepEqual([...kinds],['bird']);assert.equal(schedule.tick(1201,true),null);
});
