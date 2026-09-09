import {actorComponent,actorKind,ensureActorComponent} from './actor-entities.js';
import {animalComponents} from './animal-data.js';
export const animalSpatial=a=>actorComponent(a,'AnimalSpatial');
export const animalMotion=a=>actorComponent(a,'AnimalMotion');
export const animalLifecycle=a=>actorComponent(a,'AnimalLifecycle');
export const animalExpression=a=>actorComponent(a,'AnimalExpression');
export const animalEncounter=a=>actorComponent(a,'AnimalEncounter');
export const snakeEncounter=a=>actorComponent(a,'SnakeEncounter');
export const birdFlight=a=>actorComponent(a,'BirdFlight');
export const birdForaging=a=>actorComponent(a,'BirdForaging');
export const birdDefence=a=>actorComponent(a,'BirdDefence');
export function ensureAnimalState(a,name){const spec=animalComponents.find(s=>s.definition.name===name),kind=actorKind(a);if(!spec||!['Wildlife','Bird'].includes(kind)||spec.kind&&spec.kind!==kind)throw Error('Invalid animal component owner');return ensureActorComponent(a,spec.definition);}
// Explicit read-only rendering DTO. Simulation systems always receive identity records.
export function animalRenderState(a){if(!a)return null;const data={...a};for(const {definition} of animalComponents){const row=actorComponent(a,definition.name);if(row)for(const key of Object.keys(row))if(key!=='person')data[key]=row[key];}const vitality=actorComponent(a,'ActorVitality');if(vitality)for(const key of Object.keys(vitality))if(key!=='person')data[key]=vitality[key];return data;}
