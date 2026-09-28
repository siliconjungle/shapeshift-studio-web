const spatialPoint=value=>value;
const terrainCulture=(world,node)=>node.culture??world.culture;
export const BUTTERFLY_RULES=Object.freeze({period:165,visit:48,firstVisit:25,range:3.2,happiness:5,moodSeconds:20,noticeCooldown:180});
const fields=new WeakMap(),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
export function butterflyField(e){
 if(fields.has(e))return fields.get(e);
 const depot=e.depot??{x:0,z:0},trees=(e.nodes??[]).filter(n=>n.kind==='wood'&&terrainCulture(e,n)==='hearth').sort((a,b)=>(a.x-spatialPoint(depot).x)**2+(a.z-spatialPoint(depot).z)**2-((b.x-spatialPoint(depot).x)**2+(b.z-spatialPoint(depot).z)**2));
 const centers=[];
 for(const tree of trees){if(centers.some(p=>Math.hypot(p.x-tree.x,p.z-tree.z)<5))continue;centers.push({x:tree.x+1.2,z:tree.z+1.4});if(centers.length===5)break;}
 if(!centers.length&&terrainCulture(e,depot)==='hearth')centers.push({x:spatialPoint(depot).x+3,z:spatialPoint(depot).z+2});
 const field=centers.flatMap((p,id)=>{let floor=-Infinity;for(let dx=-2.4;dx<=2.4;dx+=.6)for(let dz=-1.8;dz<=1.8;dz+=.6){const h=e.heightAt(p.x+dx,p.z+dz);if(!Number.isFinite(h))return [];floor=Math.max(floor,h);}return [{...p,id,floor}];});
 fields.set(e,field);return field;
}
// Flight derives from saved simulation time, not rendering or per-frame random
// draws. Reloading, pausing and different frame rates retain the same visitors.
export function sampleButterflyPositions(e,time=e.time,{hour=12,weather={}}={}){
 if(!e.regions&&e.culture!=='hearth')return [];
 const daylight=smooth((hour-7)/.8)*smooth((18.5-hour)/.8),dry=1-smooth((weather.rain??0)/.3);
 const elapsed=time-BUTTERFLY_RULES.firstVisit;if(elapsed<0||daylight*dry<=0)return [];
 const cycle=Math.floor(elapsed/BUTTERFLY_RULES.period),age=elapsed% BUTTERFLY_RULES.period;
 if(age>=BUTTERFLY_RULES.visit)return [];
 const field=butterflyField(e),patch=field[cycle%field.length];if(!patch)return [];
 const alpha=smooth(age/5)*smooth((BUTTERFLY_RULES.visit-age)/6)*daylight*dry;
 return Array.from({length:cycle%2?2:3},(_,i)=>{
  const phase=age*.62+i*2.4,drift=age*.16+i,settle=.5+.5*Math.sin(age*.23+i*1.8);
  return {id:`butterfly-${cycle}-${i}`,x:patch.x+Math.sin(phase)*1.5+Math.sin(drift)*.45,z:patch.z+Math.cos(phase*.73)*1.15+Math.sin(drift*.8)*.35,y:patch.floor+.8+settle*1.2+Math.sin(phase*1.8)*.16,alpha};
 });
}
