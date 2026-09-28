import {preparePuppet,puppetFrame,DURATION,labels} from './puppet.js';
import {pathData,svgText} from '@shapeshift-labs/studio-core/vector/model';
import {exportPose} from './export.js';
import {PerformanceAudio} from '../performance-audio.js';
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const [library,drawings,original,manifest]=await Promise.all(['assets/layers.json','../intentional/assets/svg/drawings.json','../assets/performance/drawings.json','../audio/babble/manifest.json'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error(url);return r.json();})));
for(const clip of Object.values(manifest.clips))clip.file='../../audio/'+clip.file;
const rig=preparePuppet(library,drawings,original),audio=new PerformanceAudio(manifest.clips),groups=new Map();
let time=0,running=false,origin=0,start=0,audible=false,ticket=0,solo=null,last='',current;
const controls=()=>Object.fromEntries(['explode','headTurn','leftReach','rightReach','gaze'].map(id=>[id,+$(id).value]));
const now=()=>audible?audio.ctx.currentTime:performance.now()/1000;
function stop(){ticket++;if(running)time=Math.min(DURATION,start+now()-origin);running=false;audio.stop();$('play').textContent='Play scene';}
async function play(from=0){stop();const id=ticket;$('pose').value='';time=start=from;try{if($('sound').checked){await audio.prepare();if(id!==ticket)return;origin=audio.start(from,1);audible=true;}else{origin=performance.now()/1000;audible=false;}running=true;$('play').textContent='Pause';}catch(e){$('status').textContent='Could not load voice; turn Sound off to preview.';console.error(e);}}
$('play').onclick=()=>running?stop():play(time>=DURATION-.01?0:time);$('replay').onclick=()=>play(0);$('scrub').oninput=e=>{stop();$('pose').value='';time=+e.target.value;};$('sound').onchange=e=>audio.mute(!e.target.checked);
for(const pose of Object.keys(library.poses)){const option=document.createElement('option');option.value=pose;option.textContent=pose[0].toUpperCase()+pose.slice(1);$('pose').append(option);}
$('pose').onchange=()=>{stop();time=0;};$('reset').onclick=()=>{stop();time=0;solo=null;$('pose').value='';for(const id of Object.keys(controls()))$(id).value=0;};$('showAll').onclick=()=>solo=null;
for(const [id,name]of Object.entries(labels)){const b=document.createElement('button');b.textContent=name;b.dataset.layer=id;b.setAttribute('aria-pressed','false');b.onclick=()=>solo=solo===id?null:id;$('layers').append(b);}
const defs=document.createElementNS(ns,'defs'),clip=document.createElementNS(ns,'clipPath'),clipPath=document.createElementNS(ns,'path');clip.id='layered-mouth-clip';clip.append(clipPath);defs.append(clip);$('portrait').append(defs);
function render(){requestAnimationFrame(render);if(document.hidden)return;if(running){time=Math.min(DURATION,start+now()-origin);if(time>=DURATION)stop();}const options={...controls(),pose:$('pose').value||null,manifest},signature=JSON.stringify([time,options.pose,controls(),solo]);if(signature===last)return;last=signature;current=puppetFrame(rig,time,options);
 $('portrait').setAttribute('viewBox',options.explode>0?'-220 -155 1080 970':'0 0 640 660');
 for(const layer of current.layers){let g=groups.get(layer.id);if(!g){g=document.createElementNS(ns,'g');g.dataset.layer=layer.id;groups.set(layer.id,g);$('portrait').append(g);}g.setAttribute('transform','matrix('+layer.world.join(' ')+')');g.style.display=solo&&solo!==layer.id?'none':'';
  while(g.children.length>layer.shapes.length)g.lastChild.remove();for(let i=0;i<layer.shapes.length;i++){const s=layer.shapes[i];let path=g.children[i];if(!path){path=document.createElementNS(ns,'path');g.append(path);}path.setAttribute('d',pathData(s));path.setAttribute('fill',s.fill);path.setAttribute('stroke',s.stroke??'none');path.setAttribute('stroke-width',s.strokeWidth??0);path.setAttribute('fill-rule',s.fillRule??'nonzero');path.setAttribute('stroke-linejoin','round');path.setAttribute('opacity',s.opacity??1);}
  if(layer.id==='mouth'&&layer.shapes[0])clipPath.setAttribute('d',pathData(layer.shapes[0]));if(layer.id==='tongue'&&!solo)g.setAttribute('clip-path','url(#layered-mouth-clip)');else g.removeAttribute('clip-path');
 }
 if(solo){const layer=current.layers.find(l=>l.id===solo);if(layer?.shapes.length){const points=layer.shapes.flatMap(s=>{const p=[];for(let i=0;i<s.points.length;i+=2){const x=s.points[i],y=s.points[i+1],m=layer.world;p.push([m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);}return p;}),x=Math.min(...points.map(p=>p[0])),y=Math.min(...points.map(p=>p[1])),w=Math.max(...points.map(p=>p[0]))-x,h=Math.max(...points.map(p=>p[1]))-y,pad=Math.max(w,h)*.2+10;$('portrait').setAttribute('viewBox',[x-pad,y-pad,w+pad*2,h+pad*2].join(' '));}}
 for(const b of $('layers').children)b.setAttribute('aria-pressed',String(b.dataset.layer===solo));$('scrub').value=time;$('time').textContent=time.toFixed(2)+' / 8.80';$('status').textContent=current.pose+' · '+current.layers.length+' independent layers';$('portrait').dataset.pose=current.pose;
}
$('download').onclick=()=>{const capture=puppetFrame(rig,time,{...controls(),explode:0,pose:$('pose').value||null,manifest}),p=exportPose(capture);
 const url=URL.createObjectURL(new Blob([JSON.stringify(p)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='frog-layered-'+capture.pose+'.puppet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>audio.dispose());render();
