const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
export const ageFields=Object.freeze(['child','ageYears','elder','frailty','bornAt','matureAt','childhoodStartedAt','ageMiracles']);
export const PersonAge={name:'PersonAge',validate:r=>record(r)&&record(r.person)&&['child','elder'].every(k=>optional(r,k,v=>typeof v==='boolean'))&&optional(r,'ageYears',v=>Number.isFinite(v)&&v>=0)&&optional(r,'frailty',v=>Number.isFinite(v)&&v>=0&&v<=1)&&['bornAt','matureAt','childhoodStartedAt'].every(k=>optional(r,k,Number.isFinite))&&optional(r,'ageMiracles',v=>Array.isArray(v)&&v.every(record))};
export function personAgeInput(person){
 const keys=ageFields.filter(k=>Object.hasOwn(person,k));if(!keys.length)return undefined;
 const row={person};for(const key of keys)row[key]=person[key];
 if(!PersonAge.validate(row))throw Error('Invalid PersonAge input');return row;
}
