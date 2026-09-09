import {structuralCondition} from './ecs/home-entities.js';
import {actorRepairTask} from './ecs/actor-repair-task.js';
import {replaceRepairJobs} from './ecs/repair-state.js';
import {ensureActorRepairTask} from './ecs/actor-repair-task.js';
import {actorVitality} from './ecs/actor-vitality.js';
import {allShelters} from './camp-rules.js';
import {homePosition,assignBeds} from './village-shelter.js';
import {interruptRepair} from './village-repairs.js';
export function repairWishTarget(e,target){
 const home=target?.kind==='house'&&allShelters(e).find(h=>h.id===target.id);
 if(!home||(structuralCondition(home)?.destroyed)||!((structuralCondition(home)?.health)>0))return {valid:false,reason:'Choose a standing damaged house or chapel'};
 if(!((structuralCondition(home)?.maxHealth)>(structuralCondition(home)?.health)))return {valid:false,reason:'This building is already fully repaired'};
 return {valid:true,home,point:homePosition(home),label:'Restore '+(home.name??'this building')+' to full health'};
}
export function repairByWish(e,home){
 const amount=(structuralCondition(home)?.maxHealth)-(structuralCondition(home)?.health);structuralCondition(home).health=(structuralCondition(home)?.maxHealth);structuralCondition(home).lastRepairAt=e.time;
 // Return any paid repair load through the ordinary delivery path. A spell
 // neither consumes it nor creates a refund on top of the physical cargo.
 for(const w of e.workers)if((actorRepairTask(w)?.homeId)===home.id){interruptRepair(e,w);if(w.cargo&&!(actorVitality(w)?.dead)&&!w.divineHeld)e.returnHome(w)}
 if(e.recovery)replaceRepairJobs(e.recovery,e.recovery.repairs.filter(j=>j.homeId!==home.id));
 assignBeds(e);e.emit('wish-repair',null,null,{houseId:home.id,amount});
}
