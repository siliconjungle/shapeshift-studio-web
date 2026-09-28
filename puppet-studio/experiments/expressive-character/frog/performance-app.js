import {DURATION,SHOTS,samplePerformance,preparePerformance,performanceFrame,PerformancePuppet,mouthWeights,clamp} from './performance.js';
import {PerformanceAudio,UTTERANCES} from './performance-audio.js';
import {pathData} from '@shapeshift-labs/studio-core/vector/model';
const $=id=>document.getElementById(id),status=text=>$('message').textContent=text;
try{
 const get=async p=>{const r=await fetch(p);if(!r.ok)throw Error('Missing '+p);return r.json();};
 const [drawings,manifest]=await Promise.all([get('assets/performance/drawings.json'),get('audio/babble/manifest.json')]);
 const art=preparePerformance(drawings),puppet=new PerformancePuppet($('portrait'),art),audio=new PerformanceAudio(manifest.clips);
 let time=0,running=false,anchor=0,base=0,rate=1,withAudio=false,operation=0,raf,lastPose=null,held=null,forced=null;
 function stop(){operation++;if(running)time=clock();running=false;audio.stop();$('play').textContent='Play scene';$('play').setAttribute('aria-label','Play performance');}
 function clock(){return clamp(base+((withAudio?audio.ctx.currentTime:performance.now()/1000)-anchor)*rate,0,DURATION);}
 async function play(from=0){stop();const token=operation;time=from;forced=null;held=null;$('play').disabled=true;status('Preparing his little speech…');try{if($('sound').checked){await audio.prepare();if(token!==operation)return;anchor=audio.start(time,rate);withAudio=true;}else{anchor=performance.now()/1000;withAudio=false;}base=time;running=true;$('play').textContent='Pause';$('play').setAttribute('aria-label','Pause performance');status('Neutral → delight → a little babble → neutral.');}catch(e){status(e.message);}finally{$('play').disabled=false;}}
 $('play').onclick=()=>running?stop():play(time>=DURATION-.02?0:time);
 $('replay').onclick=()=>play(0);
 $('scrub').oninput=e=>{stop();time=Number(e.target.value);forced=null;held=null;status('Scrubbing the actual performance.');};
 $('sound').onchange=e=>audio.mute(!e.target.checked);
 $('slow').onchange=e=>{const resume=running;stop();rate=e.target.checked?.5:1;if(resume)void play(time);};
 $('rest').onclick=()=>{stop();forced=null;held=null;time=0;status('The approved neutral drawing.');};
 $('delight').onclick=()=>{stop();forced=null;held=null;time=2;status('The approved delighted drawing, with its own mouth artwork.');};
 $('speak').onclick=()=>play(2.15);
 $('reference').onchange=e=>$('reference-panel').hidden=!e.target.checked;
 const poseLabels={neutral:'Neutral',compress:'Compression',rise:'Rising',overshoot:'Overshoot',delight:'Delighted'};
 for(const [id,label]of Object.entries(poseLabels)){const b=document.createElement('button');b.className='drawing';b.innerHTML=`<img src="assets/performance/${id}.svg" alt=""><span>${label}</span>`;b.onclick=()=>{stop();held=null;forced=id;time=id==='neutral'?0:id==='delight'?2:SHOTS.find(s=>s.drawing===id).time;status(label+' drawing · paused for inspection.');};$('drawings').append(b);}
 for(const [id,label]of [['MBP','M · B · P'],['AI','A · I'],['E','E · F · V'],['O','O · U']]){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-label','Hold '+label+' mouth');const down=()=>{stop();forced=null;time=2;held=id;b.setAttribute('aria-pressed','true');};const up=()=>{held=null;b.setAttribute('aria-pressed','false');};b.onpointerdown=e=>{b.setPointerCapture(e.pointerId);down();};b.onpointerup=up;b.onpointercancel=up;b.onkeydown=e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();down();}};b.onkeyup=up;b.onblur=up;$('mouths').append(b);}
 function download(text,name,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
 $('save-pose').onclick=()=>download($('portrait').outerHTML,'frog-performance-pose.svg','image/svg+xml');
 function frame(){raf=requestAnimationFrame(frame);if(document.hidden)return;if(running){time=clock();if(time>=DURATION){stop();time=DURATION;}}
 const pose=samplePerformance(time);if(forced)pose.drawing=forced;let weights=null,caption='',viseme='';
 if(pose.drawing==='delight')for(const u of UTTERANCES){const c=manifest.clips[u.id],t=time-u.at;if(t>=-.035&&t<c.duration+.055){weights=mouthWeights(c.cues,t);caption=c.text;viseme=Object.entries(weights).sort((a,b)=>b[1]-a[1])[0][0];const energy=c.envelope[Math.max(0,Math.floor(t*c.envelopeRate))]??0;pose.headY-=energy*2.5;pose.tilt+=Math.sin(t*4.2)*energy*.6;pose.hands+=energy*1.3;break;}}
 if(held){weights={AI:0,E:0,O:0,MBP:0,[held]:1};viseme=held;caption='';}
 const signature=JSON.stringify([pose.drawing,pose.expression,pose.headY,pose.headX,pose.tilt,pose.sx,pose.sy,pose.hat,pose.hands,weights]);if(signature!==lastPose){const begin=performance.now();puppet.render(pose,{weights});$('portrait').dataset.updateMs=(performance.now()-begin).toFixed(2);lastPose=signature;}
 $('portrait').dataset.time=time.toFixed(3);$('scrub').value=time;$('time').textContent=time.toFixed(2)+' / '+DURATION.toFixed(2);$('caption').textContent=caption;$('beat').textContent=pose.label;$('portrait').dataset.viseme=viseme;$('portrait').dataset.running=String(running);$('portrait').dataset.audioClock=String(withAudio&&running);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);audio.dispose();},{once:true});
 status('Ready. Play his little scene, or inspect the drawings below.');frame();
}catch(e){status('Could not load the performance: '+e.message);console.error(e);}
