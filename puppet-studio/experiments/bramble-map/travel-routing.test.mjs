import test from 'node:test';
import assert from 'node:assert/strict';
import {retargetRoute,segmentLength,segmentProgress,routeTo} from './travel-routing.js';
import {travelPlan,travellerWalk} from './motion.js';
import {travelButtonState} from './button-feedback.js';
const routes=[{id:'ab',from:'a',to:'b',length:100},{id:'bc',from:'b',to:'c',length:200}];
test('retargeting forwards or backwards starts at the exact current point and preserves pace',()=>{
 for(const reverse of [false,true])for(const progress of [.1,.45,.9]){
  const trip={segments:[{route:routes[0],reverse,to:reverse?'a':'b'}],index:0,progress};
  for(const destination of ['a','b','c']){
   const segments=retargetRoute(routes,trip,destination);
   assert.equal(segmentProgress(segments[0],0),progress);
   assert.equal(segments.at(-1).to,destination);
   assert.equal(segments[0].reverse,destination==='a');
   const length=destination==='a'?100*progress:100*(1-progress)+(destination==='c'?200:0);
   assert.ok(Math.abs(segments.reduce((n,s)=>n+segmentLength(s),0)-length)<1e-9);
   assert.equal(travelPlan(segments).duration,length/travellerWalk.speed);
  }
 }
});
test('repeated retargeting uses the newest position and endpoint routing avoids unnecessary loops',()=>{
 const segments=retargetRoute(routes,{segments:[{route:routes[0],reverse:false,to:'b'}],index:0,progress:.6},'a');
 const next=retargetRoute(routes,{segments,index:0,progress:.4},'c');
 assert.equal(segmentProgress(next[0],0),.4);assert.equal(segmentLength(next[0]),60);
 const atEnd=retargetRoute(routes,{segments:next,index:0,progress:1},'c');
 assert.equal(atEnd.length,1);assert.equal(atEnd[0].route.id,'bc');
 assert.equal(routeTo(routes,'a','missing'),null);
});
test('travel button describes the selection rather than an unrelated active trip',()=>{
 assert.equal(travelButtonState('b','a',true,false,'b').label,'On our way…');
 assert.deepEqual(travelButtonState('a','a',true,false,'b'),{label:'Travel here',disabled:false,enter:false});
 assert.deepEqual(travelButtonState('c','a',true,true,'b'),{label:'Locked',disabled:false,enter:false,locked:true});
 assert.deepEqual(travelButtonState('a','a',false,false),{label:'Enter',disabled:false,enter:true});
});
