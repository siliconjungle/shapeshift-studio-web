import {svgText} from '../../vector/model.js';
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-][a-zA-Z0-9_/-]*$/.test(id)&&!id.includes('..')&&!['__proto__','constructor','prototype'].includes(id);
export function validateGameArtwork(entries=[]){
 if(!Array.isArray(entries)||entries.length>256)throw Error('Invalid game artwork collection');const ids=new Set();
 for(const entry of entries){if(!validId(entry.id)||ids.has(entry.id))throw Error('Invalid or duplicate game artwork ID');ids.add(entry.id);if(typeof entry.svg!=='string'||entry.svg.length>12000000||!/<svg[\s>]/i.test(entry.svg)||/<(?:script|foreignObject)\b|\son\w+\s*=/i.test(entry.svg))throw Error('Game artwork requires inert SVG paths');if(entry.enabled!==undefined&&typeof entry.enabled!=='boolean')throw Error('Invalid artwork enabled flag');if(entry.source!==undefined&&!validId(entry.source))throw Error('Invalid Studio artwork source');}
}
export function applyGameArtworkCommand(project,c){
 const entries=project.game.artwork??=[];let entry=entries.find(e=>e.id===c.nativeAsset);
 if(c.op==='game.artwork.set'){
  validateGameArtwork([{id:c.nativeAsset,svg:c.svg,enabled:c.enabled}]);
  if(entry)Object.assign(entry,{svg:c.svg,enabled:c.enabled??true});else entries.push({id:c.nativeAsset,svg:c.svg,enabled:c.enabled??true});return c.nativeAsset;
 }
 if(['game.artwork.import','game.artwork.apply'].includes(c.op)&&!Array.isArray(project.assets))throw Error('This command requires a Studio project with source assets. Use game.artwork.set to apply an exported SVG to game data.');
 if(c.op==='game.artwork.import'){
  if(entry?.source&&project.assets.some(a=>a.id===entry.source))return entry.source;
  if(!validId(c.id)||project.assets.some(a=>a.id===c.id))throw Error('Choose a unique Studio artwork ID');
  validateGameArtwork([{id:c.nativeAsset,svg:c.svg}]);project.assets.push({id:c.id,name:c.name??c.nativeAsset,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(c.svg)});
  if(entry)entry.source=c.id;else entries.push({id:c.nativeAsset,source:c.id,svg:c.svg,enabled:false});return c.id;
 }
 if(!entry)throw Error('Open a game artwork source first');
 if(c.op==='game.artwork.apply'){const source=project.assets.find(a=>a.id===entry.source);if(!source?.vector)throw Error('Open the source in Artwork before applying it');entry.svg=svgText(source.vector,c.time??0);entry.enabled=true;}
 else if(c.op==='game.artwork.revert')entry.enabled=false;
 else throw Error('Unknown game artwork command');validateGameArtwork(entries);return entry.source;
}
