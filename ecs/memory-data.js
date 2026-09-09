const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
// Memories also include beast origin/lesson records and older authored metadata.
export const ActorMemories={name:'ActorMemories',validate:r=>record(r)&&record(r.person)&&Array.isArray(r.values)&&r.values.every(record)};
export function actorMemoriesInput(actor){
 if(!Object.hasOwn(actor,'memories'))return undefined;
 const row={person:actor,values:actor.memories};if(!ActorMemories.validate(row))throw Error('Invalid ActorMemories input');return row;
}
