import * as T from '../scene3d/vendor.js';
import {sampleNoodle,noodleDeformer,deformNormal} from './model.js';
import {bendableGeometry} from './tessellate.js';
const captures=new WeakMap();
export function skeletonBinding(host,id,bones){const owner=host.objects.get(id);if(!owner||!bones.length||bones.includes(id))throw Error('Select distinct control bones outside the artwork');host.world.updateMatrixWorld(true);return{owner:owner.matrixWorld.toArray(),bones:bones.map(id=>{const o=host.objects.get(id);if(!o)throw Error('Missing bone');return{id,bind:o.matrixWorld.toArray(),weight:1};})};}
export function skinMapper(binding,objects,owner){const bindOwner=new T.Matrix4().fromArray(binding.owner),inverse=owner.matrixWorld.clone().invert(),v=new T.Vector3(),bones=binding.bones.map(b=>{const rest=new T.Matrix4().fromArray(b.bind),current=objects.get(b.id)?.matrixWorld??rest;return{position:new T.Vector3().setFromMatrixPosition(rest).applyMatrix4(bindOwner.clone().invert()).toArray(),matrix:inverse.clone().multiply(current).multiply(rest.clone().invert()).multiply(bindOwner),weight:b.weight??1};});
 return (p,reference=p)=>{const weights=bones.map((b,i)=>({i,d:Math.hypot(...reference.map((v,k)=>v-b.position[k]))})).sort((a,b)=>a.d-b.d).slice(0,4),total=weights.reduce((s,w)=>s+bones[w.i].weight/Math.max(.001,w.d*w.d),0),out=[0,0,0];for(const w of weights){const b=bones[w.i],weight=b.weight/Math.max(.001,w.d*w.d)/total;v.fromArray(p).applyMatrix4(b.matrix);out[0]+=v.x*weight;out[1]+=v.y*weight;out[2]+=v.z*weight;}return out;};
}
// Deform source vertices once per pose. The actual rendered geometry is shared
// by colour, depth, shadows, picking and silhouette extraction in both pipelines.
export function updateNoodleGeometry(host){
 const clip=host.project.scene3d.clips.find(c=>c.id===host.clipId)??host.sample.clip,defs=new Map(host.project.scene3d.nodes.map(n=>[n.id,n]));host.world.updateMatrixWorld(true);
 const maps=new Map(),done=new Set();
 host.world.traverse(mesh=>{if(!mesh.isMesh||!mesh.geometry?.attributes.normal||mesh.geometry.attributes.param)return;let parent=mesh;while(parent&&!parent.userData.node)parent=parent.parent;const id=mesh.userData.node??parent?.userData.node,n=defs.get(id),owner=host.objects.get(id);if(!n||!owner)return;
  const active=n.noodle?.enabled||n.skin;let entry=captures.get(mesh.geometry);if(!active&&!entry)return;
  if(!entry){const original=mesh.geometry,g=bendableGeometry(original,Math.max(...n.dimensions)/16);mesh.geometry=g;if(mesh.depthPrepass)mesh.depthPrepass.geometry=g;entry={positions:g.attributes.position.array.slice(),normals:g.attributes.normal.array.slice(),signature:null};captures.set(g,entry);original.dispose();}
  const g=mesh.geometry;if(done.has(g))return;done.add(g);
  if(!maps.has(id)){const sampled=n.noodle?.enabled?sampleNoodle(n.noodle,clip,id,host.time):null,curve=sampled?noodleDeformer(sampled):null,skin=n.skin?skinMapper(n.skin,host.objects,owner):null,h=n.dimensions[1];maps.set(id,{signature:JSON.stringify([sampled,n.skin, n.skin?[owner.matrixWorld.elements,...n.skin.bones.map(b=>host.objects.get(b.id)?.matrixWorld.elements)]:null]),point:p=>{let q=curve?curve.point(p.map(v=>v/h)).map(v=>v*h):p;return skin?skin(q,p):q;}});}
  const def=maps.get(id),toOwner=owner.matrixWorld.clone().invert().multiply(mesh.matrixWorld),fromOwner=toOwner.clone().invert(),signature=def.signature+toOwner.elements.join(',');if(entry.signature===signature)return;
  const lift=active&&mesh.userData.face?Math.max(...n.dimensions)*.005:0,v=new T.Vector3(),map=p=>{v.set(p[0],p[1],p[2]+lift).applyMatrix4(toOwner);const q=def.point(v.toArray());return v.fromArray(q).applyMatrix4(fromOwner).toArray();},positions=g.attributes.position,normals=g.attributes.normal;
  for(let i=0;i<positions.count;i++){const p=Array.from(entry.positions.slice(i*3,i*3+3)),normal=Array.from(entry.normals.slice(i*3,i*3+3));positions.setXYZ(i,...map(p));normals.setXYZ(i,...deformNormal(map,p,normal));}
  positions.needsUpdate=true;normals.needsUpdate=true;g.computeBoundingSphere();g.computeBoundingBox();host.freehand.topologies.delete(g);entry.signature=signature;
 });
}
