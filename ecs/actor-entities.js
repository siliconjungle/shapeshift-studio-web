import {poisonActorInput} from './poison-data.js';
import {performanceActorInput} from './performance-data.js';
import {oakTaskInput} from './oak-data.js';
import {tradeTaskInput} from './actor-trade-data.js';
import {actorHousingInput} from './actor-housing-data.js';
import {repairTaskInput} from './repair-data.js';
import {constructionTaskInput} from './housing-data.js';
import {farmingTaskInput} from './farming-data.js';
import {combatInput} from './combat-data.js';
import {dailyActivityInput} from './daily-activity-data.js';
import {jealousyInput} from './jealousy-data.js';
import {personalityInput} from './personality-data.js';
import {religionInput} from './religion-data.js';
import {developmentInput} from './development-data.js';
import {communityActorInput} from './community-data.js';
import {actorTraditionsInput} from './tradition-data.js';
import {actorDiplomacyInput} from './diplomacy-actor-data.js';
import {curseRelicInput} from './curse-relic-data.js';
import {PersonKinship,personKinshipInput,kinshipFields} from './kinship-data.js';
import {animalParticipationInput} from './animal-participation-data.js';
import {ActorMeal,actorMealInput,mealFields} from './meal-data.js';
import {ActorCookingTask,actorCookingTaskInput,cookingTaskFields} from './cooking-task-data.js';
import {ActorFeeding,actorFeedingInput,feedingFields} from './feeding-data.js';
import {ActorDeprivation,actorDeprivationInput,deprivationFields} from './deprivation-data.js';
import {BeastEffects,beastEffectsInput,beastEffectsFields} from './beast-effects-data.js';
import {BeastCommands,beastCommandsInput,beastCommandsFields} from './beast-commands-data.js';
import {BeastAssociations,beastAssociationsInput,beastAssociationFields} from './beast-associations-data.js';
import {BeastEmotions,beastEmotionsInput,beastEmotionFields} from './beast-emotions-data.js';
import {beastRelationshipsInput} from './beast-relationships-data.js';
import {installBeastRelationships} from './beast-relationships-store.js';
import {BeastLearning,beastLearningInput,beastLearningFields} from './beast-learning-data.js';
import {ActorVitality,actorVitalityInput,vitalityFields} from './vitality-data.js';
import {PersonAge,personAgeInput,ageFields} from './age-data.js';
import {ActorRomance,actorRomanceInput,romanceFields} from './romance-data.js';
import {ActorFeelings,actorFeelingsInput,feelingFields} from './feelings-data.js';
import {ActorMemories,actorMemoriesInput} from './memory-data.js';
import {ActorNeeds,actorNeedsInput} from './needs-data.js';
import {villageWorld} from './village-world.js';
// One identity binding across actor kinds; the referenced component is canonical.
const bindings=new WeakMap();
// The world never replaces a store through its API. Retain the identity store,
// not a component value: removal/replacement must be visible on the next read.
function live(binding,actor){
 if(!binding)return false;
 const {world,identityStore,id}=binding;
 // Cache only ownership validation. Component values are always read afresh.
 // Store revisions also catch direct store edits that bypass world.add/remove.
 if(binding.structure!==world.structuralRevision||binding.identity!==identityStore.valueRevision){
  binding.valid=world.alive(id)&&identityStore.get(id)===actor;
  binding.structure=world.structuralRevision;binding.identity=identityStore.valueRevision;
 }
 return binding.valid;
}
export function validateActorOwner(e,actor){const b=bindings.get(actor);if(live(b,actor)){if(b.world!==villageWorld(e))throw Error('Actor already belongs to another world');}else {curseRelicInput(actor);actorDiplomacyInput(actor);actorTraditionsInput(actor);communityActorInput(actor);developmentInput(actor);religionInput(actor);personalityInput(actor);jealousyInput(actor);dailyActivityInput(actor);combatInput(actor);farmingTaskInput(actor);constructionTaskInput(actor);repairTaskInput(actor);oakTaskInput(actor);performanceActorInput(actor);poisonActorInput(actor);tradeTaskInput(actor);actorHousingInput(actor);animalParticipationInput(actor);actorMealInput(actor);actorCookingTaskInput(actor);actorFeedingInput(actor);actorDeprivationInput(actor);actorVitalityInput(actor);if(actor.species==='beast'){beastLearningInput(actor);beastRelationshipsInput(actor);beastEmotionsInput(actor);beastAssociationsInput(actor);beastCommandsInput(actor);beastEffectsInput(actor);}}}
export function existingActor(e,actor,kind){const b=bindings.get(actor);return live(b,actor)&&b.world===villageWorld(e)&&b.kind===kind?b.id:undefined;}
export function actorEntity(e,actor,definition){
 const world=villageWorld(e),previous=bindings.get(actor);validateActorOwner(e,actor);
 if(live(previous,actor)){if(previous.kind!==definition.name)throw Error('Actor kind cannot change');return previous.id;}
 if(!world.stores.has(definition.name))world.define(definition);
 const meal=actorMealInput(actor),cookingTask=actorCookingTaskInput(actor),feeding=actorFeedingInput(actor),deprivation=actorDeprivationInput(actor),effects=definition.name==='Beast'?beastEffectsInput(actor):undefined,commands=definition.name==='Beast'?beastCommandsInput(actor):undefined,associations=definition.name==='Beast'?beastAssociationsInput(actor):undefined,emotions=definition.name==='Beast'?beastEmotionsInput(actor):undefined,relationships=definition.name==='Beast'?beastRelationshipsInput(actor):undefined,learning=definition.name==='Beast'?beastLearningInput(actor):undefined,vitality=actorVitalityInput(actor),needs=actorNeedsInput(actor),memories=actorMemoriesInput(actor),feelings=actorFeelingsInput(actor),romance=actorRomanceInput(actor),age=definition.name==='Person'?personAgeInput(actor):undefined,kinship=definition.name==='Person'?personKinshipInput(actor):undefined;
 const animalParticipation=definition.name==='Person'?animalParticipationInput(actor):[],curseRelic=curseRelicInput(actor);actorDiplomacyInput(actor);actorTraditionsInput(actor);communityActorInput(actor);developmentInput(actor);religionInput(actor);personalityInput(actor);jealousyInput(actor);dailyActivityInput(actor);combatInput(actor);farmingTaskInput(actor);constructionTaskInput(actor);repairTaskInput(actor);oakTaskInput(actor);performanceActorInput(actor);poisonActorInput(actor);tradeTaskInput(actor);actorHousingInput(actor);
 const id=world.create({[definition.name]:actor});bindings.set(actor,{world,id,kind:definition.name,identityStore:world.store(definition.name),structure:-1,identity:-1,valid:false});
 for(const {definition:part,row,keys} of [...animalParticipation,...curseRelic,...actorDiplomacyInput(actor),...actorTraditionsInput(actor),...communityActorInput(actor),...developmentInput(actor),...religionInput(actor),...personalityInput(actor),...jealousyInput(actor),...dailyActivityInput(actor),...combatInput(actor),...farmingTaskInput(actor),...constructionTaskInput(actor),...repairTaskInput(actor),...oakTaskInput(actor),...performanceActorInput(actor),...poisonActorInput(actor),...tradeTaskInput(actor),...actorHousingInput(actor,definition.name)]){if(!world.stores.has(part.name))world.define(part);world.add(id,part.name,row);for(const key of keys)delete actor[key];}
 if(relationships){installBeastRelationships(world,id,relationships);delete actor.relationships;}
 if(commands){if(!world.stores.has('BeastCommands'))world.define(BeastCommands);world.add(id,'BeastCommands',commands);for(const key of beastCommandsFields)delete actor[key];}
 if(effects){if(!world.stores.has('BeastEffects'))world.define(BeastEffects);world.add(id,'BeastEffects',effects);for(const key of beastEffectsFields)delete actor[key];}
 if(associations){if(!world.stores.has('BeastAssociations'))world.define(BeastAssociations);world.add(id,'BeastAssociations',associations);for(const key of beastAssociationFields)delete actor[key];}
 if(emotions){if(!world.stores.has('BeastEmotions'))world.define(BeastEmotions);world.add(id,'BeastEmotions',emotions);for(const key of beastEmotionFields)delete actor[key];}
 if(learning){if(!world.stores.has('BeastLearning'))world.define(BeastLearning);world.add(id,'BeastLearning',learning);for(const key of beastLearningFields)delete actor[key];}
 if(deprivation){if(!world.stores.has('ActorDeprivation'))world.define(ActorDeprivation);world.add(id,'ActorDeprivation',deprivation);for(const key of deprivationFields)delete actor[key];}
 if(cookingTask){if(!world.stores.has('ActorCookingTask'))world.define(ActorCookingTask);world.add(id,'ActorCookingTask',cookingTask);for(const key of cookingTaskFields)delete actor[key];}
 if(meal){if(!world.stores.has('ActorMeal'))world.define(ActorMeal);world.add(id,'ActorMeal',meal);for(const key of mealFields)delete actor[key];}
 if(feeding){if(!world.stores.has('ActorFeeding'))world.define(ActorFeeding);world.add(id,'ActorFeeding',feeding);for(const key of feedingFields)delete actor[key];}
 if(vitality){if(!world.stores.has('ActorVitality'))world.define(ActorVitality);world.add(id,'ActorVitality',vitality);for(const key of vitalityFields)delete actor[key];}
 if(needs){if(!world.stores.has('ActorNeeds'))world.define(ActorNeeds);world.add(id,'ActorNeeds',needs);delete actor.needs;}
 if(memories){if(!world.stores.has('ActorMemories'))world.define(ActorMemories);world.add(id,'ActorMemories',memories);delete actor.memories;}
 if(feelings){if(!world.stores.has('ActorFeelings'))world.define(ActorFeelings);world.add(id,'ActorFeelings',feelings);for(const key of feelingFields)delete actor[key];}
 if(romance){if(!world.stores.has('ActorRomance'))world.define(ActorRomance);world.add(id,'ActorRomance',romance);for(const key of romanceFields)delete actor[key];}
 if(age){if(!world.stores.has('PersonAge'))world.define(PersonAge);world.add(id,'PersonAge',age);for(const key of ageFields)delete actor[key];}
 if(kinship){if(!world.stores.has('PersonKinship'))world.define(PersonKinship);world.add(id,'PersonKinship',kinship);for(const key of kinshipFields)delete actor[key];}return id;
}
export function actorComponent(actor,name){const b=bindings.get(actor);return live(b,actor)?b.world.stores.get(name)?.get(b.id):undefined;}
export function ensureActorComponent(actor,definition){
 const b=bindings.get(actor);if(!live(b,actor))throw Error('Actor is not a live entity');
 let store=b.world.stores.get(definition.name);
 if(!store){b.world.define(definition);store=b.world.store(definition.name);}
 return store.get(b.id)??b.world.add(b.id,definition.name,{person:actor});
}

export function setActorComponent(actor,definition,value){const b=bindings.get(actor);if(!live(b,actor))throw Error('Actor is not a live entity');if(!b.world.stores.has(definition.name))b.world.define(definition);return b.world.add(b.id,definition.name,value);}

export function actorKind(actor){const b=bindings.get(actor);return live(b,actor)?b.kind:undefined;}

export function actorWorld(actor){const b=bindings.get(actor);return live(b,actor)?b.world:undefined;}
