const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const deprivationFields=Object.freeze(["starvingFor", "exhaustedFor", "sleeplessFor"]);
export const ActorDeprivation={name:'ActorDeprivation',validate:r=>record(r)&&record(r.person)&&deprivationFields.every(k=>!Object.hasOwn(r,k)||r[k]===undefined||Number.isFinite(r[k])&&r[k]>=0)};
// Consume constructor/old-save fields once before binding canonical actor identity.
export function actorDeprivationInput(actor){const keys=deprivationFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;const row={person:actor};for(const k of keys)row[k]=actor[k];if(!ActorDeprivation.validate(row))throw Error('Invalid ActorDeprivation input');return row;}
