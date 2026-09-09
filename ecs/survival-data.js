import {actorVitality} from './actor-vitality.js';
import {defineGameData} from '../game-data.js';
export const SURVIVAL_RULES=defineGameData('village-survival.SURVIVAL_RULES',{health:100,starvationGrace:12,starvationDamage:.8,exhaustionGrace:15,exhaustionDamage:.65,healRate:.45,healDelay:12,retreatHealth:28,recoverHealth:48,defendDamage:12,criticalChance:.12,criticalMultiplier:1.5});
export const isAlive=w=>!!w&&!(actorVitality(w)?.dead);
export class VillageSurvival {}
export function validSurvivalState(s){return s instanceof VillageSurvival&&s.economy&&typeof s.economy==='object'&&Number.isSafeInteger(s.deaths)&&s.deaths>=0&&Number.isSafeInteger(s.nextDrop)&&s.nextDrop>=0&&Array.isArray(s.drops)&&Array.isArray(s.memorials);}
