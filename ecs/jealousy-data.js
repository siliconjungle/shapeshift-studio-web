const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>Number.isFinite(v)&&v>=0,optional=(r,k,test)=>r[k]===undefined||test(r[k]);
const shape=r=>record(r)&&record(r.person)&&Object.keys(r).every(k=>['person','entries'].includes(k));
export const ActorFavorSeen={name:'ActorFavorSeen',validate:r=>shape(r)&&optional(r,'entries',v=>Array.isArray(v)&&v.length<=64&&v.every(x=>record(x)&&Number.isSafeInteger(x.targetId)&&finite(x.at)&&finite(x.weight)))};
export const ActorJealousy={name:'ActorJealousy',validate:r=>shape(r)&&optional(r,'entries',v=>Array.isArray(v)&&v.every(x=>record(x)&&Number.isSafeInteger(x.targetId)&&finite(x.value)&&x.value<=1&&finite(x.at)&&finite(x.cueAt)))};
export const ActorMiracleThoughts={name:'ActorMiracleThoughts',validate:r=>shape(r)&&optional(r,'entries',v=>Array.isArray(v)&&v.length<=3&&v.every(x=>record(x)&&typeof x.text==='string'&&finite(x.at)))};
export const jealousyDomains=[
 {definition:ActorFavorSeen,key:'actorFavorSeen',access:'actorFavorSeen',beliefField:'favorSeen'},
 {definition:ActorJealousy,key:'actorJealousy',access:'actorJealousy',beliefField:'jealousy'},
 {definition:ActorMiracleThoughts,key:'actorMiracleThoughts',access:'actorMiracleThoughts',fields:{miracleThoughts:'entries'}}
];
export function jealousyInput(person){if(!Object.hasOwn(person,'miracleThoughts'))return [];const row={person,entries:person.miracleThoughts};if(!ActorMiracleThoughts.validate(row))throw Error('Invalid ActorMiracleThoughts input');return [{definition:ActorMiracleThoughts,row,keys:['miracleThoughts']}];}
