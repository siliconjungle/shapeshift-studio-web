import {acornTarget,placeAcorn} from './village-acorns.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {resourceGrowth} from "./ecs/resource-state.js";
import {actorPersonality} from "./ecs/personality-actors.js";
import {actorAmbitions,ensureActorAmbitions} from "./ecs/development-actors.js";
import {animalSpatial,animalLifecycle,ensureAnimalState,animalEncounter} from './ecs/animal-state.js';
import {ensureWildlifeParticipant} from './ecs/animal-participants.js';
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {survivalInterrupt} from './village-survival.js';
import {lifeRelation} from './village-life.js';
import {animalBond,animalTrust} from './animal-relationships.js';
import {spawnWildlife} from './village-wildlife.js';
import {flyBird} from './village-birds.js';
import {SKILLS,skillLevel} from './village-skills.js';
import {allShelters} from './camp-rules.js';
const dist=(a,b)=>{const p=animalSpatial(a)??a,q=animalSpatial(b)??b;return Math.hypot(p.x-q.x,p.z-q.z)};
export const isNatureWish=k=>['animal-bond','call-wild','dream','acorn'].includes(k);
export function natureWishTarget(e,kind,target){
 if(kind==='acorn')return acornTarget(e,target);
 const invalid=reason=>({valid:false,reason});
 if(kind==='dream'){
  const house=target.kind==='house'&&allShelters(e).find(h=>h.id===target.id);
  const sleepers=e.workers.filter(w=>!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&w.state==='sleeping'&&(house?((actorInterior(w)?.insideAt)?.id??(actorResidence(w)?.home)?.id)===house.id:target.kind==='villager'&&w.id===target.id)&&!w.pendingDream&&(w.dreamAfter??0)<=e.time);
  const actor=sleepers.sort((a,b)=>(a.lastDreamAt??-1)-(b.lastDreamAt??-1))[0];
  return actor?{valid:true,actor,point:house?.door??actor,label:'Inspire '+actor.name+' in their sleep'}:invalid('Choose a home with a sleeping adult who has not just dreamed');
 }
 if(kind==='animal-bond'){
  const animals=[...(e.wildlife?.animals??[]),...(e.birds?.flock??[])].filter(a=>!actorVitality(a).dead&&!animalLifecycle(a).gone);
  const animal=animals.find(a=>a.id===target.id),person=target.kind==='villager'&&e.workers.find(w=>w.id===target.id),point=animal??person??target;
  const pairs=[];for(const a of animal?[animal]:animals)for(const w of person?[person]:e.workers)if(!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&dist(w,a)<=7&&dist(a,point)<=7&&animalTrust(w,a)<.95)pairs.push({animal:a,actor:w,point:animalSpatial(a)});
  const pair=pairs.sort((a,b)=>dist(a.actor,a.animal)-dist(b.actor,b.animal))[0];
  return pair?{valid:true,...pair,label:pair.actor.name+' + '+(pair.animal.species==='bird'?'bird':'woodland companion')}:invalid('Bring a villager near an animal');
 }
 const rawPoint=target.actor??target.anchor??target,point=animalSpatial(rawPoint)??rawPoint;
 if(!e.wildlife||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!Number.isFinite(e.heightAt(point.x,point.z))||!e.route(e.depot,point))return invalid('Choose reachable ground');
 if(e.wildlife.call?.until>e.time)return invalid('The wild is already answering a call');
 return {valid:true,point:{x:point.x,z:point.z},label:'Invite wildlife to linger here'};
}
export function castNatureWish(e,kind,check){
 if(kind==='acorn'){placeAcorn(e,check);return;}
 if(kind==='animal-bond'){
  const {actor:w,animal:a}=check;animalBond(e,w,a,.7);ensureWildlifeParticipant(w).nextAt=e.time;actorNeeds(w).social=Math.min(100,actorNeeds(w).social+15);ensureAnimalState(a,'AnimalEncounter').scaredUntil=0;ensureAnimalState(a,'AnimalExpression').reaction='love';ensureAnimalState(a,'AnimalExpression').reactionAt=e.time;
  if(animalEncounter(a).hunterId!=null){const hunter=e.workers.find(p=>p.id===animalEncounter(a).hunterId);if(hunter===w)survivalInterrupt(e.survival,hunter);}
  e.emit(a.species==='bird'?'bird-react':'wildlife-react',null,null,{animalId:a.id,birdId:a.id,reaction:'love'});e.emit('wildlife-friendly',w,null,{animalId:a.id});return;
 }
 if(kind==='dream'){
  const w=check.actor;w.pendingDream={at:e.time};w.lastDreamAt=e.time;w.dreamAfter=e.time+120;e.emit('wish-dream',w);return;
 }
 e.wildlife.call={...check.point,until:e.time+90};
 if(!e.wildlife.animals.some(a=>!actorVitality(a).dead&&!animalLifecycle(a).gone))spawnWildlife(e);
 for(const a of e.wildlife.animals.filter(a=>!actorVitality(a).dead&&!animalLifecycle(a).gone&&animalEncounter(a).hunterId===null)){const angle=e.random()*Math.PI*2,p={x:check.point.x+Math.cos(angle)*2,z:check.point.z+Math.sin(angle)*2},route=e.route(animalSpatial(a),p);if(route){ensureAnimalState(a,'AnimalMotion').route=route;ensureAnimalState(a,'AnimalMotion').wait=6;ensureAnimalState(a,'AnimalEncounter').callUntil=e.time+90;}}
 for(const b of e.birds?.flock??[]){if(actorVitality(b).dead||animalLifecycle(b).gone)continue;const perch=e.nodes.filter(n=>['wood','stone'].includes(n.kind)&&resourceGrowth(n)?.state==='ready'&&dist(n,check.point)<7).sort((a,c)=>dist(a,check.point)-dist(c,check.point))[0];if(perch){ensureAnimalState(b,'BirdForaging').stealAfter=e.time+90;ensureAnimalState(b,'BirdDefence').swoopAfter=e.time+90;flyBird(e,b,{x:perch.x,z:perch.z,y:e.heightAt(perch.x,perch.z)+(perch.base??4)*.67,perch:{kind:'node',id:perch.id}});}}
 e.emit('wish-call-wild',null,null,{x:check.point.x,z:check.point.z});
}
export function updateDreams(e){
 for(const w of e.workers){if((actorAmbitions(w)?.dreamUntil)<=e.time)delete actorAmbitions(w)?.dreamUntil;if(!w.pendingDream||(actorVitality(w)?.dead)||w.state==='sleeping'||(actorInterior(w)?.inside))continue;delete w.pendingDream;
  // A dream strengthens an existing intention rather than arbitrarily erasing it.
  if(!(actorAmbitions(w)?.current)){
   const peer=e.workers.find(p=>p!==w&&!(actorVitality(p)?.dead)&&(lifeRelation(e.life,w.id,p.id)?.meetings??0)>0&&(lifeRelation(e.life,w.id,p.id)?.affinity??1)<.1);
   if(peer)(ensureActorAmbitions(w).current)={kind:'reconcile',at:e.time,targetId:peer.id,baseline:lifeRelation(e.life,w.id,peer.id).meetings};
   else if(['outgoing','playful'].includes((actorPersonality(w)?.trait))&&e.discovery)(ensureActorAmbitions(w).current)={kind:'explore',at:e.time,baseline:(actorAmbitions(w)?.explorationVisits)??0};
   else {const skills=Object.keys(SKILLS).filter(s=>(s!=='magic'||w.mage)&&skillLevel(w,s)<5);const skill=skills[Math.floor(e.random()*skills.length)];if(skill)(ensureActorAmbitions(w).current)={kind:'mastery',at:e.time,skill,goal:skillLevel(w,skill)+1};}
  }
  (ensureActorAmbitions(w).dreamUntil)=e.time+180;(ensureActorAmbitions(w).fulfilledUntil)=e.time+35;(ensureActorAmbitions(w).tryAt)=e.time;w.dreamMemory='Woke with a clear dream of what I could become';e.emit('dream-inspired',w);
 }
}
export function validNatureWishes(e){
 const call=e.wildlife?.call;
 return (!call||[call.x,call.z,call.until].every(Number.isFinite)&&call.until>=0)&&e.workers.every(w=>(!w.pendingDream||Number.isFinite(w.pendingDream.at)&&w.pendingDream.at>=0)&&['lastDreamAt','dreamAfter'].every(k=>w[k]===undefined||Number.isFinite(w[k])&&w[k]>=0));
}
