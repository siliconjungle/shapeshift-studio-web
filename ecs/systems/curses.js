import {actorInterior,ensureActorInterior} from './../actor-interior.js';
import {constructionProgress} from './../housing-state.js';
import {ensureConstructionProgress} from './../housing-state.js';
import {actorConstructionTask,ensureActorConstructionTask} from './../actor-construction-task.js';
import {releaseWork} from "../../village-resources.js";
import {resourceHarvest} from "../resource-state.js";
import {actorPersonality} from "../personality-actors.js";
import {faithChange} from "../../village-faith.js";
import {actorCurse,ensureActorCurseMemories,actorCurseMemories,ensureActorCurse,ensureActorCurseCare,actorCurseCare} from "../actor-curse-relic.js";
import {beastRelationships} from "../beast-relationships.js";
import {survivalDrop} from "../../village-survival.js";
import {lifeRelation} from "../../village-life.js";
import {personKinship} from "../person-kinship.js";
import {actorRomance} from "../actor-romance.js";
import {actorNeeds} from "../actor-needs.js";
import {actorVitality} from "../actor-vitality.js";
import {defineGameData} from "../../game-data.js";
export const CURSE_RULES=defineGameData('village-curse.RULES',{duration:900,chestChance:.05,accidentMin:22,accidentMax:42,accidentChance:.55,fumbleChance:.18,socialInterval:55,cleanseChance:.35,cleanseSeconds:6,skullPeriod:18,skullSeconds:2.8});
const alive=w=>w&&!actorVitality(w)?.dead&&!w.gone&&(actorVitality(w)?.health??100)>0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export function curseActors(world){
 const e=world.resource('Village');const rivals=e.rivals?.length?e.rivals:e.rival?[e.rival]:[];return [...new Set([...(e.workers??[]),...(e.raids?.enemies??[]),...(e.slimes?.enemies??[]),...(e.beasts?.actors??[]),...rivals.flatMap(s=>[...(s.people??[]),s.beast].filter(Boolean))])];}
export const isCursed=(w,now)=>alive(w)&&(actorCurse(w)?.effect)?.until>now;
export const curseRemaining=(w,now)=>isCursed(w,now)?Math.max(0,(actorCurse(w)?.effect).until-now):0;
export function curseDescription(w,now){const seconds=curseRemaining(w,now);return seconds?`Cursed · ${Math.ceil(seconds/60)} min remaining · Life removes it`:'';}
export function curseSkullVisible(w,now,selected=false){return isCursed(w,now)&&!(actorInterior(w)?.inside)&&(selected||(actorCurse(w)?.effect).cueUntil>now||(now-(actorCurse(w)?.effect).since)%CURSE_RULES.skullPeriod<CURSE_RULES.skullSeconds);}
function kind(world,w){
 const e=world.resource('Village');return e.workers.includes(w)||((e.rivals?.length?e.rivals:[e.rival]).filter(Boolean).some(s=>s.people?.includes(w)))?'villager':w.species==='beast'?'beast':w.species==='slime'?'slime':'raider';}
function emit(world,type,w,extra={}){
 const e=world.resource('Village');const actorKind=kind(world,w);e.emit(type,actorKind==='villager'?w:null,null,{actorId:w.id,actorKind,...extra});}
function remember(world,w,text){
 const e=world.resource('Village');ensureActorCurseMemories(w).entries=[{text,at:e.time},...((actorCurseMemories(w)?.entries)??[])].slice(0,5);}
function cue(world,w,reason){
 const e=world.resource('Village');if((actorCurse(w)?.effect))(actorCurse(w)?.effect).cueUntil=e.time+3;emit(world,'curse-misfortune',w,{reason});}
export function applyCurse(world,w,source='spell'){
 const e=world.resource('Village');
 if(!alive(w))return false;
 ensureActorCurse(w).effect={since:e.time,until:e.time+CURSE_RULES.duration,source,cueUntil:e.time+4,nextAccident:e.time+CURSE_RULES.accidentMin+e.random()*(CURSE_RULES.accidentMax-CURSE_RULES.accidentMin),nextSocial:e.time+8,nightmares:0};
 remember(world,w,source==='chest'?'A hidden curse escaped from the chest I opened.':'A divine curse settled over me.');
 if(source==='spell'&&e.workers.includes(w))faithChange(e.faith,w,-.12,'cursed-by-god');
 emit(world,'curse-applied',w,{source});return true;
}
export function clearCurse(world,w,reason='life'){
 const e=world.resource('Village');
 if(!(actorCurse(w)?.effect))return false;delete (actorCurse(w)?.effect);
 remember(world,w,reason==='life'?'Life lifted the curse from me.':reason==='leader'?'A spiritual leader cleansed my curse.':'My run of cursed luck finally ended.');
 emit(world,'curse-cleared',w,{reason});return true;
}
export function noticeCurseEvent(world,event){
 const e=world.resource('Village');
 if(event.type==='treasure-opened'){
  const w=e.workers.find(w=>w.id===event.workerId),chest=e.discovery?.chests.find(c=>c.id===event.chestId);
  if(!w||!chest||chest.openedAt===null||chest.curseRolled)return;
  chest.curseRolled=true;if(e.random()<CURSE_RULES.chestChance)applyCurse(world,w,'chest');
 }
}
export function curseFumbles(world,w,cause='attack'){
 const e=world.resource('Village');
 if(!isCursed(w,e.time)||!['attack','revolt','leader-rivalry'].includes(cause))return false;
 // Delegated damage paths and multi-target hits share one roll per simulation instant.
 const c=(actorCurse(w)?.effect);if(c.attackAt===e.time)return c.attackMiss;
 c.attackAt=e.time;c.attackMiss=e.random()<CURSE_RULES.fumbleChance;
 if(c.attackMiss){cue(world,w,'fumbled-attack');remember(world,w,'My attack slipped at the worst moment.');}
 return c.attackMiss;
}
export function curseAccident(world,w){
 const e=world.resource('Village');
 if(!isCursed(w,e.time)||(actorInterior(w)?.inside)&&w.state!=='sleeping'||w.divineHeld)return false;
 if(w.state==='sleeping'){
  (actorCurse(w)?.effect).nightmares++;if(actorNeeds(w))actorNeeds(w).energy=Math.max(Math.min(15,actorNeeds(w).energy),actorNeeds(w).energy-4);
  remember(world,w,'A nightmare disturbed my sleep.');cue(world,w,'nightmare');return true;
 }
 if(w.cargo?.amount>0&&e.survival){
  const cargo=w.cargo,amount=Math.min(1,cargo.amount),drop=survivalDrop(e.survival,w,cargo.kind,amount);
  if(!drop)return false;
  Object.assign(drop,{availableAt:e.time+2,source:'curse',...(cargo.appearance?{appearance:cargo.appearance}:{})});
  cargo.amount-=amount;if(cargo.amount<=0)w.cargo=null;
  remember(world,w,'I dropped supplies when bad luck struck.');cue(world,w,'dropped-supplies');return true;
 }
 if(['house-building','repairing','working','building-ring','preparing-plot','planting-plot','replanting'].includes(w.state)){
  const project=e.housing?.projects.find(p=>p.id===(actorConstructionTask(w)?.projectId)&&!['complete','destroyed','packed'].includes((constructionProgress(p)?.state)));
  if(project&&(constructionProgress(project)?.strikes)>0)ensureConstructionProgress(project).strikes=Math.max(0,(constructionProgress(project)?.strikes)-1);
  else if(resourceHarvest(w.node)?.hits>0)resourceHarvest(w.node).hits=Math.max(0,resourceHarvest(w.node)?.hits-1);
  // Lose this piece of work, not a delivered material or a completed build stage.
  (actorCurse(w)?.effect).workUntil=e.time+2;remember(world,w,'A tool slipped and I had to redo my work.');cue(world,w,'work-slip');return true;
 }
 if(['eating','cooking-stir','cooking-add'].includes(w.state)&&(e.stock.food??0)>1&&e.workers.includes(w)){
  e.stock.food--;remember(world,w,'A little food spoiled in my hands.');cue(world,w,'spoiled-food');return true;
 }
 return false;
}
function bond(world,a,b){
 const e=world.resource('Village');return lifeRelation(e.life,a.id,b.id)?.affinity??beastRelationships(a)?.find(r=>r.id===b.id)?.affinity??0;}
export function curseSocialResponse(world,observer,target){
 const e=world.resource('Village');
 if(!isCursed(target,e.time)||observer===target||!alive(observer))return null;
 if(e.leadership?.isLeader(observer)||observer.role==='spiritual-leader')return observer.leaderTrait==='zealot'&&bond(world,observer,target)<.45?'condemn':'cleanse';
 if(actorRomance(observer)?.sweetheartId===target.id||personKinship(observer)?.parents?.includes(target.id)||personKinship(target)?.parents?.includes(observer.id)||bond(world,observer,target)>.3)return 'comfort';
 if(['quiet','nervous','fearful'].includes((actorPersonality(observer)?.trait)))return 'avoid';
 if((actorPersonality(observer)?.trait)==='blunt'||bond(world,observer,target)<-.25)return 'blame';
 return (actorPersonality(observer)?.trait)==='gentle'?'comfort':null;
}
function reactSocial(world,w,target,response){
 const e=world.resource('Village');
 const relation=lifeRelation(e.life,w.id,target.id);
 if(response==='blame'||response==='condemn'){
  if(relation)relation.affinity=clamp(relation.affinity-.035,-1,1);
  if(actorNeeds(target))actorNeeds(target).social=clamp(actorNeeds(target).social-3);
  remember(world,target,`${w.name} ${response==='condemn'?'declared me wicked':'blamed me for our bad luck'}.`);
  remember(world,w,`I ${response==='condemn'?'condemned':'blamed'} ${target.name}'s curse.`);
  emit(world,'curse-social',w,{response,targetId:target.id});return;
 }
 if(!['idle','resting'].includes(w.state)||w.cargo||(actorInterior(w)?.inside)||w.divineHeld||actorNeeds(w)?.hunger>75||actorNeeds(w)?.energy<25)return;
 let point=target;
 if(response==='avoid'){const angle=Math.atan2(w.z-target.z,w.x-target.x);point={x:w.x+Math.cos(angle)*3,z:w.z+Math.sin(angle)*3};}
 else{const angle=Math.atan2(w.z-target.z,w.x-target.x);point={x:target.x+Math.cos(angle)*1.4,z:target.z+Math.sin(angle)*1.4};}
 const route=e.route(w,point);if(!route)return;
 releaseWork(e,w);ensureActorCurseCare(w).task={targetId:target.id,response,until:e.time+22,finishAt:null};w.route=route;w.state='curse-bound';w.wait=0;
 emit(world,'curse-social',w,{response,targetId:target.id});
}
export function handleCurseCare(world,w,dt){
 const e=world.resource('Village');
 const care=(actorCurseCare(w)?.task);if(!care)return false;
 const target=e.workers.find(t=>t.id===care.targetId),danger=e.raids?.alarmUntil>e.time;
 const finish=()=>{delete (actorCurseCare(w)?.task);if(w.state.startsWith('curse-'))releaseWork(e,w)};
 if(!isCursed(target,e.time)||!alive(w)||(actorInterior(w)?.inside)||w.divineHeld||danger||e.time>=care.until||!w.state.startsWith('curse-')||actorNeeds(w).hunger>85||actorNeeds(w).energy<15){finish();return false;}
 if(w.state==='curse-bound'){
  const status=e.move(w,dt);if(status==='blocked'){finish();return false;}
  if(status==='arrived'){
   if(care.response==='avoid'){remember(world,w,`I kept my distance from ${target.name}'s curse.`);finish();return true;}
   if(distance(w,target)>2.3){finish();return false;}
   w.state=care.response==='cleanse'?'curse-cleansing':'curse-comforting';care.finishAt=e.time+(care.response==='cleanse'?CURSE_RULES.cleanseSeconds:4);
   emit(world,'curse-social',w,{response:care.response,targetId:target.id});
  }return true;
 }
 if(distance(w,target)>2.6){finish();return false;}
 if(e.time<care.finishAt)return true;
 if(care.response==='cleanse'){
  const success=e.random()<CURSE_RULES.cleanseChance;
  if(success)clearCurse(world,target,'leader');else{(actorCurse(target)?.effect).until=Math.max(e.time+1,(actorCurse(target)?.effect).until-45);remember(world,target,`${w.name} tried to cleanse me. The curse weakened but remained.`);}
  emit(world,'curse-cleanse-attempt',w,{targetId:target.id,success});
 }else{
  actorNeeds(target).social=clamp(actorNeeds(target).social+9);actorNeeds(w).social=clamp(actorNeeds(w).social+5);
  const r=lifeRelation(e.life,w.id,target.id);if(r)r.affinity=clamp(r.affinity+.04,-1,1);
  remember(world,target,`${w.name} stayed beside me despite the curse.`);remember(world,w,`I comforted ${target.name} through the curse.`);
 }
 finish();return true;
}
export function updateCurses(world,dt){
 const e=world.resource('Village');
 if(!(dt>0))return;
 for(const w of curseActors(world)){
  if(!(actorCurse(w)?.effect))continue;
  if(!alive(w)){delete (actorCurse(w)?.effect);continue;}
  if(!isCursed(w,e.time)){clearCurse(world,w,'expired');continue;}
  const c=(actorCurse(w)?.effect);
  // Reduce rest gains while keeping sleep restorative; no direct health damage.
  if(w.state==='sleeping'&&actorNeeds(w))actorNeeds(w).energy=clamp(actorNeeds(w).energy-dt*.32);
  if(e.time>=c.nextAccident){c.nextAccident=e.time+CURSE_RULES.accidentMin+e.random()*(CURSE_RULES.accidentMax-CURSE_RULES.accidentMin);if(e.random()<CURSE_RULES.accidentChance)curseAccident(world,w);}
  if(e.time<c.nextSocial||(actorInterior(w)?.inside)||w.divineHeld)continue;
  c.nextSocial=e.time+CURSE_RULES.socialInterval;
  if(e.workers.includes(w)&&!(e.raids?.alarmUntil>e.time))for(const observer of e.workers.filter(p=>p!==w&&alive(p)&&!(actorInterior(p)?.inside)&&!p.divineHeld&&distance(p,w)<5).slice(0,3)){const response=curseSocialResponse(world,observer,w);if(response)reactSocial(world,observer,w,response);}
  for(const b of e.beasts?.actors??[])if(b!==w&&alive(b)&&!b.divineHeld&&distance(b,w)<5&&e.random()<.4){e.emit('beast-reaction',null,null,{beastId:b.id,reaction:'grumpy',expression:'angry'});remember(world,w,`${b.name} growled uneasily at my curse.`);}
 }
}
export function cursedAnimalThreat(world,a){
 const e=world.resource('Village');return curseActors(world).filter(w=>isCursed(w,e.time)&&!(actorInterior(w)?.inside)&&!w.divineHeld&&distance(a,w)<5).sort((x,y)=>distance(a,x)-distance(a,y))[0]??null;}
export function validCurses(world){
 const e=world.resource('Village');return curseActors(world).every(w=>{
 const c=(actorCurse(w)?.effect),care=(actorCurseCare(w)?.task);
 return (!c||['since','until','cueUntil','nextAccident','nextSocial'].every(k=>Number.isFinite(c[k])&&c[k]>=0)&&c.until>=c.since&&['spell','chest','stranger'].includes(c.source)&&Number.isSafeInteger(c.nightmares)&&c.nightmares>=0&&['workUntil','attackAt'].every(k=>c[k]===undefined||Number.isFinite(c[k])&&c[k]>=0)&&(c.attackMiss===undefined||typeof c.attackMiss==='boolean'))&&(!care||['comfort','cleanse','avoid'].includes(care.response)&&Number.isSafeInteger(care.targetId)&&Number.isFinite(care.until)&&(care.finishAt===null||Number.isFinite(care.finishAt)))&&(!(actorCurseMemories(w)?.entries)||Array.isArray((actorCurseMemories(w)?.entries))&&(actorCurseMemories(w)?.entries).length<=5&&(actorCurseMemories(w)?.entries).every(m=>typeof m.text==='string'&&Number.isFinite(m.at)));
});}

export function curseFeedbackEvents(e){
 const cue=(workerId,reaction,delay=0)=>({workerId,reaction,delay});
 if(e.type==='curse-applied')return [{...cue(e.workerId,'surprise'),expression:'surprised'}];
 if(e.type==='curse-cleared')return [{...cue(e.workerId,'delight'),expression:'happy'}];
 if(e.type==='curse-misfortune')return [{...cue(e.workerId,e.reason==='nightmare'?'nervous':'confused'),expression:'worried'}];
 if(e.type==='curse-social')return [{...cue(e.workerId,({comfort:'love',cleanse:'divine',avoid:'nervous',blame:'grumpy',condemn:'grumpy'})[e.response]),expression:['blame','condemn'].includes(e.response)?'angry':'worried'}];
 if(e.type==='curse-cleanse-attempt')return [cue(e.workerId,e.success?'delight':'disappointed')];
 return null;
}
