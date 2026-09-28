import test from 'node:test';import assert from 'node:assert/strict';
import {characterDrawBases,sunflowerMapScale} from './character-depth.js';
import {sampleFlower,spriteLayout} from '../sunflower-puppet/motion.js';
test('characters swap complete drawing slots when their ground positions cross',()=>{
 for(const y of [200,361,362,363,600]){const sorted=characterDrawBases([{id:'traveller',ground:y},{id:'sunflower',ground:362}]);if(y<362)assert.ok(sorted.get('traveller')+99<sorted.get('sunflower'));if(y>362)assert.ok(sorted.get('sunflower')+99<sorted.get('traveller'));}
 assert.deepEqual(characterDrawBases([{id:'b',ground:0},{id:'a',ground:0}]),characterDrawBases([{id:'a',ground:0},{id:'b',ground:0}]));
});
test('sunflower map height matches the traveller and waving limb overlays the face in every view',()=>{
 assert.ok(Math.abs(445*sunflowerMapScale-93)<3);
 for(const view of ['front','back','side']){const pose=sampleFlower({view,clip:'wave',time:1}),record={width:499,height:499},head=spriteLayout(view,'head',record).layer;assert.ok(pose.curves['arm-right'].layer>head);assert.ok(spriteLayout(view,'hand-right',record).layer>pose.curves['arm-right'].layer);}
});
