// Opt-in recording only; captures the displayed demo and its actual audio bus.
export function mountCapture(sound){
 if(new URLSearchParams(location.search).get('capture')!=='video')return;
 const button=document.createElement('button');button.textContent='Record demo';button.id='record-demo';button.style.cssText='position:fixed;top:8px;right:8px;z-index:9000';document.body.append(button);
 let recorder,stream,output;
 button.onclick=async()=>{try{
  stream=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:false,preferCurrentTab:true});sound.unlock();output=sound.context.createMediaStreamDestination();sound.compressor.connect(output);for(const track of output.stream.getAudioTracks())stream.addTrack(track);
  const chunks=[];recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9,opus',videoBitsPerSecond:8000000,audioBitsPerSecond:192000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=async()=>{sound.compressor.disconnect(output);stream.getTracks().forEach(t=>t.stop());document.body.dataset.capture='saving';const response=await fetch('http://127.0.0.1:4356/video',{method:'POST',body:new Blob(chunks,{type:'video/webm'})});document.body.dataset.capture=response.ok?'saved':'error';};
  recorder.start(1000);button.hidden=true;document.body.dataset.capture='recording';
 }catch(error){document.body.dataset.capture=error.message;button.textContent='Recording unavailable';}};
 window.addEventListener('keydown',e=>{if(e.key==='F9'&&recorder?.state==='recording'){e.preventDefault();recorder.stop();}});
 const cursor=document.createElement('div');cursor.style.cssText='position:fixed;z-index:8000;pointer-events:none;left:-40px;top:-40px';cursor.innerHTML='<svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 1L3 22L8 17L13 26L17 24L12 15L20 14Z" fill="#fff4dd" stroke="#302b34" stroke-width="2"/></svg>';document.body.append(cursor);
 window.addEventListener('pointermove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});
 window.addEventListener('pointerdown',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';cursor.animate([{transform:'scale(.8)'},{transform:'scale(1)'}],{duration:180});});
}
