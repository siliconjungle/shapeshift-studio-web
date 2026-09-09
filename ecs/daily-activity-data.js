const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),optional=(r,k,test)=>r[k]===undefined||test(r[k]);
const hour=v=>Number.isFinite(v)&&v>=0&&v<24,clock=v=>Number.isFinite(v),id=v=>v===null||Number.isSafeInteger(v)&&v>=0;
export const ActorSleep={name:'ActorSleep',validate:r=>record(r)&&record(r.person)&&['bedtime','wakeHour'].every(k=>optional(r,k,hour))&&Object.keys(r).every(k=>['person','bedtime','wakeHour'].includes(k))};
export const ActorDailyActivity={name:'ActorDailyActivity',validate:r=>record(r)&&record(r.person)&&['careAt','activityUntil'].every(k=>optional(r,k,clock))&&Object.keys(r).every(k=>['person','careAt','activityUntil'].includes(k))};
export const ActorSocialActivity={name:'ActorSocialActivity',validate:r=>record(r)&&record(r.person)&&optional(r,'partnerId',id)&&optional(r,'socialAfter',clock)&&optional(r,'socialWaitUntil',v=>v===null||clock(v))&&optional(r,'socialKind',v=>v===null||typeof v==='string')&&Object.keys(r).every(k=>['person','partnerId','socialAfter','socialWaitUntil','socialKind'].includes(k))};
export const dailyActivityDomains=[
 {definition:ActorSleep,key:'actorSleep',access:'actorSleep',fields:{bedtime:'bedtime',wakeHour:'wakeHour'}},
 {definition:ActorDailyActivity,key:'actorDailyActivities',access:'actorDailyActivity',fields:{careAt:'careAt',activityUntil:'activityUntil'}},
 {definition:ActorSocialActivity,key:'actorSocialActivities',access:'actorSocialActivity',fields:{partnerId:'partnerId',socialAfter:'socialAfter',socialWaitUntil:'socialWaitUntil',socialKind:'socialKind'}}
];
export function dailyActivityInput(person){return dailyActivityDomains.flatMap(({definition,fields})=>{const keys=Object.keys(fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];const row={person};for(const key of keys)row[key]=person[key];if(!definition.validate(row))throw Error('Invalid '+definition.name+' input');return [{definition,row,keys}];});}
