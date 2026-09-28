import {visemeWeights} from '@shapeshift-labs/studio-core/speech';
// Authored drawings supply the acting. Shared weighted regions only provide
// the motion around those drawings; no generic eyes or mouth are overlaid.
import {pathData} from '@shapeshift-labs/studio-core/vector/model';
export const DURATION=8.8;
export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
export const SHOTS=[
 {time:0,drawing:'neutral',label:'Listening'},
 {time:.86,drawing:'compress',label:'A thought'},
 {time:1.06,drawing:'rise',label:'Recognition'},
 {time:1.19,drawing:'overshoot',label:'Delight'},
 {time:1.34,drawing:'delight',label:'A little good news'},
 {time:7.15,drawing:'rise',label:'Settling'},
 {time:7.28,drawing:'compress',label:'A satisfied blink'},
 {time:7.5,drawing:'neutral',label:'Listening'},
];
const KEYS=[
 [0,0,0,0,1,1,0,0],[.48,-2,0,-.7,1,1,1,0],[.68,0,0,-.7,1,1,0,0],
 [.85,28,0,-1,1.025,.95,3,0],
 [.86,-24,0,-1,1.025,.96,3,0],[1.055,-17,0,-1.5,1.025,.95,5,0],
 [1.06,25,0,-1.5,1,.98,6,-6],[1.185,0,0,-3,1.015,1.01,-3,-1],
 [1.19,-10,0,-3,1.025,1.01,-10,3],[1.335,-15,0,-2.5,1.04,.98,-4,4],
 [1.34,-14,0,-2.5,1.04,.98,-4,4],[1.62,2,0,.6,.995,1.005,5,1],
 [1.98,0,0,0,1,1,-1,0],[2.22,0,0,0,1,1,0,0],
 [6.35,0,0,0,1,1,0,0],[6.78,3,0,1,1.005,.99,1,0],[7.145,13,0,1,1,.98,3,-3],
 [7.15,12,0,1,1,.98,3,-3],[7.275,30,0,1,1,.97,5,-4],
 [7.28,-17,0,.5,1.02,.97,4,0],[7.495,-25,0,.3,1.02,.97,0,0],
 [7.5,25,0,.3,1.02,.97,0,0],[7.8,-2,0,-.3,1,1,-3,0],[8.2,0,0,0,1,1,0,0],[DURATION,0,0,0,1,1,0,0],
];
const fields=['headY','headX','tilt','sx','sy','hat','hands'];
export function samplePerformance(time){const t=clamp(time,0,DURATION);let shot=SHOTS[0];for(const s of SHOTS)if(t>=s.time)shot=s;
 let a=KEYS[0],b=a;for(let i=1;i<KEYS.length;i++){b=KEYS[i];if(t<=b[0])break;a=b;}
 const u=smooth((t-a[0])/(b[0]-a[0]||1)),p=Object.fromEntries(fields.map((f,i)=>[f,mix(a[i+1],b[i+1],u)]));
 return {...p,time:t,drawing:shot.drawing,label:shot.label,speech:t>=2.3&&t<6.1};
}
export function contours(shape){let p=0,last=[0,0],all=[],ring=[];for(const cmd of shape.commands){if(cmd==='M'){if(ring.length)all.push(ring);ring=[];last=shape.points.slice(p,p+2);p+=2;ring.push(last);}else if(cmd==='L'){last=shape.points.slice(p,p+2);p+=2;ring.push(last);}else if(cmd==='C'){const a=last,b=shape.points.slice(p,p+2),c=shape.points.slice(p+2,p+4),d=shape.points.slice(p+4,p+6);p+=6;for(let j=1;j<=8;j++){const t=j/8,u=1-t;ring.push([u**3*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t**3*d[0],u**3*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t**3*d[1]]);}last=d;}else if(cmd==='Z'){if(ring.length)all.push(ring);ring=[];}}if(ring.length)all.push(ring);return all;}
function sampleContour(shape,n=160){let pts=contours(shape).sort((a,b)=>b.length-a.length)[0];const area=pts.reduce((sum,a,i)=>{const b=pts[(i+1)%pts.length];return sum+a[0]*b[1]-b[0]*a[1];},0);if(area<0)pts=pts.reverse();let start=0;for(let i=1;i<pts.length;i++)if(pts[i][0]<pts[start][0])start=i;pts=[...pts.slice(start),...pts.slice(0,start)];const ds=[0];for(let i=1;i<=pts.length;i++)ds.push(ds.at(-1)+Math.hypot(pts[i%pts.length][0]-pts[i-1][0],pts[i%pts.length][1]-pts[i-1][1]));let k=1;return Array.from({length:n},(_,i)=>{const d=ds.at(-1)*i/n;while(k<ds.length-1&&ds[k]<d)k++;const a=pts[k-1],b=pts[k%pts.length],t=(d-ds[k-1])/(ds[k]-ds[k-1]||1);return [mix(a[0],b[0],t),mix(a[1],b[1],t)];}).flat();}
const shape=(id,points,fill)=>({id,name:id,commands:['M',...Array(points.length/2-1).fill('L'),'Z'],points,fill,stroke:'none',strokeWidth:0,opacity:1,hidden:false,locked:false,fillRule:'nonzero',lineCap:'round',lineJoin:'round'});
function pointWeights(x,y){return [smooth((540-y)/110),smooth((270-y)/160),Math.exp(-(((x-188)/62)**2)-((y-458)/100)**2),Math.exp(-(((x-449)/62)**2)-((y-465)/100)**2)];}
function deform(shape,p){const pts=shape.points,out=[],r=p.tilt*Math.PI/180,cos=Math.cos(r),sin=Math.sin(r);for(let i=0;i<pts.length;i+=2){const x=pts[i],y=pts[i+1],[h,hat,left,right]=shape.regionWeights?.[i/2]??pointWeights(x,y),dx=(x-320)*p.sx,dy=(y-400)*p.sy;
 out.push(mix(x,320+cos*dx-sin*dy+p.headX,h)+p.hat*hat+(left-right)*p.hands,mix(y,400+sin*dx+cos*dy+p.headY,h)+Math.abs(p.hat)*hat*.12-(left+right)*p.hands*.55);
 }return {...shape,regionWeights:undefined,points:out};}

export function preparePerformance(drawings){
 const get=(id,index)=>drawings[id].shapes.find(s=>s.id===id+'-'+index);
 const mouths={AI:sampleContour(get('delight',4)),E:sampleContour(get('wide',3)),O:sampleContour(get('round',11)),MBP:sampleContour(get('closed',16))};
 // Register the drawn mouth variants to the same cheek anchors.
 for(const id of ['E','MBP'])for(let i=0;i<mouths[id].length;i+=2){mouths[id][i]-=6;mouths[id][i+1]+=id==='MBP'?4:2;}
 const tongues={AI:sampleContour(get('delight',10),80),E:sampleContour(get('wide',11),80),O:sampleContour(get('round',22),80)};
 for(let i=0;i<tongues.E.length;i+=2){tongues.E[i]-=6;tongues.E[i+1]+=2;}
 const base={...Object.fromEntries(Object.entries(drawings).map(([id,doc])=>[id,{...doc}])),delight:{...drawings.delight,shapes:drawings.delight.shapes.filter(s=>!['delight-65','delight-173'].includes(s.id))}};
 for(const doc of Object.values(base))doc.shapes=doc.shapes.map(s=>({...s,regionWeights:Array.from({length:s.points.length/2},(_,i)=>pointWeights(s.points[i*2],s.points[i*2+1]))}));
 return {drawings:base,mouths,tongues};
}
const visemeMap={rest:'MBP',MBP:'MBP',AI:'AI',E:'E',O:'O',U:'O',FV:'E',L:'AI'};
const mappedSpeechCues=new WeakMap();
export function mouthWeights(cues,time){if(!cues)return {AI:1,E:0,O:0,MBP:0};let mapped=mappedSpeechCues.get(cues);if(!mapped){mapped=cues.map(q=>({...q,pose:visemeMap[q.pose]??'MBP'}));mappedSpeechCues.set(cues,mapped);}return {AI:0,E:0,O:0,MBP:0,...visemeWeights(mapped,time,{rest:'MBP'})};}

export function performanceFrame(art,pose,{weights=null}={}){
 let shapes=art.drawings[pose.drawing].shapes;
 if(pose.drawing==='delight'){const w=weights??{AI:1,E:0,O:0,MBP:0},mouth=Array(320).fill(0),tongue=Array(160).fill(0);for(const id in w){const pts=art.mouths[id];for(let i=0;i<mouth.length;i++)mouth[i]+=pts[i]*w[id];const tp=art.tongues[id]??art.tongues.E;for(let i=0;i<tongue.length;i++)tongue[i]+=tp[i]*w[id];}const t=shape('drawn-tongue',tongue,'#a85f64');t.opacity=1-w.MBP;
 shapes=shapes.map(s=>s.id==='delight-4'?shape('drawn-mouth',mouth,'#231f25'):s.id==='delight-10'?t:s);}
 return shapes.map(s=>deform(s,pose));
}
export function performanceLayers(art,pose,options={}) {
 return [{id:pose.drawing,opacity:1,shapes:performanceFrame(art,pose,options)}];
}
export class PerformancePuppet{
 constructor(svg,art){this.svg=svg;this.art=art;this.nodes=new Map();this.groups=new Map();this.group=document.createElementNS(svg.namespaceURI,'g');this.group.style.isolation='isolate';svg.append(this.group);this.key='';}
 render(pose,options){
  const key=JSON.stringify([pose.drawing,pose.expression,...fields.map(f=>pose[f]),options]);if(key===this.key)return;this.key=key;
  const layers=performanceLayers(this.art,pose,options),active=new Set(layers.map(l=>l.id));let count=0;
  for(const [id,g]of this.groups)g.style.display=active.has(id)?'':'none';
  for(const layer of layers){let g=this.groups.get(layer.id);if(!g){g=document.createElementNS(this.svg.namespaceURI,'g');this.groups.set(layer.id,g);this.group.append(g);}g.style.display='';g.setAttribute('opacity',layer.opacity);const seen=new Set();
   for(const s of layer.shapes){const id=layer.id+'/'+s.id;seen.add(id);let el=this.nodes.get(id);if(!el){el=document.createElementNS(this.svg.namespaceURI,'path');el.setAttribute('fill',s.fill);this.nodes.set(id,el);}if(el.parentNode!==g)g.append(el);el.setAttribute('d',pathData(s));el.setAttribute('opacity',s.opacity);el.setAttribute('stroke',s.stroke??'none');el.setAttribute('stroke-width',s.strokeWidth??0);el.setAttribute('stroke-linejoin','round');el.setAttribute('fill-rule',s.fillRule??'nonzero');count++;}
   for(const [id,el]of this.nodes)if(id.startsWith(layer.id+'/')&&!seen.has(id)&&el.parentNode===g)el.remove();
  }
  this.svg.dataset.drawing=pose.drawing;this.svg.dataset.time=pose.time.toFixed(3);this.svg.dataset.paths=count;
 }
}
