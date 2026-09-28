// Two-pass Euclidean chamfer distance to the requested class, with no artificial
// canvas-edge seeds. Empty masks remain empty and transparent holes are included.
function distanceTo(mask,w,h,target){
 const d=new Float32Array(w*h);for(let i=0;i<d.length;i++)d[i]=mask[i]===target?0:1e8;
 const step=Math.SQRT2;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=x+y*w;let n=d[i];if(x)n=Math.min(n,d[i-1]+1);if(y)n=Math.min(n,d[i-w]+1);if(x&&y)n=Math.min(n,d[i-w-1]+step);if(x+1<w&&y)n=Math.min(n,d[i-w+1]+step);d[i]=n;}
 for(let y=h-1;y>=0;y--)for(let x=w-1;x>=0;x--){const i=x+y*w;let n=d[i];if(x+1<w)n=Math.min(n,d[i+1]+1);if(y+1<h)n=Math.min(n,d[i+w]+1);if(x+1<w&&y+1<h)n=Math.min(n,d[i+w+1]+step);if(x&&y+1<h)n=Math.min(n,d[i+w-1]+step);d[i]=n;}
 return d;
}
export function rewriteEdgePixels(data,w,h,width,color){
 if(width<=0)return data;
 const mask=new Uint8Array(w*h);for(let i=0;i<mask.length;i++)mask[i]=data[i*4+3]>100?1:0;
 const inside=distanceTo(mask,w,h,0),outside=distanceTo(mask,w,h,1),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),half=width/2;
 for(let i=0;i<mask.length;i++){const d=(mask[i]?inside[i]:outside[i])-.5,coverage=Math.max(0,Math.min(1,half+.5-d));if(!coverage)continue;for(let k=0;k<3;k++)data[i*4+k]=data[i*4+k]*(1-coverage)+rgb[k]*coverage;data[i*4+3]=Math.max(data[i*4+3],Math.round(255*coverage));}
 return data;
}
