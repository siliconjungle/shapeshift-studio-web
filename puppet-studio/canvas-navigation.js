// Canvas-only navigation: scrolling pans; Ctrl/pinch-wheel zooms at the cursor.
// A second touch cancels an in-progress edit. Remaining fingers stay in the
// navigation gesture until all are lifted, so they cannot accidentally drag art.
export function installCanvasNavigation(canvas,{transform,start=()=>{},end=()=>{},enabled=()=>true}={}){
 const points=new Map(),forwarded=new WeakSet();let navigating=false,previous=null,nativeScale=null;
 const local=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const pair=()=>{const [a,b]=[...points.values()];return b?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}:null;};
 const block=e=>{e.preventDefault();e.stopImmediatePropagation();};
 function down(e){if(e.pointerType!=='touch'||forwarded.has(e)||!enabled())return;points.set(e.pointerId,local(e));if(points.size===2&&!navigating){navigating=true;start();
   // Reset single-touch consumers (e.g. orbit controls) before taking ownership.
   for(const id of points.keys()){if(id===e.pointerId)continue;const cancel=new PointerEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true});forwarded.add(cancel);canvas.dispatchEvent(cancel);}
  }if(navigating){previous=pair();block(e);for(const id of points.keys())try{canvas.setPointerCapture(id);}catch{}}}
 function move(e){if(e.pointerType!=='touch'||forwarded.has(e)||!points.has(e.pointerId))return;points.set(e.pointerId,local(e));if(!navigating)return;block(e);const next=pair();if(previous&&next)transform({from:previous,to:next,scale:next.distance/previous.distance});previous=next;}
 function up(e){if(e.pointerType!=='touch'||forwarded.has(e)||!points.has(e.pointerId))return;points.delete(e.pointerId);if(!navigating)return;block(e);previous=pair();if(!points.size){navigating=false;previous=null;end();}}
 function wheel(e){if(!enabled())return;block(e);if(nativeScale!==null)return;start();const p=local(e),unit=e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1,dx=e.deltaX*unit,dy=e.deltaY*unit;const zoom=e.ctrlKey||e.metaKey;transform({from:p,to:zoom?p:{x:p.x-(e.shiftKey&&!dx?dy:dx),y:p.y-(e.shiftKey&&!dx?0:dy)},scale:zoom?Math.exp(Math.max(-1,Math.min(1,-dy*.01))):1});end();}
 function gestureStart(e){if(!enabled())return;block(e);if(navigating)return;nativeScale=e.scale??1;start();}
 function gestureChange(e){if(!enabled())return;block(e);if(nativeScale===null||navigating)return;const scale=e.scale??1,p=local(e);transform({from:p,to:p,scale:scale/Math.max(.001,nativeScale)});nativeScale=scale;}
 function gestureEnd(e){if(!enabled())return;block(e);if(nativeScale!==null){nativeScale=null;end();}}
 const listeners={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,wheel,gesturestart:gestureStart,gesturechange:gestureChange,gestureend:gestureEnd};for(const [type,fn]of Object.entries(listeners))canvas.addEventListener(type,fn,{capture:true,passive:false});
 return{get active(){return navigating;},dispose(){for(const [type,fn]of Object.entries(listeners))canvas.removeEventListener(type,fn,true);points.clear();}};
}
