import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseOpponentAttack,resolveOpponentAttack} from './opponent-defense.js';

test('samples exactly one hidden attack from the possible choices',()=>{
 const attack=chooseOpponentAttack(['high','low','sweep'],()=>.5);
 assert.deepEqual(attack,{choices:['high','low','sweep'],selected:'low'});
});

test('only the selected attack can be blocked',()=>{
 const attack={choices:['high','low'],selected:'high'};
 assert.deepEqual(resolveOpponentAttack(attack,'high'),{blocked:true,hit:false,damage:0,selected:'high',defence:'high',possible:['high','low']});
 assert.equal(resolveOpponentAttack(attack,'low').damage,1);
 assert.equal(resolveOpponentAttack(attack,null).damage,1);
});

test('rejects malformed choices and defences',()=>{
 assert.throws(()=>chooseOpponentAttack([]),/non-empty/);
 assert.throws(()=>resolveOpponentAttack({choices:['high'],selected:'low'},'high'),/Invalid opponent attack/);
 assert.throws(()=>resolveOpponentAttack({choices:['high'],selected:'high'},'low'),/Invalid defence/);
});
