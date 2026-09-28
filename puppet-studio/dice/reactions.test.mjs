import test from 'node:test';
import assert from 'node:assert/strict';
import {COMBAT_REACTIONS,reactionFor,reactionEnvelope,ReactionState} from './reactions.js';

test('combat reactions map every outcome to an emote and voice',()=>{
 for(const kind of ['ready','hit','perfect','miss','skip','low','dodge','hurt','death','victory']){
  assert.ok(COMBAT_REACTIONS[kind]);
  for(const side of ['hero','enemy']){const reaction=reactionFor(kind,side);assert.ok(reaction.clip);assert.ok(reaction.icon);assert.ok(reaction.duration>0);}
 }
});
test('hurt and death take priority over ambient reactions, and envelopes enter/exit smoothly',()=>{
 const state=new ReactionState();assert.equal(state.trigger('hero','ready',0).kind,'ready');
 assert.equal(state.trigger('hero','hurt',120).kind,'hurt');
 assert.equal(state.trigger('hero','ready',130),null);
 assert.equal(state.trigger('hero','death',140).kind,'death');
 const start=reactionEnvelope(0,1),mid=reactionEnvelope(.22,1),end=reactionEnvelope(1,1);
 assert.equal(start.opacity,0);assert.ok(mid.opacity>0);assert.equal(end.opacity,0);assert.ok(mid.scale>0);
});
