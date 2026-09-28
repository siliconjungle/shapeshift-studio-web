import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),names=['camp','shop','well','shrine','gate','keep','pine','oak','rocks'],report=[];
await fs.mkdir(path.join(root,'cutouts'),{recursive:true});
async function cutout(buffer,threshold=160){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;const key=data[i]>180&&data[i+2]>150&&data[i+1]<100;if(data[i+3]<threshold||key){data.fill(0,i,i+4);continue;}data[i+3]=255;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<=x0||y1<=y0)throw Error('No silhouette');
 return sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
}
async function trace(name,png,options={}){await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);const result=await convert(png,{preset:'cel',colors:16,preserveDarkColors:true,...options});await fs.writeFile(path.join(root,name+'.svg'),result.svg);report.push({name,...result.stats});console.log(name,result.stats.paths,'paths',Math.round(result.stats.bytes/1024)+'KB',result.stats.warnings);}
for(let i=0;i<9;i++){const png=await sharp(path.join(root,'source/atlas.png')).extract({left:(i%3)*418,top:Math.floor(i/3)*418,width:418,height:418}).png().toBuffer();await trace(names[i],await cutout(png));}
await trace('banner',await cutout(await fs.readFile(path.join(root,'source/banner.png')),240),{colors:8});
await trace('background',await sharp(path.join(root,'source/background.png')).resize(1152,768).median(7).png().toBuffer(),{colors:12});
await fs.writeFile(path.join(root,'vectorization.json'),JSON.stringify({pipeline:'GPT Image 2 → alpha-separated assets → Little Gods cel vectorizer',engine:'@neplex/vectorizer / VTracer',assets:report},null,2));
