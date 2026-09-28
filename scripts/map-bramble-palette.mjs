import {sceneryEffectAssets} from '../puppet-studio/experiments/bramble-map/scenery-art.js';
import {wildlifeAssets} from '../puppet-studio/experiments/bramble-map/map-wildlife.js';
import {mapScene} from '../puppet-studio/experiments/bramble-map/scene.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const web=path.resolve(import.meta.dirname,'..'),game=path.resolve(process.env.STUDIO_ART_SOURCE??(()=>{throw Error('Set STUDIO_ART_SOURCE to the source artwork project to regenerate these assets');})()),stage=path.join(web,'work/map-palette'),art=path.join(web,'assets/bramble-map');
// Run the game's real mapper unchanged in an isolated input tree. It resolves
// input/output relative to its own file, so no game artwork/profile is mutated.
for(const dir of ['scripts/palette','assets/vector/map','assets/palettes'])await fs.mkdir(path.join(stage,dir),{recursive:true});
for(const file of ['scripts/palette/map-assets.py','assets/palettes/db32-extended-128-design.json'])await fs.copyFile(path.join(game,file),path.join(stage,file));
const profile=JSON.parse(await fs.readFile(path.join(game,'game-authoring.json'),'utf8'));
// Use the game's editable palette-index contract for this parchment preset.
const remap={'#fbe7d4':'#eee5cf','#f6d6b9':'#e3d4b7','#eec39a':'#d2be99','#d9a066':'#b49a70','#8f563b':'#7b6248','#663931':'#594839','#fff6b9':'#eee4c6','#fffae0':'#f5eedb','#e6b466':'#bba27b','#eac459':'#c9b38e','#8a6f30':'#8b7656','#ad7148':'#987c56','#c28653':'#aa8e64','#9f6442':'#896e50','#7a4634':'#6b5540','#563037':'#514435','#322339':'#38342d'};
profile.data['art.palette'].colors=profile.data['art.palette'].colors.map(c=>remap[c]??c);profile.data['art.palette'].id='little-gods-parchment';
// Palette edits retain existing associations by contract; rebuilding this isolated
// stage from scratch chooses shade families for this preset's initial mapping.
await fs.rm(path.join(stage,profile.data['art.palette'].mappings),{force:true});
await fs.writeFile(path.join(stage,'game-authoring.json'),JSON.stringify({data:{'art.palette':profile.data['art.palette']}}));
const names=[...sceneryEffectAssets,'travel-backing',...wildlifeAssets,'emote-overheated','emote-love','title-logo','location-lock','destination-pennant','selection-arrow','selection-puff',...['humming','thinking','idea','delight','determined','cold'].map(n=>'emote-'+n),'cloud-cumulus','cloud-wisp',...new Set(mapScene.scenery.map(s=>s[0]).filter(n=>!['pine','oak','rocks'].includes(n))),'background','banner','compass','marker','camp','shop','well','shrine','gate','keep','pine','oak','rocks',...['side','front','back'].flatMap(f=>['head','body','backpack','arm-left','arm-right','staff','leg-left','leg-right','cape'].map(n=>'traveller-'+f+'-'+n))];
const requested=process.argv.slice(2),selected=requested.length?names.filter(n=>requested.includes(n)):names;
if(requested.some(n=>!names.includes(n)))throw Error('Unknown map asset');
await fs.rm(path.join(stage,'assets/vector/map'),{recursive:true,force:true});
await fs.mkdir(path.join(stage,'assets/vector/map'),{recursive:true});
for(const name of selected){const current=await fs.readFile(path.join(art,name+'.svg'),'utf8'),source=current.includes('<!-- Ink palette baked:')?path.join(art,'source-vectors',name+'.svg'):path.join(art,name+'.svg');await fs.copyFile(source,path.join(stage,'assets/vector/map',name+'.svg'));}
const python=['python3','/opt/anaconda3/bin/python3'].find(bin=>spawnSync(bin,['-c','import numpy,skimage'],{stdio:'ignore'}).status===0);
if(!python)throw Error('Little Gods palette mapper needs numpy and skimage');
const result=spawnSync(python,[path.join(stage,'scripts/palette/map-assets.py')],{stdio:'inherit'});if(result.status)throw Error('Palette mapping failed');
const mappings=JSON.parse(await fs.readFile(path.join(stage,profile.data['art.palette'].mappings),'utf8'));
const previous=requested.length?JSON.parse(await fs.readFile(path.join(art,'palette.json'),'utf8')):null;
const assets={...(previous?.mappings.assets??{}),...Object.fromEntries(selected.map(name=>[name+'.svg',mappings.assets['assets/vector/map/'+name+'.svg']]))};
// Regional scenery uses the same editable palette-index contract as the game.
const regionalPaints={
 'cryos-rocks.svg':{'#9a6d51':3,'#a47659':4,'#b08464':6,'#b98d6b':7,'#c39875':38,'#cda27c':38,'#d2a781':33,'#e1ba94':33,'#f4d1a9':44,'#8b5f3f':4,'#aa8244':6},
 'solis-rocks.svg':{'#9a6d51':4,'#a47659':4,'#b08464':45,'#b98d6b':6,'#c39875':6,'#cda27c':41,'#d2a781':41,'#e1ba94':7,'#f4d1a9':40},
 'solis-tree.svg':{'#b58240':45,'#c49051':45,'#d09e50':6,'#daa655':6,'#e0ad6f':41,'#f5c794':7,'#f8cb7d':41}
};
for(const [name,colors]of Object.entries(regionalPaints))if(assets[name])Object.assign(assets[name].colors,colors);
await fs.writeFile(path.join(art,'palette.json'),JSON.stringify({settings:profile.data['art.palette'],mappings:{...mappings,assets},grading:{version:1,preset:'neutral',enabled:true,contrast:1.02,saturation:.96,temperature:0,split:0}},null,2));
console.log('Prepared real Little Gods palette mapping and neutral parchment post-process profile');
