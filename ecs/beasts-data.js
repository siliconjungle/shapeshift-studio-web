// Stable saved type; behaviour is implemented by ECS systems.
export class VillageBeasts {}
export function validBeastsState(state){return state instanceof VillageBeasts&&state.economy&&typeof state.economy==='object'&&Array.isArray(state.actors)&&Array.isArray(state.countedIds)&&Number.isSafeInteger(state.progress)&&state.progress>=0&&state.progress<=3&&Number.isSafeInteger(state.nextId)&&state.nextId>=0&&Number.isSafeInteger(state.summons)&&state.summons>=0&&Number.isFinite(state.retryAt)&&state.retryAt>=0;}
