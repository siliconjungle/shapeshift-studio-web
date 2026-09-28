import {COMBAT_REACTIONS,reactionFor} from './reactions.js';
const url=(side,clip)=>new URL(`../scene3d/assets/dice/voices/${side}/${clip}.mp3`,import.meta.url);
export class ReactionAudio{
 constructor(sound,{fetcher=fetch}={}){
  this.sound=sound;this.buffers=new Map();this.active=new Map();this.lastVoice=new Map();this.disposed=false;this.played=0;
  const clips=new Map();for(const side of ['hero','enemy'])for(const kind of Object.keys(COMBAT_REACTIONS)){const clip=reactionFor(kind,side).clip;clips.set(side+'/'+clip,[side,clip]);}
  this.encoded=Promise.all([...clips].map(async([key,[side,clip]])=>{const response=await fetcher(url(side,clip));if(!response.ok)throw Error('Missing '+key+' voice');return[key,await response.arrayBuffer()];})).catch(error=>{console.warn('Character voices unavailable:',error.message);return[];});
 }
 async unlock(){
  if(this.disposed||!this.sound.context)return;
  if(!this.decoding)this.decoding=this.encoded.then(files=>Promise.all(files.map(async([key,data])=>{const buffer=await this.sound.context.decodeAudioData(data);if(!this.disposed)this.buffers.set(key,buffer);}))).catch(error=>console.warn('Character voice decode failed:',error.message));
  await this.decoding;
 }
 stop(side){const active=this.active.get(side);if(!active)return;this.active.delete(side);const t=this.sound.context.currentTime;active.gain.gain.cancelScheduledValues(t);active.gain.gain.setTargetAtTime(.0001,t,.012);try{active.source.stop(t+.05);}catch{}}
 play(side,kind){
  const c=this.sound.context,spec=reactionFor(kind,side);
  if(this.disposed||!c||c.state!=='running'||this.sound.muted)return false;
  const buffer=this.buffers.get(side+'/'+spec.clip);if(!buffer)return false;
  if(spec.priority<3&&c.currentTime-(this.lastVoice.get(side)??-10)<.8)return false;
  this.stop(side);this.lastVoice.set(side,c.currentTime);
  const source=c.createBufferSource(),gain=c.createGain(),pan=c.createStereoPanner?.();
  source.buffer=buffer;source.playbackRate.value=spec.pitch;
  const at=c.currentTime+spec.delay,duration=buffer.duration/spec.pitch;
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(kind==='death'?.65:.48,at+.012);gain.gain.setValueAtTime(kind==='death'?.65:.48,at+Math.max(.015,duration-.06));gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  source.connect(gain);if(pan){pan.pan.value=side==='hero'?-.4:.4;gain.connect(pan);pan.connect(this.sound.master);}else gain.connect(this.sound.master);
  const instance={source,gain,pan};this.active.set(side,instance);
  source.onended=()=>{source.disconnect();gain.disconnect();pan?.disconnect();if(this.active.get(side)===instance)this.active.delete(side);};
  source.start(at);source.stop(at+duration+.02);this.played++;return true;
 }
 reset(){for(const side of ['hero','enemy'])this.stop(side);this.lastVoice.clear();}
 dispose(){this.reset();this.disposed=true;this.buffers.clear();}
}
