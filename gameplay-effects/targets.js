export const targetKey=ref=>ref?JSON.stringify([ref.kind??'ground',ref.id??null,...((ref.kind??'ground')==='ground'?[ref.x,ref.z]:[])]):'';
export const sameTarget=(a,b)=>targetKey(a)===targetKey(b);
export function targetRef(ref){
 if(!ref)return null;const result={kind:ref.kind??'ground',id:ref.id??null};
 for(const key of ['structureKind','homeId','partnerId'])if(ref[key]!==undefined)result[key]=ref[key];
 if(result.kind==='ground'){const p=ref.anchor??ref;for(const key of ['x','z'])if(Number.isFinite(p[key]))result[key]=p[key]}
 return result;
}
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.z-b.z):Infinity;
export function queryTargets(host,selector={},context={}){
 const from=selector.from??'target',origin=host.resolve(context.target)?.position??context.point??host.resolve(context.source)?.position;
 const anchor=from==='source'?context.source:from==='eventTarget'?context.event?.target:from==='eventSource'?context.event?.source:context.target;
 const candidates=from==='world'?host.query(selector,origin):anchor?[anchor]:[];
 const seen=new Set(),accepted=[],rejected=[];
 for(const ref of candidates){
  const key=targetKey(ref);if(seen.has(key))continue;seen.add(key);
  const entity=host.resolve(ref);let reason=null;
  if(!entity)reason='Target no longer exists';
  else if(selector.alive!==undefined&&entity.alive!==selector.alive)reason=selector.alive?'Target is not alive':'Target is still alive';
  else if((selector.requires??[]).some(c=>!entity.capabilities.includes(c)))reason='Target lacks a required capability';
  else if((selector.without??[]).some(c=>entity.capabilities.includes(c)))reason='Target has an excluded capability';
  else if(selector.radius!==undefined&&distance(entity.position,origin)>selector.radius)reason='Out of range';
  else if(selector.relation&&selector.relation!=='any'&&(selector.relation==='self'?!sameTarget(ref,context.source):host.relation(context.source,ref)!==selector.relation))reason='Wrong relationship';
  if(reason)rejected.push({target:targetRef(ref),reason});else accepted.push({ref:targetRef(ref),distance:distance(entity.position,origin)});
 }
 accepted.sort((a,b)=>(from==='world'?a.distance-b.distance:0)||targetKey(a.ref).localeCompare(targetKey(b.ref),'en'));
 return{valid:accepted.length>0,targets:accepted.slice(0,selector.limit??1024).map(x=>x.ref),rejected,reason:accepted.length?null:rejected[0]?.reason??'No matching targets'};
}
