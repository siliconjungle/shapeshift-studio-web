import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {ensureActorCombat} from './ecs/actor-combat.js';
import {actorPersonality} from './ecs/personality-actors.js';
import {personAge} from './ecs/person-age.js';
import {actorVitality,ensureActorVitality} from './ecs/actor-vitality.js';
import {actorNeeds,setActorNeeds} from './ecs/actor-needs.js';
import {survivalInterrupt,survivalDamage} from './village-survival.js';
import {raiderSpawn,raiderAlarm,raiderMove} from './village-raids.js';
import {defineGameData} from './game-data.js';
import {skillLevel} from './village-skills.js';
export const MIMIC_RULES=defineGameData('village-mimics.RULES',{chance:.16,maxAlive:2,health:84,revealSeconds:1.15,sight:7,leash:12,damage:14,windup:.8,cooldown:2.4});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function fearsMimic(w){
 const nerve=({blunt:.85,outgoing:.7,playful:.55,thoughtful:.5,gentle:.35,quiet:.25})[actorPersonality(w)?.trait]??.5;
 return !!personAge(w)?.child||actorVitality(w)?.health<38||actorNeeds(w).energy<25||nerve+skillLevel(w,'combat')*.12+(actorVitality(w)?.health-60)/150-actorNeeds(w).hunger/250<.58;
}
export function revealMimic(e,c,w){
 if(!e.raids||!c.mimic||c.openedAt!==null)return false;
 const r=raiderSpawn(e.raids,c);
 ensureActorCombat(r).style='sword';
 Object.assign(r,{kind:'mimic',culture:e.culture,state:'revealing',revealedAt:e.time,chestId:c.id,origin:{x:c.x,z:c.z},entrance:{x:c.x,z:c.z},attackAt:e.time+MIMIC_RULES.revealSeconds,windup:0,intent:'hunt',name:'Mimic'});
 Object.assign(ensureActorVitality(r),{health:MIMIC_RULES.health,maxHealth:MIMIC_RULES.health});setActorNeeds(r,{hunger:0,energy:100,social:50});
 c.openedAt=e.time;c.reservedBy=null;c.mimicId=r.id;
 survivalInterrupt(e.survival,w);raiderAlarm(e.raids,r);
 for(const p of e.workers.filter(p=>!actorVitality(p)?.dead&&distance(p,r)<MIMIC_RULES.sight)){
  if(fearsMimic(p))p.mimicFearUntil=e.time+12;
  e.emit('mimic-revealed',p,null,{raiderId:r.id,reaction:'surprise'});
 }
 return r;
}
export function updateMimic(raids,r,dt){
 const e=raids.economy;
 if(r.divineHeld||actorVitality(r)?.dead||r.gone)return;
 if(e.time-r.revealedAt<MIMIC_RULES.revealSeconds){r.state='revealing';return;}
 const victim=[...e.workers,...(e.beasts?.actors??[])].filter(w=>!actorVitality(w)?.dead&&!w.gone&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(w,r)<MIMIC_RULES.sight&&distance(w,r.origin)<MIMIC_RULES.leash).sort((a,b)=>distance(a,r)-distance(b,r))[0];
 if(!victim){r.state='lurking';r.windup=0;r.route=[];r.victimId=null;return;}
 raiderAlarm(raids,r);r.victimId=victim.id;r.facing=victim.x<r.x?'left':'right';
 if(distance(r,victim)>1.6){r.state='pursuing';r.windup=0;const a=Math.atan2(r.z-victim.z,r.x-victim.x);raiderMove(raids,r,{x:victim.x+Math.cos(a)*1.2,z:victim.z+Math.sin(a)*1.2},dt);return;}
 r.state='attacking';r.route=[];
 if(e.time<r.attackAt)return;
 r.windup+=dt;
 if(r.windup>=MIMIC_RULES.windup){
  survivalDamage(e.survival,victim,MIMIC_RULES.damage,'attack',r);
  r.hitAt=e.time;r.windup=0;r.attackAt=e.time+MIMIC_RULES.cooldown;
  e.emit('mimic-bite',null,null,{raiderId:r.id,victimId:victim.id});
 }
}
export function validMimics(e){
 return (e.discovery?.chests??[]).every(c=>c.mimic===undefined||typeof c.mimic==='boolean')&&(e.raids?.enemies??[]).filter(r=>r.kind==='mimic').every(r=>['hearth','solis','cryos'].includes(r.culture)&&typeof r.chestId==='string'&&[r.revealedAt,r.origin?.x,r.origin?.z,r.windup].every(Number.isFinite)&&r.windup>=0&&r.revealedAt>=0);
}
