import { sceneDefaults } from './schema.js';

export function emitterCommands(project = {}) {
  const ids = new Set([...(project.entityDefinitions?.components ?? []), ...(project.entityDefinitions?.entities ?? [])].map(item => item.id));
  const unique = base => { let id = base, index = 2; while (ids.has(id)) id = base + index++; ids.add(id); return id; };
  const component = unique('EmitterOutput'), entity = unique('EmitterDevice');
  const enable = value => ['command', 'component.set', { component, path: 'enabled', value }];
  const scene = sceneDefaults();
  scene.name = 'Two attachment points';
  scene.camera = { ...scene.camera, position: [6, 5, 8], target: [0, 1, 1], size: 7 };
  scene.controllerLibraries = {
    pulse: {
      initialState: 'idle',
      procedures: { start: [['enter', 'active']] },
      states: {
        idle: { enter: [enable(false), ['schedule', 0.6, 'activate']], on: { activate: [['enter', 'active']] } },
        active: { enter: [enable(true), ['schedule', 0.9, 'deactivate']],
          exit: [enable(false)], on: { deactivate: [['enter', 'idle']] } }
      }
    }
  };
  return [
    { op: 'component.define', value: { id: component, schema: { type: 'object', properties: { enabled: { type: 'boolean' } }, required: ['enabled'], additionalProperties: false }, defaults: { enabled: false } } },
    { op: 'entity.create', id: entity, name: 'Emitter device' },
    { op: 'entity.assign', id: entity, component },
    { op: 'scene3d.replace', value: scene },
    { op: 'scene3d.node.add', id: 'emitter', type: 'box', values: {
      name: 'Emitter', dimensions: [1.8, 1, 1], position: [0, 1, 0],
      controller: { library: 'pulse', entity, presentation: {
        attachments: {
          left: { position: [-0.55, 0.2, 0.55], direction: [-0.15, 0, 1] },
          right: { position: [0.55, 0.2, 0.55], direction: [0.15, 0, 1] }
        },
        beams: [
          { id: 'first', origin: 'left', enabled: { path: 'components.' + component + '.enabled' }, length: 2.5, width: 0.045, color: '#7dd3fc' },
          { id: 'second', origin: 'right', enabled: { path: 'components.' + component + '.enabled' }, length: 2, width: 0.06, color: '#fbbf24' }
        ]
      } }
    } },
    { op: 'scene3d.key', clip: 'idle', node: 'emitter', channel: 'rotation', time: 0, value: [0, -20, 0] },
    { op: 'scene3d.key', clip: 'idle', node: 'emitter', channel: 'rotation', time: 3, value: [0, 20, 0] },
    { op: 'scene3d.key', clip: 'idle', node: 'emitter', channel: 'rotation', time: 6, value: [0, -20, 0] }
  ];
}
