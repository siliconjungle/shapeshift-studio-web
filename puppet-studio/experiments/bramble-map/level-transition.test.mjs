import test from 'node:test';
import assert from 'node:assert/strict';
import {LevelVisit,levelTransitionPose} from './level-transition.js';
import {canTravelTo,nextLockedLocation} from './map-progression.js';
test('camera and iris overlap in both directions, then clear only at the overview',()=>{
 const closing=levelTransitionPose(.24);assert.ok(closing.focus>0&&closing.focus<1);assert.ok(closing.cover>0&&closing.cover<1);assert.equal(closing.phase,'closing');
 for(const t of [.75,.85,.97]){const p=levelTransitionPose(t);assert.equal(p.cover,1);assert.equal(p.phase,'black');assert.equal(p.clear,false);}
 const opening=levelTransitionPose(1.15);assert.ok(opening.focus>0&&opening.focus<1);assert.ok(opening.cover>0&&opening.cover<1);assert.equal(opening.returning,true);
 assert.equal(levelTransitionPose(1.65).cover,0);assert.equal(levelTransitionPose(1.65).clear,false);
 assert.equal(levelTransitionPose(1.73).focus,0);assert.equal(levelTransitionPose(1.73).clear,true);
 assert.equal(levelTransitionPose(2.4).focus,0);assert.equal(levelTransitionPose(2.4).done,true);
});
test('clear happens once after returning from black; repeat Enter does not unlock an extra stop',()=>{
 const events=[],cleared=new Set(),locations=['camp','shop','well'].map(id=>({id}));
 const visit=new LevelVisit({close:()=>events.push('close'),open:()=>events.push('open'),clear:id=>{events.push('clear');cleared.add(id);},done:()=>events.push('done')});
 assert.equal(visit.start('camp'),true);assert.equal(visit.start('shop'),false);
 for(let i=0;i<60;i++)visit.tick(.02);
 assert.equal(cleared.size,0);assert.equal(canTravelTo(locations,cleared,'shop'),false);
 for(let i=0;i<80;i++)visit.tick(.02);
 assert.deepEqual(events,['close','open','clear','done']);assert.equal(visit.active,null);assert.equal(nextLockedLocation(locations,cleared),'well');
 visit.start('camp');for(let i=0;i<140;i++)visit.tick(.02);
 assert.equal(cleared.size,1);assert.equal(nextLockedLocation(locations,cleared),'well');
 visit.start('shop');visit.tick(.5);visit.reset();visit.tick(3);assert.equal(cleared.has('shop'),false);
});
