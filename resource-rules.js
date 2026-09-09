import {defineGameData} from './game-data.js';
export const RESOURCE_RULES=defineGameData('village-economy.RESOURCE_RULES',{food:{amount:2,regrow:28,grow:6,hits:1,action:'harvest',contact:'pull'},wood:{amount:3,regrow:65,grow:10,hits:3,action:'chop',contact:'chop'},stone:{amount:3,regrow:null,grow:0,hits:3,action:'mine',contact:'mine'}});
