import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {releaseWork} from "./village-resources.js";
import {survivalInterrupt} from "./village-survival.js";
import {survivalDrop} from "./village-survival.js";
import {personKinship} from "./ecs/person-kinship.js";
import {actorRomance} from "./ecs/actor-romance.js";
import {lifeRelation} from "./village-life.js";
import {actorVitality} from "./ecs/actor-vitality.js";
import {defineGameData} from './game-data.js';
import {knownPeople} from './village-people.js';
import {rivalFor} from './rival-roster.js';
export const STORY_RULES=defineGameData('village-stories.RULES',{check:8,disasterWindow:180,disastersToBlame:3,caseSeconds:300,gossipChance:.32,huntConviction:.7,huntGap:80,prophecyGap:240,prophecyMistreatment:4,returnDelay:240,guestGap:180,guestGift:7,debtRange:14,secretGap:70,hideSeconds:55});
export const storyState=e=>e.stories??={version:1,nextId:0,nextCheck:e.time+8,nextGuest:e.time+180,nextProphecy:e.time+240,disasters:[],debts:[],cases:[],prophecies:[],returns:[],history:[]};
export const storyPeople=knownPeople;
export const storyPerson=(e,id)=>knownPeople(e).find(w=>w.id===id);
export const storyAlive=w=>w&&!(actorVitality(w)?.dead)&&!w.exiled&&((actorVitality(w)?.health)??100)>0;
export const storyOutside=w=>storyAlive(w)&&w.state!=='away'&&!w.gone&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.rivalJourney&&!w.expeditionId&&w.ritualId==null;
export const storyDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const storySociety=(e,w)=>rivalFor(e,w)?.culture??e.culture;
export const storyBond=(e,a,b)=>lifeRelation(e.life,a.id,b.id)?.affinity??0;
export const storyClose=(e,a,b)=>a!==b&&((actorRomance(a)?.sweetheartId)===b.id||(actorRomance(b)?.sweetheartId)===a.id||(personKinship(a)?.parents)?.includes(b.id)||(personKinship(b)?.parents)?.includes(a.id)||storyBond(e,a,b)>.5);
export function storyMemory(e,w,text){if(w)w.storyMemories=[{text,at:e.time},...(w.storyMemories??[])].slice(0,8);}
export function storyHistory(e,kind,text,ids=[]){const s=storyState(e);s.history=[{kind,text,ids,at:e.time},...s.history].slice(0,40);}
export function storyCue(e,w,reaction,reason){if(w)e.emit('story-reaction',w,null,{reaction,reason});}
export function storyAffinity(e,a,b,delta){const r=lifeRelation(e.life,a.id,b.id);if(r)r.affinity=Math.max(-1,Math.min(1,r.affinity+delta));}
export function lifeDebt(e,debtor,creditor){return e.stories?.debts.find(d=>d.debtorId===debtor?.id&&d.creditorId===creditor?.id&&d.strength>.15);}
export function recordLifeDebt(e,debtor,creditor,reason){
 if(!storyAlive(debtor)||!storyAlive(creditor)||debtor===creditor)return false;
 const s=storyState(e);let d=s.debts.find(d=>d.debtorId===debtor.id&&d.creditorId===creditor.id);
 if(d&&e.time-d.at<60)return false;
 if(!d){d={debtorId:debtor.id,creditorId:creditor.id,strength:.85,at:e.time,lastRepaid:0};s.debts.push(d);if(s.debts.length>64)s.debts.shift();}else{d.strength=Math.min(1,d.strength+.25);d.at=e.time;}
 storyMemory(e,debtor,`${creditor.name} saved my life. I owe them, even if our villages are enemies.`);storyMemory(e,creditor,`I saved ${debtor.name}: ${reason}.`);storyAffinity(e,debtor,creditor,.25);storyCue(e,debtor,'love','life-debt');storyHistory(e,'life-debt',`${debtor.name} owes ${creditor.name} their life.`,[debtor.id,creditor.id]);return true;
}
export function repayLifeDebt(e,w,to,reason){const d=lifeDebt(e,w,to);if(!d)return;d.strength=Math.max(.2,d.strength-.15);d.lastRepaid=e.time;storyMemory(e,w,`I repaid part of my debt to ${to.name}: ${reason}.`);storyMemory(e,to,`${w.name} helped me because I once saved them.`);}
export function refusesStoryAttack(e,w,target){return !!lifeDebt(e,w,target)||!!(w?.secretBond?.partnerId===target?.id&&(actorRomance(w)?.sweetheartId)===target.id);}
export function storyHidden(e,w){const h=w?.storyHidden,host=h&&storyPerson(e,h.hostId),home=(actorResidence(host)?.home);return !!(h&&h.until>e.time&&storyAlive(host)&&home&&!(structuralCondition(home)?.destroyed)&&!e.shelter?.fires.some(f=>f.id===home.id&&f.until>e.time));}
export function interruptStory(e,w){
 if(w.storyHidden){delete w.storyHidden;ensureActorInterior(w).inside=false;ensureActorInterior(w).insideAt=null;}
 if(w.storyCargo){survivalDrop(e.survival,w,'food',w.storyCargo);w.storyCargo=0;}
 if(w.storyTask){delete w.storyTask;if(w.state?.startsWith('story-'))releaseWork(e,w);}
}
export function hideStoryPerson(e,host,guest,reason){
 if(!storyOutside(host)||!storyOutside(guest)||!(actorResidence(host)?.home)||(structuralCondition((actorResidence(host)?.home))?.destroyed)||storyDistance(host,guest)>2.5||e.shelter?.fires.some(f=>f.id===(actorResidence(host)?.home).id&&f.until>e.time))return false;
 const route=e.route(guest,(actorResidence(host)?.home));if(!route)return false;
 survivalInterrupt(e.survival,guest);guest.storyTask={kind:'hide',targetId:host.id,phase:'walking',deadline:e.time+35,until:0,repathAt:e.time+2};guest.route=route;guest.state='story-bound';guest.storyShelterReason=reason;storyMemory(e,host,`I offered ${guest.name} a hiding place: ${reason}.`);return true;
}
export function storyDescription(e,w){
 if(storyHidden(e,w))return 'Hidden by '+(storyPerson(e,w.storyHidden.hostId)?.name??'a friend');
 if(w.storyTask)return ({aid:'Repaying a life debt',hide:'Seeking refuge',secret:'Meeting a forbidden sweetheart',exile:'Leaving after accusations',return:'Returning to the village'})[w.storyTask.kind]??'Following a personal obligation';
 const c=e.stories?.cases.find(c=>c.status==='active'&&(c.targetId===w.id||c.group&&witchGroupMatches(w,c.group)));
 if(c)return 'Falsely accused of bringing misfortune';
 const debt=e.stories?.debts.find(d=>d.debtorId===w.id&&d.strength>.15);if(debt)return 'Owes their life to '+(storyPerson(e,debt.creditorId)?.name??'someone');
 return w.visitorStory?({danger:'A guest with someone pursuing them',curse:'An ailing guest seeking shelter',bounty:'A traveller who remembers kindness',prodigal:'Returned with a changed life'})[w.visitorStory.kind]??'A guest seeking shelter':'';
}
// Demographics only select the victims of a false collective accusation. They confer no guilt or powers.
export const WITCH_GROUPS=[{field:'sex',value:'female',label:'women'},{field:'sex',value:'male',label:'men'},{field:'sexuality',value:'straight',label:'straight people'},{field:'sexuality',value:'gay',label:'gay people'},{field:'sexuality',value:'bisexual',label:'bisexual people'},{field:'sexuality',value:'asexual',label:'asexual people'}];
export const witchGroupMatches=(w,g)=>!!w&&(g.field==='sexuality'?actorRomance(w)?.sexuality:w[g.field])===g.value;
