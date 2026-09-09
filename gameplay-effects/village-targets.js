import {actorInterior,ensureActorInterior} from './../ecs/actor-interior.js';
import {structuralCondition} from './../ecs/home-entities.js';
import {resourceCultivation} from "../ecs/resource-state.js";
import {resourceGrowth,resourceCondition} from '../ecs/resource-state.js';
import {animalSpatial,animalLifecycle} from '../ecs/animal-state.js';
import {actorVitality} from "../ecs/actor-vitality.js";
import {visiblePeople} from '../village-people.js';
import {rivalBeasts,rivalFor} from '../rival-roster.js';
import {allShelters} from '../camp-rules.js';
import {homeFire,homePosition} from '../village-shelter.js';
import {relicById,relicFireTarget} from '../village-relics.js';
import {rootedForageAlive} from '../village-foraging.js';
import {RAID_RULES} from '../village-raids.js';
import {actorLabel} from '../village-cultures.js';
import {targetKey} from './targets.js';
import {beastWard} from '../beast-miracles.js';

// Domain adapters declare capabilities once. Ability definitions never branch on
// villager/raider/plant kinds. New domains register a resolver and an enumerator.
const domains=new Map();
export function registerEffectDomain(kind,domain){
 if(typeof kind!=='string'||!kind||['god','environment','ground','villager','beast','slime','raider','tree','crop','mushroom','bush','house','campfire','relic','grave','structure','wildlife','bird'].includes(kind))throw new TypeError('Invalid or reserved effect domain');
 if(domains.has(kind))throw new Error(`Duplicate effect domain ${kind}`);
 if(typeof domain.resolve!=='function'||typeof domain.query!=='function')throw new TypeError('Effect domain needs resolve and query');
 for(const fn of Object.values(domain.commands??{}))if(typeof fn!=='function')throw new TypeError('Domain commands must be functions');
 domains.set(kind,domain);return()=>{if(domains.get(kind)===domain)domains.delete(kind)};
}
export function domainEffectCommand(e,ref,op,step,context,runtime){
 const domain=domains.get(ref?.kind);if(!domain)return null;
 const command=Object.hasOwn(domain.commands??{},op)&&domain.commands[op];
 return {result:command?command(e,step,context,runtime)??{changed:false}:{changed:false,reason:'Target domain does not support '+op}};
}
const actors={villager:e=>visiblePeople(e),beast:e=>[...(e.beasts?.actors??[]),...rivalBeasts(e).filter(b=>b.visit&&!b.gone)],slime:e=>e.slimes?.enemies??[],raider:e=>e.raids?.enemies??[]};
export function villageActor(e,ref){return domains.has(ref?.kind)?domains.get(ref.kind).resolve(e,ref)?.actor:actors[ref?.kind]?.(e).find(a=>a.id===ref.id)}
export function villageActorRef(e,actor){for(const [kind,get] of Object.entries(actors))if(get(e).includes(actor))return{kind,id:actor.id};return null}
export function villageTargetRelation(e,a,b){
 if(targetKey(a)===targetKey(b))return'ally';
 const faction=ref=>{if(ref?.kind==='god')return'village';const d=resolveVillageTarget(e,ref);if(d?.faction)return d.faction;if(!d?.actor)return null;const rival=rivalFor(e,d.actor);if(rival)return'rival:'+(rival.id??rival.culture);return['villager','beast'].includes(ref.kind)?'village':['raider','slime'].includes(ref.kind)?ref.kind:null};
 const left=faction(a),right=faction(b);return left&&right?(left===right?'ally':'enemy'):'neutral';
}
function plantCondition(ref,plant){return ref.kind==='tree'||ref.kind==='crop'?resourceCondition(plant):plant}
function plantFor(e,ref){return ref.kind==='tree'||ref.kind==='crop'?e.nodes.find(n=>n.id===ref.id&&n.kind===(ref.kind==='tree'?'wood':'food')):ref.kind==='mushroom'?e.ecology?.mushrooms.find(n=>n.id===ref.id):ref.kind==='bush'?e.wishes?.scenery.find(n=>n.id===ref.id):null}
export function resolveVillageTarget(e,ref){
 if(!ref)return null;
 if(!ref.kind||ref.kind==='ground'){if(Number.isFinite(ref.x)&&Number.isFinite(ref.z)&&Number.isFinite(e.heightAt(ref.x,ref.z)))return{ref,alive:true,position:{x:ref.x,z:ref.z},capabilities:['Spatial','Ground']};return null}
 if(domains.has(ref.kind))return domains.get(ref.kind).resolve(e,ref);
 if(ref.kind==='god'||ref.kind==='environment')return{ref,alive:true,position:null,capabilities:['Source']};
 if(ref.kind==='grave'){const grave=e.survival?.memorials.find(g=>g.id===ref.id);return grave?{ref,alive:false,position:grave,capabilities:['Spatial','Grave']}:null}
 if(ref.kind==='structure'){const point=beastWard(e,ref);return point?{ref,alive:true,position:point,capabilities:['Spatial','Structure']}:null}
 if(ref.kind==='wildlife'||ref.kind==='bird'){const animal=(ref.kind==='bird'?e.birds?.flock:e.wildlife?.animals)?.find(a=>a.id===ref.id);return animal?{ref,alive:!(actorVitality(animal)?.dead)&&!animalLifecycle(animal)?.gone,position:animalSpatial(animal),capabilities:['Spatial','Animal']}:null}
 const actor=villageActor(e,ref);
 if(actor)return{ref,actor,alive:!(actorVitality(actor)?.dead)&&!actor.gone,position:actor,capabilities:['Spatial','Vitality','Healable','Mortal','Ignitable',...(['villager','beast','slime','raider'].includes(ref.kind)?['Protectable']:[])],maxHealth:(actorVitality(actor)?.maxHealth)??(ref.kind==='raider'?RAID_RULES.health:100),label:actorLabel(actor,ref.kind),policy:'actor'};
 const plant=plantFor(e,ref);
 if(plant)return{ref,plant,alive:!plantCondition(ref,plant)?.removed,position:plant,capabilities:['Spatial','Ignitable',...(ref.kind==='crop'?['Growable']:[])],label:ref.kind==='crop'?'Help this crop grow':'Burn this plant',policy:'plant'};
 if(ref.kind==='campfire'){const fire=ref.id&&ref.id!=='campfire'?e.exploration?.camps.find(c=>c.id===ref.id)?.fire:e.campfire;if(fire)return{ref,fire,alive:true,position:fire,capabilities:['Spatial','Ignitable'],label:'Light the campfire',policy:'campfire'}}
 if(ref.kind==='house'){const home=allShelters(e).find(h=>h.id===ref.id);if(home)return{ref,home,alive:!(structuralCondition(home)?.destroyed)&&(structuralCondition(home)?.health)>0,position:homePosition(home),capabilities:['Spatial','Ignitable'],label:'Set this home alight',policy:'house'}}
 if(ref.kind==='relic'){const relic=relicById(e,ref.id);if(relic){const check=relicFireTarget(e,ref);return{ref,relic,alive:!relic.destroyed,position:check.point??relic,capabilities:['Spatial','Ignitable'],label:check.label,policy:'relic'}}}
 return null;
}
export function villageTargetReason(e,ability,d){
 if(!d)return'Choose a target';
 const domain=domains.get(d.ref?.kind);if(domain?.validate){const reason=domain.validate(e,ability,d);if(reason)return reason}
 const {actor,plant,ref}=d;
 if(actor){if(!d.alive||(actorInterior(actor)?.inside)||actor.state==='away')return'Choose someone alive and outdoors';
  if(ability==='shield'&&(actor.divineHeld||actor.flight||['emerging','departing','fading'].includes(actor.state)))return'Choose a living character outdoors';
 }
 if(ability==='fire'){
  if(d.policy==='relic'){const check=relicFireTarget(e,ref);if(!check.valid)return check.reason}
  if(d.home){if(!d.alive)return'Choose a standing home';if(homeFire(e,d.home))return'Already burning'}
  if(d.fire){if(!d.fire.built)return'Build the stone ring first';if(d.fire.lit)return'Already burning'}
  if(plant&&(plantCondition(ref,plant)?.removed||(ref.kind==='tree'||ref.kind==='crop'?resourceGrowth(plant):plant)?.state&&!['ready','growing','fading'].includes((ref.kind==='tree'||ref.kind==='crop'?resourceGrowth(plant):plant).state)&&!rootedForageAlive(plant)))return'Choose a living plant';
  if((e.wishes?.burns??[]).some(b=>targetKey(b)===targetKey(ref)&&e.time<(ref.kind==='bush'?b.regrowAt-8:b.until)))return'Already burning or regrowing';
 }
 if(ability==='life'&&plant){
  if(resourceCultivation(plant)?.needsPlanting||resourceGrowth(plant)?.state!=='growing'||!Number.isFinite(resourceGrowth(plant)?.readyAt)||resourceGrowth(plant)?.growth>=1)return resourceGrowth(plant)?.state==='ready'?'This crop is already ripe':'Choose a planted, growing crop';
  if((plantCondition(ref,plant)?.burningUntil??0)>e.time||(e.wishes?.burns??[]).some(b=>b.kind==='crop'&&b.id===plant.id&&b.until>e.time))return'Put out the fire before helping this crop grow';
 }
 return null;
}
export function villageTargetCheck(e,kind,ref){
 const d=resolveVillageTarget(e,ref),capability=kind==='fire'?'Ignitable':kind==='skull'?'Mortal':kind==='shield'?'Protectable':d?.plant?'Growable':'Healable';
 const reason=!d?.capabilities.includes(capability)?kind==='fire'?'Choose a living plant':'Choose someone alive and outdoors':villageTargetReason(e,kind,d);
 if(reason)return{valid:false,reason};
 return{valid:true,...(d.actor?{actor:d.actor,maxHealth:d.maxHealth}:d.plant?{plant:d.plant}:d.home?{home:d.home,point:d.position}:d.fire?{fire:d.fire}:d.relic?{relic:d.relic,point:d.position}:{point:d.position}),label:d.label};
}
export function queryVillageTargets(e,selector,origin){
 const refs=[];for(const [kind,get] of Object.entries(actors))for(const actor of get(e))refs.push({kind,id:actor.id});
 for(const n of e.nodes)if(n.kind==='wood'||n.kind==='food')refs.push({kind:n.kind==='wood'?'tree':'crop',id:n.id});
 for(const n of e.ecology?.mushrooms??[])refs.push({kind:'mushroom',id:n.id});for(const n of e.wishes?.scenery??[])refs.push({kind:'bush',id:n.id});
 for(const home of allShelters(e))refs.push({kind:'house',id:home.id});if(e.campfire)refs.push({kind:'campfire',id:'campfire'});
 for(const c of e.exploration?.camps??[])refs.push({kind:'campfire',id:c.id});
 for(const [kind,domain] of domains)for(const id of domain.query(e,selector,origin))refs.push({kind,id});
 return refs;
}
