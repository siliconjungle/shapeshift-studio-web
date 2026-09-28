import {poseAt} from '@shapeshift-labs/studio-core/scene3d/core/motion';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
export const RELEASE=.085,RETURN_SEAT=.43;
export function popPose(age,start={x:0,y:-246,rotation:0},floor=191){
 const release=RELEASE;
 const angle=start.rotation*Math.PI/180,nx=-Math.sin(angle),ny=Math.cos(angle);
 if(age<release){const [y,r,sx,sy]=poseAt(Math.max(0,age),[[0,0,0,1,1],[release*.647,6,-3,1.15,.87],[release,2,0,.88,1.14]]);return{x:start.x+nx*y,y:start.y+ny*y,rotation:start.rotation+r,scaleX:sx,scaleY:sy,landed:false};}
 // Local neck impulse, followed by world gravity. Deterministic fixed steps also
 // make this usable for baked puppet keys and reverse timeline seeking.
 const duration=Math.min(age-release,3),h=1/240,p={x:start.x,y:start.y,rotation:start.rotation},v={x:-nx*950+ny*65,y:-ny*950-nx*65,rotation:180},g=4500;
 let landed=false,landAt=Infinity;
 for(let t=0;t<duration;t+=h){const dt=Math.min(h,duration-t);v.y+=g*dt;p.x+=v.x*dt;p.y+=v.y*dt;p.rotation+=v.rotation*dt;
  if(p.x>285||p.x<-285){p.x=Math.max(-285,Math.min(285,p.x));v.x*=-.34;v.rotation*=.6;}
  const r=p.rotation*Math.PI/180,bottom=Math.max(...[[-56,-65],[56,-65],[50,48],[-50,48]].map(([x,y])=>Math.sin(r)*x+Math.cos(r)*y));
  if(p.y+bottom>floor){p.y=floor-bottom;if(!landed){landed=true;landAt=t;}v.y=v.y>100?-v.y*.12:0;v.x*=.8;v.rotation*=.86;}
  if(landed){v.rotation+=(24*(90-p.rotation)-10*v.rotation)*dt;v.x*=Math.exp(-dt*5);}
 }
 const since=duration-landAt,stretch=landed?1+.22*Math.exp(-since*17)*Math.cos(since*29):1+.4*Math.exp(-duration*13);
 return{...p,scaleX:1/stretch,scaleY:stretch,landed};
}
export function returnPose(age,from,to){
 const arcHeight=75,approach=58;
 const t=clamp(age/.34),ease=t*t*(3-2*t),arc=Math.sin(t*Math.PI)*arcHeight,angle=to.rotation*Math.PI/180,nx=-Math.sin(angle),ny=Math.cos(angle);
 if(age<.34)return{x:from.x+(to.x-approach*nx-from.x)*ease,y:from.y+(to.y-approach*ny-from.y)*ease-arc,rotation:from.rotation*(1-ease)+to.rotation*ease,scaleX:1,scaleY:1};
 const [y,sx,sy,r]=poseAt(age,[[.34,-approach,.96,1.04,-4],[.39,-approach*.517,.89,1.12,-1],[.43,5,1.15,.87,1],[.5,-3,.96,1.04,-1],[.61,0,1,1,0]]);
 return{x:to.x+nx*y,y:to.y+ny*y,rotation:to.rotation+r,scaleX:sx,scaleY:sy};
}
