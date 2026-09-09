import {actorOakTask} from './ecs/actor-oak-task.js';
import {actorResidence,ensureActorResidence} from './ecs/actor-residence.js';
import {actorSocialActivity} from "./ecs/daily-activity-actors.js";
import {actorPrayer} from "./ecs/religion-actors.js";
import {actorRecovery,actorLearning} from "./ecs/development-actors.js";
import {actorOccasion} from "./ecs/actor-occasion.js";
import {actorCurseCare} from './ecs/actor-curse-relic.js';
import {birdParticipant,wildlifeParticipant} from './ecs/animal-participants.js';
import {actorMeal} from './ecs/actor-meal.js';


import {actorFeelings} from './ecs/actor-feelings.js';

import {careParticipant} from './ecs/care-participants.js';

import {CUSTOMS,SOCIAL_CUSTOMS} from './village-traditions.js';

const careStates=new Set(['mealbound','homebound','meeting','waiting-friend','eating','resting','sleeping','socialising']);
export function activityLabel(w){
 if(w.state==='poison-tending')return 'Tending to someone poisoned';
 if(w.state==='poison-care-bound')return 'Going to help someone poisoned';
 if(w.state==='poison-rest')return 'Resting while poison is treated';
 if(actorOakTask(w)?.job)return w.state==='oak-digging'?'Digging a hole for an oak':w.state==='oak-planting'?'Planting an acorn':w.state==='oak-tending'?'Tending the young oak':'Walking to the oak planting spot';
 if(birdParticipant(w)?.job)return birdParticipant(w)?.job.kind==='swat'?'Protecting crops from birds':'Shooing a bird';
 if(wildlifeParticipant(w)?.job)return ({hunt:'Hunting for food',befriend:'Making friends with an animal',protect:'Trying to stop a hunt',butcher:'Gathering meat'})[wildlifeParticipant(w)?.job.kind];
 if(w.state==='magic-casting')return 'Granting a personal wish';
 if(w.state==='magic-approaching')return 'Approaching a spell target';
 if(w.state==='magic-attuning')return 'Attuning to a crystal';
 if(w.state==='magic-discovering')return 'Investigating a crystal';
 if(w.state?.startsWith('relic-'))return ({'relic-bound':'Seeking a treasured relic','relic-carrying':'Carrying a treasured relic instead of working','relic-admiring':'Admiring a treasured relic','relic-stealing':'Trying to steal a relic','relic-fighting':'Fighting over a relic'})[w.state]??'Thinking about a relic';
 if(w.frenzy)return 'In a frenzy';
 if(w.state==='curse-bound')return (actorCurseCare(w)?.task)?.response==='avoid'?'Keeping away from a curse':'Going to help someone cursed';
 if(w.state==='curse-cleansing')return 'Trying to lift a curse';
 if(w.state==='curse-comforting')return 'Comforting someone cursed';
 if(w.sleepWish&&w.state==='homebound')return 'Heading to bed for a nap';
 if(w.state==='sleeping'&&(actorRecovery(w)?.guest))return 'Sleeping at a neighbour’s home';
 if(w.state==='apprentice-bound')return 'Going to watch an experienced villager';
 if(w.state==='apprentice-learning')return ({watch:'Watching a demonstration',try:'Trying it for myself',fumble:'Oops — trying to get the hang of it',encourage:'Listening to encouragement',retry:'Giving it another try',success:'Getting the hang of it'})[(actorLearning(w)?.lesson)?.stage]??'Learning by watching and practising';
 if(w.state?.startsWith('awakening-'))return ({'awakening-bound':'Bringing strength and supplies to a beast ritual','awakening-building':'Building the beast effigy','awakening-tending':'Feeding and soothing the little spirit','awakening-pledging':'Sharing vitality with the summoning circle','awakening-chanting':'Calling the beast to life'})[w.state]??'Preparing a beast ritual';
 if(['idle','resting','mealbound'].includes(w.state)&&(actorFeelings(w)?.refusingFoodNow))return 'Too heartbroken to eat';
 if(['idle','resting','outbound','working'].includes(w.state)&&(actorFeelings(w)?.withdrawnNow))return 'Keeping to themselves';
 if(careParticipant(w)?.elderVisit)return ({'care-foodbound':'Fetching an elder’s meal','care-bound':'Visiting an elder',caring:'Listening to an elder’s stories','awaiting-care':'Waiting for a family visit','receiving-care':'Sharing memories and receiving care'})[w.state]??'Visiting family';
 if(SOCIAL_CUSTOMS.includes((actorOccasion(w)?.kind))&&w.state?.startsWith('occasion-'))return w.state==='occasion-sharing'?CUSTOMS[(actorOccasion(w)?.kind)].label:'Joining '+CUSTOMS[(actorOccasion(w)?.kind)].label.toLowerCase();
 const cooking={'pot-fetch':'Fetching the cooking pot','pot-carry':'Setting the pot on the fire','cooking-fetch':'Fetching ingredients','cooking-carry':'Bringing food to the pot','cooking-add':'Adding ingredients','cooking-stir':'Stirring the pot','stew-wait-bound':'Gathering for supper','stew-wait':'Waiting for the stew','stew-bound':'Collecting a bowl of stew','stew-to-seat':'Taking a bowl to the gathering'}[w.state];if(cooking)return cooking;
 if(w.state==='eating'&&(actorMeal(w)?.cookedMeal))return 'Sharing freshly cooked stew';
 if(w.state==='beast-playing')return 'Playing with the village beast';
 if(w.state==='cooling-bound')return 'Going inside to cool down';
 if(w.state==='cooling')return 'Cooling down in shelter';
 if(w.divineHeld)return 'Being carried by the divine hand';
 if(w.arsonTargetId)return 'Trying to burn the sanctuary';
 const leadership={'leader-bound':'Going to lead a service','leader-sermon':'Leading a service','ritual-fetch':'Collecting extra firewood','ritual-deliver':'Adding wood to the campfire','ritual-building':'Building the ritual stake','ritual-captive':'Held for a hostile tribal ritual','ritual-victim-bound':'Being led to the fire','ritual-bound':'Held at the stake','ritual-leader-bound':'Preparing a ritual','ritual-presiding':'Presiding over the ritual','ritual-attend-bound':'Joining a ritual','ritual-attending':'Witnessing a ritual','revolt-bound':'Joining the uprising','revolt-fighting':'Fighting in the uprising','exile-bound':'Leaving the village',exiled:'Exiled'}[w.state];if(leadership)return leadership;
 if(w.state==='praying')return 'Asking for '+({rain:'rain',food:'food',return:'a loved one to return',company:'companionship',shelter:'a place to sleep'}[(actorPrayer(w)?.request)?.kind]??'help');
 if(w.state==='prayer-bound')return 'Going to ask for help';
 if((actorResidence(w)?.homeless)&&w.state==='resting')return 'Resting outside · no bed available';
 if(w.state==='socialising'&&actorSocialActivity(w)?.socialKind==='quiet')return 'Quiet company';
 if(w.state==='socialising')return actorSocialActivity(w)?.socialKind==='argument'?'A disagreement':actorSocialActivity(w)?.socialKind==='affection'?'A quiet moment together':'Sharing stories';
 return ({'actor-bound':'Heading to a village performance','actor-wait':'Waiting for the audience','actor-performing':'Performing a story','actor-watching':'Enjoying a performance','scarecrow-fetch':'Fetching wood for a scarecrow','scarecrow-bound':'Carrying scarecrow materials','scarecrow-building':'Building a scarecrow','rival-arriving':'Arriving from the other tribe','rival-visiting':'Visiting the village','rival-raiding':'Raiding the village','away':'Living with the other tribe','rival-council':'Discussing a newcomer joining','rival-meeting':'Meeting someone from the other tribe','rival-captive':'Being taken from the village','rival-leaving':'Leaving with the other tribe','ghost-listening':'Listening to a ghost','repair-inspect-bound':'Going to inspect building damage','repair-inspecting':'Inspecting the damage','repair-fetch':'Fetching repair materials','repair-bound':'Carrying materials to a damaged home','repairing':'Repairing the building','rescue-bound':'Going to help a child','escorting-child':'Escorting a child to safety','child-escaping':'Getting away from danger','child-escorted':'Following someone to safety','occasion-fetch':'Bringing food to the gathering','occasion-bound':(actorOccasion(w)?.kind)==='welcome'?'Going to greet the newcomer':'Joining a village gathering','occasion-wait':(actorOccasion(w)?.kind)==='welcome'?'Waiting to say hello':'Waiting for the others','occasion-sharing':(actorOccasion(w)?.kind)==='welcome'?'Welcoming a new neighbour':(actorOccasion(w)?.kind)==='recovery'?'Recovering together after danger':(actorOccasion(w)?.kind)==='memorial'?'Remembering someone together':(actorOccasion(w)?.kind)==='birth'?'Welcoming a newborn':'Sharing a meal together','companion-bound':'Fetching a companion','companion-ready':'Preparing to return together','escort-wait':'Waiting for a friend',escorting:'Accompanying a friend','escort-guard':'Keeping watch for a friend','support-fetch':'Fetching food for a friend','support-bound':'Going to help a friend',supporting:'Keeping a friend company','trade-loading':'Collecting a barter payment','trade-fetch':'Collecting a barter payment','trade-bound':'Taking supplies to Mallow','trade-bargaining':'Trading with Mallow','replant-bound':'Going to replant crops',replanting:'Replanting crops','house-fetch':'Fetching building materials','house-deliver':'Carrying materials to the house','house-bound':'Going to build','house-building':'Building a new home','farm-bound':'Going to prepare a food plot','preparing-plot':'Preparing a food plot','planting-plot':'Planting crops','care-foodbound':'Fetching a child’s meal','care-bound':'Going to care for a child',caring:'Caring for a child','awaiting-care':'Waiting for care','receiving-care':'Spending time with a caregiver',dead:'Deceased',alerted:'Alarm!','defense-bound':'Defending the camp',defending:'Fighting',fleeing:'Seeking shelter',sheltering:'Sheltering',recovering:'Recovering supplies','stone-bound':'Fetching stone','ring-bound':'Carrying stone','building-ring':'Building the fire ring','firewood-bound':'Fetching firewood','fire-bound':'Carrying firewood','loading-fire':'Adding firewood','tending-fire':'Lighting the fire','warming-bound':'Going to warm up',warming:'Warming up','meal-to-fire':'Taking supper to the fire',following:'Playing near home',mealbound:'Going for a meal',homebound:'Heading home',meeting:'Meeting a friend','waiting-friend':'Waiting for a friend',eating:'Eating',resting:'Taking a break',sleeping:'Sleeping at home',outbound:w.node?.kind==='stone'?'Going to mine stone':w.node?.foodSource==='mushroom'?'Going to forage mushrooms':w.job==='food'?'Going to the garden':'Going to the grove',working:w.node?.foodSource==='mushroom'?'Picking mushrooms':w.node?.kind==='food'?'Harvesting':w.node?.kind==='stone'?'Mining stone':'Woodcutting',returning:'Carrying supplies',unloading:'Putting supplies away','waiting-return':'Finding a way home'})[w.state]??'Looking around';
}
export const isCareState=state=>careStates.has(state);
