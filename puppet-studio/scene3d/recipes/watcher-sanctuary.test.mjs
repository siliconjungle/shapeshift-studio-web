import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {watcherSanctuaryCommands} from './watcher-sanctuary.js';
import {applySceneCommand,validateScene} from '../schema.js';
import {applyAppearanceCommand,projectAppearance,validateAppearance} from '../../authoring/appearance.js';
test('sanctuary variants switch cube palette, pillar artwork and every surface map together',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async url=>String(url).startsWith('http://studio.test/')?new Response(await fs.readFile(new URL('../assets/'+new URL(url).pathname.split('/assets/')[1],import.meta.url))):original(url);
 try{
  const p={assets:[],joints:[],clips:[],scene3d:null};const base='http://studio.test/scene3d/assets/';
  for(const c of await watcherSanctuaryCommands({base,pillars:{base:base+'pillars/'}}))(c.op.startsWith('appearance.')?applyAppearanceCommand:applySceneCommand)(p,c);
  validateScene(p.scene3d,p.assets);validateAppearance(p);
  assert.equal(p.scene3d.nodes.length,5);assert.ok(p.scene3d.nodes.find(n=>n.id==='watcher').controller);
  for(const theme of ['hearth','cryos','solis']){
   applyAppearanceCommand(p,{op:'appearance.select',id:'ward-'+theme});const scene=projectAppearance(p),pillar=scene.scene3d.nodes.find(n=>n.id==='pillar-west');
   assert.ok(Math.abs(pillar.position[1]-pillar.dimensions[1]/2+1.5)<1e-9);
   assert.equal(pillar.illustration.chamfer,.055);assert.equal(Object.keys(pillar.surfaces).length,6);
   for(const surface of Object.values(pillar.surfaces))for(const key of ['asset','heightMap','roughnessMap','normalMap','occlusionMap'])assert.ok(scene.assets.find(a=>a.id===surface[key]).src.includes('/'+theme),theme+' '+key);
   assert.equal(scene.scene3d.materials.find(m=>m.id==='ink').palette[0],{hearth:'#344c40',cryos:'#344657',solis:'#ad623e'}[theme]);
  }
  const roundtrip=JSON.parse(JSON.stringify(p));validateScene(roundtrip.scene3d,roundtrip.assets);validateAppearance(roundtrip);
 }finally{globalThis.fetch=original;}
});
