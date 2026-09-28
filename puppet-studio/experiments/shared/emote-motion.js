import {defineGameData} from './game-data.js';
// Reaction data is independent of the demo UI; gameplay can trigger or queue IDs.
export const REACTIONS=defineGameData('emote-motion.REACTIONS',[
 ['cold','Brr, cold','worried','shiver'],
 ['overheated','Too hot','yawning','steam'],
 ['surprise','Oh!','surprised','spring'],['confused','Huh?','confused','curl'],
 ['romance-declined','Not seeking romance','neutral','rumble'],
 ['love','Love','adoring','heartbeat'],['delight','Delighted','excited','twinkle'],
 ['idea','An idea!','inspired','sprout'],['nervous','Nervous','bashful','droplet'],
 ['grumpy','Grumpy','grumpy','rumble'],['determined','Determined','determined','steam'],
 ['disappointed','Disappointed','sad','droop'],['humming','Humming','singing','notes'],
 ['sleepy','Sleepy','sleepy','sleep'],['thinking','Thinking','thinking','dots'],
 ['dizzy','Dizzy','dizzy','spiral'],['heartbroken','Heartbroken','crying','broken'],
 ['proud','Proud','smug','crown'],['divine','A god noticed me','awed','ink'],
 ['hungry','Food, please','eager','sniff'],['empty-bowl','Hungry','pleading','rattle'],
 ['rest','Need a rest','yawning','sleep'],['work','Ready to work','determined','tap'],
 ['missing-plank','Need wood','confused','rattle'],['witch-hunt','Witch hunt','angry','accuse']
].map(([id,label,expression,motion])=>({id,label,expression,motion,duration:3.4})));
export const EMOTE_FEEL=defineGameData('emote-motion.EMOTE_FEEL',{appear:.18,exit:.35,overshoot:.17,overshootTime:.45,decay:2,shrink:.12,rise:.07});
export const EMOTE_FIELDS=defineGameData('emote-motion.EMOTE_FIELDS',Object.fromEntries([...new Set(REACTIONS.map(r=>r.motion))].map(id=>[id,{speed:1,amplitude:1}])));
export const REACTION_BY_ID=new Map(REACTIONS.map(r=>[r.id,r]));
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};

export class EmotePlayer{
 constructor(){this.active=null;this.queue=[];this.sequence=0}
 trigger(id,{enqueue=false,intensity=1,expression,voice}={}){
  if(!REACTION_BY_ID.has(id))throw new Error('Unknown reaction: '+id);
  const event={id,...(expression?{expression}:{}),...(voice?{voice}:{}),intensity:Math.max(.25,Math.min(1.5,Number.isFinite(intensity)?intensity:1))};
  if(enqueue&&this.active){if(this.queue.length>=6)this.queue.shift();this.queue.push(event);return}
  this.active={...event,age:0,sequence:++this.sequence};if(!enqueue)this.queue.length=0;
 }
 clear(){this.active=null;this.queue.length=0}
 update(dt){
  if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid emote time step');
  while(this.active){
   const remaining=REACTION_BY_ID.get(this.active.id).duration-this.active.age;
   if(dt<remaining){this.active.age+=dt;break}
   dt-=remaining;this.active=null;const next=this.queue.shift();if(next)this.trigger(next.id,{...next,enqueue:true});
  }
  return this.active;
 }
}

export function emoteEnvelope(age,duration=3.4){
 const appear=smooth(age/EMOTE_FEEL.appear),exit=smooth((age-(duration-EMOTE_FEEL.exit))/EMOTE_FEEL.exit);
 return {scale:appear*(1+EMOTE_FEEL.overshoot*Math.sin(Math.min(age/EMOTE_FEEL.overshootTime,1)*Math.PI)*Math.exp(-age*EMOTE_FEEL.decay))*(1-EMOTE_FEEL.shrink*exit),opacity:appear*(1-exit),rise:EMOTE_FEEL.rise*exit};
}

// A continuous deformation field: every fill, highlight and outline samples the
// same mapping. The original SVG vertices are immutable, so motion never drifts.
// Coordinates are normalized across the whole drawing, not per painted path.
export function deformReaction(motion,x,y,t,intensity=1,out={}){
 t*=EMOTE_FIELDS[motion]?.speed??1;intensity*=EMOTE_FIELDS[motion]?.amplitude??1;
 let dx=0,dy=0;const s=Math.sin,c=Math.cos,top=y+.5;
 switch(motion){
  case 'shiver': dx=.035*s(t*29)*(.4+top);dy=.018*s(t*23+x*8)*top;break;
  case 'spring': dy=.10*s(t*15)*Math.exp(-t*2)*top;dx=-x*.14*s(t*15)*Math.exp(-t*2);break;
  case 'curl': dx=.075*s(t*4)*top*top;dy=.035*s(t*4+x*4)*top;break;
  case 'heartbeat': {const beat=Math.pow(Math.max(0,s(t*6)),5)+.4*Math.pow(Math.max(0,s(t*6-1.3)),8);dx=x*.13*beat;dy=y*.09*beat+.025*s(x*6)*beat;break}
  case 'twinkle': dx=.045*s(t*5+x*9)*x;dy=.055*s(t*5+x*8)*top;break;
  case 'sprout': dx=.07*s(t*5)*top*top;dy=.04*s(t*5+x*5)*top;break;
  case 'droplet': dx=-x*.12*s(t*5);dy=.07*s(t*5)*top*top;break;
  case 'accuse': {const jab=Math.pow(Math.max(0,s(t*8)),4);dx=.065*jab*top;dy=.035*jab+.012*s(t*25)*top;break;}
  case 'rumble': dx=.025*s(t*35)*top;dy=.045*s(t*6+x*5);break;
  case 'steam': dx=.07*s(t*5+y*5)*top;dy=.04*s(t*4+x*5)*top;break;
  case 'droop': dx=.11*smooth(t/.7)*top*top;dy=-.10*smooth(t/.7)*top*top+.018*s(t*3)*top;break;
  case 'notes': dy=.08*s(t*5+x*6);dx=.025*s(t*4)*top;break;
  case 'sleep': dx=.04*s(t*2+y*3)*top;dy=.025*s(t*2+x*2);break;
  case 'dots': dy=.10*Math.max(0,s(t*6-x*8));break;
  case 'spiral': {const a=.14*s(t*4)*Math.exp(-(x*x+y*y)*2),co=c(a),si=s(a);dx=x*co-y*si-x;dy=x*si+y*co-y;break}
  case 'broken': dx=Math.tanh(x*14)*.035*(1-c(t*4));dy=-.035*s(t*3+x*3);break;
  case 'crown': dx=.04*s(t*5)*top*top;dy=.035*s(t*6+x*5)*top;break;
  case 'ink': dx=.06*s(t*5+y*5)*top*top;dy=.035*s(t*4+x*4)*top;break;
  case 'sniff': dx=x*.03*s(t*4);dy=.025*s(t*4+x*2);break;
  case 'rattle': dx=.035*s(t*19)*Math.exp(-t*.8);dy=.02*s(t*7+x*3);break;
  case 'tap': dx=.075*s(t*6)*top;dy=.055*s(t*6)*x;break;
 }
 out.x=x+dx*intensity;out.y=y+dy*intensity;return out;
}
