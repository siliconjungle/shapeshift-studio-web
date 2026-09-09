import {resourceGrowth,resourceHarvest,resourceCondition,resourceWoodland} from '../resource-state.js';
import {releaseWork} from './resource-harvesting.js';
import {APPLE_RULES,APPLE_VARIANT,isApple} from '../../village-apples.js';
const healthy=(e,n)=>n&&n.variant===APPLE_VARIANT&&resourceGrowth(n)?.state==='ready'&&!resourceCondition(n)?.removed&&(resourceCondition(n)?.burningUntil??0)<=e.time;
export function syncAppleResources(world){
 const e=world.resource('Village'),fruits=new Map(e.nodes.filter(isApple).map(n=>[n.appleTreeId,n])),trees=new Map(e.nodes.filter(n=>n.kind==='wood'&&n.variant===APPLE_VARIANT).map(n=>[n.id,n]));
 if(e.culture==='hearth')for(const tree of trees.values()){
  let fruit=fruits.get(tree.id);
  if(!fruit){const ripe=healthy(e,tree)&&resourceWoodland(tree)?.ecoBornAt==null;e.addResource({id:'apples-'+tree.id,kind:'food',foodSource:'apple',appleTreeId:tree.id,x:tree.x,z:tree.z,state:ripe?'ready':'depleted',growth:ripe?1:0,readyAt:ripe?0:null,hits:0,reservedBy:null});}
 }
 for(const n of e.nodes){if(!isApple(n))continue;const tree=trees.get(n.appleTreeId),g=resourceGrowth(n),c=resourceCondition(n);if(e.culture!=='hearth'||!healthy(e,tree)){
   for(const w of e.workers)if(w.node===n)releaseWork(world,w);
   g.state='depleted';g.growth=0;g.readyAt=null;resourceHarvest(n).reservedBy=null;
   if(!tree||e.culture!=='hearth')c.removed=true;
   continue;
  }
  n.x=tree.x;n.z=tree.z;
  if(c.removed)continue;
  if(g.state==='depleted'&&g.readyAt===null)g.readyAt=e.time+APPLE_RULES.regrow;
 }
}
export function appleWorkAvailable(world,n){const e=world.resource('Village');
 if(isApple(n)){const parent=e.nodes.find(t=>t.id===n.appleTreeId);return e.culture==='hearth'&&healthy(e,parent)&&resourceHarvest(parent)?.reservedBy==null;}
 if(n.kind==='wood'&&n.variant===APPLE_VARIANT)return !e.nodes.some(f=>isApple(f)&&f.appleTreeId===n.id&&resourceHarvest(f)?.reservedBy!=null);
 return true;
}
export function validateApples(world){const e=world.resource('Village'),seen=new Set();return e.nodes.filter(isApple).every(n=>{
 if(n.kind!=='food'||typeof n.appleTreeId!=='string'||seen.has(n.appleTreeId))return false;seen.add(n.appleTreeId);
 return resourceCondition(n)?.removed||e.culture==='hearth'&&e.nodes.some(t=>t.id===n.appleTreeId&&t.kind==='wood'&&t.variant===APPLE_VARIANT);
});}
