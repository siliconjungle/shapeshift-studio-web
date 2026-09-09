import {villageWorld} from './ecs/village-world.js';
import {ghostVisits} from './ecs/ghost-visits.js';
import {handleGhostConversationSystem,ghostReactionSystem,spawnGhostSystem,updateGhostsSystem} from './ecs/systems/ghosts.js';
export {GHOST_RULES,ghostNight,validGhostState} from './ecs/ghost-data.js';
export function createGhostState(e){const state={actors:[],wasNight:false,rollAt:null,serial:0,visits:0};ghostVisits(e,state);return state;}
export const handleGhostConversation=(e,w)=>handleGhostConversationSystem(villageWorld(e),w);
export const ghostReaction=(e,g,w)=>ghostReactionSystem(villageWorld(e),g,w);
export const spawnGhost=(e,grave)=>spawnGhostSystem(villageWorld(e),grave);
export const updateGhosts=(e,dt)=>updateGhostsSystem(villageWorld(e),dt);
