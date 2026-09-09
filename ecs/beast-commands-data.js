const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=Number.isFinite;
const optional=(r,k,test)=>!Object.hasOwn(r,k)||r[k]===undefined||test(r[k]);
const id=v=>Number.isSafeInteger(v)||typeof v==='string',nullable=test=>v=>v===null||test(v);
const guard=r=>record(r)&&['villager','house','structure'].includes(r.kind)&&finite(r.until)&&optional(r,'name',v=>typeof v==='string')&&['id','homeId'].every(k=>optional(r,k,nullable(id)))&&optional(r,'structureKind',v=>v===null||typeof v==='string');
const play=r=>record(r)&&Number.isSafeInteger(r.villagerId)&&finite(r.until)&&finite(r.played)&&r.played>=0&&['met','autonomous'].every(k=>optional(r,k,v=>typeof v==='boolean'));
export const beastCommandsFields=Object.freeze(["guardOrder", "playOrder", "orderRetryAt"]);
export const BeastCommands={name:'BeastCommands',validate:r=>record(r)&&record(r.person)&&r.person.species==='beast'&&optional(r,'guardOrder',nullable(guard))&&optional(r,'playOrder',nullable(play))&&optional(r,'orderRetryAt',finite)};
// Consume constructor/old-save fields once. Runtime uses only the component.
export function beastCommandsInput(actor){
 const keys=beastCommandsFields.filter(k=>Object.hasOwn(actor,k));if(!keys.length)return undefined;
 const row={person:actor};for(const key of keys)row[key]=actor[key];if(!BeastCommands.validate(row))throw Error('Invalid BeastCommands input');return row;
}
