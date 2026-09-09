import {villageWorld} from './village-world.js';
import {TraditionsState} from './tradition-data.js';
export {TraditionsState} from './tradition-data.js';
const bindings=new WeakMap();
export function traditionEntity(state){const b=bindings.get(state);if(!b||!b.world.alive(b.id)||b.world.get(b.id,'TraditionsState')!==state||b.world.resources.get('Traditions')!==state)throw Error('Traditions are not active');return b.id;}
export function restoreTraditions(e){
 const world=villageWorld(e),state=e.traditions,old=world.resources.get('Traditions');
 if(state!=null&&!TraditionsState.validate(state))throw Error('Invalid TraditionsState');
 const bound=state&&bindings.get(state);if(bound){traditionEntity(state);if(bound.world!==world)throw Error('Foreign TraditionsState');}
 if(!world.stores.has('TraditionsState'))world.define(TraditionsState);
 if(old&&old!==state){const b=bindings.get(old);if(b)world.destroy(b.id);world.resources.delete('Traditions');}
 if(state==null)return state;
 if(!bound){const id=world.create({TraditionsState:state});bindings.set(state,{world,id});world.setResource('Traditions',state);}
 Object.defineProperty(e,'traditions',{enumerable:true,configurable:true,get(){const current=world.resources.get('Traditions'),b=current&&bindings.get(current);return b&&world.alive(b.id)&&world.get(b.id,'TraditionsState')===current?current:undefined;}});
 return state;
}
export function createTraditions(e,values){if(e.traditions!=null)throw Error('Traditions already exist');if(!TraditionsState.validate(values))throw Error('Invalid TraditionsState');Object.defineProperty(e,'traditions',{value:values,writable:true,enumerable:true,configurable:true});restoreTraditions(e);return values;}
export function setTraditionsState(state,values){traditionEntity(state);if(Object.keys(values).some(k=>!['nextAt','sequence'].includes(k))||!TraditionsState.validate({...state,...values}))throw Error('Invalid TraditionsState');Object.assign(state,values);return state;}
