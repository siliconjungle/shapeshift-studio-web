import * as T from './vendor.js';
import {composeFace} from './core/facial-control.js';
import {FacialAnimation} from './core/facial-animation.js';
export class SceneFacials {
 constructor(runtime){this.runtime=runtime;this.actors=new Map();this.last=null;this.pointer=null;this.ray=new T.Raycaster();this.point=new T.Vector3();this.plane=new T.Plane();this.center=new T.Vector3();this.normal=new T.Vector3();this.listener=e=>{const r=runtime.canvas.getBoundingClientRect();this.pointer=new T.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);};runtime.canvas.addEventListener('pointermove',this.listener);}
 configure(nodes){const ids=new Set();for(const node of nodes)if(node.facial&&Object.values(node.surfaces).some(s=>s.eye)){ids.add(node.id);const actor=this.actors.get(node.id);if(actor)actor.configure(node.facial);else this.actors.set(node.id,new FacialAnimation(node.facial));}for(const id of this.actors.keys())if(!ids.has(id))this.actors.delete(id);}
 blink(id){this.actors.get(id)?.blink();this.runtime.invalidate();}
 // Optional externally owned clock for reproducible preview/export playback.
 // Ordinary editor use keeps the independent wall clock until explicitly bound.
 setClock(time,{reset=false}={}){if(!Number.isFinite(time)||time<0)throw Error('Invalid facial clock');if(reset||this.timelineClock===undefined||time<this.timelineClock){for(const [id,actor]of this.actors)this.actors.set(id,new FacialAnimation(actor.definition));this.timelineClock=0;this.last=0;}while(this.timelineClock<time-1e-9){this.timelineClock=Math.min(time,this.timelineClock+1/60);this.update(0);}this.timelineClock=time;this.update(0);}
 releaseClock(){delete this.timelineClock;this.last=null;}
 update(now){if(this.timelineClock!==undefined)now=this.timelineClock*1000;const dt=this.last===null?0:Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;const r=this.runtime;if(!r.sample)return false;let changed=false;
  for(const [id,actor]of this.actors){const node=r.sample.byId.get(id),object=r.objects.get(id);if(!node||!object)continue;let pointer=null;if(actor.definition.gaze.mode==='pointer'&&this.pointer){this.center.set(0,0,node.dimensions[2]/2).applyMatrix4(object.matrixWorld);this.normal.set(0,0,1).transformDirection(object.matrixWorld);this.plane.setFromNormalAndCoplanarPoint(this.normal,this.center);this.ray.setFromCamera(this.pointer,r.camera);if(this.ray.ray.intersectPlane(this.plane,this.point)){object.worldToLocal(this.point);pointer=[T.MathUtils.clamp(this.point.x*.25,-.32,.32),T.MathUtils.clamp(this.point.y*.25,-.13,.13)];}}
   const face=actor.step(dt,pointer);
   for(const mesh of r.uniformTargets.get(id)??[]){const eye=node.surfaces[mesh.userData.face]?.eye,u=mesh.material.userData.uniforms;if(!eye||!u?.eyeOpen)continue;const {open,tilt,gaze}=composeFace(eye,face,r.sample.clip.events,id,r.time);if(Math.abs(u.eyeOpen.value-open)>1e-7||Math.abs(u.eyeTilt.value-tilt)>1e-7||Math.abs(u.gaze.value.x-gaze[0])>1e-7||Math.abs(u.gaze.value.y-gaze[1])>1e-7)changed=true;u.eyeOpen.value=open;u.eyeTilt.value=tilt;u.gaze.value.fromArray(gaze);}
  }return changed;
 }
 snapshot(){return Object.fromEntries([...this.actors].map(([id,a])=>[id,{time:a.time,expression:a.definition.expression,gaze:a.gaze.slice(),forcedAt:a.forcedAt}]));}
 dispose(){this.runtime.canvas.removeEventListener('pointermove',this.listener);this.actors.clear();}
}
