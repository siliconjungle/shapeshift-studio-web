import {personKinship} from './ecs/person-kinship.js';
export const parentIds=w=>[...new Set([...((personKinship(w)?.parents)??[]),...((personKinship(w)?.adoptiveParents)??[])])];

export {personKinship,setPersonKinship} from './ecs/person-kinship.js';
