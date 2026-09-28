import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {identifyInkColours,tagInkColours} from './ink-colours.js';
test('ink detection includes internal filled lines and strokes, preserves light fills, and supports overrides',()=>{
 const source='<svg><path fill="#562d1d"/><path fill="#5e3220"/><path stroke="#663824" fill="#e1b888"/><path fill="#815334"/></svg>';
 const found=identifyInkColours(source);assert.deepEqual(new Set(found.colors),new Set(['#562d1d','#5e3220','#663824']));
 const override=identifyInkColours(source,{exclude:['#5e3220'],include:['#815334']});assert.ok(!override.colors.includes('#5e3220'));assert.ok(override.colors.includes('#815334'));
 const tagged=tagInkColours(source,found.colors);assert.ok(tagged.svg.includes('fill="#e1b888"'));assert.equal(new Set(tagged.paints.map(p=>p.tag)).size,3);assert.ok(!tagged.svg.includes('#663824'));
 assert.deepEqual(identifyInkColours('<svg fill="#eee5cf"/>').colors,[]);
});
test('actual trees and boulders have recognised ink and untouched surface colours',()=>{
 for(const name of ['pine','oak','rocks']){const source=fs.readFileSync(new URL('../../assets/bramble-map/'+name+'.svg',import.meta.url),'utf8'),ink=identifyInkColours(source);assert.ok(ink.colors.length>0,name);assert.ok(ink.colors.length<ink.palette.length/2,name+' retains surface shading');}
});

test('world ink projects consistently regardless of object scale, and responds to camera depth',async()=>{
 const {projectedInkPixels}=await import('./projected-ink.js');
 assert.equal(projectedInkPixels(4.5,2/960,960),4.5);
 assert.equal(projectedInkPixels(4.5,2/960,960,2),2.25);
 assert.equal(projectedInkPixels(4.5,4/960,960),9);
});

test('recolouring rewrites actual SVG ink paint without changing geometry or surface shading',async()=>{
 const {recolorInkArtwork}=await import('./ink-colours.js');
 const source='<svg><path d="M0 0L2 2Z" fill="#562d1d"/><path d="M1 1L3 3Z" fill="#e1b888" stroke="#5e3220"/></svg>';
 const baked=recolorInkArtwork(source);assert.equal(baked.report.changed,2);assert.ok(!baked.svg.includes('#562d1d'));assert.ok(!baked.svg.includes('#5e3220'));assert.ok(baked.svg.includes('fill="#211e1a"'));assert.ok(baked.svg.includes('stroke="#211e1a"'));assert.ok(baked.svg.includes('fill="#e1b888"'));assert.deepEqual([...baked.svg.matchAll(/d="([^"]*)"/g)].map(m=>m[1]),[...source.matchAll(/d="([^"]*)"/g)].map(m=>m[1]));
});

test('prepared silhouettes include transparent cave and tree openings',()=>{
 const contours=JSON.parse(fs.readFileSync(new URL('../../assets/bramble-map/silhouettes.json',import.meta.url),'utf8'));
 const area=points=>points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-a[1]*b[0]},0);
 for(const name of ['gate','shop','pine','oak']){assert.ok(contours[name].some(p=>area(p)>0),name+' exterior');assert.ok(contours[name].some(p=>area(p)<0),name+' transparent interior');}
 for(const name of ['cloud-cumulus','cloud-wisp'])assert.ok(contours[name]?.length>0,name+' gets the shared outer outline');
 assert.ok(!contours.compass);
});

test('edge-only baking preserves all original interior paint and includes hole edges',async()=>{
 const {paintSilhouetteInk}=await import('../../scripts/map-edge-ink.mjs');
 const source='<svg viewBox="0 0 100 100"><path fill="#562d1d" d="M0 0H100V100H0Z"/><path fill="#e1b888" d="M20 20H80V80H20Z"/></svg>';
 const loops=[[[0,0],[1,0],[1,1],[0,1]],[[.4,.4],[.4,.6],[.6,.6],[.6,.4]]];
 const result=paintSilhouetteInk(source,loops,{displayWidth:100});assert.ok(result.bands>=2);assert.ok(result.svg.startsWith(source.replace('</svg>','')));assert.ok(result.svg.includes('data-ink-edge="true" fill="#211e1a"'));assert.ok(result.svg.includes('fill="#562d1d"'));
 for(const name of ['shop','pine','oak','cloud-cumulus','cloud-wisp']){const original=fs.readFileSync(new URL('../../assets/bramble-map/source-vectors/'+name+'.svg',import.meta.url),'utf8'),baked=fs.readFileSync(new URL('../../assets/bramble-map/'+name+'.svg',import.meta.url),'utf8').replace(/<!-- Ink palette baked:[\s\S]*?-->\n/,'');assert.ok(baked.startsWith(original.replace('</svg>','').trimEnd()),name+' keeps its original vector artwork');}
});

test('baked edge cache invalidates art, contours, width, colour and damaged output',async()=>{
 const {bakeSilhouetteInk}=await import('../../scripts/map-edge-ink.mjs');
 const source='<svg viewBox="0 0 100 100"><path fill="#e1b888" d="M10 10H90V90H10Z"/></svg>';
 const loops=[[[.1,.1],[.9,.1],[.9,.9],[.1,.9]]],options={displayWidth:100,bandWidth:4.4,ink:'#211e1a'};
 const first=bakeSilhouetteInk(source,loops,options);
 assert.equal(first.cached,false);
 const reuse=bakeSilhouetteInk(source,loops,options,first,first.svg);
 assert.equal(reuse.cached,true);assert.equal(reuse.svg,first.svg);
 for(const [art,edges,style,output] of [
  [source.replace('#e1b888','#eeddbb'),loops,options,first.svg],
  [source,[...loops,[[.4,.4],[.6,.4],[.5,.6]]],options,first.svg],
  [source,loops,{...options,bandWidth:3},first.svg],
  [source,loops,{...options,displayWidth:50},first.svg],
  [source,loops,{...options,ink:'#222222'},first.svg],
  [source,loops,options,first.svg.replace('#211e1a','#ffffff')],
 ])assert.equal(bakeSilhouetteInk(art,edges,style,first,output).cached,false);
});

test('baked border width uses display units rather than source image dimensions',async()=>{
 const {paintSilhouetteInk}=await import('../../scripts/map-edge-ink.mjs');
 const {mapInk,routeInkWidth}=await import('../experiments/bramble-map/ink-style.js');
 assert.equal(routeInkWidth,mapInk.edgeBandWidth);
 const loops=[[[.1,.1],[.9,.1],[.9,.9],[.1,.9]]];
 const extent=width=>{
  const {svg}=paintSilhouetteInk('<svg viewBox="0 0 100 100"></svg>',loops,{displayWidth:width,bandWidth:mapInk.edgeBandWidth});
  const points=[...svg.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m=>Number(m[1]));
  return (10-Math.min(...points))*width/100;
 };
 assert.ok(Math.abs(extent(100)-extent(200))<.01);
});
