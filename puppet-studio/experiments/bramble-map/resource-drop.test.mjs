import test from 'node:test';import assert from 'node:assert/strict';
import {resourceDropPose,resourceDropBurst,RESOURCE_DROP_DURATION} from './resource-drop.js';
test('reward is tossed above its origin, lands, rebounds and holds before fading',()=>{
 const start=resourceDropPose(0),apex=resourceDropPose(.36),land=resourceDropPose(.72),squash=resourceDropPose(.77),bounce=resourceDropPose(.97),hold=resourceDropPose(1.4);
 assert.ok(apex.height>start.height+.7);assert.equal(land.height,.16);assert.ok(squash.scaleX>1&&squash.scaleY<1);assert.ok(bounce.height>land.height);assert.equal(hold.opacity,1);assert.equal(resourceDropPose(RESOURCE_DROP_DURATION).done,true);assert.equal(resourceDropPose(RESOURCE_DROP_DURATION).opacity,0);
 for(let t=0;t<2.2;t+=.01){const a=resourceDropPose(t,1),b=resourceDropPose(t,-1);assert.equal(a.x,-b.x);assert.ok(Object.values(a).every(v=>typeof v==='boolean'||Number.isFinite(v)));assert.ok(a.height>=.15);}
});
test('reduced motion retains readable reward without toss or bounce',()=>{for(const t of [.1,.5,1]){const p=resourceDropPose(t,1,true);assert.equal(p.x,0);assert.equal(p.height,.45);assert.equal(p.rotation,0);assert.equal(p.scaleX,1);}});

test('harvest bursts scatter two or three staggered rewards',()=>{
 for(const [random,count]of [[()=>0,2],[()=>.999,3]]){const burst=resourceDropBurst(random);assert.equal(burst.length,count);assert.ok(burst[0].side<0&&burst.at(-1).side>0);assert.equal(burst[0].delay,0);assert.ok(burst.at(-1).delay>0);}
});
