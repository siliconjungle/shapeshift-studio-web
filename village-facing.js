// Movement facing is simulation state. Ignore stalled collision nudges and
// retain the current axis near diagonals; deliberate turns still settle fast.
const horizontal=f=>f==='left'||f==='right';
export function stableWalkDirection(facing,vx,vz){
 const x=Math.abs(vx),z=Math.abs(vz);
 const useX=horizontal(facing)?x*1.22>=z:x>z*1.22;
 return useX?(vx<0?'left':'right'):(vz<0?'back':'front');
}
export function updateWalkFacing(w,dt,time,blocked=false){
 if(!(dt>0))return;
 const speed=Math.hypot(w.vx,w.vz),distance=speed*dt;
 let state=w.walkFacing;
 if(!state)state=w.walkFacing={facing:w.facing,candidate:null,seconds:0,distance:0,lastMove:-Infinity};
 // Work, conversations and doorway exits may set an intentional pose directly.
 if(state.facing!==w.facing){state.facing=w.facing;state.candidate=null;state.seconds=state.distance=0;state.lastMove=-Infinity}
 if(blocked||speed<.18||distance<.002){state.candidate=null;state.seconds=state.distance=0;return}
 const next=stableWalkDirection(w.facing,w.vx,w.vz),resuming=time-state.lastMove>.25;state.lastMove=time;
 if(next===w.facing){state.candidate=null;state.seconds=state.distance=0;return}
 // On a fresh, substantial step, face the route immediately rather than slide
 // backwards out of an idle pose. During travel require sustained new motion.
 if(resuming&&distance>=.025){w.facing=state.facing=next;state.candidate=null;state.seconds=state.distance=0;return}
 if(state.candidate!==next){state.candidate=next;state.seconds=state.distance=0}
 state.seconds+=dt;state.distance+=distance;
 if(state.seconds>=.09&&state.distance>=.10){w.facing=state.facing=next;state.candidate=null;state.seconds=state.distance=0}
}
