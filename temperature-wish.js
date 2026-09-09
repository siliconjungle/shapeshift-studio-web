import {lifeClock} from "./ecs/life-state.js";
import {defineGameData} from './game-data.js';
import {ambientTemperature} from './weather-temperature.js';
export const TEMPERATURE_WISH_RULES=defineGameData('temperature-wish.TEMPERATURE_WISH_RULES',Object.freeze({hot:35,cold:5,duration:60,fade:20,min:-10,max:45}));
const strength=e=>Math.max(0,Math.min(1,((e.wishes?.temperatureShift?.until??-Infinity)+TEMPERATURE_WISH_RULES.fade-e.time)/TEMPERATURE_WISH_RULES.fade));
const target=shift=>Number.isFinite(shift?.target)?shift.target:shift?.kind==='hot'?TEMPERATURE_WISH_RULES.hot:shift?.kind==='cold'?TEMPERATURE_WISH_RULES.cold:null;
export function activeTemperatureWish(e){return strength(e)>0?e.wishes?.temperatureShift?.kind:null;}
function naturalTemperature(e,weather){
 const rain=e.wishes?.rainUntil>e.time?Math.max(.7,weather.rain??0):weather.rain??0;
 return Number.isFinite(weather.temperature)?weather.temperature:ambientTemperature(e.culture,lifeClock(e.life)?.hour??12,{...weather,rain});
}
function affectedTemperature(e,base){
 const shift=e.wishes?.temperatureShift,goal=target(shift),amount=strength(e);
 // Hold the chosen condition through changing weather, then blend back to
 // the current natural climate. Old named spells acquire the same semantics.
 const degrees=goal!==null?goal+(base-goal)*(1-amount):base+(shift?.offset??0)*amount;
 return Math.max(TEMPERATURE_WISH_RULES.min,Math.min(TEMPERATURE_WISH_RULES.max,degrees));
}
export function temperatureOffset(e,weather=e.wishDrawContext??{}){
 const base=naturalTemperature(e,weather);return affectedTemperature(e,base)-base;
}
export function villageAirTemperature(e,weather=e.wishDrawContext??{}){
 return affectedTemperature(e,naturalTemperature(e,weather));
}
export function changeTemperatureByWish(e,kind){
 e.wishes.temperatureShift={kind,target:TEMPERATURE_WISH_RULES[kind],until:e.time+TEMPERATURE_WISH_RULES.duration};
 e.temperature=villageAirTemperature(e);
}
export function temperatureDescription(degrees){
 const label=degrees<5?'Freezing':degrees<15?'Cold':degrees<26?'Mild':degrees<33?'Hot':'Very hot';
 return {label,text:`${label} · ${Math.round(degrees)}°C`,level:degrees<15?'cold':degrees<26?'mild':'hot'};
}
