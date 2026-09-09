const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),unit=v=>Number.isFinite(v)&&v>=0&&v<=1;
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
export const validWorkValues=v=>v==null||record(v)&&['food','wood','stone'].every(k=>optional(v,k,unit));
export const ActorPersonality={name:'ActorPersonality',validate:r=>record(r)&&record(r.person)&&optional(r,'trait',v=>v===null||typeof v==='string')&&Object.keys(r).every(k=>['person','trait'].includes(k))};
export const ActorWorkPreferences={name:'ActorWorkPreferences',validate:r=>record(r)&&record(r.person)&&optional(r,'values',validWorkValues)&&Object.keys(r).every(k=>['person','values'].includes(k))};
export const ActorExpeditionTemperament={name:'ActorExpeditionTemperament',validate:r=>record(r)&&record(r.person)&&optional(r,'values',v=>v===null||record(v)&&['curiosity','caution','attachment'].every(k=>unit(v[k])))&&Object.keys(r).every(k=>['person','values'].includes(k))};
export const personalityDomains=[
 {definition:ActorPersonality,key:'actorPersonalities',access:'actorPersonality',fields:{trait:'trait'}},
 {definition:ActorWorkPreferences,key:'actorWorkPreferences',access:'actorWorkPreferences',fields:{workPreferences:'values'}},
 {definition:ActorExpeditionTemperament,key:'actorExpeditionTemperaments',access:'actorExpeditionTemperament',fields:{expeditionTemperament:'values'}}
];
export function personalityInput(person){return personalityDomains.flatMap(({definition,fields})=>{const keys=Object.keys(fields).filter(k=>Object.hasOwn(person,k));if(!keys.length)return [];const row={person};for(const key of keys)row[fields[key]]=person[key];if(!definition.validate(row))throw Error('Invalid '+definition.name+' input');return [{definition,row,keys}];});}
