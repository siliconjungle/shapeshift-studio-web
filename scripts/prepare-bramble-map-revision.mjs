import {atlasGrid,cutoutPNG} from './map-art-grid.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map');
const names=['camp','shop','well','shrine','gate','keep','pine','oak','rocks'];
async function cutout(buffer,threshold=160){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const i=(y*info.width+x)*4;if(data[i+3]<threshold){data.fill(0,i,i+4);continue;}data[i+3]=255;x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<=x0||y1<=y0)throw Error('No silhouette');
 return sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).extend({top:8,bottom:8,left:8,right:8,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
}
const atlas=path.join(root,'source/gods-locations.png'),grid=await atlasGrid(atlas),report=[];
for(const [i,name] of names.entries()){
 const revised=path.join(root,'source',name+(['well','keep'].includes(name)?'-atmosphere.png':'-revised.png')),hasRevision=['camp','shop','shrine','well','keep'].includes(name)&&await fs.access(revised).then(()=>true,()=>false);
 const png=hasRevision?await cutoutPNG(await fs.readFile(revised),640):await cutout(await sharp(atlas).extract(grid[i]).png().toBuffer());
 await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:16});
 await fs.writeFile(path.join(root,name+'.svg'),result.svg);report.push({name,...result.stats});console.log(name,result.stats.paths,'paths',result.stats.warnings);
}
for(const [name,file]of [['background','parchment-map'],['marker','traveller'],['banner','map-ribbon']]){
 const png=name==='background'?await sharp(path.join(root,'source',file+'.png')).resize(1152,768).png().toBuffer():await cutout(await sharp(path.join(root,'source',file+'.png')).resize({width:name==='marker'?320:900,withoutEnlargement:true}).png().toBuffer());
 const result=await convert(png,{preset:'cel',colors:16});await fs.writeFile(path.join(root,name+'.svg'),result.svg);report.push({name,...result.stats});console.log(name,result.stats.paths,'paths',result.stats.warnings);
}
const compass=await cutout(await sharp(path.join(root,'source/compass.png')).resize(384,384,{fit:'inside'}).png().toBuffer());
const result=await convert(compass,{preset:'cel',colors:6,preserveDarkColors:true});
await fs.writeFile(path.join(root,'compass.svg'),result.svg);
await fs.writeFile(path.join(root,'map-assets.json'),JSON.stringify({pipeline:'Fresh built-in GPT Image 2 artwork → alpha-separated assets → Little Gods cel vectorizer',palette:'Source colours reduced with Little Gods cel preset; run map-bramble-palette.mjs for the real DB32 Extended 128 shade-family mapping',atlas:'source/gods-locations.png',assets:report,compass:{source:'source/compass.png',stats:result.stats}},null,2));
