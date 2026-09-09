// Five real minutes per full day. All routines use this same clock.
export const DAY_LENGTH_SECONDS=300;
export const wrapHour=hour=>((hour%24)+24)%24;
export const advanceHour=(hour,seconds)=>wrapHour(hour+Math.max(0,seconds)*24/DAY_LENGTH_SECONDS);
export const isBedtime=(hour,bed=20.5,wake=6.2)=>hour>=bed||hour<wake;
