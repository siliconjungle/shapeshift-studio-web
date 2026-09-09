import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {releaseWork} from "./village-resources.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {actorFaith} from "./ecs/religion-actors.js";
import {personKinship} from './ecs/person-kinship.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {survivalInterrupt,survivalDrop,survivalDamage} from './village-survival.js';
import {lifeRelation} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {actorRomance} from './ecs/actor-romance.js';
import {defineGameData} from './game-data.js';
import {beginHouseExit,DOORWAY_DURATION} from './doorway-transition.js';

export const RIVALRY_RULES=defineGameData('village-leader-rivalry.RIVALRY_RULES',Object.freeze({sideSeconds:4,damage:12,reach:1.6,criticalChance:.12,criticalMultiplier:1.5}));
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const fighting=w=>w.state==='revolt-bound'||w.state==='revolt-fighting';
const remember=(w,text,at)=>{w.leadershipThoughts=[{text,at},...(w.leadershipThoughts??[])].slice(0,5)};
export function rivalrySide(l,w){return l.rivalry?.sides.find(s=>s.workerId===w?.id)?.leaderId??null}
function loyalty(l,w,leader){
 const e=l.economy,kin=(personKinship(w)?.parents)?.includes(leader.id)||(personKinship(leader)?.parents)?.includes(w.id);
 const devoted=(actorRomance(w)?.sweetheartId)===leader.id||w.leaderBelovedId===leader.id;
 const affinity=lifeRelation(e.life,w.id,leader.id)?.affinity??0;
 return affinity*2+(kin?.65:0)+(devoted?1:0)+.3*(1-Math.abs(((actorFaith(w)?.belief)?.value??.5)-((actorFaith(leader)?.belief)?.value??.5)))+((actorPersonality(w)?.trait)===(actorPersonality(leader)?.trait)?.15:0)+(rivalrySide(l,w)===leader.id?.2:0);
}
function enlist(l,w){
 const e=l.economy;
 if(!alive(w)||(personAge(w)?.child)||w.divineHeld||l.rituals.committed(w))return;
 const inside=(actorInterior(w)?.inside),home=(actorInterior(w)?.insideAt)??(actorResidence(w)?.home);survivalInterrupt(e.survival,w);
 if(w.cargo){survivalDrop(e.survival,w,w.cargo.kind,w.cargo.amount);w.cargo=null}
 if(inside){if(home){w.x=home.x;w.z=home.z}ensureActorInterior(w).inside=false;beginHouseExit(w,e.time);e.emit('alarm-wake',w)}
 const watch=e.life.watch;if(watch){if(watch.guard===w.id)watch.guard=null;if(watch.relief===w.id)watch.relief=null}
 w.state='revolt-bound';w.revoltRepathAt=0;
}
function chooseSides(l){
 const e=l.economy,r=l.rivalry,leaders=l.leaders;
 r.leaderIds=leaders.map(w=>w.id);r.sides=r.sides.filter(s=>e.workers.some(w=>w.id===s.workerId&&alive(w)));
 for(const w of e.workers.filter(alive)){
  const leader=l.isLeader(w)?w:[...leaders].sort((a,b)=>loyalty(l,w,b)-loyalty(l,w,a)||a.id-b.id)[0];
  if(!leader)continue;let side=r.sides.find(s=>s.workerId===w.id);const changed=side?.leaderId!==leader.id;
  if(!side){side={workerId:w.id,leaderId:leader.id};r.sides.push(side)}else side.leaderId=leader.id;
  w.rivalryLeaderId=leader.id;
  if(changed){
   remember(w,w===leader?'I will not surrender my calling to another leader.':`I stand with ${leader.name} in the struggle to lead our village.`,e.time);
   e.emit((personAge(w)?.child)?'leader-rivalry-frightened':'leader-side-chosen',w,null,{leaderId:leader.id});
   if(!(personAge(w)?.child))enlist(l,w);
  }
 }
 r.nextSidesAt=e.time+RIVALRY_RULES.sideSeconds;
}
export function startLeaderRivalry(l){
 const leaders=l.leaders;if(leaders.length<2)return false;
 const e=l.economy;
 if(!l.rivalry){
  l.endRevolt();
  l.rivalry={startedAt:e.time,leaderIds:[],sides:[],nextSidesAt:e.time,fallenIds:[]};
 }
 chooseSides(l);return true;
}
function endLeaderRivalry(l){
 const e=l.economy,r=l.rivalry,winner=l.leaders[0]??null;
 if(!r)return;l.rivalry=null;l.leaderId=winner?.id??null;l.unrest=0;
 l.nextPolitics=e.time+65;
 l.rivalryHistory=[{startedAt:r.startedAt,endedAt:e.time,winnerId:winner?.id??null,winnerName:winner?.name??null,fallenIds:[...r.fallenIds]},...(l.rivalryHistory??[])].slice(0,8);
 for(const w of e.workers){
  const side=r.sides.find(s=>s.workerId===w.id)?.leaderId;delete w.rivalryLeaderId;
  if(!alive(w))continue;
  if(fighting(w)){w.combatTarget=null;w.combatKind=null;releaseWork(e,w)}
  if(w.cargo)e.returnHome(w);
  const won=side===winner?.id;
  remember(w,w===winner?'I survived the struggle. I am the village’s only spiritual leader.':winner?(won?`${winner.name} survived. Our side won, but I will remember the fighting.`:`${winner.name} now leads alone. I mourn the side we lost.`):'The struggle left us without a spiritual leader.',e.time);
  e.emit('leader-rivalry-ended',w,null,{won:!!won,winnerId:winner?.id??null});
 }
}
export function updateLeaderRivalry(l){
 if(!l.rivalry){if(l.leaders.length>1)startLeaderRivalry(l);return}
 const e=l.economy,r=l.rivalry;
 for(const id of r.leaderIds)if(e.workers.some(w=>w.id===id&&(actorVitality(w)?.dead))&&!l.leaders.some(w=>w.id===id)&&!r.fallenIds.includes(id))r.fallenIds.push(id);
 if(l.leaders.length<=1){endLeaderRivalry(l);return}
 if(e.time>=r.nextSidesAt||r.leaderIds.length!==l.leaders.length)chooseSides(l);
}
export function handleLeaderRivalry(l,w,dt){
 if(!l.rivalry||!alive(w)||(personAge(w)?.child)||w.divineHeld)return false;
 const e=l.economy,side=rivalrySide(l,w);if(side===null)return false;
 if(!fighting(w))enlist(l,w);
 if((actorInterior(w)?.exitAt)!==undefined&&e.time-(actorInterior(w)?.exitAt)<DOORWAY_DURATION)return true;
 const targets=e.workers.filter(p=>alive(p)&&!(personAge(p)?.child)&&!p.divineHeld&&!(actorInterior(p)?.inside)&&rivalrySide(l,p)!==null&&rivalrySide(l,p)!==side&&(!l.isLeader(w)||l.isLeader(p)));
 const target=targets.sort((a,b)=>distance(w,a)-distance(w,b))[0];
 if(!target){w.state='revolt-bound';w.route=[];w.combatTarget=null;w.combatKind=null;return true}
 w.combatTarget=target.id;w.combatKind='villager';
 if(distance(w,target)<=RIVALRY_RULES.reach){
  if(w.state!=='revolt-fighting'){w.state='revolt-fighting';w.route=[];w.clock.reset('fight')}
  w.facing=target.x<w.x?'left':'right';
  for(const event of w.clock.advance(dt)){
   if(event==='contact'&&alive(target)&&!target.divineHeld&&distance(w,target)<1.85){
    const critical=e.random()<RIVALRY_RULES.criticalChance;
    if(survivalDamage(e.survival,target,RIVALRY_RULES.damage*(critical?RIVALRY_RULES.criticalMultiplier:1),'leader-rivalry',w,{critical}))e.emit('leader-fight-hit',w,null,{targetId:target.id});
    if(!l.rivalry)return true;
   }
   if(event==='finish')w.clock.reset('fight');
  }
 }else{
  w.state='revolt-bound';
  if(e.time>=(w.revoltRepathAt??0)){
   w.revoltRepathAt=e.time+1;w.route=[];
   const angle=Math.atan2(w.z-target.z,w.x-target.x);
   for(let i=0;i<8;i++){const a=angle+i*Math.PI/4,route=e.route(w,{x:target.x+Math.cos(a)*1.25,z:target.z+Math.sin(a)*1.25});if(route){w.route=route;break}}
  }
  if(w.route.length)e.move(w,dt);
 }
 return true;
}
