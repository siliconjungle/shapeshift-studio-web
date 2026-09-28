import {test} from 'node:test';
import assert from 'node:assert/strict';
import {trimStroke,pathData,validateVector,sampleVector,svgText} from './model.js';
import {applyVectorCommand} from './commands.js';
const shape=()=>({id:'line',name:'Line',commands:['M','L','M','L'],points:[0,20,100,20,0,50,300,50],fill:'none',stroke:'#ff0000',strokeWidth:4,opacity:1,fillRule:'nonzero',lineCap:'butt',lineJoin:'round',hidden:false,locked:false});
const vector=()=>({version:1,viewBox:[0,0,300,100],duration:2,loop:false,swatches:[],tracks:[],shapes:[shape()]});
const near=(a,b,tolerance=1e-4)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≈ ${b}`);
test('sequential trim counts combined contour lengths; synced uses each length',()=>{
 const s={...shape(),trimMode:'sequential',trimEnd:.5};
 assert.equal(pathData(trimStroke(s)),'M0 20 L100 20 M0 50 L100 50');
 s.trimMode='synced';assert.equal(pathData(trimStroke(s)),'M0 20 L50 20 M0 50 L150 50');
 s.trimStart=.5;s.trimEnd=0;assert.equal(pathData(trimStroke(s)),'M0 20 L50 20 M0 50 L150 50');
});
test('offset wraps in either direction, empty/full/off preserve semantics',()=>{
 const s={...shape(),commands:['M','L'],points:[0,0,100,0],trimMode:'sequential',trimEnd:.5,trimOffset:.75};
 assert.equal(pathData(trimStroke(s)),'M75 0 L100 0 M0 0 L25 0');
 s.trimOffset=-.25;assert.equal(pathData(trimStroke(s)),'M75 0 L100 0 M0 0 L25 0');
 s.trimOffset=100.75;assert.equal(pathData(trimStroke(s)),'M75 0 L100 0 M0 0 L25 0');
 s.trimEnd=1;assert.equal(trimStroke(s),s);s.trimEnd=0;assert.equal(pathData(trimStroke(s)),'');
 s.trimMode='off';assert.equal(trimStroke(s),s);
});
test('closed seam stays joined and fully selected closed contours keep Z',()=>{
 const s={...shape(),commands:['M','L','L','L','Z'],points:[0,0,100,0,100,100,0,100],trimMode:'sequential',trimEnd:.5,trimOffset:.75};
 assert.equal(pathData(trimStroke(s)),'M0 100 L0 0 L100 0');
 s.commands.push('M','L');s.points.push(200,0,600,0);s.trimOffset=0;
 assert.equal(pathData(trimStroke(s)),'M0 0 L100 0 L100 100 L0 100 L0 0 Z');
});
test('cubic trims use distance rather than parameter and retain cubic commands',()=>{
 const s={...shape(),commands:['M','C'],points:[0,0,0,0,0,0,100,0],trimMode:'synced',trimStart:.25,trimEnd:.75};
 const result=trimStroke(s);assert.deepEqual(result.commands,['M','C']);near(result.points[0],25);near(result.points.at(-2),75);
 // This symmetric arch has its half-length endpoint at t=.5.
 s.points=[0,0,0,100,100,100,100,0];s.trimStart=0;s.trimEnd=.5;
 const curve=trimStroke(s);near(curve.points.at(-2),50);near(curve.points.at(-1),75);
 assert.deepEqual(s.points,[0,0,0,100,100,100,100,0]);
});
test('degenerate contours and morphs do not reuse stale geometry',()=>{
 const s={...shape(),commands:['M','L','M','L'],points:[0,0,0,0,10,0,110,0],trimMode:'synced',trimEnd:.5};
 assert.equal(pathData(trimStroke(s)),'M10 0 L60 0');
 assert.equal(pathData(trimStroke({...s,points:[0,0,0,0,10,0,210,0]})),'M10 0 L110 0');
});
test('trim keys seed backward-compatible defaults and survive saving, export and duplication',()=>{
 const v=vector(),p={assets:[{id:'art',vector:v}]},run=c=>applyVectorCommand(p,{asset:'art',ids:['line'],...c});
 run({op:'vector.update',values:{trimMode:'sequential'}});
 for(const [channel,value] of [['trimStart',.25],['trimEnd',.75],['trimOffset',-2]])run({op:'vector.key',channel,time:2,value,easing:'linear'});
 assert.deepEqual(v.tracks.map(t=>t.keys[0].value),[0,1,0]);
 const middle=sampleVector(v,1)[0];assert.equal(middle.trimStart,.125);assert.equal(middle.trimEnd,.875);assert.equal(middle.trimOffset,-1);
 const saved=JSON.parse(JSON.stringify(v));assert.equal(validateVector(saved),saved);
 const svg=svgText(saved,1);assert.match(svg,/data-trim-mode="sequential"/);assert.match(svg,/data-trim-start="0.125"/);assert.match(svg,/data-trim-rendered="line"/);
 run({op:'vector.duplicate'});assert.equal(v.shapes[1].trimMode,'sequential');assert.equal(v.tracks.length,6);
});
test('trim validation rejects invalid mode, scalar values and keys',()=>{
 for(const values of [{trimMode:'invalid'},{trimStart:-.1},{trimEnd:1.1},{trimOffset:Infinity},{trimEnd:null}]){const v=vector();Object.assign(v.shapes[0],values);assert.throws(()=>validateVector(v),/trim/);}
 const v=vector();v.tracks=[{shape:'line',channel:'trimStart',keys:[{time:0,value:2,easing:'linear'}]}];assert.throws(()=>validateVector(v),/key/);
});
