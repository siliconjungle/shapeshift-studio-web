const clamp=x=>Math.max(0,Math.min(1,x));
export class CloudPlay{
 constructor(random=Math.random){this.random=random;this.reset();}
 reset(){this.hits=0;this.threshold=3+Math.floor(this.random()*4);this.hitAt=-Infinity;this.rainAt=-Infinity;this.until=-Infinity;this.duration=0;this.raining=false;}
 advance(time){if(this.raining&&time>=this.until){this.raining=false;this.hits=0;this.threshold=3+Math.floor(this.random()*4);}}
 hit(time){this.advance(time);this.hitAt=time;if(this.raining)return false;if(++this.hits<this.threshold)return false;this.rainAt=time;this.duration=4+this.random()*4;this.until=time+this.duration;this.raining=true;return true;}
 sample(time,gentle=false){
  this.advance(time);const age=time-this.hitAt,wave=gentle||age<0||age>.65?0:Math.sin(age*28)*Math.exp(-age*7),kick=gentle||age<0||age>.65?0:Math.sin(age*18)*Math.exp(-age*8);
  return{sx:1+.10*wave,sy:1-.09*wave,angle:2.2*kick,dy:kick?-3*kick:0,rain:this.raining?Math.min(clamp((time-this.rainAt)/.24),clamp((this.until-time)/.65)):0};
 }
}
