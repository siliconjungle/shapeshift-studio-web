// The live game and OfflineAudioContext exports share this exact scheduler.
export function scheduleAudioRecipe(context,destination,recipe,{now=context.currentTime,random=Math.random,track=()=>{}}={}){
 const channel={input:destination},pitch=recipe.pitch[0]+random()*(recipe.pitch[1]-recipe.pitch[0]);
  function tone(start,end,duration,gain,type='sine',delay=0){const o=context.createOscillator(),g=context.createGain(),at=now+delay;o.type=type;o.frequency.setValueAtTime(start*pitch,at);o.frequency.exponentialRampToValueAtTime(end*pitch,at+duration);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.004);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g).connect(channel.input);track(o,[o,g]);o.start(at);o.stop(at+duration)}
  function noise(duration,gain,freq,delay=0){const b=context.createBuffer(1,Math.ceil(context.sampleRate*duration),context.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=random()*2-1;const s=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain(),at=now+delay;s.buffer=b;f.type='lowpass';f.frequency.value=freq;g.gain.setValueAtTime(gain,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);s.connect(f).connect(g).connect(channel.input);track(s,[s,f,g]);s.start(at)}
 for(const layer of recipe.layers)(layer.type==='tone'?tone:noise)(...layer.args);
}
