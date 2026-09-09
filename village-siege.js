import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {raiderSpawn,raiderAlarm,raiderMove,raiderCue} from './village-raids.js';
import {defineGameData} from './game-data.js';
import {damageHouse,homePosition,shelterState} from './village-shelter.js';
export const SIEGE_RULES=defineGameData('village-siege.SIEGE_RULES',{maxRaiders:6,sight:7,reach:.3,windup:.85,cooldown:2.4,damage:8});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const activeRaider=r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&!['fleeing','departing'].includes(r.state);
export function raidComposition(night,population){
 const count=night<3?(night>1&&population>=4?2:1):Math.min(SIEGE_RULES.maxRaiders,2+Math.floor((night-3)/2));
 return {count,siege:night>=3};
}
export function spawnRaid(raids){
 const e=raids.economy,plan=raidComposition(raids.nights,e.workers.filter(w=>!(actorVitality(w)?.dead)).length),entrance=raids.entrances[raids.nextId%raids.entrances.length];
 const available=SIEGE_RULES.maxRaiders-raids.enemies.filter(r=>!r.gone).length;if(available<=0)return [];
 const squad={id:raids.nextSquadId??0,homeId:null,bornAt:e.time,contested:false};raids.nextSquadId=squad.id+1;(raids.squads??=[]).push(squad);
 const members=[];for(let i=0;i<Math.min(plan.count,available);i++){
  const offsets=[{x:0,z:0},{x:0,z:1.1},{x:1.1,z:0},{x:1.1,z:1.1},{x:0,z:2.2},{x:1.1,z:2.2}],o=offsets[i],point={x:entrance.x+o.x,z:entrance.z+o.z};
  const safe=e.heightAt(point.x,point.z)!==null&&e.route(entrance,point)?point:entrance;
  const r=raiderSpawn(raids,safe);r.entrance={...entrance};r.squadId=squad.id;r.squadSlot=i;if(plan.siege)r.intent='siege';members.push(r);
 }
 return members;
}
function attackSpot(raids,r,home){
 const e=raids.economy,centre=homePosition(home),radius=(home.kind==='chapel'?3.1:2.15)+.7,slot=r.squadSlot??r.id;
 // Different attackers claim different reachable positions around the wall.
 const occupied=raids.enemies.filter(o=>o!==r&&activeRaider(o)&&o.buildingId===home.id&&o.siegeSpot).map(o=>o.siegeSpot);
 for(let i=0;i<12;i++){const a=((slot+i)%12)*Math.PI/6,p={x:centre.x+Math.sin(a)*radius,z:centre.z+Math.cos(a)*radius};if(occupied.some(o=>dist(o,p)<1.1))continue;const route=e.route(r,p);if(route)return {point:p,route};}
 return null;
}
export function siegeTarget(raids,r){
 const e=raids.economy;shelterState(e);const squad=raids.squads?.find(s=>s.id===r.squadId),homes=e.life.homes.filter(h=>!(structuralCondition(h)?.destroyed)&&(structuralCondition(h)?.health)>0),id=squad?.homeId??r.buildingId;
 const pinned=homes.find(h=>h.id===id);if(pinned)return pinned;
 for(const h of homes.sort((a,b)=>dist(homePosition(a),r)-dist(homePosition(b),r))){
  if((r.siegeRetry?.[h.id]??0)>e.time)continue;
  const spot=attackSpot(raids,r,h);if(!spot)continue;
  if(squad)squad.homeId=h.id;r.buildingId=h.id;r.siegeSpot=spot.point;r.route=spot.route;r.repathAt=e.time+1.3;return h;
 }
 return null;
}
export function siegeStep(raids,r,dt){
 const e=raids.economy,home=siegeTarget(raids,r);if(!home)return false;
 if(r.buildingId!==home.id){r.buildingId=home.id;r.siegeSpot=null;r.windup=0;}
 const squad=raids.squads?.find(s=>s.id===r.squadId),outside=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld);
 const witnesses=outside.filter(w=>dist(w,r)<SIEGE_RULES.sight);if(witnesses.length)raiderAlarm(raids,r);
 if(squad)squad.contested=outside.some(w=>!(personAge(w)?.child)&&(actorVitality(w)?.health)>=28&&dist(w,homePosition(home))<7);
 if(!r.siegeSpot){const found=attackSpot(raids,r,home);if(!found){r.siegeRetry??={};r.siegeRetry[home.id]=e.time+8;r.buildingId=null;if(squad)squad.homeId=null;return false;}r.siegeSpot=found.point;r.route=found.route;r.repathAt=e.time+1.3;}
 if(dist(r,r.siegeSpot)>SIEGE_RULES.reach){
  r.state='siege-bound';r.windup=0;
  // Regroup briefly if one member gets behind; never wait indefinitely on a blocked path.
  const members=raids.enemies.filter(o=>o.squadId===r.squadId&&activeRaider(o)&&o!==r),lagging=squad&&members.some(o=>dist(o,r)>6&&dist(o,homePosition(home))>dist(r,homePosition(home))+3);
  if(lagging){r.regroupAt??=e.time;if(e.time-r.regroupAt<3)return true}else r.regroupAt=null;
  if(raiderMove(raids,r,r.siegeSpot,dt)==='blocked'){r.siegeSpot=null;r.repathAt=0;}return true;
 }
 r.state='building-attack';r.route=[];r.facing=homePosition(home).x<r.x?'left':'right';
 if(e.time<r.attackAt)return true;r.windup=(r.windup??0)+dt;
 if(r.windup>=SIEGE_RULES.windup){
  const amount=Math.min((structuralCondition(home)?.health),SIEGE_RULES.damage);structuralCondition(home).raidThreatUntil=e.time+6;
  damageHouse(e,home,amount,'raid');r.hitAt=e.time;r.windup=0;r.attackAt=e.time+SIEGE_RULES.cooldown;
  const c=homePosition(home),dx=r.x-c.x,dz=r.z-c.z,length=Math.hypot(dx,dz)||1;
  raiderCue(raids,r,'raider-building-hit',{houseId:home.id,amount,x:c.x+dx/length*(home.kind==='chapel'?2.5:1.8),z:c.z+dz/length*(home.kind==='chapel'?2.5:1.8)});
 }
 return true;
}
