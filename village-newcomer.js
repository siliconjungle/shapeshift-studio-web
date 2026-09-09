import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {familyBirthPlan} from "./ecs/family-entities.js";
import {actorVitality} from './ecs/actor-vitality.js';
import {lifeAddRelationship} from './village-life.js';
import {personAge} from './ecs/person-age.js';
import {familyCapacity} from './village-family.js';
import {addPerson} from './ecs/population-entities.js';
import {initialiseRomanceInterest} from './village-romance-interest.js';
import {nextPersonId} from './village-people.js';
import {ActionClock} from './action-timing.js';
import {homeBeds,housingCapacity} from './village-childcare.js';
import {canWalkAt} from './village-walking.js';
import {standingRoom} from './village-spacing.js';
const homeKey=h=>h?.id??`${h?.x}:${h?.z}`;
export function newcomerTarget(e,point,{candidate=null}={}){
 const living=e.workers.filter(w=>!(actorVitality(w)?.dead)),capacity=familyCapacity(e)??housingCapacity(e.life?.homes??[]),pending=(familyBirthPlan(e.family));
 if(living.length>=capacity)return {valid:false,reason:'The village is at its population cap'};
 if(living.length+(pending?1:0)>=capacity)return {valid:false,reason:'The last space is reserved for an expected child'};
 if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.z)||!canWalkAt(point.x,point.z,e.heightAt,e.obstacles())||!standingRoom(e,candidate??{id:-1},point))return {valid:false,reason:'Choose clear, walkable ground'};
 const homes=(e.life?.homes??[]).filter(home=>living.filter(w=>homeKey((actorResidence(w)?.home))===homeKey(home)).length+(pending&&homeKey(pending.home)===homeKey(home)?1:0)<homeBeds(home)).sort((a,b)=>Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z));
 const home=homes.find(h=>e.pathfind(point,h,e.heightAt,e.obstacles()));
 if(!home||!e.pathfind(point,e.depot,e.heightAt,e.obstacles()))return {valid:false,reason:'Choose ground with a route to a free home and the store'};
 return {valid:true,point:{x:point.x,z:point.z},home,label:'Welcome a new villager'};
}
export function summonNewcomer(e,check){
 const random=e.random,id=nextPersonId(e),traits=['gentle','outgoing','quiet','playful','blunt','thoughtful'];
 const w={id,name:e.names.take(),culture:e.culture??'hearth',sex:random()<.5?'female':'male',trait:traits[Math.floor(random()*traits.length)],workPreferences:{food:random(),wood:random(),stone:random()},...check.point,home:check.home,store:e.depot,health:100,dead:false,starvingFor:0,child:false,parents:[],origin:'summoned',summonedAt:e.time,state:'idle',job:null,cargo:null,node:null,route:[],facing:'front',phase:random(),clock:new ActionClock('harvest'),wait:1.3,vx:0,vz:0,retries:0,needs:{energy:85,hunger:15,social:60},bedtime:20+random(),wakeHour:6+random()*.5,inside:false,partnerId:null,sweetheartId:null,heartbrokenUntil:0,socialAfter:e.time+4,careAt:e.time+1.3,activityUntil:0,memories:[]};
 for(const other of e.workers)lifeAddRelationship(e.life,{a:other.id,b:id,affinity:.05+random()*.2,compatibility:random()*1.6-.8,attractionAB:(personAge(other)?.child)||(actorVitality(other)?.dead)?0:.3+random()*.7,attractionBA:(personAge(other)?.child)||(actorVitality(other)?.dead)?0:.3+random()*.7,meetings:0,...((personAge(other)?.child)?{juvenile:true}:{})});
 addPerson(e,w);initialiseRomanceInterest(w);e.emit('villager-arrived',w,null,{source:'wish'});return w;
}
