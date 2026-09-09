const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const ActorCombat={name:'ActorCombat',validate:r=>record(r)&&record(r.person)&&
 (r.style===undefined||['bow','sword'].includes(r.style))&&
 (r.shotAt===undefined||Number.isFinite(r.shotAt)&&r.shotAt>=0)&&
 Object.keys(r).every(k=>['person','style','shotAt'].includes(k))};
export function combatInput(person){
 const fields={combatStyle:'style',shotAt:'shotAt'},keys=Object.keys(fields).filter(k=>Object.hasOwn(person,k));
 if(!keys.length)return [];
 const row={person};for(const key of keys)row[fields[key]]=person[key];
 if(!ActorCombat.validate(row))throw Error('Invalid ActorCombat input');
 return [{definition:ActorCombat,row,keys}];
}
