import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorPersonality} from "./ecs/personality-actors.js";
import {actorFaith} from "./ecs/religion-actors.js";
import {actorVitality} from "./ecs/actor-vitality.js";
import {actorNeeds} from "./ecs/actor-needs.js";
import {survivalInterrupt} from "./village-survival.js";
import {personAge} from "./ecs/person-age.js";
import {STORY_RULES as R,storyState,storyPeople,storyPerson,storyAlive,storyOutside,storyDistance as distance,storyClose,storyBond,storyMemory,storyHistory,storyCue,storyAffinity,lifeDebt,hideStoryPerson,storyHidden,WITCH_GROUPS,witchGroupMatches} from './village-story-state.js';
import {isCursed} from './village-curse.js';
import {rivalFor} from './rival-roster.js';
const victimOf=(w,c)=>w.id===c.targetId||c.group&&witchGroupMatches(w,c.group);
export function noteStoryDisaster(e,kind,subjectId=null,key=kind+':'+subjectId){
 const s=storyState(e);if(s.disasters.some(d=>d.key===key&&e.time-d.at<30))return false;
 s.disasters.push({kind,subjectId,key,at:e.time});s.disasters=s.disasters.filter(d=>e.time-d.at<R.disasterWindow).slice(-20);return true;
}
export function startScapegoat(e,target,speaker=e.leadership?.leader,{group=null}={}){
 const s=storyState(e);if(!storyAlive(target)||!storyAlive(speaker)||target===speaker||s.cases.some(c=>c.status==='active')||group&&!WITCH_GROUPS.some(g=>g.field===group.field&&g.value===group.value))return null;
 const c={id:s.nextId++,targetId:target.id,leaderId:speaker.id,group:group?{...group}:null,createdAt:e.time,until:e.time+R.caseSeconds*(group?2:1),nextHunt:e.time+20,status:'active',accusers:[{id:speaker.id,conviction:.85}],defenderIds:[],harassed:[],exileAttempt:false};s.cases.push(c);s.cases=s.cases.slice(-8);s.disasters=[];
 storyMemory(e,speaker,`I blame ${group?group.label:target.name} for our disasters. This is my suspicion, not proof.`);storyMemory(e,target,`${speaker.name} blamed ${group?group.label:'me'} for disasters we did not cause.`);storyHistory(e,group?'witch-hunt':'scapegoat',`${speaker.name} began a false accusation against ${group?group.label:target.name}.`,[speaker.id,target.id]);storyCue(e,speaker,group?'witch-hunt':'grumpy','accusation');storyCue(e,target,'nervous','accused');return c;
}
export function startProphecy(e,leader,target){
 const s=storyState(e);if(!storyAlive(leader)||!storyAlive(target)||leader===target||(personAge(target)?.child)||s.prophecies.some(p=>p.status==='active'))return null;
 const p={id:s.nextId++,leaderId:leader.id,targetId:target.id,at:e.time,until:e.time+300,status:'active',mistreatment:0,harasserIds:[],betrayalAt:null};s.prophecies.push(p);s.prophecies=s.prophecies.slice(-8);s.nextProphecy=e.time+R.prophecyGap;
 storyMemory(e,leader,`I predicted that ${target.name} would betray us. The future is not certain.`);storyMemory(e,target,`${leader.name} foretold my betrayal. I had done nothing.`);storyHistory(e,'prophecy',`${leader.name} predicted betrayal by ${target.name}.`,[leader.id,target.id]);storyCue(e,leader,'thinking','prophecy');storyCue(e,target,'confused','prophecy');return p;
}
export function beginStoryExile(e,w,reason){
 if(!storyOutside(w)||!e.workers.includes(w)||e.workers.filter(p=>storyAlive(p)&&!(personAge(p)?.child)).length<2||(personAge(w)?.child)||e.leadership?.isLeader(w))return false;
 const gate={x:e.depot.x-15,z:e.depot.z+17},route=e.route(w,gate);if(!route)return false;
 survivalInterrupt(e.survival,w);w.storyTask={kind:'exile',targetId:w.id,phase:'walking',deadline:e.time+70,until:0,repathAt:0};w.storyExileReason=reason;w.route=route;w.state='story-bound';storyMemory(e,w,`I am leaving: ${reason}.`);storyCue(e,w,'heartbroken','exile');return true;
}
export function storyRitualSelection(e,leader,eligible){
 const c=e.stories?.cases.find(c=>c.status==='active'&&c.leaderId===leader.id);if(!c)return null;
 const believers=c.accusers.filter(a=>a.conviction>=R.huntConviction&&storyOutside(storyPerson(e,a.id))).map(a=>a.id);
 if(believers.length<2||e.time<c.nextHunt)return {victims:[],supporters:[],case:c};
 const victims=eligible.filter(w=>victimOf(w,c)&&!storyHidden(e,w)&&!lifeDebt(e,leader,w));
 // The campaign persists across paid rituals; it never kills a group in one invisible operation.
 return {victims:victims.slice(0,3),supporters:eligible.filter(w=>!(personAge(w)?.child)&&believers.includes(w.id)&&!victimOf(w,c)&&!victims.some(v=>storyClose(e,w,v)||lifeDebt(e,w,v))),case:c};
}
export function storyRitualStarted(e,r,choice){if(!choice)return;r.storyCaseId=choice.case.id;r.motive=choice.case.group?'witch-hunt':'scapegoat';choice.case.nextHunt=e.time+R.huntGap;for(const id of r.supporterIds)storyCue(e,storyPerson(e,id),choice.case.group?'witch-hunt':'grumpy','ritual-accusation');}
function defendAccused(e,c,target){
 const defenders=e.workers.filter(w=>storyOutside(w)&&!(personAge(w)?.child)&&w!==target&&w.id!==c.leaderId&&(storyClose(e,w,target)||lifeDebt(e,w,target)||(actorPersonality(w)?.trait)==='gentle'&&storyBond(e,w,target)>-.2));
 for(const w of defenders){if(!c.defenderIds.includes(w.id)){c.defenderIds.push(w.id);storyMemory(e,w,`I defended ${target.name} against a false accusation.`);storyMemory(e,target,`${w.name} spoke up for me.`);storyCue(e,w,'determined','defending-accused');storyAffinity(e,w,target,.08);}
  if(distance(w,target)<3){actorNeeds(target).social=Math.min(100,actorNeeds(target).social+2);for(const a of c.accusers){const accuser=storyPerson(e,a.id);if(accuser&&distance(w,accuser)<5&&storyBond(e,w,accuser)>.15)a.conviction=Math.max(0,a.conviction-.09);}}
 }
 const ritual=e.leadership?.rituals?.active,atRisk=ritual?.storyCaseId===c.id&&ritual.stage!=='embers'&&ritual.victimIds.includes(target.id);
 if(atRisk){const protector=defenders.find(w=>(actorVitality(w)?.health)>40&&distance(w,target)<4&&(actorPersonality(w)?.trait)!=='quiet');if(protector&&e.random()<.3){e.leadership.rituals.cancel('defenders-intervened');storyAffinity(e,protector,storyPerson(e,c.leaderId),-.18);storyCue(e,protector,'grumpy','stopped-hunt');hideStoryPerson(e,protector,target,'protecting an accused loved one');}}
 else if(c.group){const host=defenders.find(w=>distance(w,target)<2.5&&(actorResidence(w)?.home));if(host&&e.random()<.18)hideStoryPerson(e,host,target,'protecting an accused person');}
}
export function updateStoryPolitics(e){
 const s=storyState(e),locals=e.workers.filter(storyAlive);s.disasters=s.disasters.filter(d=>e.time-d.at<R.disasterWindow);
 if(!s.cases.some(c=>c.status==='active')&&s.disasters.length>=R.disastersToBlame){
  const speaker=e.leadership?.leader??locals.find(w=>!(personAge(w)?.child)&&(actorPersonality(w)?.trait)==='blunt'),pool=locals.filter(w=>w!==speaker&&!(personAge(w)?.child));
  if(speaker&&pool.length){pool.sort((a,b)=>Number(isCursed(b,e.time))-Number(isCursed(a,e.time))+storyBond(e,speaker,a)-storyBond(e,speaker,b));let target=pool[0];
   const groups=WITCH_GROUPS.filter(g=>!witchGroupMatches(speaker,g)&&pool.filter(w=>witchGroupMatches(w,g)).length>=2);
   const group=speaker.leaderTrait==='zealot'&&groups.length&&e.random()<.4?groups[Math.min(groups.length-1,Math.floor(e.random()*groups.length))]:null;if(group)target=pool.find(w=>witchGroupMatches(w,group));startScapegoat(e,target,speaker,{group});
  }
 }
 for(const c of s.cases){if(c.status!=='active')continue;const speaker=storyPerson(e,c.leaderId),targets=storyPeople(e).filter(w=>storyAlive(w)&&(e.workers.includes(w)||w.visit&&!w.gone)&&victimOf(w,c));
  if(!storyAlive(speaker)||e.time>=c.until||!targets.length){c.status=!storyAlive(speaker)?'leader-gone':targets.length?'subsided':'ended';storyHistory(e,'accusation-ended','The accusation campaign ended.',[c.targetId]);continue;}
  for(const target of targets){
   defendAccused(e,c,target);
   if(!storyOutside(target))continue;
   for(const w of locals){if((personAge(w)?.child)||victimOf(w,c)||c.defenderIds.includes(w.id)||c.accusers.some(a=>a.id===w.id)||storyClose(e,w,target)||lifeDebt(e,w,target))continue;
    const friend=c.accusers.find(a=>a.conviction>.5&&storyOutside(storyPerson(e,a.id))&&distance(w,storyPerson(e,a.id))<6&&(storyBond(e,w,storyPerson(e,a.id))>.2||(actorFaith(w)?.belief)?.value>.75));
    if(friend&&e.random()<R.gossipChance){c.accusers.push({id:w.id,conviction:.55});storyMemory(e,w,`I believed a rumour blaming ${c.group?c.group.label:target.name}. I did not witness wrongdoing.`);storyCue(e,w,c.group?'witch-hunt':'grumpy','rumour');}
   }
   const nearby=c.accusers.filter(a=>a.conviction>.4&&storyOutside(storyPerson(e,a.id))&&distance(target,storyPerson(e,a.id))<6);
   if(nearby.length){const a=nearby[Math.floor(e.random()*nearby.length)%nearby.length],w=storyPerson(e,a.id);a.conviction=Math.min(1,a.conviction+.035);storyAffinity(e,w,target,-.035);actorNeeds(target).social=Math.max(0,actorNeeds(target).social-2);storyCue(e,w,c.group?'witch-hunt':'grumpy','accusation');storyCue(e,target,'nervous','persecuted');
    if(!c.harassed.includes(target.id)){c.harassed.push(target.id);storyMemory(e,target,`${w.name} harassed me over the village's misfortunes.`);}
   }
  }
  const believers=c.accusers.filter(a=>a.conviction>.6);if(!c.group&&!c.exileAttempt&&e.time-c.createdAt>60&&believers.length>locals.filter(w=>!(personAge(w)?.child)).length/2){c.exileAttempt=beginStoryExile(e,storyPerson(e,c.targetId),'the village blamed me for its disasters');}
  if(!believers.length){c.status='discredited';storyHistory(e,'accusation-discredited','Friends and dissenters stopped the accusations.',[c.targetId]);}
 }
 const leader=e.leadership?.leader;
 if(leader&&e.time>=s.nextProphecy&&!s.prophecies.some(p=>p.status==='active')){s.nextProphecy=e.time+R.prophecyGap;const target=locals.filter(w=>w!==leader&&!(personAge(w)?.child)&&!storyClose(e,w,leader)).sort((a,b)=>storyBond(e,leader,a)-storyBond(e,leader,b))[0];if(target&&['zealot','charismatic'].includes(leader.leaderTrait)&&e.random()<.28)startProphecy(e,leader,target);}
 for(const p of s.prophecies){if(p.status!=='active')continue;const target=storyPerson(e,p.targetId),leader=storyPerson(e,p.leaderId);
  if(!storyAlive(target)||!storyAlive(leader)||e.time>=p.until){p.status=p.betrayalAt?'fulfilled':'unfulfilled';continue;}
  const friends=locals.filter(w=>w!==target&&storyClose(e,w,target));if(friends.some(w=>storyOutside(w)&&distance(w,target)<4)){p.mistreatment=Math.max(0,p.mistreatment-.3);actorNeeds(target).social=Math.min(100,actorNeeds(target).social+1);}
  const harasser=locals.find(w=>w!==target&&storyOutside(w)&&!storyClose(e,w,target)&&!lifeDebt(e,w,target)&&storyBond(e,w,leader)>.3&&distance(w,target)<5);
  if(harasser&&storyOutside(target)){p.mistreatment+=1;storyAffinity(e,harasser,target,-.055);actorNeeds(target).social=Math.max(0,actorNeeds(target).social-3);if(!p.harasserIds.includes(harasser.id)){p.harasserIds.push(harasser.id);storyMemory(e,target,`${harasser.name} mistreated me because of ${leader.name}'s prediction.`);}storyCue(e,harasser,'grumpy','prophecy-suspicion');}
  if(p.mistreatment>=R.prophecyMistreatment&&!p.betrayalAt&&(actorPersonality(target)?.trait)!=='gentle'&&e.random()<.4){p.betrayalAt=e.time;p.status='fulfilled';target.storyBetrayal={leaderId:leader.id,at:e.time};storyMemory(e,target,'They treated me like a traitor until I chose to turn against them.');storyAffinity(e,target,leader,-.4);leader.leaderResentment=Math.min(1,(leader.leaderResentment??0)+.1);storyHistory(e,'prophecy-fulfilled',`Persecution drove ${target.name} to betray the village.`,[target.id,leader.id]);beginStoryExile(e,target,'persecution turned me against this village');}
 }
}
