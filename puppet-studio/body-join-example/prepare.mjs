import fs from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
import {SVGLoader} from '../scene3d/vendor.js';
globalThis.DOMParser=DOMParser;
const root=new URL('./',import.meta.url),src=new URL('../../assets/vector/characters/snake-hearth/',import.meta.url),svg=await fs.readFile(new URL('body.svg',src),'utf8'),parsed=new SVGLoader().parse(svg);
const box=parsed.xml.getAttribute('viewBox').split(/\s+/).map(Number),bw=390,bh=bw*box[3]/box[2],all=[];
function warp(p){const x=(p.x-box[0])/box[2]*bw-bw/2,y=(.5-(p.y-box[1])/box[3])*bh,bend=Math.max(0,(x-(bw/2-100))/100)*Math.PI/2,radius=200/Math.PI;
 const q=bend>0?[bw/2-100+Math.sin(bend)*radius-y*Math.sin(bend),-((1-Math.cos(bend))*radius+y*Math.cos(bend))]:[x,-y];all.push(q);return q;}
const paths=parsed.paths.filter(p=>p.userData.style.fill!=='none').map(p=>{const d=p.subPaths.map(s=>{const pts=s.getPoints(10).map(warp);return pts.map((q,i)=>(i?'L':'M')+q.map(v=>v.toFixed(3)).join(' ')).join(' ')+'Z';}).join(' ');return `<path fill="${p.userData.style.fill}" fill-rule="${p.userData.style.fillRule??'nonzero'}" d="${d}"/>`;});
const x=Math.min(...all.map(p=>p[0]))-1,y=Math.min(...all.map(p=>p[1]))-1,w=Math.max(...all.map(p=>p[0]))-x+1,h=Math.max(...all.map(p=>p[1]))-y+1;
await fs.writeFile(new URL('body.svg',root),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${paths.join('')}</svg>`);
await fs.copyFile(new URL('head.svg',src),new URL('head.svg',root));
await fs.writeFile(new URL('body.json',root),JSON.stringify({width:w,height:h,pivotX:-x/w,pivotY:-y/h},null,2));
console.log({width:w,height:h,pivotX:-x/w,pivotY:-y/h});
