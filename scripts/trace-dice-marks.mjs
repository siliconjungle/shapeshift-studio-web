// Trace the generated black-ink master sheet to real SVG contours, including holes.
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const dir=new URL('../puppet-studio/scene3d/assets/dice/marks/',import.meta.url),{data,info}=await sharp(new URL('source-glyphs.png',dir).pathname).removeAlpha().greyscale().raw().toBuffer({resolveWithObject:true});
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
function simplify(p){if(p.length<3)return p;let error=0,index=0;for(let i=1;i<p.length-1;i++){const d=distance(p[i],p[0],p.at(-1));if(d>error){error=d;index=i;}}return error>.7?[...simplify(p.slice(0,index+1)).slice(0,-1),...simplify(p.slice(index))]:[p[0],p.at(-1)];}
const glyphs={};
for(let cell=0;cell<12;cell++){
 const x0=Math.round(cell%4*info.width/4),y0=Math.round(Math.floor(cell/4)*info.height/3),w=Math.round(info.width/4),h=Math.round(info.height/3),mask=new Uint8Array(w*h),edges=new Map();
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[y*w+x]=data[(y0+y)*info.width+x0+x]<128?1:0;
 const on=(x,y)=>x>=0&&y>=0&&x<w&&y<h&&mask[y*w+x],add=(a,b)=>{const key=a.join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(b);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)){if(!on(x,y-1))add([x,y],[x+1,y]);if(!on(x+1,y))add([x+1,y],[x+1,y+1]);if(!on(x,y+1))add([x+1,y+1],[x,y+1]);if(!on(x-1,y))add([x,y+1],[x,y]);}
 const loops=[];while(edges.size){const start=edges.keys().next().value.split(',').map(Number),loop=[start];let next=start;for(let i=0;i<w*h*4;i++){const key=next.join(','),list=edges.get(key);if(!list?.length)break;next=list.pop();if(!list.length)edges.delete(key);if(next[0]===start[0]&&next[1]===start[1])break;loop.push(next);}const area=Math.abs(loop.reduce((s,a,i)=>{const b=loop[(i+1)%loop.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;if(area>8){let far=1;for(let i=2;i<loop.length;i++)if(Math.hypot(loop[i][0]-start[0],loop[i][1]-start[1])>Math.hypot(loop[far][0]-start[0],loop[far][1]-start[1]))far=i;loops.push([...simplify(loop.slice(0,far+1)).slice(0,-1),...simplify([...loop.slice(far),start]).slice(0,-1)]);}}
 const points=loops.flat(),minX=Math.min(...points.map(p=>p[0])),maxX=Math.max(...points.map(p=>p[0])),minY=Math.min(...points.map(p=>p[1])),maxY=Math.max(...points.map(p=>p[1])),scale=88/Math.max(maxX-minX,maxY-minY),coord=p=>[(50+(p[0]-(minX+maxX)/2)*scale).toFixed(2),(50+(p[1]-(minY+maxY)/2)*scale).toFixed(2)].join(' '),d=loops.map(loop=>'M'+loop.map(coord).join('L')+'Z').join(''),name=cell<10?String(cell):cell===10?'pip':'star';glyphs[name]=d;
 await writeFile(new URL(name+'.svg',dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#172a2a" fill-rule="evenodd" d="${d}"/></svg>`);
}
await writeFile(new URL('glyphs.json',dir),JSON.stringify(glyphs));console.log('Traced 12 generated glyphs to SVG paths.');
