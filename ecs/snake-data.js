const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const SnakeSchedule={name:'SnakeSchedule',validate:r=>record(r)&&record(r.snakes)&&Object.keys(r).every(k=>['snakes','nextAt','nextId'].includes(k))&&Number.isFinite(r.nextAt)&&r.nextAt>=0&&Number.isSafeInteger(r.nextId)&&r.nextId>=0};
