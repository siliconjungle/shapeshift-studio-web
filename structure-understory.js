import {constructionProgress} from './ecs/housing-state.js';
import {ensureConstructionProgress} from './ecs/housing-state.js';

// Permanent structures keep their ground clear even after a burn/regrowth or
// save reload. This is derived from simulation records, never mesh visibility.
export function structureCoversPlant(e,p){
 if((e.housing?.projects??[]).some(h=>(constructionProgress(h)?.state)!=='packed'&&(h.kind!=='camp'||(constructionProgress(h)?.state)!=='destroyed')&&Math.abs(h.x-p.x)<2.7&&Math.abs(h.z-p.z)<1.9))return true;
 const padding=Math.max(.25,Math.min(.75,(p.base??p.height??.7)*.5));
 const fireCovers=f=>f&&(f.built||f.stoneUsed>0)&&Math.hypot(f.x-p.x,f.z-p.z)<1.05+padding;
 if(fireCovers(e.campfire)||(e.exploration?.camps??[]).some(c=>fireCovers(c.fire)))return true;
 return false;
}
