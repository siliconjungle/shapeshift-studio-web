import fs from 'node:fs/promises';
import sharp from 'sharp';
import {DOMParser} from '@xmldom/xmldom';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {validateVector} from '@shapeshift-labs/studio-core/vector/model';
globalThis.DOMParser=DOMParser;
const root='puppet-studio/experiments/expressive-character/frog/assets/performance';
await fs.mkdir(root+'/cutouts',{recursive:true});
const palette=['#231f25','#37303a','#504450','#70515b','#917068','#cfb58b','#eed6a0','#fff0c8','#ffbf50','#c58e3f','#285360','#397684','#548f99','#69aaaf','#87bab6','#a85f64'];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function snap(h){const a=rgb(h);let best=palette[0],distance=Infinity;for(const p of palette){const b=rgb(p),d=a.reduce((sum,v,i)=>sum+(v-b[i])**2,0);if(d<distance){best=p;distance=d;}}return best;}
async function isolate(input,paper=false){
 const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});const w=info.width,h=info.height,N=w*h;
 for(let i=0;i<N;i++){const o=i*4;if(data[o+3]<160)data[o+3]=0;else data[o+3]=255;}
 if(paper){const visited=new Uint8Array(N),queue=new Int32Array(N);let n=0,k=0;
 const add=i=>{if(i<0||i>=N||visited[i])return;const p=i*4;if(data[p]>195&&data[p+1]>180&&data[p+2]>155){visited[i]=1;queue[n++]=i;}};
 for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
 while(k<n){const i=queue[k++];data[i*4+3]=0;if(i%w)add(i-1);if(i%w<w-1)add(i+1);add(i-w);add(i+w);}
 }
 // Keep the portrait component; remove detached concept punctuation and debris.
 const seen=new Uint8Array(N),queue=new Int32Array(N);let largest=[];
 for(let start=0;start<N;start++)if(!seen[start]&&data[start*4+3]){let n=1,k=0;queue[0]=start;seen[start]=1;while(k<n){const i=queue[k++];for(const j of [i%w?i-1:-1,i%w<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<N&&!seen[j]&&data[j*4+3]){seen[j]=1;queue[n++]=j;}}if(n>largest.length)largest=Array.from(queue.subarray(0,n));}
 const keep=new Uint8Array(N);for(const i of largest)keep[i]=1;let x0=w,y0=h,x1=0,y1=0;
 for(let i=0;i<N;i++){if(!keep[i]){data.fill(0,i*4,i*4+4);continue;}const x=i%w,y=Math.floor(i/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const crop=await sharp(data,{raw:info}).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png().toBuffer();
 const scaled=await sharp(crop).resize({width:540,height:550,fit:'inside'}).png().toBuffer(),size=await sharp(scaled).metadata();
 return sharp({create:{width:640,height:640,channels:4,background:'#00000000'}}).composite([{input:scaled,left:Math.round((640-size.width)/2),top:600-size.height}]).png().toBuffer();
}
function model(svg,name){const shapes=[];for(const [j,p]of new SVGLoader().parse(svg).paths.entries()){const commands=[],points=[];for(const sub of p.subPaths){if(!sub.curves.length)continue;const q=sub.curves[0].getPoint(0);commands.push('M');points.push(q.x-2,q.y-2);for(const c of sub.curves){if(c.isLineCurve){commands.push('L');points.push(c.v2.x-2,c.v2.y-2);}else if(c.isCubicBezierCurve){commands.push('C');points.push(c.v1.x-2,c.v1.y-2,c.v2.x-2,c.v2.y-2,c.v3.x-2,c.v3.y-2);}else throw Error('Unsupported tracer curve');}commands.push('Z');}if(commands.length)shapes.push({id:name+'-'+j,name:name+' '+j,commands,points,fill:p.userData.style.fill,stroke:'none',strokeWidth:0,opacity:1,hidden:false,locked:false,fillRule:'nonzero',lineCap:'round',lineJoin:'round'});}return validateVector({version:1,viewBox:[0,0,640,640],duration:1,loop:false,shapes,tracks:[],swatches:palette.map((color,i)=>({id:"color-"+i,name:"Ink palette "+i,color}))});}
const specs=[{id:'neutral',source:'puppet-studio/experiments/expressive-character/concepts/frog-portraits.png',rect:{left:0,top:0,width:417,height:380},paper:true},{id:'delight',source:'puppet-studio/experiments/expressive-character/concepts/frog-portraits.png',rect:{left:0,top:418,width:417,height:359},paper:true},...['compress','rise','overshoot','closed','round','wide'].map((id,i)=>({id,source:root+'/source/breakdowns.png',rect:{left:i%3*512,top:Math.floor(i/3)*512,width:512,height:512}}))];
const artwork={},report=[];
for(const spec of specs){const cache=root+'/'+spec.id+'.svg';let svg;try{svg=await fs.readFile(cache,'utf8');}catch{const cropped=await sharp(spec.source).extract(spec.rect).png().toBuffer(),png=await isolate(cropped,spec.paper);await fs.writeFile(root+'/cutouts/'+spec.id+'.png',png);const result=await convert(png,{preset:'cel',colors:16,preserveDarkColors:true});svg=result.svg.replace(/fill="(#[a-f0-9]{6})"/gi,(_,h)=>`fill="${snap(h)}"`);await fs.writeFile(cache,svg);await fs.writeFile(root+'/'+spec.id+'.stats.json',JSON.stringify(result.stats));}artwork[spec.id]=model(svg,spec.id);report.push({id:spec.id,...JSON.parse(await fs.readFile(root+'/'+spec.id+'.stats.json'))});console.log(spec.id,artwork[spec.id].shapes.length,'paths');}
await fs.writeFile(root+'/drawings.json',JSON.stringify(artwork));await fs.writeFile(root+'/pipeline.json',JSON.stringify({pipeline:'Approved concept drawings + GPT Image breakdowns → alpha/matte separation → Little Gods cel 16-color reduction → VTracer spline SVG → shared palette → editable vector drawings',palette,report},null,2));
const tiles=await Promise.all(specs.map(async(s,i)=>({input:await sharp(Buffer.from(await fs.readFile(root+'/'+s.id+'.svg','utf8'))).resize(320,320).png().toBuffer(),left:i%4*320,top:Math.floor(i/4)*340})));
await sharp({create:{width:1280,height:680,channels:4,background:'#f7f3e7'}}).composite(tiles).png().toFile(root+'/drawings-check.png');
