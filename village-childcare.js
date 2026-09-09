import {homeCapacity} from './ecs/home-entities.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {structuralCondition} from './ecs/home-entities.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {personAge} from './ecs/person-age.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/childcare.js';
import {careVisits} from './ecs/care-entities.js';
import {defineGameData} from './game-data.js';

export const CHILDCARE_RULES=defineGameData('village-childcare.CHILDCARE_RULES',{visitSeconds:6,youngInterval:18,olderInterval:35,retry:4,homeBeds:4});
export function childDevelopment(w,time){
 const bornAt=(personAge(w)?.childhoodStartedAt)??(personAge(w)?.bornAt)??0,matureAt=(personAge(w)?.matureAt)??bornAt+90;
 const progress=(personAge(w)?.child)?Math.max(0,Math.min(1,(time-bornAt)/Math.max(1,matureAt-bornAt))):1;
 return {progress,stage:!(personAge(w)?.child)?((personAge(w)?.elder)?'Elder':'Adult'):progress<.45?'Young child':'Older child',independence:progress,playRadius:1+progress*2};
}
const homeKey=h=>h?.id??`${h?.x}:${h?.z}`;
export function homeBeds(home){return home&&!(structuralCondition(home)?.destroyed)?Math.max(0,Math.floor((homeCapacity(home)?.beds)??CHILDCARE_RULES.homeBeds)):0}
export function housingCapacity(homes){return homes.reduce((total,home)=>total+homeBeds(home),0)}
export function hasFamilySpace(e,home,capacity){
 return !!home&&e.workers.filter(w=>!(actorVitality(w)?.dead)).length<capacity&&e.workers.filter(w=>!(actorVitality(w)?.dead)&&homeKey((actorResidence(w)?.home))===homeKey(home)).length<homeBeds(home);
}
// Care is a reserved two-person task. Meals remain communal resources; only
// reaching the store removes food, and only feeding the child consumes it.
// Data-only save type; task behaviour belongs to the childcare systems.
export class VillageChildcare {}
export function createChildcare(e){
 const state=Object.assign(new VillageChildcare(),{economy:e,sessions:[],completed:0,meals:0,adultSeconds:0,nextCheck:0});careVisits(state);return state;
}
export function childcareCancel(e,session){if(e.family?.care)return systems.childcareCancel(villageWorld(e),session);}
export function childcareInterrupt(e,w){if(e.family?.care)return systems.childcareInterrupt(villageWorld(e),w);}
export function childcareUpdate(e,dt){if(e.family?.care)return systems.childcareUpdate(villageWorld(e),dt);}
export function childcareHandle(e,w,dt){if(e.family?.care)return systems.childcareHandle(villageWorld(e),w,dt);}
export function childcareSnapshot(e){const state=e.family?.care;return state?{completed:state.completed,meals:state.meals,adultSeconds:state.adultSeconds,sessions:state.sessions.map(s=>({adultId:s.adult.id,childId:s.child.id,until:s.until}))}:undefined;}
