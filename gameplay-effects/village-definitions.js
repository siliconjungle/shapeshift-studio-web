import {createRegistry} from './definitions.js';
import {WISH_RULES} from '../wish-rules.js';
import {DIVINE_RULES} from '../divine-rules.js';
import {DOMAIN_ABILITIES} from './domain-catalog.js';
export function villageDefaults(){return[
 {id:'miracle.fire',version:1,type:'ability',target:{requires:['Ignitable']},steps:[{op:'ignite',effect:'burning'}],presentation:'miracle.fire'},
 {id:'miracle.life',version:1,type:'ability',steps:[{op:'restore'}],presentation:'miracle.life'},
 {id:'miracle.skull',version:1,type:'ability',target:{requires:['Mortal'],alive:true},steps:[{op:'kill',cause:'god-wish'}],presentation:'miracle.skull'},
 {id:'miracle.shield',version:1,type:'ability',target:{requires:['Protectable'],alive:true},steps:[{op:'apply',effect:'protected'}],presentation:'miracle.shield'},
 {id:'burning',version:1,type:'effect',duration:WISH_RULES.burnDuration,period:1,tick:[{op:'damage',amount:WISH_RULES.burnDamage,cause:'fire',select:{requires:['Vitality'],alive:true}}],stack:{mode:'ignore',scope:'target'},presentation:'miracle.fire'},
 {id:'protected',version:1,type:'effect',duration:DIVINE_RULES.shieldSeconds,stack:{mode:'refresh',scope:'source'},modifiers:[{stat:'protection',mode:'override',value:1}],presentation:'miracle.shield'},
 {id:'warmth',version:1,type:'effect',duration:null,modifiers:[{stat:'temperature',mode:'add',value:5}],presentation:'aura.warmth'},
 {id:'lantern-warmth',version:1,type:'effect',duration:null,sourceBound:true,aura:{effect:'warmth',interval:.25,select:{from:'world',requires:['Vitality'],alive:true,radius:3,relation:'ally'}}},
 ...DOMAIN_ABILITIES,
]}
export const VILLAGE_ABILITIES=villageDefaults();
export const villageEffectRegistry=createRegistry(VILLAGE_ABILITIES);
export const villageRulesKey=()=>JSON.stringify([WISH_RULES.burnDuration,WISH_RULES.burnDamage,DIVINE_RULES.shieldSeconds]);
