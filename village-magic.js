import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {releaseWork} from "./village-resources.js";
import {resourceGrowth} from "./ecs/resource-state.js";
import {actorSocialActivity} from "./ecs/daily-activity-actors.js";
import {actorFaith} from "./ecs/religion-actors.js";
import {actorAmbitions} from "./ecs/development-actors.js";
import {actorOccasion} from "./ecs/actor-occasion.js";
import {discoveryClear,discoveryCapable} from './village-discovery.js';
import {actorRomance} from './ecs/actor-romance.js';
import {actorFeelings} from './ecs/actor-feelings.js';
import {personAge} from './ecs/person-age.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {careParticipant} from './ecs/care-participants.js';
import {supportParticipant} from './ecs/support-participants.js';
import {lifeRelation} from './village-life.js';
import {SKILL_WISHES} from './skill-wishes.js';
import {skillLevel,gainSkill} from './village-skills.js';
import {wishState,wishTarget,castMageWish,wishActor} from './god-wishes.js';
import {visibleAt} from './village-exploration.js';
import {homePosition,homeFire} from './village-shelter.js';
import {allShelters} from './camp-rules.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';
import {TRANSITIONS} from './animation-transitions.js';

export const MAGIC_RULES=Object.freeze({firstAt:DAY_LENGTH_SECONDS*5,spawnEvery:180,spawnChance:.35,maxWild:3,crystalsPerFind:3,range:3,get castSeconds(){return TRANSITIONS.cast},cooldown:35,xpPerCast:20});
export const MAGE_UNLOCKS=Object.freeze([
 ['energy','life','food'],['wood','stone','friendship'],['love','shield','repair'],['rain','hot','cold','clear-skies','newcomer'],['heartbreak','sleep','fire',...Object.keys(SKILL_WISHES)],['resurrect','uprising','violence']
]);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const available=w=>w&&!(actorVitality(w)?.dead)&&!(personAge(w)?.child)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!w.exiled&&!w.expeditionId&&!w.rivalJourney&&!w.ritualId&&!w.frenzy;
export const mageSpells=w=>w?.mage?MAGE_UNLOCKS.slice(0,skillLevel(w,'magic')+1).flat():[];
export function magicState(e){return e.magic??={nextAt:MAGIC_RULES.firstAt,nextId:0,crystals:[],discovered:0};}
export function dealMageDeck(e,w){
 if(!w.mage)return;const cards=mageSpells(w);
 for(let i=cards.length-1;i>0;i--){const j=Math.floor(e.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}
 w.mage.deck=cards.slice(0,3);w.mage.drawAt=e.time+25;
}
export function awakenMage(e,w,crystal){
 if(!available(w)||!crystal||!e.magic?.crystals.includes(crystal)||crystal.claimedAt!==null||distance(w,crystal)>2||!visibleAt(e,crystal.x,crystal.z))return false;
 crystal.claimedAt=e.time;crystal.reservedBy=null;magicState(e).discovered++;
 e.stock.crystal=(e.stock.crystal??0)+MAGIC_RULES.crystalsPerFind;
 if(!w.mage){w.mage={awakenedAt:e.time,casts:0,deck:[],nextAt:e.time+5,drawAt:e.time,history:[]};dealMageDeck(e,w);wishState(e);e.emit('mage-awakened',w,null,{x:w.x,z:w.z});}
 e.emit('crystal-discovered',w,null,{amount:MAGIC_RULES.crystalsPerFind,x:crystal.x,z:crystal.z});return true;
}
export function spawnCrystal(e){
 const s=magicState(e),d=e.discovery,b=d?.bounds;
 if(!b||e.time<MAGIC_RULES.firstAt||s.crystals.filter(c=>c.claimedAt===null).length>=MAGIC_RULES.maxWild)return null;
 for(let i=0;i<50;i++){
  const p={x:b.left+2+e.random()*(b.right-b.left-4),z:b.back+2+e.random()*(b.front-b.back-4)};
  if(visibleAt(e,p.x,p.z)||!discoveryClear(d,p)||s.crystals.some(c=>distance(c,p)<9))continue;
  if(!e.route(e.depot,{x:p.x,z:p.z+1.2}))continue;
  const c={id:'crystal-'+s.nextId++,...p,createdAt:e.time,seenAt:null,claimedAt:null,reservedBy:null,retryAt:0};s.crystals.push(c);return c;
 }return null;
}
export function updateMagic(e){
 if(!e.discovery||!e.exploration)return;
 const s=magicState(e);e.stock.crystal??=0;
 if(e.time>=s.nextAt){if(s.nextId===0||e.random()<MAGIC_RULES.spawnChance)spawnCrystal(e);s.nextAt=e.time+MAGIC_RULES.spawnEvery;}
 s.crystals=s.crystals.filter(c=>c.claimedAt===null||e.time-c.claimedAt<2);
 for(const c of s.crystals){if(c.seenAt===null&&visibleAt(e,c.x,c.z)){c.seenAt=e.time;e.emit('crystal-sighted',null,null,{x:c.x,z:c.z});}if(c.reservedBy!==null){const w=e.workers.find(w=>w.id===c.reservedBy);if(!available(w)||w.magicIntent?.crystalId!==c.id||!w.state.startsWith('magic-')){c.reservedBy=null;c.retryAt=e.time+5;}}}
 for(const w of e.workers)if(w.magicIntent&&(!available(w)||!w.state.startsWith('magic-')))cancelMagic(e,w);
}
export function magicTargetPoint(e,target){
 if(target.partnerId!=null)return e.workers.find(w=>w.id===target.partnerId);
 if(target.kind==='house'){const h=allShelters(e).find(h=>h.id===target.id);return h&&homePosition(h);}
 if(target.kind==='grave')return e.survival?.memorials.find(m=>m.id===target.id);
 return wishActor(e,target)??e.nodes.find(n=>n.id===target.id)??target;
}
// Intent scores describe this person's motives. They never look at the player's cards.
export function mageWishOptions(e,w){
 if(!w.mage)return [];const out=[],self={kind:'villager',id:w.id},living=e.workers.filter(p=>!(actorVitality(p)?.dead)),count=living.length;
 const add=(kind,target,score,reason)=>{if(!w.mage.deck.includes(kind)||score<=0)return;const p=magicTargetPoint(e,target);if(!p||!Number.isFinite(p.x)||distance(w,p)>18||!visibleAt(e,p.x,p.z))return;const check=wishTarget(e,kind,target,{autonomous:true,planning:true});if(check.valid)out.push({kind,target,score:score-distance(w,p)*.8,reason});};
 if((actorAmbitions(w)?.current)?.kind==='mastery'&&(actorAmbitions(w)?.current).skill!=='magic')add('upgrade-'+(actorAmbitions(w)?.current).skill,self,55,'I want to master my craft.');
 add('newcomer',self,actorNeeds(w).social<30&&(actorRomance(w)?.sweetheartId)==null?58:0,'I wish I had someone to share this place with.');
 add('clear-skies',self,(e.wishDrawContext?.rain??0)>.25&&(actorNeeds(w).temperature??50)<32?60:0,'Let the rain pass so we can warm ourselves.');
 add('energy',self,actorNeeds(w).energy<48?80-actorNeeds(w).energy:0,'I need strength to finish what I started.');
 add('food',{kind:'ground',x:w.store.x,z:w.store.z},e.stock.food<count*2?65:0,'We need something to eat.');
 add('wood',{kind:'ground',x:w.store.x,z:w.store.z},e.stock.wood<4&&((actorAmbitions(w)?.current)?.skill==='building'||(actorResidence(w)?.homeless)||actorNeeds(w).temperature<35)?55:0,'We need timber for shelter and warmth.');
 add('stone',{kind:'ground',x:w.store.x,z:w.store.z},e.stock.stone<3&&(actorAmbitions(w)?.current)?.skill==='building'?45:0,'Stone would help us build.');
 for(const p of living.filter(p=>!(actorInterior(p)?.inside)&&!p.divineHeld)){
  const relation=p===w?null:lifeRelation(e.life,w.id,p.id),friend=p===w||(actorRomance(w)?.sweetheartId)===p.id||(relation?.affinity??0)>.25;
  if(friend)add('life',{kind:'villager',id:p.id},(actorVitality(p)?.health)<75?110-(actorVitality(p)?.health):0,p===w?'I want to be well again.':'I want them to recover.');
  if(friend&&e.raids?.alarmUntil>e.time)add('shield',{kind:'villager',id:p.id},(p.shieldUntil??0)<=e.time?90:0,'Keep us safe.');
  if(p!==w&&(actorAmbitions(w)?.current)?.kind==='reconcile'&&(actorAmbitions(w)?.current).targetId===p.id)add('friendship',{...self,partnerId:p.id},60,'I want us to be friends again.');
  const crush=(actorFeelings(w)?.crush)?.targetId===p.id&&!(actorFeelings(w)?.crush).reciprocal;
  if(p!==w&&!(personAge(p)?.child)&&(actorRomance(w)?.sweetheartId)!==p.id&&(crush||relation&&((relation.a===w.id?relation.attractionAB:relation.attractionBA)??0)>.65)){
   add('love',{kind:'villager',id:w.id,partnerId:p.id},crush?78:62,'I wish they loved me back.');
   if((actorRomance(p)?.sweetheartId)!=null&&(actorRomance(p)?.sweetheartId)!==w.id)add('heartbreak',{kind:'villager',id:p.id},crush?72:48,'I wish they would leave their partner.');
  }
  if(friend&&p!==w)add('sleep',{kind:'villager',id:p.id},actorNeeds(p).energy<25?65:0,'They need some rest.');
 }
 for(const n of e.nodes.filter(n=>n.kind==='food'&&resourceGrowth(n)?.state==='growing'))add('life',{kind:'crop',id:n.id},e.stock.food<count*2?58:0,'Let the harvest come sooner.');
 for(const h of allShelters(e).filter(h=>!(structuralCondition(h)?.destroyed))){
  add('repair',{kind:'house',id:h.id},(structuralCondition(h)?.health)<(structuralCondition(h)?.maxHealth)*.65?80:0,'Our home needs mending.');
  if(homeFire(e,h))add('rain',{kind:'ground',...homePosition(h)},100,'Put out that fire!');
 }
 add('hot',self,(actorNeeds(w).temperature??50)<28?75:0,'I am so cold.');
 add('cold',self,(actorNeeds(w).temperature??50)>75?75:0,'I need to cool down.');
 for(const m of e.survival?.memorials??[]){const lost=e.workers.find(p=>p.id===m.workerId),r=lost&&lifeRelation(e.life,w.id,lost.id);if(lost&&((actorRomance(w)?.sweetheartId)===lost.id||w.grievingForId===lost.id||(r?.affinity??0)>.6))add('resurrect',{kind:'grave',id:m.id},95,'I want them back.');}
 for(const r of e.raids?.enemies??[]){if(!(actorVitality(r)?.dead)){add('fire',{kind:'raider',id:r.id},85,'Drive them away.');add('violence',{kind:'villager',id:w.id},e.raids.alarmUntil>e.time?70:0,'I will fight for my home.');}}
 if(((actorFaith(w)?.belief)?.resentment??0)>.65||w.leaderAmbition>.7)add('uprising',self,62,'It is time for a different leader.');
 return out.sort((a,b)=>b.score-a.score);
}
export function cancelMagic(e,w){
 const intent=w.magicIntent,c=e.magic?.crystals.find(c=>c.id===intent?.crystalId);if(c?.reservedBy===w.id)c.reservedBy=null;
 delete w.magicIntent;if(w.state.startsWith('magic-'))releaseWork(e,w);if(w.mage)w.mage.nextAt=e.time+6;
}
function approach(e,w,p){
 if(distance(w,p)<=MAGIC_RULES.range-.35)return true;
 for(let i=0;i<8;i++){const a=Math.atan2(w.z-p.z,w.x-p.x)+i*Math.PI/4,q={x:p.x+Math.cos(a)*2,z:p.z+Math.sin(a)*2},route=e.route(w,q);if(route){w.route=route;return true;}}
 return false;
}
export function handleMagic(e,w,dt){
 if(!e.life||!actorNeeds(w))return false;
 const active=w.state.startsWith('magic-');
 if(!available(w)||w.cargo||actorNeeds(w).hunger>78||actorNeeds(w).energy<14){if(active)cancelMagic(e,w);return false;}
 if(!active){
  if(w.state!=='idle'||w.wait>0||actorSocialActivity(w)?.partnerId!=null||careParticipant(w)?.partnerId!=null||supportParticipant(w)?.partnerId!=null||(actorOccasion(w)?.id)!=null)return false;
  if((w.magicAfter??0)>e.time)return false;w.magicAfter=e.time+5;
  const c=e.magic?.crystals.filter(c=>c.claimedAt===null&&c.seenAt!==null&&c.reservedBy===null&&c.retryAt<=e.time).sort((a,b)=>distance(a,w)-distance(b,w))[0];
  if(c&&discoveryCapable(e.discovery,w)&&distance(w,c)<20){const route=e.route(w,{x:c.x,z:c.z+1.2});if(route){releaseWork(e,w);c.reservedBy=w.id;w.magicIntent={crystalId:c.id,deadline:e.time+60};w.state='magic-discovering';w.route=route;return true;}c.retryAt=e.time+20;}
  if(!w.mage||e.stock.crystal<1||e.time<w.mage.nextAt)return false;
  if(e.time>=w.mage.drawAt)dealMageDeck(e,w);
  const choice=mageWishOptions(e,w)[0];if(!choice)return false;
  const point=magicTargetPoint(e,choice.target);releaseWork(e,w);
  if(!approach(e,w,point))return false;
  w.magicIntent={...choice,deadline:e.time+35,repathAt:e.time+1};w.state='magic-approaching';return true;
 }
 const a=w.magicIntent;if(!a||e.time>a.deadline){cancelMagic(e,w);return false;}
 if(a.crystalId){const c=e.magic.crystals.find(c=>c.id===a.crystalId);if(!c||c.claimedAt!==null||c.reservedBy!==w.id){cancelMagic(e,w);return false;}
  if(w.state==='magic-attuning'){if(e.time-a.startedAt>=2){awakenMage(e,w,c);cancelMagic(e,w);}return true;}
  const move=e.move(w,dt);if(move==='blocked')cancelMagic(e,w);else if(move==='arrived'){a.startedAt=e.time;w.state='magic-attuning';}return true;
 }
 const p=magicTargetPoint(e,a.target);if(!p||!wishTarget(e,a.kind,a.target,{autonomous:true,planning:true}).valid||!w.mage.deck.includes(a.kind)||e.stock.crystal<1){cancelMagic(e,w);return false;}
 if(distance(w,p)>MAGIC_RULES.range){
  if(w.state==='magic-casting'){cancelMagic(e,w);return false;}
  if(e.time>=a.repathAt){a.repathAt=e.time+1;if(!approach(e,w,p)){cancelMagic(e,w);return false;}}
  if(e.move(w,dt)==='blocked')cancelMagic(e,w);return true;
 }
 w.route=[];w.facing=p.x<w.x?'left':'right';
 if(w.state!=='magic-casting'){w.state='magic-casting';a.startedAt=e.time;e.emit('mage-cast-start',w,null,{wish:a.kind});}
 if(e.time-a.startedAt<MAGIC_RULES.castSeconds)return true;
 const result=castMageWish(e,w,a.kind,a.target);
 if(result.valid){gainSkill(e,w,'magic',MAGIC_RULES.xpPerCast);w.mage.history=[{kind:a.kind,target:{...a.target},reason:a.reason,at:e.time},...w.mage.history].slice(0,8);e.emit('mage-cast',w,null,{wish:a.kind});dealMageDeck(e,w);}
 cancelMagic(e,w);w.mage.nextAt=e.time+(result.valid?MAGIC_RULES.cooldown:6);return true;
}
export function validMagic(e){
 const number=n=>Number.isFinite(n)&&n>=0;
 if(e.stock.crystal!==undefined&&(!Number.isInteger(e.stock.crystal)||e.stock.crystal<0))return false;
 if(e.workers.some(w=>{const a=w.magicIntent;if(!a)return false;return !number(a.deadline)||(a.crystalId?typeof a.crystalId!=='string':!w.mage||!mageSpells(w).includes(a.kind)||!a.target||typeof a.target!=='object'||!number(a.repathAt))||(a.startedAt!==undefined&&!number(a.startedAt));}))return false;
 if(e.magic&&(!number(e.magic.nextAt)||!Number.isInteger(e.magic.nextId)||!Number.isInteger(e.magic.discovered)||!Array.isArray(e.magic.crystals)||e.magic.crystals.length>6||e.magic.crystals.some(c=>typeof c.id!=='string'||!Number.isFinite(c.x)||!Number.isFinite(c.z)||!number(c.createdAt)||!number(c.retryAt)||c.claimedAt!==null&&!number(c.claimedAt)||c.seenAt!==null&&!number(c.seenAt)||c.reservedBy!==null&&!Number.isInteger(c.reservedBy))))return false;
 return e.workers.every(w=>!w.mage||(number(w.mage.awakenedAt)&&Number.isInteger(w.mage.casts)&&w.mage.casts>=0&&number(w.mage.nextAt)&&number(w.mage.drawAt)&&Array.isArray(w.mage.deck)&&w.mage.deck.length===3&&new Set(w.mage.deck).size===3&&w.mage.deck.every(k=>mageSpells(w).includes(k))&&Array.isArray(w.mage.history)&&w.mage.history.length<=8));
}
