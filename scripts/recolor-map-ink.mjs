import {stumpLayout} from '../puppet-studio/experiments/bramble-map/scenery-art.js';
import {emoteFrame} from '../puppet-studio/experiments/bramble-map/emote-layout.js';
import {configureArtPalette,recolorSVG} from '../puppet-studio/experiments/shared/art-palette.js';
import {pathToFileURL} from 'node:url';
import {mapClouds} from '../puppet-studio/experiments/bramble-map/map-atmosphere.js';
import {mapInk} from '../puppet-studio/experiments/bramble-map/ink-style.js';
import fs from 'node:fs/promises';import path from 'node:path';
import {bakeSilhouetteInk} from './map-edge-ink.mjs';
import {mapScene} from '../puppet-studio/experiments/bramble-map/scene.js';
const root=path.resolve(import.meta.dirname,'../assets/bramble-map'),originals=path.join(root,'source-vectors');await fs.mkdir(originals,{recursive:true});
const contours=JSON.parse(await fs.readFile(path.join(root,'silhouettes.json'),'utf8')),report={ink:mapInk.color,method:'Preserve original interior fills; paint vector ink bands only at exterior and transparent-hole boundaries',assets:{}};
const previous=JSON.parse(await fs.readFile(path.join(root,'ink-recoloring.json'),'utf8').catch(()=>'{}'));let changed=0,cached=0;
for(const [name,loops] of Object.entries(contours)){
 if(['background','compass'].includes(name))continue;
 const file=path.join(root,name+'.svg'),backup=path.join(originals,name+'.svg'),current=await fs.readFile(file,'utf8');
 const source=current.includes('<!-- Ink palette baked:')?await fs.readFile(backup,'utf8'):current;
 if(source===current)await fs.writeFile(backup,source);
 let width=mapScene.locations.find(n=>n.asset===name)?.width??mapScene.scenery.find(n=>n[0]===name)?.[3]??mapClouds.find(c=>c.art===name)?.width??288;
 if(name.startsWith('map-stump-')){const prop=mapScene.scenery.find(s=>stumpLayout[s[0]]?.some(p=>p.art===name)),part=prop&&stumpLayout[prop[0]].find(p=>p.art===name);width=part?prop[3]*part.width:100;}
 if(name.startsWith('map-resource-'))width=50;
 if(name.startsWith('map-leaf-'))width=20;
 if(name.startsWith('emote-')){const box=source.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);width=Math.min(58,58*box[2]/box[3]);}
 if(name==='title-logo')width=640;
 if(name==='map-bird-feather')width=18;
 if(name==='selection-puff')width=44;
 if(name==='destination-pennant'){const box=source.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);width=Math.min(48,58*box[2]/box[3]);}
 if(name==='location-lock'){const box=source.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);width=Math.min(58,70*box[2]/box[3]);}
 if(name==='travel-backing')width=200;
 if(name.startsWith('map-butterfly-'))width=name.endsWith('body')?8.64:21.12;
 if(name.startsWith('map-wren-'))width=({body:36,head:28,wing:26,tail:15})[name.slice(9)];
 if(name==='selection-arrow'){const box=source.match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);width=Math.min(54,64*box[2]/box[3]);}
 if(name.startsWith('traveller-')){const part=name.replace(/^traveller-(side|front|back)-/,'');width=({head:54,body:46,backpack:34,'arm-left':13,'arm-right':13,'leg-left':18,'leg-right':18,cape:32})[part]??30;}
 const {svg,bands,cacheKey,outputHash,cached:hit}=bakeSilhouetteInk(source,loops,{ink:mapInk.color,displayWidth:width,canvasScale:name.startsWith('emote-')?emoteFrame.scale:1,detail:name.startsWith('emote-'),bandWidth:name.startsWith('emote-')?3.0:name.startsWith('map-leaf-')?.65:name.startsWith('map-butterfly-')?.85:name==='travel-backing'?2.2:name==='selection-puff'?1.8:name==='banner'?mapInk.bannerBandWidth:mapInk.edgeBandWidth},previous.assets?.[name+'.svg'],current.replace(/<!-- Ink palette baked:[\s\S]*?-->\n/,''));
 if(hit)cached++;else{changed++;await fs.writeFile(file,svg.replace('<svg','<!-- Ink palette baked: silhouette boundaries only; original vector in source-vectors. -->\n<svg'));}
 report.assets[name+'.svg']={bands,cacheKey,outputHash,displayWidth:width,interiorPaint:'original'};
}
const serialized=JSON.stringify(report,null,2);if(serialized!==JSON.stringify(previous,null,2))await fs.writeFile(path.join(root,'ink-recoloring.json'),serialized);
console.log(`SVG edge ink: ${changed} baked, ${cached} reused unchanged.`);

// CSS UI uses the same palette mapping as vector meshes, baked once for caching.
const palette=JSON.parse(await fs.readFile(path.join(root,'palette.json'),'utf8'));
const base=pathToFileURL(root+'/');configureArtPalette(palette.settings,palette.mappings,base);
const backing=recolorSVG(await fs.readFile(path.join(root,'travel-backing.svg'),'utf8'),new URL('travel-backing.svg',base));
const backingFile=path.join(root,'travel-backing-ui.svg');
if(await fs.readFile(backingFile,'utf8').catch(()=>null)!==backing)await fs.writeFile(backingFile,backing);
// The title is a cached UI SVG, using the same palette with fixed dark edge ink.
const title=recolorSVG(await fs.readFile(path.join(root,'title-logo.svg'),'utf8'),new URL('title-logo.svg',base)).replace(/(<g data-ink-edge="true" fill=")[^"]+/, '$1'+mapInk.color);
const titleFile=path.join(root,'title-logo-ui.svg');
if(await fs.readFile(titleFile,'utf8').catch(()=>null)!==title)await fs.writeFile(titleFile,title);
