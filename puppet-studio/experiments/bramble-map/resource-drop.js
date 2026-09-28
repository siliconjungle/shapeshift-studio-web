export const RESOURCE_DROP_DURATION=2.1;
const clamp=x=>Math.max(0,Math.min(1,x));
// A readable loot toss: airborne arc, squash on impact, smaller rebound, hold.
export function resourceDropPose(age,side=1,gentle=false){
 const t=Math.max(0,age),u=clamp(t/.72),land=t-.72;
 let height=.4*(1-u)+.16*u+4*u*(1-u)*.95,sx=1,sy=1;
 const emerge=clamp(t/.14),scale=1-Math.pow(1-emerge,3);
 if(land>=0){height=.16;if(land<.1){const impact=Math.sin(land/.1*Math.PI);sx=1+.28*impact;sy=1-.3*impact;}else if(land<.4){const bounce=(land-.1)/.3;height+=Math.sin(bounce*Math.PI)*.19;sx=1-.1*Math.sin(bounce*Math.PI);sy=1+.12*Math.sin(bounce*Math.PI);}}
 const opacity=1-clamp((t-1.65)/.45);
 return{x:gentle?0:side*.52*(1-Math.pow(1-u,2)),height:gentle?.45:height,rotation:gentle?0:side*Math.sin(u*Math.PI)*.48,scaleX:gentle?1:sx*scale,scaleY:gentle?1:sy*scale,opacity,done:t>=RESOURCE_DROP_DURATION};
}
export function resourceDropBurst(random=Math.random){
 const count=2+Math.floor(random()*2);
 return Array.from({length:count},(_,i)=>({delay:i*.085,side:(i/(count-1)*2-1)*(1+random()*.35),depth:.12+random()*.25}));
}
