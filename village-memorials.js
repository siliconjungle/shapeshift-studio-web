import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {lifeClock} from "./ecs/life-state.js";
import {familyConfiguration} from "./ecs/family-entities.js";
import {personKinship} from './ecs/person-kinship.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalRecords} from './ecs/survival-records.js';
import {actorMemories} from './ecs/actor-memories.js';
import {defineGameData} from './game-data.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';
import {villagerDetails} from './villager-profile.js';
import {memoryDescription} from './village-memory.js';

export const MEMORIAL_RULES=defineGameData('village-memorials.MEMORIAL_RULES',{height:.9,linger:DAY_LENGTH_SECONDS,fade:DAY_LENGTH_SECONDS*2,spacing:.7});
export function memorialOpacity(memorial,time){
 const t=Math.max(0,Math.min(1,(time-memorial.diedAt-MEMORIAL_RULES.linger)/MEMORIAL_RULES.fade));
 return 1-t*t*(3-2*t);
}
function gravePosition(worker,economy,memorials,cause){
 const origin=(actorInterior(worker)?.inside)?((actorInterior(worker)?.insideAt)??(actorResidence(worker)?.home)??worker):worker,obstacles=economy.obstacles();
 const pyre=cause==='sacrifice'?(worker.ritualDeathPost??worker.ritualPost??economy.campfire):null;
 for(const radius of (pyre?[3.5,4.5,5.5,7,9,12]:[0,.75,1.5,2.25,3]))for(let i=0;i<(radius?12:1);i++){
  const angle=(i+worker.id*.27)*Math.PI/6,p={x:origin.x+Math.cos(angle)*radius,z:origin.z+Math.sin(angle)*radius};
  if(pyre&&Math.hypot(p.x-pyre.x,p.z-pyre.z)<3.5)continue;
  if(pyre&&economy.campfire&&Math.hypot(p.x-economy.campfire.x,p.z-economy.campfire.z)<3)continue;
  const y=economy.heightAt(p.x,p.z);if(!Number.isFinite(y))continue;
  if([[.2,0],[-.2,0],[0,.2],[0,-.2]].some(([dx,dz])=>{const h=economy.heightAt(p.x+dx,p.z+dz);return !Number.isFinite(h)||Math.abs(y-h)>.2}))continue;
  if(obstacles.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<o.radius+.2))continue;
  if(memorials.some(m=>memorialOpacity(m,economy.time)>0&&Math.hypot(p.x-m.x,p.z-m.z)<MEMORIAL_RULES.spacing))continue;
  return p;
 }
 // A villager's supported last position remains a valid fallback in a full camp.
 return {x:worker.x,z:worker.z};
}

export function rememberVillager(worker,economy,{diedAt=economy.time,cause=(actorVitality(worker)?.deathCause)??'health'}={}){
 const memorials=economy.survival.memorials,existing=memorials.find(m=>m.workerId===worker.id);if(existing)return existing;
 const details=villagerDetails(worker,{...economy,time:diedAt});
 const memories=(actorMemories(worker)??[]).map(m=>({...m,otherName:economy.workers.find(w=>w.id===m.otherId)?.name??'a villager'}));
 const remembered=memories.find(m=>['shared-meal','shared-warmth','time-together','cared','fed','comforted','defended'].includes(m.kind))??memories[0];
 const moment=remembered?memoryDescription(remembered,remembered.otherName):(personKinship(worker)?.parents)?.length?'A child of this village.':familyConfiguration(economy.family)?.parents.includes(worker.id)?'One of the village’s first settlers.':'A life in the village, remembered.';
 const day=lifeClock(economy.life)?.day??1,when=diedAt===economy.time?`Day ${day}`:'Remembered from an earlier day';
 const reason={heat:'Lost to the heat',cold:'Lost to the cold',starvation:'Lost to hunger',exhaustion:'Lost to exhaustion',attack:'Lost in an attack',health:'Passed away',sacrifice:'Lost in a fire ritual',revolt:'Lost in the uprising','leader-rivalry':'Lost in the struggle between spiritual leaders',lightning:'Struck by lightning'}[cause]??'Passed away';
 Object.assign(details,{subtitle:details.subtitle,mood:'Remembered',activity:`${when} · ${reason}`,stats:[],memories:memories.map(m=>memoryDescription(m,m.otherName)),moment});
 const memorial={id:'grave-'+worker.id,workerId:worker.id,name:worker.name,...gravePosition(worker,economy,memorials,cause),diedAt,day,cause,memories,details};
 survivalRecords(economy.survival).memorials.add(memorial);return memorial;
}

export function restoreMemorials(economy){
 if(!economy.survival)return;
 economy.survival.memorials??=[];
 // Older villages already retain their dead. Recover their names and histories
 // without making an old grave new again or emitting another death event.
 for(const worker of economy.workers)if((actorVitality(worker)?.dead)){
  const m=rememberVillager(worker,economy,{diedAt:Number.isFinite((actorVitality(worker)?.diedAt))?(actorVitality(worker)?.diedAt):economy.time});
  if(m.cause==='sacrifice'&&economy.campfire&&Math.hypot(m.x-economy.campfire.x,m.z-economy.campfire.z)<3)Object.assign(m,gravePosition(worker,economy,economy.survival.memorials.filter(p=>p!==m),'sacrifice'));
 }
}
