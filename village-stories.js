import {actorVitality} from "./ecs/actor-vitality.js";
import {STORY_RULES as R,storyState,storyPerson,storyPeople,storyAlive,storyMemory,storyCue,recordLifeDebt,lifeDebt,storyDescription,WITCH_GROUPS} from './village-story-state.js';
import {noteStoryDisaster,updateStoryPolitics} from './village-story-politics.js';
import {scheduleStoryReturn,updateStoryJourneys} from './village-story-journeys.js';
export function noticeStoryEvent(e,event){
 if(!e.life||event.type==='story-reaction')return;
 const actor=storyPerson(e,event.workerId),other=storyPerson(e,event.partnerId??event.targetId);
 if(event.type==='child-rescued')recordLifeDebt(e,other,actor,'led them away from danger');
 if(event.type==='friend-defended'&&(actorVitality(other)?.health)<=35)recordLifeDebt(e,other,actor,'intervened in a lethal fight');
 if(event.type==='friend-fed'&&event.hungerBefore>=90)recordLifeDebt(e,other,actor,'fed them before starvation');
 if(event.type==='villager-exiled'&&actor)scheduleStoryReturn(e,actor,'exiled');
 if(event.type==='died')noteStoryDisaster(e,'death',event.workerId);
 if(event.type==='raid-recovery'&&event.loss)noteStoryDisaster(e,'raid',null,'raid:'+event.episodeId);
 if(event.type==='community-recovery')noteStoryDisaster(e,'home-destruction',null,'home:'+event.houseId);
 if(event.type==='curse-accident')noteStoryDisaster(e,'misfortune',event.workerId,'curse:'+event.workerId);
 if(event.type==='curse-social'&&['blame','condemn'].includes(event.response)){
  const c=e.stories?.cases.find(c=>c.status==='active'&&c.targetId===event.targetId);if(c&&!c.accusers.some(a=>a.id===event.workerId))c.accusers.push({id:event.workerId,conviction:.6});
 }
}
export function updateStories(e,dt,startVisit){
 if(!e.life||!(dt>0))return;const s=storyState(e);if(e.time<s.nextCheck)return;s.nextCheck=e.time+R.check;
 updateStoryPolitics(e);updateStoryJourneys(e,startVisit);
 for(const d of s.debts){const creditor=storyPerson(e,d.creditorId),debtor=storyPerson(e,d.debtorId);if((!creditor||(actorVitality(creditor)?.dead)||(actorVitality(creditor)?.health)<=0)&&d.strength>0){d.strength=0;storyMemory(e,debtor,`${creditor?.name??'My rescuer'} died before I could fully repay my debt.`);}}
}
export function storyFeedbackEvents(event){return event.type==='story-reaction'?[{workerId:event.workerId,reaction:event.reaction,expression:['grumpy','witch-hunt'].includes(event.reaction)?'angry':['nervous','heartbroken'].includes(event.reaction)?'afraid':event.reaction==='surprise'?'surprised':event.reaction==='thinking'?'thinking':event.reaction==='confused'?'confused':event.reaction==='determined'?'focused':'happy'}]:null;}
export function validStories(e){
 const s=e.stories,people=storyPeople(e),ids=new Set(people.map(w=>w.id)),finite=n=>Number.isFinite(n)&&n>=0,has=id=>ids.has(id),memory=m=>typeof m.text==='string'&&finite(m.at);
 if(s!==undefined){
  if(!s||s.version!==1||![s.nextId,s.nextCheck,s.nextGuest,s.nextProphecy].every(finite))return false;
  for(const [key,max]of [['disasters',20],['debts',64],['cases',8],['prophecies',8],['returns',32],['history',40]])if(!Array.isArray(s[key])||s[key].length>max)return false;
  if(!s.disasters.every(d=>finite(d.at)&&typeof d.kind==='string'&&typeof d.key==='string'&&(d.subjectId===null||has(d.subjectId))))return false;
  if(!s.debts.every(d=>has(d.debtorId)&&has(d.creditorId)&&d.debtorId!==d.creditorId&&finite(d.strength)&&d.strength<=1&&finite(d.at)&&finite(d.lastRepaid))||new Set(s.debts.map(d=>d.debtorId+':'+d.creditorId)).size!==s.debts.length)return false;
  if(!s.cases.every(c=>Number.isSafeInteger(c.id)&&has(c.targetId)&&has(c.leaderId)&&[c.createdAt,c.until,c.nextHunt].every(finite)&&['active','leader-gone','subsided','ended','discredited'].includes(c.status)&&typeof c.exileAttempt==='boolean'&&(!c.group||WITCH_GROUPS.some(g=>g.field===c.group.field&&g.value===c.group.value))&&Array.isArray(c.accusers)&&c.accusers.length<=people.length&&new Set(c.accusers.map(a=>a.id)).size===c.accusers.length&&c.accusers.every(a=>has(a.id)&&finite(a.conviction)&&a.conviction<=1)&&['defenderIds','harassed'].every(k=>Array.isArray(c[k])&&c[k].length<=people.length&&c[k].every(has))))return false;
  if(!s.prophecies.every(p=>Number.isSafeInteger(p.id)&&has(p.targetId)&&has(p.leaderId)&&[p.at,p.until,p.mistreatment].every(finite)&&['active','fulfilled','unfulfilled'].includes(p.status)&&(p.betrayalAt===null||finite(p.betrayalAt))&&Array.isArray(p.harasserIds)&&p.harasserIds.length<=people.length&&p.harasserIds.every(has)))return false;
  if(!s.returns.every(r=>has(r.id)&&finite(r.at)&&typeof r.reason==='string'&&typeof r.returned==='boolean')||!s.history.every(h=>memory(h)&&typeof h.kind==='string'&&Array.isArray(h.ids)&&h.ids.every(has)))return false;
 }
 return people.every(w=>{
  const t=w.storyTask,g=w.visitorStory,h=w.storyHidden;
  return (!w.storyMemories||Array.isArray(w.storyMemories)&&w.storyMemories.length<=8&&w.storyMemories.every(memory))&&(!t||s&&['aid','hide','secret','exile'].includes(t.kind)&&has(t.targetId)&&['walking','fetch'].includes(t.phase)&&[t.deadline,t.until,t.repathAt].every(finite))&&(!h||has(h.hostId)&&finite(h.until))&&(!g||['danger','curse','bounty','prodigal'].includes(g.kind)&&(g.hostId===null||has(g.hostId))&&[g.kindness,g.at,g.pursuitAt,g.oldFaith].every(finite)&&typeof g.resolved==='boolean'&&typeof g.paid==='boolean')&&(!w.secretBond||has(w.secretBond.partnerId)&&finite(w.secretBond.since))&&(!w.storyBetrayal||has(w.storyBetrayal.leaderId)&&finite(w.storyBetrayal.at))&&(w.storyCargo==null||Number.isSafeInteger(w.storyCargo)&&w.storyCargo>=0&&w.storyCargo<=1);
 });
}
