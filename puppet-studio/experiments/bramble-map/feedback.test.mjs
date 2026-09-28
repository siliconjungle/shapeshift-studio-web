import test from 'node:test';import assert from 'node:assert/strict';
import {arrowPose,puffPose,FootContacts,chooseReaction,nextEmoteDelay} from './feedback-motion.js';
import {EmotePlayer} from '../shared/emote-motion.js';
import {EmoteAudioCues} from '../shared/emote-audio-cues.js';
test('selection arrow squashes out fast and settles without negative scales',()=>{
 assert.equal(arrowPose(.13,0,false,true).opacity,0);
 assert.equal(arrowPose(0,0).opacity,0);
 for(let t=0;t<2;t+=.005){const p=arrowPose(t,t);assert.ok(p.x>0&&p.y>0);assert.ok(p.opacity>=0&&p.opacity<=1);}
 const low=arrowPose(1,Math.PI/2/4.2),high=arrowPose(1,Math.PI*1.5/4.2);assert.ok(low.x>high.x&&low.y<high.y&&low.inflate>0&&high.inflate<0);
 assert.deepEqual(arrowPose(1,10,true),{x:1,y:1,dy:0,angle:0,inflate:0,opacity:1});
 assert.equal(puffPose(.32,0).opacity,0);assert.equal(puffPose(.1,0,true).opacity,0);
});
test('footfalls follow leg landings and never catch up a backlog after a pause',()=>{
 const contacts=new FootContacts();let count=0;
 for(let i=0;i<=600;i++)if(contacts.update(i/600*Math.PI*6,true))count++;
 assert.equal(count,6);
 assert.equal(contacts.update(100,false),false);
 assert.equal(contacts.update(101,true),false);
 assert.equal(typeof contacts.update(200,true),'boolean');
});
test('reactions avoid immediate repeats and use matching existing game voice cues',()=>{
 for(const biome of ['camp','well','gate'])for(const walking of [true,false])for(const seed of [0,.25,.75,.999]){
  const id=chooseReaction(()=>seed,'thinking',walking,biome);assert.notEqual(id,'thinking');
  const player=new EmotePlayer(),audio=new EmoteAudioCues();player.trigger(id);audio.update(player.active);player.update(.3);
  assert.equal(audio.update(player.active).filter(a=>a.type==='play').length,1);
  assert.equal(audio.update(player.active).filter(a=>a.type==='play').length,0);
 }
});

test('emote timing spans 25–55 seconds and morph preserves tips while inflating the middle',async()=>{
 assert.equal(nextEmoteDelay(()=>0),25);assert.equal(nextEmoteDelay(()=>1),55);assert.equal(nextEmoteDelay(()=>.5),40);
 const {morphWidth,morphOffset}=await import('../../fx/morph-profile.js');
 assert.equal(morphWidth(0,.2),1);assert.equal(morphWidth(1,.2),1);
 assert.equal(morphWidth(.5,.2),1.2);assert.equal(morphWidth(.5,-.2),.8);
 for(let u=0;u<=1;u+=.025)for(const inflate of [-2,-.2,0,.2,2]){
  assert.equal(morphWidth(u,inflate,.1),Math.max(.1,1+inflate*Math.sin(u*Math.PI)+.1*(u-.5)));
  assert.equal(morphOffset(u,.1),.1*Math.sin(u*Math.PI));
 }
});

test('starting and finishing travel do not bypass the long random emote cooldown',async()=>{
 const {createMapFeedback}=await import('./map-feedback.js');
 const previous=globalThis.document;
 const element=()=>({dataset:{},setAttribute(){},append(){}});
 globalThis.document={createElementNS:element};
 try{
  let arrivals=0;
  const audio={puff(){},step(){},arrive(){arrivals++;},update(){},diagnostics:{}};
  const feedback=createMapFeedback(element(),new Map([['camp',{x:100,y:300,height:100}]]),audio);
  const deadline=feedback.diagnostics.nextEmoteAt;assert.ok(deadline>=25&&deadline<=55);
  const state={pos:{x:100,y:300},gait:{cycle:0},biome:'camp',gentle:false,intro:10};
  feedback.tick(.1,1,{...state,walking:true});feedback.tick(.1,2,{...state,walking:false});
  assert.equal(arrivals,1);assert.equal(feedback.diagnostics.reaction,null);assert.equal(feedback.diagnostics.nextEmoteAt,deadline);
  feedback.tick(.1,deadline,{...state,walking:false});assert.ok(feedback.diagnostics.reaction);
  feedback.tick(3.5,deadline+3.5,{...state,walking:false});assert.equal(feedback.diagnostics.reaction,null);
  const rest=feedback.diagnostics.nextEmoteAt-(deadline+3.5);assert.ok(rest>=25&&rest<=55);
 }finally{globalThis.document=previous;}
});

test('biomes favour their local reaction while every emote remains possible',()=>{
 for(const [biome,local] of [['camp','love'],['shop','love'],['well','overheated'],['gate','cold']]){
  const counts=new Map();for(let i=0;i<1300;i++){const id=chooseReaction(()=>(i+.5)/1300,null,false,biome);counts.set(id,(counts.get(id)??0)+1);}
  assert.equal(counts.size,8);assert.equal(counts.get(local),600);
  for(const [id,count] of counts)if(id!==local)assert.equal(count,100);
 }
});

test('occasional bird flights stay bounded, face their travel, and wait between visits',async()=>{
 const {flightPose,nextBirdDelay}=await import('./map-wildlife.js');
 assert.equal(nextBirdDelay(()=>0),40);assert.equal(nextBirdDelay(()=>1),85);
 assert.equal(nextBirdDelay(()=>0,true),18);assert.equal(nextBirdDelay(()=>1,true),32);
 for(const reverse of [false,true]){
  const start=flightPose(0,12,reverse),end=flightPose(12,12,reverse);
  assert.equal(start.facing,reverse?'left':'right');assert.equal(start.done,false);assert.equal(end.done,true);
  assert.ok(reverse?start.x>end.x:start.x<end.x);
  for(let t=0;t<=12;t+=.1){const p=flightPose(t,12,reverse,250);assert.ok(p.y>100&&p.y<350);}
 }
});

test('destination marker appears only when selection differs, and disappears on arrival or reselection',async()=>{
 const {createMapFeedback}=await import('./map-feedback.js'),previous=globalThis.document;
 const element=()=>({dataset:{},attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},append(n){this.children.push(n);}});
 globalThis.document={createElementNS:element};
 try{
  const svg=element(),audio={puff(){},step(){},arrive(){},update(){},diagnostics:{}};
  const feedback=createMapFeedback(svg,new Map(['camp','shop'].map(id=>[id,{x:100,y:300,height:100}])),audio);
  const marker=svg.children.find(n=>n.attrs['data-feedback']==='destination');
  const state={pos:{x:100,y:300},gait:{cycle:0},walking:true,destination:'shop',biome:'camp',gentle:false,intro:10};
  feedback.tick(.02,1,state);assert.equal(marker.dataset.destination,'shop');assert.equal(marker.attrs.opacity,1);
  feedback.select('shop');feedback.tick(.02,1.02,state);assert.equal(marker.attrs.opacity,0);
  feedback.select('camp');feedback.tick(.2,1.22,state);assert.equal(marker.dataset.destination,'shop');
  feedback.tick(.02,1.24,{...state,walking:false,destination:null});assert.equal(marker.attrs.opacity,0);
 }finally{globalThis.document=previous;}
});
