import {actorVitality} from './ecs/actor-vitality.js';
import {survivalDrop} from './village-survival.js';
import {defineGameData} from './game-data.js';
import {canWalkAt,walkStep} from './village-walking.js';

export const ENEMY_LOOT_RULES=defineGameData('enemy-loot.ENEMY_LOOT_RULES',{bonusChance:.35,minAmount:1,maxAmount:2,landingSeconds:.9});
const kinds=['food','wood','stone'];

function landingPoint(e,enemy,index){
 const obstacles=e.obstacles(),angle=index*2.399963229728653;
 for(const radius of [.85,.45])for(let i=0;i<12;i++){
  const a=angle+i*Math.PI/6,p={x:enemy.x+Math.cos(a)*radius,z:enemy.z+Math.sin(a)*radius};
  if(!canWalkAt(p.x,p.z,e.heightAt,obstacles))continue;
  const step=walkStep(enemy,p,1,e.heightAt,obstacles);
  if(step.done&&!step.blocked)return p;
 }
 // Keep the goods at the death location if there is no clear landing nearby.
 return {x:enemy.x,z:enemy.z};
}

// The death transition owns this once-only roll. Renderers only animate the
// saved physical drops; neither loading a save nor removing a corpse rolls again.
export function dropEnemyLoot(e,enemy){
 if(!(actorVitality(enemy)?.dead)||enemy.lootDropped)return [];
 enemy.lootDropped=true;
 const drops=[],enemyKind=enemy.species==='slime'?'slime':'raider';
 const spill=(kind,amount,loot)=>{
  const drop=survivalDrop(e.survival,landingPoint(e,enemy,e.survival.nextDrop),kind,amount);
  if(!drop)return;
  Object.assign(drop,{origin:{x:enemy.x,z:enemy.z},bornAt:e.time,availableAt:e.time+ENEMY_LOOT_RULES.landingSeconds,source:'enemy-loot',enemyId:enemy.id,enemyKind,loot});
  drops.push(drop);
 };
 if(enemy.cargo){spill(enemy.cargo.kind,enemy.cargo.amount,'stolen');enemy.cargo=null}
 if(e.random()<ENEMY_LOOT_RULES.bonusChance){
  const kind=kinds[Math.min(kinds.length-1,Math.floor(e.random()*kinds.length))];
  const {minAmount,maxAmount}=ENEMY_LOOT_RULES;
  spill(kind,minAmount+Math.min(maxAmount-minAmount,Math.floor(e.random()*(maxAmount-minAmount+1))),'bonus');
 }
 return drops;
}
