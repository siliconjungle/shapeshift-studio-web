const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const finiteFields=(r,keys)=>keys.every(k=>optional(r,k,Number.isFinite));
const base=r=>record(r)&&record(r.person);
const job=(j,id,kinds)=>record(j)&&typeof j[id]==='string'&&kinds.includes(j.kind)&&Number.isFinite(j.deadline)&&finiteFields(j,['startedAt','repathAt'])&&optional(j,'clock',v=>typeof v==='boolean');
export const WildlifeParticipant={name:'WildlifeParticipant',validate:r=>base(r)&&optional(r,'job',j=>job(j,'animalId',['hunt','befriend','protect','butcher']))&&finiteFields(r,['nextAt'])&&optional(r,'meal',v=>typeof v==='boolean')};
export const BirdParticipant={name:'BirdParticipant',validate:r=>base(r)&&optional(r,'job',j=>job(j,'birdId',['scare','swat']))&&finiteFields(r,['nextAt','swoopedAfter'])};
const bond=r=>record(r)&&typeof r.id==='string'&&typeof r.name==='string'&&Number.isFinite(r.trust)&&Math.abs(r.trust)<=1&&Number.isSafeInteger(r.meetings)&&r.meetings>=0&&Number.isFinite(r.lastAt)&&typeof r.dead==='boolean';
export const AnimalRelationships={name:'AnimalRelationships',validate:r=>base(r)&&finiteFields(r,['griefUntil'])&&optional(r,'bonds',v=>Array.isArray(v)&&v.length<=24&&new Set(v.map(r=>r?.id)).size===v.length&&v.every(bond))};
export const animalParticipationDomains=Object.freeze([
 {definition:WildlifeParticipant,key:'wildlifeParticipants',fields:{wildlifeJob:'job',wildlifeAfter:'nextAt',wildlifeMeal:'meal'}},
 {definition:BirdParticipant,key:'birdParticipants',fields:{birdJob:'job',birdAfter:'nextAt',birdSwoopedAfter:'swoopedAfter'}},
 {definition:AnimalRelationships,key:'animalRelationships',fields:{animalBonds:'bonds',wildlifeGriefUntil:'griefUntil'}}
]);
// Old field names are consumed once when an actor/save enters the world.
export function animalParticipationInput(person){return animalParticipationDomains.flatMap(spec=>{
 const keys=Object.keys(spec.fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];
 const row={person};for(const key of keys)row[spec.fields[key]]=person[key];
 if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');
 return [{...spec,row,keys}];
});}
