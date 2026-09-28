// Buffers are decoded once. Every source is scheduled against one audio clock;
// seeks resume at the matching sample offset rather than replaying a chunk.
export class SpeechAudio{
 constructor({contextFactory=()=>new AudioContext(),fetchAudio=src=>fetch(src)}={}){this.contextFactory=contextFactory;this.fetchAudio=fetchAudio;this.buffers=new Map();this.sources=[];this.generation=0;this.clock=null;}
 async prepare(project,clip){
  if(!(clip?.dialogue??[]).some(e=>e.enabled!==false))return;
  this.context??=this.contextFactory();await this.context.resume();
  await Promise.all([...new Set(clip.dialogue.filter(e=>e.enabled!==false).map(e=>project.speech.chunks[e.chunk].src))].map(async src=>{
   if(!this.buffers.has(src)){const task=(async()=>{const r=await this.fetchAudio(src);if(!r.ok)throw Error('Could not load speech audio');return this.context.decodeAudioData(await r.arrayBuffer());})();this.buffers.set(src,task);try{await task;}catch(e){this.buffers.delete(src);throw e;}}else await this.buffers.get(src);
  }));
 }
 async start(project,clip,time,speed=1){const token=++this.generation;this.clear();await this.prepare(project,clip);if(token!==this.generation||!this.context)return;
  const origin=this.context.currentTime;this.clock={clip:clip.id,time,origin,speed};
  for(const e of clip.dialogue??[]){if(e.enabled===false)continue;const c=project.speech.chunks[e.chunk],rate=e.rate??1,end=e.time+c.duration/rate;if(time>=end)continue;const buffer=await this.buffers.get(c.src);if(token!==this.generation)return;const offset=Math.max(0,(time-e.time)*rate);if(offset>=buffer.duration)continue;
   const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;source.playbackRate.value=rate*speed;gain.gain.value=e.gain??.72;source.connect(gain);gain.connect(this.context.destination);source.onended=()=>{source.disconnect();gain.disconnect();};source.start(origin+Math.max(0,e.time-time)/speed,offset,Math.min(c.duration,buffer.duration)-offset);this.sources.push(source);
  }
 }
 sync(project,clip,time,speed=1){if(!clip.dialogue?.some(e=>e.enabled!==false)){if(this.clock)this.stop();return;}const expected=this.clock&&this.clock.time+(this.context.currentTime-this.clock.origin)*this.clock.speed;if(this.clock?.clip!==clip.id||this.clock.speed!==speed||Math.abs(expected-time)>.12){if(this.pending)return;this.pending=true;this.start(project,clip,time,speed).catch(e=>{this.error=e.message;}).finally(()=>{this.pending=false;});}}
 clear(){for(const source of this.sources){try{source.stop();}catch{}source.disconnect();}this.sources=[];this.clock=null;}
 stop(){this.generation++;this.clear();}
 dispose(){this.stop();this.context?.close();this.buffers.clear();}
}
