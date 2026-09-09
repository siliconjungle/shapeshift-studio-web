import {structuralCondition} from './ecs/home-entities.js';
import {housingSites} from './ecs/housing-state.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {raiderAlarm} from './village-raids.js';
import {defineGameData} from './game-data.js';
export const WATCHTOWER_RULES=defineGameData('village-watchtowers.WATCHTOWER_RULES',{maxTowers:4,beds:0,width:5.2,depth:3.6,radius:2.5,height:8,health:160,sight:13,alarmRange:13,earliest:90});
export const WATCHTOWER_STAGES=defineGameData('village-watchtowers.WATCHTOWER_STAGES',[
 {id:'foundation',kind:'stone',amount:12,strikes:4},
 {id:'frame',kind:'wood',amount:8,strikes:5},
 {id:'walls',kind:'wood',amount:6,strikes:4},
 {id:'roof',kind:'wood',amount:4,strikes:4}
]);
export const towerName=culture=>culture==='cryos'?'Frost watchtower':culture==='solis'?'Sun watchtower':'Leaf watchtower';
export function activeWatchtowers(e){return (e.life?.homes??[]).filter(h=>h.kind==='watchtower'&&!(structuralCondition(h)?.destroyed)&&((structuralCondition(h)?.health)??0)>0);}
export function watchtowerSites(e){
 const sites=[];for(const radius of [10,13,7])for(let i=0;i<16;i++){const angle=i*Math.PI/8;sites.push({id:`watchtower-${radius}-${i}`,kind:'watchtower',x:e.depot.x+Math.cos(angle)*radius,z:e.depot.z+Math.sin(angle)*radius});}return [...sites,...(housingSites(e.housing)?.towerSites??[])].filter(s=>activeWatchtowers(e).every(h=>Math.hypot(s.x-h.buildingX,s.z-h.buildingZ)>WATCHTOWER_RULES.sight*1.25));
}
export function needsWatchtower(e){return e.time>=WATCHTOWER_RULES.earliest&&e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)).length>=3&&activeWatchtowers(e).length<Math.min(WATCHTOWER_RULES.maxTowers,Math.max(1,Math.floor(e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)).length/8)));}
export function updateWatchtowers(e){
 for(const h of activeWatchtowers(e)){
  const threat=(e.raids?.enemies??[]).find(r=>!(actorVitality(r)?.dead)&&!r.gone&&!r.divineHeld&&!['fleeing','departing'].includes(r.state)&&Math.hypot(r.x-h.buildingX,r.z-h.buildingZ)<=WATCHTOWER_RULES.alarmRange);
  if(!threat||(h.nextAlarmAt??0)>e.time)continue;
  h.nextAlarmAt=e.time+5;h.lastAlarmAt=e.time;raiderAlarm(e.raids,threat);e.emit('watchtower-alarm',null,null,{houseId:h.id,raiderId:threat.id,x:h.buildingX,z:h.buildingZ});
 }
}
