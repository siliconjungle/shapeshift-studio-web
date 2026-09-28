import test from 'node:test';import assert from 'node:assert/strict';
import {createLevelAudioVariants} from './level-audio.js';
import {soundRecipe} from '../shared/action-sound-recipes.js';
test('entry and completion choose native cues without immediate repeats, with independent histories',()=>{
 let seed=17;const next=createLevelAudioVariants(()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296));
 const seen={enter:new Set(),clear:new Set()},previous={};
 for(let i=0;i<120;i++)for(const family of ['enter','clear']){
  const cue=next(family);assert.notEqual(cue.kind,previous[family]);previous[family]=cue.kind;seen[family].add(cue.kind);
  assert.ok(cue.level>.25&&cue.level<.6);assert.ok(soundRecipe(cue.kind).layers.length>0);
 }
 assert.equal(seen.enter.size,3);assert.equal(seen.clear.size,3);
});
test('volume variation stays within eight percent',()=>{
 const quiet=createLevelAudioVariants(()=>0)('enter'),loud=createLevelAudioVariants(()=>.999999)('enter');
 assert.ok(Math.abs(quiet.level-.32*.92)<1e-10);
 assert.ok(loud.level<=.3*1.08);
});
