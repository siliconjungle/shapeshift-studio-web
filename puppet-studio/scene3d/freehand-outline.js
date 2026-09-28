import {projectedInkPixels} from '../art/projected-ink.js';
import * as T from './vendor.js';
import {perfectFreehandVertex,perfectFreehandFragment} from '@shapeshift-labs/studio-core/scene3d/core/perfect-freehand';

// A topology cache avoids rebuilding shared edges during playback. Only the
// current silhouette is stroked; triangle boundaries never become ink.
export function outlineTopology(geometry){
 const positions=[],indices=[],lookup=new Map(),source=geometry.attributes.position;
 for(let i=0;i<source.count;i++){
  const p=[source.getX(i),source.getY(i),source.getZ(i)],key=p.map(v=>Math.round(v*1e6)).join(',');
  if(!lookup.has(key)){lookup.set(key,positions.length);positions.push(p);}
  indices.push(lookup.get(key));
 }
 const faces=[],edges=new Map(),index=geometry.index;
 for(let i=0;i<(index?.count??source.count);i+=3){
  const tri=[0,1,2].map(k=>indices[index?index.getX(i+k):i+k]);if(new Set(tri).size<3)continue;
  const face=faces.length;faces.push(tri);
  for(let k=0;k<3;k++){const a=tri[k],b=tri[(k+1)%3],key=a<b?a+':'+b:b+':'+a;if(!edges.has(key))edges.set(key,{a,b,faces:[]});edges.get(key).faces.push(face);}
 }
 return {positions,faces,edges:[...edges.values()]};
}

export function silhouetteLoops(topology,projected){
 const front=topology.faces.map(([a,b,c])=>{const p=projected[a],q=projected[b],r=projected[c];return p&&q&&r?(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])>1e-8:false;});
 const links=new Map(),edges=[];
 for(const e of topology.edges){if(!projected[e.a]||!projected[e.b])continue;const on=e.faces.filter(f=>front[f]).length;if(!on||on===e.faces.length&&e.faces.length>1)continue;
  const i=edges.length;edges.push(e);for(const v of [e.a,e.b]){if(!links.has(v))links.set(v,[]);links.get(v).push(i);}
 }
 const used=new Set(),loops=[];
 for(let i=0;i<edges.length;i++){
  if(used.has(i))continue;const loop=[],start=edges[i].a;let at=start,edge=i;
  while(!used.has(edge)){used.add(edge);loop.push(at);const e=edges[edge];at=e.a===at?e.b:e.a;if(at===start)break;edge=(links.get(at)??[]).find(j=>!used.has(j));if(edge===undefined)break;}
  if(at===start&&loop.length>=3)loops.push(loop.map(v=>projected[v]));
 }
 return loops;
}

// CPU work ends at the centreline: pressure handling and stroke construction
// happen in Perfect Freehand's shader port, including joins, caps and smoothing.
function contourSamples(loop){
 const lengths=loop.map((p,i)=>Math.hypot(p[0]-loop[(i+1)%loop.length][0],p[1]-loop[(i+1)%loop.length][1])),total=lengths.reduce((a,b)=>a+b,0);
 if(total<2)return [];
 const count=Math.max(24,Math.min(192,Math.ceil(total/4))),points=[];let edge=0,along=0;
 for(let i=0;i<count;i++){const d=i*total/count;while(edge<loop.length-1&&along+lengths[edge]<d)along+=lengths[edge++];const a=loop[edge],b=loop[(edge+1)%loop.length],t=(d-along)/Math.max(lengths[edge],1e-8);points.push(a.map((v,k)=>v+(b[k]-v)*t));}
 return points;
}
export function freehandMaterial(pass={value:0}){
 return new T.ShaderMaterial({uniforms:{inputPoints:{value:Array.from({length:48},()=>new T.Vector4())},restPoints:{value:Array.from({length:48},()=>new T.Vector3())},inputCount:{value:0},size:{value:8},thinning:{value:.7},smoothing:{value:.6},streamline:{value:0},simulatePressure:{value:0},complete:{value:1},taperStart:{value:0},taperEnd:{value:0},capStart:{value:1},capEnd:{value:1},variation:{value:0},seed:{value:0},depthBias:{value:.0000075},ink:{value:new T.Color('#161c17')},pass},vertexShader:perfectFreehandVertex,fragmentShader:perfectFreehandFragment,side:T.DoubleSide,transparent:true,depthTest:true,depthWrite:false});
}
export class FreehandOutlines{
 constructor(host){this.host=host;this.topologies=new WeakMap();this.entries=new Map();this.root=new T.Group();this.root.name='Perfect Freehand shader contours';this.root.userData.helper=true;host.scene.add(this.root);this.stats={contours:0,arcs:0};}
 clear(){for(const meshes of this.entries.values())for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}this.entries.clear();this.root.clear();}
 update(projectPoint){
  const h=this.host,s=h.project.scene3d,active=new Set(),width=h.shared.resolution.value.x,height=h.shared.resolution.value.y,camera=h.camera;
  this.stats={contours:0,arcs:0};this.root.visible=h.view==='colour';if(!this.root.visible)return;
  const defs=new Map(s.materials.map(m=>[m.id,m])),v=new T.Vector3(),clip=new T.Vector4();h.world.updateMatrixWorld(true);
  for(const source of h.pickables){const id=source.userData.node,n=h.sample.byId.get(id),m=defs.get(n?.material);
   if(!n||!m||m.strokeStyle!=='freehand'||source.userData.face||!['sphere','box','rounded-box','cylinder','cone','lathe','mesh'].includes(n.type)||active.has(id))continue;
   if(!n.visible||m.ink<=0)continue;let visible=true;for(let o=source;o;o=o.parent)if(!o.visible)visible=false;if(!visible)continue;
   active.add(id);let meshes=this.entries.get(id);if(!meshes){meshes=[];this.entries.set(id,meshes);}let arcIndex=0;
   let topology=this.topologies.get(source.geometry);if(!topology){topology=outlineTopology(source.geometry);this.topologies.set(source.geometry,topology);}
   const span=Math.max(...n.dimensions),projected=topology.positions.map(p=>{v.fromArray(p);projectPoint(v,n,source);clip.set(v.x,v.y,v.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);if(clip.w<=0||clip.z<=-clip.w||clip.z>=clip.w)return null;return [(clip.x/clip.w*.5+.5)*width,(clip.y/clip.w*.5+.5)*height,clip.z/clip.w,...p.map(x=>x/span)];});
   const scale=source.matrixWorld.elements,worldSpan=Math.max(...n.dimensions.map((d,i)=>d*Math.hypot(scale[i*4],scale[i*4+1],scale[i*4+2])));v.set(0,0,0);projectPoint(v,n,source);clip.set(v.x,v.y,v.z,1).applyMatrix4(camera.matrixWorldInverse).applyMatrix4(camera.projectionMatrix);
   const pixels=['object','world'].includes(m.outlineUnits)?projectedInkPixels(m.outlineUnits==='world'?(m.outlineWorldWidth??.025):(m.outlineWidth??.02)*worldSpan,camera.projectionMatrix.elements[5],height,clip.w):h.renderer.getPixelRatio();
   // Fixed subpixel inputs prevent insignificant matrix roundoff from changing
   // a coverage sample between editor and portable playback.
   // Baked animation frames share their parent's ink seed so replacement
   // meshes do not randomly change stroke pressure, including at the loop seam.
   const size=Math.round(pixels*m.ink*s.environment.inkWeight*2*1024)/1024;let seed=0;for(const c of (n.type==='mesh'?n.parent??id:id))seed=(seed*31+c.charCodeAt(0))%997;
   for(const loop of silhouetteLoops(topology,projected)){this.stats.contours++;const points=contourSamples(loop);if(!points.length)continue;
    for(let start=0;start<points.length;start+=24){const arc=Array.from({length:Math.min(24,points.length-start)+7},(_,i)=>points[(start+i)%points.length]);let mesh=meshes[arcIndex++];
     if(!mesh){const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(12),3));geometry.setIndex([0,1,2,0,2,3]);mesh=new T.Mesh(geometry,freehandMaterial(h.pipeline?h.pipeline.uniforms.pass:h.shared.viewPass));mesh.frustumCulled=false;mesh.renderOrder=8;mesh.userData.helper=true;mesh.userData.freehand=true;meshes.push(mesh);this.root.add(mesh);}
     mesh.visible=true;const u=mesh.material.uniforms;u.inputCount.value=arc.length;u.size.value=size;u.variation.value=m.strokeVariation??.65;u.smoothing.value=m.strokeSmoothing??.6;u.seed.value=seed*.01;u.ink.value.set(m.palette[3]);
     let left=Infinity,bottom=Infinity,right=-Infinity,top=-Infinity;
     arc.forEach((p,i)=>{u.inputPoints.value[i].set(Math.round(p[0]*1024)/1024,Math.round(p[1]*1024)/1024,.55,Math.round(p[2]*16777216)/16777216);u.restPoints.value[i].set(...p.slice(3).map(v=>Math.round(v*1048576)/1048576));left=Math.min(left,p[0]);right=Math.max(right,p[0]);bottom=Math.min(bottom,p[1]);top=Math.max(top,p[1]);});
     const padding=size*2+2;left=(left-padding)/width*2-1;right=(right+padding)/width*2-1;bottom=(bottom-padding)/height*2-1;top=(top+padding)/height*2-1;
     const p=mesh.geometry.attributes.position;p.setXYZ(0,left,bottom,0);p.setXYZ(1,right,bottom,0);p.setXYZ(2,right,top,0);p.setXYZ(3,left,top,0);p.needsUpdate=true;
    }
   }
   this.stats.arcs+=arcIndex;for(let i=arcIndex;i<meshes.length;i++)meshes[i].visible=false;
  }
  for(const [id,meshes]of this.entries)if(!active.has(id))for(const mesh of meshes)mesh.visible=false;
 }
 dispose(){this.clear();this.root.removeFromParent();}
}
