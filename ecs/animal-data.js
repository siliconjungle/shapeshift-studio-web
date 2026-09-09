const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const finite=(r,keys)=>keys.every(k=>optional(r,k,Number.isFinite));
const point=p=>record(p)&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const base=r=>record(r)&&record(r.person);
export const Wildlife={name:'Wildlife',replaceable:false,validate:r=>record(r)&&typeof r.id==='string'&&typeof r.culture==='string'};
export const Bird={name:'Bird',replaceable:false,validate:r=>record(r)&&typeof r.id==='string'&&r.species==='bird'&&typeof r.culture==='string'};
export const BirdNest={name:'BirdNest',replaceable:false,validate:r=>record(r)&&typeof r.id==='string'&&typeof r.treeId==='string'&&point(r)&&finite(r,['treeBornAt','height','offset','createdAt','lostAt'])&&typeof r.lost==='boolean'};
export const AnimalSpatial={name:'AnimalSpatial',validate:r=>base(r)&&finite(r,['x','y','z'])};
export const AnimalMotion={name:'AnimalMotion',validate:r=>base(r)&&finite(r,['phase','speed','wait','repathAt'])&&optional(r,'state',v=>typeof v==='string')&&optional(r,'facing',v=>['left','right','front','back'].includes(v))&&optional(r,'home',point)&&optional(r,'route',v=>Array.isArray(v)&&v.every(point))};
export const AnimalLifecycle={name:'AnimalLifecycle',validate:r=>base(r)&&finite(r,['bornAt','leaveAt','leavingAt','deathY'])&&optional(r,'gone',v=>typeof v==='boolean')};
export const AnimalExpression={name:'AnimalExpression',validate:r=>base(r)&&finite(r,['hitAt','reactionAt','reactAfter','callAfter'])&&optional(r,'reaction',v=>typeof v==='string')};
export const AnimalEncounter={name:'AnimalEncounter',validate:r=>base(r)&&finite(r,['alertUntil','scaredUntil','callUntil','companionCheck'])&&['hunterId','friendId','companionId'].every(k=>optional(r,k,v=>v===null||Number.isSafeInteger(v)&&v>=0))&&optional(r,'protectedBy',v=>Array.isArray(v)&&v.every(Number.isSafeInteger))&&optional(r,'meatDropId',v=>Number.isSafeInteger(v)||typeof v==='string')};
const perch=p=>p===null||record(p)&&['nest','node'].includes(p.kind)&&typeof p.id==='string';
export const BirdFlight={name:'BirdFlight',validate:r=>base(r)&&finite(r,['waitUntil','landedAt'])&&optional(r,'nestId',v=>typeof v==='string')&&optional(r,'perch',perch)&&optional(r,'flight',f=>f===null||record(f)&&point(f.from)&&point(f.to)&&[f.from.y,f.to.y,f.at,f.duration,f.arc].every(Number.isFinite)&&f.duration>0&&f.duration<120&&f.arc>=0&&typeof f.arrive==='string')};
export const BirdForaging={name:'BirdForaging',validate:r=>base(r)&&finite(r,['stealAfter'])&&optional(r,'cropId',v=>typeof v==='string')&&optional(r,'carrying',v=>typeof v==='boolean')};
export const BirdDefence={name:'BirdDefence',validate:r=>base(r)&&finite(r,['swoopAfter'])&&optional(r,'swoopHit',v=>typeof v==='boolean')&&['defenderId','targetId'].every(k=>optional(r,k,v=>v===null||Number.isSafeInteger(v)&&v>=0))};
export const SnakeEncounter={name:'SnakeEncounter',validate:r=>base(r)&&Object.keys(r).every(k=>['person','waitUntil','biteAfter','warningAt','struckAt','targetId'].includes(k))&&finite(r,['waitUntil','biteAfter','warningAt','struckAt'])&&optional(r,'targetId',v=>Number.isSafeInteger(v)&&v>=0)};
export const animalComponents=Object.freeze([
 {definition:AnimalSpatial,key:'animalSpatial',fields:['x','y','z']},
 {definition:AnimalMotion,key:'animalMotion',fields:['state','route','home','facing','phase','speed','wait','repathAt']},
 {definition:AnimalLifecycle,key:'animalLifecycle',fields:['bornAt','leaveAt','leavingAt','gone','deathY']},
 {definition:AnimalExpression,key:'animalExpression',fields:['hitAt','reaction','reactionAt','reactAfter','callAfter']},
 {definition:AnimalEncounter,key:'animalEncounter',fields:['hunterId','friendId','companionId','alertUntil','scaredUntil','protectedBy','meatDropId','callUntil','companionCheck']},
 {definition:SnakeEncounter,key:'snakeEncounters',fields:['waitUntil','biteAfter','warningAt','struckAt','targetId'],kind:'Wildlife'},
 {definition:BirdFlight,key:'birdFlights',fields:['nestId','perch','flight','waitUntil','landedAt'],kind:'Bird'},
 {definition:BirdForaging,key:'birdForaging',fields:['stealAfter','cropId','carrying'],kind:'Bird'},
 {definition:BirdDefence,key:'birdDefence',fields:['swoopAfter','swoopHit','defenderId','targetId'],kind:'Bird'}
]);
export function animalInput(person,kind){return animalComponents.flatMap(spec=>{
 if(spec.kind&&spec.kind!==kind)return [];
 const keys=spec.fields.filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];
 const row={person};for(const k of keys)row[k]=person[k];if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');return [{...spec,row,keys}];
});}

// Live collection insertion requires a complete spawn record. Save hydration
// restores identities first and component rows afterwards through its own boundary.
export function validateAnimalSpawnInput(actor,kind){
 const common=['x','z','health','dead','state','facing','phase','bornAt','gone'];
 const fields=actor.species==='snake'?['home','route','speed','leaveAt','waitUntil','biteAfter']:kind==='Bird'?['y','nestId','waitUntil','stealAfter','swoopAfter','flight','carrying']:['home','route','speed','wait','leaveAt','hunterId','friendId','alertUntil','scaredUntil','protectedBy'];
 if([...common,...fields].some(k=>!Object.hasOwn(actor,k)||actor[k]===undefined))throw Error('Incomplete '+kind+' spawn record');
}
