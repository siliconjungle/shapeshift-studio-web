// Usage: node scripts/record-potion-demo.mjs [--preview]
// Fixed 60 fps; normal DOM inputs, actual demo rendering, offline rendering of its audio bus.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
const preview=process.argv.includes('--preview'),FPS=60,DURATION=44;
const out=path.resolve('../outputs/potion-alchemist-scripted');await fs.mkdir(out,{recursive:true});
const clicks=[
 [1.0,'[data-recipe="0"]','red'],[3.25,'[data-recipe="1"]','gold'],[5.5,'[data-recipe="2"]','blue'],
 [7.65,'#pop','reseal'],[8.55,'#shake','shake'],[9.05,'#shake','shake-again'],[10.15,'#rock','rock'],[13.05,'#rock','stop-rocking'],
 [18.05,'#pop','angled-pop'],[20.05,'#pop','reseal'],[21.65,'#gulp','drink'],[23.75,'#gulp','drink-again'],
 [26.05,'#empty','empty'],[27.25,'[data-recipe="2"]','blue'],[29.3,'[data-recipe="0"]','red'],[31.35,'[data-recipe="1"]','gold'],
 [36.05,'#gulp','drink-full'],[38.2,'#pop','reseal'],[39.15,'#rock','final-rock'],[42,'#rock','stop-rocking']
].map(([time,selector,name])=>({time,selector,name,frame:Math.round(time*FPS)}));
const drags=[{start:14,end:15,selector:'#tilt',from:0,to:52},{start:15.45,end:17,selector:'#tilt',from:52,to:-38},{start:33.5,end:34.6,selector:'#fill',from:.84,to:1}];
const stops=[{time:0,x:790,y:710}];
let browser,encoder,encodeDone;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{let seed=19381;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
 await page.goto('http://127.0.0.1:4354/puppet-studio/experiments/potion/index.html?capture=frames');await page.waitForFunction(()=>!!window.__potionCapture);
 await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('svg image')].map(async el=>{const href=el.getAttribute('href');if(!href)return;const image=new Image();image.src=href;await image.decode();}));window.__potionCapture.step(0);});
 // Targets come from the rendered page, not hard-coded click coordinates.
 const anchors=await page.evaluate(selectors=>Object.fromEntries(selectors.map(s=>[s,window.__potionCapture.position(s)])),[...new Set(clicks.map(e=>e.selector).concat(drags.map(e=>e.selector)))]);
 const sliderPoint=(d,value)=>{const a=anchors[d.selector];const range=d.selector==='#tilt'?[-160,160]:[0,1];return {...a,fraction:(value-range[0])/(range[1]-range[0])};};
 for(const c of clicks){const a=anchors[c.selector];stops.push({time:c.time-.48,...a},{time:c.time+.18,...a});}
 const ranges=await page.evaluate(()=>Object.fromEntries(['#tilt','#fill'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{x:r.x+7,width:r.width-14,y:r.y+r.height/2}];})));
 for(const d of drags){const r=ranges[d.selector];for(const [time,v]of [[d.start-.1,d.from],[d.end,d.to]]){const p=sliderPoint(d,v);stops.push({time,x:r.x+r.width*p.fraction,y:r.y});}}
 stops.push({time:43,x:795,y:720},{time:44,x:795,y:720});stops.sort((a,b)=>a.time-b.time);
 const smooth=t=>t*t*(3-2*t);
 function pointer(time){let a=stops[0],b=a;for(const s of stops){if(s.time<=time)a=s;else{b=s;break;}}if(b.time<=a.time)return a;const u=Math.min(1,(time-a.time)/(b.time-a.time)),k=smooth(u),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,bow=Math.min(18,length*.06)*Math.sin(Math.PI*u);return{x:a.x+dx*k-dy/length*bow,y:a.y+dy*k+dx/length*bow};}
 if(!preview){encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(FPS),'-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'video-only.mp4')],{stdio:['pipe','ignore','pipe']});let log='';encoder.stderr.on('data',d=>log+=d);encodeDone=once(encoder,'close').then(([code])=>{if(code!==0)throw Error('Video encode failed: '+log);});}
 const states=[],hashes=[],actions=[];let lastPrinted=-1;const samples=new Set([0,2,4,6,9,12,16,18.5,19,22.5,24.5,28,30,32,35,37,40,43].map(t=>Math.round(t*FPS)));
 for(let frame=0;frame<DURATION*FPS;frame++){
  const t=frame/FPS,p=pointer(t),click=clicks.find(e=>e.frame===frame);const drag=drags.find(d=>t>=d.start&&t<=d.end);
  let input=null;if(drag){const k=smooth((t-drag.start)/(drag.end-drag.start)),value=drag.from+(drag.to-drag.from)*k,r=ranges[drag.selector],q=sliderPoint(drag,value);p.x=r.x+r.width*q.fraction;p.y=r.y;input={selector:drag.selector,value};}
  const state=await page.evaluate(({dt,p,click,input})=>{const c=window.__potionCapture;c.pointer(p.x,p.y);if(click)c.click(click.selector);if(input)c.input(input.selector,input.value);return c.step(dt);},{dt:frame?1/FPS:0,p,click,input});
  if(click){actions.push({...click,fill:state.fillArea,cork:state.cork,action:state.action});console.log(`${t.toFixed(2)}s ${click.name}: ${state.action}, fill ${state.fillArea}`);}
  if(frame%FPS===0)states.push({frame,...state});
  if(!preview||samples.has(frame)){
   const jpeg=await page.screenshot({type:'jpeg',quality:97,animations:'allow'});
   if(samples.has(frame))await fs.writeFile(path.join(out,`frame-${t.toFixed(1).padStart(4,'0')}.jpg`),jpeg);
   if(!preview){hashes.push(createHash('sha256').update(jpeg).digest('hex'));if(!encoder.stdin.write(jpeg))await once(encoder.stdin,'drain');}
  }
  if(Math.floor(t/5)>lastPrinted){lastPrinted=Math.floor(t/5);console.log(`${preview?'Preview':'Captured'} ${t.toFixed(0)}/${DURATION}s`);}
 }
 if(errors.length)throw Error(errors.join('\n'));
 if(!preview){encoder.stdin.end();await encodeDone;const wav=await page.evaluate(seconds=>window.__potionCapture.audio(seconds),DURATION);await fs.writeFile(path.join(out,'demo-audio.wav'),Buffer.from(wav,'base64'));}
 const cues=await page.evaluate(()=>window.__potionCapture.cues);for(const kind of ['pop','fill','gulp','plug','tap','drain','slosh','shake'])if(!cues.some(c=>c.kind===kind))throw Error('Missing sound cue: '+kind);
 await fs.writeFile(path.join(out,preview?'preview-report.json':'capture-report.json'),JSON.stringify({fps:FPS,duration:DURATION,frames:preview?null:hashes.length,uniqueFrames:new Set(hashes).size,duplicateConsecutive:hashes.slice(1).filter((h,i)=>h===hashes[i]).length,actions,cues,states,errors},null,2));
 console.log(`Complete: ${out}; ${cues.length} actual demo sound cues`);
}finally{await browser?.close();if(encoder&&encoder.exitCode===null)encoder.kill('SIGTERM');}
