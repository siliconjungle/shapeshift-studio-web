import * as T from './vendor.js';
import {parseSVG} from './geometry.js';
import {LayeredVectorEffect} from './core/vector-effects.js';
const Z=new T.Vector3(0,0,1);
// A plain authored stamp is still vector geometry. More elaborate layer programs
// (an animated contact mark, for example) use the same sampler and material.
export function stampDefinition(duration){return{curveSegments:28,boundsTolerance:4,surfaceOffset:.006,renderOrder:20,color:'#f0bf4b',projection:'surface',buckets:[{when:true,id:'paint'}],animation:{visible:['and',['gte',['var','age'],0],['lt',['var','age'],duration]],root:{'scale.x':1,'scale.y':1,'scale.z':1},layers:[{tracks:{alpha:['sub',1,['smooth',['div',['var','age'],duration]]],time:['var','age'],flutter:0}}]}};}
export class SceneDecals{
 constructor(parent){this.parent=parent;this.entries=new Map();this.generation=0;this.ray=new T.Raycaster();this.normalMatrix=new T.Matrix3();}
 async configure(project,asset){const generation=++this.generation,entries=new Map();try{for(const clip of project.scene3d.clips)for(const event of clip.events){if(event.type!=='decal')continue;const svg=await parseSVG(asset(event.asset)),view=svg.xml.getAttribute('viewBox').trim().split(/[ ,]+/).map(Number),parts=event.parts??{width:view[2],height:view[3],components:[]},definition=event.vector??stampDefinition(event.duration),effect=new LayeredVectorEffect(svg,parts,definition,{loader:T.SVGLoader,groundSize:200000});const anchor=new T.Group();anchor.add(effect.root);entries.set(clip.id+':'+event.id,{effect,anchor,contact:null});}}catch(error){for(const {effect,anchor}of entries.values()){effect.dispose();anchor.removeFromParent();}throw error;}
 if(generation!==this.generation){for(const {effect,anchor}of entries.values()){effect.dispose();anchor.removeFromParent();}return;}this.clear(false);this.entries=entries;for(const {anchor}of entries.values())this.parent.add(anchor);
 }
 update(time,clip,objects,defs,targets,palettes,toWorld){
  for(const {effect}of this.entries.values())effect.hide();
  for(const e of clip.events){if(e.type!=='decal')continue;const entry=this.entries.get(clip.id+':'+e.id),node=defs.get(e.node),age=time-e.time;if(!entry||!node||age<0||age>=e.duration)continue;
   const local=new T.Vector3(...(e.origin??[0,0,0])),point=toWorld(local.clone(),node,objects,defs),direction=toWorld(local.add(new T.Vector3(...(e.direction??[0,-1,0])).normalize()),node,objects,defs).sub(point).normalize();if(e.worldDirection)direction.fromArray(e.worldDirection).normalize();this.ray.set(point,direction);this.ray.near=.001;this.ray.far=e.length??20;
   const hit=this.ray.intersectObjects(targets.filter(m=>e.receiver?m.userData.node===e.receiver:m.userData.node!==e.node),false)[0];entry.contact=null;if(!hit)continue;
   const normal=hit.face.normal.clone().applyNormalMatrix(this.normalMatrix.getNormalMatrix(hit.object.matrixWorld));if(normal.dot(direction)>0)normal.negate();
   const effect=entry.effect;entry.anchor.position.copy(hit.point).addScaledVector(normal,e.offset??.006);entry.anchor.quaternion.setFromUnitVectors(Z,normal);effect.root.position.set(0,0,0);effect.root.quaternion.identity();effect.root.scale.set(1,1,1);effect.animate(age,e.strength??1);effect.root.scale.multiplyScalar(e.size??1);effect.setColor(e.color??palettes.get(node.material)?.[1]??'#f0bf4b');
   for(const {mesh}of effect.layers){mesh.material.uniforms.groundDecal.value=0;mesh.material.polygonOffset=true;mesh.material.polygonOffsetFactor=-1;mesh.material.polygonOffsetUnits=-1;}
   entry.contact={node:hit.object.userData.node,point:hit.point.toArray(),normal:normal.toArray()};effect.root.userData.contact=entry.contact;
  }
 }
 clear(invalidate=true){if(invalidate)this.generation++;for(const {effect,anchor}of this.entries.values()){effect.dispose();anchor.removeFromParent();}this.entries.clear();}
 dispose(){this.clear();}
}
