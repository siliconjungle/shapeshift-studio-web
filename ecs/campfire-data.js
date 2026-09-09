// Stable wire type. A fire is component data; its behaviour lives in systems.
export class VillageCampfire {}
export function validCampfire(state){return state instanceof VillageCampfire&&state.economy&&typeof state.economy==='object'&&[state.x,state.z].every(Number.isFinite)&&['built','lit'].every(k=>typeof state[k]==='boolean')&&['stoneUsed','fuel','woodUsed','wetUntil','rain','rainExposure','extinguished'].every(k=>Number.isFinite(state[k])&&state[k]>=0)&&state.rain<=1&&(state.tender===null||Number.isSafeInteger(state.tender)&&state.tender>=0);}
export const Campfire={name:'Campfire',replaceable:false,validate:validCampfire};
