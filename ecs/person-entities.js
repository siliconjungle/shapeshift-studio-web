import {bindRivalVisit,validateRivalVisitOwner} from './rival-entities.js';
import {personKinshipInput} from './kinship-data.js';
import {bindPopulation,restorePopulation} from './population-entities.js';
import {actorEntity,existingActor,validateActorOwner} from './actor-entities.js';
// Person still owns the remaining unsplit person payload. Identity is shared
// across resident/rival/exile membership; behaviours belong to systems.
export const Person={name:'Person',replaceable:false,validate:p=>p!==null&&typeof p==='object'&&Number.isSafeInteger(p.id)&&p.id>=0};
export function definePersonStore(world){if(!world.stores.has('Person'))world.define(Person);}
export function validatePersonOwner(e,p){validateActorOwner(e,p);validateRivalVisitOwner(e,p);if(existingActor(e,p,'Person')===undefined)personKinshipInput(p);}
export const existingPerson=(e,p)=>existingActor(e,p,'Person');
export function personEntity(e,p){const id=actorEntity(e,p,Person);bindRivalVisit(e,p);return id;}
export function registerPeople(e){bindPopulation(e);}
export function restorePersonEntities(e){restorePopulation(e);}
