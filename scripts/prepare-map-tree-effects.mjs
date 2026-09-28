import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';
import {cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),source=await fs.readFile(path.join(root,'source/map-tree-effects-sheet.png'));
const {width,height}=await sharp(source).metadata();
for(const [col,region] of ['hearth','solis','cryos'].entries())for(const [row,part] of ['stump','leaf'].entries()){
 const left=Math.round(col*width/3),right=Math.round((col+1)*width/3),top=row?600:0,bottom=row?height:600;
 const cell=await sharp(source).extract({left,top,width:right-left,height:bottom-top}).png().toBuffer(),png=await cutoutPNG(cell,part==='stump'?420:160),name=`map-${part}-${region}`;
 await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:6});await fs.writeFile(path.join(root,name+'.svg'),result.svg);console.log(name,result.stats.paths,'paths');
}

for(const size of ['large','small'])await fs.copyFile(path.join(root,'map-stump-hearth.svg'),path.join(root,'map-stump-pine-'+size+'.svg'));
for(const resource of ['wood','stone'])await fs.copyFile(path.join(root,'resources',resource+'.svg'),path.join(root,'map-resource-'+resource+'.svg'));
