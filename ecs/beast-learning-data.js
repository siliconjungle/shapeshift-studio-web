const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const unit=n=>Number.isFinite(n)&&n>=0&&n<=1,serial=n=>Number.isSafeInteger(n)&&n>=0,time=n=>Number.isFinite(n)&&n>=0;
export const beastLearningFields=Object.freeze(['temperament','trust','training','habits','lessonSerial','recentBehaviour','reinforcedSerial','lessonAfter','scoldStreak','lastScoldAt']);
const trace=v=>v===null||record(v)&&typeof v.kind==='string'&&v.kind.length>0&&time(v.at)&&Number.isSafeInteger(v.serial)&&v.serial>0&&(v.targetId===null||Number.isSafeInteger(v.targetId)||typeof v.targetId==='string');
export const BeastLearning={name:'BeastLearning',validate:r=>record(r)&&record(r.person)&&r.person.species==='beast'&&optional(r,'temperament',v=>v===null||['gentle','playful','stubborn','volatile'].includes(v))&&['trust','training'].every(k=>optional(r,k,unit))&&optional(r,'habits',v=>v===null||record(v)&&['protect','company','lash'].every(k=>unit(v[k])))&&['lessonSerial','reinforcedSerial','scoldStreak'].every(k=>optional(r,k,serial))&&['lessonAfter','lastScoldAt'].every(k=>optional(r,k,time))&&optional(r,'recentBehaviour',trace)};
// Consume factory/old-save input once, before binding identity. Runtime has no raw-field fallback.
export function beastLearningInput(actor){
 const keys=beastLearningFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];if(!BeastLearning.validate(row))throw Error('Invalid BeastLearning input');return row;
}
