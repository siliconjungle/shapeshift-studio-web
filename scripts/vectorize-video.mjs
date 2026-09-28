#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {convertVideoFile} from '@shapeshift-labs/studio-core/video-vectorizer/node';
import {svgFrame,animatedSVG,validateVectorVideo} from '@shapeshift-labs/studio-core/video-vectorizer';
const args=process.argv.slice(2),options={},positional=[];
for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==='--help'){console.log('Usage: npm run vectorize:video -- input.mp4 output-directory [--colors 16] [--max-size 1024] [--fps 24] [--tail-hold 0.35] [--outline-width 4.4 --display-width 640 --background #fcf7ee] [--min-region-area 4]');process.exit(0)}
  if(arg.startsWith('--')){
    const names={'--colors':'colors','--max-size':'maxDimension','--fps':'frameRate','--tail-hold':'tailHold','--outline-width':'outlineWidth','--display-width':'displayWidth','--background':'background','--min-region-area':'minRegionArea'};
    if(!names[arg]||args[i+1]===undefined)throw Error('Unknown or incomplete option '+arg);
    options[names[arg]]=arg==='--background'?args[++i]:Number(args[++i]);
  }else positional.push(arg);
}
if(options.outlineWidth!==undefined){options.outline={width:options.outlineWidth,...(options.displayWidth?{displayWidth:options.displayWidth}:{}),background:options.background??null};delete options.outlineWidth;delete options.displayWidth;delete options.background;}
if(options.tailHold!==undefined){options.trimTrailingHold={keepSeconds:options.tailHold};delete options.tailHold;}
if(positional.length!==2)throw Error('Expected input video and output directory; use --help');
const [input,destination]=positional,output=path.resolve(destination);
await fs.mkdir(output,{recursive:true});
const existing=await fs.readdir(output);
if(existing.length)throw Error('Output directory must be empty; choose a new destination');
const controller=new AbortController();process.once('SIGINT',()=>controller.abort());
let last=-1;const started=performance.now();
const clip=await convertVideoFile(input,{...options,signal:controller.signal,onProgress:p=>{
  const percent=Math.floor(p.completed/p.total*10);if(percent!==last){last=percent;console.log(p.stage+': '+p.completed+' / '+p.total)}
}});
validateVectorVideo(clip);await fs.mkdir(path.join(output,'svg'));
for(let frame=0;frame<clip.frameCount;frame++)await fs.writeFile(path.join(output,'svg','frame-'+String(frame+1).padStart(5,'0')+'.svg'),svgFrame(clip,{frame}));
await fs.writeFile(path.join(output,'clip.json'),JSON.stringify(clip));
await fs.writeFile(path.join(output,'animated.svg'),animatedSVG(clip));
const report={format:clip.format,version:clip.version,width:clip.width,height:clip.height,analysisWidth:clip.analysisWidth,analysisHeight:clip.analysisHeight,frameCount:clip.frameCount,frameRate:clip.frameRate,duration:clip.duration,timing:clip.timing,paletteColors:clip.palette.length,tracks:clip.tracks.length,poses:clip.tracks.reduce((n,t)=>n+t.poses.length,0),elapsedSeconds:(performance.now()-started)/1000,diagnostics:clip.diagnostics};
await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));
console.log('Wrote persistent-path clip, animated SVG, and '+clip.frameCount+' vector frames to '+output);
console.log(JSON.stringify({...report,diagnostics:undefined},null,2));
