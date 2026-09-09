import {actorInterior,ensureActorInterior} from './ecs/actor-interior.js';
import {settlementEconomy,settlementDevelopment} from './ecs/rival-entities.js';
import {ensureActorFeeding} from './ecs/actor-feeding.js';
import {beastsStoreRoute} from './village-beasts.js';
import {actorVitality,ensureActorVitality} from './ecs/actor-vitality.js';
import {survivalAlert,survivalDamage} from './village-survival.js';
import {personAge} from './ecs/person-age.js';
import {beastEntity} from './ecs/beast-entities.js';
import {actorNeeds} from './ecs/actor-needs.js';

import {curseFumbles} from './village-curse.js';
import {rivalSettlements,rivalPeople,rivalBeasts,rivalFor,withRival} from './rival-roster.js';
import {defineGameData} from './game-data.js';
import {ActionClock} from './action-timing.js';
import {initialiseBeastMind} from './beast-behaviour.js';
import {initialiseBeastOrigin} from './beast-origins.js';
import {findWalkPath,walkStep,canWalkAt} from './village-walking.js';
import {shieldBlocks} from './divine-interventions.js';
export const RIVAL_BEAST_RULES=defineGameData('rival-beast.RIVAL_BEAST_RULES',{earliest:600,development:2,raiseChance:.12,foodCost:24,woodCost:18,joinChance:.5,health:300,damage:24,retreatHealth:75,minEnergy:60,maxHunger:55,meal:6});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),alive=b=>b&&!(actorVitality(b)?.dead)&&!b.gone;
export const visitingRivalBeast=e=>e.rival?.beast?.visit&&!e.rival.beast.gone?e.rival.beast:null;
export const rivalCombatants=e=>[...rivalPeople(e),...rivalBeasts(e).filter(b=>b.visit&&!b.gone)];
export const isRivalBeast=(e,b)=>!!b&&rivalBeasts(e).includes(b);
const obstacles=e=>e.obstacles().map(o=>({...o,radius:o.radius+.43}));
function route(e,b,p){return findWalkPath(b,p,e.heightAt,obstacles(e));}
// The other tribe pays for and retains its own animal. It is not a resident,
// never takes one of our beast slots, and is never freshly spawned for a raid.
export function raiseRivalBeast(e){
 const s=e.rival,r=RIVAL_BEAST_RULES;if(!s||s.beast||e.time<r.earliest||settlementDevelopment(s).development<r.development||s.people.filter(w=>!(actorVitality(w)?.dead)&&!w.captive).length<3||settlementEconomy(s).stock.food<r.foodCost+s.people.filter(w=>!(actorVitality(w)?.dead)).length*2||settlementEconomy(s).stock.wood<r.woodCost)return null;
 settlementEconomy(s).stock.food-=r.foodCost;settlementEconomy(s).stock.wood-=r.woodCost;
 const b={id:'rival-beast-'+s.culture,species:'beast',tribeId:s.culture,culture:s.culture,awakeningKind:'steward',name:s.culture==='cryos'?'Flurry':s.culture==='solis'?'Ochre':'Bramble',x:0,z:0,health:r.health,maxHealth:r.health,dead:false,gone:true,state:'away',bornAt:e.time,needs:{hunger:10,energy:100,social:75},phase:0,clock:new ActionClock('fight'),facing:'front',route:[],vx:0,vz:0,memories:[{text:'Raised and cared for by my own tribe.',at:e.time}]};
 beastEntity(e,b);initialiseBeastOrigin(b,{newborn:true});initialiseBeastMind(b,e);s.beast=b;return b;
}
export function progressRivalBeast(e,seconds){
 const s=e.rival;if(!s)return;
 if(!s.beast){if(e.time>=RIVAL_BEAST_RULES.earliest&&e.random()<RIVAL_BEAST_RULES.raiseChance)raiseRivalBeast(e);return;}
 const b=s.beast;if((actorVitality(b)?.dead)||b.visit)return;
 actorNeeds(b).energy=Math.min(100,actorNeeds(b).energy+seconds*.4);actorNeeds(b).hunger=Math.min(100,actorNeeds(b).hunger+seconds*.08);
 if(actorNeeds(b).hunger>35&&settlementEconomy(s).stock.food>=RIVAL_BEAST_RULES.meal+s.people.filter(w=>!(actorVitality(w)?.dead)).length*2){settlementEconomy(s).stock.food-=RIVAL_BEAST_RULES.meal;actorNeeds(b).hunger=Math.max(0,actorNeeds(b).hunger-55);ensureActorFeeding(b).foodConsumed+=RIVAL_BEAST_RULES.meal;}
 if(actorNeeds(b).hunger<60)ensureActorVitality(b).health=Math.min((actorVitality(b)?.maxHealth),(actorVitality(b)?.health)+seconds*.15);
}
export function joinRivalRaid(e,party){
 const b=e.rival?.beast,r=RIVAL_BEAST_RULES;if(!b||(actorVitality(b)?.dead)||b.visit||b.divineHeld||(actorVitality(b)?.health)<(actorVitality(b)?.maxHealth)*.7||actorNeeds(b).energy<r.minEnergy||actorNeeds(b).hunger>r.maxHunger||!party.length||e.random()>=r.joinChance)return false;
 const gate=party[0].visit.gate;
 for(const [dx,dz] of [1.8,2.6,3.4,4.2].flatMap(r=>Array.from({length:12},(_,i)=>[Math.cos(i*Math.PI/6)*r,Math.sin(i*Math.PI/6)*r]))){
  const p={x:gate.x+dx,z:gate.z+dz};if(!canWalkAt(p.x,p.z,e.heightAt,obstacles(e)))continue;
  const path=((beastsState)=>beastsState==null?undefined:(beastsStoreRoute(beastsState,p)))(e.beasts)??route(e,p,e.depot);if(!path)continue;
  Object.assign(b,p,{gone:false,state:'rival-raiding',route:path,phase:0,arrivedAt:e.time,visit:{kind:'raid',stage:'arriving',gate:{...p},partyIds:party.map(w=>w.id),until:Math.max(...party.map(w=>w.visit.until)),repathAt:0,blockedSince:null}});
  e.emit('beast-reaction',null,null,{beastId:b.id,reaction:'determined',expression:'angry'});return true;
 }return false;
}
export function retreatRivalBeast(e,b){if(!b.visit)return;b.visit.stage='leaving';b.visit.leavingAt??=e.time;b.visit.repathAt=0;b.route=[];b.state='rival-leaving';b.targetId=null;b.targetKind=null;}
function move(e,b,p,dt){
 if(distance(b,p)<.15){b.vx=b.vz=0;return true;}
 if(e.time>=b.visit.repathAt){b.route=route(e,b,p)??[];b.visit.repathAt=e.time+2;}
 if(!b.route.length){b.visit.blockedSince??=e.time;return false;}
 const next=walkStep(b,b.route[0],dt*.85,e.heightAt,obstacles(e));b.vx=(next.x-b.x)/dt;b.vz=(next.z-b.z)/dt;b.x=next.x;b.z=next.z;
 if(Math.abs(b.vx)>.05)b.facing=b.vx<0?'left':'right';else if(Math.abs(b.vz)>.05)b.facing=b.vz<0?'back':'front';
 if(next.blocked){b.route=[];b.visit.blockedSince??=e.time;}else {b.visit.blockedSince=null;if(next.done)b.route.shift();}return distance(b,p)<.15;
}
export function updateRivalBeast(e,dt){
 const b=visitingRivalBeast(e);if(!b||!(dt>0))return;b.vx=b.vz=0;
 if((actorVitality(b)?.dead)){if(e.time-(actorVitality(b)?.diedAt)>=10){delete b.visit;b.gone=true;}return;}
 const v=b.visit;if(b.divineHeld){v.until+=dt;if(v.leavingAt!=null)v.leavingAt+=dt;return;}
 b.phase=(b.phase+dt*.35)%1;actorNeeds(b).energy=Math.max(0,actorNeeds(b).energy-dt*.15);actorNeeds(b).hunger=Math.min(100,actorNeeds(b).hunger+dt*.1);
 const party=e.rival.people.filter(w=>v.partyIds.includes(w.id)&&alive(w)&&!w.divineHeld&&w.ritualId==null&&w.visit?.kind==='raid'&&w.visit.stage!=='leaving');
 if(v.stage!=='leaving'&&(!party.length||(actorVitality(b)?.health)<=RIVAL_BEAST_RULES.retreatHealth||actorNeeds(b).energy<20||e.time>=v.until||v.blockedSince!=null&&e.time-v.blockedSince>8))retreatRivalBeast(e,b);
 if(v.stage==='leaving'){
  const arrived=move(e,b,v.gate,dt);if(arrived||e.time-v.leavingAt>65){b.state='departing';v.fadeAt??=e.time;if(e.time-v.fadeAt>=.7){delete b.visit;b.gone=true;b.state='away';b.route=[];}}return;
 }
 const leader=party.reduce((a,w)=>distance(b,w)<distance(b,a)?w:a),targets=[...e.workers,...(e.beasts?.actors??[])].filter(w=>alive(w)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&!(personAge(w)?.child)&&!w.rivalJourney&&distance(w,leader)<11).sort((a,c)=>distance(b,a)-distance(b,c)),target=targets[0];
 if(!target){b.state='rival-raiding';move(e,b,{x:leader.x-1.8,z:leader.z+.8},dt);return;}
 for(const w of e.workers)if(!(actorVitality(w)?.dead)&&!w.rivalJourney&&distance(b,w)<9)survivalAlert(e.survival,w);
 const kind=target.species==='beast'?'beast':'villager';if(b.targetId!==target.id||b.targetKind!==kind){b.targetId=target.id;b.targetKind=kind;b.state='rival-raiding';v.repathAt=0;}
 b.victimId=target.id;
 if(distance(b,target)>2.1){b.state='rival-raiding';const a=Math.atan2(b.z-target.z,b.x-target.x);move(e,b,{x:target.x+Math.cos(a)*1.8,z:target.z+Math.sin(a)*1.8},dt);return;}
 if(b.state!=='defending'){b.state='defending';b.route=[];b.clock.reset('fight');}
 b.facing=target.x<b.x?'left':'right';
 for(const event of b.clock.advance(dt)){
  if(event==='contact'&&alive(target)&&!(actorInterior(target)?.inside)&&!target.divineHeld&&distance(b,target)<=2.4)survivalDamage(e.survival,target,RIVAL_BEAST_RULES.damage,'attack',b);
  if(event==='finish')b.clock.reset('fight');
 }
}
export function damageRivalBeast(e,b,amount,cause='attack',source=null){
 if(amount>0&&curseFumbles(e,source,cause))return false;
 if(!isRivalBeast(e,b)||!b.visit||!alive(b)||!(amount>0)||shieldBlocks(e,b,cause))return false;
 const applied=Math.min((actorVitality(b)?.health),amount);ensureActorVitality(b).health-=applied;ensureActorVitality(b).hurtAt=ensureActorVitality(b).lastDamageAt=e.time;e.emit('beast-hurt',null,null,{beastId:b.id,amount:applied,cause});
 if(!(actorVitality(b)?.health)){(Object.assign(ensureActorVitality(b),{dead:true,diedAt:e.time,deathCause:cause}),Object.assign(b,{state:'dead',route:[],divineHeld:false}));if(e.divine?.held?.id===b.id)e.divine.held=null;e.emit('beast-died',null,null,{beastId:b.id});}
 else if((actorVitality(b)?.health)<=RIVAL_BEAST_RULES.retreatHealth)retreatRivalBeast(e,b);return true;
}
export function validRivalBeast(e){
 const b=e.rival?.beast;if(b==null)return true;const finite=n=>Number.isFinite(n)&&n>=0,point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z),v=b.visit;
 if(b.id!=='rival-beast-'+e.rival.culture||b.species!=='beast'||b.culture!==e.rival.culture||b.tribeId!==e.rival.culture||typeof b.name!=='string'||!point(b)||!finite((actorVitality(b)?.health))||(actorVitality(b)?.health)>(actorVitality(b)?.maxHealth)||(actorVitality(b)?.maxHealth)!==RIVAL_BEAST_RULES.health||typeof (actorVitality(b)?.dead)!=='boolean'||typeof b.gone!=='boolean'||!['away','rival-raiding','defending','rival-leaving','departing','dead','idle','held'].includes(b.state)||![b.phase,actorNeeds(b)?.hunger,actorNeeds(b)?.energy,actorNeeds(b)?.social].every(finite)||!(b.clock instanceof ActionClock)||!Array.isArray(b.route)||!b.route.every(point))return false;
 return !v||finite(b.arrivedAt)&&(!(actorVitality(b)?.dead)||finite((actorVitality(b)?.diedAt)))&&v.kind==='raid'&&['arriving','leaving'].includes(v.stage)&&point(v.gate)&&Array.isArray(v.partyIds)&&v.partyIds.length>0&&new Set(v.partyIds).size===v.partyIds.length&&v.partyIds.every(id=>e.rival.people.some(w=>w.id===id))&&[v.until,v.repathAt].every(finite)&&(v.leavingAt===undefined||finite(v.leavingAt))&&(v.fadeAt===undefined||finite(v.fadeAt))&&(v.blockedSince===null||finite(v.blockedSince));
}
