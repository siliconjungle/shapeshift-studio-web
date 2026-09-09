const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
export const conditionFields=['health','maxHealth','destroyed','destroyedAt','lastDamageAt','lastRepairAt','raidThreatUntil','rebuilt'];
export const HomeIdentity={name:'HomeIdentity',replaceable:false,validate:h=>record(h)&&typeof h.id==='string'&&['x','z'].every(k=>optional(h,k,Number.isFinite))&&[...conditionFields,...capacityFields,...availabilityFields].every(k=>!Object.hasOwn(h,k))};
export const StructuralCondition={name:'StructuralCondition',validate:r=>record(r)&&record(r.home)&&Object.keys(r).every(k=>k==='home'||conditionFields.includes(k))&&['health','maxHealth'].every(k=>optional(r,k,v=>Number.isFinite(v)&&v>=0))&&['destroyedAt','lastDamageAt','lastRepairAt','raidThreatUntil'].every(k=>optional(r,k,Number.isFinite))&&['destroyed','rebuilt'].every(k=>optional(r,k,v=>typeof v==='boolean'))};
export const HomeMembership={name:'HomeMembership',validate:r=>record(r)&&['village','rival'].includes(r.kind)&&Number.isSafeInteger(r.order)&&r.order>=0};

export const capacityFields=['beds'];
export const availabilityFields=['construction','retired','expeditionId'];
export const HomeCapacity={name:'HomeCapacity',validate:r=>record(r)&&record(r.home)&&Object.keys(r).every(k=>k==='home'||capacityFields.includes(k))&&optional(r,'beds',v=>Number.isFinite(v)&&v>=0)};
export const HomeAvailability={name:'HomeAvailability',validate:r=>record(r)&&record(r.home)&&Object.keys(r).every(k=>k==='home'||availabilityFields.includes(k))&&['construction','retired'].every(k=>optional(r,k,v=>typeof v==='boolean'))&&optional(r,'expeditionId',v=>v===null||typeof v==='string')};
export const homeDomains=[{definition:StructuralCondition,key:'structuralConditions',fields:conditionFields},{definition:HomeCapacity,key:'homeCapacities',fields:capacityFields},{definition:HomeAvailability,key:'homeAvailability',fields:availabilityFields}];
