// Opt-in, fixed-step capture. Uses the normal demo renderer and audio definitions.
// Waiting for a screenshot never advances the simulation, so encoding cannot drop motion.
import {ProceduralAudio} from '../../scene3d/core/audio.js';
export function mountFrameCapture({sound,step,getTime}){
 const cues=[];
 sound.unlock=()=>{};
 sound.cue=(kind,strength=1)=>{cues.push({time:getTime(),kind,strength});sound.events.push(kind);if(sound.events.length>80)sound.events.shift();};
 const cursor=document.createElement('div');cursor.id='capture-cursor';cursor.style.cssText='position:fixed;left:0;top:0;z-index:9000;pointer-events:none;transform:translate(-50px,-50px);filter:drop-shadow(0 2px 2px #302b3440)';cursor.innerHTML='<svg width="25" height="31" viewBox="0 0 25 31"><path d="M3 2L4 24L9 18L15 28L19 26L13 17L22 15Z" fill="#fff4dd" stroke="#302b34" stroke-width="2" stroke-linejoin="round"/></svg>';document.body.append(cursor);
 const style=document.createElement('style');style.textContent='body,body *{cursor:none!important}button{transition:none!important}button.capture-hover{background:#ded2df}.shelf button.capture-hover{background:#ece2d5;transform:translateY(-3px)}';document.head.append(style);
 let hover=null,pressed=null,pressAt=-100;
 const target=s=>{const e=document.querySelector(s);if(!e)throw Error('Capture target missing: '+s);return e;};
 const position=(selector,fraction=.5)=>{const r=target(selector).getBoundingClientRect();return {x:r.x+r.width*fraction,y:r.y+r.height*.5};};
 window.__potionCapture={
  cues,position,
  pointer(x,y){cursor.style.left=x+'px';cursor.style.top=y+'px';const next=document.elementFromPoint(x,y)?.closest('button');if(next!==hover){hover?.classList.remove('capture-hover');next?.classList.add('capture-hover');hover=next;}},
  click(selector){const e=target(selector),p=position(selector);e.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:p.x,clientY:p.y,pointerId:1,button:0,buttons:1}));e.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,clientX:p.x,clientY:p.y,pointerId:1,button:0,buttons:0}));e.click();pressed=e;pressAt=getTime();},
  input(selector,value){const e=target(selector);e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},
  step(dt){step(dt);const age=getTime()-pressAt;cursor.style.transform=`scale(${age<.2?1-.16*Math.sin(Math.PI*age/.2):1})`;if(pressed){pressed.style.transform=age<.16?`scale(${1-.06*Math.sin(Math.PI*age/.16)})`:'';if(age>=.16)pressed=null;}return {time:getTime(),...document.getElementById('scene').dataset};},
  async audio(duration){
   const context=new OfflineAudioContext(2,Math.ceil(duration*48000),48000);let at=0,seed=718273;
   const proxy=new Proxy(context,{get(c,key){if(key==='currentTime')return at;const v=Reflect.get(c,key,c);return typeof v==='function'?v.bind(c):v;}});
   const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   const audio=new ProceduralAudio(sound.definition,proxy,{random});
   for(const event of cues){at=event.time;audio.cue(event.kind,event.strength);}
   const rendered=await context.startRendering(),count=rendered.length,bytes=new Uint8Array(44+count*4),view=new DataView(bytes.buffer);
   const text=(offset,s)=>{for(let i=0;i<s.length;i++)bytes[offset+i]=s.charCodeAt(i);};
   text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,2,true);view.setUint32(24,48000,true);view.setUint32(28,192000,true);view.setUint16(32,4,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,count*4,true);
   const channels=[rendered.getChannelData(0),rendered.getChannelData(1)];for(let i=0;i<count;i++)for(let c=0;c<2;c++){const n=Math.max(-1,Math.min(1,channels[c][i]));view.setInt16(44+(i*2+c)*2,Math.round(n*(n<0?32768:32767)),true);}
   let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(binary);
  }
 };
}
