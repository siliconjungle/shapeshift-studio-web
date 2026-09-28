import test from 'node:test';import assert from 'node:assert/strict';
import {SceneryRegrowth,regrowthTiming} from './scenery-regrowth.js';
test('destroyed scenery waits, fades smoothly, then becomes ready for another cycle',()=>{
 const r=new SceneryRegrowth(()=>0);assert.equal(r.sample(100).phase,'waiting');r.destroy(5);assert.equal(r.at,25);assert.deepEqual(r.sample(24.9),{phase:'waiting',opacity:0});
 assert.deepEqual(r.sample(25),{phase:'returning',opacity:0});assert.ok(Math.abs(r.sample(25.6).opacity-.5)<1e-9);assert.deepEqual(r.sample(26.3),{phase:'ready',opacity:1});
 r.reset();assert.equal(r.sample(100).phase,'waiting');r.destroy(100);assert.equal(r.at,120);
});
test('cooldowns vary per destruction and a long frame still reaches completion',()=>{
 let random=0;const r=new SceneryRegrowth(()=>random);r.destroy(0);assert.equal(r.at,regrowthTiming.min);random=.999;r.destroy(10);assert.ok(r.at>44&&r.at<45);assert.equal(r.sample(1000).phase,'ready');
});
