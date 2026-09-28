import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
import {atlasGrid,cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),names=['head','body','backpack','arm-left','arm-right','staff','leg-left','leg-right','cape'],report=[];
for(const facing of ['side','front','back']){
 const file=path.join(root,'source',facing==='side'?'traveller-parts.png':'traveller-'+facing+'.png'),grid=await atlasGrid(file);
 for(const [i,name]of names.entries()){
 const png=await cutoutPNG(await sharp(file).extract(grid[i]).png().toBuffer(),240);
 const result=await convert(png,{preset:'cel',colors:16});await fs.writeFile(path.join(root,'traveller-'+facing+'-'+name+'.svg'),result.svg);report.push({name,facing,cut:grid[i],...result.stats});console.log(name,result.stats.paths);
}
}
await fs.writeFile(path.join(root,'traveller-conversion.json'),JSON.stringify({source:'source/traveller-parts.png',parts:report},null,2));
