// One shared timer uses simulation time, so pause and offline saves cannot
// bypass it. Views only read the remaining time.
export const WISH_COOLDOWN_SECONDS=8;
export function wishCooldown(e){
 const remaining=Math.max(0,Math.round(((e.wishes?.cooldownUntil??0)-e.time)*1e6)/1e6);
 return {remaining,ratio:Math.min(1,remaining/WISH_COOLDOWN_SECONDS)};
}
