export const segmentStart=s=>s.startT??(s.reverse?1:0);
export const segmentEnd=s=>s.reverse?0:1;
export const segmentLength=s=>s.route.length*Math.abs(segmentEnd(s)-segmentStart(s));
export const segmentProgress=(s,fraction)=>segmentStart(s)+(segmentEnd(s)-segmentStart(s))*Math.max(0,Math.min(1,fraction));
export function routeTo(routes,origin,destination){
 const queue=[{id:origin,path:[],cost:0}],seen=new Set();
 while(queue.length){
  queue.sort((a,b)=>a.cost-b.cost);const step=queue.shift();if(seen.has(step.id))continue;seen.add(step.id);
  if(step.id===destination)return step.path;
  for(const route of routes){const reverse=route.to===step.id,next=reverse?route.from:route.from===step.id?route.to:null;
   if(next&&!seen.has(next))queue.push({id:next,path:[...step.path,{route,reverse,to:next}],cost:step.cost+route.length});
  }
 }
 return null;
}
// Start from the actual point on the current edge, taking the shorter way out.
export function retargetRoute(routes,trip,destination){
 const active=trip.segments[trip.index],route=active.route,startT=trip.progress,candidates=[];
 for(const reverse of [false,true]){
  const to=reverse?route.from:route.to,tail=routeTo(routes,to,destination);if(!tail)continue;
  const first={route,reverse,to,startT},segments=[first,...tail].filter(s=>segmentLength(s)>1e-7);
  candidates.push({segments,length:segments.reduce((n,s)=>n+segmentLength(s),0)});
 }
 candidates.sort((a,b)=>a.length-b.length);return candidates[0]?.segments??[];
}
