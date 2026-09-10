import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
import {convert} from '../../../../inkwell-little-gods/tools/vectorize/convert.mjs';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'cap-prompts.json'),'utf8'));
const frontReports=JSON.parse(await fs.readFile(path.join(root,'vector-report.json'),'utf8'));
const reports=[];const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
for(const item of manifest){
 const source=path.join(import.meta.dirname,item.id+'-caps.png');await fs.copyFile(item.source,source);
 const {width,height}=await sharp(source).metadata();const half=Math.floor(width/2);
 for(const [index,face]of ['top','bottom'].entries()){
  const png=path.join(import.meta.dirname,`${item.id}-${face}.png`);
  await sharp(source).extract({left:index*half,top:0,width:half,height}).resize(768,768).png().toFile(png);
  let {svg,stats}=await convert(png,{preset:'cel',colors:8,preserveDarkColors:true});
  const palette=frontReports.find(r=>r.id===item.id).vectorPalette;
  svg=svg.replace(/fill="(#[a-fA-F0-9]{6})"/g,(_,hex)=>{const c=rgb(hex);const match=palette.map(h=>[h,rgb(h).reduce((n,v,i)=>n+(v-c[i])**2,0)]).sort((a,b)=>a[1]-b[1])[0][0];return 'fill="'+match+'"';});
  stats.colours=new Set([...svg.matchAll(/fill="(#[a-fA-F0-9]{6})"/g)].map(m=>m[1])).size;stats.vectorPalette=palette;stats.bytes=Buffer.byteLength(svg);
  await fs.writeFile(path.join(root,'assets',`${item.id}-${face}.svg`),svg);reports.push({id:item.id,face,...stats});
 }
}
await fs.writeFile(path.join(root,'cap-vector-report.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.map(({id,face,paths,colours,bytes})=>({id,face,paths,colours,bytes})),null,2));
