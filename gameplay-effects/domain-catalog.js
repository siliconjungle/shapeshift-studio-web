// Pure authoring metadata: loading Studio's definition library does not import
// simulation controllers. Each operation owns a bounded, validated vocabulary.
export const DOMAIN_OPERATIONS={
 'person.poison':['poison','purify'],
 'relic.invoke':Object.keys(RELIC_MIRACLES),
 'beast.command':['praise','scold','beast-feast','guard','play','rampage','lullaby'],
 'person.age':['age-adult','age-child','age-elder'],
 'person.learn':['upgrade-farming','upgrade-woodcutting','upgrade-mining','upgrade-building','upgrade-cooking','upgrade-exploring','upgrade-caregiving','upgrade-diplomacy','upgrade-combat'],
 'village.suggest':['ping','leave-here'],
 'nature.invoke':['animal-bond','call-wild','dream','acorn'],
 'fauna.summon':['rat','owl'],
 'leadership.uprising':['uprising'],
 'person.behaviour':['violence','sleep'],
 'structure.repair':['repair'],
 'person.curse':['curse'],
 'person.lift':['hand'],
 'relationship.bond':['friendship','enmity'],
 'relationship.commit':['love'],
 'relationship.separate':['heartbreak'],
 'person.summon':['newcomer'],
 'person.resurrect':['resurrect'],
 'person.energize':['energy'],
 'resource.grant':['wood','stone','food'],
 'weather.temperature':['hot','cold'],
 'world.time':['daybreak','nightfall'],
 'weather.clear':['clear-skies'],
 'weather.rain':['rain'],
};
export const DOMAIN_ABILITIES=Object.entries(DOMAIN_OPERATIONS).flatMap(([op,wishes])=>wishes.map(wish=>({id:'miracle.'+wish,version:1,type:'ability',steps:[{op,wish}],presentation:'miracle.'+wish})));
export function validateDomainStep(step){if(DOMAIN_OPERATIONS[step.op]&&!DOMAIN_OPERATIONS[step.op].includes(step.wish))throw new TypeError(`Invalid ${step.op} wish: ${step.wish}`)}
import {RELIC_MIRACLES} from '../relic-miracle-catalog.js';
