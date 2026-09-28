// Use Little Gods' actual bounded cloud motion, in the map's coordinate system.
import {CLOUDS,sampleCloudMotion} from '../shared/cloud-motion.js';
// Preserve the game's drift-to-art-size ratio as well as its motion curve.
// The previous map amplitudes were only one third to one half of that ratio.
export const mapClouds=[
 {source:'wisp',art:'cloud-wisp',x:200,z:125,width:255,phase:-.55},
 {source:'cumulus',art:'cloud-cumulus',x:1040,z:145,width:210},
 {source:'twins',art:'cloud-wisp',x:410,z:680,width:195}
].map(layout=>{
 const original=CLOUDS.find(c=>c.art===layout.source),scale=layout.width/original.width;
 return{...original,...layout,y:0,drift:original.drift*scale,meander:original.meander*scale};
});
export function cloudPose(cloud,time,gentle=false){const p=sampleCloudMotion(cloud,gentle?0:time);return{x:p.x,y:p.z};}
// Little Gods sunlight (-.65,1,-.8), projected onto the illustrated map plane.
// Keeping the ground anchor fixed is essential: silhouettes meet their feet.
export const mapShadowRay={x:.65*.3,y:.8*.3};
export function shadowProjection(T,groundY,ray=mapShadowRay){return new T.Matrix4().set(1,ray.x,0,ray.x*groundY,0,-ray.y,0,-groundY*(1+ray.y),0,0,1,0,0,0,0,1);}
