import {bindAnimalPopulation} from './ecs/animal-entities.js';


import {defineGameData} from './game-data.js';

export const BIRD_SPECIES=defineGameData('birds.species',{hearth:{name:'Raven'},solis:{name:'Sand starling'},cryos:{name:'Snow jay'}});
export const BIRD_RULES=defineGameData('birds.rules',{maxBirds:6,maxNests:3,firstAt:18,spawnEvery:55,flightSpeed:3.8,health:10,theftCooldown:45,peckSeconds:3,swoopCooldown:50,swoopDamage:2,deathFade:2.2});
export function birdState(e){e.birds??={flock:[],nests:[],nextId:0,nextNest:0,nextAt:e.time+BIRD_RULES.firstAt,nextTheftAt:e.time+35,kills:0,stolen:0};return bindAnimalPopulation(e,'Birds');}

export function birdFlightPosition(f,time){const delay=f.takeoffDuration??0,t=clamp((time-f.at-delay)/Math.max(.1,f.duration-delay)),q=t*t*(3-2*t);return {x:f.from.x+(f.to.x-f.from.x)*q,z:f.from.z+(f.to.z-f.from.z)*q,y:f.from.y+(f.to.y-f.from.y)*q+Math.sin(Math.PI*q)*f.arc,t,q};}

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));

import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/birds.js';
// Public JSON/CLI APIs enter the same world-driven behaviour systems as gameplay.
export function treeForNest(e,...args){return systems.treeForNest(villageWorld(e),...args);}
export function perchPoint(e,...args){return systems.perchPoint(villageWorld(e),...args);}
export function makeBirdNest(e,...args){return systems.makeBirdNest(villageWorld(e),...args);}
export function spawnBird(e,...args){return systems.spawnBird(villageWorld(e),...args);}
export function flyBird(e,...args){return systems.flyBird(villageWorld(e),...args);}
export function returnBird(e,...args){return systems.returnBird(villageWorld(e),...args);}
export function interruptBird(e,...args){return systems.interruptBird(villageWorld(e),...args);}
export function damageBird(e,...args){return systems.damageBird(villageWorld(e),...args);}
export function chooseBirdResponse(e,...args){return systems.chooseBirdResponse(villageWorld(e),...args);}
export function handleBird(e,...args){return systems.handleBird(villageWorld(e),...args);}
export function startBirdSwoop(e,...args){return systems.startBirdSwoop(villageWorld(e),...args);}
export function updateBirds(e,...args){return systems.updateBirds(villageWorld(e),...args);}
export function validBirds(e,...args){return systems.validBirds(villageWorld(e),...args);}
