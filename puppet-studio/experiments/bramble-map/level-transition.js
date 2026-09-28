const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const rebound=x=>{x=clamp(x)-1;return 1+2*x*x*x+x*x;};
export const levelTiming={focus:.62,closeDelay:.12,close:.62,hold:.24,open:.62,return:.74,celebrate:.65};
export function levelTransitionPose(age){
 const closeAt=levelTiming.closeDelay,blackAt=closeAt+levelTiming.close,openAt=blackAt+levelTiming.hold,returnAt=openAt,clearAt=openAt+Math.max(levelTiming.open,levelTiming.return),end=clearAt+levelTiming.celebrate;
 const phase=age<closeAt?'focus':age<blackAt?'closing':age<openAt?'black':age<openAt+levelTiming.open?'opening':age<clearAt?'returning':age<end?'cleared':'idle';
 const cover=age<closeAt?0:age<blackAt?smooth((age-closeAt)/levelTiming.close):age<openAt?1:1-smooth((age-openAt)/levelTiming.open);
 // A tiny anticipatory pullback, then a soft overshoot into the framing.
 const focus=age===0?0:age<.06?-.015*Math.sin(age/.06*Math.PI):age<returnAt?rebound((age-.06)/(levelTiming.focus-.06)):age>=clearAt?0:1-rebound((age-returnAt)/levelTiming.return);
 return{phase,cover,focus,returning:age>=returnAt,close:age>=closeAt,open:age>=openAt,clear:age>=clearAt,done:age>=end};
}
export class LevelVisit{
 constructor(callbacks){this.callbacks=callbacks;this.active=null;}
 start(id){if(this.active)return false;this.active={id,age:0,close:false,open:false,clear:false};return true;}
 tick(dt){
  const visit=this.active;if(!visit)return null;visit.age+=dt;const pose=levelTransitionPose(visit.age);
  for(const event of ['close','open','clear'])if(pose[event]&&!visit[event]){visit[event]=true;this.callbacks[event]?.(visit.id);}
  if(pose.done){this.active=null;this.callbacks.done?.(visit.id);}return pose;
 }
 reset(){this.active=null;}
}
