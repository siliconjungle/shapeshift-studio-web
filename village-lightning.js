import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {releaseWork} from "./village-resources.js";
import {depleteResource} from "./village-resources.js";
import {resourceGrowth,resourceCondition} from './ecs/resource-state.js';
import {farmingInterrupt} from './village-farming.js';
import {beastsCue} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {allShelters} from './camp-rules.js';
import {defineGameData} from './game-data.js';
import {structureCoversPlant} from './structure-understory.js';
import {igniteHouse,homePosition,homeFire,shelterState} from './village-shelter.js';
import {WORLD_BOUNDS} from './village-layout.js';
import {rootedForageAlive} from './village-foraging.js';
import {villageAirTemperature} from './temperature-wish.js';

export const LIGHTNING_RULES=defineGameData('village-lightning.LIGHTNING_RULES',Object.freeze({snapRadius:2.2,ignitionChance:.4,boltSeconds:.7,burnSeconds:12,wetExposure:2.4,plantRegrowSeconds:65,startleRadius:6}));
export const HEAT_FIRE_RULES=defineGameData('village-lightning.HEAT_FIRE_RULES',Object.freeze({minTemperature:38,maxTemperature:45,checkSeconds:5,maxRate:.002,rainProtection:.02}));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const key=p=>p.kind+':'+p.id;
export function lightningState(e){return e.lightning??={lastStrikeId:0,strikes:[],fires:[],scenery:[]}}
export function registerLightningScenery(e,plants){const s=lightningState(e);for(const p of plants){const existing=s.scenery.find(n=>n.id===p.id),removed=p.available===false||structureCoversPlant(e,p);if(!existing)s.scenery.push({...p,state:removed?'removed':'ready',readyAt:0});else if(removed)existing.state='removed'}}
function plantGrowth(p,kind){return kind==='tree'||kind==='crop'?resourceGrowth(p):p}
function plantCondition(p,kind){return kind==='tree'||kind==='crop'?resourceCondition(p):p}
function living(e,p,kind){
 const growth=plantGrowth(p,kind),condition=plantCondition(p,kind);
 if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||condition?.removed||!['ready','growing','fading'].includes(growth?.state)&&!rootedForageAlive(p)||(condition?.burningUntil??0)>e.time)return false;
 if(kind==='crop'&&(growth?.growth??1)<.15&&!rootedForageAlive(p))return false;
 if(kind==='plant'&&e.housing?.projects.some(h=>Math.abs(p.x-h.x)<2.7&&Math.abs(p.z-h.z)<1.9))return false;
 return !(e.wishes?.burns??[]).some(b=>b.id===p.id&&b.until>e.time);
}
export function lightningPlants(e){
 const s=lightningState(e),all=[...e.nodes.filter(n=>n.ecologyId===undefined&&(n.kind==='wood'||n.kind==='food')).map(n=>({kind:n.kind==='wood'?'tree':'crop',id:n.id,plant:n})),...(e.ecology?.mushrooms??[]).map(p=>({kind:'mushroom',id:p.id,plant:p})),...s.scenery.map(p=>({kind:'plant',id:p.id,plant:p}))];
 return all.filter(t=>living(e,t.plant,t.kind)&&!s.fires.some(f=>key(f)===key(t)&&e.time<f.until));
}
function findPlant(e,t){return t.kind==='plant'?e.lightning.scenery.find(p=>p.id===t.id):t.kind==='mushroom'?e.ecology?.mushrooms.find(p=>p.id===t.id):e.nodes.find(p=>p.id===t.id)}
function height(e,x,z){const y=e.heightAt(x,z);return Number.isFinite(y)?y:null}
export function lightningImpact(e,event){
 const b=WORLD_BOUNDS,u=Math.max(0,Math.min(1,event.u??.5)),v=Math.max(0,Math.min(1,event.v??.5));
 const point={x:Number.isFinite(event.x)?event.x:b.left+u*(b.right-b.left),z:Number.isFinite(event.z)?event.z:b.back+v*(b.front-b.back)};
 shelterState(e);const home=allShelters(e).filter(h=>!(structuralCondition(h)?.destroyed)&&!homeFire(e,h)).find(h=>distance(point,homePosition(h))<=LIGHTNING_RULES.snapRadius);
 if(home){const p=homePosition(home);return {kind:'house',id:home.id,home,...p,y:height(e,p.x,p.z),height:home.height??6.4}}
 const target=lightningPlants(e).filter(t=>height(e,t.plant.x,t.plant.z)!==null&&distance(point,t.plant)<=LIGHTNING_RULES.snapRadius).sort((a,b)=>distance(point,a.plant)-distance(point,b.plant))[0];
 if(target){const p=target.plant,h=(p.base??p.height??(target.kind==='tree'?4:1))*Math.max(.15,plantGrowth(p,target.kind)?.growth??1);return {...target,x:p.x,z:p.z,y:height(e,p.x,p.z),height:h}}
 const y=height(e,point.x,point.z);if(y===null)return null;
 if(e.obstacles().some(o=>distance(point,o)<o.radius))return null;
 return {...point,y,height:0,kind:'ground',id:null};
}
function ignite(e,impact,cause='lightning'){
 const s=lightningState(e),p=impact.plant,until=e.time+LIGHTNING_RULES.burnSeconds;
 const fire={kind:impact.kind,id:p.id,x:p.x,z:p.z,height:impact.height,cause,startedAt:e.time,until,wet:0,regrowAt:until+LIGHTNING_RULES.plantRegrowSeconds};
 if(impact.kind==='tree'||impact.kind==='crop'){
  for(const w of e.workers)if(w.node===p){((domainState)=>domainState==null?undefined:(farmingInterrupt(domainState,w)))(e.farming);releaseWork(e,w)}
  depleteResource(e,p,{cause:'fire'});if(resourceGrowth(p).readyAt!==null)resourceGrowth(p).readyAt=fire.regrowAt;
 }else{p.state='burning';p.readyAt=fire.regrowAt}
 plantCondition(p,impact.kind).burningUntil=until;s.fires=s.fires.filter(f=>key(f)!==key(fire));s.fires.push(fire);
 e.emit(cause+'-ignited',null,p,{kind:impact.kind,x:p.x,z:p.z});
}
function updateHeatFires(e,weather){
 const s=lightningState(e),r=HEAT_FIRE_RULES;
 const heat=Math.max(0,Math.min(1,(villageAirTemperature(e,weather)-r.minTemperature)/(r.maxTemperature-r.minTemperature)));
 // Only continuous hot, dry simulation time counts. Pausing, loading, and wet
 // or cool periods cannot bank a burst of delayed fires.
 if(!heat||(weather.rain??0)>=r.rainProtection){s.heatCheckAt=null;return}
 s.heatCheckAt??=e.time+r.checkSeconds;
 if(e.time<s.heatCheckAt)return;s.heatCheckAt=e.time+r.checkSeconds;
 // A per-plant hazard (~11% per minute at 45°C), independent of frame rate.
 const chance=-Math.expm1(-r.maxRate*heat*r.checkSeconds);
 for(const target of lightningPlants(e)){
  if(!['tree','crop'].includes(target.kind)||e.random()>=chance)continue;
  const p=target.plant;if(height(e,p.x,p.z)===null)continue;
  ignite(e,{...target,height:(p.base??(target.kind==='tree'?4:1))*Math.max(.15,plantGrowth(p,target.kind)?.growth??1)},'heat');
  for(const w of e.workers)if(!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&distance(w,p)<LIGHTNING_RULES.startleRadius)e.emit('fire-startled',w);
  for(const b of e.beasts?.actors??[])if(!(actorVitality(b)?.dead)&&!b.divineHeld&&distance(b,p)<LIGHTNING_RULES.startleRadius)beastsCue(e.beasts,b,'surprise','surprised');
 }
}
// Simulation owns strikes, ignition and extinguishing. Drawing cannot consume
// cards, award wood, replay a hit, or change the fire's lifetime.
export function updateLightning(e,dt,weather={},events=[]){
 if(!(dt>0))return;
 weather={...weather,rain:Math.max(weather.rain??0,e.wishes?.rainUntil>e.time ? .7 : 0)};
 const s=lightningState(e);
 for(const p of s.scenery)if(structureCoversPlant(e,p)){p.state='removed';p.growth=0;p.readyAt=0;}
 for(const f of s.fires){
  const p=findPlant(e,f),growth=p&&plantGrowth(p,f.kind),condition=p&&plantCondition(p,f.kind);
  if(e.time<f.until){
   f.wet+=Math.max(0,weather.rain??0)*dt;
   if(f.wet>=LIGHTNING_RULES.wetExposure){f.until=e.time;f.regrowAt=e.time+LIGHTNING_RULES.plantRegrowSeconds;if(p){condition.burningUntil=e.time;if(growth.readyAt!==null)growth.readyAt=f.regrowAt}e.emit('lightning-extinguished',null,p,{kind:f.kind,x:f.x,z:f.z})}
  }
  if(e.time>=f.until&&growth?.state==='burning'){growth.state=f.kind==='mushroom'?'dormant':'depleted';growth.growth=0;condition.burningUntil=f.until}
  if(f.kind==='plant'&&e.time>=f.regrowAt&&p&&p.state!=='removed'){p.state='ready';p.growth=1}
 }
 s.fires=s.fires.filter(f=>e.time<f.regrowAt);
 s.strikes=s.strikes.filter(strike=>e.time-strike.at<LIGHTNING_RULES.boltSeconds);
 for(const event of events){
  if(event.type!=='lightning'||!Number.isSafeInteger(event.id)||event.id<=s.lastStrikeId)continue;
  s.lastStrikeId=event.id;
  const impact=lightningImpact(e,event);if(!impact)continue;
  const {plant,home,...contact}=impact,strike={...contact,id:event.id,targetId:impact.id,at:e.time};s.strikes.push(strike);
  e.emit('lightning-struck',null,null,{x:impact.x,z:impact.z});
  for(const w of e.workers)if(!(actorVitality(w)?.dead)&&!(actorInterior(w)?.inside)&&distance(w,impact)<LIGHTNING_RULES.startleRadius)e.emit('lightning-startled',w);
  for(const b of e.beasts?.actors??[])if(!(actorVitality(b)?.dead)&&!b.divineHeld&&distance(b,impact)<LIGHTNING_RULES.startleRadius)beastsCue(e.beasts,b,'surprise','surprised');
  const chance=LIGHTNING_RULES.ignitionChance*(1-Math.max(0,Math.min(1,weather.rain??0))*.65);
  if((plant||home)&&e.random()<chance){if(home)igniteHouse(e,home,{cause:'lightning'});else ignite(e,impact)}
 }
 updateHeatFires(e,weather);
}
