import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {plotPreparation} from './ecs/farming-state.js';
import {releaseWork} from "./village-resources.js";
import {lifeClock} from "./ecs/life-state.js";
import {actorSleep} from "./ecs/daily-activity-actors.js";
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {survivalInterrupt} from './village-survival.js';
import {gainSkill,skillRate} from './village-skills.js';
import {canWalkAt} from './village-walking.js';
import {isBedtime} from './village-time.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const SCARECROW_RULES={cost:3,radius:5,thefts:3,window:240,max:8,hits:6};
export function scarecrowState(e){const s=e.birds;if(!s)return null;s.scarecrows??=[];s.cropLosses??=[];return s;}
export function protectedCrop(e,p){return !!e.birds?.scarecrows?.some(s=>s.progress>=SCARECROW_RULES.hits&&dist(s,p)<=SCARECROW_RULES.radius);}
export function recordCropTheft(e,p){const s=scarecrowState(e);s.cropLosses.push({x:p.x,z:p.z,at:e.time});s.cropLosses=s.cropLosses.filter(l=>e.time-l.at<SCARECROW_RULES.window).slice(-32);}
export function interruptScarecrow(e,w){
 const j=w.scarecrowJob;if(!j)return;const s=e.birds?.scarecrows?.find(s=>s.id===j.id);if(s?.builderId===w.id)s.builderId=null;delete w.scarecrowJob;w.scarecrowAfter=e.time+10;if(w.state.startsWith('scarecrow-'))releaseWork(e,w);
}
function siteFor(e,plot){
 for(const [dx,dz]of [[-1.8,0],[1.8,0],[0,-1.5],[0,1.5]]){const p={x:plot.x+dx,z:plot.z+dz};if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles())||e.nodes.some(n=>n.kind!=='food'&&dist(n,p)<1.2)||e.farming.plots.some(q=>Math.abs(p.x-q.x)<1.5&&Math.abs(p.z-q.z)<1.1))continue;if(e.route(e.depot,p))return p;}return null;
}
export function chooseScarecrow(e,w){
 const s=scarecrowState(e);if(!s||!e.farming||(actorVitality(w)?.dead)||(personAge(w)?.child)||(actorInterior(w)?.inside)||w.cargo||w.state!=='idle'||w.wait>0||actorNeeds(w).hunger>60||actorNeeds(w).energy<35||e.raids?.alarmUntil>e.time||(w.scarecrowAfter??0)>e.time||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))return false;
 let project=s.scarecrows.find(p=>p.progress<SCARECROW_RULES.hits&&p.builderId===null);
 if(!project){
  if(s.scarecrows.some(p=>p.progress<SCARECROW_RULES.hits)||s.scarecrows.length>=SCARECROW_RULES.max||e.stock.wood<SCARECROW_RULES.cost)return false;
  const plot=e.farming.plots.find(p=>plotPreparation(p).state==='ready'&&!protectedCrop(e,p)&&s.cropLosses.filter(l=>e.time-l.at<SCARECROW_RULES.window&&dist(l,p)<4).length>=SCARECROW_RULES.thefts);if(!plot)return false;
  const p=siteFor(e,plot);if(!p)return false;
  project={...p,id:'scarecrow-'+s.scarecrows.length,progress:0,delivered:false,builderId:null,mirror:e.random()<.5,at:e.time,culture:e.culture};
  // Paid once and retained in the construction site if work is interrupted.
  e.stock.wood-=SCARECROW_RULES.cost;s.scarecrows.push(project);
 }
 const target=project.delivered?{x:project.x+.85,z:project.z+.25}:e.depot,route=e.route(w,target);if(!route)return false;
 survivalInterrupt(e.survival,w);project.builderId=w.id;w.scarecrowJob={id:project.id};w.route=route;w.state=project.delivered?'scarecrow-bound':'scarecrow-fetch';w.decisionReason='Protecting the harvest from repeated bird theft';e.emit('scarecrow-planned',w);return true;
}
export function handleScarecrow(e,w,dt){
 const j=w.scarecrowJob;if(!j)return false;const s=e.birds?.scarecrows?.find(s=>s.id===j.id);
 if(!s||s.builderId!==w.id||(actorVitality(w)?.dead)||(actorInterior(w)?.inside)||actorNeeds(w).hunger>85||actorNeeds(w).energy<18||e.raids?.alarmUntil>e.time||isBedtime(lifeClock(e.life).hour,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour)){interruptScarecrow(e,w);return false;}
 if(w.state!=='scarecrow-building'){
  const moved=e.move(w,dt);if(moved==='blocked'){interruptScarecrow(e,w);return true;}if(moved!=='arrived')return true;
  if(w.state==='scarecrow-fetch'){w.route=e.route(w,{x:s.x+.85,z:s.z+.25});if(!w.route){interruptScarecrow(e,w);return true;}w.state='scarecrow-bound';return true;}
  s.delivered=true;w.state='scarecrow-building';w.facing=s.x<w.x?'left':'right';w.clock.reset('work');
 }
 for(const ev of w.clock.advance(dt*skillRate(w,'building'))){
  if(ev==='contact'){s.progress++;gainSkill(e,w,'building',1);e.emit('scarecrow-worked',w,null,{scarecrowId:s.id});}
  if(ev==='finish'){if(s.progress>=SCARECROW_RULES.hits){e.emit('scarecrow-completed',w,null,{scarecrowId:s.id});interruptScarecrow(e,w);return true;}w.clock.reset('work');}
 }return true;
}
export function validScarecrows(e){const s=e.birds;if(!s)return true;return (!s.scarecrows||Array.isArray(s.scarecrows)&&s.scarecrows.length<=8&&s.scarecrows.every(p=>typeof p.id==='string'&&[p.x,p.z,p.at].every(Number.isFinite)&&Number.isInteger(p.progress)&&p.progress>=0&&p.progress<=6&&typeof p.delivered==='boolean'&&typeof p.mirror==='boolean'))&&(!s.cropLosses||Array.isArray(s.cropLosses)&&s.cropLosses.length<=32&&s.cropLosses.every(p=>[p.x,p.z,p.at].every(Number.isFinite)))&&e.workers.every(w=>!w.scarecrowJob||s.scarecrows?.some(p=>p.id===w.scarecrowJob.id&&p.builderId===w.id));}
