// Layout 1 keeps existing saves at their original coordinates. Layout 2 gives
// new villages equal woodland on either side. Both now cover 100 × 66 cells.
export const ORIGINAL_WORLD_BOUNDS=Object.freeze({left:-15.75,right:33.75,back:-9.75,front:27.75});
const LEGACY_CELLS=Object.freeze({left:-10,right:39,back:-6,front:26});
const CENTRED_CELLS=Object.freeze({left:-24,right:25,back:-6,front:26});
const bounds=c=>({left:(c.left-.5)*1.5,right:(c.right+.5)*1.5,back:(c.back-.5)*1.5,front:(c.front+.5)*1.5,bottom:-1.45,top:8.6});
export const LEGACY_WORLD_BOUNDS=Object.freeze(bounds(LEGACY_CELLS));
export const CENTRED_WORLD_BOUNDS=Object.freeze(bounds(CENTRED_CELLS));
export const WORLD_AREA_MULTIPLIER=4;
const expanded=c=>({...c,left:c.left-25,right:c.right+25,front:c.front+33});
export const LAND_CELLS={...expanded(LEGACY_CELLS)};
export const WORLD_BOUNDS={...bounds(expanded(LEGACY_CELLS))};
export let worldLayout=1;
export function campaignWorldBounds(campaign){return bounds(expanded(campaign?.worldLayout===2?CENTRED_CELLS:LEGACY_CELLS));}
export function previousWorldBounds(layout=worldLayout){return layout===2?CENTRED_WORLD_BOUNDS:LEGACY_WORLD_BOUNDS;}
// Configure once before constructing terrain, simulation, cameras or textures.
export function configureWorldLayout(campaign){
 worldLayout=campaign?.worldLayout??1;
 if(![1,2].includes(worldLayout))throw Error('Unsupported village layout');
 Object.assign(LAND_CELLS,expanded(worldLayout===2?CENTRED_CELLS:LEGACY_CELLS));
 Object.assign(WORLD_BOUNDS,campaignWorldBounds(campaign));
}
export const EXTRA_TREES=[
 [-14,9.1,5.7],[-10.1,9.6,5.4],[-13.5,13.7,6.0],[-9.5,14.3,5.3],
 [-14,18.5,5.5],[-10.4,19.1,5.2],
 [6.5,8.8,3.5],[5.9,13.2,4.2],[6.4,18.5,4.7],
 [-4.5,19.7,3.4],[1.9,19,3.8]
];
EXTRA_TREES.push(
 [11,-6.5,5.1],[15.5,-6.9,5.5],[20.3,-6.6,5.0],[25,-6.9,5.7],[30,-6.6,5.2],
 [13.4,-1.4,4.4],[22.5,-1.0,5.0],[30.8,-1.2,5.3],
 [17.3,4.2,4.6],[26.8,4.4,5.4],[31.6,6.6,4.5],
 [12,9.4,3.8],[21.4,10.7,4.9],[29.5,12.6,5.2],
 [15.8,17,4.5],[24.2,17.8,4.6],[31.2,18.9,4.3]
);
export const EXTRA_UNDERSTORY=[];
const clusters=[[-13.6,8.5],[-9.2,9.2],[-12.5,12],[-8.8,14],[-13.7,17],[-9.2,19.4],[-4.7,9.7],[3.9,10.9],[4.7,15.4],[-3.8,17.4]];
clusters.push([11,-4],[18,-5],[28,-4],[13,2],[22,3],[30,3],[17,8],[26,9],[11,14],[20,16],[29,18]);
for(const [i,[x,z]] of clusters.entries()){
 EXTRA_UNDERSTORY.push([['rock-low-moss','boulder-round','rock-knobbly','boulder-tall'][i%4],x,z,1.1+(i%3)*.3,i%2===0]);
 EXTRA_UNDERSTORY.push(['grass-short',x+1.1,z+.6,.8+(i%3)*.1,i%2===1]);
 EXTRA_UNDERSTORY.push(['grass-tall',x-.8,z+1,1.15+(i%3)*.1,i%2===0]);
 if(i%3===0)EXTRA_UNDERSTORY.push([['mushroom-russet','mushroom-red-tall','mushroom-red-wide','mushroom-red-cluster'][i%4],x+.7,z+.5,.85+(i%3)*.12,false]);
}
