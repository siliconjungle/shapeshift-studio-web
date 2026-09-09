import {walkObstacleLookup} from './walk-obstacle-index.js';
import {PathQueue} from './path-queue.js';
import {WORLD_BOUNDS} from './village-layout.js';
// Ground clicks use a sampled collision check, so the demo never walks through
// a boulder, a building, an unsupported edge, or a sudden cliff step.
export const WALK_SPEED=2.6;
export const WALK_CADENCE=WALK_SPEED/1.5;
// The rear tree line is scenery; terrain continues underneath the backdrop.
export const PLAYABLE_BACK_Z=WORLD_BOUNDS.back+1.4;
export const WALK_SCREEN_PADDING=.65;
export function boundedWalkHeight(heightAt,viewLeft,viewRight=WORLD_BOUNDS.right){
 const left=Math.max(WORLD_BOUNDS.left,viewLeft)+WALK_SCREEN_PADDING,right=Math.min(WORLD_BOUNDS.right,viewRight)-WALK_SCREEN_PADDING;
 return (x,z)=>x<left||x>right||z<PLAYABLE_BACK_Z||z>WORLD_BOUNDS.front-WALK_SCREEN_PADDING?null:heightAt(x,z);
}
export function canWalkAt(x,z,heightAt,obstacles=[]){
 const h=heightAt(x,z);if(h===null||!Number.isFinite(h))return false;
 for(const [dx,dz] of [[.24,0],[-.24,0],[0,.24],[0,-.24]]){const sample=heightAt(x+dx,z+dz);if(sample===null||Math.abs(sample-h)>.3)return false}
 return !obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+.22);
}
export function walkStep(position,destination,dt,heightAt,obstacles=[]){
 const dx=destination.x-position.x,dz=destination.z-position.z,d=Math.hypot(dx,dz),travel=Math.min(d,Math.max(0,dt)*WALK_SPEED);
 if(d<.025){const allowed=canWalkAt(destination.x,destination.z,heightAt,obstacles);return {x:allowed?destination.x:position.x,z:allowed?destination.z:position.z,done:true,blocked:!allowed}}
 const steps=Math.max(1,Math.ceil(travel/.06));let x=position.x,z=position.z;
 for(let i=0;i<steps;i++){
  const nx=x+dx/d*travel/steps,nz=z+dz/d*travel/steps;
  if(!canWalkAt(nx,nz,heightAt,obstacles))return {x,z,done:true,blocked:true};
  x=nx;z=nz;
 }
 return {x,z,done:travel>=d,blocked:false};
}

// Small local A* for work approaches: never walk through a trunk to reach it.
export function findWalkPath(start,destination,heightAt,obstacles=[]){
 if(!canWalkAt(destination.x,destination.z,heightAt,obstacles))return null;
 const nearby=walkObstacleLookup(obstacles);
 const clear=(a,b)=>{const d=Math.hypot(b.x-a.x,b.z-a.z),n=Math.max(1,Math.ceil(d/.12));let old=heightAt(a.x,a.z);for(let i=1;i<=n;i++){const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,h=heightAt(x,z);if(!canWalkAt(x,z,heightAt,nearby(x,z))||Math.abs(h-old)>.3)return false;old=h}return true};
 if(clear(start,destination))return [destination];
 const cell=.4,key=(x,z)=>x+','+z,heuristic=(x,z)=>Math.hypot(start.x+x*cell-destination.x,start.z+z*cell-destination.z),open=new PathQueue({x:0,z:0,g:0,f:heuristic(0,0),parent:null}),best=new Map([[key(0,0),0]]);
 for(let count=0;open.length&&count<28000;count++){
  const node=open.pop();if(node.g>best.get(key(node.x,node.z))){count--;continue;}const point={x:start.x+node.x*cell,z:start.z+node.z*cell};
  if(heuristic(node.x,node.z)<.65&&clear(point,destination)){
   const path=[destination];for(let n=node;n.parent;n=n.parent)path.unshift({x:start.x+n.x*cell,z:start.z+n.z*cell});
   const simplified=[];let from=start;for(let k=0;k<path.length;){let end=path.length-1;while(end>k&&!clear(from,path[end]))end--;simplified.push(path[end]);from=path[end];k=end+1}return simplified;
  }
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   const x=node.x+dx,z=node.z+dz,g=node.g+Math.hypot(dx,dz)*cell,k=key(x,z);if(Math.abs(x)>Math.ceil((WORLD_BOUNDS.right-WORLD_BOUNDS.left)/cell)+2||Math.abs(z)>Math.ceil((WORLD_BOUNDS.front-WORLD_BOUNDS.back)/cell)+2||g>=(best.get(k)??Infinity))continue;
   const next={x:start.x+x*cell,z:start.z+z*cell};if(!clear(point,next))continue;best.set(k,g);open.push({x,z,g,f:g+heuristic(x,z),parent:node});
  }
 }
 return null;
}
