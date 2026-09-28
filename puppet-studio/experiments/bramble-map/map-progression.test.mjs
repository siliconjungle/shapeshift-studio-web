import test from 'node:test';
import assert from 'node:assert/strict';
import {canTravelTo,nextLockedLocation} from './map-progression.js';
import {createMapLocks,lockPose,lockRevealTime} from './map-locks.js';
import {travelButtonState} from './button-feedback.js';
const locations=['camp','shop','well','shrine','gate','keep'].map((id,i)=>({id,x:i*100,y:300,height:150,reveal:i*.5}));
test('initial lock lands halfway between the randomized location pop notes',()=>{
 for(const pathDuration of [.22,.34,.46]){
  const stops=[{id:'a',reveal:1},{id:'b',reveal:1+.24+pathDuration}];
  const previousPop=stops[0].reveal+.04,nextPop=stops[1].reveal+.04;
  assert.ok(Math.abs(lockRevealTime(stops,'a')-(previousPop+nextPop)/2)<1e-9);
  assert.ok(lockRevealTime(stops,'a')>stops[0].reveal+.24);
 }
});
test('only clearing opens the next stop; arrival alone leaves progression locked',()=>{
 const visited=new Set(['camp']),cleared=new Set();
 assert.equal(canTravelTo(locations,cleared,'camp'),true);
 assert.equal(canTravelTo(locations,cleared,'shop'),false);
 assert.equal(nextLockedLocation(locations,cleared),'shop');
 visited.add('shop');assert.equal(canTravelTo(locations,cleared,'shop'),false);
 cleared.add('camp');
 assert.equal(canTravelTo(locations,cleared,'shop'),true);
 for(const id of ['well','shrine','gate','keep','missing'])assert.equal(canTravelTo(locations,cleared,id),false);
 assert.equal(nextLockedLocation(locations,cleared),'well');
 assert.deepEqual(travelButtonState('well','camp',false,true),{label:'Locked',disabled:false,enter:false,locked:true});
 for(let i=1;i<locations.length;i++){
  cleared.add(locations[i].id);
  assert.equal(nextLockedLocation(locations,cleared),locations[i+2]?.id??null);
  for(let j=0;j<=Math.min(i+1,5);j++)assert.ok(canTravelTo(locations,cleared,locations[j].id));
 }
});
test('lock exits with one unlock cue, then appears at the next frontier; final unlock removes it',()=>{
 const previous=globalThis.document;
 const make=()=>({dataset:{},attributes:{},children:[],setAttribute(k,v){this.attributes[k]=v;},append(n){this.children.push(n);}});
 globalThis.document={createElementNS:make};
 try{
  const svg=make(),visited=new Set(),counts={unlock:0,appear:0},audio={unlockLocation(){counts.unlock++;},lockAppear(){counts.appear++;}};
  const locks=createMapLocks(svg,new Map(locations.map(n=>[n.id,n])),{locations},visited,audio),root=svg.children[0];
  const advance=()=>{for(let i=0;i<30;i++)locks.tick(.02,10,false);};
  advance();assert.equal(root.dataset.lockLocation,'shop');assert.equal(root.dataset.lockPhase,'locked');assert.equal(counts.appear,1);
  advance();assert.equal(counts.appear,1);
  for(const [visitedId,next]of [['camp','well'],['shop','shrine'],['well','gate'],['shrine','keep'],['gate','']]){
   const before=counts.unlock;visited.add(visitedId);locks.tick(.02,10,false);
   assert.equal(root.dataset.lockPhase,'unlock');assert.equal(counts.unlock,before+1);
   advance();assert.equal(root.dataset.lockLocation,next);advance();assert.equal(counts.unlock,before+1);
  }
  assert.equal(root.dataset.lockPhase,'complete');assert.deepEqual(counts,{unlock:5,appear:5});
  visited.clear();locks.reset();advance();assert.equal(root.dataset.lockLocation,'shop');
 }finally{globalThis.document=previous;}
});
test('lock animation stays finite with positive scales and respects reduced motion',()=>{
 for(const phase of ['enter','unlock'])for(let t=0;t<=1;t+=.01){const p=lockPose(t,phase);assert.ok(p.x>0&&p.y>0&&p.opacity>=0&&p.opacity<=1);assert.ok(Object.values(p).every(Number.isFinite));}
 const p=lockPose(.15,'unlock',true);assert.equal(p.angle,0);assert.equal(p.dy,0);assert.equal(p.x,1);
});
