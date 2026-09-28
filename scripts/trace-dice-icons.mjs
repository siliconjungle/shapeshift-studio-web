// Trace generated icon artwork to actual vector contours; no embedded bitmaps.
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const dir=new URL('../puppet-studio/scene3d/assets/dice/icons/',import.meta.url);
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function simplify(p){if(p.length<3)return p;let error=0,index=0;for(let i=1;i<p.length-1;i++){const d=distance(p[i],p[0],p.at(-1));if(d>error){error=d;index=i;}}return error>.7?[...simplify(p.slice(0,index+1)).slice(0,-1),...simplify(p.slice(index))]:[p[0],p.at(-1)];}
for(const name of ['skull','sword','heart']){
 const {data,info}=await sharp(new URL(name+'.png',dir).pathname).resize({width:384}).ensureAlpha().raw().toBuffer({resolveWithObject:true}),w=info.width,h=info.height;
 const palette=name==='heart'?['#263c31','#cf765e']:['#263c31','#fff4d9','#dfb748'];
 const masks=palette.map(()=>new Uint8Array(w*h));let minX=w,minY=h,maxX=0,maxY=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x,k=i*4,r=data[k],g=data[k+1],b=data[k+2];if(data[k+3]<180||(name==='heart'&&r>230&&g>230&&b>230))continue;
  masks[0][i]=1;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  if(name==='heart'){if(r-g>35&&r>130)masks[1][i]=1;}else if(r>155&&g>135){masks[b>150?1:2][i]=1;}
 }
 const trace=mask=>{const edges=new Map(),on=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&mask[y*w+x],add=(a,b)=>{const key=a.join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(b);};
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)){if(!on(x,y-1))add([x,y],[x+1,y]);if(!on(x+1,y))add([x+1,y],[x+1,y+1]);if(!on(x,y+1))add([x+1,y+1],[x,y+1]);if(!on(x-1,y))add([x,y+1],[x,y]);}
  const loops=[];while(edges.size){const start=edges.keys().next().value.split(',').map(Number),loop=[start];let next=start;for(let i=0;i<w*h*4;i++){const key=next.join(','),list=edges.get(key);if(!list?.length)break;next=list.pop();if(!list.length)edges.delete(key);if(next[0]===start[0]&&next[1]===start[1])break;loop.push(next);}const area=Math.abs(loop.reduce((s,a,i)=>{const b=loop[(i+1)%loop.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;if(area<16)continue;let far=1;for(let i=2;i<loop.length;i++)if(Math.hypot(loop[i][0]-start[0],loop[i][1]-start[1])>Math.hypot(loop[far][0]-start[0],loop[far][1]-start[1]))far=i;loops.push([...simplify(loop.slice(0,far+1)).slice(0,-1),...simplify([...loop.slice(far),start]).slice(0,-1)]);}
  const scale=88/Math.max(maxX-minX,maxY-minY),coord=p=>[(50+(p[0]-(minX+maxX)/2)*scale).toFixed(2),(50+(p[1]-(minY+maxY)/2)*scale).toFixed(2)].join(','),mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  return loops.map(loop=>'M'+coord(mid(loop.at(-1),loop[0]))+loop.map((p,i)=>'Q'+coord(p)+' '+coord(mid(p,loop[(i+1)%loop.length]))).join('')+'Z').join('');
 };
 const paths=masks.map((m,i)=>`<path class="${i?'paint':'ink'}" fill="${palette[i]}" fill-rule="evenodd" d="${trace(m)}"/>`).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${paths}</svg>`;
 await writeFile(new URL(name+'.svg',dir),svg);
 if(name==='heart')await writeFile(new URL('../../../music/heart-art.js',dir),`// Traced from GPT-generated heart.png by scripts/trace-dice-icons.mjs.\nexport const HEART_SVG=${JSON.stringify(svg)};\n`);
 console.log(name+': '+svg.length+' bytes');
}
