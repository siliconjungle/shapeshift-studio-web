import {ensureAnimalState,animalLifecycle,animalEncounter} from './ecs/animal-state.js';
import {animalRelationships,ensureAnimalRelationships} from './ecs/animal-participants.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
// Non-romantic trust records owned by the simulation, shared by birds and wildlife.
const clamp=v=>Math.max(-1,Math.min(1,v));
export const animalTrust=(w,a)=>animalRelationships(w)?.bonds?.find(r=>r.id===a.id)?.trust??0;
export function animalBond(e,w,a,amount=.2){
 ensureAnimalRelationships(w).bonds??=[];let r=animalRelationships(w)?.bonds.find(r=>r.id===a.id);
 if(!r){r={id:a.id,name:a.species==='bird'?({hearth:'Raven',solis:'Sand starling',cryos:'Snow jay'})[a.culture]:({hearth:'Woodland deer',solis:'Dune gazelle',cryos:'Snow reindeer'})[a.culture],trust:0,meetings:0,lastAt:e.time,dead:false};animalRelationships(w)?.bonds.push(r);if(animalRelationships(w)?.bonds.length>24)animalRelationships(w)?.bonds.shift();}
 r.trust=clamp(r.trust+amount);r.meetings++;r.lastAt=e.time;
 if(amount>0&&r.trust>=.5){ensureAnimalState(a,'AnimalEncounter').companionId=w.id;delete ensureAnimalState(a,'AnimalLifecycle').leavingAt;ensureAnimalState(a,'AnimalLifecycle').leaveAt=Math.max(animalLifecycle(a).leaveAt??0,e.time+300);}
 if(amount<0&&animalEncounter(a).companionId===w.id)delete ensureAnimalState(a,'AnimalEncounter').companionId;
 return r;
}
export function mournAnimal(e,a,killer){
 for(const w of e.workers){const r=animalRelationships(w)?.bonds?.find(r=>r.id===a.id);if(!r)continue;r.dead=true;
 // A companion recognises their absence eventually; violent witness reactions
 // remain line-of-sight based in the wildlife system.
 if(r.trust>=.5&&!(actorVitality(w)?.dead)){ensureAnimalRelationships(w).griefUntil=e.time+90;actorNeeds(w).social=Math.max(0,actorNeeds(w).social-20);e.emit('wildlife-grief',w,null,{animalId:a.id,hunterId:killer?.id});}
 }
}
export function validAnimalBonds(e){return e.workers.every(w=>!animalRelationships(w)?.bonds||Array.isArray(animalRelationships(w)?.bonds)&&animalRelationships(w)?.bonds.length<=24&&new Set(animalRelationships(w)?.bonds.map(r=>r.id)).size===animalRelationships(w)?.bonds.length&&animalRelationships(w)?.bonds.every(r=>typeof r.id==='string'&&typeof r.name==='string'&&Number.isFinite(r.trust)&&Math.abs(r.trust)<=1&&Number.isSafeInteger(r.meetings)&&r.meetings>=0&&Number.isFinite(r.lastAt)&&typeof r.dead==='boolean'));}
