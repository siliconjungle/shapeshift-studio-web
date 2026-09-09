import {villageWorld} from './village-world.js';
import {validBeastsState} from './beasts-data.js';
import {villageBeasts} from './beast-entities.js';
export function bindBeastsState(state){
 if(!validBeastsState(state))throw Error('Invalid beasts state');
 const world=villageWorld(state.economy),active=world.resources.get('Beasts');if(active&&active!==state)throw Error('Beasts are already active');
 villageBeasts(state);world.setResource('Beasts',state);state.economy.beasts=state;return state;
}
export function restoreBeastsState(e){const world=villageWorld(e),state=e.beasts;if(state&&state.economy!==e)throw Error('Invalid beasts ownership');world.resources.delete('Beasts');if(state)bindBeastsState(state);}
export function beastsWorld(state){const world=villageWorld(state.economy);if(world.resources.get('Beasts')!==state||state.economy.beasts!==state)throw Error('Beasts state is no longer active');return world;}
