const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>Number.isFinite(v)&&v>=0;
export const customKinds=['singing','stories','quiet','meal','cooking','welcome','remembrance'];
export const validCustomExperiences=v=>record(v)&&Object.getPrototypeOf(v)===Object.prototype&&Object.entries(v).every(([kind,r])=>customKinds.includes(kind)&&record(r)&&Number.isFinite(r.value)&&Math.abs(r.value)<=1&&finite(r.evidence)&&r.evidence<=12&&finite(r.at)&&finite(r.avoidUntil)&&typeof r.reason==='string'&&(r.otherId===null||Number.isSafeInteger(r.otherId))&&(r.otherName===null||typeof r.otherName==='string'));
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
export const TraditionsState={name:'TraditionsState',replaceable:false,validate:r=>record(r)&&finite(r.nextAt)&&Number.isSafeInteger(r.sequence)&&r.sequence>=0};
export const ActorTraditions={name:'ActorTraditions',validate:r=>record(r)&&record(r.person)&&optional(r,'experiences',validCustomExperiences)&&optional(r,'injury',v=>record(v)&&customKinds.includes(v.kind)&&finite(v.at)&&(v.cause===undefined||typeof v.cause==='string'))};
export const traditionFields={customExperiences:'experiences',customInjury:'injury'};
export function actorTraditionsInput(person){
 const keys=Object.keys(traditionFields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];
 const row={person};for(const key of keys)row[traditionFields[key]]=person[key];
 if(!ActorTraditions.validate(row))throw Error('Invalid ActorTraditions input');return [{definition:ActorTraditions,row,keys}];
}
