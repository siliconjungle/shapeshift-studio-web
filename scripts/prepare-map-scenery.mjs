import fs from 'node:fs/promises';
import path from 'node:path';
import {cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),assets=[];
for(const name of ['cryos-pine','solis-tree']){
 const source='source/'+name+'.png',png=await cutoutPNG(await fs.readFile(path.join(root,source)),640);
 await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:16});
 await fs.writeFile(path.join(root,name+'.svg'),result.svg);
 assets.push({name,source,...result.stats});console.log(name,result.stats.paths,'paths');
}
for(const name of ['cryos-rocks','solis-rocks'])await fs.copyFile(path.join(root,'source-vectors/rocks.svg'),path.join(root,name+'.svg'));
await fs.writeFile(path.join(root,'regional-scenery.json'),JSON.stringify({pipeline:'Generated transparent trees → Little Gods cel 16-colour reduction → SVG → Little Gods regional palette mappings and edge ink',assets},null,2));
