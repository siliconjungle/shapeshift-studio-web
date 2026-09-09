import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {actorJealousy,actorFavorSeen,actorMiracleThoughts,ensureActorJealousy,ensureActorFavorSeen,ensureActorMiracleThoughts} from '../jealousy-actors.js';
import {actorPersonality} from "../../ecs/personality-actors.js";
import {faithPerson,faithChange} from "../../village-faith.js";
import {actorFaith} from "../../ecs/religion-actors.js";
import {personKinship} from '../../ecs/person-kinship.js';
import {actorVitality} from '../../ecs/actor-vitality.js';
import {lifeRelation} from '../../village-life.js';
import {personAge} from '../../ecs/person-age.js';
import {actorRomance} from '../../ecs/actor-romance.js';
import {defineGameData} from '../../game-data.js';
// Personal, witnessed favour: persisted with faith, never inferred from UI.
export const JEALOUSY_RULES=defineGameData('village-jealousy.JEALOUSY_RULES',{window:240,radius:12,minimumGap:2.5,gain:.16,decay:.001,warning:.3,accusation:.7});
const clamp=n=>Math.max(0,Math.min(1,n));
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const feelings=w=>actorJealousy(w)?.entries??[];
export function jealousyOf(w,targetId){return feelings(w).find(g=>g.targetId===targetId)?.value??0;}
export function strongestJealousy(w,e){return feelings(w).filter(g=>alive(e.workers.find(p=>p.id===g.targetId))).reduce((best,g)=>!best||g.value>best.value?g:best,null);}
function thought(w,text,time){ensureActorMiracleThoughts(w).entries=[{text,at:time},...(actorMiracleThoughts(w)?.entries??[]).filter(m=>m.text!==text)].slice(0,3);}
export function noticeFavor(world,faith,c,check){
 const e=world.resource('Village');let recipients=[];
 if(['life','energy','shield'].includes(c.kind)&&c.targetKind==='villager')recipients=e.workers.filter(w=>w.id===c.actorId);
 else if(c.kind==='resurrect')recipients=[check.spawned];
 else if(['love','friendship'].includes(c.kind))recipients=(c.pair??[]).map(id=>e.workers.find(w=>w.id===id));
 recipients=recipients.filter(alive);if(!recipients.length)return;
 // Emergency rescues still count as attention, but less than everyday favour.
 const weight=c.kind==='resurrect'||c.kind==='life'&&c.health<35?.3:1;
 const recipientIds=new Set(recipients.map(w=>w.id));
 for(const w of e.workers){
  if(!alive(w)||!recipientIds.has(w.id)&&((actorInterior(w)?.inside)||!recipients.some(p=>!(actorInterior(p)?.inside)&&distance(w,p)<JEALOUSY_RULES.radius)))continue;
  faithPerson(faith,w);const favour=ensureActorFavorSeen(w),jealousy=ensureActorJealousy(w);favour.entries=(favour.entries??[]).filter(v=>e.time-v.at<JEALOUSY_RULES.window);
  for(const p of recipients)favour.entries.push({targetId:p.id,at:e.time,weight});favour.entries=favour.entries.slice(-64);jealousy.entries??=[];
  if(recipientIds.has(w.id)){
   const was=jealousy.entries.some(g=>g.value>=JEALOUSY_RULES.warning);
   for(const g of jealousy.entries)g.value=Math.max(0,g.value-.28);
   if(was){thought(w,'Perhaps I have not been forgotten after all.',e.time);e.emit('miracle-reassured',w)}
   continue;
  }
  const own=favour.entries.filter(v=>v.targetId===w.id).reduce((n,v)=>n+v.weight,0);
  for(const p of recipients){
   const gap=favour.entries.filter(v=>v.targetId===p.id).reduce((n,v)=>n+v.weight,0)-own;
   if(gap<JEALOUSY_RULES.minimumGap)continue;
   let g=jealousy.entries.find(v=>v.targetId===p.id);if(!g){g={targetId:p.id,value:0,at:e.time,cueAt:0};jealousy.entries.push(g)}
   const affinity=lifeRelation(e.life,w.id,p.id)?.affinity??0,close=(actorRomance(w)?.sweetheartId)===p.id||(personKinship(w)?.parents)?.includes(p.id)||(personKinship(p)?.parents)?.includes(w.id);
   const temperament=(actorPersonality(w)?.trait)==='blunt'?1.2:(actorPersonality(w)?.trait)==='gentle'?.75:1;
   const increase=JEALOUSY_RULES.gain*weight*temperament*(close?.45:affinity>.55?.7:1);
   g.value=clamp(g.value+increase);g.at=e.time;
   faithChange(faith,w,-increase*.45,'overlooked-for-miracles');
   const r=lifeRelation(e.life,w.id,p.id);if(r)r.affinity=Math.max(-1,r.affinity-increase*.22);
   if(e.leadership?.isLeader(p))e.leadership.changeResentment(w,increase*.35);
   if(g.value>=JEALOUSY_RULES.warning&&e.time>=g.cueAt){
    const severe=g.value>=JEALOUSY_RULES.accusation;thought(w,severe?`${p.name} receives all the miracles. I want them brought down.`:`Why does ${p.name} receive miracles while I am overlooked?`,e.time);
    e.emit('miracle-jealous',w,null,{targetId:p.id,severe});g.cueAt=e.time+16;
   }
  }
 }
}
export function settleJealousy(world,dt){
 const e=world.resource('Village');
 for(const w of e.workers){if(!alive(w)||!(actorFaith(w)?.belief))continue;
  const grievances=feelings(w);for(let i=grievances.length-1;i>=0;i--){const g=grievances[i];g.value=Math.max(0,g.value-dt*JEALOUSY_RULES.decay);if(!g.value||!alive(e.workers.find(p=>p.id===g.targetId)))grievances.splice(i,1)}
 }
}
export function jealousAccusation(world,leader,eligible){
 const e=world.resource('Village');
 const backers=e.workers.filter(w=>alive(w)&&!(personAge(w)?.child)&&(w===leader||e.leadership.standing(w)>.05));
 return eligible.map(target=>{const accusers=backers.filter(w=>w!==target&&jealousyOf(w,target.id)>=JEALOUSY_RULES.accusation);return {target,accusers,pressure:accusers.reduce((n,w)=>n+jealousyOf(w,target.id),0)}})
  .filter(c=>c.accusers.includes(leader)||c.accusers.length>=2).sort((a,b)=>b.pressure-a.pressure||a.target.id-b.target.id)[0]??null;
}
export function recordJealousAccusation(world,r,accusation){
 const e=world.resource('Village');
 r.motive='jealousy';r.accuserIds=accusation.accusers.map(w=>w.id);
 const victim=accusation.target;thought(victim,'They resent the miracles I received. Now they want me sacrificed.',e.time);
 for(const w of accusation.accusers)thought(w,`Our leader will make ${victim.name} answer for being the favored one.`,e.time);
 e.emit('miracle-accused',victim,null,{leaderId:r.leaderId,accuserIds:r.accuserIds,ritualId:r.id});
}
