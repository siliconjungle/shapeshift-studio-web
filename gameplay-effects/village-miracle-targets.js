import {actorInterior,ensureActorInterior} from './../ecs/actor-interior.js';
import {actorNeeds} from "../ecs/actor-needs.js";
import {lifeRelation} from "../village-life.js";
import {actorRomance} from "../ecs/actor-romance.js";
import {personAge} from "../ecs/person-age.js";
import {actorVitality} from "../ecs/actor-vitality.js";
import {poisoned} from '../village-poison.js';
import {relicSpatial} from "../ecs/relic-entities.js";
import {villageActor as wishActor,villageTargetCheck} from './village-targets.js';
import {relicById} from '../village-relics.js';
import {isNatureWish,natureWishTarget} from '../nature-wishes.js';
import {isFaunaWish,faunaWishTarget} from '../village-rats-owls.js';
import {uprisingTarget} from '../uprising-wish.js';
import {behaviourWishTarget} from '../behaviour-wishes.js';
import {isSkillWish,skillWishTarget} from '../skill-wishes.js';
import {allShelters} from '../camp-rules.js';
import {visibleAt} from '../village-exploration.js';
import {socialPeople,visibleSocialPeople} from '../village-people.js';
import {ageWishTarget} from '../village-age.js';
import {WISHES} from '../wish-catalog.js';
import {isPing,pingTarget} from '../village-pings.js';
import {beastWard,beastMiracleTarget} from '../beast-miracles.js';
import {repairWishTarget} from '../god-wish-repair.js';
import {interventionTarget,socialPair} from '../divine-interventions.js';
import {resurrectionTarget} from '../village-resurrection.js';
import {newcomerTarget} from '../village-newcomer.js';
import {canFormAdultPair} from '../village-romance.js';
import {WISH_RULES} from '../wish-rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.gone;
function nearbyLoveAdults(e,point){
 return point?visibleSocialPeople(e).filter(w=>alive(w)&&!w.exiled&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&distance(w,point)<=WISH_RULES.loveRadius).sort((a,b)=>distance(a,point)-distance(b,point)||a.id-b.id):[];
}
export function lovePair(e,point){
 const near=nearbyLoveAdults(e,point);
 for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++)if(canFormAdultPair(near[i],near[j]))return [near[i],near[j]];
 return [];
}
export function miracleTarget(e,kind,target,{autonomous=false,planning=false,source={kind:'god',id:'player'}}={}){
 if(RELIC_MIRACLES[kind])return relicMiracleTarget(e,kind,target);
 const invalid=reason=>({valid:false,reason});
 if(!target)return invalid(kind==='love'?'Find two nearby adults':kind==='rain'?'Choose the ground':'Choose a target');
 const p=(target.kind==='relic'?relicSpatial(relicById(e,target.id)):null)??wishActor(e,target)??(target.kind==='structure'?beastWard(e,target):null)??e.nodes.find(n=>n.id===target.id)??(target.kind==='campfire'?(target.id==='campfire'?e.campfire:e.exploration?.camps.find(c=>c.id===target.id)?.fire):null)??(target.kind==='house'?allShelters(e).find(h=>h.id===target.id):null)??target.anchor??target;
 if(isPing(kind))return pingTarget(e,kind,p);
 if(Number.isFinite(p?.x)&&Number.isFinite(p?.z)&&!visibleAt(e,p.x,p.z))return invalid('Beyond the village’s sight');
 if(['fire','life','skull','shield'].includes(kind))return villageTargetCheck(e,kind,target);
 if(isNatureWish(kind))return natureWishTarget(e,kind,target);
 if(isFaunaWish(kind))return faunaWishTarget(e,kind,target);
 if(kind==='uprising')return uprisingTarget(e,target);
 if(kind==='violence'||kind==='sleep')return behaviourWishTarget(e,kind,target);
 if(isSkillWish(kind))return skillWishTarget(e,kind,target);
 if(WISHES[kind]?.beastOnly)return beastMiracleTarget(e,kind,target);
 if(kind==='poison'||kind==='purify'){const c=interventionTarget(e,target);if(target.kind!=='villager'||!c.valid||!actorNeeds(c.actor))return invalid('Choose a living villager outdoors');const active=poisoned(c.actor,e.time);if(kind==='purify'&&!active)return invalid('This villager is not poisoned');if(kind==='poison'&&active)return invalid('This villager is already poisoned');return c;}
 if(kind==='shield'||kind==='hand'||kind==='curse')return interventionTarget(e,target);
 if(kind==='friendship'||kind==='enmity'){const point=wishActor(e,target)??target,requested=autonomous&&target.partnerId!=null?[point,e.workers.find(w=>w.id===target.partnerId)]:null,pair=requested?(requested.every(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld)&&(planning||distance(...requested)<=3)?requested:[]):Number.isFinite(point.x)&&Number.isFinite(point.z)?socialPair(e,point):[];return pair.length?{valid:true,point,pair,label:pair.map(w=>w.name).join(' + ')}:invalid('Bring two characters within the circle')}
 if(['age-adult','age-child','age-elder'].includes(kind))return ageWishTarget(e,target);
 if(kind==='repair')return repairWishTarget(e,target);
 if(kind==='resurrect')return resurrectionTarget(e,target);
 if(kind==='newcomer')return newcomerTarget(e,wishActor(e,target)??target);
 if(kind==='heartbreak'){
  const a=['villager','beast'].includes(target.kind)&&wishActor(e,target),b=a&&socialPeople(e).find(w=>w.id===(actorRomance(a)?.sweetheartId));
  if(!alive(a)||(personAge(a)?.child)||(actorInterior(a)?.inside)||!alive(b)||(personAge(b)?.child)||(actorRomance(b)?.sweetheartId)!==a.id||!lifeRelation(e.life,a.id,b.id))return invalid('Choose someone who has a sweetheart');
  return {valid:true,point:a,pair:[a,b],label:a.name+' + '+b.name};
 }
 if(['love','rain','daybreak','nightfall','clear-skies','hot','cold','wood','stone','food'].includes(kind)){
  const point=wishActor(e,target)??target;
  if(!Number.isFinite(point.x)||!Number.isFinite(point.z)||!Number.isFinite(e.heightAt(point.x,point.z)))return invalid('Choose the ground');
  if(kind!=='love')return {valid:true,point,label:WISHES[kind].name+' over the village'};
  const requested=autonomous&&target.partnerId!=null?[wishActor(e,target),e.workers.find(w=>w.id===target.partnerId)]:null;const pair=requested?(requested.every(w=>alive(w)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.divineHeld)&&canFormAdultPair(...requested)&&(planning||distance(...requested)<=WISH_RULES.loveRadius)?requested:[]):lovePair(e,point);return pair.length?{valid:true,point,pair,label:pair.map(w=>w.name).join(' + ')}:invalid(nearbyLoveAdults(e,point).length<2?'Bring two adults within the circle':'No compatible pair here. Check their orientations and family ties.');
 }
 if(kind==='energy'){
  const actor=['villager','beast'].includes(target.kind)&&wishActor(e,target);
  if(!alive(actor)||(actorInterior(actor)?.inside)||!actorNeeds(actor))return invalid('Choose a living villager outdoors');
  return {valid:true,actor,label:actor.name};
 }
 return invalid('Unknown wish');
}
import {RELIC_MIRACLES} from '../relic-miracle-catalog.js';
import {relicMiracleTarget} from '../relic-miracles.js';
