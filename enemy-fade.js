import {deathPose} from './death-motion.js';
export const ENEMY_FADE_SECONDS=.8;
export function enemyOpacity(enemy,time,vitality={}){
 if(vitality.dead)return deathPose(enemy,time,vitality).opacity;
 const at=enemy.state==='departing'?enemy.departedAt:enemy.state==='fading'?enemy.fadeAt:undefined;
 if(at===undefined)return 1;
 const t=Math.max(0,Math.min(1,(time-at)/ENEMY_FADE_SECONDS));return 1-t*t*(3-2*t);
}
