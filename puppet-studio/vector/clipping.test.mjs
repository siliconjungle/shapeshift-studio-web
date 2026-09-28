import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateVector,svgText,sampleVector,vectorClipGeometry} from './model.js';
import {applyVectorCommand} from './commands.js';
const rect=(id,x=0,y=0,w=100,h=100)=>({id,name:id,commands:['M','L','L','L','Z'],points:[x,y,x+w,y,x+w,y+h,x,y+h],fill:'#ff0000',stroke:'none',strokeWidth:0,opacity:1,fillRule:'nonzero',lineCap:'round',lineJoin:'round',hidden:false,locked:false});
const fixture=()=>({assets:[{id:'art',src:'',vector:{version:1,viewBox:[0,0,100,100],duration:2,loop:false,swatches:[],tracks:[],shapes:[rect('target'),rect('source',20,20,60,60),rect('other',0,0,50,100)]}}]});
const command=(p,c)=>applyVectorCommand(p,{asset:'art',...c});
test('clipping survives project serialization and SVG export, including a hidden animated source',()=>{
 const p=fixture();command(p,{op:'vector.clip',ids:['target'],source:'source',hideSource:true});
 command(p,{op:'vector.key',ids:['source'],channel:'points',time:2,value:rect('source',40,20,60,60).points,easing:'linear'});
 const v=JSON.parse(JSON.stringify(p.assets[0].vector));assert.equal(validateVector(v),v);
 assert.equal(v.shapes[1].hidden,true);assert.equal(sampleVector(v,2)[1].points[0],40);
 const svg=svgText(v,2);assert.match(svg,/<clipPath/);assert.match(svg,/d="M40 20/);assert.match(svg,/clip-path="url\(#vector-clip-0\)"/);assert.doesNotMatch(svg,/data-vector-id="source"/);
});
test('multiple clips, even-odd and inversion remain non-destructive',()=>{
 const p=fixture(),v=p.assets[0].vector,points=[...v.shapes[0].points];
 for(const source of ['source','other'])command(p,{op:'vector.clip',ids:['target'],source});
 command(p,{op:'vector.clip',ids:['target'],source:'source',rule:'evenodd',inverse:true});
 assert.equal(v.shapes[0].clips.length,2);assert.deepEqual(v.shapes[0].points,points);
 assert.match(vectorClipGeometry(v,v.shapes[1],v.shapes[0].clips[0]).d,/h100 v100 h-100 Z/);
 assert.equal((svgText(v).match(/<clipPath /g)||[]).length,2);
 command(p,{op:'vector.clip',ids:['target'],source:'other',action:'remove'});assert.equal(v.shapes[0].clips.length,1);
});
test('duplicate selection remaps source references and delete cleans them',()=>{
 const p=fixture();command(p,{op:'vector.clip',ids:['target'],source:'source'});
 command(p,{op:'vector.duplicate',ids:['target','source']});const shapes=p.assets[0].vector.shapes;
 const target=shapes.find(s=>s.name==='target copy'),source=shapes.find(s=>s.name==='source copy');assert.equal(target.clips[0].source,source.id);
 command(p,{op:'vector.delete',ids:['source']});assert.equal(shapes.find(s=>s.id==='target').clips.length,0);assert.equal(target.clips[0].source,source.id);
 validateVector(p.assets[0].vector);
});
test('validation rejects missing/self/duplicate sources and invalid operations',()=>{
 for(const clips of [[{source:'missing',rule:'nonzero'}],[{source:'target',rule:'nonzero'}],[{source:'source',rule:'invalid'}],[{source:'source',rule:'nonzero',inverse:1}],[{source:'source',rule:'nonzero'},{source:'source',rule:'evenodd'}]]){const v=fixture().assets[0].vector;v.shapes[0].clips=clips;assert.throws(()=>validateVector(v),/clipping/);}
});
