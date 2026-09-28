import fs from 'node:fs/promises';import path from 'node:path';
import {cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),assets=[];
for(const name of ['camp','shop','shrine']){
 const source='source/'+name+'-revised.png',png=await cutoutPNG(await fs.readFile(path.join(root,source)),640);
 await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:16});
 await fs.writeFile(path.join(root,name+'.svg'),result.svg);assets.push({name,source,...result.stats});console.log(name,result.stats.paths,'paths');
}
await fs.writeFile(path.join(root,'location-edits.json'),JSON.stringify({pipeline:'Built-in image generation → transparent cutout → actual Little Gods cel 16-colour reduction and SVG conversion',assets},null,2));
