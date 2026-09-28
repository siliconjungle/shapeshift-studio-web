export class FrogAudio{
 constructor(clips){this.clips=clips;this.buffers=new Map();this.voice=null;this.muted=false;this.generation=0;}
 async unlock(){this.ctx??=new AudioContext();await this.ctx.resume();}
 async play(id){await this.unlock();this.stop();const generation=this.generation,clip=this.clips[id];if(!clip)throw Error('Unknown voice clip');let buffer=this.buffers.get(id);if(!buffer){const response=await fetch(new URL('audio/'+clip.file,import.meta.url));if(!response.ok)throw Error('Voice recording unavailable');buffer=await this.ctx.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);}if(generation!==this.generation)return;
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain();source.buffer=buffer;gain.gain.value=this.muted?0:.65;source.connect(gain).connect(this.ctx.destination);const start=this.ctx.currentTime+.02;source.start(start);this.voice={id,clip,source,gain,start};return this.voice;
 }
 time(){return this.voice?Math.max(0,this.ctx.currentTime-this.voice.start):0;}
 stop(){this.generation++;if(this.voice){try{this.voice.source.stop();}catch{}this.voice.source.disconnect();this.voice.gain.disconnect();}this.voice=null;}
 mute(value){this.muted=value;if(this.voice)this.voice.gain.gain.setTargetAtTime(value?0:.65,this.ctx.currentTime,.025);}
 click(){if(!this.ctx||this.muted)return;const o=this.ctx.createOscillator(),g=this.ctx.createGain(),t=this.ctx.currentTime;o.type='sine';o.frequency.setValueAtTime(360,t);o.frequency.exponentialRampToValueAtTime(180,t+.07);g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);o.connect(g).connect(this.ctx.destination);o.start(t);o.stop(t+.1);o.onended=()=>{o.disconnect();g.disconnect();};}
 dispose(){this.stop();this.ctx?.close();}
}
