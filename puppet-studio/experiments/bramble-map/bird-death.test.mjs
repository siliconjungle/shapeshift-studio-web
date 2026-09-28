import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {MapWildlife,wildlifeAssets} from './map-wildlife.js';import {featherPose} from './bird-death.js';
const assets=()=>new Map([...wildlifeAssets,'selection-puff'].map(id=>[id,{data:{image:{width:100,height:120}},geometry:new T.PlaneGeometry(1,1)}]));
test('one bird hit produces feathers, falls and fades, then a later visit resets',()=>{
 const bird=new MapWildlife(new T.Scene(),assets(),()=>.5),visit={kind:'bird',at:0,until:14,side:1,seed:.5};let sounds=0;bird.audio={birdHit(){sounds++;}};
 assert.equal(bird.hit(),false);bird.tick(4,false,visit);const height=bird.position.y;assert.equal(bird.hit(),true);assert.equal(bird.hit(),false);assert.equal(sounds,1);assert.equal(visit.until,8);
 bird.tick(4.1,false,visit);assert.equal(bird.deathEffects.feathers.filter(m=>m.visible).length,6);assert.equal(bird.deathEffects.puffs.filter(m=>m.visible).length,3);assert.ok(bird.position.y<height);
 bird.tick(5,false,visit);let fading=false;bird.puppet.root.traverse(m=>{if(m.isMesh)fading||=m.material.opacity<1&&m.material.opacity>0;});assert.ok(fading);
 bird.tick(6.3,false,visit);assert.equal(bird.puppet.root.visible,false);bird.tick(8.1,false,null);assert.ok(bird.deathEffects.feathers.every(m=>!m.visible));
 bird.tick(40,false,{kind:'bird',at:38,until:52,side:-1,seed:.2});assert.equal(bird.puppet.root.visible,true);assert.equal(bird.death,null);assert.equal(bird.hit(),true);assert.equal(sounds,2);
});
test('native feather burst fans out in six directions and expires',()=>{
 const origin={x:3,y:1,z:4};const poses=Array.from({length:6},(_,i)=>featherPose(origin,1,i,.3));assert.equal(new Set(poses.map(p=>p.x)).size,6);assert.ok(poses.every(p=>p.y>.04&&p.opacity===1));assert.equal(featherPose(origin,4,0,0).visible,false);
});

test('native bird call plays once inside the map and stops on death',()=>{
 const bird=new MapWildlife(new T.Scene(),assets(),()=>.5),visit={kind:'bird',at:0,until:14,side:1,seed:.5};let calls=0;bird.audio={birdCall(){calls++;},birdHit(){}};
 bird.tick(0,false,visit);assert.equal(calls,0);bird.tick(4,false,visit);assert.equal(calls,1);bird.tick(5,false,visit);assert.equal(calls,1);bird.hit();bird.tick(6,false,visit);assert.equal(calls,1);
 bird.tick(40,false,{kind:'bird',at:36,until:50,side:-1,seed:.2});assert.equal(calls,2);
});

test('ground impact plays once at contact, with fall time determined by flight height',()=>{
 for(const height of [.3,1.8]){
  const bird=new MapWildlife(new T.Scene(),assets(),()=>.5),visit={kind:'bird',at:0,until:14,side:1,seed:.5};
  let hits=0,landings=0;bird.audio={birdHit(){hits++;},birdLand(){landings++;}};
  bird.tick(4,false,visit);bird.position.y=height;bird.hit();const impactAt=4+Math.sqrt(height/3);
  assert.equal(hits,1);assert.equal(landings,0);
  bird.tick(impactAt-.001,false,visit);assert.ok(bird.position.y>0);assert.equal(landings,0);
  bird.tick(impactAt+.001,false,visit);assert.equal(bird.position.y,0);assert.equal(landings,1);
  bird.tick(impactAt+.2,false,visit);bird.tick(6.3,false,visit);assert.equal(landings,1);
  const next={kind:'bird',at:40,until:54,side:-1,seed:.5};bird.tick(44,false,next);bird.hit();bird.tick(45,false,next);assert.equal(landings,2);
 }
});
