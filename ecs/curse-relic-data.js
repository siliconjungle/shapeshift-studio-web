const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>Number.isFinite(v)&&v>=0;
const unit=v=>finite(v)&&v<=1;
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const base=r=>record(r)&&record(r.person);
const personId=v=>Number.isSafeInteger(v)&&v>=0;
const relicId=v=>typeof v==='string'&&/^relic-\d+$/.test(v);
const memories=v=>Array.isArray(v)&&v.length<=5&&v.every(m=>record(m)&&typeof m.text==='string'&&finite(m.at));
export const validCurseEffect=c=>record(c)&&['since','until','cueUntil','nextAccident','nextSocial'].every(k=>finite(c[k]))&&c.until>=c.since&&['spell','chest','stranger'].includes(c.source)&&Number.isSafeInteger(c.nightmares)&&c.nightmares>=0&&['workUntil','attackAt'].every(k=>optional(c,k,finite))&&optional(c,'attackMiss',v=>typeof v==='boolean');
export const validCurseCare=t=>record(t)&&['comfort','cleanse','avoid'].includes(t.response)&&personId(t.targetId)&&finite(t.until)&&(t.finishAt===null||finite(t.finishAt));
export const validRelicAttachment=a=>record(a)&&relicId(a.id)&&unit(a.devotion)&&unit(a.jealousy)&&finite(a.neglected)&&finite(a.nextUrge);
export const validRelicTask=t=>record(t)&&relicId(t.id)&&['carry','retrieve','steal','fight'].includes(t.kind)&&['deadline','repathAt','until'].every(k=>finite(t[k]))&&(t.opponentId===null||personId(t.opponentId));
export const ActorCurse={name:'ActorCurse',validate:r=>base(r)&&optional(r,'effect',validCurseEffect)};
export const ActorCurseCare={name:'ActorCurseCare',validate:r=>base(r)&&optional(r,'task',validCurseCare)};
export const ActorCurseMemories={name:'ActorCurseMemories',validate:r=>base(r)&&optional(r,'entries',memories)};
export const ActorRelicAttachment={name:'ActorRelicAttachment',validate:r=>base(r)&&optional(r,'attachment',validRelicAttachment)&&optional(r,'pickedAt',v=>v===null||finite(v))};
export const ActorRelicTask={name:'ActorRelicTask',validate:r=>base(r)&&optional(r,'task',validRelicTask)};
export const ActorRelicMemories={name:'ActorRelicMemories',validate:r=>base(r)&&optional(r,'entries',memories)};
export const curseRelicDomains=Object.freeze([
 {definition:ActorCurse,key:'actorCurses',fields:{curse:'effect'},access:'actorCurse'},
 {definition:ActorCurseCare,key:'actorCurseCare',fields:{curseCare:'task'},access:'actorCurseCare'},
 {definition:ActorCurseMemories,key:'actorCurseMemories',fields:{curseMemories:'entries'},access:'actorCurseMemories'},
 {definition:ActorRelicAttachment,key:'actorRelicAttachments',fields:{relicAttachment:'attachment',relicPickedAt:'pickedAt'},access:'actorRelicAttachment'},
 {definition:ActorRelicTask,key:'actorRelicTasks',fields:{relicTask:'task'},access:'actorRelicTask'},
 {definition:ActorRelicMemories,key:'actorRelicMemories',fields:{relicMemories:'entries'},access:'actorRelicMemories'}
]);
// Constructor/save input is consumed once. These are not runtime actor aliases.
export function curseRelicInput(person){return curseRelicDomains.flatMap(spec=>{
 const keys=Object.keys(spec.fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];
 const row={person};for(const key of keys)row[spec.fields[key]]=person[key];
 if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');
 return [{...spec,row,keys}];
});}
