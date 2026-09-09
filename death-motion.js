export const DEATH_SECONDS=3;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
// Gameplay death is immediate. The presentation gets time to stagger, fall,
// settle on the ground, and only then dissolve.
export function deathPose(actor,time,vitality={}){
 if(!vitality.dead)return {visible:true,angle:0,lift:0,opacity:1,collapse:0};
 const age=Math.max(0,time-vitality.diedAt),fall=smooth((age-.3)/.7),direction=actor.facing==='left'?1:-1;
 const stagger=age<.18?Math.sin(age/.18*Math.PI)*.08:0;
 return {visible:age<DEATH_SECONDS,angle:direction*(fall*Math.PI*.49-stagger),lift:.16*fall,opacity:1-smooth((age-1.65)/(DEATH_SECONDS-1.65)),collapse:smooth(age/.65)};
}
