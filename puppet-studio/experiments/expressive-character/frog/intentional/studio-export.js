import {identity} from '@shapeshift-labs/studio-core/joint-transforms';
import {svgText,validateVector} from '@shapeshift-labs/studio-core/vector/model';
import {expandClips} from '../../../../portrait/studio-export.js';
import {DURATION,beats,keys,performanceAt,deform,frame} from './performance.js';
import {eyelidDrawing} from './composition.js';
import {UTTERANCES} from '../performance-audio.js';
import {contours} from '../performance.js';

const round=values=>values.map(v=>Math.round(v*100)/100);
const normalize=s=>({id:s.id,name:s.name??s.id,hidden:false,locked:false,commands:s.commands,points:round(s.points),fill:s.fill,stroke:s.stroke??'none',strokeWidth:s.strokeWidth??0,opacity:s.opacity??1,fillRule:s.fillRule??'nonzero',lineCap:s.lineCap??'round',lineJoin:s.lineJoin??'round'});
function clippedLidLine(line,eye){
 const boundary=contours(eye)[0],source=contours(line)[0],cross=(a,b)=>a[0]*b[1]-a[1]*b[0];
 const inside=([x,y])=>{let hit=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
 const points=[];
 for(let i=1;i<source.length;i++){const a=source[i-1],b=source[i],r=b.map((v,j)=>v-a[j]),cuts=[0,1];
  for(let j=0;j<boundary.length;j++){const c=boundary[j],d=boundary[(j+1)%boundary.length],s=d.map((v,k)=>v-c[k]),q=c.map((v,k)=>v-a[k]),den=cross(r,s);if(Math.abs(den)<1e-8)continue;const t=cross(q,s)/den,u=cross(q,r)/den;if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);}
  cuts.sort((a,b)=>a-b);for(let j=1;j<cuts.length;j++){const lo=cuts[j-1],hi=cuts[j];if(inside(a.map((v,k)=>v+r[k]*(lo+hi)/2))){points.push(a.map((v,k)=>v+r[k]*lo),a.map((v,k)=>v+r[k]*hi));}}
 }
 const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
 const sampled=Array.from({length:32},(_,i)=>{if(!points.length)return source[0];const d=lengths.at(-1)*i/31;let j=1;while(j<lengths.length-1&&lengths[j]<d)j++;const u=(d-lengths[j-1])/(lengths[j]-lengths[j-1]||1);return points[j-1].map((v,k)=>v+(points[j][k]-v)*u);});
 return {...line,clip:undefined,commands:['M',...Array(31).fill('L')],points:sampled.flat(),opacity:points.length?line.opacity:0};
}
export function nativeFrame(art,native,manifest,time){
 const {pose,weights}=performanceAt(time,manifest),foreground=native.foreground[pose.drawing].map(s=>deform(s,pose));
 if(pose.drawing==='settle'){
  const mouths=expandClips(frame(art,pose,weights).filter(s=>['settle-3','settle-9'].includes(s.id)));
  for(const mouth of mouths){const i=foreground.findIndex(s=>s.id===mouth.id);if(i>=0)foreground[i]=mouth;}
 }
 const eyelids=[];
 for(const i of [5,4]){
  const eye=art.drawings.composed.shapes.find(s=>s.id==='composed-'+i);
  const boundary=deform(eye,pose),[cap,line]=eyelidDrawing(i,pose.lid).map(s=>deform(s,pose));
  const clipped=[expandClips([boundary,cap])[1],clippedLidLine(line,boundary)];
  eyelids.push(...clipped.map(s=>({...s,opacity:pose.drawing==='composed'?s.opacity:0})));
 }
 return {pose,layers:[
  {id:'wardrobe',name:'Shared costume',order:1,shapes:native.background.map(s=>deform(s,pose))},
  {id:pose.drawing,name:pose.drawing+' · face and hands',order:2,shapes:foreground},
  {id:'eyelids',name:'Authored eyelid closure',order:3,shapes:eyelids},
  {id:'hat',name:'Shared hat and brim',order:4,shapes:native.hat.map(s=>deform(s,pose))},
 ]};
}
// Reduce dense samples to editable linear keys, retaining a bounded point error.
export function reduceKeys(keys,tolerance=.12){
 if(keys.length<=2)return keys;
 const keep=new Set([0,keys.length-1]);
 function split(lo,hi){if(hi-lo<2)return;const a=keys[lo],b=keys[hi];let max=tolerance,index=-1;
  for(let i=lo+1;i<hi;i++){const u=(keys[i].time-a.time)/(b.time-a.time),values=Array.isArray(a.value)?a.value:[a.value],target=Array.isArray(keys[i].value)?keys[i].value:[keys[i].value],end=Array.isArray(b.value)?b.value:[b.value];
   for(let j=0;j<values.length;j++){const e=Math.abs(target[j]-(values[j]+(end[j]-values[j])*u));if(e>max){max=e;index=i;}}
  }
  if(index>=0){keep.add(index);split(lo,index);split(index,hi);}
 }
 split(0,keys.length-1);return [...keep].sort((a,b)=>a-b).map(i=>keys[i]);
}
export function exportIntentional(art,native,manifest){
 const times=new Set([0,DURATION,...beats.map(b=>b[0]),...beats.slice(1).map(b=>b[0]-.000001),...keys.map(k=>k[0]),.64,.77,.86]);
 for(let i=0;i/60<DURATION;i++)times.add(i/60);
 for(const u of UTTERANCES){const c=manifest.clips[u.id];for(let i=0;i<c.envelope.length;i++)times.add(u.at+i/c.envelopeRate);}
 const frames=[...times].filter(t=>t<=DURATION).sort((a,b)=>a-b).map(time=>({time,...nativeFrame(art,native,manifest,time)}));
 const p={format:'inkwell-puppet',version:1,name:'Frog wizard · Intentional poses',source:{character:'frog-wizard',portrait:true,method:'Authored face/hand drawings, shared costume and hat, local mouth interpolation and editable SVG point keys',voiceTimeline:UTTERANCES,voicePlayback:'Hume recordings play in the browser study. Native project retains timing metadata; Studio does not play recorded clips.',pointReductionTolerance:.12},assets:[],joints:[{id:'root',name:'Portrait anchor',parent:null,rest:identity(),layer:0}],clips:[{id:'good-news',name:'A little good news',duration:DURATION,fps:24,loop:false,tracks:{}}]};
 const variants=new Set(beats.map(b=>b[1]));
 for(const id of ['wardrobe',...variants,'eyelids','hat']){
  const active=frames.flatMap(f=>{const layer=f.layers.find(l=>l.id===id);return layer?[{time:f.time,layer}]:[];}),first=active[0].layer;
  const v={version:1,viewBox:[0,0,640,640],duration:DURATION,loop:false,swatches:[],shapes:first.shapes.map(s=>({...normalize(s),opacity:variants.has(id)&&id!=='composed'?0:s.opacity??1})),tracks:[]};
  for(let i=0;i<v.shapes.length;i++){
   const s=v.shapes[i],samples=active.map(f=>({time:f.time,value:round(f.layer.shapes[i].points),easing:'linear'}));
   if(samples.some(k=>k.value.length!==s.points.length))throw Error('Topology changed: '+s.id);
   const reduced=reduceKeys(samples);
   if(reduced.some(k=>k.value.some((v,i)=>v!==s.points[i])))v.tracks.push({shape:s.id,channel:'points',keys:reduced});
   if(variants.has(id)&&s.id!=='settle-9')v.tracks.push({shape:s.id,channel:'opacity',keys:beats.map(([time,d])=>({time,value:d===id?1:0,easing:'step'}))});
   else if(s.id==='settle-9'||id==='eyelids'){
    const opacity=frames.map(f=>({time:f.time,value:f.layers.find(l=>l.id===id)?.shapes[i]?.opacity??0,easing:beats.some(([t])=>Math.abs(t-f.time-.000001)<1e-9)?'step':'linear'}));
    // Keep exact drawing boundaries; reduction must never soften a held switch.
    const boundary=new Set(beats.flatMap(([t])=>[t,t-.000001]));let segment=[];const reduced=[];
    for(const k of opacity){segment.push(k);if(boundary.has(k.time)||k===opacity.at(-1)){reduced.push(...reduceKeys(segment,.002).slice(reduced.length?1:0));segment=[k];}}
    v.tracks.push({shape:s.id,channel:'opacity',keys:reduced});
   }
  }
  validateVector(v);p.assets.push({id,vector:v,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText(v))});
  p.joints.push({id,name:first.name,parent:'root',layer:first.order,rest:identity(),sprite:{asset:id,width:640,height:640,pivotX:.5,pivotY:.7}});
 }
 return p;
}
