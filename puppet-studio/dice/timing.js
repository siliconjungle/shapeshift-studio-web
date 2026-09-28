import {BEAT_PROGRESS} from '../scene3d/music/infinite-song.js';
import {landingProgress,timingGrade} from './rules.js';
// Each throw owns a fresh sweep. A click freezes it until the result is dismissed.
export class RollTiming {
 constructor(){this.reset();}
 reset(){this.phase='idle';this.position=0;this.grade=null;this.contactTime=1;}
 beginSweep(duration){this.reset();this.phase='running';this.duration=duration;}
 sampleSweep(elapsed){if(this.phase==='running')this.position=Math.min(1,Math.max(0,elapsed/this.duration));return this.position;}
 begin(contactTime){this.reset();this.phase='running';this.contactTime=contactTime;}
 beginBeat(beat){this.reset();this.targetBeat=beat;this.phase='running';}
 sampleBeat(beat){if(this.phase==='running')this.position=Math.min(1,Math.max(0,.72+(beat-this.targetBeat)*BEAT_PROGRESS));return this.position;}
 lockBeat(beat){if(this.phase!=='running')return this.grade;this.sampleBeat(beat);this.grade=timingGrade(this.position);this.phase='locked';return this.grade;}
 sample(elapsed){if(this.phase==='running')this.position=landingProgress(elapsed,this.contactTime);return this.position;}
 lock(elapsed){if(this.phase!=='running')return this.grade;this.sample(elapsed);this.grade=timingGrade(this.position);this.phase='locked';return this.grade;}
 complete(){this.phase='complete';}
}
