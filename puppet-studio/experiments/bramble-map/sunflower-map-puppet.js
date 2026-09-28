import * as T from 'three';
import {vectorMaterial} from '../shared/vector-art.js';
import {sampleFlower,bezier} from '../sunflower-puppet/motion.js';
import {mapInk} from './ink-style.js';
import {sunflowerMapScale} from './character-depth.js';

// Native vector meshes in the same foreground pass as the travelling character.
// Prepared assets already contain cropped artwork and baked silhouette borders.
export async function createSunflowerMapPuppet(renderer,assetBase){
 const response=await fetch(assetBase+'map/parts.json');if(!response.ok)throw Error('Sunflower map artwork did not load');
 const art=await response.json(),root=new T.Group(),pieces=[],curves=[];
 if(art.scale!==sunflowerMapScale)throw Error('Rebuild sunflower outlines for the current map scale');
 const material=()=>{const m=vectorMaterial({transparent:true});m.depthTest=false;m.depthWrite=false;return m;};
 await Promise.all(Object.entries(art.parts).filter(([,r])=>r.view==='front').map(async([id,r])=>{
  const url=new URL(assetBase+'map/'+r.src,location.href),source=await fetch(url);if(!source.ok)throw Error('Missing sunflower part '+id);
  await renderer.asset('sunflower-'+id,await source.text(),url);
  const g=renderer.assets.get('sunflower-'+id).geometry.clone(),p=g.attributes.position,l=r.layout;
  for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-l.pivotX)*l.width,-(p.getY(i)-l.pivotY)*l.height,0);
  const mesh=new T.Mesh(g,material());mesh.frustumCulled=false;root.add(mesh);pieces.push({mesh,part:r.part,layer:l.layer});
 }));
 const rest=sampleFlower();
 for(const [part,c]of Object.entries(rest.curves))for(const outline of [true,false]){
  const g=new T.BufferGeometry(),positions=new Float32Array(25*2*3),indices=[];
  for(let i=0;i<24;i++){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
  g.setAttribute('position',new T.BufferAttribute(positions,3));g.setIndex(indices);
  const m=new T.MeshBasicMaterial({color:outline?mapInk.color:'#788b40',side:T.DoubleSide,transparent:true,depthTest:false,depthWrite:false}),mesh=new T.Mesh(g,m);mesh.frustumCulled=false;root.add(mesh);curves.push({mesh,part,outline,layer:c.layer+(outline?0:.1)});
 }
 root.scale.setScalar(sunflowerMapScale);renderer.foregroundScene.add(root);
 const parts=[...pieces,...curves];
 return {root,setOrder(base){for(const p of parts)p.mesh.renderOrder=base+p.layer;},pose({time,clip='idle',opacity=1}){
  const p=sampleFlower({time,clip});root.visible=opacity>.001;
  for(const piece of pieces){const s=p.sprites[piece.part];piece.mesh.position.set(s.x,-s.y,0);piece.mesh.rotation.z=-s.rotation*Math.PI/180;piece.mesh.scale.set(s.scaleX??1,s.scaleY??1,1);piece.mesh.material.opacity=opacity;}
  for(const piece of curves){const c=p.curves[piece.part],a=piece.mesh.geometry.attributes.position;
   for(let i=0;i<25;i++){const t=i/24,point=bezier(c.points,t),before=bezier(c.points,Math.max(0,t-.001)),after=bezier(c.points,Math.min(1,t+.001)),dx=after[0]-before[0],dy=after[1]-before[1],length=Math.hypot(dx,dy)||1,width=c.width+((c.endWidth??c.width)-c.width)*t+(piece.outline?mapInk.edgeBandWidth/sunflowerMapScale:0);
    for(let side=0;side<2;side++){const offset=(side-.5)*width;a.setXYZ(i*2+side,point[0]-dy/length*offset,-point[1]-dx/length*offset,0);}
   }a.needsUpdate=true;piece.mesh.material.opacity=opacity;
  }
 },dispose(){renderer.foregroundScene.remove(root);for(const p of parts){p.mesh.geometry.dispose();p.mesh.material.dispose();}}};
}
