import {defineGameData} from './game-data.js';
// One complete vocal performance per reaction; no syllable assembly.
export const EMOTE_VOICES=defineGameData('emote-audio-cues.EMOTE_VOICES',{
 'witch-hunt':['angry',.08],
 'romance-declined':['grumpy',.1],
 overheated:['hurt',.12],cold:['cold',.12],surprise:['surprise',.04],confused:['confused',.12],love:['love',.20],
 delight:['happy',.10],idea:['idea',.07],nervous:['nervous',.18],
 grumpy:['grumpy',.10],determined:['determined',.10],disappointed:['sad',.18],
 humming:['humming',.14],sleepy:['drowsy',.20],thinking:['thinking',.18],
 dizzy:['dizzy',.12],heartbroken:['heartbroken',.20],proud:['proud',.15],
 divine:['divine',.12],hungry:['hungry',.16],'empty-bowl':['empty-bowl',.16],
 rest:['sleepy',.16],work:['move',.08],'missing-plank':['missing-plank',.12]
});
export class EmoteAudioCues{
 constructor(voices=EMOTE_VOICES){this.voices=voices;this.sequence=null;this.fired=false}
 update(event,{audible=true,ready=true}={}){
  const actions=[],sequence=event?.sequence??null;
  if(sequence!==this.sequence){actions.push({type:'stop'});this.sequence=sequence;this.fired=false}
  const cue=event&&(event.voice?[event.voice,.08]:this.voices[event.id]);
  if(!cue||this.fired||event.age<cue[1])return actions;
  if(!audible||event.age>.75){this.fired=true;return actions}
  if(!ready)return actions;
  this.fired=true;actions.push({type:'play',clip:cue[0],intensity:event.intensity});return actions;
 }
}
