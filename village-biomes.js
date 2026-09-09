import {CRYOS_STRUCTURES} from './cryos-structure-profiles.js';
import {SOLIS_WORKSHOP} from './solis-workshop-profile.js';
import {defineGameData} from './game-data.js';
import {resolveCulture} from './village-cultures.js';

// A projection is configured once, before importing the world. Saved culture
// remains the source of truth; simulations use explicit culture arguments.
let projectionCulture='hearth';
export function configureVillageArt(culture){projectionCulture=resolveCulture(culture).id;}
export function villageArtCulture(){return projectionCulture;}

const nature=id=>'biomes/solis/nature/'+id;
const assets={
 'sprites/cottage':'biomes/solis/housing/complete',
 'sprites/shrine':'biomes/solis/shrine/complete',
 'sprites/workshop':'biomes/solis/buildings/workshop-day',
 'sprites/tree':nature('tree'),'sprites/crop':nature('crop'),
 'sprites/cactus':nature('cactus-picked'),
 'sprites/bush':nature('scrub'),'woodland/fern':nature('scrub'),'woodland/flowers':nature('flowers'),
 'reacts/hungry':nature('crop'),
 'construction/rubble':'biomes/solis/props/stone',
 'campfire/ring':'biomes/solis/props/ring','campfire/logs':'biomes/solis/props/logs',
 'memorials/gravestone':'biomes/solis/props/gravestone','treasure/chest':'biomes/solis/props/chest',
 'ritual-stake/stake':'biomes/solis/props/stake',
 'woodland-edge/mushroom-russet':nature('truffle-pair'),
 'woodland-edge/mushroom-red-tall':nature('truffle-tall'),
 'woodland-edge/mushroom-red-wide':nature('truffle-wide'),
 'woodland-edge/mushroom-red-cluster':nature('truffle-cluster')
};
for(const id of ['tree','tree-oak','tree-sapling','tree-leaning','tree-forked','tree-tall-crown','boulder-round','boulder-tall','rock-low-moss','rock-knobbly','grass-short','grass-tall'])assets['woodland-edge/'+id]=nature(id);
for(const id of ['tree','tree-oak','tree-sapling','tree-leaning','tree-forked','tree-tall-crown'])assets['actions/'+(id==='tree'?'tree-stump':'stump-'+id)]=nature(['tree','tree-leaning','tree-tall-crown'].includes(id)?'stump-palm':'stump-acacia');
for(const kind of ['housing','chapel'])for(const stage of ['foundation','frame','walls','complete'])assets[kind+'/'+stage]='biomes/solis/'+kind+'/'+stage;
for(const layer of ['ridge','grove','elder-left','elder-right','mesa-panorama','dune-panorama'])assets['backdrop/'+layer]='biomes/solis/backdrop/'+layer;
assets['sky/horizon']='biomes/solis/sky/horizon';
for(const kind of ['food','wood','stone','population'])assets['resources/'+kind]='biomes/solis/props/'+kind;
export const SOLIS_VECTOR_ASSETS=Object.freeze(assets);
const cryosAssets=Object.fromEntries(Object.entries(assets).map(([key,value])=>[key,value.replace('biomes/solis/','biomes/cryos/')]));
cryosAssets['sprites/workshop']='biomes/cryos/workshop/complete';
cryosAssets['fireflies/lantern']='biomes/cryos/details/firefly';
cryosAssets['sky/night']='biomes/cryos/sky/night';
for(const id of ['frame','cloth','complete'])cryosAssets['camps/'+id]='biomes/cryos/camps/'+id;
for(const id of ['axe','pickaxe','sword','hoe'])cryosAssets['actions/'+id]='items/cryos/'+id;
cryosAssets['sprites/hammer']='items/cryos/hammer';
for(const id of ['clover','cumulus','cushion','dumpling','patchwork','pufflet','tower','twins','wisp'])cryosAssets['clouds/'+id]='biomes/cryos/clouds/'+id;
for(const [key,value]of Object.entries({'woodland/boulder':'nature/boulder-round','woodland/stone-a':'props/stone-wall','woodland/stone-b':'props/stone-wall','woodland/moss-patch':'props/ground-patch','sprites/wallpiece':'props/stone-wall','sprites/wallcorner':'props/stone-corner','sprites/plot':'ground/plot','woodland-edge/mushroom-bell':'nature/truffle-tall','woodland-edge/mushroom-cluster':'nature/truffle-cluster','woodland-edge/mushroom-gold':'nature/truffle-wide'}))cryosAssets[key]='biomes/cryos/'+value;
export const CRYOS_VECTOR_ASSETS=Object.freeze(cryosAssets);
export function resolveVectorAsset(asset,culture=projectionCulture){
 resolveCulture(culture);
 return culture==='cryos'&&Object.hasOwn(CRYOS_VECTOR_ASSETS,asset)?CRYOS_VECTOR_ASSETS[asset]:culture==='solis'&&Object.hasOwn(SOLIS_VECTOR_ASSETS,asset)?SOLIS_VECTOR_ASSETS[asset]:asset;
}
export function vectorArtURL(asset,culture=projectionCulture){return 'assets/vector/'+resolveVectorAsset(asset,culture)+'.svg';}
export function shrineRigURL(culture=projectionCulture){return resolveCulture(culture).id!=='hearth'?`assets/vector/biomes/${culture}/shrine/rig.json`:'assets/shrine-rig.json';}

// Normalized measurements from the final, aligned production canvases. Widths
// retain the existing physical footprints; heights follow each new silhouette.
export const SOLIS_STRUCTURES=defineGameData('village-biomes.SOLIS_STRUCTURES',Object.freeze({
 cottage:Object.freeze({name:'Adobe home',width:4.8,height:4.8*467/510,doorU:322/510,doorRise:64/467,
  fixtures:[{name:'window',uv:[140/510,295/467],radius:[19/510,21/467],reach:5.2,power:2.1}]}),
 chapel:Object.freeze({name:'Sun House',width:8.2,height:8.2*538/588,doorU:250/588,doorRise:116/538,
  fixtures:[{name:'sun-lamp',uv:[78/588,315/538],radius:[19/588,24/538],reach:7,power:3.5}],emission:'gold'}),
 workshop:Object.freeze(SOLIS_WORKSHOP)
}));
export function structureArt(kind,culture=projectionCulture){resolveCulture(culture);return culture==='cryos'?CRYOS_STRUCTURES[kind]:culture==='solis'?SOLIS_STRUCTURES[kind]:undefined;}

export const BIOME_TERRAIN=defineGameData('village-biomes.BIOME_TERRAIN',Object.freeze({
 cryos:Object.freeze({snow:true,sand:false,earth:'#657f90',clearDay:'#94acbf',clearNight:'#111e39'}),
 hearth:Object.freeze({sand:false,earth:'#66553d',clearDay:'#293630',clearNight:'#0c1625'}),
 solis:Object.freeze({sand:true,earth:'#ad7444',clearDay:'#876c52',clearNight:'#201c30'})
}));
export function terrainStyle(culture=projectionCulture){return BIOME_TERRAIN[resolveCulture(culture).id];}
