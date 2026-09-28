import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chooseLocationMelody,locationPopSound} from './location-pop-audio.js';
import {soundRecipe} from '../shared/action-sound-recipes.js';

test('startup can choose five distinct complete melodies; replay never repeats the previous phrase',()=>{
 const phrases=Array.from({length:5},(_,i)=>chooseLocationMelody(undefined,()=>(i+.5)/5));
 assert.equal(new Set(phrases.map(p=>p.join(','))).size,5);
 for(const phrase of phrases){
  assert.equal(phrase.length,6);
  const notes=phrase.map((_,i)=>locationPopSound(i,()=>.5,phrase).recipe.layers[1].args[0]);
  assert.deepEqual(notes.map(n=>Math.round(12*Math.log2(n/523.2511306))),phrase);
  for(let i=0;i<4;i++)assert.notEqual(chooseLocationMelody(phrase,()=>(i+.5)/4),phrase);
 }
});

test('six reveal notes rise through the pentatonic scale and resolve one octave up',()=>{
 const notes=Array.from({length:6},(_,i)=>locationPopSound(i,()=>.5).recipe.layers[1].args[0]);
 assert.deepEqual(notes.map(n=>Math.round(12*Math.log2(n/notes[0]))),[0,2,4,7,9,12]);
 assert.equal(notes[5],notes[0]*2);
});

test('random expression stays subtle and preserves native placement foley',()=>{
 const native=structuredClone(soundRecipe('pot-place'));
 const soft=locationPopSound(0,()=>0),bright=locationPopSound(0,()=>1);
 assert.ok(soft.level<bright.level);
 for(const sound of [soft,bright]){
  assert.ok(sound.level>=.36&&sound.level<=.44);
  assert.ok(Math.abs(1200*Math.log2(sound.recipe.pitch[0]))<6.001);
  assert.deepEqual(sound.recipe.layers[0],native.layers[0]);
  assert.deepEqual(sound.recipe.layers[2],native.layers[2]);
 }
 assert.deepEqual(soundRecipe('pot-place'),native);
 assert.notEqual(soft.recipe.layers[1].args[2],bright.recipe.layers[1].args[2]);
});
