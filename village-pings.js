import {actorTradeTask,ensureActorTradeTask} from './ecs/actor-trade-task.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorRepairTask} from './ecs/actor-repair-task.js';
import {ensureActorRepairTask} from './ecs/actor-repair-task.js';
import {actorConstructionTask,ensureActorConstructionTask} from './ecs/actor-construction-task.js';
import {releaseWork} from "./village-resources.js";
import {lifeClock} from "./ecs/life-state.js";
import {actorSleep} from "./ecs/daily-activity-actors.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {actorOffering} from "./ecs/religion-actors.js";
import {actorOccasion} from "./ecs/actor-occasion.js";
import {watchAssigned} from './village-watch.js';
import {dangerRisk} from './village-danger.js';
import {actorMeal} from './ecs/actor-meal.js';
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {careParticipant} from './ecs/care-participants.js';
import {supportParticipant} from './ecs/support-participants.js';
import {survivalInterrupt} from './village-survival.js';
import {defineGameData} from './game-data.js';
import {WORLD_BOUNDS} from './village-layout.js';
import {isBedtime} from './village-time.js';
import {standingRoom} from './village-spacing.js';
export const PING_RULES=defineGameData('village-pings.PING_RULES',{lifetime:30,radius:4.5,arrival:1.6});
export const isPing=kind=>kind==='ping'||kind==='leave-here';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function pingState(e){return e.pings??={nextId:0,active:null};}
export function pingTarget(e,kind,p){
 const b=WORLD_BOUNDS;
 if(!p||![p.x,p.z].every(Number.isFinite)||p.x<b.left+1||p.x>b.right-1||p.z<b.back+1||p.z>b.front-1||!Number.isFinite(e.heightAt(p.x,p.z)))return {valid:false,reason:'Choose a spot on the land'};
 return {valid:true,point:{x:p.x,z:p.z},label:kind==='ping'?'Suggest exploring here briefly':'Suggest leaving this spot for now'};
}
export function placePing(e,kind,point){
 const s=pingState(e);
 // A fresh suggestion replaces the previous one, rather than building orders.
 s.active={id:s.nextId++,kind,x:point.x,z:point.z,at:e.time,until:e.time+PING_RULES.lifetime,status:'pending',workerId:null,responses:[],nearby:kind==='leave-here'?e.workers.filter(w=>!(actorVitality(w)?.dead)&&!w.exiled&&!(actorInterior(w)?.inside)&&distance(w,point)<PING_RULES.radius).map(w=>w.id):[]};
 return s.active;
}
export function activePing(e){const p=e.pings?.active;return p&&p.until>e.time&&p.status!=='complete'?p:null;}
// This is a temporary preference, never a collision wall or a permanent ban.
export function pingWorkPenalty(e,point){const p=activePing(e);return p?.kind==='leave-here'&&distance(p,point)<PING_RULES.radius?100:0;}
function free(w){return !(actorVitality(w)?.dead)&&!w.exiled&&!w.divineHeld&&!(actorInterior(w)?.inside)&&!w.expeditionId&&!w.rivalJourney&&careParticipant(w)?.partnerId==null&&supportParticipant(w)?.partnerId==null&&!(actorOccasion(w)?.id)&&!(actorTradeTask(w)?.cargo)&&!(actorConstructionTask(w)?.cargo)&&!(actorRepairTask(w)?.cargo)&&!w.firewood&&!w.firestone&&!(actorOffering(w)?.kind)&&!(actorMeal(w)?.mealCarry);}
function willing(e,w,p){
 if(!free(w)||watchAssigned(e.life?.watch,w)||w.role==='spiritual-leader'||(actorVitality(w)?.health)<55||actorNeeds(w)?.hunger>65||actorNeeds(w)?.energy<30||(actorNeeds(w)?.temperature??50)<22||(actorNeeds(w)?.temperature??50)>80||e.raids?.alarmUntil>e.time||isBedtime(lifeClock(e.life)?.hour??12,actorSleep(w)?.bedtime,actorSleep(w)?.wakeHour))return false;
 return p.kind==='leave-here'||!(personAge(w)?.child)&&!w.cargo&&e.stock.food>=2;
}
function endWalk(e,w){delete w.pingId;delete w.pingLookUntil;if(w.state==='ping-walking'||w.state==='ping-looking'){releaseWork(e,w);if(w.cargo)e.returnHome(w);}}
export function updatePings(e){
 const p=e.pings?.active;if(!p)return;
 if(p.until<=e.time)e.pings.active=null;
 else if(p.status==='visiting'&&p.workerId!==null){const w=e.workers.find(w=>w.id===p.workerId);if(!w||(actorVitality(w)?.dead)||w.pingId!==p.id||!['ping-walking','ping-looking'].includes(w.state)){p.workerId=null;p.status='pending';}}
 for(const w of e.workers)if(w.pingId!==undefined&&(!e.pings.active||w.pingId!==p.id))endWalk(e,w);
}
function destination(e,w,p){
 const candidates=[];
 if(p.kind==='ping'){
  candidates.push({x:p.x,z:p.z});for(const r of [1.2,2.4])for(let i=0;i<8;i++){const a=i*Math.PI/4;candidates.push({x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r});}
 }else{
  const angle=distance(w,p)>.1?Math.atan2(w.z-p.z,w.x-p.x):w.id*2.4;
  for(const offset of [0,.5,-.5,1,-1,1.6,-1.6,Math.PI]){const a=angle+offset,r=PING_RULES.radius+1.5;candidates.push({x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r});}
 }
 let searches=0;
 for(const point of candidates){
  if(!pingTarget(e,p.kind,point).valid||!standingRoom(e,w,point))continue;
  if(++searches>5)break;const route=e.route(w,point);if(!route||dangerRisk(e,w,point,route))continue;
  let length=0,from=w;for(const step of route){length+=distance(from,step);from=step;}
  if(length/2.6>p.until-e.time-2)continue;
  return {point,route};
 }
 return null;
}
export function handlePing(e,w,dt){
 const p=activePing(e);
 if(w.pingId!==undefined){
  if(!p||p.id!==w.pingId||!willing(e,w,p)||!['ping-walking','ping-looking'].includes(w.state)){endWalk(e,w);return false;}
  if(dangerRisk(e,w,w.route.at(-1)??w,w.route)){endWalk(e,w);return false;}
  if(w.state==='ping-looking'){
   if(e.time>=w.pingLookUntil){p.status='complete';p.workerId=null;p.until=Math.min(p.until,e.time+2);endWalk(e,w);}return true;
  }
  const status=e.move(w,dt);
  if(status==='blocked'){endWalk(e,w);return false;}
  if(status==='arrived'){
   if(p.kind==='ping'){w.state='ping-looking';w.pingLookUntil=e.time+PING_RULES.arrival;e.emit('ping-response',w,null,{kind:p.kind,arrived:true});}
   else endWalk(e,w);
  }
  return true;
 }
 if(!p||!willing(e,w,p)||p.responses.includes(w.id))return false;
 if(p.kind==='ping'){
  if(p.workerId!==null||w.state!=='idle'||w.wait>0)return false;
 }else if(!p.nearby.includes(w.id)||distance(w,p)>=PING_RULES.radius||!['idle','outbound','working','scouting','resting','returning'].includes(w.state))return false;
 // Each villager considers this particular suggestion once. Critical needs
 // defer consideration; personal temperament can still decline it.
 p.responses.push(w.id);
 const chance=(actorPersonality(w)?.trait)==='blunt'?.7:(actorPersonality(w)?.trait)==='thoughtful'||(actorPersonality(w)?.trait)==='playful'?.95:.88;
 if(e.random()>chance)return false;
 const next=destination(e,w,p);if(!next)return false;
 if(e.survival)survivalInterrupt(e.survival,w);else releaseWork(e,w);
 w.pingId=p.id;w.state='ping-walking';w.route=next.route;w.wait=0;
 w.decisionReason=p.kind==='ping'?'Taking a look at the suggested spot':'Giving the suggested spot some space';
 if(p.kind==='ping'){p.workerId=w.id;p.status='visiting';}
 e.emit('ping-response',w,null,{kind:p.kind,arrived:false});return true;
}
export function validPings(e,bounds=WORLD_BOUNDS){
 const s=e.pings;if(s==null)return true;
 if(!Number.isSafeInteger(s.nextId)||s.nextId<0)return false;
 const p=s.active;if(p==null)return true;
 const ids=a=>Array.isArray(a)&&a.length<=e.workers.length&&new Set(a).size===a.length&&a.every(id=>Number.isSafeInteger(id)&&id>=0);
 return Number.isSafeInteger(p.id)&&p.id>=0&&p.id<s.nextId&&isPing(p.kind)&&[p.x,p.z,p.at,p.until].every(Number.isFinite)&&p.x>=bounds.left&&p.x<=bounds.right&&p.z>=bounds.back&&p.z<=bounds.front&&p.at>=0&&p.until>=p.at&&p.until-p.at<=PING_RULES.lifetime+.001&&['pending','visiting','complete'].includes(p.status)&&(p.workerId===null||Number.isSafeInteger(p.workerId))&&ids(p.responses)&&ids(p.nearby);
}
