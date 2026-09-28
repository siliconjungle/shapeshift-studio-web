// Browser regression: SVGs with only a viewBox must remain whole at all bake
// scales, and rebuilding an edge must not erase internal facial artwork.
import {illustrationExample} from './examples.js';
import {loadImages,poseAt} from '../runtime.js';
import {renderSceneFrame} from '../fx/render.js';
const p=illustrationExample(),images=await loadImages(p),clip=p.clips[0];
p.fx.fluids=[];p.joints=p.joints.filter(j=>j.id==='head');clip.tools=undefined;
p.joints[0].rest.x=0;p.joints[0].rest.y=50;
const row=document.createElement('div');row.style.display='flex';document.body.append(row);
const samples=[];
for(const [edge,scale]of [[false,1],[true,1],[false,2]]){
 p.joints[0].visual.edge.enabled=edge;
 const result=renderSceneFrame(p,images,clip,2,{width:400*scale,height:400*scale,camera:[scale,0,0,scale,200*scale,200*scale]},poseAt);
 const c=document.createElement('canvas');c.width=c.height=400;c.getContext('2d').drawImage(result,0,0,400,400);row.append(c);
 const pixels=c.getContext('2d').getImageData(0,0,400,400).data;
 let area=0,ink=0;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3]>128)area++;if(pixels[i+3]>128&&pixels[i]<70&&pixels[i+1]<70)ink++;}samples.push({area,ink});
}
const passed=samples.every(s=>s.area>10000)&&Math.abs(samples[0].area/samples[2].area-1)<.05&&Math.abs(samples[0].area/samples[1].area-1)<.12&&samples[1].ink>=samples[0].ink*.8;
const report=document.createElement('pre');report.setAttribute('role','status');report.textContent=(passed?'PASS':'FAIL')+' · full SVG silhouette, preserved internal ink, consistent scale\n'+JSON.stringify(samples);document.body.prepend(report);
if(!passed)throw Error('Illustration bake regression');
