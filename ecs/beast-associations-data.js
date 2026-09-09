const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=Number.isFinite;
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
export const beastAssociationFields=Object.freeze(['associations','lastAssociation']);
export const validBeastAssociation=a=>record(a)&&typeof a.key==='string'&&typeof a.label==='string'&&finite(a.value)&&Math.abs(a.value)<=1&&finite(a.at)&&finite(a.confidence)&&a.confidence>=0&&a.confidence<=1&&Number.isSafeInteger(a.count)&&a.count>=0&&(a.x===undefined||finite(a.x)&&finite(a.z))&&(a.personId===undefined||Number.isSafeInteger(a.personId));
export const BeastAssociations={name:'BeastAssociations',validate:r=>record(r)&&record(r.person)&&r.person.species==='beast'&&optional(r,'associations',a=>Array.isArray(a)&&a.length<=12&&a.every(validBeastAssociation))&&optional(r,'lastAssociation',a=>record(a)&&typeof a.label==='string'&&finite(a.confidence)&&finite(a.at))};
// Consume constructor/old-save input once. Runtime owns the component only.
export function beastAssociationsInput(actor){
 const keys=beastAssociationFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];if(!BeastAssociations.validate(row))throw Error('Invalid BeastAssociations input');return row;
}
