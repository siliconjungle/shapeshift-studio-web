import {defineGameData} from '../game-data.js';
const nonnegative=n=>Number.isFinite(n)&&n>=0;
export const validGhostVisit=g=>g!==null&&typeof g==='object'&&typeof g.id==='string'&&typeof g.name==='string'&&typeof g.graveId==='string'&&Number.isSafeInteger(g.workerId)&&g.workerId>=0&&Number.isFinite(g.x)&&Number.isFinite(g.z)&&nonnegative(g.bornAt)&&nonnegative(g.expiresAt)&&g.expiresAt>=g.bornAt&&nonnegative(g.hostility)&&g.hostility<=1&&['seeking','peaceful','lonely','angry'].includes(g.state)&&nonnegative(g.nextEncounterAt)&&nonnegative(g.nextAttackAt)&&Array.isArray(g.encounters)&&g.encounters.length<=12&&
  (g.pending===null||Number.isSafeInteger(g.pending?.workerId)&&nonnegative(g.pending?.until))&&
  (g.speech===undefined||g.speech===null||typeof g.speech?.text==='string'&&nonnegative(g.speech?.until))&&
  (g.reply===undefined||Number.isSafeInteger(g.reply?.workerId)&&typeof g.reply?.text==='string'&&nonnegative(g.reply?.until));
export const GHOST_RULES=defineGameData('village-ghosts.GHOST_RULES',{nightChance:.35,minDuration:35,maxDuration:55,noticeRadius:5,roamRadius:4,responseSeconds:5,encounterGap:12,hostileAt:.7,attackGap:6,attackDamage:7,fearSeconds:7});
export const ghostNight=hour=>hour>=21||hour<5;
export function validGhostState(s){
 if(!s)return true;
 const nonnegative=n=>Number.isFinite(n)&&n>=0;
 return typeof s.wasNight==='boolean'&&(s.rollAt===null||nonnegative(s.rollAt))&&Number.isSafeInteger(s.serial)&&s.serial>=0&&Number.isSafeInteger(s.visits)&&s.visits>=0&&Array.isArray(s.actors)&&s.actors.length<=1&&s.actors.every(validGhostVisit);
}
