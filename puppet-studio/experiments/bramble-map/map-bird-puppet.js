import {bindHitFlash,hitFlashStrength} from '../shared/hit-flash.js';
import * as T from 'three';
import {vectorMaterial} from '../shared/vector-art.js';
// Cutout joints stay at the shoulder/tail root; every piece retains its own ink.
export function createMapBird(assets){
 const root=new T.Group(),bodyRoot=new T.Group(),flash={value:0};root.add(bodyRoot);
 function part(name,width,order,parent){
  const asset=assets.get('map-wren-'+name),art=asset.data,height=width*art.image.height/art.image.width;
  const geometry=asset.geometry.clone(),p=geometry.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-.5)*width,(.5-p.getY(i))*height,0);
  const mesh=new T.Mesh(geometry,vectorMaterial({transparent:true}));bindHitFlash(mesh.material,flash);mesh.material.transparent=true;mesh.material.depthTest=false;mesh.material.depthWrite=false;mesh.frustumCulled=false;mesh.renderOrder=1200+order;parent.add(mesh);return{mesh,height};
 }
 const tailRoot=new T.Group();bodyRoot.add(tailRoot);tailRoot.position.set(-.28,.36,0);const tail=part('tail',.3,1,tailRoot);tail.mesh.position.y=tail.height/2;
 const body=part('body',.72,3,bodyRoot).mesh;body.position.y=.4;
 const head=part('head',.56,5,bodyRoot).mesh;head.position.set(.25,.67,0);
 const wings=[2,4].map(order=>{const pivot=new T.Group();bodyRoot.add(pivot);pivot.position.set(.02,.47,0);pivot.scale.x=-1;const wing=part('wing',.52,order,pivot).mesh;wing.position.x=.25;return pivot;});
 return{root,render(b,time){
  const age=b.dead?Math.max(0,time-b.diedAt):0,phase=(b.dead?b.diedAt:time)*4.8*Math.PI*2,beat=b.dead?0:Math.sin(phase);flash.value=hitFlashStrength(time,b.hitAt);bodyRoot.traverse(n=>{if(n.isMesh)n.material.opacity=b.dead?Math.max(0,Math.min(1,1-(age-.3)/1.9)):1;});
  bodyRoot.scale.x=b.facing==='left'?-1:1;bodyRoot.position.y=beat*.022;bodyRoot.rotation.z=b.dead?-.8*Math.min(1,age/.4):-.08;
  body.scale.set(1+.035*beat,1-.035*beat,1);head.rotation.z=.025*Math.sin(time*2);
  wings.forEach((w,i)=>{w.rotation.z=.12+.9*Math.sin(phase+i*.24);w.scale.y=.8+.2*Math.cos(phase+i*.24);});
  tailRoot.rotation.z=Math.PI/2+.12*Math.sin(phase-.5);
 }};
}
