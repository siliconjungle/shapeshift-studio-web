import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {shelterWeather} from './ecs/shelter-state.js';
import {structuralCondition} from './ecs/home-entities.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {defineGameData} from './game-data.js';
import {homeFire,homePosition,igniteHouse} from './village-shelter.js';
export const CHAPEL_RULES=defineGameData('village-chapel.CHAPEL_RULES',{beds:2,width:6.8,depth:4.2,radius:3.1,height:8.2,health:180,load:3});
export const CHAPEL_STAGES=defineGameData('village-chapel.CHAPEL_STAGES',[
 {id:'foundation',kind:'stone',amount:12,strikes:6},
 {id:'frame',kind:'wood',amount:14,strikes:7},
 {id:'walls',kind:'stone',amount:8,strikes:6},
 {id:'roof',kind:'wood',amount:16,strikes:8}
]);
export const CHAPEL_SITES=defineGameData('village-chapel.CHAPEL_SITES',[{id:'chapel-1',x:25,z:21},{id:'chapel-2',x:25,z:12},{id:'chapel-3',x:19,z:21}]);
export const chapelHome=e=>(e.life?.homes??[]).find(h=>h.kind==='chapel'&&!(structuralCondition(h)?.destroyed)&&!homeFire(e,h));
export function startChapelArson(e,revolt){
 if(!revolt||revolt.arson)return false;
 const home=chapelHome(e);if(!home||e.random()>=.45)return false;
 const rebel=e.workers.find(w=>revolt.rebelIds.includes(w.id)&&!(actorVitality(w)?.dead)&&!(personAge(w)?.child));if(!rebel)return false;
 revolt.arson={workerId:rebel.id,homeId:home.id,state:'approaching',startedAt:e.time,deadline:e.time+30,nextRoute:0};return true;
}
export function cancelChapelArson(e,revolt){const a=revolt?.arson;if(!a)return;const w=e.workers.find(w=>w.id===a.workerId);if(w){w.arsonTargetId=null;w.arsonUntil=null;}a.state='cancelled';}
export function handleChapelArson(e,w,dt){
 const revolt=e.leadership?.revolt,a=revolt?.arson;if(!a||a.workerId!==w.id||['done','cancelled'].includes(a.state)||!(dt>0))return false;
 const home=e.life.homes.find(h=>h.id===a.homeId),rain=e.wishes?.rainUntil>e.time?1:shelterWeather(e.shelter)?.rain??0;
 const defended=revolt.loyalistIds.some(id=>{const p=e.workers.find(o=>o.id===id);return p&&!(actorVitality(p)?.dead)&&!(actorInterior(p)?.inside)&&Math.hypot(w.x-p.x,w.z-p.z)<1.8});
 if((actorVitality(w)?.dead)||!home||(structuralCondition(home)?.destroyed)||homeFire(e,home)||e.time>=a.deadline||rain>.25||defended||(actorVitality(w)?.health)<25){cancelChapelArson(e,revolt);return false;}
 const point={x:home.x,z:home.z+.25};w.arsonTargetId=home.id;w.combatTarget=null;w.combatKind=null;
 if(Math.hypot(w.x-point.x,w.z-point.z)>1){
  if(e.time>=a.nextRoute){a.nextRoute=e.time+2;const route=e.route(w,point);if(!route){cancelChapelArson(e,revolt);return false;}w.route=route;}
  w.state='revolt-bound';if(e.move(w,dt)==='blocked'){cancelChapelArson(e,revolt);return false;}return true;
 }
 w.route=[];w.vx=w.vz=0;w.facing='back';
 if(a.state!=='lighting'){a.state='lighting';w.arsonUntil=e.time+3;e.emit('chapel-arson-start',w,null,{houseId:home.id});}
 if(e.time>=w.arsonUntil){
  a.state='done';w.arsonTargetId=null;w.arsonUntil=null;
  const participants=e.workers.filter(p=>!(actorVitality(p)?.dead)&&[...revolt.rebelIds,...revolt.loyalistIds].includes(p.id));
  igniteHouse(e,home,{cause:'revolt'});for(const p of participants)if(p.state==='idle')p.state='revolt-bound';
  e.emit('chapel-arson',w,null,{houseId:home.id,...homePosition(home)});
 }
 return true;
}
