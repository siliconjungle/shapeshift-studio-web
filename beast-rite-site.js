import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {housingSites} from './ecs/housing-state.js';
import {farmingSites} from './ecs/farming-state.js';
import {resourceCondition} from "./ecs/resource-state.js";
import {resourceGrowth} from "./ecs/resource-state.js";
import {beastsStoreRoute} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {flatDecalHeight} from './decal-placement.js';
import {homePosition} from './village-shelter.js';
import {villagePathDistance,PERMANENT_PATH_RADIUS} from './village-paths.js';
import {memorialOpacity} from './village-memorials.js';

// Reserve the finished three-unit circle, including a small clear border, at
// every construction stage. Walking clearance alone is much smaller than art.
export const BEAST_RITE_RADIUS=1.65;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function beastRiteObstacles(e){
 return Object.values(e.beasts?.rites??{}).filter(r=>!r.siteBlocked).map(r=>({x:r.x,z:r.z,radius:BEAST_RITE_RADIUS,beastRiteKind:r.kind}));
}
export function clearBeastRiteSite(e,p,ignoreKind=null){
 const radius=BEAST_RITE_RADIUS;
 if(!Number.isFinite(flatDecalHeight(e.heightAt,{...p,width:radius*2,height:radius*2})))return false;
 if(villagePathDistance(p.x,p.z)<radius+PERMANENT_PATH_RADIUS+.25)return false;
 if(e.obstacles().some(o=>o.beastRiteKind!==ignoreKind&&distance(p,o)<radius+o.radius+.25))return false;
 if([...(e.life?.homes??[]).map(homePosition),homePosition(e.depot)].some(h=>distance(p,h)<radius+2.2))return false;
 if([...(e.farming?.plots??[]),...(farmingSites(e.farming)?.sites??[])].some(f=>Math.abs(f.x-p.x)<radius+1.65&&Math.abs(f.z-p.z)<radius+1.2))return false;
 if([...(housingSites(e.housing)?.sites??[]),...(housingSites(e.housing)?.chapelSites??[])].some(h=>distance(p,h)<radius+2.5))return false;
 const plants=[...(e.lightning?.scenery??[]),...(e.ecology?.accents??[]),...(e.nodes??[]),...(e.ecology?.mushrooms??[]).filter(m=>m.state!=='dormant')];
 for(const n of plants){
  if(resourceCondition(n)?.removed||resourceGrowth(n)?.state==='removed'||n.kind==='stone'&&resourceGrowth(n)?.state==='depleted')continue;
  const plantRadius=n.kind==='wood'?Math.max(.8,Math.min(1.8,(n.base??4)*.3)):n.kind==='stone'?n.radius??.7:Math.max(.35,Math.min(1.2,(n.base??n.height??.8)*.65));
  if(distance(p,n)<radius+plantRadius+.25)return false;
 }
 if((e.discovery?.chests??[]).some(c=>c.openedAt===null&&distance(p,c)<radius+.8))return false;
 return !(e.survival?.memorials??[]).some(m=>memorialOpacity(m,e.time)>0&&distance(p,m)<radius+.55);
}
export function findBeastRiteSite(e,ignoreKind=null){
 const shrine=e.faith?.shrine??e.prayers?.shrine??e.depot;
 for(const radius of [2.5,3.5,4.5,6,8,10,12,15])for(let i=0;i<24;i++){
  const a=i*Math.PI/12,p={x:shrine.x+Math.cos(a)*radius,z:shrine.z+Math.sin(a)*radius};
  if(!clearBeastRiteSite(e,p,ignoreKind)||e.workers.some(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&distance(w,p)<BEAST_RITE_RADIUS+.65))continue;
  const approach={x:p.x+Math.cos(Math.PI*.75)*2,z:p.z+Math.sin(Math.PI*.75)*2};
  const obstacles=e.obstacles().filter(o=>o.beastRiteKind!==ignoreKind).concat({x:p.x,z:p.z,radius:BEAST_RITE_RADIUS});
  if(!e.pathfind(e.leadership?.leader??e.depot,approach,e.heightAt,obstacles))continue;
  if(beastsStoreRoute(e.beasts,p,ignoreKind))return p;
 }
 return null;
}
