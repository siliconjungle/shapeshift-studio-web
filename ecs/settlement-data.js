const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>Number.isFinite(v)&&v>=0,id=v=>Number.isSafeInteger(v)&&v>=0;
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]),base=r=>record(r)&&record(r.settlement),unit=v=>finite(v)&&v<=1;
export const SettlementEconomy={name:'SettlementEconomy',validate:r=>base(r)&&record(r.stock)&&['food','wood','stone'].every(k=>finite(r.stock[k]))};
export const SettlementDevelopment={name:'SettlementDevelopment',validate:r=>base(r)&&unit(r.prosperity)&&finite(r.development)&&id(r.capacity)&&r.capacity>=2&&finite(r.generated)&&['displaced','weatherLossAfter'].every(k=>optional(r,k,finite))&&optional(r,'lastSetback',v=>v===null||record(v)&&['failed-harvest','damaged-homes'].includes(v.kind)&&Number.isFinite(v.at))};
export const SettlementSchedule={name:'SettlementSchedule',validate:r=>base(r)&&finite(r.nextTick)&&finite(r.nextVisit)};
export const SettlementDiplomacy={name:'SettlementDiplomacy',validate:r=>base(r)&&Number.isFinite(r.reputation)&&Math.abs(r.reputation)<=1&&finite(r.grievance)&&r.grievance<=2&&finite(r.warUntil)&&(r.raidAt===null||finite(r.raidAt))&&optional(r,'raidMotive',v=>v===null||typeof v==='string')&&['failedTrades','aidedUntil'].every(k=>optional(r,k,finite))};
export const SettlementHistory={name:'SettlementHistory',validate:r=>base(r)&&Array.isArray(r.history)&&r.history.length<=40&&r.history.every(h=>record(h)&&typeof h.kind==='string'&&finite(h.at)&&Number.isSafeInteger(h.personId))};
export const SettlementCouncil={name:'SettlementCouncil',validate:r=>base(r)&&(r.council===null||record(r.council)&&id(r.council.candidateId)&&Array.isArray(r.council.members)&&Array.isArray(r.council.voterIds)&&finite(r.council.deadline)&&(r.council.until===null||finite(r.council.until)))};
export const settlementDomains=Object.freeze([
 {definition:SettlementEconomy,key:'settlementEconomies',access:'settlementEconomy',fields:['stock']},
 {definition:SettlementDevelopment,key:'settlementDevelopment',access:'settlementDevelopment',fields:['prosperity','development','capacity','generated','displaced','weatherLossAfter','lastSetback']},
 {definition:SettlementSchedule,key:'settlementSchedules',access:'settlementSchedule',fields:['nextTick','nextVisit']},
 {definition:SettlementDiplomacy,key:'settlementDiplomacy',access:'settlementDiplomacy',fields:['reputation','grievance','warUntil','raidAt','raidMotive','failedTrades','aidedUntil']},
 {definition:SettlementHistory,key:'settlementHistories',access:'settlementHistory',fields:['history']},
 {definition:SettlementCouncil,key:'settlementCouncils',access:'settlementCouncil',fields:['council']}
]);
export function settlementPartInput(s,spec){const keys=spec.fields.filter(k=>Object.hasOwn(s,k));if(!keys.length)return null;const row={settlement:s};for(const key of keys)row[key]=s[key];if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');return row;}
export function settlementInput(s){return settlementDomains.flatMap(spec=>{const row=settlementPartInput(s,spec);return row?[{...spec,row,keys:spec.fields.filter(k=>Object.hasOwn(s,k))}]:[];});}
