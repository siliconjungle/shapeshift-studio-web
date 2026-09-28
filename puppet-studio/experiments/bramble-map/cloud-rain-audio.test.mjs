import test from 'node:test';import assert from 'node:assert/strict';import {createCloudRainAudio} from './cloud-rain-audio.js';
test('quiet game rain shares one cached loop, fades out, and can restart without rebuilding audio',()=>{
 const sources=[],levels=[];let buffers=0;
 const node=()=>({connect(){return this;},disconnect(){this.disconnected=true;},frequency:{value:0}});
 const context={currentTime:0,sampleRate:64,createGain(){return{...node(),gain:{value:0,setTargetAtTime(v,t,e){levels.push([v,t,e]);},cancelScheduledValues(){}}};},createBiquadFilter:node,createBuffer(channels,length){buffers++;assert.equal(channels,2);assert.equal(length,448);return{copyToChannel(){}};},createBufferSource(){const s={...node(),start(){},stop(){this.stopped=true;}};sources.push(s);return s;}};
 const rain=createCloudRainAudio(context,node());rain.update(0);assert.equal(sources.length,0);
 rain.update(.3);rain.update(.3);assert.equal(sources.length,1);assert.equal(sources[0].loop,true);assert.equal(levels.at(-1)[0],.018);
 rain.update(0);assert.equal(rain.active,true);context.currentTime=1;rain.update(0);assert.equal(rain.active,false);assert.equal(sources[0].stopped,true);
 rain.update(.3);assert.equal(sources.length,2);assert.equal(buffers,1);rain.stop();assert.equal(rain.active,false);rain.dispose();
});
