import {resourceOak} from '../resource-state.js';
import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {housingSites} from './../housing-state.js';
import {farmingSites} from '../farming-state.js';
import {resourceCondition} from "../resource-state.js";
import {resourceWoodland} from "../resource-state.js";
import {resourceGrowth,resourceHarvest} from "../resource-state.js";
import {addEnvironmentRecords} from '../../ecs/environment-entities.js';
import {actorVitality} from '../actor-vitality.js';

import {busyDesirePath} from '../../village-desire-paths.js';
import {villagePathDistance,PERMANENT_PATH_RADIUS} from '../../village-paths.js';
import {ECOLOGY_RULES} from '../../village-ecology.js';
const clamp=n=>Math.max(0,Math.min(1,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function ecologyAdoptTrees(world){const state=world.resource('Ecology');
for(const n of state.economy.nodes)if(n.kind==='wood'){resourceWoodland(n).woodland=true;if(resourceGrowth(n)?.state==='depleted'){resourceGrowth(n).readyAt=null;resourceWoodland(n).felledAt??=state.economy.time}}
}
export function ecologyTrees(world){const state=world.resource('Ecology');
const trees=[];for(const node of state.economy.nodes)if(node.kind==='wood')trees.push(node);return trees
}
export function ecologyMature(world){const state=world.resource('Ecology');
return ecologyTrees(world).filter(n=>resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.hits===0)
}
export function ecologyObstacles(world){const state=world.resource('Ecology');
const obstacles=[];for(const n of state.economy.nodes)if(n.kind==='wood'&&resourceWoodland(n)?.ecoBornAt!==undefined&&(resourceGrowth(n)?.state!=='depleted'||state.economy.time-(resourceWoodland(n)?.felledAt??0)<21))obstacles.push({x:n.x,z:n.z,radius:.5,ecologyId:n.id});return obstacles
}
export function ecologyClearSite(world,p,radius){const state=world.resource('Ecology');

  const e=state.economy,b=state.bounds,h=e.heightAt(p.x,p.z);
  if(!Number.isFinite(h)||p.x-radius<b.left+.8||p.x+radius>b.right-.8||p.z-radius<b.back+.8||p.z+radius>b.front-.8||villagePathDistance(p.x,p.z)<radius+PERMANENT_PATH_RADIUS+.4||busyDesirePath(e,p.x,p.z,radius+.3))return false;
  for(const [dx,dz] of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,-radius]]){const y=e.heightAt(p.x+dx,p.z+dz);if(!Number.isFinite(y)||Math.abs(y-h)>.08)return false}
  if(e.obstacles().some(o=>distance(p,o)<o.radius+radius+.2))return false;
  if([...(e.life?.homes??[]),e.depot,e.campfire].filter(Boolean).some(o=>distance(p,o)<radius+2.3))return false;
  if([...(e.farming?.plots??[]),...(farmingSites(e.farming)?.sites??[])].some(o=>Math.abs(p.x-o.x)<1.7+radius&&Math.abs(p.z-o.z)<1.25+radius))return false;
  if((housingSites(e.housing)?.sites??[]).some(o=>distance(p,o)<radius+3.1))return false;
  return !e.workers.some(w=>!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&distance(p,w)<radius+.8);
 
}
export function ecologySeed(world){const state=world.resource('Ecology');

  const e=state.economy,trees=ecologyTrees(world),living=trees.filter(n=>resourceGrowth(n)?.state!=='depleted'),parents=ecologyMature(world);
  if(!parents.length||living.length>=state.treeLimit||living.filter(n=>resourceGrowth(n)?.state==='growing').length>=ECOLOGY_RULES.maxSaplings)return null;
  for(let i=0;i<32;i++){
   const parent=parents[Math.floor(e.random()*parents.length)],a=e.random()*Math.PI*2,r=3+e.random()*2.2,p={x:parent.x+Math.cos(a)*r,z:parent.z+Math.sin(a)*r};
   if(!ecologyClearSite(world,p,.65)||living.some(n=>distance(n,p)<ECOLOGY_RULES.treeSpacing)||living.filter(n=>distance(n,p)<5).length>=4)continue;
   // Reuse a fully rotted stump's slot before allocating another tree. No
   // resource or render records accumulate as a forest is repeatedly harvested.
   let node=trees.find(n=>resourceGrowth(n)?.state==='depleted'&&(resourceCondition(n)?.burningUntil??0)<=e.time&&e.time-(resourceWoodland(n)?.felledAt??e.time)>24&&!e.workers.some(w=>w.node===n));
   if(!node&&trees.length>=state.treeLimit)return null;
   if(!node){node={id:'woodland-tree-'+state.nextTree++,kind:'wood',variant:'tree-sapling',base:4.1,flip:e.random()<.5};e.addResource(node)}
   for(const key of ['oakSeedAt','oakPlantedAt','oakTended','oakPlantContactAt','oakPlanterId'])delete resourceOak(node)[key];
   (Object.assign(node,p),(Object.assign(resourceWoodland(node),{woodland:true,parentId:parent.id,ecoBornAt:e.time}),node),Object.assign(resourceGrowth(node),{state:'growing'}),Object.assign(resourceHarvest(node),{reservedBy:null,hits:0}),Object.assign(resourceGrowth(node),{growth:.18,readyAt:null}),(Object.assign(resourceWoodland(node),{felledAt:null,growSeconds:ECOLOGY_RULES.growMin+e.random()*(ECOLOGY_RULES.growMax-ECOLOGY_RULES.growMin),age:0}),node),Object.assign(resourceHarvest(node),{retryAt:0}),node);
   state.seeded++;e.emit('sapling-born',null,node);return node;
  }return null;
 
}
export function ecologyShade(world,p,trees=ecologyMature(world)){const state=world.resource('Ecology');

  let shade=0;for(const tree of trees){const reach=Math.max(2.7,(tree.base??5)*.65);shade=Math.max(shade,clamp(1-distance(p,tree)/reach))}return shade;
 
}
export function ecologyBloom(world){const state=world.resource('Ecology');

  if(state.moisture<.4||state.mushrooms.filter(m=>m.state!=='dormant').length>=ECOLOGY_RULES.maxMushrooms)return null;
  const e=state.economy,parents=ecologyMature(world);if(!parents.length)return null;
  for(let i=0;i<24;i++){
   const tree=parents[Math.floor(e.random()*parents.length)],a=e.random()*Math.PI*2,r=1.05+e.random()*1.5,p={x:tree.x+Math.cos(a)*r,z:tree.z+Math.sin(a)*r};
   if(ecologyShade(world,p,parents)<.24||!ecologyClearSite(world,p,.22)||state.accents.some(o=>distance(o,p)<.65)||state.mushrooms.some(m=>m.state!=='dormant'&&distance(m,p)<.6))continue;
   let m=state.mushrooms.find(m=>m.state==='dormant'&&(m.burningUntil??0)<=e.time&&(m.forageAfter??0)<=e.time);if(!m){if(state.mushrooms.length>=ECOLOGY_RULES.maxMushrooms)return null;m={id:state.nextFungus++};addEnvironmentRecords(state,m)}
   Object.assign(m,p,{variant:Math.floor(e.random()*3),height:.45+e.random()*.4,flip:e.random()<.5,growth:.04,age:0,state:'growing'});state.bloomed++;return m;
  }return null;
 
}
export function ecologyUpdate(world,dt,weather={}){const state=world.resource('Ecology');

  if(!(dt>0))return;const e=state.economy,rain=clamp(weather.rain??0);
  state.moisture=clamp(state.moisture+(rain-state.moisture)*(1-Math.exp(-dt/(rain>state.moisture?18:95))));
  for(const n of ecologyTrees(world))if(resourceGrowth(n)?.state==='growing'&&resourceWoodland(n)?.ecoBornAt!==undefined){
   if(resourceOak(n).oakSeedAt!=null&&resourceOak(n).oakPlantedAt==null)continue;
   resourceWoodland(n).age+=dt*(.85+state.moisture*.3);const start=resourceOak(n).oakPlantedAt!=null?.08:.18;resourceGrowth(n).growth=start+(1-start)*clamp(resourceWoodland(n)?.age/resourceWoodland(n)?.growSeconds);
   if(resourceWoodland(n)?.age>=resourceWoodland(n)?.growSeconds){resourceGrowth(n).state='ready';resourceGrowth(n).growth=1;resourceHarvest(n).hits=0;e.emit('ready',null,n)}
  }
  if(e.time>=state.nextSeed){state.nextSeed=e.time+ECOLOGY_RULES.seedInterval*(.7+e.random()*.6);ecologySeed(world)}
  const parents=ecologyMature(world);
  for(const m of state.mushrooms){
   if(m.state==='dormant'||m.state==='burning')continue;m.age+=dt;
   if(m.age>ECOLOGY_RULES.mushroomLife||state.moisture<.18||ecologyShade(world,m,parents)<.18)m.state='fading';
   if(m.state==='fading'){m.growth=Math.max(0,m.growth-dt*.055);if(m.growth===0)m.state='dormant'}
   else {m.growth=Math.min(1,m.growth+dt/ECOLOGY_RULES.mushroomGrow);if(m.growth===1)m.state='ready'}
  }
  if(e.time>=state.nextMushroom){state.nextMushroom=e.time+ECOLOGY_RULES.mushroomInterval*(.6+e.random()*.8);ecologyBloom(world)}
 
}
export function ecologySnapshot(world){const state=world.resource('Ecology');
return {moisture:state.moisture,seeded:state.seeded,bloomed:state.bloomed,trees:ecologyTrees(world).filter(n=>resourceWoodland(n)?.ecoBornAt!==undefined).map(n=>({id:n.id,x:n.x,z:n.z,state:resourceGrowth(n)?.state,growth:resourceGrowth(n)?.growth})),mushrooms:state.mushrooms.map(m=>({...m}))}
}
