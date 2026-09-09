import {homeAvailability} from './../home-entities.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorResidence,ensureActorResidence} from './../actor-residence.js';
import {structuralCondition} from './../home-entities.js';
import {actorRecovery,ensureActorRecovery} from "../development-actors.js";
import {createCommunityRecovery} from "../development-state.js";
import {personAge} from "../person-age.js";
import {actorVitality} from "../actor-vitality.js";
import {actorNeeds} from "../actor-needs.js";
import {ensureSupportParticipant} from "../support-participants.js";
import {memoryRemember,memoryMutual} from "../../village-memory.js";
import {lifeRelation} from "../../village-life.js";
import {DAY_LENGTH_SECONDS} from "../../village-time.js";
import {homeBeds} from "../../village-childcare.js";
import {recoveryThreats} from "../../village-recovery-state.js";
const clamp=n=>Math.max(-1,Math.min(1,n));
const safe=(world,h)=>{const e=world.resource('Village');return h&&!(structuralCondition(h)?.destroyed)&&(structuralCondition(h)?.health)>(structuralCondition(h)?.maxHealth)*.4&&!((structuralCondition(h)?.raidThreatUntil)>e.time)&&!e.shelter?.fires.some(f=>f.id===h.id&&f.until>e.time);};
export const recoveringVillager=(world,w)=>{const e=world.resource('Village');return !!(actorRecovery(w)?.disaster)&&(actorRecovery(w)?.disaster).until>e.time&&!(actorVitality(w)?.dead);};
export function noteHomeDisaster(world,h,cause){
 const e=world.resource('Village');
 if(!e.life||!['fire','wish','lightning','raid','revolt'].includes(cause))return;
 const s=e.communityRecovery??createCommunityRecovery(e);let incident=s.incidents.find(i=>i.homeId===h.id&&e.time-i.lastAt<60);
 if(!incident){incident={id:s.nextId++,homeId:h.id,cause,at:e.time,lastAt:e.time,gathered:false};s.incidents=[incident,...s.incidents].slice(0,16);}incident.lastAt=e.time;
 for(const w of e.workers){if((actorVitality(w)?.dead)||(actorResidence(w)?.home)!==h&&(actorRecovery(w)?.disaster)?.homeId!==h.id)continue;
  if((actorRecovery(w)?.disaster)?.episodeId!==incident.id){(ensureActorRecovery(w).disaster)={episodeId:incident.id,homeId:h.id,at:e.time,until:e.time+DAY_LENGTH_SECONDS*2,cause};actorNeeds(w).social=Math.max(0,actorNeeds(w).social-6);ensureSupportParticipant(w).receiveAfter=0;}
 }
}
export function restoreGuestHomes(world,living,free,evacuate){
 const e=world.resource('Village');
 for(const w of living){const g=(actorRecovery(w)?.guest);if(!g)continue;const original=e.life.homes.find(h=>h.id===g.originHomeId);
  if(safe(world,original)&&(free.get(original)??0)>0&&e.route(w,original)){if((actorInterior(w)?.inside))evacuate(e,w);ensureActorResidence(w).home=original;delete actorRecovery(w)?.guest;}
 }
}
export function shareEmergencyShelter(world,displaced,free,evacuate){
 const e=world.resource('Village');
 const living=e.workers.filter(w=>!(actorVitality(w)?.dead)),counts=new Map();
 for(const w of living)if((actorResidence(w)?.hasBed)&&(actorRecovery(w)?.guest))delete actorRecovery(w)?.guest; // A real spare bed is now available.
 for(const w of displaced){
  if((actorResidence(w)?.hasBed)||!recoveringVillager(world,w)||w.expeditionId||w.exiled)continue;
  const homes=e.life.homes.filter(h=>h.kind!=='chapel'&&h.kind!=='camp'&&!(homeAvailability(h)?.expeditionId)&&safe(world,h)&&homeBeds(h)>0&&(counts.get(h)??0)<Math.min(2,Math.ceil(homeBeds(h)/2))).sort((a,b)=>Number(b.id===(actorRecovery(w)?.guest)?.homeId)-Number(a.id===(actorRecovery(w)?.guest)?.homeId)||Math.hypot(w.x-a.x,w.z-a.z)-Math.hypot(w.x-b.x,w.z-b.z));
  for(const h of homes){const host=living.filter(p=>p!==w&&(actorResidence(p)?.home)===h&&!(actorRecovery(p)?.guest)&&!(personAge(p)?.child)&&(actorResidence(p)?.hasBed)).sort((a,b)=>(lifeRelation(e.life,w.id,b.id)?.affinity??0)-(lifeRelation(e.life,w.id,a.id)?.affinity??0))[0];if(!host||(lifeRelation(e.life,w.id,host.id)?.affinity??0)<-.65||!e.route(w,h))continue;
   const old=(actorRecovery(w)?.guest);if((actorInterior(w)?.inside)&&(actorResidence(w)?.home)!==h)evacuate(e,w);ensureActorResidence(w).home=h;ensureActorResidence(w).hasBed=true;counts.set(h,(counts.get(h)??0)+1);
   (ensureActorRecovery(w).guest)=old?.homeId===h.id?old:{homeId:h.id,originHomeId:(actorRecovery(w)?.disaster).homeId,hostId:host.id,at:e.time,until:(actorRecovery(w)?.disaster).until,slept:false,strained:false};
   if(!old||old.homeId!==h.id)e.emit('recovery-shelter',w,null,{partnerId:host.id,homeId:h.id});break;
  }
 }
 for(const w of living)if((actorRecovery(w)?.guest)&&(!(actorResidence(w)?.hasBed)||(actorRecovery(w)?.guest).homeId!==(actorResidence(w)?.home)?.id))delete actorRecovery(w)?.guest;
}
export function disasterRepairPriority(world,h){
 const e=world.resource('Village');return e.workers.filter(w=>recoveringVillager(world,w)&&(actorRecovery(w)?.disaster).homeId===h.id).reduce((n,w)=>n+((actorResidence(w)?.homeless)||(actorRecovery(w)?.guest)?3:1),0);}
export function recoveryBond(world,recipient,helper,kind,amount=.06){
 const e=world.resource('Village');
 if(!recoveringVillager(world,recipient)||!helper||helper===recipient||(actorVitality(helper)?.dead))return;
 const key=(actorRecovery(recipient)?.disaster).episodeId+':'+helper.id+':'+kind;if((actorRecovery(recipient)?.thanks)?.includes(key))return;
 (ensureActorRecovery(recipient).thanks)=[key,...((actorRecovery(recipient)?.thanks)??[])].slice(0,24);memoryRemember(e.life.memory,recipient,helper,kind);const r=lifeRelation(e.life,recipient.id,helper.id);if(r)r.affinity=clamp(r.affinity+amount);
}
export function noticeCommunityRecovery(world,v){
 const e=world.resource('Village');
 if(!e.life)return;const w=e.workers.find(w=>w.id===v.workerId);
 if(v.type==='sleep'&&(actorRecovery(w)?.guest)){const g=(actorRecovery(w)?.guest),host=e.workers.find(p=>p.id===g.hostId);if(!g.slept){g.slept=true;recoveryBond(world,w,host,'sheltered-me',.09);memoryRemember(e.life.memory,host,w,'shared-home');}}
 if(v.type==='building-repaired'&&w)for(const resident of e.workers)if((actorRecovery(resident)?.disaster)?.homeId===v.houseId)recoveryBond(world,resident,w,'helped-rebuild',.08);
 if(v.type==='friend-fed'&&w)recoveryBond(world,e.workers.find(p=>p.id===v.partnerId),w,'recovery-food',.08);
}
export function updateCommunityRecovery(world){
 const e=world.resource('Village');
 const s=e.communityRecovery;if(!s||s.nextCheck>e.time)return;s.nextCheck=e.time+2;
 const danger=recoveryThreats(e).length>0||e.raids?.alarmUntil>e.time;
 for(const i of s.incidents){if(i.gathered||e.time-i.lastAt<8||danger||e.shelter?.fires.some(f=>f.id===i.homeId&&f.until>e.time))continue;i.gathered=true;e.emit('community-recovery',null,null,{episodeId:'home-'+i.id,houseId:i.homeId,cause:i.cause});}
 for(const w of e.workers){const g=(actorRecovery(w)?.guest);if(!g||(actorVitality(w)?.dead)||g.strained||!g.slept||e.time-g.at<60||danger)continue;const host=e.workers.find(p=>p.id===g.hostId);
  if(!host||(actorVitality(host)?.dead)||(actorResidence(host)?.home)!==(actorResidence(w)?.home))continue;
  // Crowding can strain a household when somebody is genuinely hungry or
  // exhausted. It is one remembered disagreement, not a constant penalty.
  if(e.stock.food<2&&(actorNeeds(w).hunger>60||actorNeeds(host).hunger>60)||actorNeeds(w).energy<25&&actorNeeds(host).energy<25){g.strained=true;memoryMutual(e.life.memory,w,host,'crowded-home',-.055);actorNeeds(w).social=Math.max(0,actorNeeds(w).social-5);actorNeeds(host).social=Math.max(0,actorNeeds(host).social-5);if(!(actorInterior(w)?.inside))e.emit('recovery-friction',w,null,{partnerId:host.id});}
 }
}
export function validCommunityRecovery(world){
 const e=world.resource('Village');
 const s=e.communityRecovery;if(s&&(!Number.isSafeInteger(s.nextId)||s.nextId<0||!Number.isFinite(s.nextCheck)||!Array.isArray(s.incidents)||s.incidents.length>16||s.incidents.some(i=>!Number.isSafeInteger(i.id)||![i.at,i.lastAt].every(n=>Number.isFinite(n)&&n>=0)||typeof i.gathered!=='boolean')))return false;
 return e.workers.every(w=>(!(actorRecovery(w)?.disaster)||Number.isSafeInteger((actorRecovery(w)?.disaster).episodeId)&&[(actorRecovery(w)?.disaster).at,(actorRecovery(w)?.disaster).until].every(n=>Number.isFinite(n)&&n>=0))&&(!(actorRecovery(w)?.guest)||Number.isSafeInteger((actorRecovery(w)?.guest).hostId)&&[(actorRecovery(w)?.guest).at,(actorRecovery(w)?.guest).until].every(n=>Number.isFinite(n)&&n>=0)&&typeof (actorRecovery(w)?.guest).slept==='boolean'&&typeof (actorRecovery(w)?.guest).strained==='boolean')&&(!(actorRecovery(w)?.thanks)||Array.isArray((actorRecovery(w)?.thanks))&&(actorRecovery(w)?.thanks).length<=24&&(actorRecovery(w)?.thanks).every(s=>typeof s==='string')));
}
