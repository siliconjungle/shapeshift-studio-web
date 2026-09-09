import {VILLAGE_ABILITIES} from '../../../gameplay-effects/village-definitions.js';
export const installLittleGodsAbilities=()=>({op:'ability.install',integration:'little-gods',definitions:structuredClone(VILLAGE_ABILITIES)});
