// Little Gods' original reaction artwork and vocal performances, mapped to dice
// combat events. Routine reactions cannot replace a hurt/death reaction.
export const COMBAT_REACTIONS={
 ready:{icon:'determined',voice:['determined','angry'],duration:1.2,priority:1},
 hit:{icon:'proud',voice:['proud','happy'],duration:1.3,priority:1},
 perfect:{icon:'delight',voice:['happy','happy'],duration:1.4,priority:1},
 miss:{icon:'grumpy',voice:['angry','angry'],duration:1.2,priority:1},
 skip:{icon:'confused',voice:['confused','confused'],duration:1,priority:1},
 low:{icon:'disappointed',voice:['sad','confused'],duration:1.3,priority:1},
 dodge:{icon:'surprise',voice:['surprise','surprise'],duration:1.1,priority:1},
 hurt:{icon:'dizzy',voice:['hurt','hurt'],duration:1.15,priority:3},
 death:{icon:'heartbroken',voice:['hurt','hurt'],duration:2.6,priority:4,pitch:.68},
 victory:{icon:'delight',voice:['happy','happy'],duration:2.4,priority:4,delay:.28}
};
export function reactionFor(kind,side){const r=COMBAT_REACTIONS[kind];if(!r)throw Error('Unknown combat reaction '+kind);return{...r,clip:r.voice[side==='hero'?0:1],pitch:r.pitch??1,delay:r.delay??.08};}
// Same entry overshoot and exit envelope as Little Gods' emote-motion.js.
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function reactionEnvelope(age,duration){
 const appear=smooth(age/.18),exit=smooth((age-(duration-.35))/.35);
 return{scale:appear*(1+.17*Math.sin(Math.min(age/.45,1)*Math.PI)*Math.exp(-age*2))*(1-.12*exit),opacity:appear*(1-exit),rise:7*exit};
}
export class ReactionState{
 constructor(){this.events={hero:null,enemy:null};}
 trigger(side,kind,now){const spec=reactionFor(kind,side),current=this.events[side];if(current&&now-current.at<current.duration*1000&&current.priority>spec.priority)return null;return this.events[side]={...spec,kind,at:now};}
 clear(){this.events.hero=null;this.events.enemy=null;}
}
