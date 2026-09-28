import {gaitSample} from '../shared/performance-motion.js';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
export const feedbackReactions=['humming','thinking','idea','delight','determined','cold','overheated','love'];
export const feedbackAssets=['destination-pennant','selection-arrow','selection-puff',...feedbackReactions.map(id=>'emote-'+id)];
export const emoteTiming=Object.freeze({min:25,max:55});
export const nextEmoteDelay=(random=Math.random)=>emoteTiming.min+(emoteTiming.max-emoteTiming.min)*Math.max(0,Math.min(1,random()));
export function arrowPose(age,time,gentle=false,exiting=false){
 if(gentle)return {x:1,y:1,dy:0,angle:0,inflate:0,opacity:exiting?1-clamp(age/.1):clamp(age/.12)};
 if(exiting){const t=clamp(age/.13),s=smooth(t);return{x:1+.5*Math.sin(t*Math.PI),y:Math.max(.02,1-s),dy:8*s,angle:-9*Math.sin(t*Math.PI),inflate:.3*Math.sin(t*Math.PI),opacity:1-s};}
 const t=clamp(age/.34),pop=1-Math.exp(-t*7)*Math.cos(t*12),squish=Math.sin(t*16)*Math.exp(-t*5);
 const bob=Math.sin(time*4.2),vertical=1-.15*bob;
 return{x:Math.max(.01,(pop+.24*squish)/vertical),y:Math.max(.01,(pop-.26*squish)*vertical),dy:6*bob+5*squish,angle:1.5*Math.sin(time*2.1),inflate:.18*bob*clamp(age/.34),opacity:clamp(age/.07)};
}
export function puffPose(age,index,gentle=false){
 const t=clamp((age-(index? .055:0))/.29),spread=smooth(t),side=index===1?-1:1;
 return{x:index?side*(8+14*spread):0,y:index?-4-8*spread:-4*spread,scale:Math.max(0,(index?.5:.3)+Math.sin(t*Math.PI)*(index?.55:.85)),opacity:gentle?0:smooth(t/.14)*(1-smooth((t-.35)/.65))*(index?.6:.92)};
}
// Detect landings from the exact leg pose. Never replay missed steps after a hitch.
export class FootContacts{
 constructor(){this.planted=[true,true];this.walking=false;}
 update(cycle,walking){
  const now=[0,1].map(i=>gaitSample(cycle,i).planted),hit=walking&&this.walking&&now.some((p,i)=>p&&!this.planted[i]);
  this.planted=now;this.walking=walking;return hit;
 }
}
// Every biome keeps the complete pool. Local reactions get extra weight only.
export function reactionWeights(walking,biome){
 const local=biome==='gate'?'cold':biome==='well'?'overheated':['camp','shop'].includes(biome)?'love':null;
 return feedbackReactions.map(id=>({id,weight:id===local?6:walking&&['humming','determined'].includes(id)?2:1}));
}
export function chooseReaction(random,last,walking,biome){
 const pool=reactionWeights(walking,biome).filter(r=>r.id!==last),total=pool.reduce((n,r)=>n+r.weight,0);
 let pick=Math.max(0,Math.min(1,random()))*total;
 for(const r of pool){pick-=r.weight;if(pick<0)return r.id;}
 return pool.at(-1).id;
}
