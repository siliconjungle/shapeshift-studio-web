export const regrowthTiming=Object.freeze({min:20,max:35,fade:1.2});
export class SceneryRegrowth{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.at=Infinity;}
 destroy(time){this.at=time+regrowthTiming.min+this.random()*(regrowthTiming.max-regrowthTiming.min);}
 sample(time){
  if(time<this.at)return{phase:'waiting',opacity:0};
  const t=Math.max(0,Math.min(1,(time-this.at)/regrowthTiming.fade));
  return{phase:t===1?'ready':'returning',opacity:t*t*(3-2*t)};
 }
}
