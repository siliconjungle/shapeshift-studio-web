import {createLevelAudioVariants} from './level-audio.js';
import {createCloudRainAudio} from './cloud-rain-audio.js';
import {chooseLocationMelody,locationPopSound} from './location-pop-audio.js';
import {soundRecipe} from '../shared/action-sound-recipes.js';
import {scheduleAudioRecipe} from '../shared/audio-synthesis.js';
import {EMOTE_VOICES,EmoteAudioCues} from '../shared/emote-audio-cues.js';
import {feedbackReactions as ids} from './feedback-motion.js';
// One audio context, cached voice buffers, and the game's original foley recipes.
export function createMapAudio(assetRoot){
 let locationMelody=chooseLocationMelody();const levelCue=createLevelAudioVariants();
 let context,master,voice=null,step=0,decoded=null,muted=false,voiceEnabled=true,voiceVolume=.55,disposed=false,serial=0,rainAudio=null,rainEnabled=true,rainVolume=.3;
 const active=new Set(),buffers=new Map(),cues=new EmoteAudioCues(),counts={step:0,click:0,denied:0,birdLand:0,locationPop:0,locationPass:0,unlock:0,lock:0,cloud:0,puff:0,arrival:0,voice:0};
 try{muted=localStorage.getItem('inkwell-action-muted')==='1';const prefs=JSON.parse(localStorage.getItem('inkwell-reaction-audio')??'null');voiceEnabled=prefs?.enabled!==false;voiceVolume=Math.max(0,Math.min(1,prefs?.volume??.55));}catch{}
 try{const prefs=JSON.parse(localStorage.getItem('inkwell-weather-audio')??'null');rainEnabled=prefs?.enabled!==false;if(Number.isFinite(prefs?.volume))rainVolume=Math.max(0,Math.min(1,prefs.volume));}catch{}
 const encoded=Promise.all(ids.map(async id=>{const clip=EMOTE_VOICES[id][0],r=await fetch(new URL('audio/'+clip+'.mp3',assetRoot));if(!r.ok)throw Error('Missing map voice '+clip);return[clip,await r.arrayBuffer()];})).catch(error=>{console.warn(error);return[];});
 async function unlock(){
  if(disposed)return;
  try{if(!context){context=new AudioContext();master=context.createGain();master.gain.value=.6;master.connect(context.destination);}await context.resume();
   decoded??=encoded.then(rows=>Promise.all(rows.map(async([id,data])=>buffers.set(id,await context.decodeAudioData(data))))).catch(error=>console.warn('Map voices unavailable',error));
  }catch(error){console.warn('Map audio unavailable',error);}
 }
 function stopVoice(){if(voice){const old=voice;voice=null;try{old.stop()}catch{}}}
 function stop(){serial++;stopVoice();rainAudio?.stop();for(const s of active)try{s.stop()}catch{};}
 function play(kind,{biome='camp',level=1,count=kind,recipe}={}){
  if(disposed||muted||document.hidden||context?.state!=='running'||active.size>24)return false;
  const gain=context.createGain();gain.gain.value=level;gain.connect(master);let remaining=0;
  scheduleAudioRecipe(context,gain,recipe??soundRecipe(kind,{sand:biome==='well',snow:biome==='gate',step:step++}),{track(source,nodes){remaining++;active.add(source);source.onended=()=>{active.delete(source);for(const n of nodes)n.disconnect();if(!--remaining)gain.disconnect();};}});
  if(count in counts)counts[count]++;return true;
 }
 const gesture=()=>void unlock(),hidden=()=>{if(document.hidden){stop();void context?.suspend();}else if(context)void context.resume();};
 document.addEventListener('pointerdown',gesture);document.addEventListener('keydown',gesture);document.addEventListener('visibilitychange',hidden);
 return{unlock,stop,play,
  async captureStream(){await unlock();const destination=context.createMediaStreamDestination();master.connect(destination);return destination.stream;},
  rain(amount){if(disposed||muted||!rainEnabled||document.hidden||context?.state!=='running'){rainAudio?.stop();return;}if(!rainAudio&&amount>0)rainAudio=createCloudRainAudio(context,master);rainAudio?.update(amount*rainVolume);},
  click({denied=false}={}){const token=++serial;void unlock().then(()=>{if(token===serial)play(denied?'wish-invalid':'wish-select',{level:denied?.72:.62,count:denied?'denied':'click'});});},
  restartIntroduction(){locationMelody=chooseLocationMelody(locationMelody);},
  locationPop(index){return play('pot-place',{...locationPopSound(index,Math.random,locationMelody),count:'locationPop'});},
  locationPass(index){const sound=locationPopSound(index,Math.random,locationMelody);return play('pot-place',{...sound,level:sound.level*.8,count:'locationPass'});},
  unlockLocation(){return play('belief-discovery',{level:.5,count:'unlock'});},
  lockAppear(){return play('pot-place',{level:.3,count:'lock'});},
  birdHit(){void unlock().then(()=>play('wood',{level:.5}));},
  enterLocation(){void unlock().then(()=>{const {kind,level}=levelCue('enter');play(kind,{level});});},
  startMap(){void unlock().then(()=>{play('wish-select',{level:.4});play('belief-discovery',{level:.28});});},
  irisClose(){return play('wish-nightfall',{level:.14});},
  irisOpen(){return play('wish-daybreak',{level:.14});},
  clearLocation(){const {kind,level}=levelCue('clear');return play(kind,{level});},
  birdLand(){return play('slime-land',{level:.6,count:'birdLand'});},
  birdCall(){return play('bird-hearth',{level:.65});},
  cloudClick(){void unlock().then(()=>play('slime-hit',{level:.5,count:'cloud'}));},
  puff(){play('slime-move',{level:.3,count:'puff'});},
  step(biome){play('step',{biome,level:.65,count:'step'});},
  arrive(){play('complete',{level:.4,count:'arrival'});},
  update(event){for(const action of cues.update(event,{audible:voiceEnabled&&!document.hidden,ready:buffers.size===ids.length&&context?.state==='running'})){
   if(action.type==='stop'){stopVoice();continue;}const buffer=buffers.get(action.clip);if(!buffer)continue;
   stopVoice();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.value=voiceVolume*.6;source.connect(gain).connect(master);source.onended=()=>{source.disconnect();gain.disconnect();if(voice===source)voice=null;};voice=source;source.start();counts.voice++;
  }},
  get diagnostics(){return{ready:context?.state==='running',buffers:buffers.size,active:active.size,rain:rainAudio?.active??false,counts:{...counts}};},
  dispose(){disposed=true;stop();rainAudio?.dispose();document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('visibilitychange',hidden);void context?.close();}
 };
}
