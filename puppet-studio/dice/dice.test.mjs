import test from 'node:test';import assert from 'node:assert/strict';
import {regularSolid,DICE_SIDES,normalizeDiceSize,solidSurfaceArea} from './geometry.js';import {timingGrade,rollValue,resolveRoll,successChance,timingAt,landingProgress,landingGrade} from './rules.js';import * as T from '../scene3d/vendor.js';import{validateBakedMesh}from'@shapeshift-labs/studio-core/shape-lab/mesh';import{nodeDefaults,sceneDefaults}from'../scene3d/schema.js';import{validateProject}from'../runtime.js';import{ProjectStore}from'../store.js';import{applyCommand}from'../fx/commands.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),sub=(a,b)=>a.map((v,i)=>v-b[i]),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
test('every solid has its numbered outcomes, outward triangles, finite UVs and a closed shell',()=>{for(const sides of DICE_SIDES){const s=regularSolid({sides}),m=validateBakedMesh(s.mesh);assert.deepEqual([...new Set(s.faces.filter(f=>f.value).map(f=>f.value))].sort((a,b)=>a-b),Array.from({length:sides},(_,i)=>i+1));const edges=new Map();for(let i=0;i<m.indices.length;i+=3){const p=m.indices.slice(i,i+3).map(id=>m.positions.slice(id*3,id*3+3));assert.ok(dot(cross(sub(p[1],p[0]),sub(p[2],p[0])),p[0])>0);for(let j=0;j<3;j++){const key=[p[j],p[(j+1)%3]].map(v=>v.map(x=>x.toFixed(6)).join(',')).sort().join('/');edges.set(key,(edges.get(key)??0)+1);}}assert.ok([...edges.values()].every(n=>n===2));assert.ok(m.uvs.every(v=>v>=0&&v<=1));}});
test('cube opposite faces sum to seven and arbitrary prisms have equal lateral faces',()=>{const cube=regularSolid();for(const f of cube.faces){const other=cube.faces.find(g=>dot(f.normal,g.normal)<-.999);assert.equal(other.value+f.value,7);}for(const sides of [3,7,11,20]){const s=regularSolid({sides,kind:'prism'});assert.equal(s.faces.filter(f=>f.value===0).length,2);assert.equal(s.count,sides);const radii=s.faces.filter(f=>f.value).map(f=>Math.hypot(...f.center));assert.ok(Math.max(...radii)-Math.min(...radii)<1e-8);}});
test('timing earns explicit additive bonuses and displayed odds match exact outcomes',()=>{assert.equal(timingGrade(.72).bonus,2);assert.equal(timingGrade(.6).bonus,1);assert.equal(timingGrade(.1).bonus,-1);for(const sides of DICE_SIDES)for(const bonus of [0,1,2]){const target=Math.ceil(sides*.65)+1,all=Array.from({length:sides},(_,i)=>resolveRoll(i+1,{sides,modifier:1,bonus,target}));assert.equal(successChance(sides,1,bonus,target),all.filter(r=>r.success).length/sides);}assert.equal(resolveRoll(4,{sides:6,modifier:0,bonus:2,target:5}).total,6);for(let t=0;t<10;t+=.1)assert.ok(timingAt(t)>=0&&timingAt(t)<=1);});
test('random boundary samples stay in range; invalid geometry and UVs are rejected',()=>{for(const sides of DICE_SIDES){assert.equal(rollValue(sides,()=>0),1);assert.equal(rollValue(sides,()=>.999999999),sides);}assert.throws(()=>rollValue(6,()=>1));assert.throws(()=>regularSolid({sides:2}));assert.throws(()=>regularSolid({sides:6,bevel:NaN}));const m=regularSolid().mesh;m.uvs.pop();assert.throws(()=>validateBakedMesh(m));});
test('roll clips and textured solids validate, serialize and undo through Studio commands',()=>{const p={format:'inkwell-puppet',version:1,name:'Dice test',assets:[],joints:[{id:'root',name:'Root',parent:null,layer:0,rest:{x:0,y:0,rotation:0,scaleX:1,scaleY:1}}],clips:[{id:'idle',name:'Idle',duration:3,fps:30,loop:true,tracks:{}}],scene3d:sceneDefaults()},solid=regularSolid();p.scene3d.nodes=[{...nodeDefaults('rig','group'),dimensions:[2,2,2]}, {...nodeDefaults('die','mesh'),parent:'rig',mesh:solid.mesh,dimensions:[1,1,1]}];const store=new ProjectStore(p),clip=physicsRollClip(solid,simulateDice(solid,{seed:123}),{rig:'rig'});store.edit(p=>applyCommand(p,{op:'scene3d.clip.add',id:clip.id,values:clip}));validateProject(JSON.parse(JSON.stringify(store.project)));assert.equal(store.project.scene3d.clips.length,2);store.undo();assert.equal(store.project.scene3d.clips.length,1);store.redo();assert.equal(store.project.scene3d.clips[1].tracks.length,4);});

import {simulateDice,physicsRollClip,restingFace,landingTime} from './physics.js';
test('D5 uses congruent faces with each outcome repeated twice',()=>{for(const sides of [5]){const s=regularSolid({sides});assert.equal(s.faces.length,sides*2);const signatures=s.faces.map(f=>f.ids.map((id,i)=>Math.hypot(...sub(s.vertices[id],s.vertices[f.ids[(i+1)%f.ids.length]]))).sort().map(v=>v.toFixed(7)).join(','));assert.equal(new Set(signatures).size,1);for(let value=1;value<=sides;value++)assert.equal(s.faces.filter(f=>f.value===value).length,2);}});
test('physical throws settle on actual faces and baked clips validate',()=>{for(const sides of DICE_SIDES)for(const seed of [1,17,123,983]){const solid=regularSolid({sides}),sim=simulateDice(solid,{seed}),last=sim.samples.at(-1);assert.ok(sim.settled,`D${sides} seed ${seed} did not settle`);assert.ok(sim.result.valid,`D${sides} seed ${seed} cocked`);assert.deepEqual(sim.result,restingFace(solid,last.quaternion));const q=new T.Quaternion(...last.quaternion),low=Math.min(...solid.vertices.map(v=>new T.Vector3(...v).applyQuaternion(q).y+last.position[1]));assert.ok(Math.abs(low)<.025,`D${sides} above/below floor ${low}`);assert.ok(landingTime(sim)>0);const clip=physicsRollClip(solid,sim);assert.equal(clip.tracks[1].keys.at(-1).value[0],last.position[0]);assert.equal(clip.events.length,sim.impacts.length);assert.ok(clip.tracks.every(t=>t.keys.every(k=>[k.value].flat().every(Number.isFinite))));}});
test('landing sweep only travels right; skipping is neutral and trying can penalize',()=>{let previous=0;for(let elapsed=0;elapsed<3;elapsed+=.01){const p=landingProgress(elapsed,.7);assert.ok(p>=previous);previous=p;}assert.equal(landingProgress(0,.7),0);assert.equal(landingProgress(.7,.7),.72);assert.equal(landingProgress(2,.7),1);assert.equal(landingGrade(.7,.7).bonus,2);assert.equal(landingGrade(.6,.7).bonus,1);assert.equal(landingGrade(.1,.7).bonus,-1);assert.equal(landingGrade(2,.7).bonus,-1);assert.equal(resolveRoll(4,{sides:6,target:5}).total,4);assert.equal(resolveRoll(4,{sides:6,bonus:-1,target:4}).success,false);});

test('markings fit inside every face including small triangular faces',()=>{for(const sides of DICE_SIDES){const solid=regularSolid({sides});for(const face of solid.faces.filter(f=>f.value)){const scale=Math.min(1,face.uvRadius*.86/.3);assert.ok(face.uvRadius>0);assert.ok((Math.hypot(.17,.17)+.062)*scale<face.uvRadius);}}});

import {diceProject} from './project.js';
test('all generated Studio projects validate with path-only SVG markings and lightweight dice',async()=>{for(const sides of DICE_SIDES){const {project,solid}=await diceProject({sides});validateProject(JSON.parse(JSON.stringify(project)));const src=decodeURIComponent(project.assets[0].src);assert.ok(src.includes('<path'));assert.ok(!src.includes('<image'));assert.ok(!project.scene3d.nodes.some(n=>n.noodle?.enabled));assert.ok(solid.mesh.indices.length/3<=200);assert.equal(project.scene3d.materials[0].creases,false);}});

import {RollTiming} from './timing.js';
import {diceAtlasSVG} from './texture.js';
import inkwell from '../scene3d/assets/dice/inkwell/numbers.json' with {type:'json'};
test('each new roll starts at zero and clicks stay frozen until reset',()=>{const timing=new RollTiming();for(let roll=0;roll<4;roll++){timing.begin(.8);assert.equal(timing.position,0);assert.equal(timing.grade,null);assert.equal(timing.sample(0),0);timing.lock(roll%2?.8:.2);const position=timing.position,grade=timing.grade;assert.equal(timing.sample(2),position);assert.equal(timing.lock(3),grade);timing.complete();timing.reset();assert.equal(timing.position,0);assert.equal(timing.grade,null);assert.equal(timing.phase,'idle');}timing.begin(.8);timing.sample(2);timing.complete();timing.begin(.7);assert.equal(timing.position,0);assert.equal(timing.grade,null);});
test('every face uses existing Inkwell digit outlines, including D6',()=>{for(const sides of DICE_SIDES){const svg=diceAtlasSVG(regularSolid({sides}));for(let value=1;value<=sides;value++)assert.ok(svg.includes(inkwell[value]));assert.ok(!svg.includes('<circle'));}assert.ok(!DICE_SIDES.includes(3));assert.throws(()=>regularSolid({sides:3}));});
test('a throw lifts off before beginning the tumble',()=>{const solid=regularSolid(),sim=simulateDice(solid,{seed:123}),early=sim.samples.find(s=>s.time>=.08),air=sim.samples.find(s=>s.time>=.25);assert.ok(early.position[1]>sim.samples[0].position[1]+.4);assert.deepEqual(early.quaternion,[0,0,0,1]);assert.ok(Math.abs(air.quaternion[3])<.99);assert.ok(Math.max(...sim.samples.map(s=>s.position[1]))>sim.samples[0].position[1]+1.2);});

test('repeat throws ignore departure contacts and time the actual return to the table',()=>{for(const sides of DICE_SIDES){const solid=regularSolid({sides});let sim=simulateDice(solid,{seed:123});for(let roll=0;roll<3;roll++){const last=sim.samples.at(-1);sim=simulateDice(solid,{seed:456+roll,start:last.quaternion,position:last.position});assert.ok(landingTime(sim)>.4,`D${sides} departing contact was counted as landing`);assert.ok(landingTime(sim)<1.3);}}});

import {speedForCombo,nextCombo,pickDie,assistLanding,comboFeedback,nextRollDelay,landingRecovery,failureFeedback,motionForTempo} from './gameplay.js';
test('combos increase tempo, miss/skip reset it, and random dice change between rounds',()=>{let combo=0,previous=speedForCombo(0);for(let i=0;i<10;i++){combo=nextCombo(combo,{bonus:i%2?1:2});assert.ok(speedForCombo(combo)>previous);previous=speedForCombo(combo);}assert.equal(nextCombo(combo,{bonus:-1}),0);assert.equal(nextCombo(combo,null),0);assert.equal(speedForCombo(0),1);assert.equal(speedForCombo(100),5);for(const n of DICE_SIDES)for(const r of [0,.3,.9,.9999])assert.notEqual(pickDie(DICE_SIDES,n,()=>r),n);});
test('good and perfect landing assists preserve outcomes and settle progressively sooner',()=>{for(const sides of DICE_SIDES){const solid=regularSolid({sides}),sim=simulateDice(solid,{seed:123}),contact=landingTime(sim),perfect=assistLanding(solid,sim,{bonus:2},contact),good=assistLanding(solid,sim,{bonus:1},contact);assert.ok(perfect.duration<good.duration);assert.ok(good.duration<sim.duration);for(const assisted of [perfect,good]){assert.deepEqual(assisted.samples[0],sim.samples[0]);const last=assisted.samples.at(-1);assert.equal(restingFace(solid,last.quaternion).value,sim.result.value);const q=new T.Quaternion(...last.quaternion),low=Math.min(...solid.vertices.map(v=>new T.Vector3(...v).applyQuaternion(q).y+last.position[1]));assert.ok(Math.abs(low)<1e-7);assert.ok(assisted.samples.every(s=>[...s.position,...s.quaternion].every(Number.isFinite)));}assert.equal(assistLanding(solid,sim,{bonus:-1},contact),sim);}});

test('successful streaks continue promptly; misses auto-resume after a penalty and skips pause',()=>{for(const grade of [{bonus:1},{bonus:2}])assert.equal(nextRollDelay(nextCombo(4,grade),grade),grade.bonus===2?.1:.14);assert.equal(nextRollDelay(nextCombo(4,{bonus:-1}),{bonus:-1}),.55);for(const grade of [{bonus:0},null])assert.equal(nextRollDelay(nextCombo(4,grade),grade),null);assert.equal(nextRollDelay(0),null);assert.equal(nextRollDelay(14,{bonus:2}),.1);assert.equal(nextRollDelay(100,{bonus:1}),.14);});
test('combo feedback grows monotonically and remains capped',()=>{let previous=comboFeedback(0);for(let n=1;n<=14;n++){const current=comboFeedback(n);for(const key of ['punch','duration','scale','audio'])assert.ok(current[key]>previous[key]);previous=current;}assert.deepEqual(comboFeedback(1000),previous);assert.ok(previous.punch<3);assert.ok(previous.scale<1.25);assert.ok(previous.audio<1.5);});

test('hit-to-relaunch recovery is near-instant for perfect, graded for good, and longest for misses',()=>{const perfect=landingRecovery({bonus:2}),near=landingRecovery({bonus:1},.66),edge=landingRecovery({bonus:1},.58),miss=landingRecovery({bonus:-1});assert.ok(perfect<=.05);assert.ok(perfect<near&&near<edge&&edge<miss);const solid=regularSolid(),sim=simulateDice(solid,{seed:123}),t=landingTime(sim);for(const rate of [.75,1.5]){const assisted=assistLanding(solid,sim,{bonus:2},t,{duration:perfect*rate});assert.ok(Math.abs((assisted.duration-t)/rate-perfect)<1e-7);assert.ok(assisted.impacts.every(h=>h.time<=assisted.duration));}});

test('standalone dice share visual weight, preserving proportions, UVs and the matching hull',async()=>{const reference=solidSurfaceArea(regularSolid());for(const sides of DICE_SIDES){const original=regularSolid({sides}),solid=normalizeDiceSize(original),scale=solid.vertices[0].find((v,k)=>original.vertices[0][k]!==0)/original.vertices[0].find(v=>v!==0);assert.ok(Math.abs(solidSurfaceArea(solid)-reference)<1e-8);assert.deepEqual(solid.mesh.uvs,original.mesh.uvs);for(let i=0;i<solid.mesh.positions.length;i++)assert.ok(Math.abs(solid.mesh.positions[i]-original.mesh.positions[i]*scale)<1e-8);const parts=await diceProject({sides});assert.ok(Math.abs(solidSurfaceArea(parts.solid)-reference)<1e-8);assert.ok(parts.simulation.result.valid);}});
test('chained roll clips have no hidden settling hold',()=>{const solid=regularSolid(),sim=simulateDice(solid,{seed:123}),assisted=assistLanding(solid,sim,{bonus:2},landingTime(sim)),clip=physicsRollClip(solid,assisted,{settleHold:0});assert.equal(clip.duration,assisted.duration);});

test('tempo continues increasing beyond the former 14-combo ceiling and resets on failure',()=>{for(const combo of [14,15,25,50,100,500,1000])assert.ok(speedForCombo(combo+1)>speedForCombo(combo));assert.equal(speedForCombo(nextCombo(100,{bonus:-1})),1);});
test('losing longer streaks strengthens feedback without extending restart recovery',()=>{let previous=failureFeedback(0);for(const count of [1,5,14,15,30,100,1000]){const current=failureFeedback(count);for(const key of ['shake','duration','audio','scale'])assert.ok(current[key]>previous[key],key+' did not increase');previous=current;}assert.ok(previous.shake<24);assert.ok(previous.audio<1.85);assert.equal(failureFeedback(0).recovery,.1);assert.equal(failureFeedback(1000).recovery,.1);});

test('early tempo grows gently and smears only build at higher speeds',()=>{assert.equal(speedForCombo(5),1.2);assert.equal(speedForCombo(10),1.4);assert.equal(motionForTempo(1.2).smear,0);assert.ok(motionForTempo(2).smear>motionForTempo(1.5).smear);assert.ok(motionForTempo(50).alpha<=.18);const solid=regularSolid(),sim=simulateDice(solid,{seed:123}),plain=physicsRollClip(solid,sim),smear=physicsRollClip(solid,sim,{smear:1}),stretches=smear.tracks[2].keys;assert.ok(stretches.some((key,i)=>key.time<landingTime(sim)&&key.value>plain.tracks[2].keys[i].value));for(let i=0;i<stretches.length;i++)if(stretches[i].time>=landingTime(sim))assert.equal(stretches[i].value,plain.tracks[2].keys[i].value);assert.ok(smear.tracks.every(track=>track.keys.every(key=>[key.value].flat().every(Number.isFinite))));});

import {DiceFraming} from './framing.js';
test('all dice maintain the same screen footprint through different poses and toss heights',()=>{for(const [width,height] of [[1000,450],[350,400]])for(const sides of DICE_SIDES)for(const angle of [0,.3,1,2,3]){const solid=normalizeDiceSize(regularSolid({sides})),rig=new T.Group(),body=new T.Group();rig.add(body);rig.position.set(.2,1+angle/2,.1);body.rotation.set(angle,angle*.7,angle*.3);const camera=new T.OrthographicCamera(-3.7*width/height/2,3.7*width/height/2,3.7/2,-3.7/2,.05,160);camera.position.set(3.8,6.1,6.7);camera.lookAt(.2,1.4,.1);camera.updateMatrixWorld();const before=rig.position.clone().project(camera),host={width,height,camera,objects:new Map([['die',body],['die-rig',rig]])};new DiceFraming().fit(host,solid);const points=solid.vertices.map(v=>new T.Vector3(...v).applyMatrix4(body.matrixWorld).project(camera)),spanX=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*width/2,spanY=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*height/2;assert.ok(Math.abs(Math.max(spanX,spanY)-height*.36)<1e-7);const after=rig.position.clone().project(camera);assert.ok(Math.abs(before.x-after.x)<1e-7&&Math.abs(before.y-after.y)<1e-7);}});

test('miss and skip recovery quickly settle without changing their outcome or timing penalty',()=>{const solid=regularSolid(),sim=simulateDice(solid,{seed:123}),t=landingTime(sim);for(const bonus of [-1,0]){const recovered=assistLanding(solid,sim,{bonus},t,{duration:.28*.75,recover:true});assert.ok(Math.abs((recovered.duration-t)/.75-.28)<1e-8);assert.deepEqual(recovered.result,sim.result);assert.equal(physicsRollClip(solid,recovered,{settleHold:0}).duration,recovered.duration);}});

import {LandingDust} from '../scene3d/landing-dust.js';
import {DOMParser} from '@xmldom/xmldom';
import {readFileSync} from 'node:fs';
import {landingDustDefinition as watcherLanding} from '../scene3d/landing-dust-definition.js';
test('dice dust reuses Watcher ground projection and keeps its contact anchor through die movement',t=>{
 const previous=globalThis.DOMParser;globalThis.DOMParser=DOMParser;t.after(()=>{globalThis.DOMParser=previous;});
 const svg=new T.SVGLoader().parse(readFileSync(new URL('../scene3d/assets/landing-sprite.svg',import.meta.url),'utf8'));
 const parts=JSON.parse(readFileSync(new URL('../scene3d/assets/landing-sprite-parts.json',import.meta.url),'utf8'));
 const dust=new LandingDust(new T.Scene(),svg,parts),position=[1,2,3];
 const camera=new T.OrthographicCamera(-4,4,3,-3,.1,100);camera.position.set(3,6,7);camera.lookAt(0,0,0);camera.updateMatrixWorld();dust.burst(position,0,{camera});dust.update(.2);position[0]=20;const projection=dust.entries[0].projection.toArray();camera.position.x=20;camera.zoom=3;camera.updateProjectionMatrix();camera.updateMatrixWorld();dust.update(.25);assert.deepEqual(dust.entries[0].projection.toArray(),projection);
 const e=dust.entries[0];assert.equal(e.effect.definition.animation,watcherLanding.animation);assert.equal(e.effect.definition.projection,watcherLanding.projection);assert.ok(e.effect.layers.reduce((sum,l)=>sum+l.mesh.geometry.index.count/3,0)<15000);
 assert.deepEqual(e.anchor.position.toArray(),[1,0,3]);assert.equal(e.anchor.rotation.x,-Math.PI/2);
 assert.ok(e.effect.layers.every(l=>l.mesh.material.uniforms.groundDecal.value===1));
 assert.equal(e.effect.layers.find(l=>l.id==='shock').mesh.visible,false);
 assert.equal(e.effect.root.visible,true);dust.update(1);assert.equal(e.effect.root.visible,false);
 dust.reduced=true;const cursor=dust.cursor;dust.burst([0,0,0],1);assert.equal(dust.cursor,cursor);dust.dispose();
});

import {impactFloorPoint} from './physics.js';
test('dust contact position uses impact time rather than a late rendered frame',()=>{
 const sim={samples:[{time:0,position:[0,2,0]},{time:1,position:[2,1,4]},{time:2,position:[10,2,8]}]};
 assert.deepEqual(impactFloorPoint(sim,.5),[1,0,2]);assert.deepEqual(impactFloorPoint(sim,1),[2,0,4]);assert.deepEqual(impactFloorPoint(sim,3),[10,0,8]);
});

import {rollTarget,scoreRoll,incomingOffset} from './rules.js';
test('below-target rolls bank nothing without breaking good timing combos',()=>{
 assert.equal(rollTarget(6),4);assert.equal(rollTarget(20),11);
 const unlucky=scoreRoll(1,{sides:6,bonus:2});assert.equal(unlucky.total,3);assert.equal(unlucky.points,0);assert.equal(unlucky.success,false);assert.equal(nextCombo(4,{bonus:2}),5);
 assert.equal(scoreRoll(3,{sides:6,bonus:2}).points,5);
 assert.equal(scoreRoll(6,{sides:6,bonus:-1}).points,5);assert.equal(nextCombo(4,{bonus:-1}),0);assert.equal(nextRollDelay(0,{bonus:-1}),.55);
 assert.equal(scoreRoll(6,{sides:6,bonus:2,valid:false}).points,0);
 for(const sides of DICE_SIDES)for(let raw=1;raw<=sides;raw++)for(const bonus of [-1,0,1,2]){const r=scoreRoll(raw,{sides,bonus});assert.equal(r.points,raw+bonus>=rollTarget(sides)?raw+bonus:0);}
});
test('incoming windows match the timing grades at a fixed strike line',()=>{
 assert.equal(incomingOffset(0),22);assert.equal(incomingOffset(.72),-50);
 for(let i=0;i<=1000;i++){const p=i/1000,offset=incomingOffset(p),center=72+offset,distance=Math.abs(center-22),bonus=timingGrade(p).bonus;assert.equal(bonus,distance<=4.5+1e-9?2:distance<=14+1e-9?1:-1);}
 const timing=new RollTiming();timing.begin(1);timing.lock(.5);const frozen=incomingOffset(timing.position);timing.sample(2);assert.equal(incomingOffset(timing.position),frozen);timing.reset();assert.equal(incomingOffset(timing.position),22);
});

import {InfiniteSong,SONG_PIECES,midiHz,noteLanePosition} from '../scene3d/music/infinite-song.js';
test('songs cycle rhythmic pieces with deterministic notes and hit-by-hit acceleration',()=>{
 const song=new InfiniteSong({seed:4}),seen=new Set();let now=10;
 for(let i=0;i<200;i++){const n=song.claim(now);seen.add(n.piece);assert.ok(n.at>now);assert.ok(Number.isFinite(midiHz(n.midi)));assert.ok(n.midi>=48&&n.midi<=100);song.resolve(n,true,n.at+.05);now=n.at+.18;}
 assert.equal(seen.size,SONG_PIECES.length);assert.ok(song.bpm>104);assert.ok(song.queue.length<=11);
 const a=new InfiniteSong({seed:4}),b=new InfiniteSong({seed:4});for(let i=0;i<24;i++){const x=a.claim(i*2),y=b.claim(i*2);assert.deepEqual(x,y);a.resolve(x,true,x.at);b.resolve(y,true,y.at);}
});
test('all notes travel at the same speed and keep their spacing through tempo changes',()=>{
 const song=new InfiniteSong();song.claim(0);const beats=song.queue.map(n=>n.beat);song.update(.2);const a=song.queue.map(n=>noteLanePosition(n.beat,song.beat));song.update(.4);const b=song.queue.map(n=>noteLanePosition(n.beat,song.beat));
 for(let i=1;i<a.length;i++)assert.ok(Math.abs((a[i]-b[i])-(a[0]-b[0]))<1e-9);
 const before=song.queue.map(n=>noteLanePosition(n.beat,song.beat));song.bpm=150;song.update(.4);assert.deepEqual(song.queue.map(n=>noteLanePosition(n.beat,song.beat)),before);assert.deepEqual(song.queue.map(n=>n.beat),beats);
 song.update(.5);assert.ok(noteLanePosition(song.queue[0].beat,song.beat)<before[0]);
});
test('feedback preserves every target: misses stop, green slows, perfect briefly pauses without resetting',()=>{
 for(const bonus of [-1,1,2]){
  const song=new InfiniteSong(),first=song.claim(0),hit=first.at-.1;song.update(hit);
  const targets=song.queue.map(n=>[n.id,n.beat]),beat=song.beat;
  song.react({bonus},hit);song.update(hit+.2);
  assert.ok(Math.abs(song.beat-beat-(104/60*(bonus<0?0:bonus===1?.2*.55:.125)))<1e-9);
  assert.deepEqual(song.queue.map(n=>[n.id,n.beat]),targets);
  if(bonus<0)assert.deepEqual(song.pulsesUntil(hit+.2),[]);
  song.hold(hit+.2);song.resolve(first,bonus>0,hit+.2);
  const held=song.beat;song.update(hit+1);assert.equal(song.beat,held);
  const next=song.claim(hit+1);assert.equal(next.id,first.id+1);assert.equal(song.beat,held);
  assert.equal(song.travelScale,1);assert.deepEqual(song.queue.map(n=>[n.id,n.beat]),targets);
  assert.ok(song.queue.every(n=>!n.rest));song.update(hit+1.1);assert.ok(song.beat>held);
 }
});
test('good-hit recovery never skips the next marker over a long chain',()=>{
 const song=new InfiniteSong();let now=0,last=-1;
 for(let i=0;i<100;i++){
  const note=song.claim(now);assert.equal(note.id,last+1);last=note.id;
  now=note.at+.12*60/song.bpm;song.react({bonus:1},now);
  now+=.28;song.update(now);song.resolve(note,true,now);
  now+=.14;song.update(now);assert.ok(song.queue.every(n=>!n.rest));
 }
});
test('musical lookahead emits pulses once and drops stale pulses after stalls',()=>{
 const song=new InfiniteSong();song.claim(0);let last=-Infinity,total=0;
 for(let now=0;now<2;now+=.016){for(const event of song.pulsesUntil(now)){assert.ok(event.at>last);assert.ok(event.at<=now+.1+1e-8);last=event.at;total++;}}
 assert.ok(total>3);const afterStall=song.pulsesUntil(100);assert.ok(afterStall.length<=12);assert.ok(afterStall.every(e=>e.at>=100-.03));
});
test('beat timing windows are independent of how long the die was airborne',()=>{
 for(const target of [2,3.5,10,50]){const timing=new RollTiming();timing.beginBeat(target);assert.equal(timing.lockBeat(target).bonus,2);timing.beginBeat(target);assert.equal(timing.lockBeat(target-.25).bonus,1);timing.beginBeat(target);assert.equal(timing.lockBeat(target-.5).bonus,-1);}
});

test('landing deformation continues on animation time while the note lane is stopped',()=>{
 const solid=regularSolid(),sim=simulateDice(solid,{seed:123}),time=landingTime(sim);
 const assisted=assistLanding(solid,sim,{bonus:2},time,{duration:.045,recover:true});
 const clip=physicsRollClip(solid,assisted,{settleHold:0,followThrough:.35});
 const tail=clip.tracks[2].keys.filter(k=>k.time>assisted.duration);
 assert.ok(tail.length>20);assert.ok(new Set(tail.map(k=>k.value.toFixed(5))).size>10);
 const song=new InfiniteSong();song.claim(0);song.react({bonus:-1},.3);const beat=song.beat;song.update(.6);assert.equal(song.beat,beat);
 assert.ok(Math.abs(tail.at(-1).value-1)<.001);
});

test('source phrases retain transcribed melody and bass with readable attack spacing',()=>{
 assert.equal(new Set(SONG_PIECES.map(p=>p.source)).size,2);
 for(const p of SONG_PIECES){assert.equal(p.melody.length,p.offsets.length);assert.equal(p.bass.length,p.offsets.length);assert.ok(p.sourceStartSeconds>=0);for(let i=1;i<p.offsets.length;i++)assert.ok(p.offsets[i]-p.offsets[i-1]>=1.5);assert.ok(p.beats-p.offsets.at(-1)>=1.5);}
 for(const file of ['descent-simplified.mid','descent-ii-simplified.mid']){const bytes=readFileSync(new URL('../scene3d/assets/dice/music/'+file,import.meta.url));assert.equal(bytes.subarray(0,4).toString(),'MThd');assert.ok(bytes.length>1000);}
});

test('a failed target disappears immediately and never returns on automatic restart',()=>{
 const song=new InfiniteSong(),missed=song.claim(0);song.update(.2);
 const upcoming=song.targets.filter(n=>n.id!==missed.id).map(n=>[n.id,noteLanePosition(n.beat,song.beat)]);
 song.react({bonus:-1},.2);
 assert.equal(song.targets.some(n=>n.id===missed.id),false);
 assert.deepEqual(song.targets.map(n=>[n.id,noteLanePosition(n.beat,song.beat)]),upcoming);
 song.resolve(missed,false,.48);song.update(1.03);
 assert.deepEqual(song.targets.map(n=>[n.id,noteLanePosition(n.beat,song.beat)]),upcoming);
 const next=song.claim(1.03);assert.equal(next.id,missed.id+1);
 assert.equal(song.targets[0],next);assert.equal(song.targets.some(n=>n.id===missed.id),false);
});
test('successful and skipped targets cannot masquerade as playable notes either',()=>{
 for(const bonus of [1,2,0]){const song=new InfiniteSong(),note=song.claim(0);if(bonus)song.react({bonus},note.at);else song.resolve(note,false,note.at);assert.equal(song.targets.some(n=>n.id===note.id),false);assert.equal(song.targets[0].id,note.id+1);}
});

import {HazardLane,judgeTarget,RunHealth} from './encounter.js';
test('skulls have a full-width dangerous window, and dodging them preserves hearts',()=>{
 for(const p of [.58,.62,.72,.82,.86]){const grade=judgeTarget('skull',p);assert.equal(grade.damage,1);assert.equal(grade.tone,'skull');}
 for(const p of [0,.579,.861,1])assert.equal(judgeTarget('skull',p),null);
 const safe=judgeTarget('skull',.87,false);assert.equal(safe.damage,0);assert.equal(safe.safe,true);assert.equal(safe.bonus,0);
 const health=new RunHealth();health.apply(4,safe);assert.equal(health.hearts,3);
});
test('missing swords and hitting skulls lose half a heart, then death and restart work',()=>{
 const health=new RunHealth(),miss=judgeTarget('sword',.87,false),skull=judgeTarget('skull',.72);
 assert.equal(miss.damage,1);assert.equal(health.apply(0,miss),true);assert.equal(health.hearts,2);
 assert.equal(health.apply(0,miss),false);assert.equal(health.hearts,2);
 health.apply(1,judgeTarget('sword',.1));assert.equal(health.heartUnits,8);
 health.apply(2,skull);assert.equal(health.heartUnits,7);assert.equal(health.dead,false);
 for(let id=3;id<10;id++)health.apply(id,skull);assert.equal(health.heartUnits,0);assert.equal(health.dead,true);
 health.reset();assert.equal(health.heartUnits,10);assert.equal(health.dead,false);assert.equal(health.apply(0,miss),true);
 for(const position of [.6,.72,.84])assert.equal(judgeTarget('sword',position).damage,0);
});
test('skulls are inserted between sword beats and passing them leaves the roll, health and clock alone',()=>{
 for(const seed of [0,1,12,999]){
  const song=new InfiniteSong({seed}),lane=new HazardLane(),health=new RunHealth();song.claim(0);lane.sync(song);
  assert.ok(lane.targets.length>0);
  for(const h of lane.targets){const a=song.queue.find(n=>n.id===h.after),b=song.queue.find(n=>n.id===h.after+1);assert.ok(a.id>=2);assert.ok(h.beat-a.beat>=.75);assert.ok(b.beat-h.beat>=.75);}
  const skull=lane.targets[0],current=song.current,count=song.nextId,notes=song.queue.map(n=>[n.id,n.beat]);
  song.beat=skull.beat+.36;lane.sync(song);
  assert.ok(!lane.targets.some(n=>n.id===skull.id));assert.equal(song.current,current);assert.equal(song.nextId,count);assert.equal(song.travelScale,1);assert.equal(health.hearts,3);assert.deepEqual(song.queue.map(n=>[n.id,n.beat]),notes);
  const hitLane=new HazardLane();song.beat=0;hitLane.sync(song);const next=hitLane.targets[0];assert.ok(hitLane.hit(next.beat+.35));assert.equal(hitLane.hit(next.beat),undefined);hitLane.sync(song);assert.equal(hitLane.hit(next.beat),undefined);
 }
});

test('speed builds on every successful sword instead of waiting for a phrase',()=>{
 const song=new InfiniteSong();let now=0;
 for(let i=1;i<=16;i++){const note=song.claim(now);song.resolve(note,true,note.at);assert.equal(song.bpm,104+i*2);now=note.at+.15;}
 assert.equal(song.bpm,136);const miss=song.claim(now);song.resolve(miss,false,miss.at);assert.equal(song.bpm,104);
 const retry=song.claim(miss.at+.6);song.resolve(retry,true,retry.at);assert.equal(song.bpm,106);
});

import {reloadLayout,judgeReload,ReloadPace} from './reload.js';
test('reload layouts vary their sword, shield, skull and heart choices',()=>{
 const signatures=new Set();
 for(let i=0;i<12;i++){const tiles=reloadLayout(i),kinds=tiles.map(t=>t.kind);signatures.add(kinds.join(','));if(tiles.some(t=>t.primary))assert.ok(tiles.some(t=>t.primary&&t.kind==='sword'));
  for(const tile of tiles){assert.ok(tile.center-tile.width/2>=0);assert.ok(tile.center+tile.width/2<=1);const grade=judgeReload(tiles,tile.center);assert.equal(grade.kind,tile.kind);assert.equal(grade.damage,tile.kind==='skull'?1:0);if(tile.kind==='sword'){assert.equal(grade.bonus,2);assert.equal(judgeReload(tiles,tile.center+tile.width*.4).bonus,0);}}
 for(let j=1;j<tiles.length;j++)assert.ok(tiles[j-1].center+tiles[j-1].width/2<tiles[j].center-tiles[j].width/2);
 }
 assert.ok([...Array(6).keys()].some(i=>!reloadLayout(i).some(t=>t.kind==='skull')));
 assert.ok([...Array(6).keys()].some(i=>!reloadLayout(i).some(t=>t.kind==='shield')));
 assert.ok([...Array(6).keys()].some(i=>!reloadLayout(i).some(t=>t.kind==='sword')));
 assert.ok([...Array(6).keys()].some(i=>reloadLayout(i).filter(t=>t.kind==='shield').length===2));
 assert.ok([...Array(6).keys()].some(i=>reloadLayout(i).some(t=>t.kind==='heart')));
 assert.equal(signatures.size,6);
});
test('skipping is harmless to hearts; empty clicks have a longer slowdown; skulls cost one heart',()=>{
 const tiles=reloadLayout(),skip=judgeReload(tiles,1,false),empty=judgeReload(tiles,.02),skull=judgeReload(tiles,.26),health=new RunHealth();
 assert.equal(skip.kind,'skip');assert.equal(empty.kind,'empty');assert.equal(skip.damage,0);assert.equal(empty.damage,0);assert.equal(skull.damage,1);
 assert.ok(empty.delay>skip.delay);assert.ok(empty.slowRolls>skip.slowRolls);
 health.apply(1,skip);health.apply(2,empty);assert.equal(health.hearts,3);health.apply(3,skull);health.apply(3,skull);assert.equal(health.hearts,2);
 const pace=new ReloadPace(),good=judgeReload(tiles,.72);for(let i=0;i<8;i++)pace.resolve(good);assert.ok(pace.speed>1);
 pace.resolve(empty);assert.equal(pace.speed,1);assert.equal(pace.slowRolls,3);pace.resolve(good);assert.equal(pace.speed,1);pace.resolve(good);assert.equal(pace.speed,1);pace.resolve(good);assert.ok(pace.speed>1);
 pace.resolve(skip);assert.equal(pace.speed,1);assert.equal(pace.slowRolls,1);pace.resolve(good);assert.ok(pace.speed>1);
});
test('the reload marker sweeps once, freezes at input, and resets on each throw',()=>{
 const timing=new RollTiming();timing.beginSweep(1.55);let previous=0;
 for(let t=0;t<.8;t+=.02){assert.ok(timing.sampleSweep(t)>=previous);previous=timing.position;}
 timing.sampleSweep(.8);timing.grade=judgeReload(reloadLayout(),timing.position);timing.phase='locked';const frozen=timing.position;timing.sampleSweep(2);assert.equal(timing.position,frozen);
 timing.beginSweep(.8);assert.equal(timing.position,0);assert.equal(timing.grade,null);assert.equal(timing.sampleSweep(2),1);
});

test('green selects without a bonus and keeps successful landing and combo behavior',()=>{
 const tiles=reloadLayout(),selected=judgeReload(tiles,.64),bonus=judgeReload(tiles,.72);
 assert.equal(selected.name,'Good');assert.equal(selected.bonus,0);assert.equal(selected.tone,'good');
 assert.equal(bonus.name,'Perfect');assert.equal(bonus.bonus,2);
 assert.equal(scoreRoll(4,{sides:6,bonus:selected.bonus}).total,4);
 assert.equal(scoreRoll(4,{sides:6,bonus:bonus.bonus}).total,6);
 assert.equal(nextCombo(3,selected),4);assert.equal(nextRollDelay(4,selected),.14);
 assert.equal(landingRecovery(selected,.64),landingRecovery({bonus:1},.64));
 const pace=new ReloadPace();pace.resolve(selected);assert.ok(pace.speed>1);
 const health=new RunHealth();health.apply(1,selected);assert.equal(health.hearts,3);
 const solid=regularSolid(),sim=simulateDice(solid,{seed:123});
 assert.notEqual(assistLanding(solid,sim,selected,landingTime(sim)),sim);
});
