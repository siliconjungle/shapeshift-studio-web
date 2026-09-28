import test from 'node:test';
import assert from 'node:assert/strict';
import {DiceSound} from './sound.js';
// Record Web Audio scheduling so pauses and teardown cannot leave hanging notes.
class Param{
 constructor(){this.value=0;this.events=[];}
 setValueAtTime(value,time){assert.ok(Number.isFinite(value)&&Number.isFinite(time));this.events.push({value,time});}
 exponentialRampToValueAtTime(value,time){assert.ok(value>0);this.setValueAtTime(value,time);}
 setTargetAtTime(value,time){this.setValueAtTime(value,time);}
 cancelScheduledValues(time){this.events=this.events.filter(e=>e.time<time);}
}
class Node{
 constructor(){for(const p of ['gain','frequency','Q','threshold','ratio','attack','release'])this[p]=new Param();this.stops=[];}
 connect(target){return target;}
 disconnect(){this.disconnected=true;}
 start(time){this.startTime=time;}
 stop(time){this.stops.push(time);}
}
class Context{
 constructor(){this.state='running';this.sampleRate=24000;this.currentTime=1;this.destination=new Node();this.oscillators=[];}
 createGain(){return new Node();}createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}createBufferSource(){return new Node();}
 createOscillator(){const node=new Node();this.oscillators.push(node);return node;}
 createBuffer(_,length){return{getChannelData:()=>new Float32Array(length)};}
 resume(){return Promise.resolve();}close(){this.state='closed';}
}
test('effects remain responsive and muted input is silent without musical voices',async t=>{
 const previous=globalThis.window;globalThis.window={AudioContext:Context};t.after(()=>{globalThis.window=previous;});
 const sound=new DiceSound();await sound.unlock();assert.equal(sound.context.oscillators.length,0);
 sound.setMuted(true);sound.play('perfect');sound.play('skull');assert.equal(sound.context.oscillators.length,0);
 sound.setMuted(false);for(const kind of ['throw','perfect','good','miss','skull','death','score','avoid'])assert.doesNotThrow(()=>sound.play(kind,10));
 assert.ok(sound.context.oscillators.length>0);sound.dispose();assert.equal(sound.context.state,'closed');
});
