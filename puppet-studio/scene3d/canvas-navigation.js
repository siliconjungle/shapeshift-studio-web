import * as T from './vendor.js';
import {installCanvasNavigation} from '../canvas-navigation.js';
export function sceneNavigation(runtime){
 const ray=new T.Raycaster(),plane=new T.Plane(),direction=new T.Vector3(),ndc=new T.Vector2();
 const hit=p=>{const c=runtime.camera;ndc.set(p.x/runtime.canvas.clientWidth*2-1,1-p.y/runtime.canvas.clientHeight*2);ray.setFromCamera(ndc,c);return ray.ray.intersectPlane(plane,new T.Vector3());};
 const nav=installCanvasNavigation(runtime.canvas,{enabled:()=>!!runtime.controls,start:()=>{nav.onStart?.();const controls=runtime.controls,damping=controls.enableDamping;controls.enableDamping=false;controls.update();controls.enableDamping=damping;},transform:({from,to,scale})=>{
  const c=runtime.camera,controls=runtime.controls;c.updateMatrixWorld();c.getWorldDirection(direction);plane.setFromNormalAndCoplanarPoint(direction,controls.target);const before=hit(from);if(!before)return;
  if(c.isOrthographicCamera)c.zoom=T.MathUtils.clamp(c.zoom*scale,.01,100);
  else{const offset=c.position.clone().sub(controls.target),distance=offset.length();offset.multiplyScalar(T.MathUtils.clamp(distance/scale,.1,500)/Math.max(.0001,distance));c.position.copy(controls.target).add(offset);}
  c.updateProjectionMatrix();c.updateMatrixWorld();const after=hit(to);if(after){const delta=before.sub(after);c.position.add(delta);controls.target.add(delta);}controls.update();runtime.invalidate();
 }});return nav;
}
