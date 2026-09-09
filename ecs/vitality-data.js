const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
export const vitalityFields=Object.freeze(['health','maxHealth','dead','diedAt','deathCause','hurtAt','lastDamageAt','lastDamageCause']);
export const ActorVitality={name:'ActorVitality',validate:r=>record(r)&&record(r.person)&&['health','maxHealth'].every(k=>optional(r,k,v=>Number.isFinite(v)&&v>=0))&&optional(r,'dead',v=>typeof v==='boolean')&&['diedAt','hurtAt','lastDamageAt'].every(k=>optional(r,k,v=>Number.isFinite(v)||v===-Infinity))&&['deathCause','lastDamageCause'].every(k=>optional(r,k,v=>typeof v==='string'))};
// Factory and old-save input is consumed once when binding a new actor identity.
export function actorVitalityInput(actor){
 const keys=vitalityFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];
 if(!ActorVitality.validate(row))throw Error('Invalid ActorVitality input');return row;
}
