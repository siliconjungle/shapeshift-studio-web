const clamp=t=>Math.max(0,Math.min(1,t));
export function birdFlightPosition(f,time){const delay=f.takeoffDuration??0,t=clamp((time-f.at-delay)/Math.max(.1,f.duration-delay)),q=t*t*(3-2*t);return {x:f.from.x+(f.to.x-f.from.x)*q,z:f.from.z+(f.to.z-f.from.z)*q,y:f.from.y+(f.to.y-f.from.y)*q+Math.sin(Math.PI*q)*f.arc,t,q};}
