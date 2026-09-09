import {homeAvailability} from './ecs/home-entities.js';
import {structuralCondition} from './ecs/home-entities.js';
import {constructionProgress} from './ecs/housing-state.js';
import {ensureConstructionProgress} from './ecs/housing-state.js';
import {resourceWoodland} from "./ecs/resource-state.js";
import {resourceCondition} from "./ecs/resource-state.js";
import {depleteResource} from "./village-resources.js";
import {resourceGrowth,resourceHarvest} from "./ecs/resource-state.js";
import {settlementEconomy} from './ecs/rival-entities.js';
import {defineGameData} from './game-data.js';
import {campProjects} from './camp-rules.js';
import {rivalFor} from './rival-roster.js';
import {canWalkAt,walkStep,WALK_SPEED} from './village-walking.js';
import {birdFlightPosition} from './village-birds.js';
import {isForage,forageRules} from './village-foraging.js';
import {visibleAt} from './village-exploration.js';
import {wildlifeFacing} from './wildlife-facing.js';

export const RAT_OWL_RULES=defineGameData('rats-owls.rules',{
 maxRats:8,maxNaturalRats:3,ratFirstAt:70,ratEvery:90,ratChance:.55,ratSpeed:1.35,ratLifetime:240,ratMeals:3,nibbleSeconds:3,mealPause:20,
 maxOwls:2,owlFirstAt:600,owlEvery:600,owlChance:.12,huntRadius:15,huntPause:18,flightSpeed:5,
});
export const RAT_OWL_SPECIES=defineGameData('rats-owls.species',{
 hearth:{rat:'Woodland rat',owl:'Tawny owl'},solis:{rat:'Sand rat',owl:'Desert eagle owl'},cryos:{rat:'Frost rat',owl:'Snowy owl'},
});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),point=p=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z),alive=a=>!a.dead&&!a.gone;
export function ratOwlState(e){return e.ratsOwls??={rats:[],owls:[],nextRatId:0,nextOwlId:0,nextRatAt:e.time+RAT_OWL_RULES.ratFirstAt,nextOwlAt:e.time+RAT_OWL_RULES.owlFirstAt,stolen:0,eaten:0,departed:0};}

// Pantry references are resolved on each bite. A rat at a neighbour's camp
// consumes that settlement's food, even if the local village has none.
export function ratFoodSources(e){
 const sources=[{id:'depot',...e.depot,stock:e.stock,culture:e.culture}];
 for(const p of campProjects(e))if((constructionProgress(p)?.state)==='complete'&&!p.packing&&!(structuralCondition(p.home)?.destroyed)&&!(homeAvailability(p.home)?.retired)){
  const stock=p.owner==='rival'?settlementEconomy(rivalFor(e,p.culture))?.stock:e.stock;
  if(stock)sources.push({id:p.id,x:p.home?.x??p.x,z:p.home?.z??p.z,stock,culture:p.culture});
 }
 for(const n of e.nodes)if(n.kind==='food'&&resourceGrowth(n)?.state==='ready'&&resourceHarvest(n)?.reservedBy==null&&!(resourceCondition(n)?.burningUntil>e.time)&&!resourceCondition(n)?.removed)sources.push({id:'crop:'+n.id,x:n.x,z:n.z,node:n,culture:e.culture});
 return sources.filter(s=>s.node||(s.stock.food??0)>=1);
}
function approach(e,a,source){
 for(const offset of [0,.65,-.65,1.3,-1.3]){
  const angle=Math.atan2(a.z-source.z,a.x-source.x)+offset,p={x:source.x+Math.cos(angle)*.8,z:source.z+Math.sin(angle)*.8};
  if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))continue;
  const route=e.route(a,p);if(route)return route.map(p=>({x:p.x,z:p.z}));
 }return null;
}
function seekFood(e,r){
 const sources=ratFoodSources(e).filter(s=>dist(s,r)<22).sort((a,b)=>dist(a,r)-dist(b,r));
 for(const s of sources){const route=approach(e,r,s);if(route){r.foodId=s.id;r.route=route;r.state='scurrying';r.nibbleAt=null;return true;}}
 r.foodId=null;r.route=[];r.state='sniffing';r.waitUntil=e.time+6;return false;
}
export function spawnRat(e,p,{natural=false}={}){
 const s=ratOwlState(e);if(s.rats.length>=RAT_OWL_RULES.maxRats||!point(p)||!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))return null;
 const r={id:'rat-'+s.nextRatId++,species:'rat',culture:e.culture,x:p.x,z:p.z,state:'sniffing',health:6,maxHealth:6,dead:false,gone:false,natural,bornAt:e.time,leaveAt:e.time+RAT_OWL_RULES.ratLifetime,leavingAt:null,phase:0,facing:'right',speed:0,route:[],foodId:null,meals:0,nibbleAt:null,waitUntil:e.time,huntedBy:null};
 s.rats.push(r);seekFood(e,r);e.emit('rat-arrived',null,null,{ratId:r.id,x:r.x,z:r.z});return r;
}
function leaveRat(e,r){
 if(r.leavingAt!==null)return;r.leavingAt=e.time;r.state='leaving';r.foodId=null;r.nibbleAt=null;r.route=[];
 const angle=Math.atan2(r.z-e.depot.z,r.x-e.depot.x);
 for(const turn of [0,.7,-.7,1.4,-1.4]){const p={x:r.x+Math.cos(angle+turn)*5,z:r.z+Math.sin(angle+turn)*5};if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))continue;const route=e.route(r,p);if(route){r.route=route.map(p=>({x:p.x,z:p.z}));break;}}
}
function moveRat(e,r,dt){
 r.speed=0;if(!r.route.length)return;
 const from={x:r.x,z:r.z},next=walkStep(r,r.route[0],dt*RAT_OWL_RULES.ratSpeed/WALK_SPEED,e.heightAt,e.obstacles());
 r.x=next.x;r.z=next.z;const travel=dist(from,r);r.speed=travel/Math.max(.001,dt);r.phase=(r.phase+travel/.45)%1;
 r.facing=wildlifeFacing(r.x-from.x,r.z-from.z,r.facing);
 if(next.blocked){r.route=[];r.foodId=null;r.waitUntil=e.time+2;}else if(next.done)r.route.shift();
}
function updateRat(e,r,dt){
 if(!alive(r))return;
 if(e.time>=r.leaveAt||r.meals>=RAT_OWL_RULES.ratMeals)leaveRat(e,r);
 if(r.leavingAt!==null){moveRat(e,r,dt);if(e.time-r.leavingAt>5)r.gone=true;return;}
 if(e.time<r.waitUntil){r.speed=0;r.state='sniffing';return;}
 let food=ratFoodSources(e).find(s=>s.id===r.foodId);
 if(!food){if(!seekFood(e,r))return;food=ratFoodSources(e).find(s=>s.id===r.foodId);}
 if(r.route.length){r.state='scurrying';moveRat(e,r,dt);return;}
 r.speed=0;
 if(!food||dist(r,food)>1.3){seekFood(e,r);return;}
 r.state='nibbling';r.facing=wildlifeFacing(food.x-r.x,food.z-r.z,r.facing);r.nibbleAt??=e.time;
 if(e.time-r.nibbleAt<RAT_OWL_RULES.nibbleSeconds)return;
 // Recheck the current store/crop after the animation, before changing it.
 food=ratFoodSources(e).find(s=>s.id===r.foodId);if(!food){seekFood(e,r);return;}
 const amount=food.node?(isForage(food.node)?forageRules(food.node).amount:2):1;
 if(food.node)depleteResource(e,food.node);else food.stock.food-=amount;
 e.ratsOwls.stolen+=amount;r.meals++;r.nibbleAt=null;r.foodId=null;r.waitUntil=e.time+RAT_OWL_RULES.mealPause;r.state='sniffing';
 e.emit('rat-stole-food',null,food.node,{ratId:r.id,amount,pantryId:food.id,culture:food.culture,x:r.x,z:r.z});
}

const standing=(e,t)=>t?.kind==='wood'&&resourceGrowth(t)?.state==='ready'&&!resourceCondition(t)?.removed&&!(resourceCondition(t)?.burningUntil>e.time)&&Number.isFinite(e.heightAt(t.x,t.z));
export function owlHomeTree(e,o){const t=e.nodes.find(n=>n.id===o.treeId);return standing(e,t)&&(resourceWoodland(t)?.ecoBornAt??null)===o.treeBornAt?t:null;}
export function owlTrees(e,p=e.depot,{visible=false}={}){
 return e.nodes.filter(t=>standing(e,t)&&(!visible||visibleAt(e,t.x,t.z))&&!(e.birds?.nests??[]).some(n=>!n.lost&&n.treeId===t.id)&&!(e.ratsOwls?.owls??[]).some(o=>alive(o)&&!o.departing&&o.treeId===t.id)).sort((a,b)=>dist(a,p)-dist(b,p));
}
export function owlPerch(e,o){const t=owlHomeTree(e,o);return t?{x:t.x,z:t.z,y:e.heightAt(t.x,t.z)+(t.base??4)*.67,perch:{kind:'node',id:t.id}}:null;}
function flyOwl(e,o,to,arrive){
 const from={x:o.x,y:o.y,z:o.z,perch:o.perch??null},takeoffDuration=o.flight?0:.28;
 o.flight={from,to:{...to},at:e.time,duration:takeoffDuration+Math.max(.65,dist(from,to)/RAT_OWL_RULES.flightSpeed),takeoffDuration,arc:arrive==='departed'?1.4:1,arrive};
 o.perch=null;o.state='flying';o.facing=to.x<from.x?'left':'right';
}
export function spawnOwl(e,tree=null,{natural=false}={}){
 const s=ratOwlState(e),t=tree??owlTrees(e).find(t=>dist(t,e.depot)<35);
 if(s.owls.length>=RAT_OWL_RULES.maxOwls||!t||!owlTrees(e,t).includes(t))return null;
 const o={id:'owl-'+s.nextOwlId++,species:'owl',culture:e.culture,treeId:t.id,treeBornAt:resourceWoodland(t)?.ecoBornAt??null,x:t.x,z:t.z,y:e.heightAt(t.x,t.z)+(t.base??4)*.67,state:'nesting',health:16,maxHealth:16,dead:false,gone:false,natural,bornAt:e.time,phase:e.random(),facing:'front',perch:{kind:'node',id:t.id},flight:null,waitUntil:e.time+4,preyId:null,departing:false,departAt:null,carrying:false};
 s.owls.push(o);e.emit('owl-arrived',null,t,{owlId:o.id,x:o.x,z:o.z});return o;
}
function releasePrey(e,o){const r=e.ratsOwls.rats.find(r=>r.id===o.preyId);if(r?.huntedBy===o.id)r.huntedBy=null;o.preyId=null;}
function returnOwl(e,o){releasePrey(e,o);const home=owlPerch(e,o);if(home)flyOwl(e,o,home,'nesting');else departOwl(e,o);}
export function departOwl(e,o){
 if(o.departing||!alive(o))return false;
 o.departing=true;o.departAt=e.time;releasePrey(e,o);o.carrying=false;
 // This flag is never cleared, including when the old tree regrows or a save
 // is loaded. Departure can interrupt either half of a hunting flight.
 const dx=o.x-e.depot.x,dz=o.z-e.depot.z,length=Math.hypot(dx,dz)||1;
 flyOwl(e,o,{x:o.x+(dx/length||1)*12,z:o.z+dz/length*12,y:o.y+7},'departed');
 e.ratsOwls.departed++;e.emit('owl-left-tree',null,null,{owlId:o.id,treeId:o.treeId,x:o.x,z:o.z});return true;
}
function updateOwl(e,o,dt){
 if(!alive(o))return;o.phase=(o.phase+dt*3.5)%1;
 if(!o.departing&&!owlHomeTree(e,o))departOwl(e,o);
 if(o.flight){
  const f=o.flight,p=birdFlightPosition(f,e.time);o.x=p.x;o.z=p.z;o.y=p.y;
  if(e.time<f.at+f.duration)return;
  Object.assign(o,{x:f.to.x,z:f.to.z,y:f.to.y,perch:f.to.perch??null,flight:null,landedAt:e.time});
  if(f.arrive==='departed'){o.gone=true;return;}
  if(f.arrive==='catch'){
   const r=e.ratsOwls.rats.find(r=>r.id===o.preyId);
   if(r&&alive(r)&&r.huntedBy===o.id&&dist(r,o)<1.3){
    r.dead=true;r.gone=true;r.health=0;r.state='eaten';r.route=[];r.speed=0;r.huntedBy=null;o.carrying=true;e.ratsOwls.eaten++;
    e.emit('owl-ate-rat',null,null,{owlId:o.id,ratId:r.id,x:r.x,z:r.z});
   }
   returnOwl(e,o);return;
  }
  o.state='nesting';o.facing='front';o.carrying=false;o.waitUntil=e.time+RAT_OWL_RULES.huntPause;return;
 }
 if(o.departing)return;
 if(e.time<o.waitUntil)return;
 o.waitUntil=e.time+2;
 const prey=e.ratsOwls.rats.filter(r=>alive(r)&&r.leavingAt===null&&r.huntedBy===null&&dist(r,o)<=RAT_OWL_RULES.huntRadius).sort((a,b)=>dist(a,o)-dist(b,o))[0];
 // A swoop aims at the current position. The rat may escape before contact.
 if(prey){prey.huntedBy=o.id;o.preyId=prey.id;flyOwl(e,o,{x:prey.x,z:prey.z,y:(e.heightAt(prey.x,prey.z)??0)+.12},'catch');e.emit('owl-hunting',null,null,{owlId:o.id,ratId:prey.id});}
}
export function updateRatsOwls(e,dt){
 const s=e.ratsOwls;if(!s||!(dt>0))return;
 if(e.time>=s.nextRatAt){
  s.nextRatAt=e.time+RAT_OWL_RULES.ratEvery;
  if(s.rats.filter(r=>alive(r)&&r.natural).length<RAT_OWL_RULES.maxNaturalRats&&e.random()<RAT_OWL_RULES.ratChance){
   const food=ratFoodSources(e);if(food.length){const target=food[Math.min(food.length-1,Math.floor(e.random()*food.length))];
    for(let i=0;i<12;i++){const angle=e.random()*Math.PI*2+i*.52,p={x:target.x+Math.cos(angle)*7,z:target.z+Math.sin(angle)*7};if(canWalkAt(p.x,p.z,e.heightAt,e.obstacles())&&approach(e,p,target)){spawnRat(e,p,{natural:true});break;}}
   }
  }
 }
 if(e.time>=s.nextOwlAt){s.nextOwlAt=e.time+RAT_OWL_RULES.owlEvery;if(!s.owls.some(o=>alive(o)&&o.natural)&&e.random()<RAT_OWL_RULES.owlChance)spawnOwl(e,null,{natural:true});}
 for(const r of s.rats)updateRat(e,r,dt);
 for(const o of s.owls)updateOwl(e,o,dt);
 s.rats=s.rats.filter(r=>!r.gone);s.owls=s.owls.filter(o=>!o.gone);
 // A missing/dead owl must not leave a reserved rat unhuntable.
 for(const r of s.rats)if(r.huntedBy&&!s.owls.some(o=>alive(o)&&o.preyId===r.id))r.huntedBy=null;
}

export const isFaunaWish=kind=>kind==='rat'||kind==='owl';
export function faunaWishTarget(e,kind,target){
 const p=target?.actor??target?.anchor??e.nodes.find(n=>n.id===target?.id)??target,invalid=reason=>({valid:false,reason});
 if(!point(p)||!Number.isFinite(e.heightAt(p.x,p.z)))return invalid('Choose visible ground near a camp or tree.');
 if(kind==='rat'){
  if((e.ratsOwls?.rats.length??0)>=RAT_OWL_RULES.maxRats)return invalid('Too many rats are here already.');
  if(!canWalkAt(p.x,p.z,e.heightAt,e.obstacles()))return invalid('Choose clear ground for the rat.');
  return {valid:true,point:{x:p.x,z:p.z},label:'Summon a '+RAT_OWL_SPECIES[e.culture].rat.toLowerCase()};
 }
 if((e.ratsOwls?.owls.length??0)>=RAT_OWL_RULES.maxOwls)return invalid('The resident owls already occupy this area.');
 const tree=owlTrees(e,p,{visible:true}).find(t=>dist(t,p)<=12);
 return tree?{valid:true,point:{x:tree.x,z:tree.z},tree,label:'An owl will make its home in this tree'}:invalid('Choose a place near a living, unoccupied tree.');
}
export function castFaunaWish(e,kind,check){check.spawned=kind==='rat'?spawnRat(e,check.point):spawnOwl(e,check.tree);e.emit('wish-'+kind,null,check.tree,{animalId:check.spawned?.id,x:check.point.x,z:check.point.z});}

export function validRatsOwls(e){
 const s=e.ratsOwls;if(s==null)return true;
 const nonnegative=n=>Number.isFinite(n)&&n>=0,serial=n=>Number.isSafeInteger(n)&&n>=0,maybeTime=n=>n===null||nonnegative(n),culture=c=>Object.hasOwn(RAT_OWL_SPECIES,c),bool=b=>typeof b==='boolean';
 if(!Array.isArray(s.rats)||!Array.isArray(s.owls)||s.rats.length>RAT_OWL_RULES.maxRats||s.owls.length>RAT_OWL_RULES.maxOwls||!['nextRatId','nextOwlId'].every(k=>serial(s[k]))||!['nextRatAt','nextOwlAt','stolen','eaten','departed'].every(k=>nonnegative(s[k])))return false;
 const all=[...s.rats,...s.owls];if(new Set(all.map(a=>a.id)).size!==all.length)return false;
 const base=(a,species,max)=>a?.species===species&&typeof a.id==='string'&&new RegExp('^'+species+'-\\d+$').test(a.id)&&Number(a.id.split('-')[1])<(species==='rat'?s.nextRatId:s.nextOwlId)&&culture(a.culture)&&point(a)&&[a.health,a.bornAt,a.phase,a.waitUntil].every(nonnegative)&&a.health<=max&&a.maxHealth===max&&[a.dead,a.gone,a.natural].every(bool);
 if(!s.rats.every(r=>base(r,'rat',6)&&['sniffing','scurrying','nibbling','leaving','eaten'].includes(r.state)&&['left','right','front','back'].includes(r.facing)&&nonnegative(r.speed)&&serial(r.meals)&&r.meals<=RAT_OWL_RULES.ratMeals&&nonnegative(r.leaveAt)&&maybeTime(r.leavingAt)&&maybeTime(r.nibbleAt)&&(r.foodId===null||typeof r.foodId==='string')&&(r.huntedBy===null||s.owls.some(o=>o.id===r.huntedBy&&o.preyId===r.id))&&Array.isArray(r.route)&&r.route.length<=512&&r.route.every(point)))return false;
 return s.owls.every(o=>base(o,'owl',16)&&Number.isFinite(o.y)&&['front','back','left','right'].includes(o.facing)&&['nesting','flying'].includes(o.state)&&bool(o.departing)&&maybeTime(o.departAt)&&bool(o.carrying)&&(typeof o.treeId==='string'||Number.isSafeInteger(o.treeId))&&(o.treeBornAt===null||nonnegative(o.treeBornAt))&&(o.preyId===null||s.rats.some(r=>r.id===o.preyId&&r.huntedBy===o.id))&&(!o.departing||o.departAt!==null)&&(!o.flight?o.state!=='flying':o.state==='flying'&&[o.flight.from,o.flight.to].every(p=>point(p)&&Number.isFinite(p.y))&&nonnegative(o.flight.at)&&o.flight.duration>0&&Number.isFinite(o.flight.duration)&&nonnegative(o.flight.takeoffDuration)&&o.flight.takeoffDuration<o.flight.duration&&nonnegative(o.flight.arc)&&['nesting','catch','departed'].includes(o.flight.arrive)&&(!o.departing||o.flight.arrive==='departed')));
}
