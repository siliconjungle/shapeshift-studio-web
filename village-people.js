import {actorVitality} from './ecs/actor-vitality.js';
import {rivalPeople,rivalFor,rivalSettlements} from './rival-roster.js';
// Identity survives travel; only economy.workers are residents with jobs/beds.
export const knownPeople=e=>[...e.workers,...rivalPeople(e),...(e.leadership?.exiles??[])];
export const visiblePeople=e=>[...e.workers,...rivalPeople(e).filter(w=>w.visit&&!w.gone)];
// Beasts share social identities, but never jobs, beds, leadership or parenthood.
export const socialPeople=e=>[...knownPeople(e),...(e.beasts?.actors??[])];
export const visibleSocialPeople=e=>[...visiblePeople(e),...(e.beasts?.actors??[]).filter(b=>!(actorVitality(b)?.dead))];
export const nextPersonId=e=>Math.max(-1,...knownPeople(e).map(w=>w.id))+1;
