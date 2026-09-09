import {slimeDamage} from './village-slimes.js';
import {raiderDamage} from './village-raids.js';
// Damage routes to the owning system; renderers only consume its emitted events.
export function damageEnemy(e,kind,actor,...args){return kind==='slime'?slimeDamage(e.slimes,actor,...args):raiderDamage(e.raids,actor,...args);}
