import {defineGameData} from './game-data.js';
import {villageWorld} from './ecs/village-world.js';
import {createSnakeState} from './ecs/snake-state.js';
import * as systems from './ecs/systems/snakes.js';
export const SNAKE_RULES=defineGameData('village-snakes.RULES',{max:4,firstAt:100,interval:85,chance:.6,speed:.85,fleeSpeed:1.8,warning:.65,biteRange:1.15,biteCooldown:22,lifetime:220});
export const SNAKE_NAMES={hearth:'Bramble viper',solis:'Sunscale viper'};
export {snakeOpacity} from './ecs/systems/snakes.js';
export function snakeState(e){return SNAKE_NAMES[e.culture]?createSnakeState(e,SNAKE_RULES.firstAt):undefined;}
export function spawnSnake(e,...args){return systems.spawnSnake(villageWorld(e),...args)}
export function updateSnakes(e,...args){return systems.updateSnakes(villageWorld(e),...args)}
export function validSnakes(e,...args){return systems.validSnakes(villageWorld(e),...args)}
