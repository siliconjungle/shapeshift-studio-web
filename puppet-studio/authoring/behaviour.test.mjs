import test from 'node:test';
import assert from 'node:assert/strict';
import { captureComponentDependencies, importComponentDependencies } from './library-dependencies.js';

const definition = { version: 1, components: [{ id: 'Reading', schema: { type: 'number' }, defaults: 1 }], entities: [{ id: 'device', name: 'Device', components: { Reading: 2 } }] };
test('library components carry authored schemas and reject incompatible names', () => {
  const source = { assets: [], entityDefinitions: definition, scene3d: { materials: [], controllerLibraries: { pulse: { states: { idle: {} } } } } };
  const dependencies = captureComponentDependencies(source, 3, [{ controller: { library: 'pulse', entity: 'device' } }]);
  const item = { id: 'sample', dimension: 3, dependencies };
  const destination = { assets: [], scene3d: {} };
  importComponentDependencies(destination, item);
  assert.deepEqual(destination.entityDefinitions, definition);
  importComponentDependencies(destination, item);
  assert.equal(destination.entityDefinitions.components.length, 1);
  destination.entityDefinitions.components[0].schema = { type: 'string' };
  assert.throws(() => importComponentDependencies(destination, item), /conflicting components/);
});

test('editing an entity definition rebuilds scene behaviour', async () => {
  const { projectChanges } = await import('../changes.js');
  const before = { assets: [], entityDefinitions: definition, scene3d: { nodes: [], materials: [], clips: [] } };
  const after = structuredClone(before); after.entityDefinitions.entities[0].components.Reading = 9;
  const changes = projectChanges(before, after, [['set', ['entityDefinitions'], after.entityDefinitions]]);
  assert.equal(changes.scene3d?.geometry, true);
});

test('portable library export does not fetch URL-shaped application data', async () => {
  const { freezeLibraryPacket } = await import('./library-transfer.js');
  const { portableProject } = await import('./project-transfer.js');
  const entityDefinitions = { version: 1, components: [], entities: [{ id: 'record', name: 'Record', components: { Payload: { src: 'opaque:value' } } }] };
  const item = { dependencies: { entityDefinitions }, context: { entityDefinitions } };
  const fetcher = () => { throw Error('Application data must not be fetched'); };
  const packet = await freezeLibraryPacket({ item }, { baseURL: 'https://example.test/', fetcher });
  const project = await portableProject({ library: { items: [item] } }, { baseURL: 'https://example.test/', fetcher });
  assert.equal(packet.item.dependencies.entityDefinitions.entities[0].components.Payload.src, 'opaque:value');
  assert.equal(project.library.items[0].context.entityDefinitions.entities[0].components.Payload.src, 'opaque:value');
});
