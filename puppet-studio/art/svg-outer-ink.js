import {perfectFreehandVertex,perfectFreehandFragment} from '@shapeshift-labs/studio-core/scene3d/core/perfect-freehand';
import {projectedInkPixels} from './projected-ink.js';
// The same Perfect Freehand shader as the 3D renderer, fed only the outside
// contours of each SVG's combined alpha silhouette, including transparent
// openings. No triangle or internal paint boundaries become strokes.
export class SvgOuterInk{
 constructor(T,contours){this.T=T;this.contours=contours;this.entries=new Map();this.point=new T.Vector3();this.size=new T.Vector2();}
 material(){const T=this.T;return new T.ShaderMaterial({uniforms:{inputPoints:{value:Array.from({length:48},()=>new T.Vector4())},restPoints:{value:Array.from({length:48},()=>new T.Vector3())},inputCount:{value:0},size:{value:8},thinning:{value:.7},smoothing:{value:.55},streamline:{value:0},simulatePressure:{value:0},complete:{value:1},taperStart:{value:0},taperEnd:{value:0},capStart:{value:1},capEnd:{value:1},variation:{value:.18},seed:{value:0},depthBias:{value:0},ink:{value:new T.Color()},pass:{value:0},inkOpacity:{value:1}},vertexShader:perfectFreehandVertex,fragmentShader:perfectFreehandFragment.replace('uniform vec3 ink;','uniform vec3 ink;uniform float inkOpacity;').replace('vec4(ink,alpha)','vec4(ink,alpha*inkOpacity)'),side:T.DoubleSide,transparent:true,depthTest:false,depthWrite:false});}
 update(records,renderer,camera,ink){
  const T=this.T;renderer.getDrawingBufferSize(this.size);const width=this.size.x,height=this.size.y;camera.updateMatrixWorld();
  // Orthographic map: every asset shares the same camera depth. This is the
  // exact world-width projection used by 3D; asset dimensions are excluded.
  const pixels=projectedInkPixels(ink.outerWidth,camera.projectionMatrix.elements[5],height,1),size=pixels*2;
  for(const record of records){if(record.name==='compass')continue;const loops=this.contours[record.name];if(!loops)continue;let meshes=this.entries.get(record);if(!meshes){meshes=[];this.entries.set(record,meshes);}for(const mesh of meshes)mesh.visible=false;
   if(!record.mesh.visible||pixels<=0)continue;let arcIndex=0;
   for(const loop of loops){
    const projected=loop.map(([x,y])=>{const sway=record.strength?.value??0,phase=record.uniform?.value??0;this.point.set(x+Math.sin(phase+y*.8)*(1-y)**2*sway,y,0).applyMatrix4(record.mesh.matrix).project(camera);return[(this.point.x*.5+.5)*width,(this.point.y*.5+.5)*height,this.point.z,x,y];});
    const lengths=projected.map((p,i)=>Math.hypot(p[0]-projected[(i+1)%projected.length][0],p[1]-projected[(i+1)%projected.length][1])),total=lengths.reduce((a,b)=>a+b,0);if(total<2)continue;
    const count=Math.max(24,Math.min(192,Math.ceil(total/5))),points=[];let edge=0,along=0;
    for(let i=0;i<count;i++){const distance=i*total/count;while(edge<lengths.length-1&&along+lengths[edge]<distance)along+=lengths[edge++];const a=projected[edge],b=projected[(edge+1)%projected.length],t=(distance-along)/Math.max(.0001,lengths[edge]);points.push(a.map((v,k)=>v+(b[k]-v)*t));}
    for(let start=0;start<points.length;start+=24){const arc=Array.from({length:Math.min(24,points.length-start)+7},(_,i)=>points[(start+i)%points.length]);let mesh=meshes[arcIndex++];
     if(!mesh){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(12),3));geometry.setIndex([0,1,2,0,2,3]);mesh=new T.Mesh(geometry,this.material());mesh.frustumCulled=false;meshes.push(mesh);record.mesh.parent.add(mesh);}
     // All puppet contours go behind all its pieces, avoiding ink across joints.
     mesh.renderOrder=record.name.startsWith('traveller-')?-10:record.mesh.renderOrder-.5;mesh.visible=true;const u=mesh.material.uniforms;u.inputCount.value=arc.length;u.size.value=size*(record.name==='banner'?.7:1);u.ink.value.set(ink.normal);u.inkOpacity.value=record.material.opacity;
     let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
     arc.forEach((p,i)=>{u.inputPoints.value[i].set(p[0],p[1],.55,p[2]);u.restPoints.value[i].set(p[3],p[4],0);left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1]);});
     const padding=size*2+2;left=(left-padding)/width*2-1;right=(right+padding)/width*2-1;bottom=(bottom-padding)/height*2-1;top=(top+padding)/height*2-1;const p=mesh.geometry.attributes.position;p.setXYZ(0,left,bottom,0);p.setXYZ(1,right,bottom,0);p.setXYZ(2,right,top,0);p.setXYZ(3,left,top,0);p.needsUpdate=true;
    }
   }
  }
 }
}
