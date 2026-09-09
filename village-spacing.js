import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {supportParticipant} from './ecs/support-participants.js';
import {ageMovementRate} from './village-age.js';
import {visiblePeople} from './village-people.js';
import {updateWalkFacing} from './village-facing.js';
import {DOORWAY_DURATION} from './doorway-transition.js';
import {walkStep} from './village-walking.js';

const yieldingStates=new Set(['idle','eating','resting','waiting-return']);
const radius=w=>(personAge(w)?.child)?.36:.55;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const exiting=(w,time)=>(actorInterior(w)?.exitAt)!==undefined&&time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION;
const stopped=w=>!w.route?.length&&!w.spacingRoute?.length;

// Reserve endpoints as well as occupied positions, so two villagers cannot
// independently pick the same lunch/play/work spot on consecutive frames.
export function standingRoom(e,worker,point,companion=null){
 return standingRoomWithRadius(e,point,radius(worker),{worker,companion});
}
export function standingRoomWithRadius(e,point,workerRadius,{worker=null,companion=null}={}){
 return visiblePeople(e).every(peer=>{
  if(peer===worker||peer===companion||(actorVitality(peer)?.dead)||(actorInterior(peer)?.inside)||peer.divineHeld)return true;
  const end=peer.spacingRoute?.at(-1)??peer.route?.at(-1)??peer;
  const gap=workerRadius+radius(peer);
  return distance(point,end)>=gap&&(!stopped(peer)||distance(point,peer)>=gap);
 });
}
export function standingRoute(e,worker,point,{skipCenter=false}={}){
 const candidates=skipCenter?[]:[point];
 for(const r of [1.15,1.75,2.35])for(let i=0;i<8;i++){
  const angle=(i+worker.id%8)*Math.PI/4;
  candidates.push({x:point.x+Math.sin(angle)*r,z:point.z+Math.cos(angle)*r});
 }
 for(const p of candidates){
  if(!standingRoom(e,worker,p))continue;
  const route=e.route(worker,p);if(route)return route;
 }
 return null;
}

// Move aside with the ordinary grounded walk, never by pushing/teleporting a
// sprite. Work contacts, conversations and doorway fades keep their anchors.
export function updateStandingSpace(e,dt){
 for(const w of e.workers){
  if((actorVitality(w)?.dead)||(actorInterior(w)?.inside)||supportParticipant(w)?.partnerId!=null||exiting(w,e.time)||!yieldingStates.has(w.state)||w.route.length){w.spacingRoute=null;continue}
  if(!w.spacingRoute?.length&&(w.spacingCheckAt??0)<=e.time){
   w.spacingCheckAt=e.time+.4;
   const overlaps=e.workers.some(p=>!(actorVitality(p)?.dead)&&p!==w&&!(actorInterior(p)?.inside)&&!exiting(p,e.time)&&stopped(p)&&distance(w,p)<radius(w)+radius(p)-.04&&(!yieldingStates.has(p.state)||w.id>p.id));
   const inDoor=w.state==='idle'&&[(actorResidence(w)?.home),w.store].some(h=>h?.door&&distance(w,h)<.35);
   if(overlaps||inDoor)w.spacingRoute=standingRoute(e,w,w,{skipCenter:true});
  }
  if(!w.spacingRoute?.length)continue;
  const next=walkStep(w,w.spacingRoute[0],dt*ageMovementRate(w),e.heightAt,e.obstacles());
  w.vx=(next.x-w.x)/dt;w.vz=(next.z-w.z)/dt;w.x=next.x;w.z=next.z;
  updateWalkFacing(w,dt,e.time,next.blocked);
  if(next.blocked)w.spacingRoute=null;else if(next.done)w.spacingRoute.shift();
 }
}
