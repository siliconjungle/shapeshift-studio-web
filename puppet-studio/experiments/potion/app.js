import {mountCapture} from './capture.js';
import {mountFrameCapture} from './frame-capture.js';
const frameCapture=new URLSearchParams(location.search).get('capture')==='frames';
import {createLiquidState,advanceLiquid,liquidSurface,liquidBubbles,polygonPath} from '@shapeshift-labs/studio-core/illustration/container-liquid';
import {fluidContours} from '@shapeshift-labs/studio-core/illustration/fluid';
import {defaultFluid} from '../../fx/schema.js';
import {RECIPES,potionPalette,mixPotion,blendColor,pourImpact} from './brewing.js';
import {ProceduralAudio} from '../../scene3d/core/audio.js';
import {popPose,returnPose,RELEASE,RETURN_SEAT} from './motion.js';
import {potionProject,potionSounds} from './potion.js';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',art=await fetch('assets/puppet-art.json').then(r=>r.json()),config=structuredClone(art.liquid),sound=new ProceduralAudio(potionSounds());
for(const id of ['back','front','lip'])$(id).setAttribute('href',art.assets[id].src);$('cork-art').setAttribute('href',art.assets.cork.src);
let state=createLiquidState(),motion={angle:0,x:0,y:0},velocity={angle:0,x:0,y:0},target={...motion},auto=false,time=0,last=performance.now(),shakeAt=-100,opened=false,popAt=-100,closingAt=-100,drag=null,emitters=[],popSound=false,launch=null,returnFrom=null,corkPose=null,landSound=false,seatSound=false,lastSlosh=-100,lastShake=-100,lastFill=-100,manualUntil=-100;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function stopRock(){auto=false;$('rock').textContent='Rock the bottle';$('rock').setAttribute('aria-pressed','false');}

function cue(name){if($('sound').checked){sound.unlock();sound.cue(name,1);}}
function mouthPose(){const co=Math.cos(motion.angle),si=Math.sin(motion.angle);return{x:motion.x+co*art.mouth[0]-si*art.mouth[1],y:motion.y+si*art.mouth[0]+co*art.mouth[1],rotation:motion.angle*180/Math.PI};}
function pop(){stopRock();if(!opened){opened=true;popAt=time;popSound=landSound=false;launch=mouthPose();closingAt=-100;$('pop').textContent='Put the cork back';}else{returnFrom=corkPose??mouthPose();opened=false;closingAt=time;seatSound=false;$('pop').textContent='Pop the cork';cue('return');}}
$('pop').onclick=pop;$('shake').onclick=()=>{stopRock();shakeAt=time;cue('shake');};$('rock').onclick=()=>{auto=!auto;$('rock').textContent=auto?'Stop rocking':'Rock the bottle';$('rock').setAttribute('aria-pressed',auto);};
$('tilt').oninput=e=>{stopRock();target.angle=+e.target.value*Math.PI/180;manualUntil=time+1.2;};$('fill').oninput=e=>{const next=+e.target.value,delta=next-config.fill;config.fill=next;state.waveVelocity+=delta*180;if(Math.abs(delta)>.001&&time-lastFill>.09){lastFill=time;cue(delta>0?'fill':'drain');}$('fill-label').textContent=Math.round(config.fill*100)+'%';};$('viscosity').onchange=e=>config.damping=+e.target.value;$('sound').onchange=()=>{if($('sound').checked)sound.unlock();else sound.stop();};
$('reset').onclick=()=>{stopRock();target={angle:0,x:0,y:0};motion={...target};velocity={angle:0,x:0,y:0};state=createLiquidState();opened=false;popAt=closingAt=shakeAt=-100;emitters=[];escapes=[];action=null;corkPose=null;$('pop').textContent='Pop the cork';};
$('download').onclick=()=>{const value=structuredClone(art);value.liquid={...config};const project=potionProject(value,{sound:$('sound').checked,gas:$('mist').checked}),url=URL.createObjectURL(new Blob([JSON.stringify(project)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='potion-workshop.puppet.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const scene=$('scene');scene.onpointerdown=e=>{if(action)return;stopRock();scene.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,...target};};scene.onpointermove=e=>{if(!drag)return;manualUntil=time+1.2;const dx=(e.clientX-drag.x)*720/scene.getBoundingClientRect().width,dy=(e.clientY-drag.y)*750/scene.getBoundingClientRect().height;target.angle=Math.max(-2.8,Math.min(2.8,drag.angle+dx*.004));target.x=Math.max(-75,Math.min(75,dx*.4));target.y=Math.max(-35,Math.min(35,dy*.25));};scene.onpointerup=scene.onpointercancel=()=>{drag=null;target.x=target.y=0;};
const put=(id,d)=>$(id).setAttribute('d',d),puffNodes=[],bubbleNodes=[];
config.fill=0;
let action=null,breathAt=2,escapes=[],escapeNodes=[],lastPour=-100;
function paintColor(color){Object.assign(config,potionPalette(color));}
function updateFill(value){config.fill=Math.max(0,Math.min(1,value));$('fill').value=config.fill;$('fill-label').textContent=Math.round(config.fill*100)+'%';}
function miniBottle(color,index){const c=potionPalette(color),boundary=polygonPath(config.boundary);return `<svg viewBox="-260 -340 520 570" aria-hidden="true"><defs><clipPath id="mini-${index}"><path d="${boundary}"/></clipPath></defs><image href="${art.assets.back.src}" x="-260" y="-360" width="520" height="620"/><path d="${boundary}" fill="${c.color}"/><image href="${art.assets.front.src}" x="-260" y="-360" width="520" height="620"/></svg>`;}
function buildShelf(){$('shelf').innerHTML=RECIPES.map((r,i)=>`<button data-recipe="${i}" aria-label="Pour ${r.name}">${miniBottle(r.color,i)}</button>`).join('');for(const button of $('shelf').querySelectorAll('button'))button.onclick=()=>pour(RECIPES[+button.dataset.recipe]);}
function pour(recipe){if(action||config.fill>=.999){cue('plug');return;}stopRock();if(!opened)pop();target.angle=0;target.x=target.y=0;drag=null;action={type:'pour',start:time,recipe,from:config.fill,color:config.color};$('hint').textContent='Pouring…';}
$('empty').onclick=()=>{if(action)return;stopRock();action={type:'empty',start:time,from:config.fill};cue('drain');};
$('gulp').onclick=()=>{if(action)return;if(config.fill<=.001){cue('plug');shakeAt=time;return;}stopRock();if(!opened)pop();action={type:'gulp',start:time,from:config.fill,amount:Math.min(.3,config.fill),gulps:0};$('hint').textContent='A small, slightly suspicious gulp.';};
function tickAction(){if(!action){$('donor').setAttribute('opacity',0);put('pour-stream','');scene.setAttribute('viewBox','-360 -430 720 750');return;}const a=action,age=time-a.start;
 if(a.type==='pour'){const u=smooth((age-.4)/.7),mix=mixPotion(a.from,a.color,a.recipe.color,a.recipe.amount*u);updateFill(mix.fill);paintColor(mix.color);if(age>.4&&age<1.1&&time-lastPour>.14){lastPour=time;cue('fill');state.waveVelocity+=9;}
  const entrance=smooth(age/.35),exit=smooth((age-1.15)/.3),present=entrance*(1-exit),x=-350+120*present,y=-750+260*present,r=125*present;
  // Both bottles use the same artwork dimensions and a unit scale. Frame both while pouring.
  scene.setAttribute('viewBox',`${-360-160*present} ${-430-320*present} ${720+220*present} ${750+370*present}`);
  $('donor').setAttribute('opacity',Math.min(1,entrance*3)*(1-exit));$('donor').setAttribute('transform',`translate(${x} ${y}) rotate(${r})`);$('donor-back').setAttribute('href',art.assets.back.src);$('donor-front').setAttribute('href',art.assets.front.src);
  const donorMotion={angle:r*Math.PI/180,x,y},donorSurface=liquidSurface({...config,fill:.72-mix.added},createLiquidState(),donorMotion);
  put('donor-liquid',donorSurface.fill);$('donor-liquid').setAttribute('clip-path','url(#interior)');$('donor-liquid').setAttribute('fill',a.recipe.color);
  const co=Math.cos(donorMotion.angle),si=Math.sin(donorMotion.angle),mouth=mouthPose(),sx=x+art.mouth[0]*co-art.mouth[1]*si,sy=y+art.mouth[0]*si+art.mouth[1]*co;
  put('pour-stream',age>.4&&age<1.1?`M ${sx} ${sy} C ${sx+24} ${sy+18} ${mouth.x} ${mouth.y-35} ${mouth.x} ${mouth.y+2}`:'');$('pour-stream').setAttribute('stroke',a.recipe.color);$('pour-stream').setAttribute('stroke-width',7+Math.sin(age*35));if(age>1.5)action=null;
 }else if(a.type==='gulp'){target.angle=1.2*smooth((age-.18)/.26)*(1-smooth((age-1.15)/.35));target.y=-12*Math.sin(Math.min(1,age/1.5)*Math.PI);const progress=smooth((age-.5)/.62);updateFill(a.from-a.amount*progress);if(age>.5+a.gulps*.2&&a.gulps<3){a.gulps++;cue('gulp');velocity.y+=30;state.waveVelocity+=40;}if(age>1.55){target.angle=0;target.y=0;action=null;}
 }else{updateFill(a.from*(1-smooth(age/.55)));if(age>.6)action=null;}
 if(!action){$('hint').textContent='Mix another measure, or take a gulp.';$('donor').setAttribute('opacity',0);put('pour-stream','');}
}
buildShelf();

function drawPourInside(surface){
 const pouring=action?.type==='pour'&&time-action.start>.4&&time-action.start<1.1;
 put('pour-inside','');$('pour-ripple').setAttribute('opacity',0);
 if(!pouring)return;
 const point=pourImpact(surface,motion,art.mouth),age=time-action.start,color=action.recipe.color;
 put('pour-inside',`M ${art.mouth[0]} ${art.mouth[1]-2} L ${point[0]} ${point[1]}`);
 $('pour-inside').setAttribute('stroke',color);$('pour-inside').setAttribute('stroke-width',7+Math.sin(age*35));
 const ripple=$('pour-ripple');ripple.setAttribute('cx',point[0]);ripple.setAttribute('cy',point[1]-4);ripple.setAttribute('rx',9+(age*30%14));ripple.setAttribute('ry',3+(age*8%4));ripple.setAttribute('stroke',config.highlight);ripple.setAttribute('stroke-width',2);ripple.setAttribute('opacity',.55);
}

function tick(now){if(!frameCapture)requestAnimationFrame(tick);let dt=Math.min(.04,(now-last)/1000);last=now;if(document.hidden)return;time+=dt;
 tickAction();if(auto&&!action)target.angle=Math.sin(time*1.8)*.42*smooth(time/1.5);
 const shaking=time-shakeAt<.65,shake=shaking?Math.sin((time-shakeAt)*31)*30*Math.exp(-(time-shakeAt)*3):0;
 const steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;for(let i=0;i<steps;i++){for(const k of ['angle','x','y']){const desired=target[k]+(k==='x'?shake:0),w=k==='angle'?12:16;velocity[k]+=(w*w*(desired-motion[k])-1.4*w*velocity[k])*h;motion[k]+=velocity[k]*h;}advanceLiquid(state,motion,h,config);}
 const s=liquidSurface(config,state,motion);drawPourInside(s);put('boundary',s.boundary);put('liquid',s.fill);put('fill-clip',s.fill);put('shade',s.shade);put('ribbon',s.ribbon);put('cap',s.cap);$('cap').setAttribute('fill',config.highlight);const stops=$('potion-gradient').querySelectorAll('stop');[blendColor(config.color,config.highlight,.3),config.color,config.shadow].forEach((color,i)=>stops[i].setAttribute('stop-color',color));put('surface',config.lineWidth>0?s.surface:'');$('shade').setAttribute('fill',config.shadow);$('shade').setAttribute('opacity','.28');$('ribbon').setAttribute('fill',config.highlight);$('surface').setAttribute('stroke',config.ink);$('surface').setAttribute('stroke-width',config.lineWidth);
 const degrees=motion.angle*180/Math.PI,transform=`translate(${motion.x} ${motion.y}) rotate(${degrees})`;$('bottle').setAttribute('transform',transform);$('lip').setAttribute('transform',transform);$('tilt').value=degrees;$('tilt-label').textContent=Math.round(degrees)+'°';
 const bubbles=liquidBubbles(config,state,s);bubbles.forEach((b,i)=>{if(!bubbleNodes[i]){bubbleNodes[i]=document.createElementNS(NS,'circle');$('bubbles').append(bubbleNodes[i]);}const el=bubbleNodes[i];el.setAttribute('cx',b.center[0]);el.setAttribute('cy',b.center[1]);el.setAttribute('r',b.radius);el.setAttribute('fill',config.highlight);el.setAttribute('fill-opacity','.22');el.setAttribute('stroke',config.highlight);el.setAttribute('stroke-width','1.3');el.setAttribute('opacity',Math.min(.8,b.opacity*1.6));});for(let i=bubbles.length;i<bubbleNodes.length;i++)bubbleNodes[i].setAttribute('opacity',0);
 const age=time-popAt;$('lip').setAttribute('opacity',opened?(age<RELEASE+.08?1:0):(closingAt>-100&&time-closingAt<.34?0:1));
 corkPose=opened?popPose(age,launch):closingAt>-100?returnPose(time-closingAt,returnFrom,mouthPose()):{...mouthPose(),scaleX:1,scaleY:1};
 if(opened&&age>=RELEASE&&!popSound){popSound=true;cue('pop');velocity.y+=30;state.waveVelocity+=80;state.slopeVelocity+=.5;if($('mist').checked){cue('hiss');emitters.push({start:time,...launch,definition:{...defaultFluid(),resolution:32,width:110,height:160,duration:.32,sourceY:.9,sourceRadius:.085,rate:1.7,buoyancy:.45,vorticity:9,dissipation:1.5,velocityY:-22,threshold:.16,strokeWidth:0,seed:Math.floor(Math.random()*10000)}});breathAt=time+.25;}}
 if(opened&&corkPose.landed&&!landSound){landSound=true;cue('tap');}
 if(!opened&&closingAt>-100&&!seatSound&&time-closingAt>=RETURN_SEAT){seatSound=true;cue('plug');velocity.y+=20;state.waveVelocity+=35;}
 $('cork').setAttribute('transform',`translate(${corkPose.x} ${corkPose.y}) rotate(${corkPose.rotation}) scale(${corkPose.scaleX} ${corkPose.scaleY})`);
 const rad=corkPose.rotation*Math.PI/180,bottom=Math.max(...[[-56,-65],[56,-65],[50,48],[-50,48]].map(([x,y])=>Math.sin(rad)*x+Math.cos(rad)*y)),height=Math.max(0,191-corkPose.y-bottom),spread=1+height*.00065;
 $('cork-shadow').setAttribute('transform',`translate(${corkPose.x+height*.18} ${191-bottom*.23*spread+height*.018}) scale(${spread} ${.23*spread}) rotate(${corkPose.rotation})`);$('cork-shadow').setAttribute('opacity',(opened||closingAt>-100&&time-closingAt<.43)?.24/(1+height/160):0);$('cork-blur').setAttribute('stdDeviation',2+height*.012);
 $('bottle-shadow').setAttribute('transform',`translate(${motion.x+22} ${191-191*.15+motion.y*.15}) scale(1 .15) rotate(${degrees})`);$('bottle-shadow').setAttribute('opacity',.16/(1+Math.max(0,-motion.y)/70));
 const energy=Math.abs(state.slopeVelocity)*.35+Math.abs(state.waveVelocity)*.006+(time<manualUntil?Math.abs(velocity.angle)*.3+Math.hypot(velocity.x,velocity.y)*.002:0);
 if(config.fill>.01&&config.fill<.99&&energy>.045&&time-lastSlosh>.25+Math.random()*.15){lastSlosh=time;if($('sound').checked){sound.unlock();sound.cue('slosh',Math.min(.7,Math.max(.2,energy)));}}
 if(shaking&&time-lastShake>.21){lastShake=time;cue('shake');}
 emitters=emitters.filter(e=>time-e.start<2.5);emitters.forEach((e,i)=>{if(!puffNodes[i]){puffNodes[i]=document.createElementNS(NS,'path');$('gas').append(puffNodes[i]);}const age=time-e.start,n=puffNodes[i],paths=fluidContours(e.definition,age);n.setAttribute('d',paths.fill);n.setAttribute('fill',config.highlight);n.setAttribute('transform',`translate(${e.x} ${e.y}) rotate(${e.rotation}) translate(-55 -144)`);n.setAttribute('opacity',.42*(1-smooth((age-1.25)/1.2)));});for(let i=emitters.length;i<puffNodes.length;i++)puffNodes[i].setAttribute('opacity',0);
 if(opened&&config.fill>0&&$('mist').checked&&time>breathAt){breathAt=time+1.4+Math.random()*2.4;const p=s.local(0,Math.min(s.range.vmax-15,s.level+45));escapes.push({start:time,from:p,radius:4+Math.random()*4,wobble:Math.random()*6});}
 escapes=escapes.filter(e=>time-e.start<2.2);escapes.forEach((e,i)=>{if(!escapeNodes[i]){escapeNodes[i]=document.createElementNS(NS,'circle');}const n=escapeNodes[i],age=time-e.start,inside=age<1.25;if(inside){$('neck-bubbles').append(n);const t=smooth(age/1.25);n.setAttribute('cx',e.from[0]*(1-t)+art.mouth[0]*t+Math.sin(age*7+e.wobble)*3*(1-t));n.setAttribute('cy',e.from[1]*(1-t)+art.mouth[1]*t);}else{$('escaped-bubbles').append(n);if(!e.exit)e.exit=mouthPose();const t=age-1.25;n.setAttribute('cx',e.exit.x+Math.sin(t*5+e.wobble)*10);n.setAttribute('cy',e.exit.y-t*60);}
  const burst=smooth((age-1.95)/.2);n.setAttribute('r',e.radius*(1+burst*.9));n.setAttribute('fill',config.highlight);n.setAttribute('fill-opacity',.13*(1-burst));n.setAttribute('stroke',config.highlight);n.setAttribute('stroke-width',1.7*(1-burst));n.setAttribute('opacity',.7*smooth(age/.15)*(1-burst));});for(let i=escapes.length;i<escapeNodes.length;i++)escapeNodes[i].setAttribute('opacity',0);
 scene.dataset.fillArea=(s.area/s.totalArea).toFixed(5);scene.dataset.cork=opened?'open':'closed';scene.dataset.slosh=state.wave.toFixed(3);scene.dataset.gas=emitters.length;scene.dataset.bubbles=bubbles.length;scene.dataset.action=action?.type??'idle';scene.dataset.audioCues=sound.events.slice(-12).join(',');scene.dataset.corkLanded=String(!!corkPose?.landed);
}
for(const event of ['pointerdown','keydown'])window.addEventListener(event,()=>{if($('sound').checked)sound.unlock();},{once:true});
window.addEventListener('pagehide',()=>sound.dispose());
if(frameCapture)mountFrameCapture({sound,step:dt=>tick(last+dt*1000),getTime:()=>time});else requestAnimationFrame(tick);

mountCapture(sound);
