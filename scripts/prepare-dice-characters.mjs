// Extract, align and vectorize the individually generated combat poses.
import sharp from 'sharp';
import fs from 'node:fs/promises';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {CHARACTER_POSES} from '../puppet-studio/dice/character-motion.js';
const root=new URL('../',import.meta.url),staticCells={idle:0,victory:4,defeat:5};
function removeMatte(data,info,checker=false){
 const seen=new Uint8Array(info.width*info.height),queue=new Int32Array(seen.length);let head=0,tail=0;
 const visit=i=>{if(seen[i])return;seen[i]=1;const k=i*4,low=Math.min(data[k],data[k+1],data[k+2]),high=Math.max(data[k],data[k+1],data[k+2]);if(data[k+3]<128||(low>(checker?85:232)&&high-low<(checker?30:24))){data.fill(0,k,k+4);queue[tail++]=i;}};
 for(let x=0;x<info.width;x++){visit(x);visit((info.height-1)*info.width+x);}
 for(let y=0;y<info.height;y++){visit(y*info.width);visit(y*info.width+info.width-1);}
 while(head<tail){const i=queue[head++],x=i%info.width,y=Math.floor(i/info.width);if(x)visit(i-1);if(x<info.width-1)visit(i+1);if(y)visit(i-info.width);if(y<info.height-1)visit(i+info.width);}
 // Drop disconnected generation marks; keep only the full-body component.
 const visited=new Uint8Array(seen.length);let largest=[];const goldParts=[];
 for(let i=0;i<seen.length;i++)if(!visited[i]&&data[i*4+3]>127){
  const component=[i];visited[i]=1;
  for(let q=0;q<component.length;q++){const p=component[q],x=p%info.width,y=Math.floor(p/info.width);for(const n of [x?p-1:-1,x<info.width-1?p+1:-1,y?p-info.width:-1,y<info.height-1?p+info.width:-1])if(n>=0&&!visited[n]&&data[n*4+3]>127){visited[n]=1;component.push(n);}}
  if(component.length>largest.length)largest=component;
  if(component.some(i=>{const k=i*4;return data[k]>130&&data[k+1]>85&&data[k+2]<135&&data[k]-data[k+2]>40;}))goldParts.push(component);
 }
 // Small detached halo rays belong to the character, so retain components near
 // the main silhouette; isolated black impact marks are excluded by area below.
 const keep=new Uint8Array(seen.length);for(const i of largest)keep[i]=1;
 // Preserve the gold rays from the orange halo even when they are detached.
 for(const component of goldParts)for(const i of component)keep[i]=1;
 for(let i=0;i<seen.length;i++)if(!keep[i])data.fill(0,i*4,i*4+4);
 return data;
}
const manifest={};
for(const character of ['orange','skeleton']){
 for(const pose of CHARACTER_POSES){
  let image;
  if(pose in staticCells){
   const atlas=await sharp(new URL(`output/dice-characters/${character}-source.png`,root).pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const n=staticCells[pose],w=atlas.info.width/3,h=atlas.info.height/2;
   image=await sharp(atlas.data,{raw:atlas.info}).extract({left:(n%3)*w,top:Math.floor(n/3)*h,width:w,height:h}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  }else image=await sharp(new URL(`output/dice-characters/${character}-${pose}-source.png`,root).pathname).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {data,info}=image;removeMatte(data,info,pose in staticCells);
  let minX=info.width,minY=info.height,maxX=0,maxY=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>127){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
  // Centre the complete silhouette rather than the trailing foot: a wide lunge
  // must not shrink when one foot reaches beyond the body's centre.
  const anchor=(minX+maxX)/2;
  const desiredHeight=({windup:385,reach:390,hurt:400,recoil:390,victory:420,defeat:310})[pose]??410;
  const scale=Math.min(desiredHeight/(maxY-minY+1),220/Math.max(anchor-minX,1),220/Math.max(maxX-anchor,1));
  const width=Math.round((maxX-minX+1)*scale),height=Math.round((maxY-minY+1)*scale),left=Math.round(256-(anchor-minX)*scale),top=480-height;
  const cutout=await sharp(data,{raw:info}).extract({left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1}).resize(width,height).png().toBuffer();
  const png=await sharp({create:{width:512,height:512,channels:4,background:'#00000000'}}).composite([{input:cutout,left,top}]).png().toBuffer();
  const result=await convert(png,{preset:'cel',colors:24,preserveDarkColors:true,traceSettings:{speckle:8,length:2.5}});
  await fs.writeFile(new URL(`puppet-studio/scene3d/assets/dice/characters/${character}-${pose}.svg`,root),result.svg);
  manifest[character+'-'+pose]={bounds:{left,top,right:left+width,bottom:top+height},groundAnchor:[256,480],sourceClipped:minX===0||minY===0||maxX===info.width-1||maxY===info.height-1};
  console.log(character,pose,result.svg.length);
 }
}
await fs.writeFile(new URL('output/dice-characters/pose-bounds.json',root),JSON.stringify(manifest,null,2));

await fs.writeFile(new URL('puppet-studio/scene3d/assets/dice/characters/pose-bounds.json',root),JSON.stringify(manifest,null,2));
