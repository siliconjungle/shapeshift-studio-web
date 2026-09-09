import {actorResidence,ensureActorResidence} from '../actor-residence.js';
import {actorInterior,ensureActorInterior} from '../actor-interior.js';
import {ensureActorDailyActivity,actorDailyActivity,ensureActorSocialActivity,actorSocialActivity} from "../daily-activity-actors.js";
export const DOORWAY_DURATION=.6;
const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
function facing(dx,dz,fallback){return Math.hypot(dx,dz)<.001?fallback:Math.abs(dx)>Math.abs(dz)?(dx<0?'left':'right'):(dz<0?'back':'front')}
export function beginHouseExit(worker,time){
 ensureActorInterior(worker).inside=false;ensureActorInterior(worker).exitAt=time;ensureActorInterior(worker).exitFrom=(actorInterior(worker)?.insideAt)??(actorResidence(worker)?.home);
 const door=((actorInterior(worker)?.inside)?(actorInterior(worker)?.insideAt):(actorInterior(worker)?.exitFrom))?.door??(actorResidence(worker)?.home)?.door;
 worker.facing=door?facing(worker.x-door.x,worker.z-door.z,'front'):'front';
 worker.wait=Math.max(worker.wait??0,DOORWAY_DURATION+.05);
 ensureActorDailyActivity(worker).careAt=Math.max(actorDailyActivity(worker)?.careAt??0,time+DOORWAY_DURATION+.05);
 ensureActorSocialActivity(worker).socialAfter=Math.max(actorSocialActivity(worker)?.socialAfter??0,time+DOORWAY_DURATION+.05);
}
// The doorway leg is a visual approach/exit at a real, already reached home.
// It uses its own travel direction even while the simulation pauses to unload.
export function doorwayPose(worker,time){
 const door=((actorInterior(worker)?.inside)?(actorInterior(worker)?.insideAt):(actorInterior(worker)?.exitFrom))?.door??(actorResidence(worker)?.home)?.door;if(!door)return null;
 if((actorInterior(worker)?.inside)){const t=clamp((time-(actorInterior(worker)?.enteredAt))/DOORWAY_DURATION);return {amount:smooth(t),opacity:1-smooth((t-.12)/.88),walking:t<1,facing:facing(door.x-worker.x,door.z-worker.z,'back')}}
 if((actorInterior(worker)?.exitAt)!==undefined&&time-(actorInterior(worker)?.exitAt)<DOORWAY_DURATION){const t=clamp((time-(actorInterior(worker)?.exitAt))/DOORWAY_DURATION);return {amount:1-smooth(t),opacity:smooth(t/.8),walking:true,facing:facing(worker.x-door.x,worker.z-door.z,'front')}}
 return null;
}

