import {defineGameData} from './game-data.js';

// Native counterparts of Studio's contact pins, bounded follow-through and
// velocity smears. Sampled from clip time, so pause/seek never accumulates lag.
export const PERFORMANCE=defineGameData('motion.performance',{
 smear:{threshold:850,maxLength:48,headWeight:1.6},
 follow:{work:1,chop:.82,mine:.58,fight:.55,delay:.012,decay:24},
 tools:{work:{raiseX:0,raiseY:0},chop:{raiseX:-12,raiseY:18},mine:{raiseX:22,raiseY:42}},
 gait:{swingFraction:.44,stride:34,lift:24,loadedStride:.78,loadedLift:.65},
 tree:{lag:.085,amplitude:.085,decay:7.5,frequency:19},
 gestures:{strength:1}
});
const clamp=t=>Math.max(0,Math.min(1,t));
export const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
export function swingFollow(p,kind='work'){
 const t=p-.552-PERFORMANCE.follow.delay,gain=PERFORMANCE.follow[kind]??0;
 const wave=t>0?Math.sin(t*60)*Math.exp(-t*PERFORMANCE.follow.decay)*gain:0;
 return {headY:wave*13,headX:-wave*5,angle:-wave*.045};
}
export function smearSample(p,head,duration){
 if(p<=.44||p>=.515)return {x:0,y:0,length:0};
 const a=head(Math.max(.44,p-.002)),b=head(Math.min(.515,p+.002));
 const dx=b[0]-a[0],dy=b[1]-a[1],d=Math.hypot(dx,dy),speed=d/(.004*duration);
 const gate=ease((p-.44)/.025)*(1-ease((p-.503)/.012));
 const length=Math.min(PERFORMANCE.smear.maxLength,Math.max(0,speed-PERFORMANCE.smear.threshold)*.025)*gate;
 return {x:d?dx/d:0,y:d?dy/d:0,length};
}
export function gaitSample(cycle,leg){
 const turn=Math.PI*2,span=PERFORMANCE.gait.swingFraction,phase=cycle+leg*Math.PI;
 const q=((phase/turn+span/2)%1+1)%1;
 if(q<span){const u=q/span,stride=-1+2*ease(u);return {stride,lift:Math.sin(Math.PI*u)**1.5,arm:-stride,planted:false};}
 const stride=1-2*(q-span)/(1-span);
 return {stride,lift:0,arm:-stride,planted:true};
}
// Relative canopy bend after the trunk's impulse. Roots are never translated.
export function treeFollow(age,direction=1){
 const t=age-PERFORMANCE.tree.lag;
 return t>0&&t<1.2?direction*PERFORMANCE.tree.amplitude*Math.sin(t*PERFORMANCE.tree.frequency)*Math.exp(-t*PERFORMANCE.tree.decay):0;
}
export function socialAccent(event){
 const out={headX:0,headTilt:0,bodyY:0,armLift:0,armSpread:0};
 if(!event)return out;
 const t=event.age,g=(event.intensity??1)*PERFORMANCE.gestures.strength;
 const pulse=(start,end)=>ease((t-start)/.18)*(1-ease((t-end)/.35));
 if(['love','nervous'].includes(event.id)){
  const glance=pulse(.02,.62),shy=pulse(.42,1.55);
  out.headX=5*glance-4*shy;out.headTilt=-.07*glance+.07*shy;
  out.bodyY=4*shy;out.armLift=.1*shy;out.armSpread=-.12*shy;
 }else if(['confused','missing-plank','empty-bowl'].includes(event.id)){
  const shrug=pulse(.3,1.1);out.armLift=.22*shrug;out.armSpread=.14*shrug;out.bodyY=-5*shrug;out.headTilt=-.06*pulse(.02,.35);
 }else if(['proud','delight','idea'].includes(event.id)){
  out.headTilt=.07*pulse(.65,1.1);out.bodyY=3*pulse(.8,1.3);
 }
 for(const k of Object.keys(out))out[k]*=g;
 return out;
}
