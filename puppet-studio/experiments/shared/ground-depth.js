import * as THREE from 'three';

// 2.5D ordering: XZ decides foreground/background; height only breaks ties
// between stacked surfaces. Projection and visual elevation remain unchanged.
export const GROUND_HEIGHT_WEIGHT=.01;
export const groundDepthGLSL=`
vec4 groundOrderedClip(vec3 worldPoint,vec4 visualClip){
  vec4 orderClip=projectionMatrix*viewMatrix*vec4(worldPoint.x,worldPoint.y*.01,worldPoint.z,1.);
  visualClip.z=orderClip.z/orderClip.w*visualClip.w;
  return visualClip;
}
`;
export function setGroundAnchor(root,anchor){
  root.traverse(object=>{
    const material=object.material;
    if(material?.userData.groundAnchor){
      material.userData.groundAnchor.value.copy(anchor);
      material.userData.useGroundAnchor.value=1;
      if(material.userData.fogMoving)material.userData.fogMoving.value=root.userData.fogDynamic||/villager|raider|slime|beast|ghost/.test(root.name)?1:0;
    }
  });
}
export function logicalGroundPoint(point){
  return new THREE.Vector3(point.x,point.y*GROUND_HEIGHT_WEIGHT,point.z);
}
