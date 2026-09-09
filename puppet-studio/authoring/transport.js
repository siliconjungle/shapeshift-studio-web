// Local playback preferences never alter the authored animation or exported timing.
export const transportKey=({dimension=2,clip,asset}={})=>asset?'art:'+asset:dimension+':'+clip;
export class StudioTransport {
 constructor(){this.sessions=new Map();}
 get(key,duration){let s=this.sessions.get(key);if(!s){s={speed:1,loop:false,from:0,to:duration};this.sessions.set(key,s);}s.to=Math.min(s.to,duration);if(s.from>=s.to){s.from=0;s.to=duration;s.loop=false;}return {...s};}
 set(key,duration,values){const next={...this.get(key,duration),...values};if(!Number.isFinite(next.speed)||next.speed<.05||next.speed>1)throw Error('Preview speed must be between 0.05× and 1×');if(!Number.isFinite(next.from)||!Number.isFinite(next.to)||next.from<0||next.to>duration||next.to-next.from<.001)throw Error('Choose a non-empty range inside the animation');this.sessions.set(key,next);return {...next};}
 advance(key,time,dt,{duration,loop=false}){const s=this.get(key,duration),from=s.loop?s.from:0,to=s.loop?s.to:duration,t=(s.loop&&(time<from||time>=to)?from:time)+Math.max(0,dt)*s.speed;if(t>=to){if(s.loop||loop)return{time:from+(t-from)%(to-from),ended:false,wrapped:true};return{time:to,ended:true,wrapped:false};}return{time:t,ended:false,wrapped:false};}
}
export const studioTransport=new StudioTransport();
