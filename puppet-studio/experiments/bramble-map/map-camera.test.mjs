import test from 'node:test';import assert from 'node:assert/strict';
import {MapCamera,mapBounds,mapOverview} from './map-camera.js';import {travelButtonState} from './button-feedback.js';
const rect={left:20,top:30,width:900,height:600};
const point=(view,x,y)=>({x:view.x+(x-rect.left)/rect.width*view.width,y:view.y+(y-rect.top)/rect.height*view.height});
test('map zoom preserves the point beneath the cursor and clamps to authored extent',()=>{
 const c=new MapCamera(),x=350,y=260,before=point(c.view,x,y);c.zoomBy(2,x,y,rect);const after=point(c.view,x,y);
 assert.ok(Math.abs(before.x-after.x)<1e-9&&Math.abs(before.y-after.y)<1e-9);
 c.pan(10000,-10000,rect);assert.ok(c.view.x>=mapBounds.x&&c.view.y>=mapBounds.y&&c.view.x+c.view.width<=mapBounds.x+mapBounds.width&&c.view.y+c.view.height<=mapBounds.y+mapBounds.height);
 c.zoomBy(100,x,y,rect);assert.equal(c.zoom,3.5);c.zoomBy(.0001,x,y,rect);assert.equal(c.zoom,mapOverview.zoom);assert.equal(c.view.width,1440/mapOverview.zoom);assert.equal(c.view.height,960/mapOverview.zoom);
});
test('overview leaves clearance above arrows and beneath the bottom banners',()=>{
 const c=new MapCamera();assert.equal(c.zoom,.88);
 assert.ok(c.view.y<0&&c.view.x<0);
 assert.ok(c.view.y+c.view.height>1060);
 assert.ok(c.view.x>=mapBounds.x&&c.view.y>=mapBounds.y);
 assert.ok(c.view.x+c.view.width<=mapBounds.x+mapBounds.width&&c.view.y+c.view.height<=mapBounds.y+mapBounds.height);
});
test('dragging pulls the zoomed map with the pointer',()=>{
 const c=new MapCamera();c.zoomBy(2,470,330,rect);const before=c.view;c.pan(30,20,rect);assert.ok(c.view.x<before.x&&c.view.y<before.y);
});
test('floating action remains enabled as Enter when already at the selection',()=>{
 assert.deepEqual(travelButtonState('camp','camp',false),{label:'Enter',disabled:false,enter:true});
 assert.deepEqual(travelButtonState('well','camp',false),{label:'Travel here',disabled:false,enter:false});
 assert.deepEqual(travelButtonState('well','camp',true),{label:'On our way…',disabled:true,enter:false});
});

test('travel feedback has bounded particles that remove themselves, and reduced motion skips them',async()=>{
 const {animateTravelButton}=await import('./button-feedback.js'),original=globalThis.document;
 const particles=[],animations=[];
 globalThis.document={createElement:()=>({style:{},remove(){this.removed=true;},animate(){return this.animation={};}})};
 const parent={getBoundingClientRect:()=>({left:0,top:0}),append:p=>particles.push(p)};
 const button={parentElement:parent,getAnimations:()=>[],getBoundingClientRect:()=>({left:100,top:100,width:145,height:48}),animate:(frames,options)=>animations.push({frames,options})};
 try{
  animateTravelButton(button);assert.equal(particles.length,9);assert.equal(animations[0].options.duration,280);
  for(const p of particles)p.animation.onfinish();assert.ok(particles.every(p=>p.removed));
  animateTravelButton(button,true);assert.equal(particles.length,9);assert.equal(animations[1].options.duration,100);
 }finally{globalThis.document=original;}
});

test('locked button rejection shakes briefly, replaces earlier motion, and reduces to a fade',async()=>{
 const {animateDeniedButton}=await import('./button-feedback.js');let cancelled=0;const animations=[];
 const button={getAnimations:()=>[{cancel(){cancelled++;}}],animate:(frames,options)=>animations.push({frames,options})};
 animateDeniedButton(button);assert.equal(cancelled,1);assert.equal(animations[0].options.duration,300);
 assert.ok(animations[0].frames.some(f=>f.transform.includes('translateX(-6px)')));
 assert.equal(animations[0].frames.at(-1).transform,'translateX(0) rotate(0) scale(1)');
 animateDeniedButton(button,true);assert.equal(cancelled,2);assert.ok(animations[1].frames.every(f=>!f.transform));
});
