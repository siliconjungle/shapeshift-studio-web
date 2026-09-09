import {targetKey} from './targets.js';
// Hosts update membership when actors move/spawn/retire. Selectors apply the
// exact distance and component predicates after this broad-phase cell query.
export function createEffectSpatialIndex(cellSize=4){
 if(!(cellSize>0))throw new Error('Spatial cell size must be positive');
 const cells=new Map(),entries=new Map(),cell=p=>`${Math.floor(p.x/cellSize)},${Math.floor(p.z/cellSize)}`;
 function remove(ref){const key=targetKey(ref),old=entries.get(key);if(!old)return;const members=cells.get(old.cell);members.delete(key);if(!members.size)cells.delete(old.cell);entries.delete(key)}
 function update(ref,position){if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z)){remove(ref);return}const key=targetKey(ref),bucket=cell(position);if(entries.get(key)?.cell===bucket)return;remove(ref);if(!cells.has(bucket))cells.set(bucket,new Map());cells.get(bucket).set(key,{...ref});entries.set(key,{cell:bucket,ref:{...ref}})}
 return{update,remove,clear(){cells.clear();entries.clear()},rebuild(values){cells.clear();entries.clear();for(const [ref,position] of values)update(ref,position)},
  query(point,radius){if(!point||radius===undefined)return [...entries.values()].map(e=>e.ref);const out=[];for(let x=Math.floor((point.x-radius)/cellSize);x<=Math.floor((point.x+radius)/cellSize);x++)for(let z=Math.floor((point.z-radius)/cellSize);z<=Math.floor((point.z+radius)/cellSize);z++)for(const ref of cells.get(`${x},${z}`)?.values()??[])out.push(ref);return out},
  get size(){return entries.size},
 };
}
