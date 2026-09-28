export const UTTERANCES=[{at:2.3,id:'excited'},{at:4.08,id:'pleased'}];
export class PerformanceAudio{
 constructor(clips){this.clips=clips;this.buffers=new Map();this.sources=[];this.muted=false;}
 async prepare(){this.ctx??=new AudioContext();await this.ctx.resume();this.gain??=this.ctx.createGain();this.gain.gain.value=this.muted?0:.72;this.gain.disconnect();this.gain.connect(this.ctx.destination);
 await Promise.all(UTTERANCES.map(async({id})=>{if(this.buffers.has(id))return;const c=this.clips[id],r=await fetch(new URL('audio/'+c.file,import.meta.url));if(!r.ok)throw Error('Voice chunk unavailable');this.buffers.set(id,await this.ctx.decodeAudioData(await r.arrayBuffer()));}));}
 start(time,rate){this.stop();const origin=this.ctx.currentTime+.025;for(const {at,id}of UTTERANCES){const clip=this.clips[id];if(at+clip.duration<=time)continue;const s=this.ctx.createBufferSource();s.buffer=this.buffers.get(id);s.playbackRate.value=rate;s.connect(this.gain);s.start(origin+Math.max(0,at-time)/rate,Math.max(0,time-at));this.sources.push(s);}return origin;}
 stop(){for(const s of this.sources){try{s.stop();}catch{}s.disconnect();}this.sources=[];}
 mute(value){this.muted=value;if(this.gain)this.gain.gain.setTargetAtTime(value?0:.72,this.ctx.currentTime,.03);}
 dispose(){this.stop();this.ctx?.close();}
}
