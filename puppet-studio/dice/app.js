import {DuelEmotes} from './emotes.js';
import {SkeletonDuel} from './duel.js';
import {DuelCharacters} from './characters.js';
import {RunHealth} from './encounter.js';
import {reloadLayout,judgeReload,ReloadPace} from './reload.js';
import {mountHearts,updateHearts,tileFeedback} from './feedback.js';
import {createScenePlayer} from '../scene3d/runtime.js';
import {diceProject,configureDiceTable} from './project.js';
import {DICE_SIDES} from './geometry.js';
import {simulateDice,physicsRollClip,landingTime,impactFloorPoint} from './physics.js';
import {RollTiming} from './timing.js';
import {rollTarget} from './rules.js';
import {pickDie,assistLanding,comboFeedback,landingRecovery,failureFeedback,motionForTempo} from './gameplay.js';
import {LandingDust} from '../scene3d/landing-dust.js';
import {DiceFraming} from './framing.js';
import {DiceSparks} from './particles.js';
import {DiceSound} from './sound.js';
const $=id=>document.getElementById(id),canvas=$('dice-canvas'),audio=new DiceSound(),timing=new RollTiming(),gentle=matchMedia('(prefers-reduced-motion: reduce)').matches;
const framing=new DiceFraming(),health=new RunHealth(),pace=new ReloadPace(),duel=new SkeletonDuel();
const characters=new DuelCharacters({hero:$('hero-character'),enemy:$('enemy-character'),reduced:gentle});
const emotes=new DuelEmotes(characters,audio);
let rollId=0,layout=reloadLayout(0);
mountHearts($('health'));mountHearts($('enemy-health'));
let pausedAt=null,pauseOffset=0;
const transportNow=()=> (pausedAt??performance.now())/1000-pauseOffset;
const sparks=new DiceSparks($('dice-sparks'),{reduced:gentle});
let player,dust,landedDust=false,autoNext=false,parts,phase='preparing',sides=6,combo=0,clock=0,last=performance.now(),started=0,rate=.75,simulation,raw,rollDuration=0,visualDuration=0,previousTime=-1,readyAt=0,raf,disposed=false,shakeAt=-10,shakePower=0,shakeDuration=.3,assistPending=false,failedCombo=null,failureUntil=0,lockedDefence=null;
const projects=new Map();
const getProject=n=>{if(!projects.has(n))projects.set(n,diceProject({sides:n}));return projects.get(n);};
function report(e){$('error').hidden=false;$('error').textContent=e.message??String(e);console.error(e);phase='ready';}
const noteElements=new Map();
function drawTiles(){
 for(const el of noteElements.values())el.remove();noteElements.clear();
 for(const tile of layout){
  const element=document.createElement('span');element.className='beat-note '+(tile.kind==='heart'?'heart-pickup':tile.kind);element.dataset.kind=tile.kind;element.dataset.tile=tile.id;
  const icon=tile.kind+'.svg';
  element.innerHTML='<span class="good-zone"></span><span class="perfect-zone"></span><img class="target-icon" src="../scene3d/assets/dice/icons/'+icon+'" alt="" draggable="false">';
  element.style.left=tile.center*100+'%';element.style.width=tile.width*100+'%';$('targets').append(element);noteElements.set(tile.id,element);
 }
}
function renderTiming(){
 $('needle').style.left=timing.position*100+'%';$('meter').dataset.progress=String(timing.position);$('meter').dataset.phase=timing.phase;
}
function resetBar(){timing.reset();renderTiming();$('timing-bonus').textContent='';delete $('meter').dataset.outcome;delete document.body.dataset.timing;}
function updateHud(){$('combo').textContent=combo;$('speed').textContent=pace.speed.toFixed(2)+'×';document.body.dataset.combo=combo;document.body.dataset.hearts=health.heartUnits/2;document.body.dataset.slowRolls=pace.slowRolls;updateHearts($('health'),health.heartUnits/2);updateHearts($('enemy-health'),duel.heartUnits/2);$('enemy-combo').textContent=duel.combo;$('enemy-speed').textContent=duel.speed.toFixed(2)+'×';$('enemy-die').textContent='D'+duel.sides;$('enemy-roll').textContent=duel.lastRoll===null?'':duel.lastRoll+' ROLLED';document.body.dataset.enemyHearts=duel.heartUnits/2;document.body.dataset.enemyCombo=duel.combo;}
function camera(){const h=player.scene,p=h.objects.get('die-rig').position;h.camera.position.set(p.x+3.6,6.1,p.z+6.6);h.camera.lookAt(p.x,1.4,p.z);h.camera.updateMatrixWorld();framing.fit(h,parts.solid,.24);}
async function prepare(){phase='preparing';autoNext=false;dust?.clear();resetBar();$('loading').hidden=Boolean(player);sides=pickDie(DICE_SIDES,sides);parts=structuredClone(await getProject(sides));if(player)await player.scene.load(parts.project);else player=await createScenePlayer(canvas,parts.project,{width:canvas.clientWidth,height:canvas.clientHeight});const h=player.scene;configureDiceTable(h);Object.assign(h.light.shadow.camera,{left:-4,right:4,top:4,bottom:-4});h.light.shadow.camera.updateProjectionMatrix();h.seek(parts.roll.duration,'roll');camera();h.render(true);$('die-label').innerHTML='D'+sides+'<small>'+rollTarget(sides)+'+ TO HIT</small>';$('loading').hidden=true;phase='ready';document.body.dataset.state=phase;canvas.setAttribute('aria-label','Toss the D'+sides);}
function punch(power,count=combo){if(gentle||clock<failureUntil)return;const feedback=comboFeedback(count);shakeAt=clock;shakePower=Math.min(12,power*feedback.punch);shakeDuration=feedback.duration;}
function celebrate(grade,count){$('celebration-grade').textContent=grade.name.toUpperCase();$('celebration-combo').textContent=count>1?count+' COMBO':grade.bonus===2?'CLEAN LANDING':'NICE LANDING';const el=$('celebration');el.dataset.kind='success';el.style.animationDuration='.85s';el.style.setProperty('--combo-scale',comboFeedback(count).scale);el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');}
function breakStreak(count,reason='MISSED',tone='miss'){
 if(failedCombo!==null)return;
 failedCombo=count;const feedback=failureFeedback(count);
 audio.play(tone,count);sparks.burst(player.scene,clock,{combo:count,kind:'miss'});
 if(!gentle){shakeAt=clock;shakePower=feedback.shake;shakeDuration=feedback.duration;failureUntil=clock+feedback.duration;}
 const el=$('celebration');el.dataset.kind='failure';el.style.animationDuration=(feedback.duration+.4)+'s';el.style.setProperty('--combo-scale',feedback.scale);
 $('celebration-grade').textContent=count>0?'STREAK BROKEN':reason;
 $('celebration-combo').textContent=count>0?count+' COMBO LOST':'TRY AGAIN';
 el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
}
async function lock({pressed=true}={}){
 if(phase!=='rolling'||timing.phase!=='running')return;
 clock=transportNow();timing.sampleSweep(clock-started);
 const grade=judgeReload(layout,timing.position,pressed),t=Math.max(0,(clock-started)*rate);
 timing.grade=grade;timing.phase='locked';
 if(grade.tileId)tileFeedback($('hit-effects'),noteElements.get(grade.tileId),grade,gentle);
 const timingHurts=grade.kind!=='heart'&&grade.kind!=='skull'&&grade.damage,hurt=timingHurts&&health.apply(rollId,grade);lockedDefence=grade.kind==='shield'?'shield':null;updateHearts($('health'),health.heartUnits/2,{hurt,reduced:gentle});document.body.dataset.hearts=health.heartUnits/2;
 if(hurt){characters.attack('enemy',duel.speed);characters.hurt('hero',{dead:health.dead});emotes.trigger('hero',health.dead?'death':'hurt');}else if(grade.kind==='sword')characters.attack('hero',Math.min(1.6,pace.speed));
 renderTiming();$('meter').dataset.outcome=grade.kind;$('timing-bonus').textContent=grade.damage?'−½ HEART':grade.heal?'HEART?':grade.kind==='shield'?'BLOCK':grade.kind==='skip'?'SKIPPED':grade.kind==='empty'?'MISSED':grade.bonus?'BONUS +'+grade.bonus:'GOOD';
 document.body.dataset.timing=JSON.stringify({...grade,position:timing.position});
 if(grade.kind==='skull'||grade.kind==='empty')breakStreak(combo,grade.kind==='skull'?'SKULL HIT':'MISSED',grade.tone);
 else if(grade.kind==='skip'){
  audio.play('skip');$('celebration').classList.remove('pop');
 }else{sparks.burst(player.scene,clock,{combo:combo+1,kind:grade.tone});audio.play(grade.tone,combo+1);punch(grade.bonus===2?5:3.5,combo+1);celebrate(grade,combo+1);}
 await settleRoll(grade,t);
 // Defensive tiles do not need to wait for the die's visual recovery clock.
 // Resolve them immediately so a shield can never leave the lane in rolling.
 if(grade.kind==='shield'&&phase==='rolling')finish();
}
async function settleRoll(grade,t){
 if(assistPending)return;assistPending=true;
 try{const duration=(grade.kind==='sword'?landingRecovery(grade, .72+(timing.position-(layout.find(t=>t.id===grade.tileId)?.center??.72))):.28)*rate,assisted=assistLanding(parts.solid,simulation,grade,t,{duration,recover:true}),clip=physicsRollClip(parts.solid,assisted,{squish:gentle?0:grade.bonus===2?.7:1,settleHold:0,followThrough:.35*rate});parts.project.scene3d.clips[0]=clip;
  // Advance the simulation immediately. A renderer sync may involve asset work;
  // it must never block the combat state machine from finishing the roll.
  simulation=assisted;rollDuration=assisted.duration;visualDuration=clip.duration;
  // Shields are a defensive timing response; leave the already rendered roll
  // in place instead of waiting on a second scene sync for this short beat.
  if(grade.kind==='shield')return;
  const sync=player.scene.sync(parts.project,{animation:true,effects:true});
  await Promise.race([sync,new Promise(resolve=>setTimeout(resolve,800))]);
 }
 catch(e){report(e);}finally{assistPending=false;}
}

async function toss({chained=false}={}){phase='preparing';landedDust=false;failedCombo=null;lockedDefence=null;resetBar();await audio.unlock()?.catch(()=>{});await emotes.audio.unlock();if(!chained)$('celebration').classList.remove('pop');$('announcement').textContent='Stop the marker on a sword, heart, or shield.';delete document.body.dataset.result;const h=player.scene,body=h.objects.get('die'),rig=h.objects.get('die-rig');simulation=simulateDice(parts.solid,{seed:crypto.getRandomValues(new Uint32Array(1))[0],start:body.quaternion.toArray(),position:rig.position.toArray()});raw=simulation.result.value;const motion=motionForTempo(pace.speed);parts.project.scene3d.nodes.find(n=>n.id==='die-rig').trail={enabled:!gentle&&motion.alpha>0,seconds:motion.seconds*rate,samples:motion.samples,alpha:motion.alpha,color:'#c6b88e',threshold:.5,start:.12,end:landingTime(simulation)};const clip=physicsRollClip(parts.solid,simulation,{squish:gentle?0:1,smear:gentle?0:motion.smear});parts.project.scene3d.clips[0]=clip;rollDuration=clip.duration;visualDuration=clip.duration;await h.sync(parts.project,{animation:true,effects:true});clock=transportNow();started=clock;rollId++;layout=reloadLayout(rollId-1);duel.beginTurn(layout.some(tile=>tile.kind==='skull')?['strike','feint']:['feint']);document.body.dataset.opponentChoices=JSON.stringify(duel.attack.choices);drawTiles();const anchor=layout.find(tile=>tile.primary)?.center??layout.find(tile=>tile.kind==='sword')?.center??.72;rate=landingTime(simulation)/(pace.duration*anchor);timing.beginSweep(pace.duration);$('timing').hidden=false;renderTiming();document.body.dataset.roll=String(rollId);document.body.dataset.layout=JSON.stringify(layout);updateHud();last=performance.now();previousTime=-1;phase='rolling';document.body.dataset.state=phase;canvas.setAttribute('aria-label','Lock the landing timing');audio.play('throw',combo);characters.windup();if(!chained)emotes.trigger('hero','ready');}
function finish(){
 const grade=timing.grade??judgeReload(layout,1,false),valid=simulation.result.valid,clean=grade.kind==='sword',brokenCombo=!clean?combo:0;
 const heartHit=grade.kind==='heart'&&valid&&raw+grade.bonus>=rollTarget(sides),healed=heartHit&&health.recover(rollId,grade);
 combo=(clean||grade.kind==='heart')?combo+1:0;pace.resolve(grade);
 const outcome=duel.resolve(rollId,{grade,raw,sides,valid},Math.random,lockedDefence);
 if(outcome?.incomingKind==='counter'&&outcome.damage){const hurt=health.apply(rollId,{damage:1});updateHearts($('health'),health.heartUnits/2,{hurt,reduced:gentle});if(hurt){characters.attack('enemy',duel.speed);characters.hurt('hero',{dead:health.dead});emotes.trigger('hero',health.dead?'death':'hurt');}}
 if(outcome?.playerKind==='hit'){
  updateHearts($('enemy-health'),duel.heartUnits/2,{hurt:true,reduced:gentle});
  characters.hurt('enemy',{dead:duel.defeated});if(duel.defeated)emotes.trigger('enemy','death');audio.play('score',combo);
 }else if(outcome?.playerKind==='dodge'){characters.dodge();}
 updateHud();
 if(healed)updateHearts($('health'),health.heartUnits/2,{recovered:true,reduced:gentle});
 if(grade.kind==='heart')$('timing-bonus').textContent=healed?'+½ HEART':'NO HEAL';
 document.body.dataset.result=JSON.stringify({sides,raw:valid?raw:null,bonus:grade.bonus,...outcome,grade:grade.name,kind:grade.kind,combat:outcome?.kind,combo,brokenCombo,speed:pace.speed,slowRolls:pace.slowRolls,hearts:health.heartUnits/2,enemyHearts:duel.heartUnits/2});
 autoNext=!health.dead&&!duel.defeated;
 if(!autoNext){
  const winner=duel.defeated?'hero':'enemy';document.body.dataset.winner=winner;
  characters.win(winner);emotes.trigger(winner,'victory');
  $('celebration-grade').textContent=duel.defeated?'VICTORY':'DEFEATED';
  $('celebration-combo').textContent='CLICK OR SPACE TO PLAY AGAIN';
  $('celebration').dataset.kind=duel.defeated?'success':'failure';
  $('celebration').classList.add('pop','duel-ended');
 }
 $('announcement').textContent=health.dead?'Out of hearts. Click or press Space to play again.':duel.defeated?'Skeleton defeated. Click or press Space to play again.':outcome?.kind==='blocked'?'Shield blocked the strike.':outcome?.kind==='counter'?'Skeleton strike. Half a heart lost.':grade.kind==='shield'?'Shield ready.':grade.kind==='heart'?'Heart recovered.':outcome?.playerKind==='hit'?'Sword hit. Skeleton has '+(duel.heartUnits/2)+' hearts.':outcome?.playerKind==='dodge'?'The skeleton dodged the low roll.':grade.kind==='skull'?'The skeleton feinted.':'Streak reset. Hearts intact.';
 timing.complete();phase=autoNext?'result':'gameover';readyAt=clock+(autoNext?grade.delay:.9);document.body.dataset.state=phase;
 canvas.setAttribute('aria-label',autoNext?'Next die launching automatically':'Start a new duel');
}

async function advance(){try{await prepare();if(!disposed)await toss({chained:true});}catch(e){report(e);}}
async function interact(){
 if(phase==='preparing'||((phase==='result'||phase==='gameover')&&clock<readyAt)||(phase==='result'&&autoNext))return;
 if(phase==='rolling'){await lock();return;}
 try{if(phase==='gameover'){health.reset();pace.reset();duel.reset();characters.reset();emotes.reset();delete document.body.dataset.winner;$('celebration').classList.remove('duel-ended');rollId=0;combo=0;for(const el of noteElements.values())el.remove();noteElements.clear();$('hit-effects').replaceChildren();updateHud();await prepare();}else if(phase==='result')await prepare();await toss();}catch(e){report(e);}
}
$('stage').addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});interact();});
// Capture once so focus on a button/canvas cannot turn Space into a second click.
addEventListener('keydown',e=>{if(e.code!=='Space'&&e.code!=='Enter')return;if(e.target.closest('input,textarea,select,[contenteditable=true]'))return;if(e.code==='Enter'&&e.target!==canvas)return;e.preventDefault();e.stopPropagation();if(!e.repeat)interact();},true);
const observer=new ResizeObserver(()=>{if(player){player.scene.resize(canvas.clientWidth,canvas.clientHeight);camera();player.scene.render(true);}});observer.observe(canvas);
function frame(now){if(disposed)return;characters.update(now);emotes.update(now);const dt=Math.min(.15,Math.max(0,(now-last)/1000));last=now;clock=transportNow();renderTiming();if(player&&phase!=='preparing'){if(phase==='rolling'){const t=Math.min(rollDuration,Math.max(0,(clock-started)*rate));player.scene.seek(gentle?rollDuration:t,'roll');camera();if(previousTime<0&&clock>=started)dust?.burst(impactFloorPoint(simulation,0),started,{launch:true,strength:.5,camera:player.scene.camera});for(const hit of simulation.impacts)if(previousTime<hit.time&&t>=hit.time){audio.hit(hit.strength,0,combo);if(!landedDust&&hit.strength>.4){dust?.burst(impactFloorPoint(simulation,hit.time),clock-(t-hit.time)/rate,{strength:hit.strength,camera:player.scene.camera});landedDust=true;}if(hit.strength>.4&&failedCombo===null)sparks.burst(player.scene,clock,{combo,kind:timing.grade?.tone??'good',strength:hit.strength*.4});punch(hit.strength*(timing.grade?.bonus===2?5:2.5));}previousTime=clock<started?-1:t;timing.sampleSweep(clock-started);renderTiming();if(!timing.grade&&timing.phase==='running'&&timing.position>=1&&!assistPending)lock({pressed:false});if(t>=rollDuration&&!assistPending&&timing.grade)finish();}else if(phase==='result'&&timing.phase==='complete'&&clock>=readyAt&&!document.hidden){if(autoNext)advance();else resetBar();}if((phase==='result'||phase==='gameover')&&!gentle)player.scene.seek(Math.min(visualDuration,Math.max(0,(clock-started)*rate)),'roll');if(phase!=='rolling')camera();player.scene.render(Boolean(dust?.update(clock)));}sparks.draw(clock);const age=clock-shakeAt,envelope=age<shakeDuration?Math.exp(-age*5/ shakeDuration)*shakePower:0;$('experience').style.setProperty('--shake-x',(Math.sin(age*109)*envelope).toFixed(2)+'px');$('experience').style.setProperty('--shake-y',(Math.cos(age*137)*envelope*.6).toFixed(2)+'px');raf=requestAnimationFrame(frame);}
addEventListener('visibilitychange',()=>{if(disposed)return;const now=performance.now();if(document.hidden){pausedAt=now;emotes.audio.reset();audio.context?.suspend().catch(()=>{});}else{if(pausedAt!==null)pauseOffset+=(now-pausedAt)/1000;pausedAt=null;audio.context?.resume().catch(()=>{});}last=now;});addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);observer.disconnect();player?.dispose();emotes.dispose();audio.dispose();sparks.dispose();dust?.dispose();characters.dispose();});
try{await Promise.all([characters.load(),emotes.load()]);await prepare();dust=await LandingDust.create(player.scene.scene,new URL('../scene3d/assets/',import.meta.url),{reduced:gentle});await player.scene.renderer.compileAsync(player.scene.scene,player.scene.camera);clock=transportNow();updateHud();last=performance.now();raf=requestAnimationFrame(frame);}catch(e){report(e);}
