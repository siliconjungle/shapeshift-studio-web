import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {actorSkills,actorAmbitions} from "./ecs/development-actors.js";
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {SKILLS,SKILL_THRESHOLDS,skillLevel,gainSkill} from './village-skills.js';
export const SKILL_WISHES=Object.freeze(Object.fromEntries(Object.entries(SKILLS).filter(([id])=>!['magic','acting'].includes(id)).map(([skill,s])=>['upgrade-'+skill,{name:'Improve '+s.name,colour:'#ebca73',art:'assets/vector/wishes/cards/upgrade-'+skill+'.svg',skill,hint:'Raise a villager’s '+s.name.toLowerCase()+' by one level. Everyone can use this skill from the start and improve through practice; adults can reach level 5.'}])));
export const isSkillWish=id=>Object.hasOwn(SKILL_WISHES,id);
export function skillWishEligible(w,id){
 const def=SKILL_WISHES[id];if(!def||!w||(actorVitality(w)?.dead)||w.exiled||w.divineHeld||(actorInterior(w)?.inside)||w.rivalJourney||(personAge(w)?.child)&&def.skill==='combat')return false;
 return skillLevel(w,def.skill)<((personAge(w)?.child)?2:5);
}
export function skillWishTarget(e,id,target){const w=target?.kind==='villager'&&e.workers.find(w=>w.id===target.id);return skillWishEligible(w,id)?{valid:true,actor:w,point:w,label:SKILL_WISHES[id].name+' · '+w.name}:{valid:false,reason:'Choose an outdoor villager who has room to improve this skill'};}
export function castSkillWish(e,id,w){const def=SKILL_WISHES[id],next=skillLevel(w,def.skill)+1;return gainSkill(e,w,def.skill,SKILL_THRESHOLDS[next]-((actorSkills(w)?.values)?.[def.skill]?.xp??0),'miracle');}
export function skillWishWeights(e){return Object.fromEntries(Object.entries(SKILL_WISHES).map(([id,def])=>{const eligible=e.workers.filter(w=>skillWishEligible(w,id)),interested=eligible.some(w=>(actorAmbitions(w)?.current)?.skill===def.skill);return [id,eligible.length?(interested?.7:.18):0];}));}

// The brief learning-card prototype never gates a worker's abilities. Preserve
// held cards from that prototype by upgrading them into improvement cards.
export function migrateSkillCards(e){
 if(!e)return;const map=id=>typeof id==='string'&&id.startsWith('learn-')&&SKILLS[id.slice(6)]?'upgrade-'+id.slice(6):id;
 const list=a=>Array.isArray(a)?a.map(map):a,s=e.wishes,b=e.belief;
 if(s){s.queue=list(s.queue);s.draw=list(s.draw);s.reserve=map(s.reserve);}
 if(b){for(const key of ['known','favoured'])if(Array.isArray(b[key])&&b[key].some(id=>map(id)!==id))b[key]=[...new Set(b[key].map(map))];
  for(const o of b.offers??[]){if(!Array.isArray(o.options)||!o.options.some(c=>map(c?.id)!==c?.id))continue;const seen=new Set();o.options=o.options.map(c=>{let id=map(c.id);if(seen.has(id))id=Object.keys(SKILL_WISHES).find(id=>!seen.has(id)&&!o.options.some(c=>map(c.id)===id))??id;seen.add(id);return {...c,id,mode:b.known?.includes(id)?'favour':'learn'};});}
 }
}
