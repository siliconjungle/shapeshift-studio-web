import {validateVectorVideo,svgFrame} from '@shapeshift-labs/studio-core/video-vectorizer';
import {VectorPreview,GRADING_PRESETS} from './preview.js';
const $=id=>document.getElementById(id),video=$('source'),status=$('status');
let preview,worker,controller,clip=null,ready=false,current=0,playing=false,started=0,url=null,exporting=false;let preparedImages=[];
const setStatus=text=>status.textContent=text;
const nextPaint=()=>new Promise(r=>setTimeout(r,0));
function save(name,text,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function controls(busy){$('cancel').hidden=!busy;$('convert').disabled=busy||!video.src;$('file').disabled=busy;$('open-clip').disabled=busy;for(const id of ['play','scrub','save-animation','save-clip','save-frame'])$(id).disabled=busy||!ready;}
function stop(){playing=false;video.pause();$('play').textContent='Play both';}
function failure(error){stop();worker?.terminate();controller?.abort();ready=!!clip&&preview?.frames.length===clip.frameCount;if(ready)makeWorker();controls(false);exporting=false;setStatus(error.name==='AbortError'?'Conversion cancelled.':error.message);}
function makeWorker(){worker?.terminate();worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.onerror=e=>failure(Error(e.message));worker.onmessage=async({data})=>{
 if(data.type==='error')return failure(Error(data.message));
 if(data.type==='progress')setStatus((data.progress.stage==='palette'?'Finding shared colours':'Tracking shapes')+' · '+data.progress.completed+' / '+data.progress.total);
 if(data.type==='clip')prepare(data.clip);
 if(data.type==='frame'){
  try{preview.add(data.svg);setStatus('Preparing SVG preview · '+(data.index+1)+' / '+clip.frameCount);
   if(data.index+1===clip.frameCount){ready=true;controls(false);show(0);const trim=clip.timing?.removedSeconds??0;setStatus((clip.settings?.backend==='stacked-reference-splines'?'Video-aware SVG · ':'Experimental region fitter · ')+clip.frameCount+' frames · '+clip.duration.toFixed(2)+' seconds'+(trim>0?' · '+trim.toFixed(2)+' seconds removed from still ending':''));}
  }catch(e){failure(e)}
 }
 if(data.type==='export'){save('animation.svg',data.svg,'image/svg+xml');exporting=false;$('save-animation').disabled=false;setStatus('Animated SVG saved.');}
};}
function prepare(value){preparedImages=[];validateVectorVideo(value);clip=value;$('contain').checked=!!clip.settings?.sourceBackground;preview.grading={preset:'neutral'};$('grade').value=clip.settings?.grading?.preset??'neutral';for(const src of clip.preparedFrames??[]){const image=new Image();image.src=new URL(src,location.href);preparedImages.push(image)}updateSourceMode();$('outline').checked=!!clip.outline;if(clip.outline){$('width').value=clip.outline.width;if(clip.outline.background)$('background').value=clip.outline.background;}$('colors').value=clip.settings?.colors??Math.min(24,clip.palette.length);$('fps').value=clip.frameRate;ready=false;stop();preview.reset(clip.width,clip.height);video.style.aspectRatio=clip.width+'/'+clip.height;$('scrub').max=clip.frameCount-1;controls(true);worker.postMessage({type:'frames',clip});}
function updateSourceMode(){const prepared=$('source-mode').value==='prepared'&&!!clip?.preparedFrames?.length;video.hidden=prepared;$('prepared-source').hidden=!prepared;$('source-heading').textContent=prepared?'Prepared cel video':'Original video';if(prepared&&preparedImages[current])$('prepared-source').src=preparedImages[current].src;}
$('source-mode').onchange=updateSourceMode;
function show(frame){current=frame;updateSourceMode();preview.show(frame);$('scrub').value=frame;$('counter').textContent='Frame '+(frame+1)+' / '+clip.frameCount;}
function event(target,name,signal){return new Promise((resolve,reject)=>{
 const cleanup=()=>{clearTimeout(timer);target.removeEventListener(name,done);target.removeEventListener('error',failed);signal?.removeEventListener('abort',aborted)};
 const done=()=>{cleanup();resolve()},failed=()=>{cleanup();reject(Error('The browser could not decode this video. Try an MP4 or WebM file.'))},aborted=()=>{cleanup();reject(new DOMException('Cancelled','AbortError'))};
 const timer=setTimeout(failed,15000);target.addEventListener(name,done,{once:true});target.addEventListener('error',failed,{once:true});signal?.addEventListener('abort',aborted,{once:true});if(signal?.aborted)aborted();
});}
async function loadVideo(source){stop();video.src=source;await event(video,'loadeddata');controls(false);}
$('file').onchange=async()=>{try{const file=$('file').files[0];if(!file)return;if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(file);await loadVideo(url);setStatus('Ready to convert '+file.name);}catch(e){failure(e)}};
$('convert').onclick=async()=>{stop();ready=false;controls(true);controller=new AbortController();try{
 setStatus('Reading the local video…');
 const settings={grading:{preset:$('grade').value},sourceBackground:$('contain').checked?$('background').value:null,frameRate:Number($('fps').value),colors:Number($('colors').value),maxDimension:Number($('size').value),trimTrailingHold:$('trim').checked,outline:$('outline').checked?{width:Number($('width').value),displayWidth:640,background:$('background').value}:false};
 const source=await fetch(video.src,{signal:controller.signal}),body=await source.blob();
 const response=await fetch('/api/vectorize?settings='+encodeURIComponent(JSON.stringify(settings)),{method:'POST',body,signal:controller.signal});
 if(!response.headers.get('Content-Type')?.includes('ndjson'))throw Error('Open the converter through the local video server (npm run serve:video).');
 const reader=response.body.getReader(),decoder=new TextDecoder();let pending='';
 while(true){const {value,done}=await reader.read();pending+=decoder.decode(value,{stream:!done});let at;
  while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);if(!line)continue;const message=JSON.parse(line);
   if(message.type==='error')throw Error(message.message);
   if(message.type==='progress')setStatus(({checking:'Comparing source pixels',motion:'Finding movement',tracing:'Fitting curves',tracking:'Tracking shapes',outline:'Normalizing the outer outline'}[message.progress.stage]??'Converting')+' · '+message.progress.completed+' / '+message.progress.total);
   if(message.type==='clip'){makeWorker();prepare(message.clip)}
  }
  if(done)break;
 }
}catch(e){failure(e)}};
$('cancel').onclick=()=>failure(new DOMException('Cancelled','AbortError'));
$('play').onclick=()=>{if(playing)return stop();if(current===clip.frameCount-1)show(0);started=performance.now()/1000-clip.timestamps[current];playing=true;$('play').textContent='Pause both';if(video.src){video.currentTime=clip.timestamps[current];video.play().catch(failure)}};
$('scrub').oninput=()=>{stop();show(Number($('scrub').value));if(video.src)video.currentTime=clip.timestamps[current]};
$('grade').onchange=()=>{stop();setStatus('Source grade changed. Convert video to apply the grade and cel palette before tracing.');};
$('save-frame').onclick=()=>save('frame-'+String(current+1).padStart(5,'0')+'.svg',svgFrame(clip,{frame:current}),'image/svg+xml');
$('save-clip').onclick=()=>save('vector-clip.json',JSON.stringify(clip),'application/json');
$('save-animation').onclick=()=>{if(exporting)return;exporting=true;$('save-animation').disabled=true;setStatus('Exporting animated SVG…');worker.postMessage({type:'export',clip,loop:false})};
$('open-clip').onchange=async()=>{try{const file=$('open-clip').files[0];if(!file)return;if(file.size>256000000)throw Error('Vector clip exceeds 256 MB');makeWorker();prepare(JSON.parse(await file.text()));}catch(e){failure(e)}};
try{
 preview=new VectorPreview($('preview'));
 for(const name of Object.keys(GRADING_PRESETS)){const o=document.createElement('option');o.value=name;o.textContent=name[0].toUpperCase()+name.slice(1);$('grade').append(o)}
 function tick(){if(playing&&clip){const time=video.src&&!video.paused?video.currentTime:performance.now()/1000-started;if(time>=clip.duration){stop();show(clip.frameCount-1);if(video.src)video.currentTime=clip.timestamps.at(-1)}else{let i=current;while(i+1<clip.frameCount&&clip.timestamps[i+1]<=time+1e-5)i++;show(i)}}preview.render();requestAnimationFrame(tick)}tick();
 const query=new URLSearchParams(location.search),clipURL=query.get('clip'),videoURL=query.get('video');
 if(clipURL){setStatus('Loading vector clip…');if(videoURL)await loadVideo(new URL(videoURL,location.href));const response=await fetch(new URL(clipURL,location.href));if(!response.ok)throw Error('Could not load vector clip');makeWorker();prepare(await response.json())}
}catch(e){failure(e)}
addEventListener('pagehide',()=>{worker?.terminate();controller?.abort();preview?.dispose();if(url)URL.revokeObjectURL(url)});
