import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {bakeSilhouetteInk} from './map-edge-ink.mjs';
import {mapInk} from '../puppet-studio/experiments/bramble-map/ink-style.js';
import {sunflowerMapScale} from '../puppet-studio/experiments/bramble-map/character-depth.js';
import {VIEWS,spriteLayout,artPart,sampleFlower} from '../puppet-studio/experiments/sunflower-puppet/motion.js';
const root=path.resolve(import.meta.dirname,'../assets/sunflower-puppet'),folder=path.join(root,'map');await fs.mkdir(folder,{recursive:true});
const art=JSON.parse(await fs.readFile(path.join(root,'parts.json'),'utf8')),entries=[];
const previous=JSON.parse(await fs.readFile(path.join(folder,'parts.json'),'utf8').catch(()=>'{}'));
for(const view of VIEWS)for(const part of Object.keys(sampleFlower({view}).sprites)){
 const record=art.parts[view+'-'+artPart(part)],layout=spriteLayout(view,part,record),id=view+'-'+part;
 const bytes=await fs.readFile(path.join(root,record.src.replace('.svg','.png')));
 const key=createHash('sha256').update(bytes).update(JSON.stringify({layout,scale:sunflowerMapScale,ink:mapInk,version:1})).digest('hex');
 let source;
 if(previous.parts?.[id]?.sourceKey===key)source=await fs.readFile(path.join(folder,id+'-source.svg'),'utf8').catch(()=>null);
 if(!source){let input=sharp(bytes);if(layout.crop){const [u,v,w,h]=layout.crop,meta=await input.metadata(),left=Math.round(u*meta.width),top=Math.round(v*meta.height);input=input.extract({left,top,width:Math.min(meta.width-left,Math.round(w*meta.width)),height:Math.min(meta.height-top,Math.round(h*meta.height))});}source=(await convert(await input.png().toBuffer(),{preset:'cel',colors:12,preserveDarkColors:true})).svg;await fs.writeFile(path.join(folder,id+'-source.svg'),source);}
 const {data,info}=await sharp(Buffer.from(source)).resize({width:640}).ensureAlpha().raw().toBuffer({resolveWithObject:true});await fs.writeFile(path.join(folder,id+'.rgba'),data);await fs.writeFile(path.join(folder,id+'.json'),JSON.stringify(info));
 entries.push({id,view,part,layout,source,sourceKey:key});
}
const python=['python3','/opt/anaconda3/bin/python3'].find(bin=>spawnSync(bin,['-c','import numpy,skimage'],{stdio:'ignore'}).status===0);if(!python)throw Error('Missing silhouette tracing dependencies');
const script=`import json,numpy as np
from pathlib import Path
from skimage.measure import find_contours,approximate_polygon
root=Path(${JSON.stringify(folder)});result={}
for name in ${JSON.stringify(entries.map(e=>e.id))}:
 info=json.loads((root/(name+'.json')).read_text());h,w=info['height'],info['width']
 a=np.fromfile(root/(name+'.rgba'),dtype=np.uint8).reshape(h,w,4)[:,:,3]
 result[name]=[[[float(x-2)/w,float(y-2)/h] for y,x in approximate_polygon(c,tolerance=.7)[:-1]] for c in find_contours(np.pad(a>127,2).astype(float),.5) if len(c)>12]
(root/'contours.json').write_text(json.dumps(result))`;
if(spawnSync(python,['-c',script],{stdio:'inherit'}).status)throw Error('Silhouette extraction failed');
const loops=JSON.parse(await fs.readFile(path.join(folder,'contours.json'),'utf8')),parts={};
for(const e of entries){const file=path.join(folder,e.id+'.svg'),current=await fs.readFile(file,'utf8').catch(()=>''),options={ink:mapInk.color,bandWidth:mapInk.edgeBandWidth,displayWidth:e.layout.width*sunflowerMapScale,detail:true};const baked=bakeSilhouetteInk(e.source,loops[e.id],options,previous.parts?.[e.id],current);if(!baked.cached)await fs.writeFile(file,baked.svg);parts[e.id]={src:e.id+'.svg',view:e.view,part:e.part,layout:e.layout,sourceKey:e.sourceKey,cacheKey:baked.cacheKey,outputHash:baked.outputHash};await fs.rm(path.join(folder,e.id+'.rgba'));await fs.rm(path.join(folder,e.id+'.json'));}
await fs.writeFile(path.join(folder,'parts.json'),JSON.stringify({scale:sunflowerMapScale,ink:mapInk,parts},null,2));
console.log('Sunflower map art: 18 vector parts with map-scale silhouette ink.');
