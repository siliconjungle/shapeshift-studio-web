import {weatherSamples} from '../shared/weather-audio.js';
// The game's exact stereo rain and filter chain, quieter, on the map's one context.
export function createCloudRainAudio(context,output){
 const gain=context.createGain(),high=context.createBiquadFilter(),low=context.createBiquadFilter();
 gain.gain.value=0;high.type='highpass';high.frequency.value=200;low.type='lowpass';low.frequency.value=3100;gain.connect(high).connect(low).connect(output);
 let buffer,source=null,last=0,stopAt=Infinity;
 function stop(){if(source){source.stop();source.disconnect();source=null;}gain.gain.cancelScheduledValues(context.currentTime);gain.gain.value=0;last=0;stopAt=Infinity;}
 return{
  update(amount){
   const level=Math.max(0,Math.min(1,amount))*.06;
   if(level>0){stopAt=Infinity;if(!source){
    if(!buffer){const samples=weatherSamples(context.sampleRate,7,'rain');buffer=context.createBuffer(2,samples[0].length,context.sampleRate);samples.forEach((channel,i)=>buffer.copyToChannel(channel,i));}
    source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();
   }}
   if(Math.abs(level-last)>.00001){gain.gain.setTargetAtTime(level,context.currentTime,.18);last=level;}
   if(!level&&source){if(stopAt===Infinity)stopAt=context.currentTime+.65;else if(context.currentTime>=stopAt)stop();}
  },stop,
  get active(){return source!==null;},
  dispose(){stop();gain.disconnect();high.disconnect();low.disconnect();}
 };
}
