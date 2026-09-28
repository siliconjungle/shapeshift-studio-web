import {makeComposition,eyelidDrawing} from './composition.js';
import {prepare,frame,performanceAt,pathData,deform,DURATION} from './performance.js';
import {PerformanceAudio} from '../performance-audio.js';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const [drawings,original,manifest]=await Promise.all(['assets/svg/drawings.json','../assets/performance/drawings.json','../audio/babble/manifest.json'].map(p=>fetch(p).then(r=>r.json())));
// URLs retain the original, local Hume recordings; no voice is generated here.
for(const clip of Object.values(manifest.clips))clip.file='../../audio/'+clip.file;
const art=prepare(drawings,original),audio=new PerformanceAudio(manifest.clips),nodes=new Map();
const background=document.createElementNS(ns,'g'),group=document.createElementNS(ns,'g');$('portrait').append(background,group);
const defs=document.createElementNS(ns,'defs'),lids=document.createElementNS(ns,'g');$('portrait').append(defs,lids);
const speechClip=document.createElementNS(ns,'clipPath'),speechPath=document.createElementNS(ns,'path');speechClip.id='speech-mouth-clip';speechClip.append(speechPath);defs.append(speechClip);
const {masks:faceMasks,background:bgShapes,body,brim,hat}=makeComposition(drawings);
const foregroundMask=document.createElementNS(ns,'mask');foregroundMask.id='face-and-hands';foregroundMask.setAttribute('maskUnits','userSpaceOnUse');foregroundMask.setAttribute('x','0');foregroundMask.setAttribute('y','0');foregroundMask.setAttribute('width','640');foregroundMask.setAttribute('height','640');foregroundMask.style.maskType='alpha';defs.append(foregroundMask);group.setAttribute('mask','url(#face-and-hands)');
const maskNodes=new Map(),backgroundNodes=[];
const bodyBoundary=document.createElementNS(ns,'clipPath'),bodyPath=document.createElementNS(ns,'path');bodyBoundary.id='body-boundary';bodyBoundary.append(bodyPath);defs.append(bodyBoundary);
for(const s of bgShapes){const path=document.createElementNS(ns,'path');path.setAttribute('fill',s.fill);path.setAttribute('stroke',s.stroke??'none');path.setAttribute('stroke-width',s.strokeWidth??0);path.setAttribute('stroke-linejoin','round');if(s.insideBody)path.setAttribute('clip-path','url(#body-boundary)');background.append(path);backgroundNodes.push({s,path});}
const hatClip=document.createElementNS(ns,'clipPath'),hatClipPath=document.createElementNS(ns,'path'),hatFront=document.createElementNS(ns,'g');hatClip.id='shared-hat-front';hatClip.append(hatClipPath);defs.append(hatClip);hatFront.setAttribute('clip-path','url(#shared-hat-front)');$('portrait').append(hatFront);const hatNodes=[];
for(const s of hat){const path=document.createElementNS(ns,'path');path.setAttribute('fill',s.fill);hatFront.append(path);hatNodes.push({s,path});}
const eyeNodes=[];
for(const index of [5,4]){const eye=drawings.composed.shapes.find(s=>s.id==='composed-'+index),id='eye-clip-'+index,clip=document.createElementNS(ns,'clipPath'),path=document.createElementNS(ns,'path'),cap=document.createElementNS(ns,'path'),line=document.createElementNS(ns,'path');clip.id=id;clip.append(path);defs.append(clip);cap.setAttribute('fill','#548f99');cap.setAttribute('clip-path','url(#'+id+')');line.setAttribute('stroke','#231f25');line.setAttribute('stroke-width','6');line.setAttribute('fill','none');line.setAttribute('clip-path','url(#'+id+')');lids.append(cap,line);eyeNodes.push({eye,path,cap,line,index});}
let time=0,running=false,origin=0,base=0,rate=1,audioClock=false,forced=null,generation=0,last='';
const clock=()=>Math.max(0,Math.min(DURATION,base+((audioClock?audio.ctx.currentTime:performance.now()/1000)-origin)*rate));
function stop(){generation++;if(running)time=clock();running=false;audio.stop();$('play').textContent='Play scene';}
async function play(from){stop();forced=null;const ticket=generation;time=from;if($('sound').checked){await audio.prepare();if(ticket!==generation)return;origin=audio.start(from,rate);audioClock=true;}else{origin=performance.now()/1000;audioClock=false;}base=from;running=true;$('play').textContent='Pause';}
$('play').onclick=()=>running?stop():play(time>=DURATION-.01?0:time);$('replay').onclick=()=>play(0);
$('scrub').oninput=e=>{stop();forced=null;time=+e.target.value;};$('slow').onchange=e=>{const was=running;stop();rate=e.target.checked?.5:1;if(was)play(time);};$('sound').onchange=e=>audio.mute(!e.target.checked);
for(const id of Object.keys(drawings)){const b=document.createElement('button');b.textContent=id;b.onclick=()=>{stop();forced=id;time=0;};$('poses').append(b);}
function render(){requestAnimationFrame(render);if(document.hidden)return;if(running){time=clock();if(time===DURATION)stop();}const {pose:p,weights}=performanceAt(time,manifest,forced);
 const key=JSON.stringify([p,weights]);if(key!==last){last=key;
 bodyPath.setAttribute('d',pathData(deform(drawings.composed.shapes[0],p)));hatClipPath.setAttribute('d',pathData(deform(brim,p)));for(const {s,path}of hatNodes)path.setAttribute('d',pathData(deform(s,p)));
 for(const {s,path}of backgroundNodes)path.setAttribute('d',pathData(deform(s,p)));
 const activeMasks=new Set();for(const s of faceMasks[p.drawing]){activeMasks.add(s.id);let node=maskNodes.get(s.id);if(!node){node=document.createElementNS(ns,'path');node.setAttribute('fill','white');node.setAttribute('stroke','white');node.setAttribute('stroke-width','14');node.setAttribute('stroke-linejoin','round');maskNodes.set(s.id,node);}if(node.parentNode!==foregroundMask)foregroundMask.append(node);node.setAttribute('d',pathData(deform(s,p)));}
 for(const [id,node]of maskNodes)if(!activeMasks.has(id)&&node.parentNode)node.remove();
 const seen=new Set();for(const s of frame(art,p,weights)){seen.add(s.id);let el=nodes.get(s.id);if(!el){el=document.createElementNS(ns,'path');el.setAttribute('fill',s.fill);nodes.set(s.id,el);}if(el.parentNode!==group)group.append(el);el.setAttribute('d',pathData(s));el.setAttribute('opacity',s.opacity);if(s.id==='settle-3')speechPath.setAttribute('d',pathData(s));if(s.clip)el.setAttribute('clip-path','url(#speech-mouth-clip)');}
 for(const [id,el]of nodes)if(!seen.has(id)&&el.parentNode)el.remove();
 lids.style.display=p.drawing==='composed'&&p.lid>0?'':'none';
 for(const {eye,path,cap,line,index}of eyeNodes){path.setAttribute('d',pathData(deform(eye,p)));const [capShape,lineShape]=eyelidDrawing(index,p.lid);cap.setAttribute('d',pathData(deform(capShape,p)));line.setAttribute('d',pathData(deform(lineShape,p)));}

 }
 $('scrub').value=time;$('time').textContent=time.toFixed(2)+' / 8.80';$('beat').textContent=forced?'Inspecting '+forced:p.drawing;$('portrait').dataset.time=time.toFixed(3);$('portrait').dataset.drawing=p.drawing;
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>audio.dispose());render();
