const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonnegative=v=>Number.isFinite(v)&&v>=0;
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
const strict=(owner,fields,test)=>r=>record(r)&&record(r[owner])&&Object.keys(r).every(k=>k===owner||fields.includes(k))&&test(r);
const sites=v=>Array.isArray(v)&&new Set(v.map(s=>s?.id)).size===v.length&&v.every(s=>record(s)&&typeof s.id==='string'&&Number.isFinite(s.x)&&Number.isFinite(s.z));
const materials=v=>record(v)&&Object.keys(v).every(k=>['wood','stone'].includes(k))&&['wood','stone'].every(k=>nonnegative(v[k]));
export const HousingSchedule={name:'HousingSchedule',validate:strict('housing',['nextCheck','nextMove'],r=>nonnegative(r.nextCheck)&&nonnegative(r.nextMove))};
export const HousingAccounting={name:'HousingAccounting',validate:strict('housing',['completed','consumed'],r=>Number.isSafeInteger(r.completed)&&r.completed>=0&&materials(r.consumed))};
export const HousingSites={name:'HousingSites',validate:strict('housing',['sites','chapelSites','towerSites','campsEnabled'],r=>sites(r.sites)&&sites(r.chapelSites)&&optional(r,'towerSites',sites)&&typeof r.campsEnabled==='boolean')};
export const ActorConstructionTask={name:'ActorConstructionTask',validate:strict('person',['projectId','cargo','retryAt'],r=>optional(r,'projectId',v=>v===null||typeof v==='string')&&optional(r,'retryAt',nonnegative)&&optional(r,'cargo',v=>v===null||record(v)&&Object.keys(v).every(k=>['projectId','kind','amount'].includes(k))&&typeof v.projectId==='string'&&['wood','stone'].includes(v.kind)&&nonnegative(v.amount)))};
export const ConstructionProgress={name:'ConstructionProgress',validate:strict('project',['state','stage','delivered','strikes','reservedBy','spent','lastHitAt','rebuilding'],r=>optional(r,'state',v=>typeof v==='string')&&['stage','strikes'].every(k=>optional(r,k,v=>Number.isSafeInteger(v)&&v>=0))&&optional(r,'delivered',nonnegative)&&optional(r,'reservedBy',v=>v===null||Number.isSafeInteger(v)&&v>=0)&&optional(r,'spent',v=>record(v)&&Object.keys(v).every(k=>['wood','stone'].includes(k))&&['wood','stone'].every(k=>optional(v,k,nonnegative)))&&optional(r,'lastHitAt',Number.isFinite)&&optional(r,'rebuilding',v=>typeof v==='boolean'))};
export const ConstructionDefinition={name:'ConstructionDefinition',validate:strict('project',['stages'],r=>Array.isArray(r.stages)&&r.stages.every(s=>record(s)&&typeof s.id==='string'&&['wood','stone'].includes(s.kind)&&nonnegative(s.amount)&&Number.isFinite(s.strikes)&&s.strikes>0))};
export const housingDomains=[
 {definition:ConstructionProgress,key:'constructionProgress',owner:'project',kind:'ConstructionProject',required:false,fields:['state','stage','delivered','strikes','reservedBy','spent','lastHitAt','rebuilding']},
 {definition:ConstructionDefinition,key:'constructionDefinitions',owner:'project',kind:'ConstructionProject',required:false,fields:['stages']},
 {definition:HousingSchedule,key:'housingSchedules',owner:'housing',kind:'Housing',fields:['nextCheck','nextMove']},
 {definition:HousingAccounting,key:'housingAccounting',owner:'housing',kind:'Housing',fields:['completed','consumed']},
 {definition:HousingSites,key:'housingSites',owner:'housing',kind:'Housing',fields:['sites','chapelSites','towerSites','campsEnabled']}
];
export function housingInput(value,kind){return housingDomains.filter(s=>s.kind===kind).flatMap(spec=>{const keys=spec.fields.filter(k=>Object.hasOwn(value,k));if(!keys.length)return [];const row={[spec.owner]:value};for(const k of keys)row[k]=value[k];if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');return [{...spec,row,keys}];});}
export function constructionTaskInput(person){const fields={houseId:'projectId',houseCargo:'cargo',houseRetryAt:'retryAt'},keys=Object.keys(fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];const row={person};for(const k of keys)row[fields[k]]=person[k];if(!ActorConstructionTask.validate(row))throw Error('Invalid ActorConstructionTask input');return [{definition:ActorConstructionTask,row,keys}];}
