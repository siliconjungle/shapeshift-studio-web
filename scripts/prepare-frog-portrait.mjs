import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {DOMParser} from '@xmldom/xmldom';
import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {cutoutPNG} from './map-art-grid.mjs';
import {validateVector} from '@shapeshift-labs/studio-core/vector/model';
globalThis.DOMParser=DOMParser;
const root=path.resolve('puppet-studio/experiments/expressive-character/frog/assets');
const source=path.join(root,'source/frog-parts.png');
const names=['hat','costume','face','hand-curled','hand-point','hand-open'];
const xs=[0,542,1063,1536],ys=[0,512,1024];
const models={},report=[];
const palette=['#211d24','#342c38','#4b414e','#674456','#937060','#e9cf94','#efb74c','#b57b37','#337487','#4c989d','#68b1ad','#90c1ae'];
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function snap(hex){const c=rgb(hex);let best=palette[0],d=Infinity;for(const h of palette){const p=rgb(h),q=c.reduce((s,v,i)=>s+(v-p[i])**2,0);if(q<d){best=h;d=q;}}return best;}
for(let i=0;i<names.length;i++){
 const name=names[i],col=i%3,row=Math.floor(i/3);
 const cropped=await sharp(source).extract({left:xs[col],top:ys[row],width:xs[col+1]-xs[col],height:ys[row+1]-ys[row]}).png().toBuffer();
 const png=await cutoutPNG(cropped,500);await fs.writeFile(path.join(root,'cutouts',name+'.png'),png);
 const result=await convert(png,{preset:'cel',colors:12,preserveDarkColors:true});
 const svg=result.svg.replace(/fill="(#[0-9a-f]{6})"/gi,(_,h)=>`fill="${snap(h)}"`);
 await fs.writeFile(path.join(root,name+'.svg'),svg);
 const parsed=new SVGLoader().parse(svg),shapes=[];
 for(const [j,p]of parsed.paths.entries()){
  const commands=[],points=[];
  for(const sub of p.subPaths){if(!sub.curves.length)continue;let p0=sub.curves[0].getPoint(0);commands.push('M');points.push(p0.x,p0.y);
   for(const c of sub.curves){if(c.isLineCurve){commands.push('L');points.push(c.v2.x,c.v2.y);}else if(c.isCubicBezierCurve){commands.push('C');points.push(c.v1.x,c.v1.y,c.v2.x,c.v2.y,c.v3.x,c.v3.y);}else throw Error('Unexpected tracer curve');}commands.push('Z');
  }
  if(commands.length)shapes.push({id:'path-'+j,name:name+' '+j,commands,points,fill:p.userData.style.fill,stroke:'none',strokeWidth:0,opacity:1,hidden:false,locked:false,fillRule:'nonzero',lineCap:'round',lineJoin:'round'});
 }
 const vb=svg.match(/viewBox="([^"]*)"/)[1].split(' ').map(Number);
 models[name]=validateVector({version:1,viewBox:vb,duration:1,loop:false,shapes,tracks:[],swatches:[]});
 report.push({name,...result.stats,paletteColors:new Set(shapes.map(s=>s.fill)).size});console.log(name,shapes.length,'paths');
}
await fs.writeFile(path.join(root,'artwork.json'),JSON.stringify(models));
await fs.writeFile(path.join(root,'pipeline.json'),JSON.stringify({pipeline:'Built-in GPT Image → alpha separation → Little Gods cel color reduction (12 colors) → VTracer spline SVG → shared cast palette → editable Studio vector models',palette,assets:report},null,2));
