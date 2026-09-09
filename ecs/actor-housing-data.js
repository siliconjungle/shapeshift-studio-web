const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>r[k]===undefined||test(r[k]);
const home=v=>v===null||record(v);
const strict=(fields,test)=>r=>record(r)&&record(r.person)&&Object.keys(r).every(k=>k==='person'||fields.includes(k))&&test(r);
export const residenceFields=['home','hasBed','homeless','shelterLostAt','homeLostAt'];
export const interiorFields=['inside','insideAt','enteredAt','exitAt','exitFrom'];
export const ActorResidence={name:'ActorResidence',validate:strict(residenceFields,r=>optional(r,'home',home)&&['hasBed','homeless'].every(k=>optional(r,k,v=>typeof v==='boolean'))&&['shelterLostAt','homeLostAt'].every(k=>optional(r,k,Number.isFinite)))};
export const ActorInterior={name:'ActorInterior',validate:strict(interiorFields,r=>optional(r,'inside',v=>typeof v==='boolean')&&['insideAt','exitFrom'].every(k=>optional(r,k,home))&&['enteredAt','exitAt'].every(k=>optional(r,k,Number.isFinite)))};
export const actorHousingDomains=[{definition:ActorResidence,key:'actorResidences',fields:residenceFields},{definition:ActorInterior,key:'actorInteriors',fields:interiorFields}];
export function actorHousingInput(actor,kind){const result=[];for(const spec of actorHousingDomains){const keys=spec.fields.filter(k=>Object.hasOwn(actor,k)&&(k!=='home'||!kind||['Person','Beast','Slime'].includes(kind)));if(!keys.length)continue;const row={person:actor};for(const k of keys)row[k]=actor[k];if(!spec.definition.validate(row))throw Error('Invalid '+spec.definition.name+' input');result.push({definition:spec.definition,row,keys});}return result;}
