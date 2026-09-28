import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import {featureCatalog,expandRecipe,catalogueMarkdown} from '@shapeshift-labs/studio-core/catalog';
import {capabilities,applyCommand} from '../fx/commands.js';import {starterProject} from '../authoring/starter.js';import {ProjectStore} from '../store.js';import {validateProject} from '../runtime.js';
import {soloExample} from '../solos/example.js';import {joystickExample} from '../joysticks/example.js';
const fixtures={starter:starterProject,solos:soloExample,joysticks:joystickExample};
test('every advertised command is catalogued and every catalogued command is implemented',()=>{
 const c=capabilities(),actual=[...new Set([...c.commands,...c.scene3d.commands])].sort();assert.deepEqual(featureCatalog.commands.map(c=>c.op).sort(),actual);
 for(const f of featureCatalog.features){for(const c of f.commands)assert.ok(actual.includes(c));const path=f.documentation.split('/blob/main/')[1];assert.ok(fs.existsSync(new URL('../../'+path,import.meta.url)),path);for(const ex of f.examples)assert.ok(fs.existsSync(new URL('../../'+ex.url.split('?')[0],import.meta.url)),ex.url);}
});
for(const recipe of featureCatalog.recipes.filter(r=>r.testFixture!=='ui'))test('document recipe executes, validates and undoes: '+recipe.id,()=>{
 const store=new ProjectStore(fixtures[recipe.testFixture]()),before=structuredClone(store.project);
 const {requests}=expandRecipe(recipe.id);for(const request of requests){assert.equal(request.op,'document.dispatch');const commands=[request.args.commands].flat();store.edit(p=>commands.map(c=>applyCommand(p,c)));}
 validateProject(store.project);assert.notDeepEqual(store.project,before,'Recipe must do useful work');
 while(store.undoStack.length)store.undo();assert.deepEqual(store.project,before);
});
test('offline discovery needs no server and returns failures for unknown recipes',()=>{
 const cli=args=>JSON.parse(execFileSync(process.execPath,['scripts/studio.mjs',...args,'--url','http://127.0.0.1:1'],{encoding:'utf8'}));
 assert.ok(cli(['catalog','--query','lip sync']).features.some(f=>f.id==='speech'));assert.equal(cli(['catalog','liquid']).id,'liquid');assert.equal(cli(['recipe','add-liquid','--json','{"fill":0.8}']).requests[0].args.commands.values.fill,.8);
 assert.throws(()=>execFileSync(process.execPath,['scripts/studio.mjs','recipe','not-real'],{stdio:'pipe'}));
});
test('Web feature guide matches the same Core source',()=>{assert.equal(fs.readFileSync(new URL('../../docs/features.md',import.meta.url),'utf8'),catalogueMarkdown());});
