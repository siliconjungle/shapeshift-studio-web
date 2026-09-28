import {frogRig,defaults,reaction,speak,showcase,showcaseDuration} from './rig.js';
import {prepareArtwork,SvgPuppet,frogFrame} from './puppet.js';
import {clamp,spring,blendControls,validatePortrait,VISEMES,cuePose} from '../../../portrait/controls.js';
import {bakePortrait} from '../../../portrait/studio-export.js';
import {FrogAudio} from './audio.js';
const $=id=>document.getElementById(id),message=t=>$('message').textContent=t;
const get=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Could not load '+url);return r.json();};
try{
const [models,speech]=await Promise.all([get('assets/artwork.json'),get('audio/babble/manifest.json')]);
let rig=structuredClone(frogRig),art=prepareArtwork(models),puppet=new SvgPuppet($('frog'),art),audio=new FrogAudio(speech.clips);
let selected='composed',time=0,playing=true,reel=false,speed=1,intensity=1,last=performance.now(),current={...defaults},manual={},held=null,transition=null,frameCost=0,raf=0,utteranceSequence=0,queue=[],nextVoice=0;
let gx={value:0,velocity:0},gy={value:0,velocity:0},pointer={x:0,y:0},blinkAt=performance.now()/1000+3.4;
const reactionButtons=new Map();
for(const c of rig.clips){const b=document.createElement('button');b.textContent=c.name;b.dataset.expression=c.id;b.setAttribute('aria-pressed',String(c.id===selected));b.onclick=()=>select(c.id);reactionButtons.set(c.id,b);$('expressions').append(b);}
function select(id){const c=rig.clips.find(c=>c.id===id);if(!c)return;transition={from:{...current},start:performance.now()/1000};selected=id;time=0;playing=true;reel=false;manual={};held=null;audio.click();$('acting-note').textContent=c.note;updateButtons();}
function updateButtons(){for(const [id,b]of reactionButtons)b.setAttribute('aria-pressed',String(id===selected));$('play').textContent=playing?'Pause':'Replay';$('play').setAttribute('aria-label',playing?'Pause animation':'Play animation');$('reel').textContent=reel?'Stop reel':'Play all';}
const controls=[['puff','Throat inflation',0,1],['smile','Smile / frown',-1,1],['jaw','Jaw opening',0,1],['round','Round / wide mouth',0,1],['lidL','Left eyelid',0,1],['lidR','Right eyelid',0,1],['tilt','Head tilt',-25,25],['stretch','Squash / stretch',-.8,.8],['point','Finger to chin',0,1],['openHands','Open hands',0,1]];
for(const [id,label,min,max]of controls){const el=document.createElement('label');el.className='slider';const span=document.createElement('span'),out=document.createElement('output'),input=document.createElement('input');span.textContent=label;out.id='out-'+id;span.append(out);input.type='range';input.min=min;input.max=max;input.step=.01;input.value=defaults[id];input.id='control-'+id;input.setAttribute('aria-label',label);input.oninput=()=>{manual[id]=Number(input.value);playing=false;transition=null;reel=false;updateButtons();};el.append(span,input);$('sliders').append(el);}
for(const [id,label]of [['rest','REST'],['MBP','M · B · P'],['AI','A · I'],['E','E'],['O','O'],['U','U'],['FV','F · V'],['L','L · T']]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label','Hold mouth '+id);b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);held=id;b.setAttribute('aria-pressed','true');};const release=()=>{held=null;b.setAttribute('aria-pressed','false');};b.onpointerup=release;b.onpointercancel=release;b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();held=id;b.setAttribute('aria-pressed','true');}};b.onkeyup=release;b.onblur=release;$('visemes').append(b);}
$('intensity').oninput=e=>{intensity=Number(e.target.value);$('intensity-value').textContent=Math.round(intensity*100)+'%';};
$('speed').oninput=e=>{speed=Number(e.target.value);$('speed-value').textContent=speed+'×';};
$('scrub').oninput=e=>{time=Number(e.target.value);playing=false;transition=null;audio.stop();queue=[];manual={};updateButtons();};
$('play').onclick=()=>{if(playing){playing=false;audio.stop();queue=[];}else{if(time>=(reel?duration():holdTime()))time=0;playing=true;manual={};}updateButtons();};
$('reel').onclick=()=>{reel=!reel;time=0;playing=true;manual={};transition=null;audio.stop();queue=[];updateButtons();};
$('poke').onclick=()=>select('panic');
$('reset').onclick=()=>{manual={};held=null;message('Manual controls released.');};
$('capture').onclick=()=>{const c=rig.clips.find(c=>c.id===selected);if(reel){message('Choose a single reaction before adding keys.');return;}const keys=Object.keys(manual);if(!keys.length){message('Move a shape slider, then key it at the playhead.');return;}for(const id of keys){const track=c.controls[id]??=[];const near=track.find(k=>Math.abs(k.time-time)<.005);if(near)near.value=manual[id];else track.push({time,value:manual[id],easing:'smooth'});track.sort((a,b)=>a.time-b.time);c.controls[id]=track;}validatePortrait(rig);manual={};message('Saved '+keys.length+' control keys at '+time.toFixed(2)+'s. Save rig to keep your edits.');};
$('stage').onpointermove=e=>{const r=$('stage').getBoundingClientRect();pointer={x:clamp((e.clientX-r.left)/r.width*2-1,-1,1),y:clamp((e.clientY-r.top)/r.height*2-1,-1,1)};};$('stage').onpointerleave=()=>pointer={x:0,y:0};
$('sound').onchange=e=>audio.mute(!e.target.checked);$('pieces').onchange=e=>$('frog').classList.toggle('piece-view',e.target.checked);
$('speak').onclick=async()=>{const token=++utteranceSequence;audio.stop();queue=[];held=null;try{await audio.unlock();if(token!==utteranceSequence)return;const id=$('voice').value;if(id==='conversation'){
 const middles=['explain','ponder','excited','grumble'];queue=['question',middles[Math.floor(Math.random()*middles.length)],Math.random()<.5?'pleased':'ponder'];nextVoice=0;
 }else{await audio.play(id);}message('Hume character babble · mouth timing follows the recorded phonemes.');}catch(e){message(e.message);}};
function download(text,name,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('save-rig').onclick=()=>download(JSON.stringify(rig,null,2),'frog-wizard.portrait.json');
$('load-rig').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>5e6)throw Error('Rig file is too large.');const next=validatePortrait(JSON.parse(await file.text()));if(Object.keys(defaults).some(k=>!(k in next.defaults)))throw Error('This page requires the frog control set.');if(frogRig.clips.some(c=>!next.clips.find(n=>n.id===c.id)))throw Error('Frog reaction clips are missing.');rig=next;select('composed');message('Loaded editable portrait rig.');}catch(err){message(err.message);}e.target.value='';};
$('save-svg').onclick=()=>download(puppet.snapshot(),'frog-wizard-'+selected+'.svg','image/svg+xml');
$('studio').onclick=async()=>{try{message('Baking editable vector keys and puppet joints…');await new Promise(requestAnimationFrame);const c=rig.clips.find(c=>c.id===selected);const project=bakePortrait({name:'Frog wizard · '+c.name,duration:c.duration,frameAt:t=>frogFrame(art,reaction(rig,selected,t,intensity),t)});download(JSON.stringify(project),'frog-wizard-'+selected+'.puppet.json');message('Exported '+project.joints.length+' joints with editable SVG point keys. Open this JSON in Puppet Studio.');}catch(e){message('Export failed: '+e.message);console.error(e);}};
function duration(){return reel?showcaseDuration(rig):rig.clips.find(c=>c.id===selected).duration;}
function holdTime(){const c=rig.clips.find(c=>c.id===selected);return clamp(c.holdAt??c.duration-.62,0,c.duration);}
function render(now){raf=requestAnimationFrame(render);const begin=performance.now(),dt=Math.min(.04,(now-last)/1000);last=now;
 if(document.hidden)return;
 if(playing){time=Math.min(duration(),time+dt*speed);if(!reel&&$('hold').checked&&time>=holdTime()){time=holdTime();playing=false;updateButtons();}else if(time>=duration()){playing=false;updateButtons();}}
 let p;if(reel){const at=showcase(rig,time);p=at.pose;if(selected!==at.clip.id){selected=at.clip.id;$('acting-note').textContent=at.clip.note;updateButtons();}}else p=reaction(rig,selected,time,intensity);
 if(transition){const t=clamp((now/1000-transition.start)/.52),u=t*t*(3-2*t);p=blendControls(rig,transition.from,p,u);if(t===1)transition=null;}
 Object.assign(p,manual);
 if($('gaze').checked){gx=spring(gx.value,gx.velocity,pointer.x,dt,3,.85);gy=spring(gy.value,gy.velocity,pointer.y,dt,3,.85);p.gazeX=clamp(p.gazeX+gx.value*.6,-1,1);p.gazeY=clamp(p.gazeY+gy.value*.45,-1,1);}
 if(!playing&&!Object.keys(manual).length&&!held&&!audio.voice){const age=now/1000-blinkAt;if(age>=0){const blink=age<.08?age/.08:age<.13?1:clamp(1-(age-.13)/.13);p.lidL=Math.max(p.lidL,blink);p.lidR=Math.max(p.lidR,blink);if(age>.27)blinkAt=now/1000+3.2+Math.random()*4.8;}}
 if(queue.length&&!audio.voice&&now/1000>=nextVoice){const id=queue.shift();nextVoice=Infinity;void audio.play(id).then(()=>{nextVoice=0;}).catch(e=>{queue=[];nextVoice=0;message(e.message);});}
 let spoken='';if(audio.voice){const at=audio.time(),clip=audio.voice.clip;if(at<=clip.duration){p=speak(p,clip.cues,at);const cue=cuePose(clip.cues,at).cue;spoken=cue?.pose??'rest';const volume=clip.envelope[Math.floor(at*clip.envelopeRate)]??0;p.jaw*=.18+.82*volume;p.headY-=volume*3;p.tilt+=Math.sin(at*5)*volume*.8;$('subtitle').textContent=clip.text;}else{audio.stop();nextVoice=now/1000+.16+Math.random()*.24;}}
 if(held){p={...p,...VISEMES[held]};spoken=held;}
 if(!audio.voice)$('subtitle').textContent='';$('mouth-readout').textContent=(spoken||'rest').toUpperCase();
 current=p;puppet.render(p,time);$('scrub').max=duration();$('scrub').value=time;$('time').textContent=time.toFixed(2)+' / '+duration().toFixed(2);
 for(const [id]of controls){$('out-'+id).textContent=p[id].toFixed(2);if(document.activeElement!==$('control-'+id))$('control-'+id).value=p[id];}
 $('frog').dataset.voiceTime=audio.voice?audio.time().toFixed(3):'';$('frog').dataset.voice=audio.voice?.id??'';$('frog').dataset.queued=queue.length;
 frameCost=frameCost*.95+(performance.now()-begin)*.05;$('frog').dataset.updateMs=frameCost.toFixed(2);$('frog').dataset.pathCount=puppet.paths.size;
}
window.frogPortrait={snapshot:()=>({selected,time,playing,reel,pose:{...current},paths:puppet.paths.size,frameCostMs:frameCost,voice:audio.voice?.id??null,queued:[...queue],anchors:puppet.frame?.anchors}),project:()=>structuredClone(rig),setExpression:select,seek(t){playing=false;transition=null;manual={};time=clamp(t,0,duration());updateButtons();},setControls(values){manual={...manual,...values};playing=false;transition=null;},exportClip:()=>{const c=rig.clips.find(c=>c.id===selected);return bakePortrait({name:c.name,duration:c.duration,frameAt:t=>frogFrame(art,reaction(rig,selected,t),t)});}};
document.addEventListener('visibilitychange',()=>{if(document.hidden){audio.stop();queue=[];}last=performance.now();});window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);audio.dispose();},{once:true});
message('Ready · click a feeling, hold a mouth shape, or try the sliders.');requestAnimationFrame(render);
}catch(e){message('Could not start the puppet: '+e.message);console.error(e);}
