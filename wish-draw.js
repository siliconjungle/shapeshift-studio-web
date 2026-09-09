import {hasOakRoom,waitingAcorn} from './village-acorns.js';
import {poisoned} from './village-poison.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {structuralCondition} from './ecs/home-entities.js';
import {resourceCondition} from "./ecs/resource-state.js";
import {resourceCultivation} from "./ecs/resource-state.js";
import {resourceGrowth} from "./ecs/resource-state.js";
import {lifeClock} from "./ecs/life-state.js";
import {familyBirthPlan} from "./ecs/family-entities.js";
import {owlTrees,RAT_OWL_RULES} from './village-rats-owls.js';
import {animalSpatial,animalLifecycle} from './ecs/animal-state.js';
import {beastLearning} from './ecs/beast-learning.js';
import {beastsLiving} from './village-beasts.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {actorRomance} from './ecs/actor-romance.js';
import {actorNeeds} from './ecs/actor-needs.js';
import {familyCapacity} from './village-family.js';

import {skillWishWeights} from './skill-wishes.js';
import {activePing} from './village-pings.js';
import {knowsWish,beliefDrawMultiplier} from './god-belief.js';
import {beastAvailable} from './beast-miracles.js';
import {activeTemperatureWish,villageAirTemperature} from './temperature-wish.js';
import {homeBeds,housingCapacity} from './village-childcare.js';
import {canFormAdultPair} from './village-romance.js';
import {memorialOpacity} from './village-memorials.js';
const alive=w=>w&&!(actorVitality(w)?.dead)&&!w.gone;
const peak=(list,value)=>Math.max(0,...list.map(value));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function observeWishWeather(e,weather){
 if(!weather)return;const c=e.wishDrawContext??={};
 c.cover=weather.cover??0;c.temperature=Number.isFinite(weather.temperature)?weather.temperature:null;
 c.rain=Math.max(0,weather.rain??0);c.wet=weather.mode==='rain'||weather.mode==='storm'||weather.phase==='rain'||weather.phase==='storm';
}
// Evaluated only when dealing. These are opportunities, not orders: playful
// interventions stay possible, while immediate needs receive stronger odds.
export function wishDrawWeights(e,s=e.wishes??{}){
 const living=e.workers.filter(alive),out=living.filter(w=>!(actorInterior(w)?.inside)&&!w.divineHeld),enemies=[...(e.raids?.enemies??[]),...(e.slimes?.enemies??[])].filter(w=>alive(w)&&!w.divineHeld&&!['fading','departing','fleeing'].includes(w.state)),actors=[...out,...enemies],homes=e.life?.homes??[];
 const commands=s.worldCommands??[],hour=commands.findLast(c=>c.kind==='daybreak'||c.kind==='nightfall')?.hour??lifeClock(e.life)?.hour??12,day=hour>=6&&hour<19;
 const clear=commands.some(c=>c.kind==='clear-skies'),weather=e.wishDrawContext;
 const wet=s.rainUntil>e.time||!clear&&((weather?.rain??e.campfire?.rain??0)>.02||weather?.wet);
 const fires=[...(s.burns??[]),...(e.shelter?.fires??[]),...(e.lightning?.fires??[])].some(f=>f.until>e.time);
 const damage=peak(homes.filter(h=>!(structuralCondition(h)?.destroyed)&&(structuralCondition(h)?.health)>0),h=>Math.max(0,1-(structuralCondition(h)?.health)/(structuralCondition(h)?.maxHealth)));
 const injury=peak(actors,w=>Math.max(0,1-((actorVitality(w)?.health)??100)/((actorVitality(w)?.maxHealth)??(enemies.includes(w)&&w.species!=='slime'?36:100))));
 const hunger=peak(out,w=>actorNeeds(w)?.hunger??0),fatigue=peak(out,w=>100-(actorNeeds(w)?.energy??100));
 const crop=e.nodes.some(n=>n.kind==='food'&&resourceGrowth(n)?.state==='growing'&&!resourceCultivation(n)?.needsPlanting&&Number.isFinite(resourceGrowth(n)?.readyAt)&&!(resourceCondition(n)?.burningUntil>e.time));
 const capacity=Math.min(familyCapacity(e)??Infinity,housingCapacity(homes)),space=living.length+((familyBirthPlan(e.family))?1:0)<capacity&&homes.some(h=>living.filter(w=>(actorResidence(w)?.home)?.id===h.id).length+((familyBirthPlan(e.family))?.home?.id===h.id?1:0)<homeBeds(h));
 const grave=space&&(e.survival?.memorials??[]).some(m=>living.every(w=>w.id!==m.workerId)&&e.workers.some(w=>w.id===m.workerId&&(actorVitality(w)?.dead))&&memorialOpacity(m,e.time)>0);
 const pairs=out.flatMap((a,i)=>out.slice(i+1).filter(b=>canFormAdultPair(a,b)).map(b=>[a,b]));
 const newLove=pairs.some(([a,b])=>(actorRomance(a)?.sweetheartId)!==b.id||(actorRomance(b)?.sweetheartId)!==a.id),near=pairs.some(([a,b])=>distance(a,b)<=6);
 const coupled=out.some(a=>(actorRomance(a)?.sweetheartId)!=null&&living.some(b=>b.id===(actorRomance(a)?.sweetheartId)&&(actorRomance(b)?.sweetheartId)===a.id&&!(personAge(b)?.child))&&!(personAge(a)?.child));
 const sociable=out.some((a,i)=>out.slice(i+1).some(b=>distance(a,b)<=6));
 const degrees=villageAirTemperature(e),shift=activeTemperatureWish(e);
 const beast=beastsLiving(e.beasts);
 return {
 acorn:e.culture==='hearth'&&hasOakRoom(e)&&e.nodes.filter(waitingAcorn).length<4?((e.stock.wood??0)<6?2:.55):0,
 rat:(e.ratsOwls?.rats.length??0)<RAT_OWL_RULES.maxRats?.65:0,
 owl:(e.ratsOwls?.owls.length??0)<RAT_OWL_RULES.maxOwls&&owlTrees(e,e.depot,{visible:true}).length?((e.ratsOwls?.rats.length??0)>0?1.5:.4):0,
 'animal-bond':[...(e.wildlife?.animals??[]),...(e.birds?.flock??[])].some(a=>!actorVitality(a).dead&&!animalLifecycle(a).gone&&out.some(w=>distance(w,animalSpatial(a))<7))?2:0,
 'call-wild':e.wildlife&&!(e.wildlife.call?.until>e.time)?1:0,
 dream:living.some(w=>w.state==='sleeping'&&!(personAge(w)?.child)&&!w.pendingDream&&(w.dreamAfter??0)<=e.time)?2:0,
  praise:beast?1.5:0,scold:beast?((beastLearning(beast)?.recentBehaviour)?.kind==='lash'?4:.5):0,'beast-feast':actorNeeds(beast)?.hunger>58?6:beast?.4:0,guard:beast?2:0,play:beast&&out.length?1.5:0,rampage:beast?(enemies.length?3:.5):0,lullaby:beast?(actorNeeds(beast).energy<40?4:.5):0,
  'age-adult':out.some(w=>(personAge(w)?.child)||(personAge(w)?.elder))?2:.35,'age-child':out.length?.4:0,'age-elder':out.length?.5:0,
  wood:(e.stock.wood??0)<4?6:(e.stock.wood??0)<12?2:.3,
  stone:(e.stock.stone??0)<4?5:(e.stock.stone??0)<8?2:.3,
  hot:shift==='hot'||degrees>=33?0:degrees<15?7:.5,
  cold:shift==='cold'||degrees<=5?0:degrees>=30?7:.5,
  rain:wet?0:fires?12:1,
  'clear-skies':wet?5:e.campfire?.wetUntil>e.time?2:0,
  daybreak:day?0:enemies.length?5:1.5,nightfall:day?1:0,
  repair:damage?2+damage*10:0,resurrect:grave?9:0,newcomer:space?(living.length<2?6:1.5):0,
  life:injury?2+injury*10:crop?4:out.length?.25:0,
  food:living.length?((e.stock.food??0)<living.length*2?1+hunger*.1:(e.stock.food??0)<living.length*4?1:.2):.2,
  uprising:e.leadership?.leader&&!e.leadership.revolt&&!e.leadership.rivalry&&out.some(w=>!(personAge(w)?.child)&&!e.leadership.isLeader(w))?.65+(e.leadership.unrest??0)*3:0,
  violence:out.length&&(out.length+enemies.length>1)?.65:0,
  sleep:out.some(w=>(actorResidence(w)?.hasBed)!==false&&(actorResidence(w)?.home)&&!(structuralCondition((actorResidence(w)?.home))?.destroyed))?(.4+fatigue*.06+out.some(w=>w.frenzy?.until>e.time)*5):0,
  energy:out.length?.3+fatigue*.065+(fatigue>=85?5:0):0,
  shield:actors.length?(enemies.length||fires?7:.5):0,
  love:pairs.length?(newLove?(near?2.5:1):.25):0,heartbreak:coupled?.65:0,
  poison:out.some(w=>!poisoned(w,e.time))?.45:0,
  purify:out.some(w=>poisoned(w,e.time))?12:0,
  friendship:sociable?1.5:0,enmity:sociable?.6:0,
  // Keep broad interventions in the pool even during brief empty/indoor
  // moments. This guarantees three choices without admitting blocked cards.
  ...skillWishWeights(e),
  ping:activePing(e)?.kind!=='ping'&&living.some(w=>!(personAge(w)?.child))?1.2:0,'leave-here':activePing(e)?.kind!=='leave-here'&&out.length?(enemies.length||fires?2:.7):0,
  fire:1,hand:actors.length?1:.15,skull:actors.length?(enemies.length?4:.45):.1,
 };
}
export function drawUsefulWish(e,s,hand,catalog){
 const weights=wishDrawWeights(e,s);for(const id of Object.keys(weights))weights[id]*=beliefDrawMultiplier(e,id);const eligible=id=>catalog[id]&&knowsWish(e,id)&&(!catalog[id].beastOnly||beastAvailable(e))&&id!==s.reserve&&!hand.includes(id)&&(weights[id]??.5)>0;
 let choices=[...new Set(s.draw.filter(eligible))];
 if(!hand.length||!choices.length){
  // Restore missing types for each new hand so urgent cards cannot be exhausted.
  // Top up missing types only. Permanently ineligible copies cannot build an
  // ever-growing pile when the same weather lasts for hundreds of draws.
  for(const id of Object.keys(catalog))if(knowsWish(e,id)&&(!catalog[id].beastOnly||beastAvailable(e))&&!s.draw.includes(id))s.draw.push(id);
  choices=[...new Set(s.draw.filter(eligible))];
 }
 if(!choices.length)throw Error('No distinct eligible wish remains');
 let roll=Math.max(0,Math.min(.999999999,e.random()))*choices.reduce((sum,id)=>sum+(weights[id]??.5),0),chosen=choices.at(-1);
 for(const id of choices){roll-=weights[id]??.5;if(roll<0){chosen=id;break}}
 s.draw.splice(s.draw.lastIndexOf(chosen),1);return chosen;
}
