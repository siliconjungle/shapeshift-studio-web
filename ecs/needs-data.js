const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const ActorNeeds={name:'ActorNeeds',validate:r=>record(r)&&record(r.person)&&record(r.values)&&Object.values(r.values).every(v=>v===undefined||Number.isFinite(v))};
// Creation/import input is consumed once; actors do not retain a needs field.
export function actorNeedsInput(actor){
 if(!Object.hasOwn(actor,'needs'))return undefined;
 const row={person:actor,values:actor.needs};if(!ActorNeeds.validate(row))throw Error('Invalid ActorNeeds input');return row;
}
