import {expansionSites} from './village-expansion-sites.js';
import {campaignWorldBounds,previousWorldBounds} from './village-layout.js';
import {ORIGINAL_WORLD_BOUNDS,LEGACY_WORLD_BOUNDS,CENTRED_WORLD_BOUNDS,worldLayout} from './village-layout.js';
export const VILLAGE_CORE=Object.freeze({left:-7.8,right:7.8,back:-8,front:6.4});
export const inVillageCore=(x,z,pad=0)=>x>=VILLAGE_CORE.left-pad&&x<=VILLAGE_CORE.right+pad&&z>=VILLAGE_CORE.back-pad&&z<=VILLAGE_CORE.front+pad;
export function seededRandom(seed){return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
let configured=null;
export const wildernessLayout=()=>configured;
export function configureWilderness(seed=0){configured=seed||worldLayout===2?generateWilderness(seed||1):null;return configured;}
function generateOriginalWilderness(seed,layout=worldLayout){
 if(layout===2)return generateCentredWilderness(seed);
 const random=seededRandom(seed),b=ORIGINAL_WORLD_BOUNDS,trees=[],understory=[],discoveries=[],occupied=[];
 const dist=(a,c)=>Math.hypot(a.x-c.x,a.z-c.z);
 function point(radius){for(let i=0;i<600;i++){const p={x:b.left+2+random()*(b.right-b.left-4),z:b.back+2+random()*(b.front-b.back-4)};if(inVillageCore(p.x,p.z,radius+1.5)||occupied.some(o=>dist(p,o)<o.radius+radius)||Math.abs(p.x+4.6)<2.4&&p.z<14)continue;occupied.push({...p,radius});return p;}return null;}
 for(const [i,kind]of ['camp','seed-2','seed-5'].entries()){const p=point(3.4);if(p)discoveries.push({id:'wilderness-'+i,kind,...p});}
 for(let i=0;i<29;i++){const p=point(1.8);if(p)trees.push([p.x,p.z,3.9+random()*1.8]);}
 for(let i=0;i<18;i++){const p=point(.7);if(!p)continue;understory.push([['rock-low-moss','boulder-round','rock-knobbly','boulder-tall'][i%4],p.x,p.z,.95+random()*.9,random()<.5]);}
 for(let i=0;i<38;i++){const p=point(.25);if(!p)continue;const food=i%4===0;understory.push([food?['mushroom-russet','mushroom-red-tall','mushroom-red-wide'][i%3]:i%2?'grass-short':'grass-tall',p.x,p.z,food?.65+random()*.25:.55+random()*.5,random()<.5]);}
 const hills=Array.from({length:5},()=>({x:9+random()*22,z:7+random()*18,r:2.5+random()*3}));
 // Append from an independent stream: old positions, order, IDs and hills
 // must not change when the world gains another region.
 const extra=generateWildernessExpansion(seed);
 return {version:1,seed,trees:[...trees,...extra.trees],understory:[...understory,...extra.understory],discoveries,hills};
}
export function wildernessHeight(x,z,layout=configured){
 if(!layout||inVillageCore(x,z,1.5))return z<=-1?1.1:.05;
 if(layout.discoveries.some(p=>Math.hypot(x-p.x,z-p.z)<3.8)||(layout.sites?.clearings??[]).some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+2))return .05;
 return layout.hills.some(h=>Math.hypot(x-h.x,z-h.z)<h.r)?1.1:.05;
}

export function generateWildernessExpansion(seed=1){
 const random=seededRandom((seed^0xA73C9E21)>>>0),b=LEGACY_WORLD_BOUNDS,old=ORIGINAL_WORLD_BOUNDS,occupied=[],trees=[],understory=[];
 function point(radius){for(let i=0;i<800;i++){const x=b.left+2+random()*(b.right-b.left-4),z=b.back+2+random()*(b.front-b.back-4);if(x<old.right+2.5&&z<old.front+2.5||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+radius))continue;occupied.push({x,z,r:radius});return [x,z];}return null;}
 for(let i=0;i<36;i++){const p=point(1.8);if(p)trees.push([...p,3.9+random()*1.8]);}
 for(let i=0;i<24;i++){const p=point(.7);if(p)understory.push([['rock-low-moss','boulder-round','rock-knobbly','boulder-tall'][i%4],...p,.95+random()*.9,random()<.5]);}
 for(let i=0;i<48;i++){const p=point(.25);if(p)understory.push([i%4===0?['mushroom-russet','mushroom-red-tall','mushroom-red-wide'][i%3]:i%2?'grass-short':'grass-tall',...p,.65+random()*.4,random()<.5]);}
 return {trees,understory};
}

// New-layout random streams cover the entire map, including the western side.
// Keep the old generator intact so loading a save never relocates its resources.
function generateCentredWilderness(seed){
 const random=seededRandom(seed),b=CENTRED_WORLD_BOUNDS,trees=[],understory=[],discoveries=[],occupied=[];
 function point(radius){for(let i=0;i<1000;i++){
  const p={x:b.left+2+random()*(b.right-b.left-4),z:b.back+2+random()*(b.front-b.back-4)};
  if(inVillageCore(p.x,p.z,radius+1.5)||Math.abs(p.x+4.6)<2.4&&p.z<14||occupied.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<radius+o.radius))continue;
  occupied.push({...p,radius});return p;
 }return null;}
 for(const [i,kind] of ['camp','seed-2','seed-5'].entries()){const p=point(3.4);if(p)discoveries.push({id:'wilderness-'+i,kind,...p});}
 for(let i=0;i<65;i++){const p=point(1.8);if(p)trees.push([p.x,p.z,3.9+random()*1.8]);}
 for(let i=0;i<42;i++){const p=point(.7);if(p)understory.push([['rock-low-moss','boulder-round','rock-knobbly','boulder-tall'][i%4],p.x,p.z,.95+random()*.9,random()<.5]);}
 for(let i=0;i<86;i++){const p=point(.25);if(p)understory.push([i%4===0?['mushroom-russet','mushroom-red-tall','mushroom-red-wide'][i%3]:i%2?'grass-short':'grass-tall',p.x,p.z,.65+random()*.4,random()<.5]);}
 const hills=Array.from({length:5},()=>({x:b.left+6+random()*(b.right-b.left-12),z:7+random()*25,r:2.5+random()*3}));
 return {version:2,seed,trees,understory,discoveries,hills};
}

export function generateRealmExpansion(seed=1,layout=worldLayout){
 const random=seededRandom((seed^0x982fa163)>>>0),b=campaignWorldBounds({worldLayout:layout}),old=previousWorldBounds(layout),sites=expansionSites(seed,layout),occupied=[],trees=[],understory=[],hills=[];
 function point(radius){for(let i=0;i<1200;i++){
  const x=b.left+2+random()*(b.right-b.left-4),z=b.back+2+random()*(b.front-b.back-4);
  if(x>old.left-2.5&&x<old.right+2.5&&z<old.front+2.5||sites.clearings.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+radius+1.5)||occupied.some(p=>Math.hypot(x-p.x,z-p.z)<p.radius+radius))continue;
  occupied.push({x,z,radius});return [x,z];
 }return null;}
 for(let i=0;i<195;i++){const p=point(1.8);if(p)trees.push([...p,3.9+random()*1.8]);}
 for(let i=0;i<126;i++){const p=point(.7);if(p)understory.push([['rock-low-moss','boulder-round','rock-knobbly','boulder-tall'][i%4],...p,.95+random()*.9,random()<.5]);}
 for(let i=0;i<258;i++){const p=point(.25);if(p)understory.push([i%4===0?['mushroom-russet','mushroom-red-tall','mushroom-red-wide'][i%3]:i%2?'grass-short':'grass-tall',...p,.65+random()*.4,random()<.5]);}
 for(let i=0;i<15;i++){const x=b.left+7+random()*(b.right-b.left-14),z=b.back+7+random()*(b.front-b.back-14),r=2.5+random()*3;if(x>old.left-7&&x<old.right+7&&z<old.front+7||sites.clearings.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.radius+3))continue;hills.push({x,z,r});}
 return {trees,understory,hills,sites};
}
export function generateWilderness(seed,layout=worldLayout){
 const original=generateOriginalWilderness(seed,layout),extra=generateRealmExpansion(seed,layout);
 return {...original,trees:[...original.trees,...extra.trees],understory:[...original.understory,...extra.understory],hills:[...original.hills,...extra.hills],sites:extra.sites};
}
