// A serialized, session-only history shared by every reference link.
export function createReferenceNavigation({capture,restore,open,resolve,changed=()=>{}}){
 let stack=[],queue=Promise.resolve(),generation=0;
 const perform=fn=>{const result=queue.catch(()=>{}).then(fn);queue=result;return result};
 return{
  open(ref){const ticket=generation;return perform(async()=>{if(ticket!==generation)return;const target=resolve(ref);if(!target)throw Error('Missing '+ref.kind+' reference: '+ref.id);const origin=capture();try{await open(target);if(ticket!==generation)return;stack.push({origin,target});changed()}catch(e){if(ticket===generation)await restore(origin);throw e}})},
  back(){return perform(async()=>{const entry=stack.at(-1);if(!entry)return;await restore(entry.origin);stack.pop();changed()})},
  clear(){generation++;stack=[];changed()},snapshot:()=>stack.map(e=>({target:structuredClone(e.target)})),
 };
}
