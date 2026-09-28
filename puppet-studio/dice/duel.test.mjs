import test from 'node:test';
import assert from 'node:assert/strict';
import {SkeletonDuel} from './duel.js';
import {judgeReload,reloadLayout} from './reload.js';
import {CHARACTER_POSES,POSE_SEQUENCES,poseAtProgress,motionFrames} from './character-motion.js';
const tiles=reloadLayout(),good=judgeReload(tiles,.64),perfect=judgeReload(tiles,.72),skull=judgeReload(tiles,.26);
test('good has no bonus, perfect can turn a low roll into a hit',()=>{
 const duel=new SkeletonDuel();
 assert.equal(duel.resolve(1,{grade:good,raw:2,sides:6}).kind,'dodge');assert.equal(duel.hearts,3);
 assert.equal(duel.resolve(2,{grade:perfect,raw:2,sides:6}).kind,'hit');assert.equal(duel.hearts,2);
 assert.equal(duel.resolve(3,{grade:good,raw:6,sides:6}).kind,'hit');assert.equal(duel.hearts,1);
});
test('skulls counterattack once; skipping and empty clicks cannot damage either fighter',()=>{
 const duel=new SkeletonDuel();
 const counter=duel.resolve(1,{grade:skull,raw:4,sides:6},()=>.5);
 assert.equal(counter.damage,1);assert.equal(counter.enemyRoll,4);assert.equal(duel.combo,1);assert.equal(duel.speed,1.04);
 assert.equal(duel.resolve(1,{grade:skull,raw:4,sides:6}),null);assert.equal(duel.combo,1);
 for(const [id,grade] of [[2,judgeReload(tiles,1,false)],[3,judgeReload(tiles,.05)]])assert.equal(duel.resolve(id,{grade,raw:6,sides:6}).damage,0);
 assert.equal(duel.hearts,3);
 duel.resolve(4,{grade:good,raw:6,sides:6});assert.equal(duel.combo,0);assert.equal(duel.speed,1);
});
test('a shield blocks the selected strike while a feint does not hurt',()=>{
 const duel=new SkeletonDuel();
 duel.beginTurn(['strike','feint'],()=>.1);
 const blocked=duel.resolve(1,{grade:skull,raw:4,sides:6},()=>.5,'shield');
 assert.equal(blocked.kind,'blocked');assert.equal(blocked.blocked,true);assert.equal(blocked.damage,0);assert.equal(blocked.selected,'strike');
 duel.beginTurn(['strike','feint'],()=>.9);
 const feint=duel.resolve(2,{grade:skull,raw:4,sides:6},()=>.5,null);
 assert.equal(feint.kind,'wait');assert.equal(feint.damage,0);assert.equal(feint.selected,'feint');
});
test('ten half-heart hits win; invalid physical rolls do not damage; reset restores a fresh duel',()=>{
 const duel=new SkeletonDuel();duel.resolve(1,{grade:perfect,raw:6,sides:6,valid:false});assert.equal(duel.hearts,3);
 for(let id=2;id<12;id++)duel.resolve(id,{grade:good,raw:6,sides:6});
 assert.equal(duel.heartUnits,0);assert.equal(duel.defeated,true);
 assert.equal(duel.resolve(5,{grade:skull,raw:6,sides:6}),null);
 duel.reset();assert.equal(duel.hearts,3);assert.equal(duel.combo,0);assert.equal(duel.lastRoll,null);assert.equal(duel.defeated,false);
 assert.equal(duel.resolve(1,{grade:good,raw:6,sides:6}).kind,'hit');
});
test('character sequences use intermediate art, finish cleanly, and mirror their continuous motion',()=>{
 for(const [kind,sequence]of Object.entries(POSE_SEQUENCES)){
  assert.equal(sequence[0][0],0);assert.equal(sequence.at(-1)[0],1);
  for(let i=0;i<sequence.length;i++){assert.ok(CHARACTER_POSES.includes(sequence[i][1]));if(i)assert.ok(sequence[i][0]>sequence[i-1][0]);assert.equal(poseAtProgress(sequence,sequence[i][0]),sequence[i][1]);}
  assert.equal(poseAtProgress(sequence,2),kind==='defeat'?'defeat':kind==='victory'?'victory':'idle');
  const frames=motionFrames(kind);assert.ok(frames.length>=6);assert.equal(frames.at(-1).offset,1);assert.ok(frames.every(f=>!f.transform.includes('NaN')));
 }
 assert.ok(new Set(POSE_SEQUENCES.attack.map(s=>s[1])).size>=6);
 assert.notEqual(motionFrames('attack',1)[1].transform,motionFrames('attack',-1)[1].transform);
});
