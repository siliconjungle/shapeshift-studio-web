import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {ensureActorSocialActivity,actorSocialActivity} from "../daily-activity-actors.js";
import {actorWorkPreferences} from "../personality-actors.js";
import {developmentSchedule} from "../development-state.js";
import {actorAmbitions,ensureActorAmbitions} from "../development-actors.js";
import {personKinship} from "../person-kinship.js";
import {discoveryChoose} from "../../village-discovery.js";
import {actorRomance} from "../actor-romance.js";
import {actorFeelings} from "../actor-feelings.js";
import {personAge} from "../person-age.js";
import {actorVitality} from "../actor-vitality.js";
import {actorNeeds} from "../actor-needs.js";
import {lifeRelation,lifeSocial} from "../../village-life.js";
import {SKILLS,skillLevel,resourceSkill} from "../../village-skills.js";
const healthy=w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.exiled&&!w.expeditionId&&!w.rivalJourney&&!w.cargo&&actorNeeds(w).hunger<55&&actorNeeds(w).energy>45;
export function ambitionLabel(w,e){const a=(actorAmbitions(w)?.current);if(!a)return null;return a.kind==='mastery'?`Become a better ${SKILLS[a.skill].name.toLowerCase()} specialist · level ${a.goal}`:a.kind==='explore'?'See somewhere beyond the village':a.kind==='family'?'Raise a family':`Make peace with ${e.workers.find(p=>p.id===a.targetId)?.name??'an old friend'}`;}
export function ambitionWorkBias(w,skill){return (actorAmbitions(w)?.current)?.kind==='mastery'&&(actorAmbitions(w)?.current).skill===skill?((actorAmbitions(w)?.dreamUntil)>0?24:18):0;}
export function ambitionSocialBias(w,peer){return (actorAmbitions(w)?.current)?.kind==='reconcile'&&(actorAmbitions(w)?.current).targetId===peer.id?((actorAmbitions(w)?.dreamUntil)?18:12):(actorAmbitions(w)?.current)?.kind==='family'&&!(personAge(peer)?.child)&&((actorRomance(w)?.sweetheartId)==null||(actorRomance(w)?.sweetheartId)===peer.id)?((actorAmbitions(w)?.dreamUntil)?6:3):0;}
export function finishAmbition(world,w,outcome='fulfilled'){
 const e=world.resource('Village');
 const a=(actorAmbitions(w)?.current);if(!a)return;
 (ensureActorAmbitions(w).history)=[{...a,endedAt:e.time,outcome},...((actorAmbitions(w)?.history)??[])].slice(0,8);(ensureActorAmbitions(w).current)=null;(ensureActorAmbitions(w).after)=e.time+(outcome==='fulfilled'?75:35);
 if(outcome==='fulfilled'){(ensureActorAmbitions(w).fulfilledUntil)=e.time+45;actorNeeds(w).social=Math.min(100,actorNeeds(w).social+15);e.emit('ambition-fulfilled',w);}
}
export function updateAmbitions(world){
 const e=world.resource('Village');
 if(!e.life||(developmentSchedule(e).ambitionAt??0)>e.time)return;developmentSchedule(e).ambitionAt=e.time+5;
 for(const w of e.workers){
  if((actorVitality(w)?.dead)||w.exiled)continue;const a=(actorAmbitions(w)?.current);
  if(a){
   if(a.kind==='mastery'&&skillLevel(w,a.skill)>=a.goal||a.kind==='family'&&e.workers.some(c=>!(actorVitality(c)?.dead)&&(personKinship(c)?.parents)?.includes(w.id))||a.kind==='explore'&&((actorAmbitions(w)?.explorationVisits)??0)>a.baseline){finishAmbition(world,w);continue;}
   if(a.kind==='reconcile'){
    const peer=e.workers.find(p=>p.id===a.targetId);if(!peer||(actorVitality(peer)?.dead)){finishAmbition(world,w,'lost-opportunity');continue;}
    const r=lifeRelation(e.life,w.id,peer.id);if(r&&r.affinity>=.2&&r.meetings>a.baseline){finishAmbition(world,w);continue;}
   }
   continue; // Meals, sleep and cancelled jobs never erase a personal wish.
  }
  if((personAge(w)?.child)||((actorAmbitions(w)?.after)??45)>e.time)continue;
  const rivals=e.workers.filter(p=>p!==w&&!(actorVitality(p)?.dead)&&(lifeRelation(e.life,w.id,p.id)?.meetings??0)>0&&(lifeRelation(e.life,w.id,p.id)?.affinity??0)<.1&&!((actorFeelings(w)?.heartbrokenUntil)>e.time));
  const options=['mastery',...(e.discovery?['explore']:[]),...(!(personAge(w)?.elder)&&!e.workers.some(c=>(personKinship(c)?.parents)?.includes(w.id))?['family']:[]),...(rivals.length?['reconcile']:[])];
  const kind=options[Math.floor(e.random()*options.length)];
  const record={kind,at:e.time};
  if(kind==='mastery'){
   const skills=Object.keys(SKILLS).filter(id=>(id!=='magic'||w.mage)&&skillLevel(w,id)<5).sort((a,b)=>(skillLevel(w,b)+((actorWorkPreferences(w)?.values)?.[({farming:'food',woodcutting:'wood',mining:'stone'})[b]]??0))-(skillLevel(w,a)+((actorWorkPreferences(w)?.values)?.[({farming:'food',woodcutting:'wood',mining:'stone'})[a]]??0)));
   if(!skills.length){(ensureActorAmbitions(w).after)=e.time+60;continue;}const weighted=skills.map(id=>({id,weight:1+skillLevel(w,id)*.5+((actorWorkPreferences(w)?.values)?.[({farming:'food',woodcutting:'wood',mining:'stone'})[id]]??0)*2}));let roll=e.random()*weighted.reduce((n,s)=>n+s.weight,0);record.skill=weighted.find(s=>(roll-=s.weight)<0)?.id??skills[0];record.goal=skillLevel(w,record.skill)+1;
  }else if(kind==='reconcile'){const peer=rivals[Math.floor(e.random()*rivals.length)];record.targetId=peer.id;record.baseline=lifeRelation(e.life,w.id,peer.id).meetings;}
  else if(kind==='explore')record.baseline=(actorAmbitions(w)?.explorationVisits)??0;
  (ensureActorAmbitions(w).current)=record;
 }
}
export function noticeAmbitionEvent(world,v){
 const e=world.resource('Village');
 const w=e.workers.find(w=>w.id===v.workerId);if(!w)return;
 if(v.type==='exploration-arrived'||v.type==='treasure-opened'||v.type==='expedition-cue'&&v.reason==='grove-discovered'||v.type==='ping-response'&&v.arrived)(ensureActorAmbitions(w).explorationVisits)=((actorAmbitions(w)?.explorationVisits)??0)+1;
}
export function pursueAmbition(world,w){
 const e=world.resource('Village');
 if(!(actorAmbitions(w)?.current)||!healthy(w)||(personAge(w)?.child)||w.state!=='idle'||w.wait>0||((actorAmbitions(w)?.tryAt)??0)>e.time||e.raids?.alarmUntil>e.time)return false;
 (ensureActorAmbitions(w).tryAt)=e.time+((actorAmbitions(w)?.dreamUntil)?7:12);
 if((actorAmbitions(w)?.current).kind==='reconcile'||(actorAmbitions(w)?.current).kind==='family'){ensureActorSocialActivity(w).socialAfter=Math.min(actorSocialActivity(w)?.socialAfter,e.time);return lifeSocial(e.life,w);}
 if((actorAmbitions(w)?.current).kind==='explore'||(actorAmbitions(w)?.current).kind==='mastery'&&(actorAmbitions(w)?.current).skill==='exploring'){w.exploreAfter=Math.min(w.exploreAfter??0,e.time);return ((domainState)=>domainState==null?undefined:(discoveryChoose(domainState,w)))(e.discovery)??false;}
 return false;
}
const valid=a=>a&&Number.isFinite(a.at)&&a.at>=0&&['mastery','family','explore','reconcile'].includes(a.kind)&&(a.kind!=='mastery'||!!SKILLS[a.skill]&&Number.isInteger(a.goal)&&a.goal>=1&&a.goal<=5)&&(a.kind!=='reconcile'||Number.isSafeInteger(a.targetId))&&(!['explore','reconcile'].includes(a.kind)||Number.isFinite(a.baseline)&&a.baseline>=0);
export function validAmbitions(w){return (!(actorAmbitions(w)?.current)||valid((actorAmbitions(w)?.current)))&&(!(actorAmbitions(w)?.history)||Array.isArray((actorAmbitions(w)?.history))&&(actorAmbitions(w)?.history).length<=8&&(actorAmbitions(w)?.history).every(a=>valid(a)&&Number.isFinite(a.endedAt)&&['fulfilled','lost-opportunity'].includes(a.outcome)));}
