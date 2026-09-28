import {anchorCameraZoom,panCameraOnGround} from '../shared/camera-framing.js';
// Extra parchment covers the camera framing used by gameplay transitions.
export const mapBounds={x:-180,y:-80,width:1800,height:1200};
export const mapOverview={x:720,z:525,zoom:.88};
export class MapCamera{
 constructor(){this.reset();}
 reset(){this.target={x:mapOverview.x,z:mapOverview.z};this.zoom=mapOverview.zoom;}
 clamp(){const halfX=720/this.zoom,halfY=480/this.zoom,b=mapBounds;this.target.x=Math.max(b.x+halfX,Math.min(b.x+b.width-halfX,this.target.x));this.target.z=Math.max(b.y+halfY,Math.min(b.y+b.height-halfY,this.target.z));}
 pan(dx,dy,rect){panCameraOnGround(this.target,dx,dy,960/rect.height/this.zoom,0,Math.PI/2);this.clamp();}
 zoomBy(factor,x,y,rect){const old=this.zoom;this.zoom=Math.max(mapOverview.zoom,Math.min(3.5,old*factor));anchorCameraZoom(this.target,old,this.zoom,x,y,rect,480,0,Math.PI/2);this.clamp();}
 get view(){return{x:this.target.x-720/this.zoom,y:this.target.z-480/this.zoom,width:1440/this.zoom,height:960/this.zoom};}
}
export function mountMapCamera(svg,{onView,onTap,onScenery,onCloud,onBird,onCharacter}){
 let enabled=true;
 const camera=new MapCamera(),apply=()=>{const v=camera.view;svg.setAttribute('viewBox',`${v.x} ${v.y} ${v.width} ${v.height}`);svg.dataset.zoom=camera.zoom.toFixed(3);onView(v);};
 // Pointer input only activates artwork. Camera changes belong to gameplay.
 let down=null,dragged=false;
 const pointerDown=e=>{down={x:e.clientX,y:e.clientY};dragged=false;};
 const pointerMove=e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>7)dragged=true;};
 const pointerCancel=()=>{down=null;dragged=true;};
 const click=e=>{
  // Keep native keyboard activation on each interactive SVG element.
  if(e.detail===0)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!enabled||dragged)return;
  const target=e.target,character=target?.closest('[data-map-character]');if(character){onCharacter?.(character.dataset.mapCharacter);return;}
  const cloud=target?.closest('[data-cloud-id]');if(cloud){onCloud?.(cloud.dataset.cloudId);return;}
  const bird=target?.closest('[data-map-bird]');if(bird){onBird?.();return;}
  const prop=target?.closest('[data-scenery]');if(prop){if(prop.getAttribute('tabindex')!=='-1')onScenery?.(prop.dataset.scenery);return;}
  const node=target?.closest('[data-location]');if(node&&node.getAttribute('tabindex')!=='-1')onTap(node.dataset.location);
 };
 svg.addEventListener('pointerdown',pointerDown);svg.addEventListener('pointermove',pointerMove);svg.addEventListener('pointercancel',pointerCancel);svg.addEventListener('click',click,true);
 svg.removeAttribute('tabindex');svg.removeAttribute('aria-description');apply();
 return{camera,setEnabled(value){enabled=value;},setPose({x,z,zoom}){camera.target={x,z};camera.zoom=zoom;camera.clamp();apply();},get pose(){return{x:camera.target.x,z:camera.target.z,zoom:camera.zoom};},dispose(){svg.removeEventListener('pointerdown',pointerDown);svg.removeEventListener('pointermove',pointerMove);svg.removeEventListener('pointercancel',pointerCancel);svg.removeEventListener('click',click,true);}};
}
