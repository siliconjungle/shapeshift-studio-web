import {comboFeedback,failureFeedback} from './gameplay.js';
// Event-driven roll, impact and damage sounds. No musical voices or backing pulse.
export class DiceSound {
 constructor(){this.volume=.48;this.muted=false;this.context=null;this.disposed=false;}
 unlock(){
  if(!this.context){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const c=this.context=new C();
   this.master=c.createGain();this.limiter=c.createDynamicsCompressor();this.limiter.threshold.value=-15;this.limiter.ratio.value=8;this.limiter.attack.value=.002;this.limiter.release.value=.12;this.master.connect(this.limiter).connect(c.destination);
   this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*.8;
  }
  this.master.gain.value=this.muted?0:this.volume;return this.context.resume();
 }
 setVolume(v){this.volume=v;if(this.master)this.master.gain.value=this.muted?0:v;}
 setMuted(v){this.muted=v;this.setVolume(this.volume);}
 hit(strength=1,delay=0,combo=0){const c=this.context;if(!c||c.state!=='running'||this.muted)return;strength*=comboFeedback(combo).audio;const t=c.currentTime+delay,noise=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();noise.buffer=this.noise;filter.type='bandpass';filter.frequency.setValueAtTime((1300+strength*1700)*(1+Math.min(combo,14)*.025),t);filter.Q.value=.7;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.23*strength,t+.002);gain.gain.exponentialRampToValueAtTime(.0001,t+.055);noise.connect(filter).connect(gain).connect(this.master);noise.start(t);noise.stop(t+.085);this.tone(145+strength*80,.085,.25*strength,delay,'triangle',42);}
 tone(freq,duration=.12,volume=.12,delay=0,type='sine',end=freq){const c=this.context;if(!c||c.state!=='running'||this.muted)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(end,t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.01);}
 grain(duration=.06,volume=.16,delay=0,frequency=2400){const c=this.context;if(!c||c.state!=='running'||this.muted)return;const t=c.currentTime+delay,n=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();n.buffer=this.noise;f.type='highpass';f.frequency.value=frequency;g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f).connect(g).connect(this.master);n.start(t);n.stop(t+duration+.01);}

 play(kind,combo=0){
  const energy=comboFeedback(combo).audio;
  if(kind==='throw'){this.grain(.055,.09,0,900);this.tone(130,.075,.08,0,'triangle',300);}
  if(kind==='perfect'||kind==='good'){this.hit(kind==='perfect'?.55:.38,0,combo);this.grain(.012,.022*energy,0,1200);this.grain(.018,.05*energy,0,2800);}
  if(kind==='miss'||kind==='skull'){const f=failureFeedback(combo);this.grain(.11,.14*f.audio,0,500);this.tone(kind==='skull'?220:170,.2,.14*f.audio,0,'triangle',48);this.tone(kind==='skull'?231:84,.15,.06,0,'sine',38);}
  if(kind==='hurt'){this.grain(.065,.12,0,750);this.tone(180,.13,.16,0,'triangle',54);this.tone(95,.09,.075,.015,'sine',42);}
  if(kind==='death'){this.tone(155,.46,.18,0,'triangle',32);this.tone(62,.32,.12,.04,'sine',25);this.grain(.19,.08,0,650);this.grain(.045,.035,.22,1600);}
  if(kind==='score')this.grain(.014,.024,0,3300);
  if(kind==='skip')this.grain(.035,.016,0,1200);
  if(kind==='avoid')this.grain(.022,.009,0,2000);
 }
 dispose(){this.disposed=true;this.context?.close();}
}
