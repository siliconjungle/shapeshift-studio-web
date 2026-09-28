import fs from 'node:fs/promises';import sharp from 'sharp';import {pathData} from '@shapeshift-labs/studio-core/vector/model';
import {samplePerformance,preparePerformance,performanceFrame,mouthWeights} from '../puppet-studio/experiments/expressive-character/frog/performance.js';
const root='puppet-studio/experiments/expressive-character/frog',art=preparePerformance(JSON.parse(await fs.readFile(root+'/assets/performance/drawings.json')));
const times=[.68,.85,.86,1.055,1.06,1.185,1.19,1.335,1.34,1.62,2,7.14,7.15,7.275,7.28,7.495,7.5,7.8];
function svg(pose,opts){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" width="640" height="640">${performanceFrame(art,pose,opts).map(s=>`<path d="${pathData(s)}" fill="${s.fill}" opacity="${s.opacity}"/>`).join('')}</svg>`;}
const tiles=await Promise.all(times.map(async(t,i)=>({input:await sharp(Buffer.from(svg(samplePerformance(t)))).resize(256,256).png().toBuffer(),left:i%6*256,top:Math.floor(i/6)*280})));
await sharp({create:{width:1536,height:840,channels:4,background:'#f7f3e7'}}).composite(tiles).png().toFile(root+'/assets/performance/transitions-check.png');
const mouths=['AI','E','O','MBP'];const mouthsTiles=await Promise.all(mouths.map(async(id,i)=>({input:await sharp(Buffer.from(svg(samplePerformance(2),{weights:{AI:0,E:0,O:0,MBP:0,[id]:1}}))).resize(400,400).png().toBuffer(),left:i*400,top:0})));
await sharp({create:{width:1600,height:400,channels:4,background:'#f7f3e7'}}).composite(mouthsTiles).png().toFile(root+'/assets/performance/mouths-check.png');
console.log('Rendered switch boundaries and all four mouth drawings.');
