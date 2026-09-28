import {identity} from '@shapeshift-labs/studio-core/joint-transforms';
import {svgText,validateVector} from '@shapeshift-labs/studio-core/vector/model';
import {DURATION,SHOTS,samplePerformance,performanceFrame,mouthWeights} from './performance.js';
import {UTTERANCES} from './performance-audio.js';
export function performanceAt(art,manifest,time){const pose=samplePerformance(time);let weights=null;if(pose.drawing==='delight')for(const u of UTTERANCES){const c=manifest.clips[u.id],t=time-u.at;if(t>=-.035&&t<c.duration+.055){weights=mouthWeights(c.cues,t);const energy=c.envelope[Math.max(0,Math.floor(t*c.envelopeRate))]??0;pose.headY-=energy*2.5;pose.tilt+=Math.sin(t*4.2)*energy*.6;pose.hands+=energy*1.3;break;}}return {pose,shapes:performanceFrame(art,pose,{weights})};}
const round=a=>a.map(x=>Math.round(x*100)/100);
export function exportPerformance(art,manifest){
 const times=new Set([0,DURATION,...SHOTS.map(s=>s.time),...SHOTS.slice(1).map(s=>s.time-.0001)]);for(let i=0;i/24<DURATION;i++)times.add(i/24);
 const frames=[...times].sort((a,b)=>a-b).map(time=>({time,...performanceAt(art,manifest,time)}));
 const p={format:'inkwell-puppet',version:1,name:'Frog wizard · A little good news',source:{character:'frog-wizard',portrait:true,method:'Authored replacement drawings + weighted SVG regions + drawn viseme morphs',voiceTimeline:UTTERANCES},assets:[],joints:[{id:'root',name:'Portrait anchor',parent:null,rest:identity(),layer:0}],clips:[{id:'good-news',name:'A little good news',duration:DURATION,fps:24,loop:false,tracks:{}}]};
 for(const id of new Set(SHOTS.map(s=>s.drawing))){const active=frames.filter(f=>f.pose.drawing===id),base=active[0].shapes,v={version:1,viewBox:[0,0,640,640],duration:DURATION,loop:false,swatches:[],shapes:base.map(s=>({...s,points:round(s.points),opacity:id==='neutral'?s.opacity:0})),tracks:[]};
 for(const s of v.shapes){const points=active.map(f=>({time:f.time,value:round(f.shapes.find(a=>a.id===s.id).points),easing:'linear'}));if(points.some(k=>JSON.stringify(k.value)!==JSON.stringify(s.points)))v.tracks.push({shape:s.id,channel:'points',keys:points});
 const visibility=SHOTS.map(shot=>({time:shot.time,value:shot.drawing===id?1:0,easing:'step'}));
 if(s.id==='drawn-tongue'){v.tracks.push({shape:s.id,channel:'opacity',keys:frames.map(f=>({time:f.time,value:f.pose.drawing===id?f.shapes.find(a=>a.id===s.id).opacity:0,easing:SHOTS.some(shot=>Math.abs(shot.time-f.time-.0001)<.000001)?'step':'linear'}))});}
 else v.tracks.push({shape:s.id,channel:'opacity',keys:visibility});}
 validateVector(v);p.assets.push({id,vector:v,src:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svgText(v))});p.joints.push({id,name:id+' drawing',parent:'root',layer:1,rest:identity(),sprite:{asset:id,width:640,height:640,pivotX:.5,pivotY:.7}});
 }
 return p;
}
