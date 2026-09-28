import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import sharp from 'sharp';import polygon from 'polygon-clipping';import {DOMParser} from '@xmldom/xmldom';import {SVGLoader} from 'three/addons/loaders/SVGLoader.js';
import {convert} from '@shapeshift-labs/studio-core/image-vectorizer/node';
import {makeComposition} from '../puppet-studio/experiments/expressive-character/frog/intentional/composition.js';
import {pathData} from '@shapeshift-labs/studio-core/vector/model';
globalThis.DOMParser=DOMParser;
const root='puppet-studio/experiments/expressive-character/frog/intentional/assets',cache=root+'/native';await fs.mkdir(cache,{recursive:true});
const drawings=JSON.parse(await fs.readFile(root+'/svg/drawings.json')),composition=makeComposition(drawings);
const appearance={stroke:'none',strokeWidth:0,opacity:1,hidden:false,locked:false,fillRule:'evenodd',lineCap:'round',lineJoin:'round'};
function flatten(s){let i=0,last,ring=[],rings=[];const append=p=>{if(!ring.length||Math.hypot(p[0]-ring.at(-1)[0],p[1]-ring.at(-1)[1])>1e-7)ring.push(p);};
 function curve(a,b,c,d,depth=0){const dist=p=>{const dx=d[0]-a[0],dy=d[1]-a[1],len=Math.hypot(dx,dy);return len?Math.abs(dy*p[0]-dx*p[1]+d[0]*a[1]-d[1]*a[0])/len:Math.hypot(p[0]-a[0],p[1]-a[1]);};if(depth>=12||Math.max(dist(b),dist(c))<.18){append(d);return;}const mid=(x,y)=>x.map((v,k)=>(v+y[k])/2),ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);curve(a,ab,abc,m,depth+1);curve(m,bcd,cd,d,depth+1);}
 const finish=()=>{if(ring.length>2){if(Math.hypot(ring[0][0]-ring.at(-1)[0],ring[0][1]-ring.at(-1)[1])>.000001)ring.push(ring[0]);rings.push(ring);}ring=[];};
 for(const command of s.commands){if(command==='M'){finish();last=s.points.slice(i,i+2);i+=2;append(last);}else if(command==='L'){last=s.points.slice(i,i+2);i+=2;append(last);}else if(command==='C'){const b=s.points.slice(i,i+2),c=s.points.slice(i+2,i+4),d=s.points.slice(i+4,i+6);i+=6;curve(last,b,c,d);last=d;}else if(command==='Z')finish();}finish();
 // The source is traced art: contours are disjoint boundaries and nested holes.
 let multi=[];for(const r of rings)multi=polygon.xor(multi,[[r]]);return multi;
}
const area=p=>p.reduce((sum,rings)=>sum+rings.reduce((n,r,i)=>n+(i?-1:1)*Math.abs(r.reduce((a,p,j)=>{const q=r[(j+1)%r.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2),0),0);
function fromPolygon(p,s){const commands=[],points=[];for(const rings of p)for(const r of rings){commands.push('M',...Array(r.length-1).fill('L'),'Z');points.push(...r.flat());}return {...appearance,...s,commands,points,stroke:'none',strokeWidth:0,fillRule:'evenodd'};}
function clip(s,boundary){const original=flatten(s),result=polygon.intersection(original,boundary);if(!result.length)return null;return Math.abs(area(original)-area(result))<.001?{...appearance,...s}:fromPolygon(result,s);}
function parsed(svg,id){const commands=[],points=[];for(const p of new SVGLoader().parse(svg).paths)for(const sub of p.subPaths){if(!sub.curves.length)continue;let q=sub.curves[0].getPoint(0);commands.push('M');points.push(q.x-2,q.y-2);for(const c of sub.curves){if(c.isLineCurve){commands.push('L');points.push(c.v2.x-2,c.v2.y-2);}else{commands.push('C');points.push(c.v1.x-2,c.v1.y-2,c.v2.x-2,c.v2.y-2,c.v3.x-2,c.v3.y-2);}}commands.push('Z');}return {id,name:id,...appearance,commands,points,fill:'#ffffff'};}
async function expanded(id,shapes,width){const hash=createHash('sha256').update(JSON.stringify([shapes,width,'detail-4-v1'])).digest('hex');const file=cache+'/'+id+'.json';try{const c=JSON.parse(await fs.readFile(file));if(c.hash===hash)return c.shape;}catch{}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">${shapes.map(s=>`<path d="${pathData(s)}" fill="white" stroke="white" stroke-width="${width}" stroke-linejoin="round"/>`).join('')}</svg>`;
 const png=await sharp(Buffer.from(svg)).png().toBuffer(),result=await convert(png,{preset:'detail',colors:4}),shape=parsed(result.svg,id);
 await fs.writeFile(file,JSON.stringify({hash,shape,stats:result.stats}));return shape;
}
const body=flatten(composition.body),brim=flatten(composition.brim),background=[];
for(const s of composition.background){let source=s;if(s.strokeWidth){const mask=await expanded(s.id,[s],s.strokeWidth);source={...mask,id:s.id,name:s.name,fill:s.fill};}const result=s.insideBody?clip(source,body):source;if(result)background.push(result);}
const foreground={};
for(const [id,d]of Object.entries(drawings)){const mask=await expanded('mask-'+id,composition.masks[id],14),boundary=flatten(mask);foreground[id]=d.shapes.map(s=>clip(s,boundary)).filter(Boolean);console.log(id,foreground[id].length,'clipped vector shapes');}
const hat=composition.hat.map(s=>clip(s,brim)).filter(Boolean);
await fs.writeFile(cache+'/artwork.json',JSON.stringify({background,foreground,hat,notes:'Masks flattened once at export. Uncut source curves are retained; clipped boundaries are flattened with 0.18px curve tolerance. No runtime mask or outline shader required.'}));
console.log('Prepared background and shared hat for native export.');
