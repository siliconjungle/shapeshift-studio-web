import test from 'node:test';import assert from 'node:assert/strict';
import {CloudPlay} from './cloud-play.js';import {MapCloudRain} from './cloud-rain.js';import * as T from 'three';
test('each cloud independently rerolls its threshold and shower duration',()=>{
 const values=[0,.5,.999,0],cloud=new CloudPlay(()=>values.shift()??0),other=new CloudPlay(()=>0);
 assert.equal(cloud.threshold,3);assert.equal(cloud.hit(0),false);assert.equal(cloud.hit(.1),false);assert.equal(cloud.hit(.2),true);assert.equal(cloud.duration,6);assert.equal(other.hits,0);
 const until=cloud.until;assert.equal(cloud.hit(1),false);assert.equal(cloud.until,until,'clicking during rain does not extend it');assert.equal(cloud.sample(1).rain,1);
 cloud.sample(until);assert.equal(cloud.raining,false);assert.equal(cloud.hits,0);assert.equal(cloud.threshold,6);
 for(let i=0;i<5;i++)assert.equal(cloud.hit(7+i*.1),false);assert.equal(cloud.hit(7.5),true);assert.equal(cloud.duration,4);cloud.reset();assert.equal(cloud.raining,false);assert.equal(cloud.hits,0);
});
test('jiggle settles, supports retriggering, and reduced motion keeps the cloud still',()=>{
 const c=new CloudPlay(()=>.999);c.hit(1);const p=c.sample(1.05);assert.ok(p.sx>1&&p.sy<1);assert.deepEqual(c.sample(2),{sx:1,sy:1,angle:0,dy:0,rain:0});
 c.hit(2);assert.ok(c.sample(2.05).sx>1);assert.deepEqual(c.sample(2.05,true),{sx:1,sy:1,angle:0,dy:0,rain:0});
});
test('pooled rain stays local, follows the cloud and hides after its shower',()=>{
 const scene=new T.Scene(),cloud={width:200,height:45,pose:{x:350,y:150},rainAmount:0,play:{rainAt:1}},rain=new MapCloudRain(scene,[cloud]);
 assert.equal(scene.children.length,1);const mesh=scene.children[0];assert.equal(mesh.geometry.instanceCount,80);rain.update(1,false);assert.equal(mesh.visible,false);
 cloud.rainAmount=1;rain.update(2,false);assert.equal(mesh.visible,true);assert.equal(mesh.material.uniforms.weatherTime.value,1);assert.deepEqual(mesh.material.uniforms.origin.value.toArray(),[350,150]);
 cloud.pose.x=360;rain.update(3,false);assert.equal(mesh.material.uniforms.origin.value.x,360);cloud.rainAmount=0;rain.update(9,false);assert.equal(mesh.visible,false);rain.dispose();assert.equal(scene.children.length,0);
});
