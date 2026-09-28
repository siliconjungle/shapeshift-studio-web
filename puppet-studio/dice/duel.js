import {MAX_HEARTS} from './encounter.js';
import {rollTarget,rollValue} from './rules.js';
import {speedForCombo} from './gameplay.js';
import {chooseOpponentAttack,resolveOpponentAttack} from './opponent-defense.js';

// The opponent chooses one hidden response for each throw. The shield tile is
// the player's only way to block a selected strike.
export class SkeletonDuel{
 constructor(){this.reset();}
 reset(){this.heartUnits=MAX_HEARTS*2;this.hearts=3;this.combo=0;this.sides=6;this.lastRoll=null;this.lastId=null;this.attack=null;}
 get speed(){return speedForCombo(this.combo);}
 get defeated(){return this.heartUnits===0;}
 beginTurn(choices,random=Math.random){
  this.attack=chooseOpponentAttack(choices,random);
  return this.attack;
 }
 resolve(id,{grade,raw,sides,valid=true},random,defence=null){
  if(id===this.lastId||this.defeated)return null;
  this.lastId=id;
  const total=valid?raw+grade.bonus:null,target=rollTarget(sides);
  const attack=this.attack??chooseOpponentAttack(grade.kind==='skull'?['strike']:['feint'],random),response=resolveOpponentAttack(attack,defence==='shield'?'strike':null);
  this.attack=null;
  let incomingKind='wait',incomingDamage=0,enemyRoll;
  if(attack.selected==='strike'){
   this.combo++;this.lastRoll=enemyRoll=rollValue(this.sides,random);
   incomingKind=response.blocked?'blocked':'counter';incomingDamage=response.blocked?0:1;
  }
  let playerKind='wait',playerDamage=0;
  if(grade.kind==='sword'){
   const hit=valid&&total>=target;playerKind=hit?'hit':'dodge';playerDamage=hit?1:0;
   if(hit){this.heartUnits=Math.max(0,this.heartUnits-1);this.hearts=Math.max(0,this.hearts-1);this.combo=0;}
  }
  const kind=incomingKind==='counter'||incomingKind==='blocked'?incomingKind:playerKind;
  return{kind,playerKind,incomingKind,damage:incomingDamage,playerDamage,blocked:response.blocked,possible:response.possible,selected:response.selected,defence:response.defence,enemyRoll,total,target,defeated:this.defeated};
 }
}
