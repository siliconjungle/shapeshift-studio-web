import fs from 'node:fs/promises';
import sharp from 'sharp';
import {DOMParser} from '@xmldom/xmldom';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {validateVector} from '@shapeshift-labs/studio-core/vector/model';
globalThis.DOMParser=DOMParser;
const root='puppet-studio/experiments/expressive-character/frog/intentional/assets',out=root+'/svg';await fs.mkdir(out,{recursive:true});
const source=root+'/keyframes-source.png',meta=await sharp(source).metadata(),cell=meta.width/4;
const ids=['composed','anticipation','release','lift','approach','contact','overshoot','settle'];
const palette=['#231f25','#37303a','#504450','#70515b','#917068','#cfb58b','#eed6a0','#fff0c8','#ffbf50','#c58e3f','#285360','#397684','#548f99','#69aaaf','#87bab6','#a85f64'];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const snap=h=>{const a=rgb(h);return palette.toSorted((p,q)=>rgb(p).reduce((n,v,i)=>n+(a[i]-v)**2,0)-rgb(q).reduce((n,v,i)=>n+(a[i]-v)**2,0))[0];};
function model(svg,id,dx,dy){
 const shapes=[],scale=600/cell;
 for(const [j,p]of new SVGLoader().parse(svg).paths.entries()){
  const commands=[],points=[];const add=(x,y)=>points.push(20+(x-2+dx)*scale,20+(y-2+dy)*scale);
  for(const sub of p.subPaths){if(!sub.curves.length)continue;const q=sub.curves[0].getPoint(0);commands.push('M');add(q.x,q.y);
   for(const c of sub.curves){if(c.isLineCurve){commands.push('L');add(c.v2.x,c.v2.y);}else if(c.isCubicBezierCurve){commands.push('C');add(c.v1.x,c.v1.y);add(c.v2.x,c.v2.y);add(c.v3.x,c.v3.y);}else throw Error('Unexpected curve');}commands.push('Z');}
  if(commands.length)shapes.push({id:id+'-'+j,name:id+' '+j,commands,points,fill:p.userData.style.fill,stroke:'none',strokeWidth:0,opacity:1,hidden:false,locked:false,fillRule:'nonzero',lineCap:'round',lineJoin:'round'});
 }
 return validateVector({version:1,viewBox:[0,0,640,640],duration:1,loop:false,shapes,tracks:[],swatches:[]});
}
const drawings={},metrics=[];
for(const [i,id]of ids.entries()){
 const origin=[24+i%4*433.5,Math.floor(i/4)*435],left=Math.floor(origin[0]),top=Math.floor(origin[1]);
 let svg;try{svg=await fs.readFile(out+'/'+id+'.svg','utf8');}catch{
  const {data,info}=await sharp(source).extract({left,top,width:Math.ceil(origin[0]+cell)-left,height:Math.ceil(origin[1]+cell)-top}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const n=info.width*info.height,seen=new Uint8Array(n),queue=new Int32Array(n);let largest=[];
  for(let start=0;start<n;start++)if(!seen[start]&&data[start*4+3]>=128){let head=0,tail=1;queue[0]=start;seen[start]=1;while(head<tail){const k=queue[head++];for(const j of [k%info.width?k-1:-1,k%info.width<info.width-1?k+1:-1,k-info.width,k+info.width])if(j>=0&&j<n&&!seen[j]&&data[j*4+3]>=128){seen[j]=1;queue[tail++]=j;}}if(tail>largest.length)largest=Array.from(queue.subarray(0,tail));}
  const keep=new Uint8Array(n);for(const k of largest)keep[k]=1;for(let k=0;k<n;k++)if(!keep[k])data[k*4+3]=0;
  const crop=await sharp(data,{raw:info}).png().toBuffer();
  const result=await convert(crop,{preset:'cel',colors:16,preserveDarkColors:true});svg=result.svg.replace(/fill="(#[a-f0-9]{6})"/gi,(_,h)=>`fill="${snap(h)}"`);
  await fs.writeFile(out+'/'+id+'.svg',svg);await fs.writeFile(out+'/'+id+'.stats.json',JSON.stringify(result.stats));
 }
 drawings[id]=model(svg,id,left-origin[0],top-origin[1]);metrics.push({id,paths:drawings[id].shapes.length});console.log(id,drawings[id].shapes.length,'paths');
}
await fs.writeFile(out+'/drawings.json',JSON.stringify(drawings));
await fs.writeFile(out+'/pipeline.json',JSON.stringify({source,cell,scale:600/cell,offset:[20,20],palette,perDrawingScale:false,pipeline:'GPT Image authored keyframe sheet → Little Gods cel reduction → spline SVG → shared 640px registration',metrics},null,2));
