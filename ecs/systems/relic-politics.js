import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {lifeClock} from "../life-state.js";
import {actorPersonality} from "../personality-actors.js";
import {settlementEconomy,settlementSchedule,settlementDiplomacy,settlementCouncil} from '../rival-entities.js';
import {bindRivalVisit,relicMission,setRelicMission,clearRelicMission,settlementRelicIntent,setSettlementRelicIntent} from '../rival-entities.js';
import {relicSpatial,relicCustody,relicCondition,relicInfluence,relicProvenance,relicPoliticsData,ensureRelicPolitics} from '../relic-entities.js';
import {actorRelicAttachment} from "../actor-curse-relic.js";
import {survivalAlert} from "../../village-survival.js";
import {personAge} from "../person-age.js";
import {actorVitality} from "../actor-vitality.js";
import {defineGameData} from "../../game-data.js";
import {rivalFor,rivalPeople,rivalSettlements} from "../../rival-roster.js";
import {civilisationAttitude,civilisationBond,noteDiplomaticIncident} from "../../village-diplomacy.js";
import {RELIC_RULES,RELIC_TYPES,relicPeople,relicById,relicHolder,relicPoint,carriedRelic,takeRelic,dropRelic,cancelRelicTask,attachRelic,relicMemory,relicHistory,recordRelicOwner,destroyRelic} from "../../village-relics.js";

export const RELIC_POLITICS_RULES=defineGameData('village-relic-politics.RULES',{check:10,rumourDelay:65,plotGap:150,missionSeconds:150,offerFood:8,offerWood:6,offerStone:4,refusalDevotion:.68,spottedChance:.6,riteSeconds:8,homeConflictGap:180});
const R=RELIC_POLITICS_RULES,clamp=n=>Math.max(-1,Math.min(1,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=w=>w&&!actorVitality(w)?.dead&&!w.gone&&!w.divineHeld&&!(actorInterior(w)?.inside)&&!personAge(w)?.child&&actorVitality(w)?.health>0;
const title=r=>RELIC_TYPES[r.kind].name;
const cue=(world,w,reaction,r)=>{const e=world.resource('Village');return (e.emit('relic-reaction',w,null,{reaction,relicId:r.id}));};
function politics(world,r){
 const e=world.resource('Village');return ensureRelicPolitics(r).politics??={rumours:[],nextPlot:e.time+R.rumourDelay,homeAt:e.time+R.homeConflictGap};}
const society=(world,w)=>{const e=world.resource('Village');return (rivalFor(e,w)?.culture??e.culture);};
const ownerOf=(world,r)=>{const e=world.resource('Village');return (relicPeople(e).find(w=>w.id===relicCustody(r).ownerId));};
const previousOwner=(r,w)=>relicProvenance(r).owners?.some(o=>o.id===w.id);
function incident(world,a,b,delta,reason,r){
 const e=world.resource('Village');
 if(!a||!b||a===b)return;
 const sa=rivalFor(e,a),sb=rivalFor(e,b);
 if(sa&&sb){const link=civilisationBond(e,a,b);if(link){link.affinity=clamp(link.affinity+delta);if(link.affinity<-.5)link.warUntil=Math.max(link.warUntil,e.time+420);}}
 else {const s=sa??sb;if(!s)return;settlementDiplomacy(s).reputation=clamp(settlementDiplomacy(s).reputation+delta);settlementDiplomacy(s).grievance=Math.max(0,Math.min(2,settlementDiplomacy(s).grievance-delta));noteDiplomaticIncident(e,s,delta,reason);if(delta<0&&settlementDiplomacy(s).grievance>=.45){settlementDiplomacy(s).raidAt??=e.time+90;settlementDiplomacy(s).raidMotive='relic-feud';}}
 relicHistory(e,r,`${a} and ${b}: ${reason}.`);
}
export function learnRelicRumour(world,s,w,r,{hearsay=false}={}){
 const e=world.resource('Village');
 const p=politics(world,r);if(p.rumours.some(k=>k.culture===s.culture))return false;
 const claim=r.culture===s.culture?'An ancestral relic of our people':previousOwner(r,w)?'Our former bearer wants it back':'A relic worth bringing home';
 p.rumours.push({culture:s.culture,witnessId:w.id,at:e.time,nextAt:e.time+R.rumourDelay,claim});
 relicMemory(e,w,`${hearsay?'I heard about':'I saw'} the ${title(r)}. ${claim}.`);relicHistory(e,r,`${w.name} ${hearsay?'heard a rumour about':'spotted'} it and told ${s.culture}.`);if(w.visit)cue(world,w,'thinking',r);return true;
}
export function relicMissionIntent(world,s,w,r){
 const e=world.resource('Village');
 if(previousOwner(r,w)||relicProvenance(r).owners?.some(o=>o.culture===s.culture))return 'recover';
 if(w.role==='spiritual-leader'||w.leaderTrait==='zealot'||w.leaderAmbition>.75)return 'cleanse';
 if(civilisationAttitude(e,s)>.15&&settlementEconomy(s).stock.food>=R.offerFood)return 'offer';
 if(r.culture===s.culture&&civilisationAttitude(e,s)>-.25)return 'claim';
 return 'steal';
}
export function assignRelicMission(world,w,r,intent){
 const e=world.resource('Village');
 if(!w.visit||!r||relicCondition(r).destroyed||relicCustody(r).custodyCulture||personAge(w)?.child||actorVitality(w)?.dead||carriedRelic(e,w))return false;
 const v=w.visit;bindRivalVisit(e,w);setRelicMission(v,{mission:{id:r.id,intent,phase:'approach',until:0}});v.until=Math.max(v.until,e.time+R.missionSeconds);
 relicMemory(e,w,`I came for the ${title(r)}: ${intent==='recover'?'bring it home':intent==='offer'?'buy it':intent==='cleanse'?'destroy its influence':intent==='claim'?'claim it for my people':'steal it'}.`);
 return true;
}
export function returnRelicFromVisit(world,w,arrived){
 const e=world.resource('Village');
 const r=carriedRelic(e,w);if(!r)return;
 const s=rivalFor(e,w);if(arrived&&s){relicCustody(r).custodyCulture=s.culture;relicSpatial(r).x=w.x;relicSpatial(r).z=w.z;politics(world,r).homeAt=e.time+R.homeConflictGap;relicHistory(e,r,`${w.name} brought it home to ${s.culture}.`);relicMemory(e,w,`I brought the ${title(r)} home.`);}
 else dropRelic(e,w,'interrupted');
 cancelRelicTask(e,w);
}
export function bringRelicOnVisit(world,w){
 const e=world.resource('Village');
 const r=carriedRelic(e,w);if(relicCustody(r)?.custodyCulture===rivalFor(e,w)?.culture){relicCustody(r).custodyCulture=null;relicSpatial(r).x=w.x;relicSpatial(r).z=w.z;relicHistory(e,r,`${w.name} carried it back into your village.`);}
}
function chooseOffer(world,s){
 const e=world.resource('Village');return [['food',R.offerFood],['wood',R.offerWood],['stone',R.offerStone]].find(([k,n])=>settlementEconomy(s).stock[k]>=n)??null;}
export function resolveRelicRequest(world,w,r,intent){
 const e=world.resource('Village');
 const s=rivalFor(e,w),holder=relicHolder(e,r),owner=ownerOf(world,r),local=holder??owner;
 if(holder===w)return 'already-owned';
 if(!s||!relicPoint(e,r)||distance(w,relicPoint(e,r))>1.8)return 'unreachable';
 if(local&&society(world,local)!==e.culture)return 'refused';
 const a=(actorRelicAttachment(local)?.attachment),devotion=a?.id===r.id?a.devotion:0;
 const favourable=civilisationAttitude(e,s)>-.25&&(actorPersonality(local)?.trait)!=='blunt';
 const offer=intent==='offer'?chooseOffer(world,s):null;
 // Consent belongs to the person who owns the object, including when it is resting on the ground.
 const agrees=!local||!actorVitality(local)?.dead&&devotion<R.refusalDevotion&&favourable&&(intent==='offer'?!!offer:intent==='recover'||intent==='claim'?devotion<.45:false);
 if(!agrees){
  relicHistory(e,r,`${local?.name??'Its owner'} refused ${w.name}'s ${intent==='offer'?'offer':intent==='cleanse'?'demand to destroy it':'claim'}.`);
  if(local&&!actorVitality(local)?.dead){relicMemory(e,local,`${w.name} wanted my ${title(r)}. I refused.`);cue(world,local,'grumpy',r);if(a?.id===r.id)a.jealousy=Math.min(1,a.jealousy+.12);}
  cue(world,w,'disappointed',r);incident(world,s.culture,e.culture,-.055,'relic claim refused',r);return 'refused';
 }
 if(!takeRelic(e,w,r,{consensual:true}))return 'unreachable';
 if(offer){const [kind,n]=offer;settlementEconomy(s).stock[kind]-=n;e.stock[kind]+=n;relicHistory(e,r,`${w.name} paid ${n} ${kind} for it.`);e.emit('rival-trade',local??w,null,{pay:kind,n:0,give:kind,m:n,partnerId:w.id});}
 if((actorRelicAttachment(local)?.attachment)?.id===r.id){(actorRelicAttachment(local)?.attachment).devotion=Math.min(.3,devotion);(actorRelicAttachment(local)?.attachment).nextUrge=e.time+180;}
 incident(world,s.culture,e.culture,.12,intent==='offer'?'relic purchased peacefully':'relic returned peacefully',r);cue(world,w,'love',r);return 'accepted';
}
function leaveMission(world,w,api){
 const e=world.resource('Village');clearRelicMission(w.visit);api.leave(e,w);}
export function handleRelicVisitor(world,w,dt,api){
 const e=world.resource('Village');
 const v=w.visit,m=relicMission(v)?.mission;if(!m)return false;
 const r=relicById(e,m.id);if(!r||relicCustody(r).custodyCulture||!alive(w)||actorVitality(w)?.health<30){if(r)dropRelic(e,w);leaveMission(world,w,api);return true;}
 const holder=relicHolder(e,r),p=relicPoint(e,r);if(holder===w){leaveMission(world,w,api);return true;}
 if(!p){leaveMission(world,w,api);return true;}
 if(m.phase==='attack'){if(!holder||actorVitality(holder)?.dead){m.phase='approach';}else return false;}
 if(distance(w,p)>1.65){w.state='rival-arriving';api.walk(e,w,p,dt);return true;}
 w.route=[];w.facing=p.x<w.x?'left':'right';w.state='rival-visiting';
 if(m.phase==='approach'){m.phase='request';m.until=e.time+3;cue(world,w,m.intent==='steal'?'nervous':'thinking',r);if(holder)cue(world,holder,'surprise',r);return true;}
 if(e.time<m.until)return true;
 if(m.intent!=='steal'&&m.phase==='request'){
  if(m.intent==='cleanse'){
   relicHistory(e,r,`${w.name} demanded that the ${title(r)} be destroyed.`);
   if(holder||(actorRelicAttachment(ownerOf(world,r))?.attachment)?.devotion>=.45){resolveRelicRequest(world,w,r,'cleanse');m.intent='steal';m.phase='request';m.until=e.time+5;return true;}
   m.phase='rite';m.until=e.time+R.riteSeconds;cue(world,w,'determined',r);return true;
  }
  const outcome=resolveRelicRequest(world,w,r,m.intent);
  if(outcome==='accepted'){leaveMission(world,w,api);return true;}
  if(outcome==='refused'&&((actorPersonality(w)?.trait)==='blunt'||previousOwner(r,w)||r.culture===w.culture)){m.intent='steal';m.until=e.time+5;return true;}
  leaveMission(world,w,api);return true;
 }
 if(m.phase==='rite'){
  // Carrying or moving the relic interrupts the visible cleansing countdown.
  if(holder){leaveMission(world,w,api);return true;}
  const victim=ownerOf(world,r),culture=victim?society(world,victim):e.culture;
  destroyRelic(e,r,{actor:w});incident(world,society(world,w),culture,-.35,'relic destroyed by a visitor',r);leaveMission(world,w,api);return true;
 }
 const witnesses=relicPeople(e).filter(p=>p!==w&&alive(p)&&society(world,p)!==society(world,w)&&distance(w,p)<5);
 if(witnesses.length&&e.random()<R.spottedChance){
  const witness=holder??witnesses[0];cue(world,witness,'surprise',r);relicMemory(e,witness,`I caught ${w.name} trying to steal the ${title(r)}.`);relicHistory(e,r,`${witness.name} caught ${w.name} stealing it.`);
  incident(world,society(world,w),society(world,witness),-.16,'relic theft discovered',r);
  if((actorPersonality(w)?.trait)==='blunt'&&((actorRelicAttachment(w)?.attachment)?.devotion??.5)>.7){v.kind='raid';v.motive='relic-feud';m.phase='attack';if(e.workers.includes(witness))survivalAlert(e.survival,witness);}
  else leaveMission(world,w,api);return true;
 }
 const victim=holder??ownerOf(world,r),culture=victim?society(world,victim):e.culture;
 if(takeRelic(e,w,r,{stolen:true})){incident(world,society(world,w),culture,-.2,'relic stolen',r);if((actorRelicAttachment(victim)?.attachment)){(actorRelicAttachment(victim)?.attachment).nextUrge=e.time+2;(actorRelicAttachment(victim)?.attachment).devotion=Math.max(.72,(actorRelicAttachment(victim)?.attachment).devotion);(actorRelicAttachment(victim)?.attachment).jealousy=Math.max(.6,(actorRelicAttachment(victim)?.attachment).jealousy);}leaveMission(world,w,api);}else leaveMission(world,w,api);
 return true;
}
function homeConflict(world,r){
 const e=world.resource('Village');
 const p=politics(world,r),home=rivalFor(e,relicCustody(r).custodyCulture);if(!home||e.time<p.homeAt)return;p.homeAt=e.time+R.homeConflictGap;
 let old=ownerOf(world,r);if(old?.visit)return;
 if(!old||actorVitality(old)?.dead){const heir=home.people.find(w=>!actorVitality(w)?.dead&&!personAge(w)?.child&&!w.visit&&!w.captive);if(heir){recordRelicOwner(e,r,heir,'inherited');relicCustody(r).ownerId=heir.id;relicCustody(r).holderId=heir.id;attachRelic(e,heir,r,.7);relicHistory(e,r,`${heir.name} inherited it after its bearer died.`);old=heir;}else {relicCustody(r).holderId=null;return;}}
 // Home life is already simulated abstractly. Never transfer to somebody visiting the player.
 for(const other of rivalSettlements(e).filter(s=>s!==home)){
  const rumour=p.rumours.find(k=>k.culture===other.culture);if(!rumour)continue;
  const seeker=other.people.find(w=>!actorVitality(w)?.dead&&!personAge(w)?.child&&!w.visit&&!w.captive);if(!seeker)continue;
  const bond=civilisationBond(e,home.culture,other.culture),offer=chooseOffer(world,other),devotion=(actorRelicAttachment(old)?.attachment)?.devotion??.6;
  const buying=(bond?.affinity??0)>.25&&devotion<R.refusalDevotion&&offer;
  if(!buying&&e.random()>.25)continue;
  if(buying){const [k,n]=offer;settlementEconomy(other).stock[k]-=n;settlementEconomy(home).stock[k]+=n;}
  recordRelicOwner(e,r,seeker,buying?'traded':'stolen');relicCustody(r).ownerId=seeker.id;relicCustody(r).holderId=seeker.id;relicCustody(r).custodyCulture=other.culture;attachRelic(e,seeker,r,.72);
  if(old){attachRelic(e,old,r,.75).jealousy=.8;relicMemory(e,old,`${seeker.name} ${buying?'bought':'stole'} my ${title(r)} in ${home.culture}.`);}
  relicMemory(e,seeker,`I brought the ${title(r)} from ${home.culture} to ${other.culture}.`);relicHistory(e,r,`${seeker.name} ${buying?'bought':'stole'} it from ${home.culture}, taking it to ${other.culture}.`);
  incident(world,home.culture,other.culture,buying?.12:-.25,buying?'relic traded':'relic stolen',r);break;
 }
 // Obsessive bearers eventually bring their prize on a visit, so it is recoverable in the world.
 const current=ownerOf(world,r),s=rivalFor(e,current);if(s&&current&&!actorVitality(current)?.dead&&!current.visit){setSettlementRelicIntent(s,{bearerId:current.id});settlementSchedule(s).nextVisit=Math.min(settlementSchedule(s).nextVisit,e.time+35);}
}
export function updateRelicPolitics(world,startVisit){
 const e=world.resource('Village');
 if(!e.relics?.items.length||!e.rival)return;
 const state=e.relics;if(e.time<(state.politicsAt??0))return;state.politicsAt=e.time+R.check;
 for(const r of state.items){if(relicCondition(r).destroyed)continue;const p=politics(world,r),point=relicPoint(e,r);
  if(point)for(const w of rivalPeople(e))if(alive(w)&&w.visit&&distance(w,point)<7)learnRelicRumour(world,rivalFor(e,w),w,r);
  // A returned witness can pass the rumour to an allied neighbour.
  for(const known of [...p.rumours]){const source=rivalFor(e,known.culture),witness=source?.people.find(w=>w.id===known.witnessId);if(!witness||witness.visit||actorVitality(witness)?.dead||e.time<known.at+R.rumourDelay)continue;
   for(const s of rivalSettlements(e))if(s!==source&&(civilisationBond(e,source.culture,s.culture)?.affinity??0)>0){const w=s.people.find(w=>!actorVitality(w)?.dead&&!personAge(w)?.child&&!w.visit);if(w)learnRelicRumour(world,s,w,r,{hearsay:true});}
  }
  if(relicCustody(r).custodyCulture){
   const home=rivalFor(e,relicCustody(r).custodyCulture),bearer=ownerOf(world,r);
   if(home&&r.kind==='hungry-idol'&&e.time>=relicInfluence(r).nextFoodAt){relicInfluence(r).nextFoodAt=e.time+RELIC_RULES.foodSeconds;if(lifeClock(e.life).hour>=20||lifeClock(e.life).hour<6){relicInfluence(r).hungry=settlementEconomy(home).stock.food<1;if(!relicInfluence(r).hungry){settlementEconomy(home).stock.food--;relicInfluence(r).foodEaten++;}}}
   if(bearer&&!actorVitality(bearer)?.dead&&r.kind==='whispering-mask')bearer.leaderAmbition=Math.min(1,(bearer.leaderAmbition??0)+R.check*.0014);
   homeConflict(world,r);continue;
  }
  if(!point||e.time<p.nextPlot||lifeClock(e.life).hour<7||lifeClock(e.life).hour>=18)continue;
  for(const k of p.rumours){const s=rivalFor(e,k.culture);if(!s||e.time<k.nextAt||s.people.some(w=>w.visit&&!actorVitality(w)?.dead)||settlementCouncil(s).council||s.beast?.visit)continue;
   const pool=s.people.filter(w=>!actorVitality(w)?.dead&&!personAge(w)?.child&&!w.visit&&!w.captive&&!carriedRelic(e,w)).sort((a,b)=>Number(previousOwner(r,b))-Number(previousOwner(r,a)));
   const w=pool[0];if(!w)continue;
   const intent=relicMissionIntent(world,s,w,r),visitors=startVisit(e,{culture:s.culture,visitor:w,motive:'relic-'+intent});
   if(visitors.includes(w)&&assignRelicMission(world,w,r,intent)){p.nextPlot=e.time+R.plotGap;k.nextAt=e.time+R.plotGap;break;}
  }
 }
}
export function validRelicPolitics(world){
 const e=world.resource('Village');
 const finite=n=>Number.isFinite(n)&&n>=0,people=relicPeople(e),ids=new Set(people.map(w=>w.id)),cultures=rivalSettlements(e).map(s=>s.culture);
 if(e.relics?.politicsAt!==undefined&&!finite(e.relics.politicsAt))return false;
 for(const r of e.relics?.items??[]){
  if(relicCustody(r).custodyCulture!=null&&(!cultures.includes(relicCustody(r).custodyCulture)||relicCustody(r).holderId!==null&&!rivalFor(e,relicCustody(r).custodyCulture)?.people.some(w=>w.id===relicCustody(r).holderId)))return false;
  if(relicProvenance(r).owners!==undefined&&(!Array.isArray(relicProvenance(r).owners)||relicProvenance(r).owners.length>24||!relicProvenance(r).owners.every(o=>ids.has(o.id)&&typeof o.name==='string'&&['hearth','solis','cryos'].includes(o.culture)&&finite(o.at)&&['discovered','carried','stolen','traded','inherited'].includes(o.reason))))return false;
  const p=relicPoliticsData(r)?.politics;if(p&&(!finite(p.nextPlot)||!finite(p.homeAt)||!Array.isArray(p.rumours)||p.rumours.length>2||new Set(p.rumours.map(k=>k.culture)).size!==p.rumours.length||!p.rumours.every(k=>cultures.includes(k.culture)&&ids.has(k.witnessId)&&finite(k.at)&&finite(k.nextAt)&&typeof k.claim==='string')))return false;
 }
 for(const w of people){const m=relicMission(w.visit)?.mission;if(m&&(!e.relics?.items.some(r=>r.id===m.id)||!['recover','offer','claim','cleanse','steal'].includes(m.intent)||!['approach','request','rite','attack'].includes(m.phase)||!finite(m.until)))return false;}
 return rivalSettlements(e).every(s=>settlementRelicIntent(s)?.bearerId==null||s.people.some(w=>w.id===settlementRelicIntent(s)?.bearerId));
}
