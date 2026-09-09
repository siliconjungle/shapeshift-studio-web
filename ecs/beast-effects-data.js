const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=Number.isFinite;
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
export const beastEffectsFields=Object.freeze(["rampageUntil", "rampageCheckAt", "lullabyUntil", "settledUntil"]);
export const BeastEffects={name:'BeastEffects',validate:r=>record(r)&&record(r.person)&&r.person.species==='beast'&&beastEffectsFields.every(k=>optional(r,k,finite))};
// Consume constructor/old-save fields once. Runtime uses only the component.
export function beastEffectsInput(actor){
 const keys=beastEffectsFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];if(!BeastEffects.validate(row))throw Error('Invalid BeastEffects input');return row;
}
