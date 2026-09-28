import {proceduralComponents} from '@shapeshift-labs/studio-core/procedural/sources';
import {proceduralLists,proceduralNodeClosure,captureProcedural,proceduralBindings,remapProcedural,appendProcedural,validateProceduralPacket} from '@shapeshift-labs/studio-core/procedural/transfer';
import {mergeActionEdits} from './actions.js';
const copy=x=>structuredClone(x),doc=(p,d)=>d===3?p.scene3d:p;
const check=(ok,message)=>{if(!ok)throw Error('Library procedural: '+message);};

export function componentSelection(p,dimension,root){
 const d=doc(p,dimension),nodes=dimension===3?d.nodes:d.joints,definition=d.procedural,ids=new Set([root]);
 check(nodes.some(n=>n.id===root),'select an object');
 let previous;do{previous=ids.size;for(const n of nodes)if(ids.has(n.parent))ids.add(n.id);}while(ids.size!==previous);
 const attached=definition&&(dimension===3?([...(definition.trackers??[]),...(definition.movers??[])].some(t=>ids.has(t.node))||definition.chains.some(c=>[c.root,c.target,...c.segments,...(c.joints??[])].some(id=>ids.has(id)))):[...proceduralComponents(definition).owners.values()].some(owners=>[...owners].some(id=>ids.has(id)))||ids.size===nodes.length&&definition.particles.length);
 const prior=nodes.find(n=>n.id===root)?.librarySource?.procedural;
 const selected=attached?proceduralNodeClosure(definition,dimension,nodes,ids,{terrains:prior?.baseline.terrains??definition.terrains}):ids;
 if(attached){let n=nodes.find(n=>n.id===root);while(n.parent){n=nodes.find(parent=>parent.id===n.parent);root=n.id;}}
 const parts=copy(nodes.filter(n=>selected.has(n.id)));
 for(const n of parts){delete n.librarySource;delete n.facialSource;}
 const first=parts.find(n=>n.id===root);first.parent=null;delete first.attachment;
 const procedural=attached?captureProcedural(definition,dimension,selected,{includeUnattached:selected.size===nodes.length,owner:dimension===2?root:undefined}):undefined;
 if(procedural&&dimension===2&&prior)procedural.colliders=procedural.colliders.filter(c=>Object.values(prior.bindings.colliders).includes(c.id));
 return {root,nodes:parts,procedural};
}

export function linkCapturedProcedural(item,link){
 if(!item.procedural)return;
 link.procedural={bindings:proceduralBindings(item.procedural,item.dimension,null,null),baseline:copy(item.procedural),delta:item.dimension===3?[0,0,0]:[0,0]};
}

export function placeComponentProcedural(p,item,root){
 if(!item.procedural)return;
 const d=doc(p,item.dimension),link=root.librarySource,origin=item.nodes.find(n=>n.id===item.root),delta=item.dimension===3?root.position.map((v,i)=>v-origin.position[i]):[root.rest.x-origin.rest.x,root.rest.y-origin.rest.y];
 const bindings=proceduralBindings(item.procedural,item.dimension,d.procedural,root.id),packet=remapProcedural(item.procedural,item.dimension,link.bindings,bindings,delta);
 d.procedural=appendProcedural(d.procedural,packet,item.dimension);
 link.procedural={bindings,baseline:copy(packet),delta};
}

const inverse=map=>Object.fromEntries(Object.entries(map).map(([a,b])=>[b,a]));
export function publishComponentProcedural(p,item,link){
 if(!item.procedural&&!link.procedural)return;
 check(item.procedural&&link.procedural,'procedural topology changed; capture a new source');
 const d=doc(p,item.dimension),current=captureProcedural(d.procedural,item.dimension,new Set(Object.values(link.bindings)));
 check(current,'restore the removed procedural rig before publishing');
 if(item.dimension===2)current.colliders=current.colliders.filter(c=>Object.values(link.procedural.bindings.colliders).includes(c.id));
 for(const key of proceduralLists(item.dimension)){
  const ids=Object.values(link.procedural.bindings[key]??{});
  check((current[key]??[]).length===ids.length&&(current[key]??[]).every(v=>ids.includes(v.id)),'procedural topology changed; capture a new source');
 }
 const maps=Object.fromEntries(Object.entries(link.procedural.bindings).map(([key,map])=>[key,inverse(map)]));
 const packet=remapProcedural(current,item.dimension,inverse(link.bindings),maps,link.procedural.delta.map(v=>-v));
 validateProceduralPacket(packet,item.dimension,item.nodes);item.procedural=packet;
}

export function updateComponentProcedural(p,item,root){
 const s=root.librarySource.procedural;if(!s||!item.procedural)return;
 const d=doc(p,item.dimension),next=remapProcedural(item.procedural,item.dimension,root.librarySource.bindings,s.bindings,s.delta);
 // Match the defaults materialized at import, while preserving local edits.
 if(item.dimension===2)for(const point of next.particles){const old=s.baseline.particles.find(p=>p.id===point.id);if(old?.gravity!==undefined)point.gravity??=copy(next.gravity);if(old?.damping!==undefined)point.damping??=next.damping;}
 for(const key of proceduralLists(item.dimension))for(const value of next[key]??[]){
  const index=d.procedural[key].findIndex(v=>v.id===value.id),old=s.baseline[key]?.find(v=>v.id===value.id);
  if(index>=0&&old)d.procedural[key][index]=mergeActionEdits(old,d.procedural[key][index],value);
 }
 // Terrain membership is captured with the component nodes; changed topology requires recapture.
 if(item.dimension===3)check(JSON.stringify(next.terrains)===JSON.stringify(s.baseline.terrains),'terrain membership changed; capture a new source');
 s.baseline=copy(next);
}

export {validateProceduralPacket};
