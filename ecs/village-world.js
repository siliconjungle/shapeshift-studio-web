import {EntityWorld} from './world.js';
const worlds=new WeakMap();
export function villageWorld(e){
 let world=worlds.get(e);
 if(!world){world=new EntityWorld();world.setResource('Village',e);worlds.set(e,world);}
 return world;
}
