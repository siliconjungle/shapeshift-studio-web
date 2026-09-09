const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const mealFields=Object.freeze(["mealCarry", "cookedMeal", "mealCookId"]);
const valid=(k,v)=>k==='mealCookId'?v===null||Number.isSafeInteger(v)&&v>=0:typeof v==='boolean';
export const ActorMeal={name:'ActorMeal',validate:r=>record(r)&&record(r.person)&&mealFields.every(k=>!Object.hasOwn(r,k)||r[k]===undefined||valid(k,r[k]))};
// One-time constructor/save import, before canonical identity binding.
export function actorMealInput(actor){const keys=mealFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;const row={person:actor};for(const k of keys)row[k]=actor[k];if(!ActorMeal.validate(row))throw Error('Invalid ActorMeal input');return row;}
