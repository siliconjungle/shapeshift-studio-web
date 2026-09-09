import {campaignWorldBounds,previousWorldBounds,worldLayout} from './village-layout.js';
export function expansionSites(seed=1,layout=worldLayout){
 let state=(seed^0x36ce129b)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const b=campaignWorldBounds({worldLayout:layout}),old=previousWorldBounds(layout),points=[];
 // Jittered parcels leave connected corridors between clearings. The rear
 // horizon remains fixed; the extra land extends sideways and toward the camera.
 for(let z=b.back+7;z<b.front-7;z+=12)for(let x=b.left+7;x<b.right-7;x+=12){
  if(x>old.left-6&&x<old.right+6&&z<old.front+6)continue;
  points.push({x:x+(random()-.5)*2,z:z+(random()-.5)*2});
 }
 points.sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
 const houses=points.slice(0,12).map((p,i)=>({...p,id:'house-expansion-'+i,radius:5}));
 const farms=points.slice(12,18).flatMap((p,i)=>[-1,0,1].map((r,j)=>({id:`farm-expansion-${i*3+j}`,x:p.x,z:p.z+r*2.4,radius:2.5})));
 const chapels=points.slice(18,21).map((p,i)=>({...p,id:'chapel-expansion-'+i,radius:5.5}));
 const towers=points.slice(21,29).map((p,i)=>({...p,id:'watchtower-expansion-'+i,kind:'watchtower',radius:5}));
 return {houses,farms,chapels,towers,clearings:[...houses,...farms,...chapels,...towers]};
}
