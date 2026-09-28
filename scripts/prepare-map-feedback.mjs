import fs from 'node:fs/promises';
import path from 'node:path';
import {cutoutPNG} from './map-art-grid.mjs';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),game=path.resolve(process.env.STUDIO_ART_SOURCE??(()=>{throw Error('Set STUDIO_ART_SOURCE to the source artwork project to regenerate these assets');})());
for(const [name,width,colors]of [['selection-arrow',320,6],['selection-puff',240,4]]){
 const png=await cutoutPNG(await fs.readFile(path.join(root,'source',name+'.png')),width);
 await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors});await fs.writeFile(path.join(root,name+'.svg'),result.svg);
 console.log(name,result.stats);
}
for(const id of ['humming','thinking','idea','delight','determined','cold'])await fs.copyFile(path.join(game,'assets/vector/reacts',id+'.svg'),path.join(root,'emote-'+id+'.svg'));
await fs.mkdir(path.join(root,'audio'),{recursive:true});
for(const id of ['humming','thinking','idea','happy','determined','cold'])await fs.copyFile(path.join(game,'assets/audio/villager-v3',id+'.mp3'),path.join(root,'audio',id+'.mp3'));
console.log('Prepared generated selection artwork and original Little Gods reactions/voices.');
