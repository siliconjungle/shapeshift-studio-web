import {ensureBeastEmotions,beastEmotions} from '../beast-emotions.js';
import {beastsCue} from '../../village-beasts.js';
import {actorVitality} from '../actor-vitality.js';
import {lifeRelation,lifeEmit} from '../../village-life.js';
import {personAge} from '../person-age.js';
import {actorRomance,ensureActorRomance} from '../actor-romance.js';
import {ROMANCE_RULES} from '../romance-rules.js';
import {actorFeelings} from '../actor-feelings.js';
import {memoryCount} from '../../village-memory.js';
import {parentIds} from '../../village-kinship.js';
import {interestedInRomance,romanceInterest} from '../../village-romance-interest.js';
import {hurtRomantically,emotionalAttachment} from '../../village-feelings.js';
import {knownPeople,socialPeople} from '../../village-people.js';

import {mutuallyAttracted,attractedTo} from '../../village-sexuality.js';
const clamp=n=>Math.max(-1,Math.min(1,n));
const attraction=(r,id)=>r.a===id?r.attractionAB:r.attractionBA;

// Availability is a social fact, independent of a person's current work,
// sleep, camera position or distance. Parenthood is a permanent hard boundary.
export function canFormAdultPair(a,b){
 return !!a&&!!b&&!(actorVitality(a)?.dead)&&!(actorVitality(b)?.dead)&&a.id!==b.id&&!(personAge(a)?.child)&&!(personAge(b)?.child)&&!a.exiled&&!b.exiled&&mutuallyAttracted(a,b)&&!parentIds(a).includes(b.id)&&!parentIds(b).includes(a.id);
}
export function areRelated(e,a,b){
 const ancestors=w=>{const found=new Set(),todo=parentIds(w);while(todo.length){const id=todo.pop();if(found.has(id))continue;found.add(id);todo.push(...parentIds(knownPeople(e).find(p=>p.id===id)))}return found};
 const aa=ancestors(a),bb=ancestors(b);return aa.has(b.id)||bb.has(a.id)||[...aa].some(id=>bb.has(id));
}
export function hasUnrelatedOption(e,w){
 return knownPeople(e).some(other=>{
  if(!canFormAdultPair(w,other)||!mutuallyAttracted(w,other)||areRelated(e,w,other))return false;
  const partner=knownPeople(e).find(p=>p.id===(actorRomance(other)?.sweetheartId)&&!(actorVitality(p)?.dead));
  if(partner&&partner.id!==w.id)return false;
  const r=((e.life)==null?undefined:(lifeRelation(e.life,w.id,other.id)));
  return !!r&&r.attractionAB>.55&&r.attractionBA>.55&&r.affinity>-.3&&r.romanceStatus!=='rejected';
 });
}
export function canRomance(e,a,b){
 if(!canFormAdultPair(a,b)||!mutuallyAttracted(a,b))return false;
 return !areRelated(e,a,b)||!hasUnrelatedOption(e,a)&&!hasUnrelatedOption(e,b);
}
export function romancePartner(world,w){const state=world.resource('Romance'),e=state.economy,life=state.life;return socialPeople(e).find(p=>p.id===((actorRomance(w)?.sweetheartId)??w.leaderBelovedId)&&!(actorVitality(p)?.dead))
}
export function romanceWilling(world,w,other,r){const state=world.resource('Romance'),e=state.economy,life=state.life;
  const old=romancePartner(world,w);
  if(!old||old===other)return true;
  const bond=lifeRelation(life,w.id,old.id);
  // A strong existing couple stays faithful. An already strained bond can
  // give way to a substantially stronger, mutual connection.
  return bond.affinity<.55&&r.affinity+attraction(r,w.id)>bond.affinity+attraction(bond,w.id)+.35;
 
}
export function romanceHeartbreak(world,w,other,type,extra={}){const state=world.resource('Romance'),e=state.economy,life=state.life;
  hurtRomantically(e,w,other,type,extra);
  lifeEmit(life,type,w,{partnerId:other.id,...extra});
  if(w.species==='beast')beastsCue(e.beasts,w,'heartbroken','crying');
 
}
export function romanceBetray(world,w,newPartner){const state=world.resource('Romance'),e=state.economy,life=state.life;
  const old=romancePartner(world,w);if(!old||old===newPartner)return;
  const bond=lifeRelation(life,w.id,old.id);
  const attachment=emotionalAttachment(e,old,w,bond);
  bond.affinity=clamp(bond.affinity-.8);bond.romanceStatus='ended';bond.romanceAfter=e.time+ROMANCE_RULES.retryDelay;
  ensureActorRomance(w).sweetheartId=null;if(w.leaderBelovedId===old.id){w.leaderBelovedId=null;old.leaderSuitorIds=old.leaderSuitorIds?.filter(id=>id!==w.id);}
  if((actorRomance(old)?.sweetheartId)===w.id)ensureActorRomance(old).sweetheartId=null;
  romanceHeartbreak(world,old,w,'cheated-on',{otherId:newPartner.id,attachment,established:true});
  if(old.species==='beast'){ensureBeastEmotions(old).emotionalTargetId=newPartner.id;ensureBeastEmotions(old).jealousy=Math.min(1,((beastEmotions(old)?.jealousy)??0)+.4);}
 
}
export function romanceBreakUp(world,a,b,r){const state=world.resource('Romance'),e=state.economy,life=state.life;
  const attachment=[emotionalAttachment(e,a,b,r),emotionalAttachment(e,b,a,r)];
  ensureActorRomance(a).sweetheartId=ensureActorRomance(b).sweetheartId=null;r.romanceStatus='ended';r.romanceAfter=e.time+ROMANCE_RULES.retryDelay;
  for(const [i,w] of [a,b].entries())romanceHeartbreak(world,w,w===a?b:a,'breakup',{attachment:attachment[i],established:true});
 
}
export function romanceResolve(world,a,b,r,kind){const state=world.resource('Romance'),e=state.economy,life=state.life;
  const time=e.time;
  if((personAge(a)?.child)||(personAge(b)?.child)||(actorVitality(a)?.dead)||(actorVitality(b)?.dead)||a.id===b.id||parentIds(a).includes(b.id)||parentIds(b).includes(a.id))return null;
  if(kind==='argument'&&(actorRomance(a)?.sweetheartId)===b.id&&(actorRomance(b)?.sweetheartId)===a.id&&r.affinity<.15){romanceBreakUp(world,a,b,r);return 'breakup';}
  if((actorRomance(a)?.sweetheartId)===b.id&&(actorRomance(b)?.sweetheartId)===a.id)return null;
  if(kind==='argument'||(!canRomance(e,a,b)&&!((actorFeelings(a)?.crush)?.targetId===b.id||(actorFeelings(b)?.crush)?.targetId===a.id))||r.meetings<2||r.affinity<.45||(r.romanceAfter??0)>time)return null;
  if(a.species!=='beast'&&b.species!=='beast'&&e.leadership?.court(a,b,r))return 'accepted';
  const proposer=[a,b].find(w=>attractedTo(w,w===a?b:a)&&interestedInRomance(w,r,'propose')&&((actorFeelings(w)?.heartbrokenUntil)??0)<=time&&romanceWilling(world,w,w===a?b:a,r));
  if(!proposer)return null;
  const recipient=proposer===a?b:a;
  const accepted=canRomance(e,proposer,recipient)&&interestedInRomance(recipient,r)&&((actorFeelings(recipient)?.heartbrokenUntil)??0)<=time&&romanceWilling(world,recipient,proposer,r);
  if(!accepted){
   const uninterested=romanceInterest(recipient)<.5&&!interestedInRomance(recipient,r);
   ensureActorRomance(recipient).romanceMemories=[{at:time,text:uninterested?`I am content without romance and declined ${proposer.name}'s advances.`:`I did not return ${proposer.name}'s feelings.`},...((actorRomance(recipient)?.romanceMemories)??[])].slice(0,3);
   lifeEmit(life,'romantic-declined',recipient,{partnerId:proposer.id,reason:uninterested?'not-seeking-romance':'not-reciprocated'});
   r.romanceAfter=time+ROMANCE_RULES.retryDelay;r.romanceStatus='rejected';r.affinity=clamp(r.affinity-.18);
   romanceHeartbreak(world,proposer,recipient,'romantic-rejection');
   r.romanceAfter=time+ROMANCE_RULES.retryDelay*Math.min(4,memoryCount(life.memory,proposer,recipient,'rejected'));return 'rejected';
  }
  romanceBetray(world,proposer,recipient);romanceBetray(world,recipient,proposer);
  r.romanceStatus='courting';r.romanceAfter=time+20;
  if(r.affinity>.72&&r.meetings>=5){ensureActorRomance(a).sweetheartId=b.id;ensureActorRomance(b).sweetheartId=a.id;r.romanceStatus='committed';delete actorFeelings(a)?.crush;delete actorFeelings(b)?.crush;}
  return 'accepted';
 
}
