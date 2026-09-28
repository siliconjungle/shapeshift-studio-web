import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {sampleFlower,CLIPS,VIEWS,bezier,spriteLayout} from './motion.js';
test('walk loops continuously in all views, without an independent idle clock seam',()=>{
 for(const view of VIEWS){const a=sampleFlower({view,clip:'walk',time:0}),b=sampleFlower({view,clip:'walk',time:CLIPS.walk.duration});for(const id of Object.keys(a.sprites))for(const k of ['x','y','rotation','scaleX','scaleY'])assert.ok(Math.abs((a.sprites[id][k]??1)-(b.sprites[id][k]??1))<1e-8,`${view}/${id}/${k}`);for(const id of Object.keys(a.curves))for(let i=0;i<4;i++)for(let j=0;j<2;j++)assert.ok(Math.abs(a.curves[id].points[i][j]-b.curves[id].points[i][j])<1e-8);}
});
test('hands and feet remain attached throughout all clips and directions',()=>{
 for(const view of VIEWS)for(const [clip,{duration}]of Object.entries(CLIPS))for(let i=0;i<=100;i++){
  const p=sampleFlower({view,clip,time:i/100*duration});
  for(const side of ['left','right']){assert.deepEqual(p.curves['arm-'+side].points[3],[p.sprites['hand-'+side].x,p.sprites['hand-'+side].y]);assert.deepEqual(p.curves['leg-'+side].points[3],[p.sprites['foot-'+side].x,p.sprites['foot-'+side].y+5]);}
  for(const c of Object.values(p.curves))for(let t=0;t<=1;t+=.05)assert.ok(bezier(c.points,t).every(Number.isFinite));
 }
});
test('side walking stance cancels forward travel rather than sliding the planted foot',()=>{
 const speed=50/(.56*CLIPS.walk.duration),t0=.34,t1=.43;
 const a=sampleFlower({view:'side',clip:'walk',time:t0}),b=sampleFlower({view:'side',clip:'walk',time:t1});
 assert.ok(Math.abs(a.sprites['foot-left'].x+speed*t0-b.sprites['foot-left'].x-speed*t1)<1e-8);
 assert.equal(a.sprites['foot-left'].y,b.sprites['foot-left'].y);
});
test('exported Studio projects contain real editable parts and five deformable stem meshes',async()=>{
 for(const view of VIEWS){const p=JSON.parse(await fs.readFile(new URL('../../../assets/sunflower-puppet/sunflower-'+view+'.puppet.json',import.meta.url)));assert.equal(p.format,'inkwell-puppet');assert.equal(p.joints.filter(j=>j.sprite?.mesh).length,5);assert.equal(p.assets.length,11);assert.equal(p.clips.length,4);for(const a of p.assets)assert.ok(a.src.startsWith('data:image/svg+xml'));for(const c of p.clips){assert.equal(c.meshTracks.length,5);assert.equal(Object.keys(c.tracks).length,6);}}
});

test('rear neck crosses petals but tucks into the torso; idle has delayed sway and squash',()=>{
 const p=sampleFlower({view:'back'}),record={width:499,height:499};
 assert.ok(p.curves.neck.layer>spriteLayout('back','head',record).layer);
 assert.ok(p.curves.neck.layer<spriteLayout('back','body',record).layer);
 assert.ok(p.curves.neck.endWidth>p.curves.neck.width);
 const poses=Array.from({length:33},(_,i)=>sampleFlower({time:i/32*CLIPS.idle.duration}));
 const span=key=>Math.max(...poses.map(p=>p.sprites.head[key]))-Math.min(...poses.map(p=>p.sprites.head[key]));
 assert.ok(span('x')>20);assert.ok(span('rotation')>8);assert.ok(span('scaleY')>.04);
});
