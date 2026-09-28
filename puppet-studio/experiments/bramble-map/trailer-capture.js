// Opt-in recording instrumentation: observes real input and captures the real
// master audio bus. Optional director sends normal input, never simulation state.
import {runTrailerDirector} from './trailer-director.js';
export function mountTrailerCapture(audio){
 if(new URLSearchParams(location.search).get('capture')!=='trailer')return;
 let recorder,stream,chunks=[],startAt=0,events=[];
 const cursor=document.createElement('div');cursor.className='trailer-cursor';cursor.innerHTML='<svg width="24" height="30" viewBox="0 0 24 30"><path d="M3 2L4 23L9 18L14 27L18 25L13 16L21 15Z" fill="#fff3d8" stroke="#211e1a" stroke-width="2.2" stroke-linejoin="round"/></svg>';document.body.append(cursor);
 const css=document.createElement('style');css.textContent='.trailer-cursor{position:fixed;left:0;top:0;z-index:3000;pointer-events:none;transform:translate(-50px,-50px);filter:drop-shadow(0 2px 1px #211e1a40)}.trailer-click{position:fixed;width:24px;height:24px;border:2px solid #fff3d8;box-shadow:0 0 0 1px #211e1a80;border-radius:50%;pointer-events:none;z-index:2999}body:has(.trailer-cursor),body:has(.trailer-cursor) *{cursor:none!important}';document.head.append(css);
 const move=e=>cursor.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;
 window.addEventListener('pointermove',move,true);
 window.addEventListener('pointerdown',e=>{move(e);const dot=document.createElement('i');dot.className='trailer-click';dot.style.left=e.clientX-12+'px';dot.style.top=e.clientY-12+'px';document.body.append(dot);dot.animate([{transform:'scale(.35)',opacity:1},{transform:'scale(1.5)',opacity:0}],{duration:260,easing:'ease-out'}).finished.then(()=>dot.remove());if(recorder?.state==='recording')events.push({time:(Date.now()-startAt)/1000,x:e.clientX,y:e.clientY,target:e.target.closest('[data-location],[data-scenery],[data-cloud-id],button')?.outerHTML.slice(0,350)??e.target.tagName});},true);
 window.addEventListener('keydown',async e=>{
  if(!['F8','F9'].includes(e.key))return;e.preventDefault();e.stopImmediatePropagation();
  if(e.key==='F8'&&!recorder){
   stream=await audio.captureStream();chunks=[];events=[];
   recorder=new MediaRecorder(stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:192000});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
   recorder.onstop=async()=>{const endedAt=Date.now(),blob=new Blob(chunks,{type:'audio/webm'});try{await fetch('http://127.0.0.1:4355/audio',{method:'POST',body:blob});await fetch('http://127.0.0.1:4355/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({startAt,endedAt,events,director:document.body.dataset.director,bird:document.body.dataset.directorBird,error:document.body.dataset.directorError})});document.body.dataset.capture='saved';}catch(error){document.body.dataset.capture='error';console.error(error);}};
   startAt=Date.now();recorder.start(1000);document.body.dataset.capture='recording';
   if(new URLSearchParams(location.search).get('director')==='1')runTrailerDirector({stop:()=>{if(recorder.state==='recording'){recorder.stop();document.body.dataset.capture='saving';}}});
  }else if(e.key==='F9'&&recorder?.state==='recording'){recorder.stop();document.body.dataset.capture='saving';}
 },true);
}
