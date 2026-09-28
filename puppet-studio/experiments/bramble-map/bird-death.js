import * as T from 'three';
import {vectorMaterial} from '../shared/vector-art.js';
import {puffPose} from './feedback-motion.js';
// The six-feather trajectory from Little Gods' village-creatures-view.js.
export function featherPose(origin,age,index,seed){
 const angle=index*Math.PI/3+seed,spread=Math.min(age,1.8)*(.3+index*.035);
 return{x:origin.x+Math.cos(angle)*spread,z:origin.z+Math.sin(angle)*spread,y:Math.max(.04,origin.y+.35+Math.sin(Math.min(1,age/2)*Math.PI)*(.4+index*.05)-age*.17),angle:angle+Math.sin(age*7+index)*.6,opacity:Math.min(1,(4-age)*1.5),visible:age>=0&&age<4};
}
export class BirdDeathEffects{
 constructor(scene,assets){
  const part=(name,width)=>{const asset=assets.get(name),geometry=asset.geometry.clone(),p=geometry.attributes.position,height=width*asset.data.image.height/asset.data.image.width;for(let i=0;i<p.count;i++)p.setXYZ(i,(p.getX(i)-.5)*width,(.5-p.getY(i))*height,0);const mesh=new T.Mesh(geometry,vectorMaterial({transparent:true}));mesh.material.depthTest=false;mesh.material.depthWrite=false;mesh.frustumCulled=false;mesh.visible=false;scene.add(mesh);return mesh;};
  this.feathers=Array.from({length:6},()=>part('map-bird-feather',18));this.puffs=Array.from({length:3},(_,i)=>part('selection-puff',i?28:62));this.burst=null;
 }
 hit(origin,time,seed){this.burst={origin:{...origin},time,seed};}
 update(time,gentle){const b=this.burst,age=b?time-b.time:Infinity;
  this.feathers.forEach((mesh,i)=>{mesh.visible=!!b&&age>=0&&age<4;if(!mesh.visible)return;const p=featherPose(b.origin,gentle?0:age,i,b.seed);mesh.position.set(p.x*100,-p.z*100+p.y*100,0);mesh.rotation.z=p.angle;mesh.material.opacity=Math.max(0,Math.min(p.opacity,(4-age)*1.5));mesh.renderOrder=100+p.z*50+.02;});
  this.puffs.forEach((mesh,i)=>{mesh.visible=!!b&&!gentle&&age>=.045&&age<.5;if(!mesh.visible)return;const p=puffPose(age-.045,i,false);mesh.position.set(b.origin.x*100+p.x,-b.origin.z*100+b.origin.y*100+p.y+20,0);mesh.scale.setScalar(p.scale);mesh.material.opacity=p.opacity;mesh.renderOrder=599;});
 }
}
