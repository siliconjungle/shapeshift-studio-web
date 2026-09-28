// Pure, seeded phrase generator. Times are seconds on the caller's transport clock.
import {DESCENT_PIECES} from './descent-phrases.js';
export const SONG_PIECES=Object.freeze(DESCENT_PIECES);
export const midiHz=midi=>440*2**((midi-69)/12);
export const LANE_UNITS_PER_BEAT=27;
export const BEAT_PROGRESS=.4;
export const noteLanePosition=(beat,playhead)=>22+(beat-playhead)*LANE_UNITS_PER_BEAT;
export class InfiniteSong{
 constructor({seed=1,baseBpm=104,bpmStep=2}={}){
  if(!(baseBpm>0&&bpmStep>=0))throw Error('Invalid song tempo');
  Object.assign(this,{seed:seed>>>0,baseBpm,bpmStep,bpm:baseBpm,travelScale:1,resumeAt:Infinity,beat:0,lastTime:null,running:false,phrase:0,index:0,nextId:0,generatedBeat:0,previousOffset:0,previousBeats:16,cleanPhrases:0,cleanHits:0,phraseClean:true,nextPulseBeat:0,current:null,queue:[]});
 }
 fill(){while(this.queue.length<10){
  let piece=SONG_PIECES[Math.floor(this.phrase/2)%SONG_PIECES.length];
  if(this.index>=piece.offsets.length){this.phrase++;this.index=0;piece=SONG_PIECES[Math.floor(this.phrase/2)%SONG_PIECES.length];}
  const i=this.index++,gap=this.nextId===0?2:i===0?this.previousBeats-this.previousOffset+piece.offsets[0]:piece.offsets[i]-this.previousOffset;
  this.generatedBeat+=gap;this.previousOffset=piece.offsets[i];this.previousBeats=piece.beats;
  this.queue.push({id:this.nextId++,beat:this.generatedBeat,phrase:this.phrase,index:i,count:piece.offsets.length,piece:piece.name,midi:piece.melody[i],bass:piece.bass[i],offset:piece.offsets[i],last:i===piece.offsets.length-1,claimed:false,resolved:false,rest:false});
 }}
 start(now){this.fill();if(!this.running){const next=this.queue.find(n=>!n.claimed&&!n.resolved);if(next&&next.beat<this.beat+2){const shift=this.beat+2-next.beat;for(const n of this.queue)n.beat+=shift;this.generatedBeat+=shift;}this.lastTime=now;this.nextPulseBeat=Math.ceil(this.beat*2)/2;this.running=true;}}
 update(now){
  if(this.running&&this.lastTime!==null){
   const end=Math.max(this.lastTime,now),held=Math.max(0,Math.min(end,this.resumeAt)-this.lastTime),released=Math.max(0,end-Math.max(this.lastTime,this.resumeAt));
   this.beat+=(held*this.travelScale+released)*this.bpm/60;
   if(now>=this.resumeAt){this.travelScale=1;this.resumeAt=Infinity;}
  }
  this.lastTime=now;this.queue=this.queue.filter(n=>!n.resolved||n.beat>=this.beat-3);this.fill();
 }
 get targets(){return this.queue.filter(note=>!note.dismissed&&!note.resolved);}
 // Feedback changes one shared transport: targets retain IDs, spacing and positions.
 react(grade,now){this.update(now);if(this.current)this.current.dismissed=true;this.travelScale=grade.bonus===1?.55:0;this.resumeAt=grade.bonus===2?now+.075:Infinity;}
 hold(now){this.update(now);this.travelScale=0;this.resumeAt=Infinity;}
 resume(now){this.lastTime=now;this.travelScale=1;this.resumeAt=Infinity;}
 claim(now){this.start(now);this.update(now);this.resume(now);
  const n=this.queue.find(n=>!n.claimed&&!n.resolved);
  if(!n)throw Error('No upcoming musical note');
  n.claimed=true;n.bpm=this.bpm;n.flightSeconds=Math.max(.25,(n.beat-this.beat)*60/this.bpm);n.minimumLead=.25;n.at=now+n.flightSeconds;this.current=n;return n;
 }
 resolve(note,success,now){this.update(now);note.resolved=true;note.dismissed=true;note.hit=success;
  if(!success){this.cleanPhrases=0;this.cleanHits=0;this.bpm=this.baseBpm;this.phraseClean=false;}
  else{this.cleanHits++;if(note.last){if(this.phraseClean)this.cleanPhrases++;this.phraseClean=true;}this.bpm=this.baseBpm+this.cleanHits*this.bpmStep;}
 }
 stop(now=this.lastTime){if(now!==null)this.update(now);this.running=false;}
 pulsesUntil(now,horizon=.035){
  this.update(now);if(!this.running||!this.current||this.travelScale<=0)return[];const events=[],tempo=this.bpm*this.travelScale;
  if(this.nextPulseBeat<this.beat-.05)this.nextPulseBeat=Math.ceil(this.beat*2)/2;
  for(let i=0;i<12&&this.nextPulseBeat<=this.beat+horizon*tempo/60;i++){
   const pulse=Math.round(this.nextPulseBeat*2);events.push({at:now+(this.nextPulseBeat-this.beat)*60/tempo,pulse,bass:this.current.bass,downbeat:pulse%8===0,beat:pulse%2===0});this.nextPulseBeat+=.5;
  }
  return events;
 }
}
