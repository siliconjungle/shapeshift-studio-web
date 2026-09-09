import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {releaseWork} from "./village-resources.js";
import {lifeMealAccounting,lifeClock} from "./ecs/life-state.js";
import {actorSocialActivity} from "./ecs/daily-activity-actors.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {addPerson,transferPerson} from './ecs/population-entities.js';
import {actorRomance} from "./ecs/actor-romance.js";
import {survivalInterrupt} from "./village-survival.js";
import {settlementEconomy} from "./ecs/rival-entities.js";
import {ensureActorVitality} from "./ecs/actor-vitality.js";
import {settlementDiplomacy} from "./ecs/rival-entities.js";
import {ensureActorFaith} from "./ecs/religion-actors.js";
import {actorFaith} from "./ecs/religion-actors.js";
import {actorVitality} from "./ecs/actor-vitality.js";
import {actorRelicTask} from "./ecs/actor-curse-relic.js";
import {personAge} from "./ecs/person-age.js";
import {actorNeeds} from "./ecs/actor-needs.js";
import {STORY_RULES as R,storyState,storyPeople,storyPerson,storyAlive,storyOutside,storyDistance as distance,storyClose,storyBond,storyMemory,storyHistory,storyCue,storyAffinity,lifeDebt,recordLifeDebt,repayLifeDebt,storyHidden,hideStoryPerson,interruptStory} from './village-story-state.js';
import {rivalFor,rivalPeople,rivalSettlements} from './rival-roster.js';
import {civilisationAttitude} from './village-diplomacy.js';
import {applyCurse,clearCurse} from './village-curse.js';
import {dropRelic} from './village-relics.js';
const idle=w=>!!actorNeeds(w)&&storyOutside(w)&&!(personAge(w)?.child)&&!w.storyTask&&!w.cargo&&!(actorRelicTask(w)?.task)&&!actorSocialActivity(w)?.partnerId&&!w.role&&actorNeeds(w).hunger<75&&actorNeeds(w).energy>25&&['idle','resting','outbound','rival-visiting','rival-arriving',...(w.secretBond?['alerted']:[])].includes(w.state);
export function scheduleStoryReturn(e,w,reason='left'){const s=storyState(e);if(s.returns.some(r=>r.id===w.id))return false;s.returns.push({id:w.id,reason,at:e.time+R.returnDelay+e.random()*100,returned:false});s.returns=s.returns.slice(-32);return true;}
export function startStoryReturn(e,w,startVisit){
 if(!w||(actorVitality(w)?.dead)||w.visit||e.workers.includes(w))return false;
 const s=rivalFor(e,w)??rivalSettlements(e).find(s=>!s.people.some(w=>w.visit&&!(actorVitality(w)?.dead))&&s.people.length<24);if(!s||s.people.some(w=>w.visit&&!(actorVitality(w)?.dead)))return false;
 const wasExile=!!w.exiled,index=e.leadership?.exiles.indexOf(w)??-1;
 if(index>=0)transferPerson(e,w,'Exile','RivalCitizen',s);else if(!s.people.includes(w))addPerson(e,w,'RivalCitizen',s);
 w.exiled=false;w.gone=true;w.state='away';w.tribeId=s.culture;ensureActorInterior(w).inside=false;actorNeeds(w).energy=Math.max(60,actorNeeds(w).energy);actorNeeds(w).hunger=Math.min(40,actorNeeds(w).hunger);
 const visitors=startVisit(e,{culture:s.culture,visitor:w,motive:'prodigal-return'});
 if(!visitors.includes(w)){if(index>=0){transferPerson(e,w,'RivalCitizen','Exile');w.exiled=wasExile;w.state='exiled';}return false;}
 const oldFaith=(actorFaith(w)?.belief)?.value??.5;if((actorFaith(w)?.belief))(ensureActorFaith(w).belief).value=.3+e.random()*.65;
 w.visitorStory={kind:'prodigal',hostId:null,kindness:0,at:e.time,resolved:false,paid:false,pursuitAt:e.time+35,foreignCulture:s.culture,oldFaith};
 if(w.storyBetrayal){w.visitorStory.kind='danger';(settlementDiplomacy(s).raidAt)=e.time+60;(settlementDiplomacy(s).raidMotive)='returning-betrayer';}
 storyMemory(e,w,`I returned after living among ${s.culture}, with new loyalties and a changed faith.`);storyHistory(e,'prodigal-return',`${w.name} returned from ${s.culture}.`,[w.id]);
 for(const p of e.workers.filter(storyAlive)){if(storyClose(e,p,w)){storyMemory(e,p,`${w.name} came home. I still care about them.`);storyCue(e,p,'love','prodigal-welcome');storyAffinity(e,p,w,.1);}else if(w.storyExileReason||wasExile){storyMemory(e,p,`${w.name} returned, but I remember why they left.`);storyCue(e,p,'confused','prodigal-distrust');}}
 return true;
}
export function prepareStoryGuest(e,w,kind){
 if(!w.visit||!['danger','curse','bounty'].includes(kind))return false;
 w.visitorStory={kind,hostId:null,kindness:0,at:e.time,resolved:false,paid:false,pursuitAt:e.time+35,foreignCulture:rivalFor(e,w)?.culture??w.culture,oldFaith:(actorFaith(w)?.belief)?.value??.5};w.visit.until=Math.max(w.visit.until,e.time+100);
 (ensureActorVitality(w).health)=Math.min((actorVitality(w)?.health),kind==='curse'?25:48);actorNeeds(w).hunger=78;
 if(kind==='curse')applyCurse(e,w,'stranger');storyMemory(e,w,'I came looking for food and a safe place to rest.');storyCue(e,w,'nervous','guest-arrives');return true;
}
export function greetStoryGuest(e,w,host){
 const g=w.visitorStory;if(!g||g.resolved||!storyOutside(w)||!storyOutside(host)||(personAge(host)?.child)||distance(w,host)>2.5)return false;
 const welcomes=storyClose(e,host,w)||lifeDebt(e,host,w)||['gentle','outgoing','thoughtful'].includes((actorPersonality(host)?.trait))&&storyBond(e,host,w)>-.35;
 if(!welcomes){g.resolved=true;storyMemory(e,host,`I wanted ${w.name} to leave; I feared what they might bring.`);storyMemory(e,w,`${host.name} turned me away.`);storyAffinity(e,host,w,-.1);storyCue(e,host,'grumpy','guest-refused');w.visit.until=Math.min(w.visit.until,e.time+10);return false;}
 const food=Math.min(2,Math.floor(e.stock.food));if(food<1)return false;
 e.stock.food-=food;actorNeeds(w).hunger=Math.max(0,actorNeeds(w).hunger-food*28);(ensureActorVitality(w).health)=Math.min(100,(actorVitality(w)?.health)+12);g.hostId=host.id;g.kindness++;g.resolved=true;
 storyMemory(e,host,`I welcomed ${w.name}, sharing food and offering shelter.`);storyMemory(e,w,`${host.name} welcomed me when I needed help.`);storyAffinity(e,host,w,.2);storyCue(e,w,'love','guest-welcomed');
 if(g.kind==='curse'&&host.role==='spiritual-leader'&&host.leaderTrait!=='zealot'){clearCurse(e,w,'leader');recordLifeDebt(e,w,host,'tended a dangerous illness');}
 if((actorResidence(host)?.home))hideStoryPerson(e,host,w,'offered hospitality to a stranger');return true;
}
export function guestConsequences(e,w,startVisit){
 const g=w.visitorStory;if(!g||g.paid||e.time<g.pursuitAt)return;
 if(!g.resolved)return;
 g.paid=true;
 const s=rivalFor(e,w),host=storyPerson(e,g.hostId);
 if(g.kindness>0&&(g.kind==='bounty'||g.kind==='prodigal'||e.random()<.35)){
  const gift=Math.min(R.guestGift,Math.floor(settlementEconomy(s)?.stock.stone??0));if(gift>0){(settlementEconomy(s).stock).stone-=gift;e.stock.stone+=gift;storyMemory(e,host,`${w.name} repaid our hospitality with ${gift} stone.`);storyMemory(e,w,'I repaid the kindness shown to me.');storyCue(e,host,'delight','guest-gift');storyHistory(e,'guest-gift',`${w.name} gave the village ${gift} stone.`,[w.id,host.id]);}
 }
 if(g.kind==='danger'&&g.kindness>0){
  const pursuer=rivalSettlements(e).find(p=>p!==s&&p.people.some(v=>!(actorVitality(v)?.dead)&&!v.visit));
  if(pursuer){(settlementDiplomacy(pursuer).grievance)=Math.min(2,(settlementDiplomacy(pursuer).grievance)+.25);(settlementDiplomacy(pursuer).reputation)=Math.max(-1,(settlementDiplomacy(pursuer).reputation)-.1);(settlementDiplomacy(pursuer).raidAt)=e.time+25;(settlementDiplomacy(pursuer).raidMotive)='pursuing-guest';pursuer.storyPursuitId=w.id;storyMemory(e,host,`Pursuers demanded we surrender ${w.name}. I offered them shelter.`);storyHistory(e,'guest-pursuit',`${pursuer.culture} demanded the guest's surrender.`,[w.id,host.id]);}
 }
}
function beginAid(e,w,target,kind='aid'){
 if(!idle(w)||!storyOutside(target)||distance(w,target)>R.debtRange)return false;
 const food=actorNeeds(target).hunger>=75&&e.stock.food>=1&&e.workers.includes(w),destination=food?e.depot:target,route=e.route(w,destination);if(!route)return false;
 survivalInterrupt(e.survival,w);w.storyTask={kind,targetId:target.id,phase:food?'fetch':'walking',deadline:e.time+45,until:0,repathAt:e.time+1};w.state='story-bound';w.route=route;const foreign=rivalFor(e,w);if(!food&&actorNeeds(target).hunger>=75&&settlementEconomy(foreign)?.stock.food>=1){(settlementEconomy(foreign).stock).food--;w.storyCargo=1;}return true;
}
export function chooseStoryAid(e,w){
 if(!idle(w)||(w.storyAidAfter??0)>e.time)return false;
 w.storyAidAfter=e.time+R.check;
 const pool=storyPeople(e).filter(p=>p!==w&&storyOutside(p)&&distance(w,p)<R.debtRange);
 const creditor=pool.find(p=>lifeDebt(e,w,p)&&((actorVitality(p)?.health)<50||actorNeeds(p).hunger>75||e.stories?.cases.some(c=>c.status==='active'&&c.targetId===p.id)));
 if(creditor){w.storyAidAfter=e.time+30;if(e.stories?.cases.some(c=>c.status==='active'&&c.targetId===creditor.id)&&hideStoryPerson(e,w,creditor,'repaying a life debt'))return true;return beginAid(e,w,creditor);}
 const stranger=pool.find(p=>(actorVitality(p)?.health)<=20||actorNeeds(p).hunger>=94);if(stranger&&(actorPersonality(w)?.trait)==='gentle'&&e.random()<.15){w.storyAidAfter=e.time+35;return beginAid(e,w,stranger);}return false;
}
export function chooseSecretMeeting(e,w){
 if(!idle(w)||!e.workers.includes(w)||(w.secretAfter??0)>e.time||(personAge(w)?.child))return false;
 const lover=storyPerson(e,(actorRomance(w)?.sweetheartId)),s=rivalFor(e,lover);if(!s||!storyOutside(lover)||(personAge(lover)?.child)||(actorRomance(lover)?.sweetheartId)!==w.id||!lover.visit||lover.visit.stage==='leaving'||civilisationAttitude(e,s)>-.2&&(settlementDiplomacy(s).warUntil)<=e.time)return false;
 w.secretAfter=e.time+R.secretGap;w.secretBond={partnerId:lover.id,since:e.time};lover.secretBond={partnerId:w.id,since:e.time};
 if(!beginAid(e,w,lover,'secret'))return false;
 lover.visit.until=Math.max(lover.visit.until,e.time+45);storyMemory(e,w,`I arranged a secret meeting with ${lover.name} despite our villages' feud.`);return true;
}
export function handleStoryTask(e,w,dt){
 if(w.storyHidden){
  if(storyHidden(e,w)&&!w.divineHeld&&actorNeeds(w).hunger<88){if(w.visit)w.visit.until+=dt;(ensureActorVitality(w).health)=Math.min(100,(actorVitality(w)?.health)+dt*.2);actorNeeds(w).energy=Math.min(100,actorNeeds(w).energy+dt);return true;}
  delete w.storyHidden;ensureActorInterior(w).inside=false;ensureActorInterior(w).insideAt=null;releaseWork(e,w);
 }
 const t=w.storyTask;if(!t)return false;
 if(!storyAlive(w)||w.divineHeld||e.time>=t.deadline||actorNeeds(w).hunger>90||actorNeeds(w).energy<15){interruptStory(e,w);return false;}
 if(t.kind==='exile'){
  if(w.route.length){if(e.move(w,dt)==='moving')return true;if(w.route.length)return true;}
  if(!e.leadership||e.workers.filter(p=>storyAlive(p)&&!(personAge(p)?.child)).length<2||e.leadership.isLeader(w)){interruptStory(e,w);return false;}
  dropRelic(e,w);const index=e.workers.indexOf(w);if(index<0){interruptStory(e,w);return false;}interruptStory(e,w);transferPerson(e,w,'Resident','Exile');w.exiled=true;w.exiledAt=e.time;w.state='exiled';ensureActorResidence(w).home=null;w.store=null;scheduleStoryReturn(e,w,w.storyExileReason??'left');
  // Family solidarity can cost the village another resident, not merely an affinity number.
  const relative=e.workers.find(p=>!(personAge(p)?.child)&&!e.leadership.isLeader(p)&&storyClose(e,p,w)&&storyOutside(p)&&e.workers.filter(q=>storyAlive(q)&&!personAge(q)?.child).length>1);
  if(relative&&e.random()<.45){survivalInterrupt(e.survival,relative);relative.storyTask={kind:'exile',targetId:relative.id,phase:'walking',deadline:e.time+60,until:0,repathAt:0};relative.storyExileReason='I will not abandon '+w.name;relative.route=e.route(relative,{x:w.x,z:w.z})??[];relative.state='story-bound';storyMemory(e,relative,`I chose to leave with ${w.name}.`);}
  storyHistory(e,'exile',`${w.name} left because of persecution.`,[w.id]);return true;
 }
 const target=storyPerson(e,t.targetId);if(!storyAlive(target)||target.gone||target.divineHeld||(actorInterior(target)?.inside)&&t.kind!=='hide'){interruptStory(e,w);return false;}
 if(t.phase==='fetch'){
  const result=e.move(w,dt);if(result==='blocked'){interruptStory(e,w);return false;}if(result!=='arrived')return true;
  if(e.stock.food<1){interruptStory(e,w);return false;}e.stock.food--;w.storyCargo=1;t.phase='walking';w.route=e.route(w,target)??[];
 }
 const point=t.kind==='hide'?(actorResidence(target)?.home):target;if(!point){interruptStory(e,w);return false;}
 if(distance(w,point)>1.8){if(e.time>=t.repathAt){w.route=e.route(w,point)??[];t.repathAt=e.time+2;}if(e.move(w,dt)==='blocked'){interruptStory(e,w);return false;}return true;}
 w.route=[];w.state=t.kind==='hide'?'story-hidden':'story-tending';w.facing=point.x<w.x?'left':'right';
 if(t.kind==='hide'){w.storyHidden={hostId:target.id,until:e.time+R.hideSeconds};ensureActorInterior(w).inside=true;ensureActorInterior(w).insideAt=(actorResidence(target)?.home);delete w.storyTask;storyMemory(e,w,`${target.name} hid me in their home.`);repayLifeDebt(e,target,w,'gave them sanctuary');return true;}
 if(!t.until){t.until=e.time+(t.kind==='secret'?6:8);storyCue(e,w,t.kind==='secret'?'love':'thinking',t.kind);return true;}
 if(e.time<t.until)return true;
 const endangered=(actorVitality(target)?.health)<=20||actorNeeds(target).hunger>=90&&w.storyCargo>0;
 if(w.storyCargo){w.storyCargo=0;actorNeeds(target).hunger=Math.max(0,actorNeeds(target).hunger-55);lifeMealAccounting(e.life).consumed++;}
 if(t.kind==='aid'){(ensureActorVitality(target).health)=Math.min(100,(actorVitality(target)?.health)+22);actorNeeds(w).energy=Math.max(0,actorNeeds(w).energy-5);if(endangered)recordLifeDebt(e,target,w,'food and care in a crisis');repayLifeDebt(e,w,target,'brought care and supplies');}
 if(t.kind==='secret'){
  storyAffinity(e,w,target,.1);actorNeeds(w).social=Math.min(100,actorNeeds(w).social+20);actorNeeds(target).social=Math.min(100,actorNeeds(target).social+20);storyMemory(e,target,`${w.name} met me secretly across the feud.`);
  if(target.visit?.kind==='raid'){target.visit.stage='leaving';target.visit.leavingAt=e.time;target.route=[];target.visit.repathAt=0;const s=rivalFor(e,target);(settlementDiplomacy(s).raidAt)=null;storyMemory(e,w,`I persuaded ${target.name} to abandon the raid.`);storyHistory(e,'lover-sabotage',`${target.name} abandoned a raid for ${w.name}.`,[w.id,target.id]);}
  const witness=e.workers.find(p=>p!==w&&storyOutside(p)&&distance(p,w)<4&&!storyClose(e,p,w));if(witness){storyMemory(e,w,`${witness.name} discovered our secret meeting.`);storyMemory(e,witness,`I saw ${w.name} secretly meeting someone from an enemy village.`);storyAffinity(e,witness,w,-.12);storyCue(e,witness,'surprise','secret-discovered');}
 }
 storyCue(e,target,'love',t.kind);interruptStory(e,w);return true;
}
export function handleStoryVisitor(e,w,dt,api){
 if(handleStoryTask(e,w,dt))return true;
 const g=w.visitorStory;if(g&&!g.resolved&&w.visit?.stage!=='leaving'){
  const host=e.workers.filter(p=>storyOutside(p)&&!(personAge(p)?.child)).sort((a,b)=>Number(storyClose(e,b,w))-Number(storyClose(e,a,w))||distance(w,a)-distance(w,b))[0];
  if(host){if(distance(w,host)>2){api.walk(e,w,host,dt);return true;}greetStoryGuest(e,w,host);return true;}
 }
 if(w.visit?.kind!=='raid'&&chooseStoryAid(e,w))return true;return false;
}
export function updateStoryJourneys(e,startVisit){
 const s=storyState(e);
 for(const w of e.workers){const lover=storyPerson(e,(actorRomance(w)?.sweetheartId)),foreign=rivalFor(e,lover);if(storyAlive(w)&&!(personAge(w)?.child)&&storyAlive(lover)&&!(personAge(lover)?.child)&&(actorRomance(lover)?.sweetheartId)===w.id&&foreign&&(civilisationAttitude(e,foreign)<-.2||(settlementDiplomacy(foreign).warUntil)>e.time)){if(w.secretBond?.partnerId!==lover.id)w.secretBond={partnerId:lover.id,since:e.time};if(lover.secretBond?.partnerId!==w.id)lover.secretBond={partnerId:w.id,since:e.time};}}
 for(const w of e.leadership?.exiles??[])if(!(actorVitality(w)?.dead))scheduleStoryReturn(e,w,'exiled');
 for(const w of rivalPeople(e))if(w.movedAt!=null&&!(actorVitality(w)?.dead))scheduleStoryReturn(e,w,'emigrated');
 for(const r of s.returns){if(!r.returned&&e.time>=r.at){const w=storyPerson(e,r.id);if(w&&!(actorVitality(w)?.dead)&&startStoryReturn(e,w,startVisit))r.returned=true;else r.at=e.time+45;}}
 for(const w of rivalPeople(e).filter(w=>w.visit&&!(actorVitality(w)?.dead))){guestConsequences(e,w,startVisit);if(w.visitorStory?.kind==='prodigal'&&w.visitorStory.resolved&&w.visitorStory.kindness>0)w.visit.membershipAfter=Math.min(w.visit.membershipAfter??e.time,e.time);}
 if(e.time>=s.nextGuest&&lifeClock(e.life).hour>=7&&lifeClock(e.life).hour<18){s.nextGuest=e.time+R.guestGap;const settlement=rivalSettlements(e).find(s=>!s.people.some(w=>w.visit&&!(actorVitality(w)?.dead))&&(settlementDiplomacy(s).raidAt)===null);if(settlement){const visits=startVisit(e,{culture:settlement.culture,motive:'seeking-shelter'});if(visits[0])prepareStoryGuest(e,visits[0],['danger','curse','bounty'][Math.min(2,Math.floor(e.random()*3))]);}}
}
