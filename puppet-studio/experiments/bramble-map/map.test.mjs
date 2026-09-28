import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mapScene,scheduleMapReveal} from './scene.js';
import {revealPose,bannerPose} from './motion.js';
test('random reveal pacing keeps each destination attached to its arriving path on every restart',()=>{
 const scene=structuredClone(mapScene),original=JSON.stringify(mapScene);
 let sample=0;scheduleMapReveal(scene,()=>[0,.25,.5,.75,1][sample++]);
 const first=scene.locations.map(n=>n.reveal);
 assert.equal(new Set(scene.routes.map(r=>r.duration)).size,5);
 for(const r of scene.routes){
  assert.ok(r.duration>=.22&&r.duration<=.460001);
  assert.equal(scene.locations.find(n=>n.id===r.to).reveal,r.start+r.duration);
  assert.equal(r.start,scene.locations.find(n=>n.id===r.from).reveal+.24);
 }
 scheduleMapReveal(scene,()=>.1);
 assert.notDeepEqual(scene.locations.map(n=>n.reveal),first);
 assert.ok(scene.locations.at(-1).reveal+.24<4);
 assert.equal(JSON.stringify(mapScene),original);
});
test('landmark pops preserve aspect ratio and ground contact, then settle',()=>{
 assert.equal(revealPose(-.1).opacity,0);
 for(let age=0;age<1;age+=.01){const p=revealPose(age);assert.equal(p.x,p.y);assert.equal(p.dy,0);assert.ok(p.x>0&&p.x<=1.041);}
 assert.deepEqual(revealPose(1),{opacity:1,x:1,y:1,dy:0,angle:0});
 assert.equal(revealPose(.1,{gentle:true}).x,1);
 assert.equal(bannerPose(1).x,1);
});
test('new landmarks follow an arriving route; scenery and banner extents stay on the page',()=>{
 for(const n of mapScene.locations){
  if(n.id!=='camp')assert.ok(mapScene.routes.some(r=>r.to===n.id&&Math.abs(r.start+r.duration-n.reveal)<.001),n.id+' has an arriving route');
  assert.ok(n.x-144>24&&n.x+144<1416&&n.y+85<936,n.id+' banner in frame');
 }
 const pieces=[...mapScene.scenery.map(([asset,x,y,width,rotation])=>({asset,x,y,width,rotation})),...mapScene.locations];
 for(const p of pieces){
  const svg=fs.readFileSync(new URL('../../../assets/bramble-map/'+p.asset+'.svg',import.meta.url),'utf8');
  const vb=svg.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number),h=p.width*vb[3]/vb[2];
  // Conservative rotated bounds about the bottom-centre pivot, including idle sway/pop overshoot.
  const theta=(Math.abs(p.rotation??5)+4.3)*Math.PI/180,half=p.width*.52+Math.sin(theta)*h;
  assert.ok(p.x-half>20&&p.x+half<1420&&p.y-h*1.05>20&&p.y+p.width*.5*Math.sin(theta)<940,`${p.asset} at ${p.x},${p.y} inside safe frame`);
 }
});

test('travel endpoints are exactly the resting marker anchor in both directions',async()=>{
 const {markerAnchor,anchoredWaypoints,hoverPose}=await import('./motion.js');
 const {inkRoute,routePoint}=await import('@shapeshift-labs/studio-core/procedural/ink-route');
 for(const r of mapScene.routes){const route=inkRoute(anchoredWaypoints(r,mapScene.locations));
  assert.deepEqual(routePoint(route,0),markerAnchor(mapScene.locations.find(n=>n.id===r.from)));
  assert.deepEqual(routePoint(route,1),markerAnchor(mapScene.locations.find(n=>n.id===r.to)));
 }
 let value=0,velocity=0;for(let i=0;i<15;i++)[value,velocity]=hoverPose(value,velocity,1,1/60);
 const before=value;[value,velocity]=hoverPose(value,velocity,0,1/60);
 assert.ok(value>.5&&Math.abs(value-before)<.25,'hover exit continues smoothly instead of disappearing');
});

test('travel keeps a fixed walking pace, ink follows behind, and facing follows four directions',async()=>{
 const {travelPlan,walkingPose,routeMarkPassed,facingFromVector}=await import('./motion.js');
 const plan=travelPlan([{route:{length:10000}}]),short=travelPlan([{route:{length:340}}]);assert.equal(short.duration,2);assert.equal(plan.length/plan.duration,short.length/short.duration);assert.ok(Math.abs(plan.length/plan.steps-short.length/short.steps)<1e-10);
 assert.equal(walkingPose(0,plan).distance,0);assert.equal(walkingPose(plan.duration,plan).distance,plan.length);
 assert.ok(routeMarkPassed(.2,false,true,false,.3));assert.ok(!routeMarkPassed(.4,false,true,false,.3));
 assert.ok(routeMarkPassed(.8,false,true,true,.7));assert.ok(!routeMarkPassed(.6,false,true,true,.7));
 assert.ok(routeMarkPassed(.99,true,false,false,0));
 assert.equal(facingFromVector(0,-5),'up');assert.equal(facingFromVector(0,5),'down');assert.equal(facingFromVector(-5,0),'left');assert.equal(facingFromVector(5,0),'right');
});

test('location colour begins on approach and finishes exactly at arrival',async()=>{
 const {travelPlan,approachColour}=await import('./motion.js');
 const plan=travelPlan([{route:{length:340}},{route:{length:340}}]);
 assert.equal(approachColour(340,1,plan),0);
 assert.ok(Math.abs(approachColour(340,1.675,plan)-.5)<1e-10);
 assert.equal(approachColour(340,2,plan),1);
 assert.equal(approachColour(680,2,plan),0);
 assert.equal(approachColour(680,4,plan),1);
});

test('only scenery trees have idle sway',async()=>{
 const {assetSwayStrength}=await import('./motion.js');
 for(const name of ['camp','shop','well','shrine','gate','keep','rocks'])assert.equal(assetSwayStrength(name),0);
 for(const name of ['pine','oak','solis-tree','cryos-pine'])assert.ok(assetSwayStrength(name)>0);
});

test('scenery inherits the closest location region',async()=>{
 const {nearestSceneryRegion}=await import('./scene.js');
 for(const [asset,x,y,,,region]of mapScene.scenery){
  assert.equal(region,nearestSceneryRegion(x,y));
  if(region==='gate')assert.ok(asset.startsWith('cryos-'));
  if(region==='well')assert.ok(asset.startsWith('solis-'));
 }
});

test('projected shadows keep ground contact fixed while height casts down-light',async()=>{
 const T=await import('three');
 const {shadowProjection,mapShadowRay,cloudPose,mapClouds}=await import('./map-atmosphere.js');
 for(const groundY of [0,340,605,910]){
  const matrix=shadowProjection(T,groundY);
  for(const x of [0,235,1200]){
   const foot=new T.Vector3(x,-groundY,0).applyMatrix4(matrix);
   assert.ok(Math.abs(foot.x-x)<1e-9&&Math.abs(foot.y+groundY)<1e-9,'foot stays attached');
   const top=new T.Vector3(x,-groundY+100,0).applyMatrix4(matrix);
   assert.ok(Math.abs(top.x-x-100*mapShadowRay.x)<1e-9);
   assert.ok(top.y<foot.y);
  }
 }
 for(const cloud of mapClouds){
  assert.deepEqual(cloudPose(cloud,500,true),cloudPose(cloud,0));
  for(let t=0;t<1200;t+=10){const a=cloudPose(cloud,t),b=cloudPose(cloud,t+.016);
   assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<.065,'clouds drift without jumps');
  }
 }
});
