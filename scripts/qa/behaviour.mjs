import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Run against the built editor (`npm start`). The example exercises ECS data,
// presentation, and serialization through the same paths used by authored scenes.
const base = process.env.STUDIO_URL ?? 'http://127.0.0.1:4354';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text() + " " + message.location().url); });
try {
  await page.goto(base + '/puppet-studio/index.html');
  await page.waitForFunction(() => window.shapeshiftStudio);
  await page.getByRole('button', { name: 'Scene', exact: true }).click();
  await page.getByRole('button', { name: 'Emitter example', exact: true }).click();
  await page.waitForFunction(() => window.shapeshiftStudio.scene3d.runtime()?.controllers.actors.has('emitter'));
  await page.getByRole('button', { name: 'Behaviours', exact: true }).click();
  assert.equal(await page.getByLabel('Entity template').inputValue(), 'EmitterDevice');
  await page.getByRole('button', { name: 'Apply to selected object', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.evaluate(async () => {
    const app = window.shapeshiftStudio;
    await app.dispatch([
      { op: 'library.capture', id: 'emitter-source', name: 'Emitter', category: 'props', dimension: 3, node: 'emitter' },
      { op: 'library.place', id: 'emitter-source', instance: 'other-emitter', position: [3, 1, 0] }
    ]);
    await app.scene3d.refresh();
  });
  for (const illustrated of [false, true]) {
    const result = await page.evaluate(async illustrated => {
      const app = window.shapeshiftStudio;
      if (illustrated) {
        await app.dispatch({ op: 'scene3d.settings', values: { rendering: { pipeline: 'illustrated' } } });
        await app.scene3d.refresh();
      }
      const scene = app.scene3d.runtime();
      const read = async time => {
        await app.scene3d.seek(time); scene.render();
        const manager = scene.pipeline?.controllers ?? scene.controllers;
        return { state: scene.snapshot().controllers.emitter,
          beams: [...manager.actors.get('emitter').presenter.beams.values()].map(mesh => mesh.visible) };
      };
      const active = await read(.8), idle = await read(1.7), rewind = await read(.8);
      const manager = scene.pipeline?.controllers ?? scene.controllers;
      manager.runtime.dispatch(manager.actors.get('other-emitter').controller, 'deactivate');
      manager.render();
      const independent = scene.snapshot().controllers;
      await app.scene3d.seek(.8);
      const portable = await app.scene3d.portable();
      const { createScenePlayer } = await import('./scene3d/runtime.js');
      const canvas = document.createElement('canvas'); document.body.append(canvas);
      const player = await createScenePlayer(canvas, JSON.parse(JSON.stringify(portable)));
      player.seek(.8); player.scene.render();
      const exported = player.scene.snapshot().controllers.emitter;
      player.dispose(); canvas.remove();
      return { active, idle, rewind, exported, independent, illustrated: !!scene.pipeline };
    }, illustrated);
    assert.equal(result.illustrated, illustrated);
    assert.equal(result.active.state.components.EmitterOutput.enabled, true);
    assert.deepEqual(result.active.beams, [true, true]);
    assert.equal(result.idle.state.components.EmitterOutput.enabled, false);
    assert.deepEqual(result.idle.beams, [false, false]);
    assert.deepEqual(result.rewind, result.active);
    assert.equal(result.exported.components.EmitterOutput.enabled, true);
    assert.equal(result.independent.emitter.components.EmitterOutput.enabled, true);
    assert.equal(result.independent['other-emitter'].components.EmitterOutput.enabled, false);
  }
  await page.goto(base + '/puppet-studio/index.html?example=body-joins');
  await page.waitForFunction(() => window.shapeshiftStudio?.snapshot().project.joints.some(joint => joint.bodyJoin));
  assert.deepEqual(errors, []);
  console.log('Passed: behaviour authoring, ECS bindings, independent Library instances, both renderers, rewind, portable playback, and body-join example.');
} finally {
  await browser.close();
}
