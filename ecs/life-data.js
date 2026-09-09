const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export class VillageLife {}
export const LifeIdentity={name:'LifeIdentity',replaceable:false,validate:s=>s instanceof VillageLife&&record(s.economy)&&['homes','relationships','sessions'].every(k=>Array.isArray(s[k]))&&Object.keys(s).every(k=>['economy','homes','relationships','sessions','memory','romance','watch'].includes(k))};
export const validLifeState=LifeIdentity.validate;
export const LifeClock={name:'LifeClock',validate:r=>record(r)&&record(r.life)&&Number.isFinite(r.hour)&&r.hour>=0&&r.hour<24&&Number.isSafeInteger(r.day)&&r.day>=1&&Object.keys(r).every(k=>['life','hour','day'].includes(k))};
export const LifeMealAccounting={name:'LifeMealAccounting',validate:r=>record(r)&&record(r.life)&&Number.isSafeInteger(r.consumed)&&r.consumed>=0&&Object.keys(r).every(k=>['life','consumed'].includes(k))};
export const LifeSocialVenues={name:'LifeSocialVenues',validate:r=>record(r)&&record(r.life)&&Array.isArray(r.spots)&&r.spots.every(p=>p==null||record(p)&&Number.isFinite(p.x)&&Number.isFinite(p.z))&&Object.keys(r).every(k=>['life','spots'].includes(k))};
export const lifeDomains=[{definition:LifeClock,key:'lifeClocks',fields:{hour:'hour',day:'day'},access:'lifeClock'},{definition:LifeMealAccounting,key:'lifeMealAccounting',fields:{consumed:'consumed'},access:'lifeMealAccounting'},{definition:LifeSocialVenues,key:'lifeSocialVenues',fields:{socialSpots:'spots'},access:'lifeSocialVenues'}];
