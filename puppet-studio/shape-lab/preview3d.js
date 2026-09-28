import * as T from '../scene3d/vendor.js';
import {illustratedMaterial,rigUniforms,chainUniforms,bindMeshTransform} from '../scene3d/material.js';
import {FreehandOutlines} from '../scene3d/freehand-outline.js';
import {shapeMaterial} from './style.js';

// Reuse the Studio's SVG shader and Perfect Freehand silhouettes. Keep one
// renderer alive while editing; only replace geometry when the worker finishes.
export class ShapePreview3D{
 constructor(){
  this.canvas=document.createElement('canvas');
  this.renderer=new T.WebGLRenderer({canvas:this.canvas,antialias:true,preserveDrawingBuffer:true});
  this.renderer.setPixelRatio(1);this.renderer.setSize(720,530,false);
  this.renderer.outputColorSpace=T.SRGBColorSpace;
  this.scene=new T.Scene();this.scene.background=new T.Color('#edf0dc');
  this.world=new T.Group();this.scene.add(this.world);
  this.camera=new T.OrthographicCamera(-1,1,1,-1,.01,200);
  this.shared={resolution:{value:new T.Vector2(720,530)},pixelRatio:{value:1},inkWeight:{value:1},svgLight:{value:new T.Vector3(-4,8,6).normalize()},viewPass:{value:0}};
  this.view='colour';this.definition=shapeMaterial('shape-preview','#72c4b1');
  this.node={id:'shape-preview',type:'mesh',material:this.definition.id,visible:true,dimensions:[1,1,1]};
  this.project={scene3d:{materials:[this.definition],environment:{inkWeight:1}}};
  this.sample={byId:new Map([[this.node.id,this.node]])};
  this.rig=rigUniforms();
  this.material=illustratedMaterial(this.definition,chainUniforms([this.rig]),this.shared);
  this.mesh=bindMeshTransform(new T.Mesh(new T.BufferGeometry(),this.material));
  this.mesh.userData.node=this.node.id;this.world.add(this.mesh);this.pickables=[this.mesh];
  this.freehand=new FreehandOutlines(this);
 }
 render(frame,color,yaw,pitch){
  if(frame!==this.frame){
   const m=frame.mesh,g=new T.BufferGeometry(),count=m.positions.length/3;
   g.setAttribute('position',new T.Float32BufferAttribute(m.positions,3));
   g.setAttribute('normal',new T.Float32BufferAttribute(m.normals,3));
   g.setAttribute('paintRole',new T.Float32BufferAttribute(new Float32Array(count),1));
   g.setAttribute('paintTone',new T.Float32BufferAttribute(new Float32Array(count).fill(1),1));
   g.setAttribute('sourcePaint',new T.Float32BufferAttribute(new Float32Array(count*3),3));
   g.setIndex(m.indices);g.computeBoundingSphere();
   this.mesh.geometry.dispose();this.mesh.geometry=g;this.frame=frame;
   this.node.dimensions.fill(frame.bounds.size);this.rig.rigHalf.value.setScalar(frame.bounds.size/2);
  }
  this.definition.palette[0]=color;this.definition.palette[1]=color;this.material.color.set(color);
  this.material.userData.uniforms.palette.value.forEach((v,i)=>v.set(this.definition.palette[i]));
  const b=frame.bounds,center=new T.Vector3(...b.min.map((v,i)=>(v+b.max[i])/2)),half=b.size*530/900;
  Object.assign(this.camera,{left:-half*720/530,right:half*720/530,top:half,bottom:-half,far:Math.max(200,b.size*8)});
  this.camera.position.set(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(b.size*3).add(center);
  this.camera.lookAt(center);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();
  this.freehand.update((p,n,source)=>p.applyMatrix4(source.matrixWorld));
  this.renderer.render(this.scene,this.camera);
  return this.canvas;
 }
 dispose(){this.freehand.dispose();this.mesh.geometry.dispose();this.material.userData.depth.dispose();this.material.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}
}
