import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {resourceCondition} from "./ecs/resource-state.js";
import {resourceGrowth} from "./ecs/resource-state.js";
import {faithAfterWish} from "./village-faith.js";
import {beastsReinforce} from "./village-beasts.js";
import {beastLearning} from "./ecs/beast-learning.js";
import {actorNeeds} from "./ecs/actor-needs.js";
import {faithBeforeWish} from "./village-faith.js";
import {personAge} from "./ecs/person-age.js";
import {actorVitality} from "./ecs/actor-vitality.js";
import {villageActor} from './gameplay-effects/village-targets.js';
import {castVillageAbility,previewVillageAbility,updateVillageEffects,endVillageBurn,importLegacyBurns} from './gameplay-effects/village-runtime.js';
import {miracleTarget} from './gameplay-effects/village-miracle-targets.js';
import {noteVisitorMiracle} from './village-diplomacy.js';
import {noticeBeastMiracle} from './beast-emotions.js';
import {SKILL_WISHES,migrateSkillCards} from './skill-wishes.js';
import {WISHES} from './wish-catalog.js';
export {WISHES} from './wish-catalog.js';
import {knowsWish,STARTER_HAND} from './god-belief.js';
import {beastAvailable} from './beast-miracles.js';
import {drawUsefulWish} from './wish-draw.js';
import {homePosition} from './village-shelter.js';
import {WISH_COOLDOWN_SECONDS,wishCooldown} from './wish-cooldown.js';
import {WISH_RULES} from './wish-rules.js';
export {WISH_RULES} from './wish-rules.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.gone;
function shuffled(e){const cards=Array.from({length:3},()=>Object.keys(WISHES).filter(id=>knowsWish(e,id))).flat();for(let i=cards.length-1;i>0;i--){const j=Math.floor(e.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}return cards}
// Only plain serializable records are saved. Controllers, DOM and meshes never
// enter the village graph; a restored village uses these same commands.
export function wishState(e){
 syncRelicOffers(e);
 migrateSkillCards(e);
 if(e.belief&&!e.belief.known.includes('curse'))e.belief.known.push('curse');
 const s=e.wishes??=({queue:e.belief?[...STARTER_HAND]:['love','life','fire'],draw:shuffled(e),used:0,burns:[],scenery:[],rainUntil:0,pending:[]});s.casts??=[];
 if(s.deferredHand){s.queue=e.belief?[...STARTER_HAND]:['love','life','fire'];s.draw=shuffled(e);delete s.deferredHand}
 // Keep the click-to-swap reserve across draws and save reloads.
 s.reserve=WISHES[s.reserve]?s.reserve:null;
 if(s.queue.length>WISH_RULES.handSize)s.draw.unshift(...s.queue.splice(WISH_RULES.handSize));
 if((s.catalog??0)<2){for(const id of ['newcomer','heartbreak']){const i=s.draw.indexOf(id);if(i>=0)s.draw.splice(i,1);s.draw.push(id)}s.catalog=2}
 if((s.catalog??0)<3){const i=s.draw.indexOf('resurrect');if(i>=0)s.draw.splice(i,1);s.draw.push('resurrect');s.catalog=3}
 if((s.catalog??0)<4){for(const id of ['daybreak','nightfall','clear-skies','food']){const i=s.draw.indexOf(id);if(i>=0)s.draw.splice(i,1);s.draw.push(id)}s.catalog=4}
 if((s.catalog??0)<5){const i=s.draw.indexOf('energy');if(i>=0)s.draw.splice(i,1);s.draw.push('energy');s.catalog=5}
 if((s.catalog??0)<6){for(const id of ['shield','hand','friendship','enmity']){const i=s.draw.indexOf(id);if(i>=0)s.draw.splice(i,1);s.draw.push(id)}s.catalog=6}
 if((s.catalog??0)<7){const i=s.draw.indexOf('repair');if(i>=0)s.draw.splice(i,1);s.draw.push('repair');s.catalog=7}
 if((s.catalog??0)<8){for(const id of ['hot','cold']){const i=s.draw.indexOf(id);if(i>=0)s.draw.splice(i,1);s.draw.push(id)}s.catalog=8}
 if((s.catalog??0)<9){for(const id of ['wood','stone']){const i=s.draw.indexOf(id);if(i>=0)s.draw.splice(i,1);s.draw.push(id)}s.catalog=9}
 if((s.catalog??0)<10){for(const id of ['age-adult','age-child','age-elder'])if(!s.draw.includes(id))s.draw.push(id);s.catalog=10}
 if((s.catalog??0)<11){for(const id of ['ping','leave-here'])if(!s.draw.includes(id))s.draw.push(id);s.catalog=11}
 if((s.catalog??0)<12){for(const id of Object.keys(SKILL_WISHES))if(!s.draw.includes(id))s.draw.push(id);s.catalog=12}
 if((s.catalog??0)<13){for(const id of ['violence','sleep'])if(!s.draw.includes(id))s.draw.push(id);s.catalog=13}
 if((s.catalog??0)<14){if(!s.draw.includes('uprising'))s.draw.push('uprising');s.catalog=14}
 if((s.catalog??0)<15){for(const id of ['animal-bond','call-wild','dream'])if(!s.draw.includes(id))s.draw.push(id);s.catalog=15}
 if((s.catalog??0)<16){for(const id of ['rat','owl'])if(!s.draw.includes(id))s.draw.push(id);s.catalog=16}
 if(!s.curseUnlocked){if(!s.draw.includes('curse'))s.draw.push('curse');s.curseUnlocked=true;}
 if(!s.acornCatalog){if(e.culture==='hearth'){if(e.belief&&!e.belief.known.includes('acorn'))e.belief.known.push('acorn');if(!s.draw.includes('acorn'))s.draw.push('acorn');}s.acornCatalog=true;}
 if(e.belief){s.draw=s.draw.filter(id=>knowsWish(e,id));s.queue=s.queue.filter(id=>knowsWish(e,id));if(!knowsWish(e,s.reserve))s.reserve=null;}
 syncBeastCards(e,s);
 s.draw=s.draw.filter(id=>relicMiracleAvailable(e,id)&&(!WISHES[id]?.cultures||WISHES[id].cultures.includes(e.culture)));s.queue=s.queue.filter(id=>relicMiracleAvailable(e,id)&&(!WISHES[id]?.cultures||WISHES[id].cultures.includes(e.culture)));if(WISHES[s.reserve]?.cultures&&!WISHES[s.reserve].cultures.includes(e.culture))s.reserve=null;
 if(!relicMiracleAvailable(e,s.reserve))s.reserve=null;
 // Repair older saved hands while keeping their first copy of each card.
 const seen=new Set(s.reserve?[s.reserve]:[]);s.queue=s.queue.filter(id=>{if(!WISHES[id])return false;if(seen.has(id)){s.draw.unshift(id);return false}seen.add(id);return true});
 while(s.queue.length<WISH_RULES.handSize)s.queue.push(draw(e,s,s.queue));
 return s;
}
function draw(e,s,hand){return drawUsefulWish(e,s,hand,WISHES)}
export function syncBeastCards(e,s=e.wishes){
 if(!s)return;const available=beastAvailable(e);s.beastMiraclesUnlocked=available;
 if(available)return;
 s.draw=s.draw.filter(id=>!WISHES[id]?.beastOnly);
 if(WISHES[s.reserve]?.beastOnly)s.reserve=null;
 if(s.queue.some(id=>WISHES[id]?.beastOnly)){s.queue=s.queue.filter(id=>!WISHES[id]?.beastOnly);while(s.queue.length<WISH_RULES.handSize)s.queue.push(draw(e,s,s.queue));}
}


// Moving a card is a state command, not a cast: no effects, costs or cooldown.
export function reserveWish(e,index){
 if(!Number.isInteger(index)||index<0||index>=WISH_RULES.handSize)return {valid:false,reason:'Choose a spell from your hand.'};
 if(e.divine?.held)return {valid:false,reason:'Put down the character first.'};
 if(wishCooldown(e).remaining>0)return {valid:false,reason:'Spells are recharging.'};
 const s=wishState(e),kind=s.queue[index],previous=s.reserve;
 s.reserve=kind;
 s.queue[index]=previous??draw(e,s,s.queue);
 return {valid:true,kind,swapped:previous};
}
export const burnKey=b=>b.kind+':'+b.id;
export const wishActor=villageActor;
export {lovePair} from './gameplay-effects/village-miracle-targets.js';
export function wishTarget(e,kind,target,options={}){
 if(!options.autonomous&&e.belief&&!knowsWish(e,kind))return {valid:false,reason:'This miracle has not been learned yet.'};
 if(!options.autonomous&&e.faith?.offeringsEnabled&&e.faith.wishes<1)return {valid:false,reason:'Waiting for an offering at the shrine'};
 const check=miracleTarget(e,kind,target,options);if(!check.valid)return check;
 return previewVillageAbility(e,kind,target,options.source,check,options);
}
export function castWish(e,target,index=0){return executeWish(e,target,index)}
// NPCs share effects, never the player's hand, offerings, draw pile or cooldown.
export function castMageWish(e,w,kind,target){
 if(!w?.mage||(actorVitality(w)?.dead)||(personAge(w)?.child)||(actorInterior(w)?.inside)||w.divineHeld||!w.mage.deck.includes(kind)||(e.stock.crystal??0)<1)return {valid:false,reason:'Mage cannot cast'};
 const check=wishTarget(e,kind,target,{autonomous:true,source:{kind:'villager',id:w.id}});
 const points=check.pair??[check.actor??check.plant??(check.home?homePosition(check.home):null)??check.fire??check.point];
 if(!check.valid||points.some(p=>!p||distance(w,p)>3))return {valid:false,reason:'Out of casting range'};
 if(!e.wishes)wishState(e);
 return executeWish(e,target,null,{worker:w,kind,check});
}
function executeWish(e,target,index,magic=null){
 if(!magic&&e.divine?.held)return {valid:false,reason:'Put down the character first.'};
 const cooldown=magic?{remaining:0}:wishCooldown(e);if(cooldown.remaining>0)return {valid:false,reason:'Spells are recharging — '+Math.ceil(cooldown.remaining)+'s remaining.'};
 const s=magic?e.wishes: wishState(e),kind=magic?.kind??(index==='reserve'?s.reserve:Number.isInteger(index)?s.queue[index]:null),check=magic?.check??wishTarget(e,kind,target);if(!check.valid)return check;
 // Capture command events until the next simulation step, including a paused
 // render. Existing damage, family and feedback consumers receive them once.
 const faithContext=magic?null:faithBeforeWish(e.faith,kind,target,check);
 const beast=check.actor?.species==='beast'?check.actor:target?.kind==='beast'?wishActor(e,target):null,beastBefore=beast?{health:(actorVitality(beast)?.health),energy:actorNeeds(beast).energy,shield:beast.shieldUntil,trace:(beastLearning(beast)?.recentBehaviour)}:null;
 const previousEvents=e.events;e.events=[];
 try{
  const applied=castVillageAbility(e,kind,target,magic?{kind:'villager',id:magic.worker.id}:{kind:'god',id:'player'});
  if(!applied.valid){previousEvents.push(...e.events);return applied}
  check.outcomes=applied.outcomes;
  const spawned=applied.outcomes.find(o=>o.result?.spawned)?.result.spawned;
  if(spawned)check.spawned=villageActor(e,spawned);
  if(beast&&['life','energy','shield','food','fire'].includes(kind)){const meaningful=kind==='life'?beastBefore.health<(actorVitality(beast)?.maxHealth):kind==='energy'?beastBefore.energy<100:kind==='shield'?!(beastBefore.shield>e.time):kind==='fire'?!(beast.shieldUntil>e.time):actorNeeds(beast).hunger>58;beastsReinforce(e.beasts,beast,kind,{meaningful,trace:beastBefore.trace});}
  if(!magic)noteVisitorMiracle(e,kind,check);
  noticeBeastMiracle(e,kind,check);
  if(faithContext)faithAfterWish(e.faith,faithContext,check);
  const point=check.point??check.actor??check.plant??check.fire;
  s.casts.push({id:magic?'mage-'+magic.worker.id+'-'+magic.worker.mage.casts:s.used,autonomous:!!magic,kind,x:point.x,z:point.z,at:e.time,targets:check.beast?[{kind:'beast',id:check.beast.id}]:check.home?[{kind:'house',id:check.home.id}]:check.spawned?[{kind:'villager',id:check.spawned.id}]:check.pair?check.pair.map(w=>({kind:w.species==='beast'?'beast':'villager',id:w.id})):check.actor?[{kind:target.kind,id:target.id}]:[]});
  e.emit('wish-cast',null,null,{wish:kind,x:point.x,z:point.z,label:check.label});
  // Reserve casts leave the hand intact; hand casts redeal all three choices.
  if(magic){e.stock.crystal--;magic.worker.mage.casts++;previousEvents.push(...e.events);}
  else{
   if(index==='reserve')s.reserve=null;
   else{s.queue=[];while(s.queue.length<WISH_RULES.handSize)s.queue.push(draw(e,s,s.queue))}
   s.used++;s.cooldownUntil=e.time+WISH_COOLDOWN_SECONDS;s.pending.push(...e.events);
  }
 }finally{e.events=previousEvents}
 return {valid:true,kind,label:check.label,source:magic?'mage':index==='reserve'?'reserve':'hand'};
}
export function updateWishes(e,weather){
 const s=e.wishes;if(!s){updateVillageEffects(e);return}
 importLegacyBurns(e);
 if(s.rainUntil>e.time||(weather?.rain??0)>.25)for(const b of s.burns)if(b.until>e.time){
  endVillageBurn(e,b);b.until=e.time;b.regrowAt=e.time+(wishActor(e,b)?.6:WISH_RULES.regrowDelay);
  const node=['tree','crop'].includes(b.kind)&&e.nodes.find(n=>n.id===b.id);if(node){resourceCondition(node).burningUntil=e.time;if(resourceGrowth(node)?.readyAt!==null)resourceGrowth(node).readyAt=b.regrowAt}
 }
 for(const b of s.burns){
  const actor=wishActor(e,b);
  if(actor){
   b.x=actor.x;b.z=actor.z;
   if(!alive(actor)){b.until=Math.min(b.until,((actorVitality(actor)?.diedAt)??e.time)+1);b.regrowAt=b.until+.4;continue}

  }
  if(b.kind==='mushroom'&&e.time>=b.until){const m=e.ecology?.mushrooms.find(m=>m.id===b.id);if(m?.state==='burning'){m.state='dormant';m.growth=0;m.burningUntil=e.time}}
 }
 updateVillageEffects(e);
 s.casts=(s.casts??[]).filter(c=>e.time-c.at<4);
 // Tree growth already belongs to the resource simulation.
 s.burns=s.burns.filter(b=>e.time<b.regrowAt);
}
import {relicMiracleAvailable,syncRelicOffers} from './relic-miracle-state.js';
