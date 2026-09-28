// Finish the fixed-step capture without retiming its visuals or sound cues.
import {spawn} from 'node:child_process';import fs from 'node:fs/promises';import path from 'node:path';
const out=path.resolve('../outputs/potion-alchemist-scripted');
async function run(args){return await new Promise((resolve,reject)=>{const p=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});let log='';p.stderr.on('data',d=>log+=d);p.on('error',reject);p.on('close',code=>code?reject(Error(log)):resolve(log));});}
const measurement=await run(['-hide_banner','-i',path.join(out,'demo-audio.wav'),'-af','volumedetect','-f','null','-']);
const peak=Number(measurement.match(/max_volume: ([-\d.]+) dB/)?.[1]);if(!Number.isFinite(peak))throw Error('Could not measure audio peak');
const gain=Math.max(0,Math.min(12,-3-peak));
await run(['-hide_banner','-y','-i',path.join(out,'video-only.mp4'),'-i',path.join(out,'demo-audio.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-af',`volume=${gain}dB,alimiter=limit=0.95:level=false`,'-t','44','-movflags','+faststart',path.join(out,'potion-alchemist-scripted.mp4')]);
await fs.writeFile(path.join(out,'audio-levels.json'),JSON.stringify({originalPeakDb:peak,gainDb:gain,expectedPeakDb:peak+gain},null,2));
console.log(`Finished ${path.join(out,'potion-alchemist-scripted.mp4')} (+${gain.toFixed(1)} dB audio)`);
