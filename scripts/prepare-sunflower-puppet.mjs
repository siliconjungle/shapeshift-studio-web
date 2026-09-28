import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/sunflower-puppet');
const generation=JSON.parse(await fs.readFile(path.join(root,'generation.json'),'utf8'));
const parts=['head','body','hand-left','hand-right','foot-left','foot-right'];
const records={};
for(const job of generation.jobs){
 await fs.copyFile(job.generatedPath,path.join(root,'source',job.view+'.png'));
 const {data,info}=await sharp(job.generatedPath).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // The generated key is deliberately outside the character palette. Remove
 // it before tracing, including blended magenta pixels along the ink edge.
 for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];if(r>g*1.3+25&&b>g*1.3+25){data.fill(0,i,i+4);}}
 const keyed=await sharp(data,{raw:info}).png().toBuffer();
 await fs.writeFile(path.join(root,'source',job.view+'-keyed.png'),keyed);
 function gutter(axis,ideal){const size=axis==='x'?info.width:info.height,other=axis==='x'?info.height:info.width;let best=ideal,score=Infinity;for(let n=Math.round(ideal-size*.045);n<ideal+size*.045;n++){let pixels=0;for(let q=0;q<other;q++){const x=axis==='x'?n:q,y=axis==='y'?n:q;pixels+=data[(y*info.width+x)*4+3]>127?1:0;}const s=pixels*10000+Math.abs(n-ideal);if(s<score){score=s;best=n;}}return best;}
 const xs=[0,gutter('x',info.width/3),gutter('x',info.width*2/3),info.width],ys=[0,gutter('y',info.height/2),info.height];
 for(const [i,part] of parts.entries()){
  const col=i%3,row=Math.floor(i/3),cell={left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]};
  const {data:raw,info:ci}=await sharp(keyed).extract(cell).raw().toBuffer({resolveWithObject:true});let x0=ci.width,y0=ci.height,x1=-1,y1=-1;
  for(let y=0;y<ci.height;y++)for(let x=0;x<ci.width;x++)if(raw[(y*ci.width+x)*4+3]>127){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<0)throw Error('Empty cell '+job.view+'/'+part);
  const png=await sharp(raw,{raw:ci}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png().toBuffer();
  const id=job.view+'-'+part,result=await convert(png,{preset:'cel',colors:12,preserveDarkColors:true});
  await fs.writeFile(path.join(root,id+'.png'),png);await fs.writeFile(path.join(root,id+'.svg'),result.svg);
  records[id]={id,view:job.view,part,src:id+'.svg',width:result.stats.width,height:result.stats.height,sourceCell:cell,stats:result.stats};
  console.log(id,result.stats.paths+' paths',result.stats.silhouetteIoU.toFixed(3)+' silhouette IoU');
 }
}
await fs.writeFile(path.join(root,'parts.json'),JSON.stringify({format:'inkwell-directional-art',version:1,views:['front','back','side'],parts:records},null,2)+'\n');
