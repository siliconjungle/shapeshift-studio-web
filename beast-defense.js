import {structuralCondition} from './ecs/home-entities.js';
import {beastLearning} from './ecs/beast-learning.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorRomance} from './ecs/actor-romance.js';
import {damageEnemy} from './village-enemies.js';
import {rivalCombatants} from './rival-beast.js';
import {defineGameData} from './game-data.js';
import {visibleAt} from './village-exploration.js';
import {rivalThreats,damageRival} from './village-rival.js';
import {homePosition} from './village-shelter.js';
export const BEAST_DEFENSE_RULES=defineGameData('beast-defense.BEAST_DEFENSE_RULES',{responseRange:18,combatSpeed:1.05,approach:1.9,retaliateSeconds:18});
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.gone&&!w.exiled,distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export const beastEnemyKind=(e,a)=>a.species==='slime'?'slime':rivalCombatants(e).includes(a)?'rival':'raider';
export function beastEnemies(e){return [...(e.raids?.enemies??[]),...(e.slimes?.enemies??[]),...(e.rival?rivalThreats(e):[])].filter(a=>alive(a)&&!a.divineHeld&&!['fleeing','departing','fading','emerging','airborne'].includes(a.state));}
export function beastThreat(e,b,ward=null){
 const score=a=>{
  const d=distance(a,b);if(d>BEAST_DEFENSE_RULES.responseRange||!visibleAt(e,a.x,a.z))return -Infinity;
  if(b.unreachableThreat?.id===a.id&&b.unreachableThreat.kind===beastEnemyKind(e,a)&&b.unreachableThreat.until>e.time)return -Infinity;
  const retaliation=b.lastThreat?.id===a.id&&b.lastThreat.kind===beastEnemyKind(e,a)&&e.time-b.lastThreat.at<BEAST_DEFENSE_RULES.retaliateSeconds;
  const victim=e.workers.find(w=>alive(w)&&(w.id===a.victimId||a.species==='slime'&&a.targetKind==='villager'&&w.id===a.targetId));
  const house=e.life?.homes.find(h=>!(structuralCondition(h)?.destroyed)&&h.id===a.buildingId),attacking=['attacking','building-attack','defending','rival-raiding'].includes(a.state);
  const menace=ward&&distance(a,ward)<8;
  const urgent=attacking&&(victim&&distance(a,victim)<10||house&&distance(a,homePosition(house))<7);
  const close=d<9*(.65+((beastLearning(b)?.habits)?.protect??.5)*.7);
  if(!retaliation&&!menace&&!urgent&&!close)return -Infinity;
  if(a.species==='slime'&&a.targetId==null&&!retaliation&&e.time-(a.lastCombatAt??-Infinity)>=6)return -Infinity;
  return (retaliation?35:0)+(menace?30:0)+(urgent?25:0)+(victim?.id===(actorRomance(b)?.sweetheartId)?10:0)-d;
 };
 return beastEnemies(e).map(a=>({a,score:score(a)})).filter(t=>Number.isFinite(t.score)).sort((a,c)=>c.score-a.score)[0]?.a;
}
export function beastAttackRoute(routeTo,b,target){
 const angle=Math.atan2(b.z-target.z,b.x-target.x),radius=BEAST_DEFENSE_RULES.approach;
 for(const turn of [0,.6,-.6,1.2,-1.2,1.8,-1.8,Math.PI]){const p={x:target.x+Math.cos(angle+turn)*radius,z:target.z+Math.sin(angle+turn)*radius},route=routeTo(b,p);if(route)return route;}
 // Narrow ground can have no safe point on the approach circle. The target's
 // own reachable ground is still a valid route; fight() stops at melee range.
 return routeTo(b,{x:target.x,z:target.z});
}
export function damageBeastEnemy(e,target,amount,b,options){return beastEnemyKind(e,target)==='rival'?damageRival(e,target,amount,'attack',b):damageEnemy(e,target.species,target,amount,b,options);}
