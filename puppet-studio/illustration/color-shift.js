import {shiftRGB} from '@shapeshift-labs/studio-core/illustration/color-shift';
const cache=new WeakMap();
// Raster fallback only. Editable SVGs change paint values before rasterization.
export function shiftRaster(image,config){
 if(!config?.enabled||!config.amount)return image;
 let entry=cache.get(image);if(!entry){entry={variants:new Map()};cache.set(image,entry);}
 const c={...config,amount:Math.round(config.amount*64)/64,hue:Math.round(config.hue)},key=JSON.stringify([c,image.vectorFrame]);
 if(entry.variants.has(key))return entry.variants.get(key);
 const w=image.naturalWidth??image.width,h=image.naturalHeight??image.height,scale=Math.min(1,1024/Math.max(w,h)),canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(Math.ceil(w*scale),Math.ceil(h*scale)):Object.assign(document.createElement('canvas'),{width:Math.ceil(w*scale),height:Math.ceil(h*scale)}),ctx=canvas.getContext('2d');
 ctx.drawImage(image,0,0,canvas.width,canvas.height);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),d=pixels.data;
 for(let i=0;i<d.length;i+=4)if(d[i+3]){const rgb=shiftRGB([d[i],d[i+1],d[i+2]],c);d[i]=rgb[0];d[i+1]=rgb[1];d[i+2]=rgb[2];}
 ctx.putImageData(pixels,0,0);entry.variants.set(key,canvas);if(entry.variants.size>4)entry.variants.delete(entry.variants.keys().next().value);return canvas;
}
