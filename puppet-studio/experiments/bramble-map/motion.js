import {segmentLength} from './travel-routing.js';
import {poseAt,spring} from '@shapeshift-labs/studio-core/scene3d/core/motion';
import {easing} from '@shapeshift-labs/studio-core/fx/math';
export const clamp=t=>Math.max(0,Math.min(1,t));
export const journeyBeat={start:.12,pop:.24,path:.34};
export function revealPose(age,{gentle=false}={}){
 if(age<0)return{opacity:0,x:1,y:1,dy:0,angle:0};
 if(gentle)return{opacity:clamp(age/.16),x:1,y:1,dy:0,angle:0};
 const [scale,angle]=poseAt(age,[[0,.15,-5],[.16,1.04,1],[journeyBeat.pop,1,0]]);
 return{opacity:clamp(age/.05),x:scale,y:scale,dy:0,angle};
}
// Progress is a reversible spring, rather than a timer that snaps to zero on exit.
// Only the ribbon artwork scales; text follows with its own opacity and lift.
export function bannerPose(progress,gentle=false){const p=gentle?clamp(progress):progress;return{opacity:clamp(p*2),x:.78+.22*p,y:.96+.04*p,dy:gentle?0:(1-p)*12,angle:gentle?0:(1-p)*-3,textOpacity:clamp((p-.2)/.8)};}
export function hoverPose(value,velocity,target,dt){return spring(value,velocity,target,dt,34,.74);}
export const travelEase=t=>easing(clamp(t),'in-out-sine');
export const markerAnchor=n=>({x:n.x+n.width*.25,y:n.y-6});
export function anchoredWaypoints(route,locations){const points=route.points.map(([x,y])=>({x,y}));points[0]=markerAnchor(locations.find(n=>n.id===route.from));points[points.length-1]=markerAnchor(locations.find(n=>n.id===route.to));return points;}
// A short gust every ~9 seconds; separate phases avoid synchronised swaying.
export function treeWind(time,phase){const t=(time+phase)%9;return Math.sin(time*1.9+phase)*1.8+(t<2.2?Math.sin(t*Math.PI/2.2)*Math.sin(t*4)*2.5:0);}

export const travellerWalk={speed:170,stride:54,settle:.16};
export function travelPlan(segments){const length=segments.reduce((sum,s)=>sum+segmentLength(s),0);return{length,duration:Math.max(.001,length/travellerWalk.speed),steps:length/travellerWalk.stride};}
export function walkingPose(age,plan,gentle=false){
 const t=clamp(age/plan.duration),phase=t*plan.steps*Math.PI*2;
 const weight=gentle?0:clamp(Math.min(age,plan.duration-age)/travellerWalk.settle);
 // A fixed world-space pace and stride for every trip length. Only the small
 // footfall modulation changes instantaneous speed, never the destination.
 const distance=t*plan.length-Math.sin(phase)*travellerWalk.stride*.035*weight;
 return{distance:Math.max(0,Math.min(plan.length,distance)),done:t>=1,cycle:phase,weight};
}
export function routeMarkPassed(stamp,done,active,reverse,progress){return done||active&&(reverse?stamp>=progress:stamp<=progress);}
export function facingFromVector(dx,dy,previous='right'){
 if(Math.hypot(dx,dy)<.1)return previous;
 return Math.abs(dx)>Math.abs(dy)?dx<0?'left':'right':dy<0?'up':'down';
}

// Complete the reveal at each stop's arrival, with a 650ms lead-in.
export function approachColour(distanceToStop,age,plan){const arrival=distanceToStop/Math.max(.001,plan.length)*plan.duration;return clamp(1-(arrival-age)/.65);}

export const assetSwayStrength=name=>['pine','oak','solis-tree','cryos-pine'].includes(name)?.035:0;
