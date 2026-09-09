const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const unit=n=>Number.isFinite(n)&&n>=0&&n<=1;
export const beastEmotionFields=Object.freeze(['anger','jealousy','fear','jealousAfter','emotionalTargetId','emotionalReason','emotionalWarningAt','emotionalLashAfter','emotionCueAfter','companyAfter']);
export const BeastEmotions={name:'BeastEmotions',validate:r=>record(r)&&record(r.person)&&r.person.species==='beast'&&['anger','jealousy','fear'].every(k=>optional(r,k,unit))&&['jealousAfter','emotionalWarningAt','emotionalLashAfter','emotionCueAfter','companyAfter'].every(k=>optional(r,k,Number.isFinite))&&optional(r,'emotionalTargetId',v=>v===null||Number.isSafeInteger(v))&&optional(r,'emotionalReason',v=>v===null||typeof v==='string')};
// Consume constructor/old-save fields once; bound actors never forward raw fields.
export function beastEmotionsInput(actor){
 const keys=beastEmotionFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];if(!BeastEmotions.validate(row))throw Error('Invalid BeastEmotions input');return row;
}
