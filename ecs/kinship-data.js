const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const ids=v=>Array.isArray(v)&&v.every(id=>Number.isSafeInteger(id)&&id>=0);
export const kinshipFields=Object.freeze(['parents','adoptiveParents','adoptions','adoptedAt','orphanedAt','adoptionCheckAt']);
export const validAdoptiveParents=(person,parents)=>parents===undefined||ids(parents)&&parents.length>=1&&parents.length<=2&&new Set(parents).size===parents.length&&!parents.includes(person.id);
export const PersonKinship={name:'PersonKinship',validate:r=>record(r)&&record(r.person)&&optional(r,'parents',ids)&&validAdoptiveParents(r.person,r.adoptiveParents)&&['adoptedAt','orphanedAt','adoptionCheckAt'].every(k=>optional(r,k,Number.isFinite))&&optional(r,'adoptions',v=>Array.isArray(v)&&v.length<=8&&v.every(a=>record(a)&&Number.isFinite(a.at)&&a.parents!==undefined&&validAdoptiveParents(r.person,a.parents)))};
export function personKinshipInput(person){
 const keys=kinshipFields.filter(k=>Object.hasOwn(person,k));if(!keys.length)return undefined;
 const row={person};for(const key of keys)row[key]=person[key];
 if(!PersonKinship.validate(row))throw Error('Invalid PersonKinship input');return row;
}
