

import {restoreFarmingComponents} from './ecs/farming-state.js';
import {defineGameData} from './game-data.js';

import {flatDecalHeight} from './decal-placement.js';

export const FARM_RULES=defineGameData('village-farming.FARM_RULES',{width:2.65,height:1.78,workPasses:3,grow:12,villagersPerPlot:2,shortageSeconds:35,maxPlots:24});
export const INITIAL_FARM=defineGameData('village-farming.INITIAL_FARM',{id:'farm-0',x:-4.6,z:1});
export const FARM_SITES=defineGameData('village-farming.FARM_SITES',Array.from({length:5},(_,i)=>({id:'farm-'+(i+1),x:-4.6,z:3.1+i*2.1})));
export const FARM_STATES=new Set(['farm-bound','preparing-plot','planting-plot','replant-bound','replanting']);
export function farmPlants(plot){return Array.from({length:6},(_,i)=>({id:plot.id+'-crop-'+i,kind:'food',plotId:plot.id,x:plot.x-.72+i%3*.72,z:plot.z-.4+Math.floor(i/3)*.8}))}
export function validFarmSite(e,site,plots){
 if(flatDecalHeight(e.heightAt,{...site,width:FARM_RULES.width+.4,height:FARM_RULES.height+.4})===null)return false;
 if(plots.some(p=>p.id!==site.id&&Math.abs(p.x-site.x)<FARM_RULES.width+.3&&Math.abs(p.z-site.z)<FARM_RULES.height+.3))return false;
 return !e.obstacles().some(o=>Math.hypot(Math.max(0,Math.abs(o.x-site.x)-FARM_RULES.width/2),Math.max(0,Math.abs(o.z-site.z)-FARM_RULES.height/2))<o.radius+.3);
}

import {bindEnvironment,environmentBinding} from './ecs/environment-entities.js';
import * as systems from './ecs/systems/farming.js';
// Stable save type; behaviour executes in world-first systems.
export class VillageFarming {}
export function createFarming(e,{plots=[INITIAL_FARM],sites=FARM_SITES}={}){const state=new VillageFarming();
state.economy=e;state.plots=plots.map(p=>({...p,state:'ready',passes:0,reservedBy:null}));state.sites=sites.map(s=>({...s}));state.shortage=0;state.nextCheck=0;state.completed=0
 bindEnvironment(state,'Farming');return state;
}
export function farmingActive(state,...args){if(state==null)return undefined;return systems.farmingActive(environmentBinding(state).world,...args);}
export function farmingUpdate(state,...args){if(state==null)return undefined;return systems.farmingUpdate(environmentBinding(state).world,...args);}
export function farmingInterrupt(state,...args){if(state==null)return undefined;return systems.farmingInterrupt(environmentBinding(state).world,...args);}
export function farmingRouteTo(state,...args){if(state==null)return undefined;return systems.farmingRouteTo(environmentBinding(state).world,...args);}
export function farmingHandle(state,...args){if(state==null)return undefined;return systems.farmingHandle(environmentBinding(state).world,...args);}
export function farmingSnapshot(state,...args){if(state==null)return undefined;return systems.farmingSnapshot(environmentBinding(state).world,...args);}
