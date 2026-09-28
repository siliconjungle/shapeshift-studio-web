import polygonClipping from 'polygon-clipping';
import {svgText,validateVector} from '@shapeshift-labs/studio-core/vector/model';
import {identity} from '@shapeshift-labs/studio-core/joint-transforms';
function ring(shape){let i=0,last,first,out=[];for(const c of shape.commands){if(c==='M'||c==='L'){last=shape.points.slice(i,i+2);i+=2;out.push(last);first??=last;}else if(c==='C'){const a=last,b=shape.points.slice(i,i+2),d=shape.points.slice(i+2,i+4),e=shape.points.slice(i+4,i+6);i+=6;for(let j=1;j<=12;j++){const t=j/12,u=1-t;out.push([u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*d[0]+t**3*e[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*d[1]+t**3*e[1]]);}last=e;}else if(c==='Z')out.push(first);}return out;}
function resample(points,n,center){if(points.length<2)return Array.from({length:n},()=>center);const ds=[0];for(let i=1;i<=points.length;i++)ds.push(ds.at(-1)+Math.hypot(points[i%points.length][0]-points[i-1][0],points[i%points.length][1]-points[i-1][1]));const total=ds.at(-1);return Array.from({length:n},(_,i)=>{const d=total*i/n;let j=1;while(j<ds.length-1&&ds[j]<d)j++;const t=(d-ds[j-1])/(ds[j]-ds[j-1]||1),a=points[j-1],b=points[j%points.length];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];});}
export function expandClips(shapes){return shapes.map(shape=>{
 if(!shape.clip)return shape;const clip=shapes.find(s=>s.id===shape.clip),boundary=ring(clip),source=ring(shape),center=[boundary.reduce((s,p)=>s+p[0],0)/boundary.length,boundary.reduce((s,p)=>s+p[1],0)/boundary.length];let points;
 if(shape.fill==='none'){
  const inside=([x,y])=>{let hit=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  points=resample(source.filter(inside),32,center);return {...shape,clip:undefined,commands:['M',...Array(31).fill('L')],points:points.flat()};
 }
 const result=polygonClipping.intersection([source],[boundary]),poly=result[0]?.[0]??[];points=resample(poly,64,center);
 return {...shape,clip:undefined,commands:['M',...Array(63).fill('L'),'Z'],points:points.flat(),opacity:poly.length?shape.opacity:0};
});}
const rounded=a=>a.map(x=>Math.round(x*100)/100);
// Bake a performance to normal Studio joints + editable vector point tracks.
// Artwork stays vector; compatible points interpolate between samples.
export function bakePortrait({name,duration,frameAt,fps=24,vectorFPS=12}){
 const first=frameAt(0),frames=[];for(let i=0;i<=Math.ceil(duration*vectorFPS);i++)frames.push({time:Math.min(duration,i/vectorFPS),frame:frameAt(Math.min(duration,i/vectorFPS))});
 for(const f of frames)for(const l of f.frame.layers)l.shapes=expandClips(l.shapes);
 const project={format:'inkwell-puppet',version:1,name,source:{portrait:true,character:'frog-wizard',bakedFrom:'inkwell-portrait'},assets:[],joints:[],clips:[{id:'performance',name,duration,fps,loop:true,tracks:{}}]};
 const shapeByLayer=new Map();for(const {frame}of frames)for(const l of frame.layers){let bucket=shapeByLayer.get(l.id);if(!bucket){bucket=new Map();shapeByLayer.set(l.id,bucket);}for(const s of l.shapes)if(!bucket.has(s.id))bucket.set(s.id,s);}
 for(const l of first.layers){
  const j={id:l.id,name:l.id.replaceAll('-',' '),parent:l.parent,layer:l.order,rest:{...identity(),scaleX:l.t.scaleX<0?-1:1}};
  const sourceShapes=[...shapeByLayer.get(l.id).values()];
  if(sourceShapes.length){
   const v={version:1,viewBox:[-410,-400,820,820],duration,loop:false,swatches:[],shapes:sourceShapes.map(s=>({...s,points:rounded(s.points),clip:undefined})),tracks:[]};
   for(const s of v.shapes){for(const channel of ['points','opacity']){
    const keys=frames.map(({time,frame})=>{const shapes=frame.layers.find(f=>f.id===l.id).shapes,found=shapes.find(q=>q.id===s.id);return {time,value:channel==='opacity'?(found?.opacity??0):rounded(found?.points??s.points),easing:'linear'};});
    const baseline=JSON.stringify(s[channel]);if(keys.some(k=>JSON.stringify(k.value)!==baseline))v.tracks.push({shape:s.id,channel,keys});
   }}
   validateVector(v);const id=l.id+'-art';project.assets.push({id,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText(v)),vector:v});j.sprite={asset:id,width:820,height:820,pivotX:.5,pivotY:400/820};
  }
  project.joints.push(j);project.clips[0].tracks[j.id]=[];
  for(let i=0;i<=Math.ceil(duration*fps);i++){const time=Math.min(duration,i/fps),t=frameAt(time).layers.find(f=>f.id===l.id).t;project.clips[0].tracks[j.id].push({time,easing:'linear',value:{...t,scaleX:Math.abs(t.scaleX)}});}
 }
 return project;
}
