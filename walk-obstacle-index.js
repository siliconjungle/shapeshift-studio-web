// Per-search snapshot: felling trees, constructing buildings and moving props
// take effect on the next route. Buckets preserve the original obstacle order.
const EMPTY=Object.freeze([]),CELL=4;
export function walkObstacleLookup(obstacles){
 if(obstacles.length<12||obstacles.some(o=>!Number.isFinite(o.radius)||o.radius>32))return ()=>obstacles;
 const buckets=new Map();
 for(const o of obstacles){const r=o.radius+.22;for(let z=Math.floor((o.z-r)/CELL);z<=Math.floor((o.z+r)/CELL);z++)for(let x=Math.floor((o.x-r)/CELL);x<=Math.floor((o.x+r)/CELL);x++){const key=x+','+z;let bucket=buckets.get(key);if(!bucket)buckets.set(key,bucket=[]);bucket.push(o);}}
 return (x,z)=>buckets.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))??EMPTY;
}
