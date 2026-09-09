const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const nonnegative=v=>Number.isFinite(v)&&v>=0;
const strict=(fields,test)=>r=>record(r)&&record(r.shelter)&&Object.keys(r).every(k=>k==='shelter'||fields.includes(k))&&test(r);
export const ShelterSchedule={name:'ShelterSchedule',validate:strict(['nextBeds'],r=>nonnegative(r.nextBeds))};
export const ShelterWeather={name:'ShelterWeather',validate:strict(['rain'],r=>r.rain===undefined||nonnegative(r.rain))};
export const HouseFire={name:'HouseFire',validate:r=>record(r)&&Object.keys(r).every(k=>['kind','id','x','z','height','startedAt','until','regrowAt','wet','cause'].includes(k))&&r.kind==='house'&&typeof r.id==='string'&&['x','z'].every(k=>Number.isFinite(r[k]))&&['height','startedAt','until','regrowAt','wet'].every(k=>nonnegative(r[k]))&&typeof r.cause==='string'};
export const ShelterIdentity={name:'ShelterIdentity',replaceable:false,validate:r=>record(r)&&Array.isArray(r.fires)};
export const shelterDomains=[{definition:ShelterSchedule,key:'shelterSchedules',fields:['nextBeds']},{definition:ShelterWeather,key:'shelterWeather',fields:['rain']}];
