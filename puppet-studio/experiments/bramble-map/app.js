import {createSunflowerResident} from './sunflower-resident.js';
import {LevelVisit} from './level-transition.js';
import {createMapIris} from './map-iris.js';
import {createMapClearFeedback} from './map-clear-feedback.js';
import {routeTo,retargetRoute,segmentStart,segmentEnd,segmentLength,segmentProgress} from './travel-routing.js';
import {canTravelTo} from './map-progression.js';
import {createMapLocks} from './map-locks.js';
import {CloudPlay} from './cloud-play.js';
import {MapCloudRain} from './cloud-rain.js';
import {createMapSceneryEffects} from './map-scenery-effects.js';
import {wildlifeAssets} from './map-wildlife.js';
import {mountMapCamera,mapBounds,mapOverview} from './map-camera.js';
import {animateTravelButton,animateDeniedButton,animateEnterButton,travelButtonState,setTravelButtonLabel} from './button-feedback.js';
import {createMapFeedback} from './map-feedback.js';
import {createMapAudio} from './map-audio.js';
import {feedbackAssets} from './feedback-motion.js';
import {mountTitleScreen} from './title-screen.js';
import {mountTrailerCapture} from './trailer-capture.js';
import {mapClouds,cloudPose} from './map-atmosphere.js';
import {routeInkWidth} from './ink-style.js';
import {createTravellerPuppet,poseTraveller,travellerRig} from './traveller-puppet.js';
import {LittleGodsMapRenderer,configureMapPalette,fetchArt} from './little-gods-renderer.js';
import {inkRoute,routePoint} from '@shapeshift-labs/studio-core/procedural/ink-route';
import {mapScene,nearestSceneryRegion,scheduleMapReveal} from './scene.js';
import {revealPose,bannerPose,hoverPose,travelEase,clamp,markerAnchor,anchoredWaypoints,treeWind,travelPlan,walkingPose,facingFromVector,approachColour} from './motion.js';

const NS='http://www.w3.org/2000/svg',assetRoot=new URL('../../../assets/bramble-map/',import.meta.url),$=id=>document.getElementById(id),defs=$('art'),scene=structuredClone(mapScene),locations=new Map(),routes=new Map(),scenery=[],clouds=[],motes=[];
const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');
let sunflower,mapRenderer,travellerPuppet,feedback,locks,audio,navigation,levelVisit,iris,entry,clearFeedback,facing='right';
let gentle=motionQuery.matches,paused=false,clock=0,last=0,tempo=1,selected='camp',current='camp',trip=null,width=routeInkWidth,style='dashed';
const visited=new Set(['camp']),cleared=new Set(),travelled=new Set();
function svg(tag,attrs={},parent){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(parent)parent.append(e);return e;}
function art(name,attrs,parent){return svg('use',{href:'#'+name,...attrs},parent);}
function text(value,attrs,parent){const e=svg('text',attrs,parent);e.textContent=value;return e;}
const labelMeasure=document.createElement('canvas').getContext('2d');
function fitLabel(e){
 e.removeAttribute('textLength');e.removeAttribute('lengthAdjust');e.removeAttribute('y');e.style.fontSize='27px';
 // SVG getBBox includes the font's generous ascender/descender box. Canvas
 // actualBoundingBox measures painted glyphs, avoiding unnecessarily tiny text.
 labelMeasure.font='660 27px InkwellDisplay';let metrics=labelMeasure.measureText(e.textContent);
 const height=metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent;
 const size=27*Math.min(1,184/Math.max(1,e.getComputedTextLength()),26/Math.max(1,height));e.style.fontSize=size+'px';
 labelMeasure.font=`660 ${size}px InkwellDisplay`;metrics=labelMeasure.measureText(e.textContent);
 const baseline=52+(metrics.actualBoundingBoxAscent-metrics.actualBoundingBoxDescent)/2;
 const curve=$(e.querySelector('textPath').getAttribute('href').slice(1));
 curve.setAttribute('d',`M -105 ${baseline-8} Q 0 ${baseline+8} 105 ${baseline-8}`);
}
function createLocation(n,popNote){
 const root=svg('g',{class:'map-location',role:'button',tabindex:0,'aria-label':n.name+' — '+n.kind,'aria-pressed':n.id===selected,'data-location':n.id,transform:`translate(${n.x} ${n.y})`},$('locations'));
 const halo=svg('ellipse',{class:'halo',rx:n.width*.44,ry:15,fill:'none',opacity:0},root);
 const figure=svg('g',{},root),height=n.width*assetInfo[n.asset].height/assetInfo[n.asset].width;
 art(n.asset,{x:-n.width/2,y:-height,width:n.width,height},figure);
 const banner=svg('g',{},root),ribbon=art('banner',{x:-144,y:9,width:288,height:76},banner);
 const curveId='banner-label-curve-'+n.id;svg('path',{id:curveId,d:'M -105 52 Q 0 68 105 52'},defs);
 const label=svg('text',{class:'map-label'},banner),labelText=svg('textPath',{href:'#'+curveId,startOffset:'50%',method:'align',spacing:'auto'},label);labelText.textContent=n.name;
 svg('rect',{class:'hit',x:-n.width/2-12,y:-height-12,width:n.width+24,height:height+85,rx:22},root);
 const e={...n,popNote,root,halo,figure,banner,ribbon,label,labelText,height,hover:0,velocity:0,target:0,labelProgress:0,labelVelocity:0,colorReveal:visited.has(n.id)?1:0};locations.set(n.id,e);
 root.addEventListener('pointerenter',()=>e.target=1);root.addEventListener('pointerleave',()=>e.target=0);
 root.addEventListener('focus',()=>e.target=1);root.addEventListener('blur',()=>e.target=0);
 root.addEventListener('click',()=>choose(n.id));root.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(n.id);}});
 fitLabel(label);
}
function rebuildRoutes(){
 $('routes').replaceChildren();routes.clear();
 for(const [index,def]of scene.routes.entries()){
  const route=inkRoute(anchoredWaypoints(def,scene.locations),{width,dash:style==='dotted'?0:7.5,spacing:style==='dotted'?13:19,roughness:.8,margin:0,seed:index*11+7});
  const root=svg('g',{'data-route':def.id},$('routes'));
  const marks=route.marks.map(m=>svg('path',{d:m.d,'data-t':m.t,fill:'#89745b',opacity:0},root));routes.set(def.id,{...def,...route,root,marks,passedMarks:new Set()});
 }
 if(mapRenderer)mapRenderer.syncRoutes().catch(console.error);
 if(trip)trip.segments=trip.segments.map(s=>({...s,route:routes.get(s.route.id)}));
}
function updatePanel(){const button=$('travel'),state=travelButtonState(selected,current,!!trip,!canTravelTo(scene.locations,cleared,selected),trip?.destination);button.hidden=false;button.disabled=state.disabled||!!levelVisit?.active;setTravelButtonLabel(button,state.label,gentle);button.setAttribute('aria-label',trip?.destination===selected?'Travelling to '+locations.get(trip.destination).name:(state.locked?'Locked: ':state.enter?'Enter ':'Travel to ')+locations.get(selected).name);for(const e of locations.values())e.root.setAttribute('aria-pressed',String(e.id===selected));}
function hitCloud(id){const c=clouds[Number(id)];if(!c)return;c.play.hit(clock);audio.cloudClick();}
function choose(id){if(levelVisit?.active||!locations.has(id))return;audio.click({denied:!canTravelTo(scene.locations,cleared,id)});feedback.select(id);selected=id;updatePanel();$('announcer').textContent=locations.get(id).name+'. '+locations.get(id).description;}
function startTravel(){
 if(levelVisit?.active)return;
 if(!canTravelTo(scene.locations,cleared,selected)){animateDeniedButton($('travel'),gentle);audio.click({denied:true});return;}
 if(selected===trip?.destination)return;
 if(!trip&&selected===current){startEnter();return;}
 const segments=trip?retargetRoute([...routes.values()],trip,selected):routeTo([...routes.values()],current,selected);
 if(!segments?.length)return;
 animateTravelButton($('travel'),gentle);audio.click();
 trip={segments,index:0,age:0,destination:selected,progress:segmentStart(segments[0]),...travelPlan(segments)};updatePanel();
}
function startEnter(){
 if(!levelVisit.start(current))return;
 const n=locations.get(current),from=navigation.pose;
 entry={id:current,from,overview:{...mapOverview},focus:{x:n.x,z:n.y-n.height*.42,zoom:Math.min(3.5,Math.max(1.65,from.zoom+.45))},gentle};
 animateEnterButton($('travel'),gentle);audio.enterLocation();navigation.setEnabled(false);
 document.querySelector('.map-shell').inert=true;iris??=createMapIris();iris.draw(0,innerWidth/2,innerHeight/2,gentle);iris.show();updatePanel();
}
function finishEnter(){
 if(entry)navigation.setPose(entry.gentle?entry.from:entry.overview);entry=null;iris?.hide();navigation?.setEnabled(true);
 document.querySelector('.map-shell').inert=false;updatePanel();$('travel').focus({preventScroll:true});
}
function updateEnter(dt){
 if(!entry)return;const e=entry,pose=levelVisit.tick(dt);if(pose.done)return;
 const returning=pose.returning;
 const f=e.gentle?0:pose.focus,from=returning&&!e.gentle?e.overview:e.from,to=e.focus;
 navigation.setPose({x:from.x+(to.x-from.x)*f,z:from.z+(to.z-from.z)*f,zoom:from.zoom+(to.zoom-from.zoom)*f});
 const center=new DOMPoint(to.x,to.z).matrixTransform($('map').getScreenCTM());iris.phase(pose.phase);iris.draw(pose.cover,center.x,center.y,e.gentle,levelVisit.active.age);
}
function finishRouteInk(segment){
 const low=Math.min(segmentStart(segment),segmentEnd(segment)),high=Math.max(segmentStart(segment),segmentEnd(segment));
 segment.route.marks.forEach((mark,i)=>{const t=Number(mark.dataset.t);if(t>=low&&t<=high)segment.route.passedMarks.add(i);});
}
function randomizeReveal(){
 scheduleMapReveal(scene);
 for(const n of scene.locations){const e=locations.get(n.id);if(e)e.reveal=n.reveal;}
 for(const r of scene.routes){const e=routes.get(r.id);if(e){e.start=r.start;e.duration=r.duration;}}
}
function reset(){if(levelVisit?.active){levelVisit.reset();finishEnter();}clearFeedback?.reset();cleared.clear();for(const e of locations.values())e.clearAt=-Infinity;randomizeReveal();for(const c of clouds)c.play.reset();feedback?.reset();locks?.reset();audio?.stop();audio?.restartIntroduction();clock=0;trip=null;current='camp';selected='camp';facing='right';visited.clear();visited.add('camp');travelled.clear();for(const r of routes.values())r.passedMarks.clear();for(const e of locations.values()){e.popSoundPlayed=false;e.root.removeAttribute('data-pop-sound');e.labelProgress=0;e.labelVelocity=0;e.colorReveal=e.id==='camp'?1:0;}paused=false;updatePanel();}
function animate(now){
 requestAnimationFrame(animate);const elapsed=paused?0:last?(now-last)/1000:0,dt=Math.min(.05,elapsed);last=now;if(document.hidden)return;
 mapRenderer?.profiler?.begin(now);
 clock+=elapsed*tempo;updateEnter(dt);clearFeedback?.tick(dt,gentle);const intro=gentle?10:clock;
 for(const e of locations.values()){
  const age=intro-e.reveal,p=revealPose(age,{gentle});const showLabel=age>.18&&(visited.has(e.id)||e.id===selected||e.target>0);[e.labelProgress,e.labelVelocity]=paused||gentle?[Number(showLabel),0]:hoverPose(e.labelProgress,e.labelVelocity,Number(showLabel),dt);const b=bannerPose(e.labelProgress,gentle);[e.hover,e.velocity]=hoverPose(e.hover,e.velocity,e.target,dt);
  if(!e.popSoundPlayed&&age>=.04){e.popSoundPlayed=true;const played=!gentle&&age<.24&&audio.locationPop(e.popNote);e.root.setAttribute('data-pop-sound',played?'played':gentle?'reduced-motion':age>=.24?'missed':audio.diagnostics.ready?'muted':'audio-locked');}
  const h=gentle?e.target:e.hover,clearAge=clock-(e.clearAt??-Infinity),celebrate=gentle||clearAge<0||clearAge>.65?0:Math.sin(clearAge*22)*Math.exp(-clearAge*6)*.14;
  e.figure.setAttribute('transform',`translate(0 ${p.dy-h*5}) rotate(${p.angle+h*1.2}) scale(${p.x*(1+h*.02)*(1+celebrate)} ${p.y*(1+h*.02)*(1-celebrate)})`);e.figure.setAttribute('opacity',p.opacity);
  e.banner.setAttribute('transform',`translate(0 ${b.dy-h*2}) rotate(${b.angle})`);e.ribbon.setAttribute('transform',`translate(0 47) scale(${b.x} ${b.y}) translate(0 -47)`);e.label.setAttribute('opacity',b.textOpacity);e.banner.setAttribute('opacity',b.opacity);e.banner.setAttribute('aria-hidden',String(!showLabel));
  let colorTarget=visited.has(e.id)?1:0;if(trip&&!colorTarget){let distance=0;for(const segment of trip.segments){distance+=segmentLength(segment);if(segment.to===e.id){colorTarget=approachColour(distance,trip.age+elapsed,trip);break;}}}e.colorReveal=Math.max(e.colorReveal,colorTarget);const colorEase=e.colorReveal*e.colorReveal*(3-2*e.colorReveal);e.root.dataset.colorReveal=String(colorEase);
  e.halo.setAttribute('opacity',0);e.root.dataset.visited=String(visited.has(e.id));e.root.dataset.cleared=String(cleared.has(e.id));e.root.dataset.locked=String(!canTravelTo(scene.locations,cleared,e.id));e.root.dataset.highlighted=String(e.target>0);e.root.style.pointerEvents=age<.25?'none':'auto';e.root.setAttribute('tabindex',age<.25?-1:0);
 }
 // Use the biome's exact colour progress, including approach and visited state.
 for(const e of scenery){
  const biome=locations.get(e.region).root;
  for(const key of ['colorReveal','visited','highlighted'])e.g.dataset[key]=biome.dataset[key];
  const wind=gentle||e.asset.endsWith('rocks')?0:treeWind(clock,e.phase);
  e.g.setAttribute('transform',`translate(${e.x} ${e.y}) rotate(${e.rotation+wind})`);
 }
 let pos=markerAnchor(locations.get(current)),gait={cycle:clock*2,weight:0};
 if(trip){trip.age+=elapsed;gait=walkingPose(trip.age,trip,gentle);let distance=gait.distance,index=0;
  while(index<trip.segments.length-1&&distance>segmentLength(trip.segments[index])){
   distance-=segmentLength(trip.segments[index]);const passed=trip.segments[index];
   // Distance is scanned from the start each frame; sound only newly crossed stops.
   if(index>=trip.index){audio.locationPass(locations.get(passed.to).popNote);finishRouteInk(passed);}
   if(passed.startT===undefined)travelled.add(passed.route.id);visited.add(passed.to);index++;
  }
  trip.index=index;const segment=trip.segments[index],t=clamp(distance/Math.max(1e-7,segmentLength(segment)));trip.progress=segmentProgress(segment,t);pos=routePoint(segment.route,trip.progress);const ahead=routePoint(segment.route,clamp(trip.progress+(segment.reverse?-.015:.015)));facing=facingFromVector(ahead.x-pos.x,ahead.y-pos.y,facing);
  if(gait.done){for(const s of trip.segments){finishRouteInk(s);if(s.startT===undefined)travelled.add(s.route.id);visited.add(s.to);}current=trip.destination;pos=markerAnchor(locations.get(current));trip=null;$('announcer').textContent='Arrived at '+locations.get(current).name;updatePanel();}
 }
 sunflower?.tick(clock,{intro,traveller:pos,gentle});
 locks.tick(dt,intro,gentle);
 for(const r of routes.values()){
  const reveal=clamp((intro-r.start)/r.duration),segment=trip?.segments[trip.index],active=segment?.route.id===r.id,done=travelled.has(r.id);
  r.marks.forEach((e,i)=>{const stamp=Number(e.dataset.t),drawn=intro>=r.start+r.duration?1:clamp((reveal-stamp)*12),crossed=active&&stamp>=Math.min(segmentStart(segment),trip.progress)&&stamp<=Math.max(segmentStart(segment),trip.progress);if(crossed)r.passedMarks.add(i);const passed=done||r.passedMarks.has(i);e.setAttribute('opacity',drawn*(passed?.95:.42));e.setAttribute('fill',passed?'#8f563b':'#ad8160');});
 }
 $('traveller').setAttribute('transform',`translate(${pos.x} ${pos.y})`);$('traveller').setAttribute('opacity',clamp((intro-.24)*5));const reaction=feedback.tick(dt,clock,{pos,gait,walking:!!trip&&!paused,destination:trip?.destination??null,biome:nearestSceneryRegion(pos.x,pos.y),gentle,intro});poseTraveller(travellerPuppet,{...gait,time:clock,facing,gentle,reaction});
 for(const [i,m]of motes.entries()){
  const age=(clock*.13+i*.173)%1,opacity=gentle?0:Math.sin(age*Math.PI)*.48;
  m.setAttribute('cx',70+(i*173)%1300+Math.sin(clock*.2+i)*20);
  m.setAttribute('cy',90+(i*137+clock*8)%760);m.setAttribute('opacity',opacity);
 }
 for(const c of clouds){const p=cloudPose(c,clock,gentle),feel=c.play.sample(clock,gentle);c.pose={x:p.x,y:p.y+feel.dy};c.rainAmount=feel.rain;c.g.setAttribute('transform',`translate(${c.pose.x} ${c.pose.y}) rotate(${feel.angle}) scale(${feel.sx} ${feel.sy})`);c.g.setAttribute('data-raining',String(c.play.raining));c.g.setAttribute('data-cloud-hits',String(c.play.hits));}
 mapRenderer?.cloudRain?.update(clock,gentle);audio?.rain(Math.max(0,...clouds.map(c=>c.rainAmount)));
 mapRenderer?.profiler?.mark('animation');
 mapRenderer?.render(clock,gentle);
 mapRenderer?.profiler?.end(mapRenderer);
}
const assetInfo={};
async function init(){
 const background=$('world').querySelector('use[href="#background"]');for(const [key,value]of Object.entries(mapBounds))background.setAttribute(key,value);
 const palette=await configureMapPalette(assetRoot);mapRenderer=new LittleGodsMapRenderer($('map'),palette);
 const names=[...wildlifeAssets,...feedbackAssets,'location-lock','cloud-cumulus','cloud-wisp','background','banner','camp','shop','well','shrine','gate','keep','pine','oak','rocks','compass','marker',...travellerRig.assets,...new Set(scene.scenery.map(s=>s[0]).filter(n=>!['pine','oak','rocks'].includes(n)))];
 await Promise.all(names.map(async name=>{const response=await fetch(new URL(name+'.svg',assetRoot));if(!response.ok)throw Error('Could not load '+name);const original=await response.text(),sourceText=await mapRenderer.asset(name,original,new URL(name+'.svg',assetRoot));const doc=new DOMParser().parseFromString(sourceText,'image/svg+xml'),source=doc.documentElement;if(source.nodeName!=='svg')throw Error('Invalid SVG '+name);const vb=source.getAttribute('viewBox').split(/[ ,]+/).map(Number);assetInfo[name]={width:vb[2],height:vb[3]};const symbol=svg('symbol',{id:name,viewBox:vb.join(' '),preserveAspectRatio:'xMidYMid meet'},defs);for(const child of source.children)symbol.append(document.importNode(child,true));}));
 await Promise.all([document.fonts.load('24px InkwellDisplay'),document.fonts.load('18px Inkwell')]);
 randomizeReveal();rebuildRoutes();
 for(const [i,[asset,x,y,w,rotation,region]]of scene.scenery.entries()){const g=svg('g',{'data-biome':region,'data-scenery':i,role:'button',tabindex:0,'aria-label':asset.includes('rocks')?'Hit stone':'Chop tree'},$('scenery')),h=w*assetInfo[asset].height/assetInfo[asset].width;art(asset,{x:-w/2,y:-h,width:w,height:h},g);svg('rect',{x:-w/2,y:-h,width:w,height:h,fill:'transparent'},g);scenery.push({g,asset,region,x,y,width:w,rotation,phase:i*1.7,start:0});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();mapRenderer.sceneryEffects?.hit(String(i));}});}
 scene.locations.forEach(createLocation);
 const cloudLayer=svg('g',{id:'clouds'},$('world'));
 for(const [i,c]of mapClouds.entries()){
  const g=svg('g',{'data-cloud':c.art,'data-cloud-id':i,role:'button',tabindex:0,'aria-label':'Jiggle cloud '+(i+1)},cloudLayer),h=c.width*assetInfo[c.art].height/assetInfo[c.art].width;
  art(c.art,{x:-c.width/2,y:-h/2,width:c.width,height:h},g);svg('ellipse',{rx:c.width*.48,ry:Math.max(18,h*.44),fill:'transparent'},g);
  clouds.push({...c,g,height:h,play:new CloudPlay(),pose:{x:c.x,y:c.z},rainAmount:0});
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();hitCloud(String(i));}});
 }

 for(let i=0;i<22;i++)motes.push(svg('circle',{r:2+i%4,fill:i%3?'#fff0d1':'#bd945c',opacity:0},$('ambience')));
 audio=createMapAudio(assetRoot);feedback=createMapFeedback($('map'),locations,audio);locks=createMapLocks($('map'),locations,scene,cleared,audio);clearFeedback=createMapClearFeedback($('map'),locations);
 window.addEventListener('pagehide',()=>audio.dispose(),{once:true});
 sunflower=await createSunflowerResident($('world'),locations.get('shop'),mapRenderer);
 travellerPuppet=createTravellerPuppet($('traveller-pin'),assetInfo);
 mapRenderer.mount();mapRenderer.wildlife.enableClicks($('map'),audio);mapRenderer.cloudRain=new MapCloudRain(mapRenderer.scene,clouds);window.addEventListener('pagehide',()=>mapRenderer.cloudRain.dispose(),{once:true});mapRenderer.sceneryEffects=await createMapSceneryEffects(mapRenderer,scenery,audio,assetRoot);await mapRenderer.syncRoutes();
 navigation=mountMapCamera($('map'),{onView:v=>mapRenderer.setView(v),onTap:choose,onCharacter:()=>sunflower.wave(),onCloud:hitCloud,onBird:()=>mapRenderer.wildlife.hit(),onScenery:id=>mapRenderer.sceneryEffects.hit(id)});window.addEventListener('pagehide',()=>navigation.dispose(),{once:true});
 levelVisit=new LevelVisit({close:()=>audio.irisClose(),open:()=>audio.irisOpen(),clear:id=>{
  if(entry)navigation.setPose(entry.gentle?entry.from:entry.overview);
  const first=!cleared.has(id);cleared.add(id);locations.get(id).clearAt=clock;clearFeedback.trigger(id);audio.clearLocation();
  $('announcer').textContent=locations.get(id).name+' cleared.'+(first&&id!==scene.locations.at(-1).id?' The next location is unlocked.':'');updatePanel();
 },done:finishEnter});
 window.addEventListener('pagehide',()=>iris?.dispose(),{once:true});
 updatePanel();$('loading').hidden=true;
 motionQuery.addEventListener('change',e=>gentle=e.matches);
 $('travel').onclick=startTravel;
 if(new URLSearchParams(location.search).has('feedback-test')){const diagnostics=document.createElement('script');diagnostics.type='application/json';diagnostics.id='feedback-diagnostics';document.body.append(diagnostics);setInterval(()=>diagnostics.textContent=JSON.stringify(feedback.diagnostics),200);}
 window.brambleMap={snapshot:()=>({sunflower:sunflower.snapshot(),clock,selected,current,travelling:!!trip,cleared:[...cleared],entering:levelVisit?.active?.id??null,paused,gentle,locations:scene.locations.map(n=>({id:n.id,name:n.name})),routeMarks:[...routes.values()].reduce((n,r)=>n+r.marks.length,0),assets:assetInfo,feedback:feedback.diagnostics}),replay:reset};
 mountTrailerCapture(audio);
 const title=mountTitleScreen({audio,gentle,onStart:()=>{last=0;clock=0;requestAnimationFrame(animate);}});
 window.addEventListener('pagehide',()=>title.dispose(),{once:true});
}
init().catch(error=>{$('loading').textContent=$('title-prompt').textContent='The map could not unfold: '+error.message;console.error(error);});
