import {slicingMaps} from './model.js';
// Crop coordinates are normalized to the original image; reference dimensions
// are in the piece's local units, independent of texture resolution and zoom.
export function drawSlicedImage(ctx,image,slicing,x,y,width,height,crop=[0,0,1,1]){
 const iw=image.naturalWidth??image.width,ih=image.naturalHeight??image.height;
 if(!slicing?.enabled){ctx.drawImage(image,crop[0]*iw,crop[1]*ih,crop[2]*iw,crop[3]*ih,x,y,width,height);return;}
 const [xs,ys]=slicingMaps(slicing,[width,height]),[sw,sh]=slicing.sourceSize;
 for(const row of ys)for(const col of xs){if(row.end<=row.start||col.end<=col.start)continue;ctx.drawImage(image,(crop[0]+crop[2]*col.from/sw)*iw,(crop[1]+crop[3]*row.from/sh)*ih,crop[2]*(col.to-col.from)/sw*iw,crop[3]*(row.to-row.from)/sh*ih,x+col.start,y+row.start,col.end-col.start,row.end-row.start);}
}
