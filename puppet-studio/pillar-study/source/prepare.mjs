import fs from 'node:fs/promises';
import path from 'node:path';
import {convert} from '../../../../inkwell-little-gods/tools/vectorize/convert.mjs';
const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(await fs.readFile(path.join(import.meta.dirname,'prompts.json'),'utf8'));
const reports=[];
const palettes={hearth:['#080e0b','#293329','#394630','#4b583b','#596648','#899376','#b3af8f','#d3c7a2'],cryos:['#0a111b','#253443','#344657','#455a6d','#5e788f','#7b9bb4','#a1bdd0','#d0e3e6'],solis:['#160e09','#503321','#70452b','#885637','#a06a42','#b98556','#cc9e6b','#e0b880']};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
for(const item of manifest){
 await fs.copyFile(item.source,path.join(import.meta.dirname,item.id+'.png'));
 let {svg,stats}=await convert(path.join(import.meta.dirname,item.id+'.png'),{preset:'cel',colors:8,preserveDarkColors:true});
 svg=svg.replace(/fill="(#[a-fA-F0-9]{6})"/g,(_,hex)=>{const c=rgb(hex);const match=palettes[item.id].map(h=>[h,rgb(h).reduce((n,v,i)=>n+(v-c[i])**2,0)]).sort((a,b)=>a[1]-b[1])[0][0];return 'fill="'+match+'"';});
 stats.colours=new Set([...svg.matchAll(/fill="(#[a-fA-F0-9]{6})"/g)].map(m=>m[1])).size;stats.vectorPalette=palettes[item.id];stats.bytes=Buffer.byteLength(svg);
 await fs.writeFile(path.join(root,'assets',item.id+'.svg'),svg);
 reports.push({id:item.id,...stats});
}
await fs.writeFile(path.join(root,'vector-report.json'),JSON.stringify(reports,null,2));
console.log(JSON.stringify(reports.map(({id,paths,colours,bytes})=>({id,paths,colours,bytes})),null,2));
