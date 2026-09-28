import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {resolveGrading,validateGrading} from '../puppet-studio/experiments/shared/color-grading.js';
import {convertVideoFile,probeVideo} from '@shapeshift-labs/studio-core/video-vectorizer/node';
const root=path.resolve(import.meta.dirname,'..'),port=Number(process.env.VIDEO_VECTOR_PORT??8791);
const mounts=[['/studio/',path.join(root,'dist')]];
if(process.env.STUDIO_VIDEO_EXAMPLES)mounts.push(['/examples/',path.resolve(process.env.STUDIO_VIDEO_EXAMPLES)]);
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.mp4':'video/mp4','.png':'image/png'};
const preparedRoot=await fs.mkdtemp(path.join(os.tmpdir(),'studio-prepared-'));
mounts.push(['/prepared/',preparedRoot]);
let active=false;
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:'+port);
 try{
  if(url.pathname==='/api/vectorize'&&req.method==='POST'){
   if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:'+port)throw Error('Conversion is only available from this local Studio page');
   if(active){res.writeHead(409);res.end('A conversion is already running');return}active=true;
   const controller=new AbortController();res.on('close',()=>{if(!res.writableEnded)controller.abort()});
   let directory;
   try{
    const settings=JSON.parse(url.searchParams.get('settings')??'{}');
    for(const [key,lo,hi]of [['frameRate',1,60],['colors',4,64],['maxDimension',64,1024]])if(!Number.isFinite(settings[key])||settings[key]<lo||settings[key]>hi)throw Error('Invalid '+key);
    validateGrading(settings.grading);
    const preparedId=randomUUID(),preparedDir=path.join(preparedRoot,preparedId),preparedFrames=[];await fs.mkdir(preparedDir);
    directory=await fs.mkdtemp(path.join(os.tmpdir(),'studio-video-'));const file=path.join(directory,'input');
    const handle=await fs.open(file,'w',0o600);let size=0;
    try{for await(const chunk of req){size+=chunk.length;if(size>50000000)throw Error('Video exceeds the 50 MB upload limit');await handle.write(chunk)}}finally{await handle.close()}
    controller.signal.throwIfAborted();
    const metadata=await probeVideo(file,{signal:controller.signal});
    if(metadata.duration&&metadata.duration*settings.frameRate>400)throw Error('Choose a shorter video or a lower frame rate (maximum 400 frames)');
    res.writeHead(200,{'Content-Type':'application/x-ndjson','Cache-Control':'no-store'});
    const clip=await convertVideoFile(file,{frameRate:settings.frameRate,colors:settings.colors,maxDimension:settings.maxDimension,trimTrailingHold:!!settings.trimTrailingHold,outline:settings.outline||false,sourceBackground:settings.sourceBackground??null,grading:resolveGrading(settings.grading),onPreparedFrame:async(frame,index)=>{const name=String(index).padStart(5,'0')+'.png';await sharp(frame.data,{raw:{width:frame.width,height:frame.height,channels:4}}).resize({width:Math.min(1024,metadata.width)}).png().toFile(path.join(preparedDir,name));preparedFrames.push('/prepared/'+preparedId+'/'+name)},audit:true,maxFrames:400,signal:controller.signal,onProgress:progress=>{if(!res.destroyed)res.write(JSON.stringify({type:'progress',progress})+'\n')}});
    clip.preparedFrames=preparedFrames;
    if(!res.destroyed)res.end(JSON.stringify({type:'clip',clip})+'\n');
   }catch(error){if(!res.destroyed){if(!res.headersSent)res.writeHead(400,{'Content-Type':'application/x-ndjson'});res.end(JSON.stringify({type:'error',message:error.message})+'\n')}}
   finally{active=false;if(directory)await fs.rm(directory,{recursive:true,force:true})}
   return;
  }
  if(url.pathname==='/'){res.writeHead(302,{Location:'/studio/puppet-studio/video-vectorizer/index.html'});res.end();return}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  for(const [prefix,base]of mounts)if(url.pathname.startsWith(prefix)){
   const relative=decodeURIComponent(url.pathname.slice(prefix.length));
   if(relative.split('/').some(p=>p.startsWith('.')))throw Error('Invalid path');
   let file=path.resolve(base,relative);if(!file.startsWith(base+path.sep))throw Error('Invalid path');
   const stat=await fs.stat(file);if(stat.isDirectory())file=path.join(file,'index.html');
   const data=await fs.readFile(file),range=req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
   const headers={'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
   if(range){const from=Number(range[1]),to=Math.min(data.length-1,range[2]?Number(range[2]):data.length-1);if(from>to){res.writeHead(416);res.end();return}res.writeHead(206,{...headers,'Content-Range':`bytes ${from}-${to}/${data.length}`,'Content-Length':to-from+1});res.end(req.method==='HEAD'?undefined:data.subarray(from,to+1))}
   else{res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data)}return;
  }
  res.writeHead(404);res.end('Not found');
 }catch(error){if(!res.headersSent)res.writeHead(404);res.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log('Studio video converter: http://127.0.0.1:'+port));
