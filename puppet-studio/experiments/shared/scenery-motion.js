import {attachFoliageDeformation} from './foliage-deformation.js';
import * as THREE from 'three';
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};

// Deform the existing illustrated card as a shared-vertex mesh, just like the
// puppet. All offsets are measured from a saved rest pose, never accumulated.
export function treeMotion(mesh) {
  const uniforms=attachFoliageDeformation(mesh,{kind:'tree',phase:mesh.position.x*.83+mesh.position.z*.57});
  mesh.geometry.boundingSphere.radius+=mesh.userData.base*.1;
  return time=>{uniforms.foliageTime.value=time};
}
