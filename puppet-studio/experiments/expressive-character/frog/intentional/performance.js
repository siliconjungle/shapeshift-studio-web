import {pathData} from '@shapeshift-labs/studio-core/vector/model';
import {contours,preparePerformance as prepareMouths,mouthWeights} from '../performance.js';
import {UTTERANCES} from '../performance-audio.js';
export const DURATION=8.8;
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const beats=[
 [0,'composed'],[.86,'release'],[.97,'lift'],[1.075,'approach'],[1.18,'contact'],[1.29,'overshoot'],[1.43,'settle'],
 [6.85,'contact'],[7.02,'approach'],[7.16,'lift'],[7.31,'release'],[7.5,'composed'],
];
// Intentionally authored movement keys, independent of drawing changes.
export const keys=[
 [0,0,0,1,1,0],[.64,0,0,1,1,0],[.80,7,-.8,1.015,.98,2],
 [.96,2,-1.1,1,1,-1],[1.12,-8,-2,1.01,1.01,-5],
 [1.31,-10,-2.3,1.02,.99,-3],[1.54,1,.4,.995,1.005,3],[1.88,0,0,1,1,-1],[2.12,0,0,1,1,0],
 [6.65,0,0,1,1,0],[6.85,2,.4,1,1,1],[7.15,5,.8,1.01,.99,2],[7.5,1,0,1,1,-1],[7.9,0,0,1,1,0],[DURATION,0,0,1,1,0],
];
export function sample(t){t=Math.max(0,Math.min(DURATION,t));let drawing=beats[0][1];for(const [at,id]of beats)if(t>=at)drawing=id;
 let a=keys[0],b=a;for(let i=1;i<keys.length;i++){b=keys[i];if(t<=b[0])break;a=b;}
 const u=smooth((t-a[0])/(b[0]-a[0]||1)),values=a.slice(1).map((v,i)=>v+(b[i+1]-v)*u);
 // The anticipation is an eyelid covering a round pupil, never a pupil morph.
 const lid=t<.77?smooth((t-.64)/.13):1-smooth((t-.77)/.09);
 return {time:t,drawing,headY:values[0],tilt:values[1],sx:values[2],sy:values[3],hat:values[4],lid};
}
function sampleRing(shape,count){let pts=contours(shape).sort((a,b)=>b.length-a.length)[0];let area=pts.reduce((n,a,i)=>{const b=pts[(i+1)%pts.length];return n+a[0]*b[1]-b[0]*a[1];},0);if(area<0)pts.reverse();let start=0;for(let i=1;i<pts.length;i++)if(pts[i][0]<pts[start][0])start=i;pts=[...pts.slice(start),...pts.slice(0,start)];const ds=[0];for(let i=1;i<=pts.length;i++)ds.push(ds.at(-1)+Math.hypot(pts[i%pts.length][0]-pts[i-1][0],pts[i%pts.length][1]-pts[i-1][1]));let j=1;return Array.from({length:count},(_,i)=>{const d=ds.at(-1)*i/count;while(j<ds.length-1&&ds[j]<d)j++;const f=(d-ds[j-1])/(ds[j]-ds[j-1]||1);return pts[j-1].map((v,k)=>v+(pts[j%pts.length][k]-v)*f);}).flat();}
const bounds=pts=>{const x=pts.filter((_,i)=>i%2===0),y=pts.filter((_,i)=>i%2);return [Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)];};
export function prepare(drawings,original){const mouth=prepareMouths(original),get=n=>drawings.settle.shapes.find(s=>s.id==='settle-'+n);
 const ai=sampleRing(get(3),160),tongue=sampleRing(get(9),80),a=bounds(mouth.mouths.AI),b=bounds(ai);
 const fit=pts=>pts.map((v,i)=>i%2?b[1]+(v-a[1])*(b[3]-b[1])/(a[3]-a[1]):b[0]+(v-a[0])*(b[2]-b[0])/(a[2]-a[0]));
 return {drawings,mouths:{...Object.fromEntries(Object.entries(mouth.mouths).map(([id,p])=>[id,fit(p)])),AI:ai},tongues:{...Object.fromEntries(Object.entries(mouth.tongues).map(([id,p])=>[id,fit(p)])),AI:tongue}};
}
const polygon=(id,pts,fill)=>({id,name:id,points:pts,commands:['M',...Array(pts.length/2-1).fill('L'),'Z'],fill,stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero'});
export function deform(s,p){const r=p.tilt*Math.PI/180,c=Math.cos(r),z=Math.sin(r);return {...s,points:s.points.map((v,i,a)=>{const x=a[i-i%2],y=a[i-i%2+1],h=smooth((570-y)/140),hat=smooth((265-y)/150),dx=(x-320)*p.sx,dy=(y-390)*p.sy;return i%2?y+(390+z*dx+c*dy+p.headY-y)*h+Math.abs(p.hat)*hat*.08:x+(320+c*dx-z*dy-x)*h+p.hat*hat;})};}
export function frame(art,p,weights=null){let shapes=art.drawings[p.drawing].shapes;
 if(p.drawing==='settle'){weights??={AI:1,MBP:0};const pts=Array(320).fill(0),tongue=Array(160).fill(0);for(const id in weights){for(let i=0;i<pts.length;i++)pts[i]+=art.mouths[id][i]*weights[id];for(let i=0;i<tongue.length;i++)tongue[i]+=(art.tongues[id]??art.tongues.E)[i]*weights[id];}
 shapes=shapes.map(s=>s.id==='settle-3'?polygon(s.id,pts,'#231f25'):s.id==='settle-9'?{...polygon(s.id,tongue,'#a85f64'),opacity:1-weights.MBP}:s);}
 return shapes.map(s=>deform(s.id==='settle-9'?{...s,clip:'settle-3'}:s,p));
}
// Browser and editable export share the exact same speech and acting clock.
export function performanceAt(time,manifest,forced=null){const pose=sample(time);if(forced)pose.drawing=forced;let weights=null;
 if(pose.drawing==='settle')for(const u of UTTERANCES){const c=manifest.clips[u.id],t=time-u.at;if(t>=-.035&&t<c.duration+.055){weights=mouthWeights(c.cues,t);const at=Math.max(0,t*c.envelopeRate),i=Math.floor(at),a=c.envelope[i]??0,b=c.envelope[i+1]??0;pose.headY-=(a+(b-a)*(at-i))*1.8;break;}}
 return {pose,weights};
}
export {mouthWeights,pathData};
