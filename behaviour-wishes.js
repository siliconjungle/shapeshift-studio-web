import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {rivalPeople} from './rival-roster.js';
import {damageEnemy} from './village-enemies.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {survivalInterrupt,survivalDamage} from './village-survival.js';
import {memoryRemember} from './village-memory.js';
import {lifeRelation} from './village-life.js';
import {defineGameData} from './game-data.js';
import {visiblePeople} from './village-people.js';
import {sleepingHome} from './village-shelter.js';
import {skillRate} from './village-skills.js';

export const BEHAVIOUR_WISH_RULES=defineGameData('behaviour-wishes.RULES',{frenzySeconds:20,frenzySpeed:1.65,damage:12,sleepJourneySeconds:90,sleepMinSeconds:12,sleepMaxSeconds:30});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const outside=w=>w&&!(actorVitality(w)?.dead)&&!w.gone&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.flight&&!['held','ritual-bound','rival-captive','emerging','fading','departing'].includes(w.state);
export function frenzyCandidates(e,w){
 return [...visiblePeople(e),...(e.beasts?.actors??[]),...(e.raids?.enemies??[]),...(e.slimes?.enemies??[])].filter(p=>p!==w&&outside(p)&&((actorVitality(p)?.health)??100)>0).sort((a,b)=>distance(w,a)-distance(w,b)||String(a.id).localeCompare(String(b.id)));
}
const kindOf=(e,p)=>e.workers.includes(p)?'villager':rivalPeople(e).includes(p)?'outsider':p.species==='beast'?'beast':p.species==='slime'?'slime':'raider';
export function frenzyEnemy(e,w){return frenzyCandidates(e,w).find(p=>p.id===w.combatTarget&&kindOf(e,p)===w.combatKind);}
export function behaviourWishTarget(e,kind,target){
 const actor=target?.kind==='villager'&&e.workers.find(w=>w.id===target.id);
 if(!outside(actor)||actor.expeditionId||actor.exiled)return {valid:false,reason:'Choose a living villager outdoors'};
 if(kind==='violence')return frenzyCandidates(e,actor).length?{valid:true,actor,label:'Send '+actor.name+' into a frenzy'}:{valid:false,reason:'There is nobody nearby to attack'};
 const home=sleepingHome(e,actor),route=home&&e.route(actor,home);
 return home&&route?{valid:true,actor,home,route,label:'Send '+actor.name+' to bed'}:{valid:false,reason:'This villager needs a safe, reachable bed'};
}
export function castBehaviourWish(e,kind,check){
 const w=check.actor;
 if(e.leadership?.revolt?.instigatorId===w.id)e.leadership.endRevolt();
 survivalInterrupt(e.survival,w);delete w.sleepWish;delete w.frenzy;
 if(kind==='violence'){w.frenzy={until:e.time+BEHAVIOUR_WISH_RULES.frenzySeconds,repathAt:0};e.emit('wish-violence',w);}
 else{w.sleepWish={until:e.time+BEHAVIOUR_WISH_RULES.sleepJourneySeconds,sleptAt:null};w.route=check.route;w.state='homebound';e.emit('wish-sleep',w);}
}
export function handleFrenzy(e,w,dt){
 const f=w.frenzy;if(!f)return false;
 if(!outside(w)||f.until<=e.time){delete w.frenzy;if(!(actorVitality(w)?.dead)&&!w.divineHeld&&['defending','defense-bound'].includes(w.state))survivalInterrupt(e.survival,w);return false;}
 // Re-evaluate the nearest person at each short pursuit step; keep a committed
 // swing coherent instead of flickering between equally close neighbours.
 let target=frenzyEnemy(e,w);
 if(w.state!=='defending'||!target){target=frenzyCandidates(e,w)[0];}
 if(!target){w.state='idle';w.route=[];w.combatTarget=null;w.combatKind=null;return true;}
 if(target.id!==w.combatTarget||kindOf(e,target)!==w.combatKind)f.repathAt=0;
 w.combatTarget=target.id;w.combatKind=kindOf(e,target);
 if(distance(w,target)<=1.6){
  if(w.state!=='defending'||w.clock.kind!=='fight'){w.state='defending';w.route=[];w.clock.reset('fight');}
  w.facing=target.x<w.x?'left':'right';
  for(const event of w.clock.advance(dt*BEHAVIOUR_WISH_RULES.frenzySpeed*skillRate(w,'combat'))){
   if(event==='contact'&&outside(target)&&distance(w,target)<=1.8){
    const amount=BEHAVIOUR_WISH_RULES.damage;
    if(['villager','outsider','beast'].includes(w.combatKind))survivalDamage(e.survival,target,amount,'attack',w);
    else damageEnemy(e,w.combatKind,target,amount,w);
    e.emit('frenzy-hit',w,null,{targetId:target.id,targetKind:w.combatKind});
    if(e.workers.includes(target)){const r=lifeRelation(e.life,w.id,target.id);if(r)r.affinity=Math.max(-1,r.affinity-.08);memoryRemember(e.life.memory,target,w,'attacked-me');}
   }
   if(event==='finish'){w.clock.reset('fight');w.state='defense-bound';}
  }
 }else{
  w.state='defense-bound';if(e.time>=f.repathAt){f.repathAt=e.time+.6;const angle=Math.atan2(w.z-target.z,w.x-target.x);w.route=e.route(w,{x:target.x+Math.cos(angle)*1.15,z:target.z+Math.sin(angle)*1.15})??[];}
  if(w.route.length&&e.move(w,dt)==='blocked')w.route=[];
 }
 return true;
}
export function frenzyThreat(e,w){
 let nearest,range=8;
 for(const p of e.workers){
  if(p===w||!(p.frenzy?.until>e.time)||p.combatKind!=='villager'||p.combatTarget!==w.id||!outside(p))continue;
  const d=distance(p,w);if(d<range){nearest=p;range=d;}
 }
 return nearest;
}
export function forcedSleep(e,w){
 const s=w.sleepWish;if(!s)return false;
 if(s.until<=e.time||(actorVitality(w)?.dead)||w.divineHeld||!['homebound','sleeping'].includes(w.state)||!sleepingHome(e,w)||actorNeeds(w).hunger>=90){delete w.sleepWish;return false;}
 if(w.state==='sleeping'){s.sleptAt??=e.time;const elapsed=e.time-s.sleptAt;if(elapsed>=BEHAVIOUR_WISH_RULES.sleepMaxSeconds||elapsed>=BEHAVIOUR_WISH_RULES.sleepMinSeconds&&actorNeeds(w).energy>=95){delete w.sleepWish;return false;}}
 return true;
}
export function validBehaviourWishes(w){return (!w.frenzy||[w.frenzy.until,w.frenzy.repathAt].every(n=>Number.isFinite(n)&&n>=0))&&(!w.sleepWish||Number.isFinite(w.sleepWish.until)&&w.sleepWish.until>=0&&(w.sleepWish.sleptAt===null||Number.isFinite(w.sleepWish.sleptAt)&&w.sleepWish.sleptAt>=0));}
