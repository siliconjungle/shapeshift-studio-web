
import {defineGameData} from './game-data.js';
import {WORLD_BOUNDS} from './village-layout.js';

export const ECOLOGY_RULES=defineGameData('village-ecology.ECOLOGY_RULES',{firstSeed:35,seedInterval:22,maxExtraTrees:24,maxSaplings:32,treeSpacing:2.8,growMin:150,growMax:220,maxMushrooms:72,mushroomInterval:5,mushroomGrow:14,mushroomLife:150});
const clamp=n=>Math.max(0,Math.min(1,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
// The simulation owns moisture, births, growth and positions. Renderers only
// project this small, bounded population using the existing woodland artwork.

import {bindEnvironment,environmentBinding} from './ecs/environment-entities.js';
import * as systems from './ecs/systems/ecology.js';
// Stable save type; behaviour executes in world-first systems.
export class VillageEcology {}
export function createEcology(e,{accents=[],bounds=WORLD_BOUNDS}={}){const state=new VillageEcology();

  state.economy=e;state.bounds=bounds;state.accents=accents;state.moisture=0;state.nextSeed=e.time+ECOLOGY_RULES.firstSeed;state.nextMushroom=e.time+5;state.nextTree=0;state.nextFungus=0;state.mushrooms=[];state.seeded=0;state.bloomed=0;
  state.treeLimit=e.nodes.filter(n=>n.kind==='wood').length+ECOLOGY_RULES.maxExtraTrees;


 bindEnvironment(state,'Ecology');systems.ecologyAdoptTrees(environmentBinding(state).world);return state;
}
export function ecologyAdoptTrees(state,...args){if(state==null)return undefined;return systems.ecologyAdoptTrees(environmentBinding(state).world,...args);}
export function ecologyTrees(state,...args){if(state==null)return undefined;return systems.ecologyTrees(environmentBinding(state).world,...args);}
export function ecologyMature(state,...args){if(state==null)return undefined;return systems.ecologyMature(environmentBinding(state).world,...args);}
export function ecologyObstacles(state,...args){if(state==null)return undefined;return systems.ecologyObstacles(environmentBinding(state).world,...args);}
export function ecologyClearSite(state,...args){if(state==null)return undefined;return systems.ecologyClearSite(environmentBinding(state).world,...args);}
export function ecologySeed(state,...args){if(state==null)return undefined;return systems.ecologySeed(environmentBinding(state).world,...args);}
export function ecologyShade(state,...args){if(state==null)return undefined;return systems.ecologyShade(environmentBinding(state).world,...args);}
export function ecologyBloom(state,...args){if(state==null)return undefined;return systems.ecologyBloom(environmentBinding(state).world,...args);}
export function ecologyUpdate(state,...args){if(state==null)return undefined;return systems.ecologyUpdate(environmentBinding(state).world,...args);}
export function ecologySnapshot(state,...args){if(state==null)return undefined;return systems.ecologySnapshot(environmentBinding(state).world,...args);}
