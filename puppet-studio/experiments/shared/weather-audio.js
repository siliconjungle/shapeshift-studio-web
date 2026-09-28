// Original procedural stereo weather: filtered rain, small leaf patter and
// rolling low thunder. Buffers are built on first interaction, never per frame.
export function weatherSamples(sampleRate,seconds,kind,seed=91){
 const channels=[new Float32Array(Math.ceil(sampleRate*seconds)),new Float32Array(Math.ceil(sampleRate*seconds))];
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(const samples of channels){
  let low=0,body=0,tap=0;const lowRate=1-Math.exp(-2*Math.PI*95/sampleRate),bodyRate=1-Math.exp(-2*Math.PI*850/sampleRate);
  for(let i=0;i<samples.length;i++){
   const white=random()*2-1,t=i/sampleRate;low+=(white-low)*lowRate;body+=(white-body)*bodyRate;
   if(random()<180/sampleRate)tap+=(random()-.5)*.4;tap*=.92;
   if(kind==='snow')samples[i]=(low*.9+body*.18)*(.65+.2*Math.sin(t*Math.PI*2/seconds)+.1*Math.sin(t*Math.PI*4/seconds));
   else if(kind==='rain')samples[i]=white*.09+body*.34+tap*.16;
   else{
    const attack=1-Math.exp(-t*3.5),tail=Math.pow(Math.max(0,1-t/seconds),1.7);
    const rolls=.42+.35*Math.exp(-Math.pow((t-.7)/.5,2))+.25*Math.exp(-Math.pow((t-2.1)/.8,2))+.18*Math.exp(-Math.pow((t-3.5)/.6,2));
    // Give the initial roll enough midrange to survive small speakers.
    samples[i]=(low*3.1+body*.85*Math.exp(-t*.9))*attack*tail*rolls;
   }
  }
 }
 if(kind==='thunder'){
  let peak=0;for(const channel of channels)for(const sample of channel)peak=Math.max(peak,Math.abs(sample));
  const scale=peak>0?.8/peak:0;for(const channel of channels)for(let i=0;i<channel.length;i++)channel[i]*=scale;
 }
 return channels;
}
