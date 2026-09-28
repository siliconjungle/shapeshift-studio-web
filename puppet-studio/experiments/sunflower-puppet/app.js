import {createFlowerPuppet} from './puppet.js';
import {CLIPS,VIEWS} from './motion.js';
const $=id=>document.getElementById(id),assetBase='../../../assets/sunflower-puppet/';
const state={facing:'front',clip:'idle',time:0,clock:0,cycle:0,weight:0,pace:1,paused:false,x:500,y:550,target:null,explode:0};
const keys=new Set();
try{
 const response=await fetch(assetBase+'parts.json');if(!response.ok)throw Error('Artwork manifest did not load');const art=await response.json();
 await Promise.all(Object.values(art.parts).map(a=>new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=()=>reject(Error('Could not load '+a.src));image.src=assetBase+a.src;})));
 const puppet=createFlowerPuppet($('puppet'),art,{assetBase}),proofs=VIEWS.map(view=>{const g=document.createElementNS('http://www.w3.org/2000/svg','g');$(view+'-proof').append(g);return {view,puppet:createFlowerPuppet(g,art,{assetBase})};});
 function selectFacing(facing){state.facing=facing;for(const b of $('views').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.view===facing));const view=['left','right'].includes(facing)?'side':facing;$('download').href=assetBase+`sunflower-${view}.puppet.json`;$('download').textContent=`Download ${view} rig ↗`;}
 function selectClip(clip){state.clip=clip;state.time=0;for(const b of $('actions').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.clip===clip));}
 $('views').onclick=e=>{if(!e.target.dataset.view)return;state.target=null;selectFacing(e.target.dataset.view);};
 $('actions').onclick=e=>{if(!e.target.dataset.clip)return;state.target=null;selectClip(e.target.dataset.clip);};
 $('speed').oninput=e=>{state.pace=+e.target.value;$('speed-value').value=state.pace+'×';};
 $('pause').onclick=()=>{state.paused=!state.paused;$('pause').textContent=state.paused?'Play':'Pause';$('pause').setAttribute('aria-pressed',String(state.paused));};
 $('stage').onpointerdown=e=>{if(state.paused)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform($('stage').getScreenCTM().inverse());state.target={x:Math.max(170,Math.min(830,p.x)),y:Math.max(465,Math.min(585,p.y))};$('stage').focus();selectClip('walk');};
 addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();keys.add(e.key);state.target=null;if(state.clip!=='walk')selectClip('walk');}});
 addEventListener('keyup',e=>keys.delete(e.key));addEventListener('blur',()=>keys.clear());
 let previous=performance.now(),hadMovement=false;
 function render(now){const dt=Math.min((now-previous)/1000,.04);previous=now;const advance=state.paused?0:dt*state.pace;
  state.time+=advance;state.clock+=advance;
  let dx=(keys.has('ArrowRight')?1:0)-(keys.has('ArrowLeft')?1:0),dy=(keys.has('ArrowDown')?1:0)-(keys.has('ArrowUp')?1:0),moving=Boolean(dx||dy);
  if(state.target){dx=state.target.x-state.x;dy=state.target.y-state.y;moving=Math.hypot(dx,dy)>2;if(!moving)state.target=null;}
  if(moving&&!state.paused){const sideways=Math.abs(dx)>Math.abs(dy)*1.1,speed=2*(sideways?25:18)*.93/(.56*CLIPS.walk.duration),length=Math.hypot(dx,dy),travel=Math.min(length,speed*advance),keyboard=keys.size>0,step=keyboard?speed*advance:travel;state.x=Math.max(170,Math.min(830,state.x+dx/length*step));state.y=Math.max(465,Math.min(585,state.y+dy/length*step));selectFacing(sideways?(dx<0?'left':'right'):(dy<0?'back':'front'));if(state.clip!=='walk')selectClip('walk');}
  if(hadMovement&&!moving)selectClip('idle');hadMovement=moving;
  if(!CLIPS[state.clip].loop&&state.time>=CLIPS[state.clip].duration)selectClip('idle');
  const targetWeight=state.clip==='walk'?1:0;state.weight+=(targetWeight-state.weight)*(1-Math.exp(-advance*13));state.cycle+=advance/CLIPS.walk.duration*Math.PI*2;
  state.explode+=(Number($('pieces').checked)-state.explode)*(1-Math.exp(-dt*10));
  const view=['left','right'].includes(state.facing)?'side':state.facing;
  // Finish easing the gait on stop rather than dropping the feet mid-swing.
  const clip=state.clip==='idle'&&state.weight>.005?'walk':state.clip;
  puppet.pose({view,time:CLIPS[state.clip].loop?state.clock:state.time,cycle:state.cycle,clip,weight:state.weight,flip:state.facing==='left',explode:state.explode,showJoints:$('joints').checked});
  $('position').setAttribute('transform',`translate(${state.x} ${state.y}) scale(.93)`);$('shadow').setAttribute('cx',state.x);$('shadow').setAttribute('cy',state.y+7);
  $('destination').setAttribute('visibility',state.target?'visible':'hidden');if(state.target)$('destination').setAttribute('transform',`translate(${state.target.x} ${state.target.y})`);
  $('status').textContent=state.facing+' / '+state.clip;
  for(const p of proofs)p.puppet.pose({view:p.view,time:state.clock,clip:'idle'});
  requestAnimationFrame(render);
 }
 // Stable inspection/capture entry point; no clocks or random values inside pose.
 window.sunflowerDemo={state,art,puppet,proofs,selectFacing,selectClip,poseAt:(view,clip,time)=>puppet.pose({view,clip,time}),ready:true};
 requestAnimationFrame(render);
}catch(error){$('status').textContent=error.message;console.error(error);}
