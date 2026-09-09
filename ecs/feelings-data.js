const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const identity=id=>Number.isSafeInteger(id)||typeof id==='string'&&/^beast-\d+$/.test(id);
const unit=v=>Number.isFinite(v)&&v>=0&&v<=1;
export const validCrush=c=>c==null||record(c)&&identity(c.targetId)&&Number.isFinite(c.since)&&unit(c.strength)&&typeof c.reciprocal==='boolean';
export const validHeartbreak=h=>h==null||record(h)&&identity(h.otherId)&&['severity','attachment'].every(k=>unit(h[k]))&&['startedAt','until','refuseUntil','withdrawUntil'].every(k=>Number.isFinite(h[k]))&&typeof h.extreme==='boolean';
export const feelingFields=['crush','heartbreak','heartbrokenUntil','crushCheckAt','refusingFoodNow','withdrawnNow'];
export const ActorFeelings={name:'ActorFeelings',validate:r=>record(r)&&record(r.person)&&optional(r,'crush',validCrush)&&optional(r,'heartbreak',validHeartbreak)&&['heartbrokenUntil','crushCheckAt'].every(k=>optional(r,k,Number.isFinite))&&['refusingFoodNow','withdrawnNow'].every(k=>optional(r,k,v=>typeof v==='boolean'))};
export function actorFeelingsInput(actor){
 const keys=feelingFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];
 if(!ActorFeelings.validate(row))throw Error('Invalid ActorFeelings input');return row;
}
