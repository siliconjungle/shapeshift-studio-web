export function validateArtPaletteSettings(settings){
 if(!settings||typeof settings!=='object'||Array.isArray(settings)||typeof settings.enabled!=='boolean')throw Error('Invalid art palette settings');
 if(Object.keys(settings).some(k=>!['enabled','id','colors','mappings'].includes(k)))throw Error('Unknown art palette setting');
 if(settings.id!==undefined&&typeof settings.id!=='string')throw Error('Invalid art palette id');
 if(settings.colors!==undefined&&(!Array.isArray(settings.colors)||settings.colors.some(c=>typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))))throw Error('Invalid art palette colours');
 if(settings.mappings!==undefined&&typeof settings.mappings!=='string')throw Error('Invalid art palette mapping path');
 if(settings.enabled&&(!settings.colors?.length||!settings.mappings))throw Error('Art palette requires colours and mappings');
 return true;
}
// Recolour only an in-memory copy of SVG artwork. Source files are never written.
const FILL=/(fill=")(#[0-9a-fA-F]{6})(")/g;
let config={enabled:false,colors:[]},assets={},root,ready,observer;
const images=new Map(),pendingImages=new WeakMap();
export function configureArtPalette(settings,mappings,base){
 if(!Array.isArray(settings.colors)||settings.colors.some(c=>!/^#[0-9a-f]{6}$/i.test(c)))throw Error('Invalid art palette colours');
 for(const entry of Object.values(mappings.assets??{}))for(const index of Object.values(entry.colors))if(!Number.isInteger(index)||index<0||index>=settings.colors.length)throw Error('Invalid art palette index');
 for(const promise of images.values())promise.then(url=>{if(url.startsWith('blob:'))URL.revokeObjectURL(url)}).catch(()=>{});
 images.clear();config=structuredClone(settings);assets=mappings.assets??{};root=new URL('./',base);
}
function assetKey(src){
 if(!root)return null;
 const url=new URL(src,root);
 if(url.origin!==root.origin||!url.pathname.startsWith(root.pathname))return null;
 return decodeURI(url.pathname.slice(root.pathname.length));
}
export function recolorSVG(text,src){
 if(!config.enabled)return text;
 const entry=assets[assetKey(src)];if(!entry)return text;
 return text.replace(FILL,(match,start,color,end)=>{
  const index=entry.colors[color.toLowerCase()];
  return index===undefined?match:start+config.colors[index]+end;
 });
}
export async function fetchArt(src,options){
 const response=await fetch(src,options);
 if(!response.ok||!config.enabled||!assets[assetKey(src)])return response;
 const headers=new Headers(response.headers);headers.delete('content-length');headers.delete('content-encoding');headers.set('content-type','image/svg+xml');
 return new Response(recolorSVG(await response.text(),src),{status:response.status,statusText:response.statusText,headers});
}
export async function artImageURL(src){
 if(!config.enabled||!assets[assetKey(src)])return src;
 const url=new URL(src,root).href;
 if(!images.has(url))images.set(url,(async()=>{
  const response=await fetchArt(url);if(!response.ok)throw Error('Missing palette artwork '+url);
  return URL.createObjectURL(new Blob([await response.text()],{type:'image/svg+xml'}));
 })().catch(error=>{images.delete(url);throw error}));
 return images.get(url);
}
// HTML art (resource icons, cards and god buttons) shares the same mapping as puppets.
// Observe image assignments, not CSS, text, canvas pixels or network requests.
export function observeArtImages(doc=document){
 observer?.disconnect();
 const update=img=>{
  const src=img.getAttribute('src');if(!src||!config.enabled||!assets[assetKey(new URL(src,doc.baseURI))])return;
  if(pendingImages.get(img)===src)return;pendingImages.set(img,src);
  artImageURL(new URL(src,doc.baseURI)).then(url=>{if(img.getAttribute('src')===src)img.src=url}).catch(error=>console.warn('Artwork palette:',error)).finally(()=>pendingImages.delete(img));
 };
 const scan=node=>{if(node.nodeType!==1)return;if(node.matches('img[src]'))update(node);node.querySelectorAll('img[src]').forEach(update)};
 observer=new MutationObserver(changes=>{for(const change of changes){if(change.type==='attributes')update(change.target);else change.addedNodes.forEach(scan)}});
 observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});scan(doc.documentElement);
}
export async function initializeArtPalette(profile,base){
 const settings=profile.data?.['art.palette'];if(settings)validateArtPaletteSettings(settings);
 if(!settings||!settings.enabled){config={enabled:false,colors:[]};return;}
 const response=await fetch(new URL(settings.mappings,base));if(!response.ok)throw Error('Could not load art palette mappings');
 configureArtPalette(settings,await response.json(),base);
 if(typeof document!=='undefined')observeArtImages();
}
export function ensureArtPalette(base){
 if(root)return Promise.resolve();
 if(!ready)ready=(async()=>{
  const moduleURL=base??new URL('./',import.meta.url||globalThis.document?.baseURI);
  const url=new URL(moduleURL,globalThis.location?.href);
  const marker=url.pathname.indexOf('/puppet-studio/');if(marker>=0)url.pathname=url.pathname.slice(0,marker+1);
  const response=await fetch(new URL('game-authoring.json',url));if(!response.ok)return; // Standalone puppet exports may have no game authoring profile.
  await initializeArtPalette(await response.json(),url);
 })().catch(error=>{ready=undefined;throw error});
 return ready;
}
