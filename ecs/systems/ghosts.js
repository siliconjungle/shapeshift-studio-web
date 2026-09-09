import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {lifeClock} from "../life-state.js";
import {actorPersonality} from "../personality-actors.js";
import {personKinship} from '../person-kinship.js';
import {actorVitality} from '../actor-vitality.js';
import {survivalAlert,survivalInterrupt,survivalDamage} from '../../village-survival.js';
import {lifeIdle,lifeRelation} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorNeeds} from '../actor-needs.js';
import {ghostExperience,ensureGhostExperience} from '../ghost-experiences.js';
import {ghostVisits} from '../ghost-visits.js';
import {GHOST_RULES,ghostNight} from '../ghost-data.js';
import {memorialOpacity} from '../../village-memorials.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled;
const available=w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!(personAge(w)?.child);
const clamp=n=>Math.max(0,Math.min(1,n));
const conversational=new Set(['idle','resting','warming','waiting-friend','ghost-listening']);
export function handleGhostConversationSystem(world,w){
 const e=world.resource('Village');
 if(w.state!=='ghost-listening')return false;
 if((ghostExperience(w)?.conversationUntil??0)>e.time&&e.ghosts?.actors.some(g=>g.id===ghostExperience(w)?.conversationId))return true;
 const experience=ghostExperience(w);if(experience){delete experience.conversationUntil;delete experience.conversationId;}lifeIdle(e.life,w);return false;
}
function remember(e,w,g,text){
 ensureGhostExperience(w).memories=[{ghostId:g.workerId,text,at:e.time},...(ghostExperience(w)?.memories??[])].slice(0,4);
}
function emote(e,g,voice,worker=null,type='ghost-talk'){
 e.emit(type,worker,null,{ghostId:g.id,point:{x:g.x,z:g.z},voice});
}
export function ghostReactionSystem(world,g,w){
 const e=world.resource('Village');
 const dead=e.workers.find(p=>p.id===g.workerId),relation=((e.life)==null?undefined:(lifeRelation(e.life,g.workerId,w.id)));
 const affinity=relation?.affinity??0;
 const family=(personKinship(dead)?.parents)?.includes(w.id)||(personKinship(w)?.parents)?.includes(g.workerId);
 const remembered=e.survival.memorials.find(m=>m.id===g.graveId)?.details?.relations?.find(r=>r.id===w.id);
 const beloved=remembered?.label?.includes('Sweetheart')||family;
 if(affinity<-.3)return 'reject';
 if((personAge(w)?.child))return 'afraid';
 if(affinity>.5||beloved)return 'welcome';
 if((actorPersonality(w)?.trait)==='quiet')return 'afraid';
 if((actorPersonality(w)?.trait)==='blunt')return 'reject';
 return ['gentle','thoughtful','outgoing','playful'].includes((actorPersonality(w)?.trait))?'curious':'ignore';
}
export function spawnGhostSystem(world,grave){
 const e=world.resource('Village');
 const s=e.ghosts,dead=e.workers.find(w=>w.id===grave?.workerId);
 if(!s||s.actors.length||!ghostNight(lifeClock(e.life)?.hour)||!(actorVitality(dead)?.dead)||(personAge(dead)?.child)||memorialOpacity(grave,e.time)<=0)return null;
 const g={id:'ghost-'+(++s.serial),workerId:dead.id,graveId:grave.id,name:dead.name,trait:(actorPersonality(dead)?.trait),x:grave.x,z:grave.z,bornAt:e.time,expiresAt:e.time+GHOST_RULES.minDuration+e.random()*(GHOST_RULES.maxDuration-GHOST_RULES.minDuration),hostility:0,state:'seeking',nextEncounterAt:e.time+3,nextAttackAt:0,encounters:[],pending:null};
 ghostVisits(e).add(g);s.visits++;emote(e,g,'greeting',null,'ghost-arrived');return g;
}
function scare(e,g,w){
 if(!alive(w)||(actorInterior(w)?.inside)||w.divineHeld||(w.shieldUntil??0)>e.time)return;
 ensureGhostExperience(w).fearUntil=e.time+GHOST_RULES.fearSeconds;w.localAlarmUntil=Math.max(w.localAlarmUntil??0,ghostExperience(w)?.fearUntil);
 actorNeeds(w).social=Math.max(0,actorNeeds(w).social-12);survivalAlert(e.survival,w);
 remember(e,w,g,`${g.name}’s ghost frightened me near the old grave.`);
 e.emit('ghost-scared',w,null,{ghostId:g.id});
}
function respond(e,g,w,result){
 const old=g.hostility;
 if(result==='welcome'||result==='curious'){
  g.hostility=clamp(g.hostility-.4);g.state='peaceful';actorNeeds(w).social=Math.min(100,actorNeeds(w).social+(result==='welcome'?18:8));
  emote(e,g,'warm',w);remember(e,w,g,result==='welcome'?`Shared a tender moment with ${g.name}’s ghost.`:`Listened to ${g.name}’s ghost.`);
 }else{
  g.hostility=clamp(g.hostility+(result==='reject'?.42:result==='afraid'?.22:.26)+(g.trait==='blunt'?.12:0));g.state='lonely';
  emote(e,g,'lonely',w);
  remember(e,w,g,result==='reject'?`Turned ${g.name}’s ghost away.`:result==='afraid'?`Was afraid to speak to ${g.name}’s ghost.`:`Was too busy to answer ${g.name}’s ghost.`);
 }
 e.emit('ghost-response',w,null,{ghostId:g.id,response:result});
 g.encounters.push({workerId:w.id,at:e.time,result});g.encounters=g.encounters.slice(-12);
 if(result==='afraid')scare(e,g,w);
 if(g.hostility>=GHOST_RULES.hostileAt){
  g.state='angry';if(old<GHOST_RULES.hostileAt){g.nextAttackAt=e.time+3;emote(e,g,'warning',w,'ghost-warning');}
 }
 g.nextEncounterAt=e.time+GHOST_RULES.encounterGap;g.pending=null;
}
export function updateGhostsSystem(world,dt){
 const e=world.resource('Village');
 const s=e.ghosts;if(!s||!(dt>0))return;ghostVisits(e);
 const night=ghostNight(lifeClock(e.life)?.hour);
 if(!night){for(const g of s.actors)emote(e,g,'farewell',null,'ghost-departed');for(const g of s.actors)ghostVisits(e).remove(g);s.wasNight=false;s.rollAt=null;return;}
 if(!s.wasNight){s.wasNight=true;s.rollAt=e.time+6+e.random()*20;}
 if(s.rollAt!==null&&e.time>=s.rollAt){
  s.rollAt=null;
  const graves=(e.survival?.memorials??[]).filter(m=>e.time-m.diedAt>=8&&memorialOpacity(m,e.time)>0&&e.workers.some(w=>w.id===m.workerId&&(actorVitality(w)?.dead)&&!(personAge(w)?.child)));
  if(graves.length&&e.random()<GHOST_RULES.nightChance)spawnGhostSystem(world,graves[Math.min(graves.length-1,Math.floor(e.random()*graves.length))]);
 }
 for(const id of world.query(['GhostVisit'])){
  const g=world.get(id,'GhostVisit');
  const grave=e.survival.memorials.find(m=>m.id===g.graveId),dead=e.workers.find(w=>w.id===g.workerId);
  if(e.time>=g.expiresAt||!(actorVitality(dead)?.dead)||!grave||memorialOpacity(grave,e.time)<=0){emote(e,g,'farewell',null,'ghost-departed');ghostVisits(e).remove(g);continue;}
  const nearby=e.workers.filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(w,grave)<=GHOST_RULES.roamRadius+GHOST_RULES.noticeRadius).sort((a,b)=>distance(a,g)-distance(b,g));
  const target=nearby[0];
  // Spirits drift through scenery but stay anchored to supported ground near their grave.
  if(target&&distance(g,target)>1.5){const d=distance(g,target),step=Math.min(dt*.65,d-1.5),p={x:g.x+(target.x-g.x)/d*step,z:g.z+(target.z-g.z)/d*step};if(distance(p,grave)<=GHOST_RULES.roamRadius&&Number.isFinite(e.heightAt(p.x,p.z)))Object.assign(g,p);}
  if(g.pending){
   const w=e.workers.find(w=>w.id===g.pending.workerId);
   if(!alive(w)||(actorInterior(w)?.inside)||w.divineHeld){g.pending=null;g.nextEncounterAt=e.time+3;}
   else if(e.time>=g.pending.until)respond(e,g,w,distance(w,g)<=GHOST_RULES.noticeRadius&&(conversational.has(w.state)||(personAge(w)?.child))?ghostReactionSystem(world,g,w):'ignore');
  }
  if(!g.pending&&target&&distance(g,target)<=GHOST_RULES.noticeRadius&&e.time>=g.nextEncounterAt&&g.state!=='angry'){
   g.pending={workerId:target.id,until:e.time+GHOST_RULES.responseSeconds};emote(e,g,'greeting',target);
   if(!(personAge(target)?.child)&&!target.cargo&&conversational.has(target.state)){survivalInterrupt(e.survival,target);target.state='ghost-listening';const experience=ensureGhostExperience(target);experience.conversationId=g.id;experience.conversationUntil=g.pending.until+3;}
   e.emit('ghost-noticed',target,null,{ghostId:g.id});
  }
  if(g.state==='angry'&&target&&distance(g,target)<=2&&e.time>=g.nextAttackAt){
   g.nextAttackAt=e.time+GHOST_RULES.attackGap;scare(e,g,target);
   if(available(target))survivalDamage(e.survival,target,GHOST_RULES.attackDamage,'attack',g);
   emote(e,g,'wail',target,'ghost-attack');
  }
 }
}
