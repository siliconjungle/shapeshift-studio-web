import {constraintChain} from './model.js';

export function captureConstraints(doc,nodes){
 const ids=new Set(nodes.map(n=>n.id)),constraints=structuredClone((doc.constraints??[]).filter(c=>ids.has(c.node)));
 for(const c of constraints){if(c.target&&!ids.has(c.target))throw Error('Include the character’s constraint targets when saving it.');if(c.type==='ik'&&!constraintChain(doc.joints,c).every(id=>ids.has(id)))throw Error('Include the entire IK chain when saving the character.');}
 return constraints;
}
export function constraintBindings(constraints,doc,prefix,existing={}){
 const result={...existing},used=new Set((doc.constraints??[]).map(c=>c.id));
 for(const c of constraints)if(!result[c.id]){const base=(prefix+'-'+c.id).replace(/[^\w-]/g,'-').slice(0,90);let id=base,n=2;while(used.has(id))id=base+'-'+n++;used.add(id);result[c.id]=id;}return result;
}
export function bindConstraints(constraints,nodes={},ids={}){return constraints.map(c=>({...structuredClone(c),id:ids[c.id]??c.id,node:nodes[c.node]??c.node,target:nodes[c.target]??c.target}));}
