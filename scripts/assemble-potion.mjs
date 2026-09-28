import fs from 'node:fs/promises';import {DOMParser} from '@xmldom/xmldom';import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {svgText,validateVector} from '@shapeshift-labs/studio-core/vector/model';
import {liquidDefaults,polygonArea} from '@shapeshift-labs/studio-core/illustration/container-liquid';
globalThis.DOMParser=DOMParser;const dir='puppet-studio/experiments/potion/assets',scale=.4,origin=[607,740],corkOrigin=[598,211];
const load=async name=>new SVGLoader().parse(await fs.readFile(dir+'/'+name,'utf8')).paths;
const original=await load('bottle-traced.svg'),open=await load('bottle-plain-traced.svg');
const samples=p=>p.subPaths.flatMap(s=>s.getPoints(6).map(p=>[p.x,p.y]));
const bounds=p=>{const a=samples(p);return [Math.min(...a.map(p=>p[0])),Math.min(...a.map(p=>p[1])),Math.max(...a.map(p=>p[0])),Math.max(...a.map(p=>p[1]))];};
const neutral=hex=>{const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return Math.max(...rgb)-Math.min(...rgb)<10;};
const defaults={hidden:false,locked:false,stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round'};
function shape(p,id,anchor=origin){const commands=[],points=[];for(const sub of p.subPaths){if(!sub.curves.length)continue;const a=sub.curves[0].getPoint(0);commands.push('M');points.push(a.x,a.y);for(const c of sub.curves){if(c.isLineCurve){commands.push('L');points.push(c.v2.x,c.v2.y);}else{commands.push('C');points.push(c.v1.x,c.v1.y,c.v2.x,c.v2.y,c.v3.x,c.v3.y);}}commands.push('Z');}return{...defaults,id,name:id,fill:p.userData.style.fill,commands,points:points.map((v,i)=>+(scale*(v-anchor[i%2])).toFixed(3))};}
// The charm-free edit uses a white extraction background. Neutral background
// vectors are removed after tracing; warm glass highlights are preserved.
const front=open.flatMap((p,i)=>i!==1&&!neutral(p.userData.style.fill)?[shape(p,'glass-'+i)]:[]),back=[shape(open[1],'glass-interior')];back[0].fill='#f4efdb';
const b=bounds(original[3]),cork=original.flatMap((p,i)=>{const a=bounds(p);return i>1&&!['#96b4b2','#253d46','#e0e1cd'].includes(p.userData.style.fill)&&a[0]>=b[0]-12&&a[2]<=b[2]+12&&a[1]>=b[1]-12&&a[3]<=b[3]+3?[shape(p,'cork-'+i,corkOrigin)]:[];});
const outline=shape(original[3],'cork-ink',corkOrigin);outline.fill='#231b24';outline.stroke='#231b24';outline.strokeWidth=8;cork.unshift(outline);
// Preserve the generated top face; extend the lower barrel into the neck.
for(const piece of cork)for(let i=0;i<piece.points.length;i+=2){const y=piece.points[i+1],t=Math.max(0,Math.min(1,(y+43)/46));piece.points[i]*=1-.12*t;piece.points[i+1]+=44*t*t*(3-2*t);}
// A separate front lip occludes the inserted barrel. The rear lip remains behind it.
const lipMask={...defaults,id:'lip-mask',name:'Front lip occlusion',hidden:true,fill:'#ffffff',commands:['M','L','C','L','L','L','Z'],points:[-260,-250,-67,-250,-44,-237,35,-235,68,-249,260,-249,260,260,-260,260]};
const lip=[...front.map(s=>({...structuredClone(s),clips:[{source:'lip-mask',rule:'nonzero'}]})),lipMask];
const assets={};for(const [id,shapes]of Object.entries({front,back,cork,lip})){const vector=validateVector({version:1,viewBox:[-260,-360,520,620],duration:8,loop:false,swatches:[],shapes,tracks:[]});assets[id]={id,vector,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText(vector))};await fs.writeFile(dir+'/'+id+'.svg',svgText(vector));}
// An authored smooth cavity follows the glass, not the jagged paint/highlight boundaries.
const cavity='<svg xmlns="http://www.w3.org/2000/svg"><path d="M -43 -247 C -41 -213 -35 -184 -51 -157 C -67 -133 -116 -117 -146 -74 C -174 -31 -170 47 -145 97 C -119 147 -63 171 6 172 C 74 171 130 143 155 92 C 177 42 175 -27 144 -74 C 117 -115 64 -134 49 -157 C 35 -184 39 -216 44 -247 Z"/></svg>';
const boundary=new SVGLoader().parse(cavity).paths[0].subPaths[0].getSpacedPoints(160).slice(0,-1).map(p=>[+p.x.toFixed(3),+p.y.toFixed(3)]);
const liquid=liquidDefaults(boundary);liquid.fill=.6;liquid.lineWidth=0;liquid.frequency=1.15;liquid.damping=.32;liquid.surfaceDepth=.06;liquid.meniscus=2.2;
await fs.writeFile(dir+'/puppet-art.json',JSON.stringify({assets,liquid,mouth:[1.6,-246],registration:{scale,origin,corkOrigin,interior:'authored smooth cavity including neck',background:'neutral white extraction background vectors excluded',cork:'generated cork with lower barrel extended as vector geometry; separate foreground lip'}}));
console.log({front:front.length,cork:cork.length,boundary:boundary.length});
