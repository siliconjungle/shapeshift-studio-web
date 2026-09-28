import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {popPose,returnPose,RELEASE,RETURN_SEAT} from './motion.js';import {potionProject} from './potion.js';
import {parameter} from '@shapeshift-labs/studio-core/fx/math';
const art=JSON.parse(fs.readFileSync(new URL('./assets/puppet-art.json',import.meta.url)));
test('cork release follows neck direction and falls under world gravity',()=>{for(const rotation of [-90,0,90,150]){const start={x:0,y:-246,rotation},p=popPose(RELEASE+.025,start),a=rotation*Math.PI/180;assert.ok((p.x-start.x)*Math.sin(a)-(p.y-start.y)*Math.cos(a)>10);assert.ok(popPose(2.5,start).landed);}assert.ok(popPose(RELEASE+.075).y < -290);});
test('return approaches along neck axis, compresses on contact and settles in socket',()=>{const from={x:180,y:120,rotation:90},to={x:50,y:-220,rotation:35},p=returnPose(.39,from,to),a=35*Math.PI/180;assert.ok(p.x>to.x&&p.y<to.y);assert.ok(returnPose(RETURN_SEAT,from,to).scaleX>1);assert.deepEqual(returnPose(1,from,to),{...to,scaleX:1,scaleY:1});});
test('native puppet stores extended cork, front lip occlusion and optional procedural audio',()=>{const p=potionProject(art),lip=p.joints.find(j=>j.id==='glass-lip'),cork=p.joints.find(j=>j.id==='cork');assert.ok(Math.max(...art.assets.cork.vector.shapes.flatMap(s=>s.points.filter((_,i)=>i%2)))>40);assert.equal(parameter(lip.visual.opacity,3.4),0);assert.equal(parameter(lip.visual.opacity,4.8),1);assert.ok(lip.layer>cork.layer);assert.ok(p.clips[0].cues.every(c=>!c.enabled));assert.ok(potionProject(art,{sound:true}).clips[0].cues.every(c=>c.enabled));for(const cue of ['slosh','shake','fill','drain','pop','plug','return','tap'])assert.ok(p.audioLibraries.potion.cues[cue]?.length);});

import {mixPotion,pourImpact} from './brewing.js';
import {liquidDefaults,liquidSurface,liquidBubbles,createLiquidState} from '@shapeshift-labs/studio-core/illustration/container-liquid';
test('mixing respects remaining capacity and weights the new colour by actual added volume',()=>{
 assert.deepEqual(mixPotion(0,'#000000','#ff0000',.28),{fill:.28,color:'#ff0000',added:.28});
 const mix=mixPotion(.9,'#000000','#ffffff',.28);assert.equal(mix.fill,1);assert.equal(mix.color,'#191919');assert.ok(Math.abs(mix.added-.1)<1e-10);
 assert.equal(mixPotion(1,'#123456','#ffffff',.28).color,'#123456');
});
test('pour impact follows fill level and world gravity while the bottle tilts',()=>{
 const c=liquidDefaults([[-100,-150],[100,-150],[100,150],[-100,150]]);c.meniscus=0;
 for(const angle of [-.2,0,.2])for(const fill of [.1,.5,.9]){
  c.fill=fill;const motion={angle,x:0,y:0},surface=liquidSurface(c,createLiquidState(motion)),p=pourImpact(surface,motion,[0,-150]);
  assert.ok(Math.abs(p[0]*Math.cos(angle)-(p[1]+150)*Math.sin(angle))<1e-6);
  assert.ok(Math.abs(p[0]*surface.normal[0]+p[1]*surface.normal[1]-surface.level-6)<1e-5);
 }
});
test('bubbles remain present at full fill and vanish only when empty',()=>{
 const c=liquidDefaults(),state=createLiquidState();c.fill=1;const bubbles=liquidBubbles(c,state,liquidSurface(c,state));assert.equal(bubbles.length,c.bubbles);assert.ok(bubbles.some(b=>b.opacity>0));c.fill=0;assert.deepEqual(liquidBubbles(c,state,liquidSurface(c,state)),[]);
});
