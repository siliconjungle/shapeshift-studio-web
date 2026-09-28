import {createProceduralPlayer} from './player.js';

export function mountLivePreview(panel,host){
 const button=document.createElement('button');button.dataset.livePreview='';button.textContent='Try a live pointer target';panel.querySelector('[data-play]').parentElement.after(button);
 const dialog=document.createElement('dialog');dialog.className='procedural-live';
 dialog.innerHTML='<header><strong>Live procedural preview</strong><button data-close>Close</button></header><p>Move the pointer over the canvas. This preview does not change your saved rig.</p><label>Target point <select data-target></select></label><canvas width="800" height="560" aria-label="Live procedural preview"></canvas><footer><button data-pause>Pause</button><button data-reset>Restart</button><button data-release>Release pointer target</button><span data-status role="status"></span></footer>';
 document.body.append(dialog);const $=key=>dialog.querySelector('[data-'+key+']'),canvas=dialog.querySelector('canvas');let player,selected,paused=false,camera;
 function close(){player?.dispose();player=null;dialog.close();}
 button.onclick=()=>{try{
  host.pause();const project=structuredClone(host.project()),drivers=project.procedural?.drivers??[];if(!drivers.length)throw Error('Add a motion driver to a point first');
  const points=project.procedural.particles,extent=points.reduce((b,p)=>({minX:Math.min(b.minX,p.position[0]-p.radius),minY:Math.min(b.minY,p.position[1]-p.radius),maxX:Math.max(b.maxX,p.position[0]+p.radius),maxY:Math.max(b.maxY,p.position[1]+p.radius)}),{minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity});
  const scale=Math.min(canvas.width/(extent.maxX-extent.minX+200),canvas.height/(extent.maxY-extent.minY+200));camera=[scale,0,0,scale,canvas.width/2-(extent.minX+extent.maxX)/2*scale,canvas.height/2-(extent.minY+extent.maxY)/2*scale];
  $('target').replaceChildren(...drivers.map(d=>new Option(d.particle,d.particle)));const requested=panel.querySelector('[data-driver]').value;if(drivers.some(d=>d.particle===requested))$('target').value=requested;selected=$('target').value;
  player?.dispose();player=createProceduralPlayer(canvas,project,host.images(),{camera,background:'#eef0e8'});paused=false;$('pause').textContent='Pause';$('status').textContent='Pointer ready';dialog.showModal();player.play();
 }catch(e){host.toast(e.message,true);}};
 canvas.onpointermove=e=>{if(!player)return;const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*canvas.width/rect.width,y=(e.clientY-rect.top)*canvas.height/rect.height;player.setTarget(selected,[(x-camera[4])/camera[0],(y-camera[5])/camera[3]]);$('status').textContent='Following pointer';};
 $('target').onchange=()=>{player?.releaseTarget(selected);selected=$('target').value;};
 $('pause').onclick=()=>{paused=!paused;paused?player?.stop():player?.play();$('pause').textContent=paused?'Play':'Pause';};
 $('reset').onclick=()=>player?.reset();$('release').onclick=()=>{player?.releaseTarget(selected);$('status').textContent='Authored motion';};
 $('close').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 return {close,frame:()=>player?.frame()??null};
}
