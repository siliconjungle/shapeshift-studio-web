import {shiftColor} from '@shapeshift-labs/studio-core/illustration/color-shift';
import {sampleVector,pathData,paintColor,shapeBounds,vectorTime,vectorClipGeometry,trimStroke} from './model.js';
const caches=new WeakMap();
function pathFor(s,cache){let p=cache.get(s.points);if(!p){p=new Path2D(pathData(s));cache.set(s.points,p);}return p;}
function paint(ctx,value,v,s,colorShift){if(!value?.type)return shiftColor(paintColor(value,v),colorShift);const b=value.units==='userSpaceOnUse'?{x:0,y:0,width:1,height:1}:shapeBounds(s);const x=b.x+value.x1*b.width,y=b.y+value.y1*b.height,g=value.type==='radial'?ctx.createRadialGradient(x,y,0,x,y,Math.max(.0001,value.x2*Math.max(b.width,b.height))):ctx.createLinearGradient(x,y,b.x+value.x2*b.width,b.y+value.y2*b.height);for(const stop of value.stops)g.addColorStop(stop.offset,shiftColor(stop.color,colorShift)+Math.round((stop.opacity??1)*255).toString(16).padStart(2,'0'));return g;}
export function renderVector(ctx,v,time=0,{outline=false,colorShift}={}){const cache=caches.get(v)??new WeakMap();caches.set(v,cache);const shapes=sampleVector(v,time),byId=new Map(shapes.map(s=>[s.id,s]));for(const s of shapes){if(s.hidden)continue;ctx.save();for(const clip of s.clips??[]){const source=byId.get(clip.source);if(!source)continue;const geometry=vectorClipGeometry(v,source,clip);ctx.clip(clip.inverse?new Path2D(geometry.d):pathFor(source,cache),geometry.rule);}ctx.globalAlpha*=s.opacity;const p=pathFor(s,cache);if(s.fill!=='none'&&!outline){ctx.fillStyle=paint(ctx,s.fill,v,s,colorShift);ctx.fill(p,s.fillRule);}if(s.stroke!=='none'&&s.strokeWidth>0||outline){ctx.strokeStyle=outline?'#8996ab':paint(ctx,s.stroke,v,s,colorShift);ctx.lineWidth=outline?.7:s.strokeWidth;ctx.lineCap=s.lineCap;ctx.lineJoin=s.lineJoin;ctx.stroke(outline?p:pathFor(trimStroke(s),cache));}ctx.restore();}}
const buffers=new WeakMap();
export function vectorCanvas(v,time=0,width=512,height=512,colorShift){let b=buffers.get(v);if(!b){b={canvas:typeof OffscreenCanvas==='function'?new OffscreenCanvas(width,height):Object.assign(document.createElement('canvas'),{width,height})};buffers.set(v,b);}const key=[v.boundFrame??0,v.tracks.length?vectorTime(v,time):v.boil?.enabled?Math.floor(vectorTime(v,time)*v.boil.rate)%v.boil.variants:0,width,height,JSON.stringify(colorShift)].join(':');if(key===b.key)return b.canvas;const c=b.canvas;if(c.width!==width)c.width=width;if(c.height!==height)c.height=height;const ctx=c.getContext('2d');ctx.resetTransform();ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/v.viewBox[2],height/v.viewBox[3]);ctx.translate(-v.viewBox[0],-v.viewBox[1]);renderVector(ctx,v,time,{colorShift});ctx.restore();b.key=key;c.vectorFrame=key;return c;}

// Reuse exactly the render geometry for selection; clipped-away pixels are not targets.
export function vectorClipContains(ctx,v,shape,shapes,x,y){
 for(const clip of shape.clips??[]){const source=shapes.find(s=>s.id===clip.source);if(!source)continue;const {d,rule}=vectorClipGeometry(v,source,clip);if(!ctx.isPointInPath(new Path2D(d),x,y,rule))return false;}
 return true;
}

export function vectorStrokeContains(ctx,shape,x,y,tolerance=0){
 if(shape.stroke==='none'||shape.strokeWidth<=0)return false;
 ctx.save();ctx.lineWidth=Math.max(shape.strokeWidth,tolerance);ctx.lineCap=shape.lineCap;ctx.lineJoin=shape.lineJoin;
 const hit=ctx.isPointInStroke(new Path2D(pathData(trimStroke(shape))),x,y);ctx.restore();return hit;
}
