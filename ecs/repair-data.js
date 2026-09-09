const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonnegative=v=>Number.isFinite(v)&&v>=0;
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const strict=(owner,fields,test)=>r=>record(r)&&record(r[owner])&&Object.keys(r).every(k=>k===owner||fields.includes(k))&&test(r);
export const ActorRepairTask={name:'ActorRepairTask',validate:strict('person',['homeId','cargo','retryAt','inspectUntil'],r=>optional(r,'homeId',v=>v===null||typeof v==='string')&&['retryAt','inspectUntil'].every(k=>optional(r,k,nonnegative))&&optional(r,'cargo',v=>v===null||record(v)&&Object.keys(v).every(k=>['kind','amount'].includes(k))&&['wood','stone'].includes(v.kind)&&nonnegative(v.amount)))};
export const RepairSchedule={name:'RepairSchedule',validate:strict('recovery',['nextCheck'],r=>nonnegative(r.nextCheck))};
export const RepairAccounting={name:'RepairAccounting',validate:strict('recovery',['repaired','consumed'],r=>nonnegative(r.repaired)&&record(r.consumed)&&Object.keys(r.consumed).every(k=>['wood','stone'].includes(k))&&['wood','stone'].every(k=>nonnegative(r.consumed[k])))};
export const RepairJob={name:'RepairJob',validate:r=>record(r)&&Object.keys(r).every(k=>['homeId','reservedBy','inspectedAt','batches','strikes'].includes(k))&&typeof r.homeId==='string'&&(r.reservedBy===null||integer(r.reservedBy))&&(r.inspectedAt===null||nonnegative(r.inspectedAt))&&integer(r.batches)&&integer(r.strikes)};
export const RecoveryIdentity={name:'RecoveryIdentity',replaceable:false,validate:r=>record(r)&&Array.isArray(r.repairs)&&Array.isArray(r.escorts)};
export const repairDomains=[{definition:RepairSchedule,key:'repairSchedules',fields:['nextCheck']},{definition:RepairAccounting,key:'repairAccounting',fields:['repaired','consumed']}];
export function repairTaskInput(person){const fields={repairId:'homeId',repairCargo:'cargo',repairAfter:'retryAt',repairUntil:'inspectUntil'},keys=Object.keys(fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];const row={person};for(const k of keys)row[fields[k]]=person[k];if(!ActorRepairTask.validate(row))throw Error('Invalid ActorRepairTask input');return [{definition:ActorRepairTask,row,keys}];}
