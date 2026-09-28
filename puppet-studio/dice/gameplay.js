import * as T from '../scene3d/vendor.js';
import {landingTime} from './physics.js';
export const speedForCombo=combo=>1+Math.max(0,combo)*.04;
// A short landing beat keeps automatic chains readable without breaking rhythm.
export const nextRollDelay=(combo,grade)=>combo>0?((grade?.tone==='good'||grade?.bonus===1)?.14:.1):grade?.bonus<0?.55:null;
export function landingRecovery(grade,position=.72){if(grade?.bonus===2)return .045;if(grade?.tone==='good'||grade?.bonus===1)return .16+.12*Math.min(1,Math.abs(position-.72)/.14);return .65;}
export function comboFeedback(combo){const n=Math.min(14,Math.max(0,combo));return{punch:1+n*.11,duration:.24+n*.012,scale:1+n*.015,audio:1+n*.035};}
// A broken streak retains its pre-reset strength. Feedback approaches comfortable
// limits smoothly, so every longer streak still has a larger consequence.
export function failureFeedback(combo){const n=Math.max(0,combo),weight=n/(n+18);return{shake:6+18*weight,duration:.3+.8*weight,recovery:.1,audio:1+.85*weight,scale:1+.2*weight,weight};}
export function motionForTempo(tempo){const amount=Math.max(0,Math.min(1,(tempo-1.3)/1.7));return{smear:amount,alpha:amount*.18,samples:3,seconds:.07+amount*.035};}
export const nextCombo=(combo,grade)=>(grade?.kind==='sword'||grade?.bonus>0)?combo+1:0;
export function pickDie(sides,previous,random=Math.random){const choices=sides.filter(n=>n!==previous);return choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];}
function poseAt(samples,time){let i=0;while(i<samples.length-2&&samples[i+1].time<time)i++;const a=samples[i],b=samples[Math.min(i+1,samples.length-1)],t=Math.min(1,Math.max(0,(time-a.time)/Math.max(.00001,b.time-a.time)));return{time,position:a.position.map((v,k)=>v+(b.position[k]-v)*t),quaternion:new T.Quaternion(...a.quaternion).slerp(new T.Quaternion(...b.quaternion),t).toArray(),velocity:a.velocity+(b.velocity-a.velocity)*t};}
// The timing assist changes how cleanly the die settles, preserving its rolled face.
export function assistLanding(solid,simulation,grade,clickedAt,{duration=landingRecovery(grade),recover=false}={}){
 if(!recover&&(!simulation.result.valid||!(grade?.kind==='sword'||grade?.bonus>0)))return simulation;
 const perfect=grade.bonus===2,contact=landingTime(simulation),start=clickedAt,end=start+duration,first=poseAt(simulation.samples,start),target=simulation.samples.at(-1),q0=new T.Quaternion(...first.quaternion),q1=new T.Quaternion(...target.quaternion),samples=simulation.samples.filter(s=>s.time<start),steps=Math.ceil(duration*120);
 for(let i=0;i<=steps;i++){const u=i/steps,e=u*u*(3-2*u),q=q0.clone().slerp(q1,e),floor=-Math.min(...solid.vertices.map(v=>new T.Vector3(...v).applyQuaternion(q).y)),height=Math.max(0,first.position[1]-floor)*(1-e)+(perfect?.015:.13)*Math.sin(Math.PI*u)*(1-u),position=[first.position[0]+(perfect?.03:.1)*Math.sin(Math.PI*u),Math.max(floor,first.position[1]*(1-e)+floor*e+height*u),first.position[2]];if(i===0)position.splice(0,3,...first.position);samples.push({time:start+u*duration,position,quaternion:q.toArray(),velocity:i===steps?0:first.velocity*(1-e)});}
 const impacts=simulation.impacts.filter(h=>h.time<=start);if(!impacts.some(h=>Math.abs(h.time-contact)<.03))impacts.push({time:Math.min(end-.005,Math.max(contact,start+.02)),strength:perfect?.85:.65});if(!perfect)impacts.push({time:end-.08,strength:.16});impacts.sort((a,b)=>a.time-b.time);
 return {...simulation,samples,impacts,duration:end,landingQuality:perfect?'perfect':'good'};
}
