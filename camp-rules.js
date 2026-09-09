import {defineGameData} from './game-data.js';
import {DAY_LENGTH_SECONDS} from './village-time.js';
export const CAMP_RULES=defineGameData('camps.rules',{beds:2,wood:6,width:4.2,depth:2.7,radius:1.65,height:2.85,health:35,maxCamps:2,lifetime:DAY_LENGTH_SECONDS*2,check:8,rivalCooldown:DAY_LENGTH_SECONDS*5,rivalRaidChance:.25,rivalTravelChance:.04});
export const CAMP_STAGES=defineGameData('camps.stages',[{id:'frame',kind:'wood',amount:2,strikes:2},{id:'cloth',kind:'wood',amount:2,strikes:2},{id:'complete',kind:'wood',amount:2,strikes:2}]);
export const campProjects=e=>(e.housing?.projects??[]).filter(p=>p.kind==='camp');
export const allShelters=e=>[...(e.life?.homes??[]),...campProjects(e).filter(p=>p.owner==='rival').map(p=>p.home).filter(Boolean)];
