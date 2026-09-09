// Effects may begin before the player opens their hand (NPCs, environment and
// authored commands). Allocate the legacy render/event records without drawing
// cards or consuming simulation randomness. wishState deals the first hand later.
export function wishPresentationState(e){return e.wishes??={queue:[],draw:[],used:0,burns:[],scenery:[],rainUntil:0,pending:[],casts:[],deferredHand:true}}
