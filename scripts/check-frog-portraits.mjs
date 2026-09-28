import fs from 'node:fs/promises';import sharp from 'sharp';
import {prepareArtwork,frogFrame} from '../puppet-studio/experiments/expressive-character/frog/puppet.js';
import {frogRig,reaction} from '../puppet-studio/experiments/expressive-character/frog/rig.js';
import {pathData} from '@shapeshift-labs/studio-core/vector/model';
const root='puppet-studio/experiments/expressive-character/frog',art=prepareArtwork(JSON.parse(await fs.readFile(root+'/assets/artwork.json','utf8')));
let content='';
for(const [i,c]of frogRig.clips.entries()){
 const t=c.id==='croak'?1.5:1,frame=frogFrame(art,reaction(frogRig,c.id,t),t);let markup='';
 for(const l of [...frame.layers].sort((a,b)=>a.order-b.order)){
 const defs=l.shapes.filter(s=>s.clip).map(s=>`<clipPath id="c${i}-${s.id}"><path d="${pathData(l.shapes.find(p=>p.id===s.clip))}"/></clipPath>`).join('');
 markup+=`<g transform="matrix(${l.world.join(' ')})"><defs>${defs}</defs>`+l.shapes.map(s=>`<path d="${pathData(s)}" fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" opacity="${s.opacity}" stroke-linejoin="round" stroke-linecap="round" ${s.clip?`clip-path="url(#c${i}-${s.id})"`:''}/>`).join('')+'</g>';
 }
 content+=`<g transform="translate(${i%3*400+200} ${Math.floor(i/3)*400+190}) scale(.49)">${markup}</g><text x="${i%3*400+200}" y="${Math.floor(i/3)*400+380}" text-anchor="middle" fill="#211d24" font-family="sans-serif" font-size="15">${c.name}</text>`;
}
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><rect width="1200" height="1200" fill="#f7f3e7"/>${content}</svg>`)).png().toFile(root+'/pose-check.png');
