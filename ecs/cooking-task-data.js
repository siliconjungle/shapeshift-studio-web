const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const cookingTaskFields=Object.freeze(["cookingSiteId", "cookingFood", "cookingAfter", "cookingDeadline", "potCarry", "resumingStew", "stewReserved"]);
const valid=(k,v)=>k==='cookingSiteId'?typeof v==='string':['potCarry','resumingStew','stewReserved'].includes(k)?typeof v==='boolean':Number.isFinite(v)&&v>=0;
export const ActorCookingTask={name:'ActorCookingTask',validate:r=>record(r)&&record(r.person)&&cookingTaskFields.every(k=>!Object.hasOwn(r,k)||r[k]===undefined||valid(k,r[k]))};
// One-time constructor/save import, before canonical identity binding.
export function actorCookingTaskInput(actor){const keys=cookingTaskFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;const row={person:actor};for(const k of keys)row[k]=actor[k];if(!ActorCookingTask.validate(row))throw Error('Invalid ActorCookingTask input');return row;}
