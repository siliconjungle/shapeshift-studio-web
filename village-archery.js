import {validArcheryState} from './ecs/archery-state.js';
import {actorCombat,ensureActorCombat} from './ecs/actor-combat.js';
import {personAge} from './ecs/person-age.js';
import {villageWorld} from './ecs/village-world.js';
import {arrowFlights} from './ecs/arrow-flights.js';
import {launchArrowSystem,updateArcherySystem} from './ecs/systems/archery.js';
import {rivalCombatants} from './rival-beast.js';
import {defineGameData} from './game-data.js';
export const ARCHERY_RULES=defineGameData('village-archery.ARCHERY_RULES',{chance:.3,range:7.5,preferredRange:5,damage:10,speed:13,hitRadius:1.1});
export function initialiseCombatStyle(actor,random=Math.random){const state=ensureActorCombat(actor);state.style??=random()<ARCHERY_RULES.chance?'bow':'sword';return state.style;}
export const isArcher=a=>actorCombat(a)?.style==='bow'&&!(personAge(a)?.child)&&a.species!=='beast';
export function archeryState(e){const state=e.archery??={nextId:0,arrows:[]};arrowFlights(e);return state;}
export function arrowActor(e,kind,id){return (kind==='villager'?e.workers:kind==='outsider'?rivalCombatants(e):kind==='beast'?e.beasts?.actors:kind==='slime'?e.slimes?.enemies:e.raids?.enemies)?.find(a=>a.id===id);}
export function clearArrowShot(e,a,b){
 const d=Math.hypot(b.x-a.x,b.z-a.z);if(d>ARCHERY_RULES.range||d<.1)return false;
 const obstacles=e.obstacles();
 for(let t=.12;t<.94;t+=.08){const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,h=e.heightAt(x,z),y=(e.heightAt(a.x,a.z)??0)+1.05+((e.heightAt(b.x,b.z)??0)-(e.heightAt(a.x,a.z)??0))*t;
  if(!Number.isFinite(h)||h>y-.2||obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius*.8&&Math.hypot(a.x-o.x,a.z-o.z)>o.radius+.1&&Math.hypot(b.x-o.x,b.z-o.z)>o.radius+.1))return false;
 }return true;
}
export function launchArrow(e,...args){return launchArrowSystem(villageWorld(e),...args);}
export function updateArchery(e){return updateArcherySystem(villageWorld(e));}
export function arrowPosition(a,now){const t=Math.max(0,Math.min(1,(now-a.at)/(a.arriveAt-a.at)));return {x:a.from.x+(a.to.x-a.from.x)*t,z:a.from.z+(a.to.z-a.from.z)*t,y:a.from.y+(a.to.y-a.from.y)*t+Math.sin(Math.PI*t)*.28};}
export function validArchery(s){return s==null||validArcheryState(s);}

export function firingRoute(e,w,target){
 const base=Math.atan2(w.z-target.z,w.x-target.x);
 for(const radius of [ARCHERY_RULES.preferredRange,3,1.5])for(const offset of [0,.5,-.5,1,-1,1.6,-1.6,Math.PI]){const a=base+offset,p={x:target.x+Math.cos(a)*radius,z:target.z+Math.sin(a)*radius};if(!clearArrowShot(e,p,target))continue;const route=e.route(w,p);if(route?.length)return route;}
 return [];
}
