import {feedbackReactions} from '../puppet-studio/experiments/bramble-map/feedback-motion.js';
import {sceneryEffectAssets} from '../puppet-studio/experiments/bramble-map/scenery-art.js';
import {mapClouds} from '../puppet-studio/experiments/bramble-map/map-atmosphere.js';
import {mapScene} from '../puppet-studio/experiments/bramble-map/scene.js';
import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),work=path.resolve(import.meta.dirname,'../work/map-silhouettes');await fs.mkdir(work,{recursive:true});
const names=[...feedbackReactions.map(id=>'emote-'+id),'map-bird-feather',...sceneryEffectAssets,...['left','body','right'].map(p=>'map-butterfly-'+p),...['body','head','wing','tail'].map(p=>'map-wren-'+p),'travel-backing','title-logo','location-lock','destination-pennant','selection-arrow','selection-puff',...new Set(mapClouds.map(c=>c.art)),...new Set(mapScene.scenery.map(s=>s[0]).filter(n=>!['pine','oak','rocks'].includes(n))),'banner','camp','shop','well','shrine','gate','keep','pine','oak','rocks',...['side','front','back'].flatMap(f=>['head','body','backpack','arm-left','arm-right','staff','leg-left','leg-right','cape'].map(p=>'traveller-'+f+'-'+p))];
for(const name of names){const current=await fs.readFile(path.join(root,name+'.svg'),'utf8'),source=current.includes('<!-- Ink palette baked:')?path.join(root,'source-vectors',name+'.svg'):path.join(root,name+'.svg');const {data,info}=await sharp(source).resize({width:640}).ensureAlpha().raw().toBuffer({resolveWithObject:true});await fs.writeFile(path.join(work,name+'.rgba'),data);await fs.writeFile(path.join(work,name+'.json'),JSON.stringify(info));}
const script=`import json,numpy as np
from pathlib import Path
from skimage.measure import find_contours, approximate_polygon
root=Path(${JSON.stringify(work)});result={}
for name in ${JSON.stringify(names)}:
 info=json.loads((root/(name+'.json')).read_text());h,w=info['height'],info['width']
 alpha=np.fromfile(root/(name+'.rgba'),dtype=np.uint8).reshape(h,w,4)[:,:,3]
 mask=np.pad(alpha>127,2)
 loops=[]
 for contour in find_contours(mask.astype(float),.5):
  if len(contour)<12:continue
  points=approximate_polygon(contour,tolerance=.7)
  loops.append([[round(float(x-2)/w,6),round(float(y-2)/h,6)] for y,x in points[:-1]])
 result[name]=loops
Path(${JSON.stringify(path.join(root,'silhouettes.json'))}).write_text(json.dumps(result,separators=(',',':')))
print('Prepared outer silhouettes for',len(result),'SVG assets')
`;
const python=['python3','/opt/anaconda3/bin/python3'].find(bin=>spawnSync(bin,['-c','import numpy,skimage'],{stdio:'ignore'}).status===0);if(!python)throw Error('Contour analysis requires numpy and skimage');const r=spawnSync(python,['-c',script],{stdio:'inherit'});if(r.status)throw Error('Silhouette extraction failed');
