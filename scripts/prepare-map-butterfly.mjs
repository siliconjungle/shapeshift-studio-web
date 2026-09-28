import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
import {atlasGrid,cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),source=await fs.readFile(path.join(root,'source/map-butterfly-sheet.png'));
const {height}=await sharp(source).metadata(),cells=await atlasGrid(source);
for(const [i,part]of ['left','body','right'].entries()){
 const cell=await sharp(source).extract({left:cells[i].left,width:cells[i].width,top:0,height}).png().toBuffer(),png=await cutoutPNG(cell,280);
 await fs.writeFile(path.join(root,'cutouts/map-butterfly-'+part+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:4});await fs.writeFile(path.join(root,'map-butterfly-'+part+'.svg'),result.svg);console.log(part,result.stats.paths,'paths');
}
