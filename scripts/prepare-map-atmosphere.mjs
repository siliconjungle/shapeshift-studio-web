import fs from 'node:fs/promises';
import path from 'node:path';
import {cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),assets=[];
for(const name of ['well','keep','cloud-cumulus','cloud-wisp']){
 const source='source/'+name+'-atmosphere.png',png=await cutoutPNG(await fs.readFile(path.join(root,source)),640);
 await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:name.startsWith('cloud-')?8:16});
 await fs.writeFile(path.join(root,name+'.svg'),result.svg);
 assets.push({name,source,...result.stats});console.log(name,result.stats.paths,'paths');
}
await fs.writeFile(path.join(root,'atmosphere-art.json'),JSON.stringify({pipeline:'Built-in image edits/generation → Little Gods cel colour reduction → SVG → palette mapping → edge ink (landmarks and clouds)',assets},null,2));
