import {fetchArt} from './art-palette.js';
export const gameAssetURL=path=>new URL('/assets/bramble-map/'+path.replace(/^assets\//,''),globalThis.location?.href??'http://localhost').href;
export const fetchGameAsset=(path,options)=>fetchArt(gameAssetURL(path),options);
