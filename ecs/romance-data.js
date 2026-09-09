const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const identity=id=>id===null||Number.isSafeInteger(id)||typeof id==='string'&&/^beast-\d+$/.test(id);
export const romanceFields=Object.freeze(['sweetheartId','sexuality','romanceInterest','romanceMemories']);
export const ActorRomance={name:'ActorRomance',validate:r=>record(r)&&record(r.person)&&optional(r,'sweetheartId',identity)&&optional(r,'sexuality',v=>['straight','gay','bisexual','asexual'].includes(v))&&optional(r,'romanceInterest',v=>Number.isFinite(v)&&v>=0&&v<=1)&&optional(r,'romanceMemories',v=>Array.isArray(v)&&v.every(record))};
export function actorRomanceInput(actor){
 const keys=romanceFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];
 if(!ActorRomance.validate(row))throw Error('Invalid ActorRomance input');return row;
}
