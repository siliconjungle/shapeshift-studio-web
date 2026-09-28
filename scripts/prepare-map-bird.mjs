import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),source=await fs.readFile(path.join(root,'source/map-wren-sheet.png'));
const {width,height}=await sharp(source).metadata(),cw=Math.floor(width/2),ch=Math.floor(height/2);
for(const [i,part]of ['body','head','wing','tail'].entries()){
 const cell=await sharp(source).extract({left:i%2*cw,top:Math.floor(i/2)*ch,width:cw,height:ch}).png().toBuffer();
 const png=await cutoutPNG(cell,280);await fs.writeFile(path.join(root,'cutouts/map-wren-'+part+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:4});await fs.writeFile(path.join(root,'map-wren-'+part+'.svg'),result.svg);console.log(part,result.stats);
}
