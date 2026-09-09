export {SKILLS,SKILL_THRESHOLDS} from './ecs/development-rules.js';
import {villageWorld} from './ecs/village-world.js';
import * as systems from './ecs/systems/skills.js';
export {skillLevel,skillRate,resourceSkill,workingSkill,skillDetails,validSkills} from './ecs/systems/skills.js';
export function gainSkill(e,...args){return systems.gainSkill(villageWorld(e),...args);}
export function noticeSkillEvent(e,...args){return systems.noticeSkillEvent(villageWorld(e),...args);}
export function preferSpecialist(e,...args){return systems.preferSpecialist(villageWorld(e),...args);}
