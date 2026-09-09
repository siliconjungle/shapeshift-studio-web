const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>Number.isFinite(v)&&v>=0,ids=v=>Array.isArray(v)&&v.length<=2&&v.every(n=>Number.isSafeInteger(n)&&n>=0)&&new Set(v).size===v.length;
export class VillageFamily {}
export const FamilyIdentity={name:'FamilyIdentity',replaceable:false,validate:r=>r instanceof VillageFamily&&record(r.economy)&&record(r.care)&&Object.keys(r).every(k=>['economy','care'].includes(k))};
export const FamilyConfiguration={name:'FamilyConfiguration',validate:r=>record(r)&&record(r.family)&&(finite(r.populationLimit)||r.populationLimit===Infinity)&&ids(r.parents)&&Object.keys(r).every(k=>['family','parents','populationLimit'].includes(k))};
export const FamilySchedule={name:'FamilySchedule',validate:r=>record(r)&&record(r.family)&&finite(r.nextVisit)&&finite(r.nextBirth)&&r.birthCooldowns instanceof Map&&[...r.birthCooldowns].every(([k,v])=>typeof k==='string'&&/^\d+:\d+$/.test(k)&&finite(v))&&Object.keys(r).every(k=>['family','nextVisit','nextBirth','birthCooldowns'].includes(k))};
export const FamilyHistory={name:'FamilyHistory',validate:r=>record(r)&&record(r.family)&&Number.isSafeInteger(r.born)&&r.born>=0&&finite(r.foodConsumed)&&Object.keys(r).every(k=>['family','born','foodConsumed'].includes(k))};
export const BirthPlan={name:'BirthPlan',validate:p=>record(p)&&record(p.family)&&finite(p.arrivesAt)&&record(p.home)&&(p.parents==null||ids(p.parents)&&p.parents.length===2)};
export const familyDomains=[
 {definition:FamilyConfiguration,key:'familyConfigurations',fields:['populationLimit','parents'],access:'familyConfiguration'},
 {definition:FamilySchedule,key:'familySchedules',fields:['nextVisit','nextBirth','birthCooldowns'],access:'familySchedule'},
 {definition:FamilyHistory,key:'familyHistories',fields:['born','foodConsumed'],access:'familyHistory'}
];
