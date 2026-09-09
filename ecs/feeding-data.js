const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const feedingFields=Object.freeze(["foodConsumed", "mealRate", "mealRetryAt", "hungerCueAt"]);
export const ActorFeeding={name:'ActorFeeding',validate:r=>record(r)&&record(r.person)&&feedingFields.every(k=>!Object.hasOwn(r,k)||r[k]===undefined||Number.isFinite(r[k])&&r[k]>=0)};
// Consume constructor/old-save fields once before binding canonical actor identity.
export function actorFeedingInput(actor){const keys=feedingFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;const row={person:actor};for(const k of keys)row[k]=actor[k];if(!ActorFeeding.validate(row))throw Error('Invalid ActorFeeding input');return row;}
