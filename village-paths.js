// A narrow permanent foothold between the original doors and first crop.
// Extensions into the wider village are earned by actual foot traffic.
export const PERMANENT_PATH_RADIUS=.34;
export const VILLAGE_PATHS=[
 [[.25,.6],[-4.9,-2.65],0],[[.25,.6],[4.6,-2.65],0],
 [[.25,.6],[0,-3.5],0],[[.25,.6],[-2.9,1],0]
];
export function villagePathDistance(x,z){return Math.min(...VILLAGE_PATHS.map(([a,b,offset])=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)+offset}))}
const gl=n=>Number.isInteger(n)?n+'.':String(n);
export const VILLAGE_PATH_GLSL='float path=10000.;\n'+VILLAGE_PATHS.map(([a,b,o])=>`path=min(path,segment(p,vec2(${a.map(gl)}),vec2(${b.map(gl)}))+${gl(o)});`).join('\n');
