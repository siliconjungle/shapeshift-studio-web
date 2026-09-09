const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const personId=v=>Number.isSafeInteger(v)&&v>=0;
export const validBeastRelationship=r=>record(r)&&personId(r.id)&&typeof r.name==='string'&&Number.isFinite(r.affinity)&&Math.abs(r.affinity)<=1&&Number.isSafeInteger(r.meetings)&&r.meetings>=0;
export const BeastRelationships={name:'BeastRelationships',replaceable:false,validate:r=>record(r)&&r.person?.species==='beast'&&Array.isArray(r.relationships)&&r.relationships.every(validBeastRelationship)&&new Set(r.relationships.map(b=>b.id)).size===r.relationships.length};
export const BeastRelationship={name:'BeastRelationship',replaceable:false,validate:r=>record(r)&&r.person?.species==='beast'&&validBeastRelationship(r.relationship)&&Number.isSafeInteger(r.order)&&r.order>=0,prepare:r=>{
 for(const key of ['person','relationship','order'])Object.defineProperty(r,key,{value:r[key],writable:false,enumerable:true,configurable:false});
 Object.defineProperty(r.relationship,'id',{value:r.relationship.id,writable:false,enumerable:true,configurable:false});
}};
export function beastRelationshipsInput(actor){
 if(!Object.hasOwn(actor,'relationships')||actor.relationships===undefined)return undefined;
 const row={person:actor,relationships:actor.relationships};if(!BeastRelationships.validate(row))throw Error('Invalid beast relationships input');return row;
}
