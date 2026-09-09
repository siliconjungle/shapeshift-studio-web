import {constructionDefinition} from './ecs/housing-state.js';
import {environmentOwner} from './ecs/environment-entities.js';
import {farmingSites} from './ecs/farming-state.js';


import {CAMP_RULES,CAMP_STAGES} from './camp-rules.js';

import {WATCHTOWER_RULES,WATCHTOWER_STAGES,towerName} from './village-watchtowers.js';

import {defineGameData} from './game-data.js';

import {structureArt} from './village-biomes.js';

import {CHAPEL_RULES,CHAPEL_STAGES,CHAPEL_SITES} from './village-chapel.js';
import {SHELTER_RULES} from './village-shelter.js';
import {villagePathDistance,PERMANENT_PATH_RADIUS} from './village-paths.js';
import {flatDecalHeight} from './decal-placement.js';

export const HOUSE_STAGES=defineGameData('village-housing.HOUSE_STAGES',[
 {id:'foundation',kind:'stone',amount:8,strikes:4},
 {id:'frame',kind:'wood',amount:10,strikes:5},
 {id:'walls',kind:'wood',amount:6,strikes:4},
 {id:'roof',kind:'wood',amount:4,strikes:4}
]);
export const HOUSE_RULES=defineGameData('village-housing.HOUSE_RULES',{maxHouses:16,beds:4,width:4.7,depth:3,radius:2.15,height:6.4,load:3});
export const HOUSE_SITES=defineGameData('village-housing.HOUSE_SITES',[{id:'house-1',x:9.5,z:3.4},{id:'house-2',x:16,z:12},{id:'house-3',x:18,z:1},{id:'house-4',x:11,z:18}]);
export const buildingRules=p=>p?.kind==='camp'?CAMP_RULES:p?.kind==='watchtower'?WATCHTOWER_RULES:p?.kind==='chapel'?CHAPEL_RULES:HOUSE_RULES;
export const buildingStages=p=>(environmentOwner(p)?constructionDefinition(p)?.stages:p?.stages)??(p?.kind==='camp'?CAMP_STAGES:p?.kind==='watchtower'?WATCHTOWER_STAGES:p?.kind==='chapel'?CHAPEL_STAGES:HOUSE_STAGES);
export function projectStages(e,kind){const benefit=e.leadership?.benefits(),cost=Math.max(.75,Math.min(1,benefit?.cost??benefit?.materials??1));return (kind==='camp'?CAMP_STAGES:kind==='watchtower'?WATCHTOWER_STAGES:kind==='chapel'?CHAPEL_STAGES:HOUSE_STAGES).map(s=>({...s,amount:Math.ceil(s.amount*cost)}));}
export const HOUSE_STATES=new Set(['house-fetch','house-deliver','house-bound','house-building']);
export function houseEntrance(site,heightAt,culture='hearth'){
 const rules=buildingRules(site),kind=site.kind??'cottage',profile=structureArt(kind,culture),height=profile?.height??rules.height;
 const offset=profile?(profile.doorU-.5)*profile.width:(kind==='camp'?-.7:kind==='chapel'?-.17:-.55),x=site.x+offset*(site.flip?-1:1);
 return {id:site.id,kind,name:profile?.name??(kind==='camp'?'Temporary camp':kind==='watchtower'?towerName(culture):kind==='chapel'?'Leaf sanctuary':'Leaf cottage'),beds:rules.beds,maxHealth:rules.health??SHELTER_RULES.health,health:rules.health??SHELTER_RULES.health,buildingX:site.x,buildingZ:site.z,height,flip:!!site.flip,x,z:site.z+rules.radius+.65,door:{x,y:(heightAt(site.x,site.z)??0)+(profile?profile.doorRise*height:kind==='camp'?.12:kind==='chapel'?.58:.16),z:site.z+.08}};
}
export function validHouseSite(e,site){
 const rules=buildingRules(site);
 if(villagePathDistance(site.x,site.z)<rules.radius+PERMANENT_PATH_RADIUS+.25)return false;
 if(flatDecalHeight(e.heightAt,{...site,width:rules.width+.4,height:rules.depth+.6})===null)return false;
 if(e.obstacles().some(o=>o.houseId!==site.id&&Math.hypot(o.x-site.x,o.z-site.z)<o.radius+rules.radius+.5))return false;
 if(e.farming?.plots.some(p=>Math.abs(p.x-site.x)<rules.width/2+1.8&&Math.abs(p.z-site.z)<rules.depth/2+1.4))return false;
 // Reserve the entire future food-growing strip as well as existing plots.
 if(farmingSites(e.farming)?.sites.some(p=>Math.abs(p.x-site.x)<rules.width/2+1.8&&Math.abs(p.z-site.z)<rules.depth/2+1.4))return false;
 const door=houseEntrance(site,e.heightAt,e.culture);
 return e.heightAt(door.x,door.z)!==null;
}

import {bindEnvironment,environmentBinding} from './ecs/environment-entities.js';
import * as systems from './ecs/systems/housing.js';
// Stable save type; behaviour executes in world-first systems.
export class VillageHousing {}
export function createHousing(e,{sites=HOUSE_SITES,chapelSites=CHAPEL_SITES,camps=true}={}){const state=new VillageHousing();
state.economy=e;state.campsEnabled=camps;state.sites=sites.map(s=>({...s}));state.chapelSites=chapelSites.map(s=>({...s}));state.projects=[];state.completed=0;state.nextCheck=0;state.nextMove=0;state.consumed={wood:0,stone:0}
 bindEnvironment(state,'Housing');return state;
}
export function housingActive(state,...args){if(state==null)return undefined;return systems.housingActive(environmentBinding(state).world,...args);}
export function housingObstacles(state,...args){if(state==null)return undefined;return systems.housingObstacles(environmentBinding(state).world,...args);}
export function housingMaterialDemand(state,...args){if(state==null)return undefined;return systems.housingMaterialDemand(environmentBinding(state).world,...args);}
export function housingUpdate(state,...args){if(state==null)return undefined;return systems.housingUpdate(environmentBinding(state).world,...args);}
export function housingSettleAdults(state,...args){if(state==null)return undefined;return systems.housingSettleAdults(environmentBinding(state).world,...args);}
export function housingRouteTo(state,...args){if(state==null)return undefined;return systems.housingRouteTo(environmentBinding(state).world,...args);}
export function housingInterrupt(state,...args){if(state==null)return undefined;return systems.housingInterrupt(environmentBinding(state).world,...args);}
export function housingPause(state,...args){if(state==null)return undefined;return systems.housingPause(environmentBinding(state).world,...args);}
export function housingHandle(state,...args){if(state==null)return undefined;return systems.housingHandle(environmentBinding(state).world,...args);}
export function housingSnapshot(state,...args){if(state==null)return undefined;return systems.housingSnapshot(environmentBinding(state).world,...args);}
