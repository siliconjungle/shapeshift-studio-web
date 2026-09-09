import {APPLE_RULES,isApple} from './village-apples.js';
import {releaseWork} from "./village-resources.js";
import {resourceCondition} from "./ecs/resource-state.js";
import {resourceGrowth,resourceHarvest} from "./ecs/resource-state.js";
import {defineGameData} from './game-data.js';
import {structureCoversPlant} from './structure-understory.js';
const seedRules={2:{amount:4,regrow:110,grow:30,hits:1,action:'harvest',contact:'pull'},5:{amount:10,regrow:180,grow:50,hits:1,action:'harvest',contact:'pull'}};
export const forageRules=n=>isApple(n)?APPLE_RULES:seedRules[n?.seedMultiplier]??FORAGE_RULES;
// Food is the shared inventory category; its source controls harvesting and
// regrowth. Mushroom patches never become tilled farm beds.
export const FORAGE_RULES=defineGameData('village-foraging.FORAGE_RULES',{amount:2,regrow:90,grow:12,hits:1,action:'harvest',contact:'pull'});
export const isMushroom=n=>n?.foodSource==='mushroom';
export const isForage=n=>isApple(n)||isMushroom(n)||n?.foodSource==='cactus'||n?.foodSource==='strange-seed';
export const rootedForageAlive=n=>n?.foodSource==='cactus'&&!resourceCondition(n)?.removed&&(!resourceCondition(n)?.burntPlant||['ready','growing'].includes(resourceGrowth(n)?.state));
export const forageId=p=>'forage-'+(p.ecologyId!==undefined?'rain-'+p.ecologyId:p.variant+'-'+p.x.toFixed(4)+'-'+p.z.toFixed(4));
export function registerForage(e,patches){
 for(const p of patches){
  const id=forageId(p);if(e.nodes.some(n=>n.id===id))continue;
  const legacy=e.wishes?.scenery?.find(m=>m.x===p.x&&m.z===p.z),burn=e.wishes?.burns?.find(b=>b.kind==='bush'&&b.id===legacy?.id&&b.regrowAt>e.time);
  e.addResource({id,kind:'food',foodSource:p.foodSource??'mushroom',x:p.x,z:p.z,variant:p.variant,base:p.base,flip:!!p.flip,ecologyId:p.ecologyId,state:'ready',growth:1,hits:0,readyAt:0,reservedBy:null});
  if(burn){const n=e.nodes.at(-1);resourceGrowth(n).state='depleted';resourceGrowth(n).growth=0;resourceGrowth(n).readyAt=burn.regrowAt;resourceCondition(n).burningUntil=burn.until;burn.kind='crop';burn.id=id;}
 }
}
export function syncForage(e){
 for(const m of e.ecology?.mushrooms??[]){
  const id=forageId({ecologyId:m.id});let n;for(const node of e.nodes)if(node.id===id){n=node;break;}
  if(!n){registerForage(e,[{...m,ecologyId:m.id,base:m.height}]);n=e.nodes.at(-1)}
  const state=m.state==='ready'?'ready':m.state==='growing'?'growing':'depleted';
  if(state==='depleted'&&resourceHarvest(n)?.reservedBy!=null)for(const w of e.workers)if(w.node===n)releaseWork(e,w);
  if(resourceGrowth(n)?.state==='depleted'&&state!=='depleted')e.emit('regrow',null,n);
  (Object.assign(n,{x:m.x,z:m.z,base:m.height}),Object.assign(resourceGrowth(n),{growth:m.growth,state,readyAt:null}),(Object.assign(resourceCondition(n),{burningUntil:m.burningUntil}),n),n);
  if(state==='ready'&&resourceHarvest(n)?.reservedBy==null)resourceHarvest(n).hits=0;
 }
 // A new building removes understory permanently; don't forage through walls.
 for(const n of e.nodes)if(isForage(n)&&structureCoversPlant(e,n)){
  for(const w of e.workers)if(w.node===n)releaseWork(e,w);
  resourceGrowth(n).state='depleted';resourceGrowth(n).readyAt=null;resourceGrowth(n).growth=0;resourceCondition(n).removed=true;
  const m=e.ecology?.mushrooms.find(m=>m.id===n.ecologyId);if(m){m.state='dormant';m.growth=0;}
 }
}
export function harvestForage(e,n){
 if(n.ecologyId===undefined)return;
 const m=e.ecology?.mushrooms.find(m=>m.id===n.ecologyId);if(!m)return;
 m.state='dormant';m.growth=0;m.forageAfter=e.time+FORAGE_RULES.regrow;resourceGrowth(n).readyAt=null;
}
