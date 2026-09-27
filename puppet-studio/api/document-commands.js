import { identity, removeJoint, moveOrigin, enableIK, bakeMotion } from '../runtime.js';

export const DOCUMENT_COMMANDS = ['project.patch', 'project.replace', 'project.rename', 'joint.add', 'joint.update', 'joint.remove', 'joint.rename', 'joint.origin', 'joint.ik', 'clip.add', 'clip.update', 'clip.remove', 'clip.duplicate', 'clip.bake', 'asset.update', 'asset.remove'];
const reserved = new Set(['__proto__', 'prototype', 'constructor']);
const copy = value => structuredClone(value);
const requireItem = (items, id, kind) => {
  const item = items.find(item => item.id === id);
  if (!item) throw Error(`Missing ${kind} ${id}`);
  return item;
};
export function patchDocument(document, patches) {
  if (!Array.isArray(patches) || patches.length > 4096) throw Error('Expected up to 4096 document patches');
  for (const patch of patches) {
    if (!['set', 'remove', 'insert', 'test'].includes(patch.op) || !Array.isArray(patch.path) || !patch.path.length) throw Error('Invalid document patch');
    if (patch.path.some(key => !(typeof key === 'string' || Number.isSafeInteger(key)) || reserved.has(String(key)))) throw Error('Invalid document path');
    let parent = document;
    for (const key of patch.path.slice(0, -1)) {
      if (!parent || !Object.hasOwn(parent, key)) throw Error('Missing document path');
      parent = parent[key];
    }
    const key = patch.path.at(-1);
    if (!parent || typeof parent !== 'object') throw Error('Invalid document parent');
    if (Array.isArray(parent) && (!Number.isSafeInteger(key) || key < 0 || key > parent.length || (key === parent.length && patch.op !== 'insert'))) throw Error('Invalid array index');
    if (patch.op === 'test') {
      if (JSON.stringify(parent[key]) !== JSON.stringify(patch.value)) throw Error('Document test failed');
    } else if (patch.op === 'insert') {
      if (!Array.isArray(parent)) throw Error('Insert requires an array');
      parent.splice(key, 0, copy(patch.value));
    } else if (patch.op === 'remove') {
      if (!Object.hasOwn(parent, key)) throw Error('Missing document path');
      if (Array.isArray(parent)) parent.splice(key, 1); else delete parent[key];
    } else parent[key] = copy(patch.value);
  }
}

function renameJoint(project, from, to) {
  const item = requireItem(project.joints, from, 'joint');
  if (project.joints.some(joint => joint.id === to)) throw Error('Duplicate joint ID');
  item.id = to;
  for(const source of project.puppetSources??[])source.roots=source.roots.map(id=>id===from?to:id);
  for(const binding of project.appearance?.bindings??[])if(binding.target?.joint===from)binding.target.joint=to;
  for (const joint of project.joints) {
    if (joint.parent === from) joint.parent = to;
    if (joint.bodyJoin?.targetNode === from) joint.bodyJoin.targetNode = to;
  }
  for (const clip of project.clips) {
    for (const item of [...(clip.tools?.constraints ?? []), ...(clip.tools?.follow ?? [])]) {
      for (const key of ['joint', 'target', 'source']) if (item[key] === from) item[key] = to;
      for (const key of ['root', 'mid']) if (item.chain?.[key] === from) item.chain[key] = to;
    }
    for (const layer of clip.tools?.layers ?? []) {
      if (layer.joints) layer.joints = layer.joints.map(id => id === from ? to : id);
      if (layer.values?.[from]) { layer.values[to] = layer.values[from]; delete layer.values[from]; }
    }
    for (const track of [...(clip.lightingTracks ?? []), ...(clip.resolvedTracks ?? [])]) if (track.node === from) track.node = to;
    for (const key of ['tracks', 'ik']) if (clip[key]?.[from]) { clip[key][to] = clip[key][from]; delete clip[key][from]; }
    for (const effect of clip.effects ?? []) if (effect.joint === from) effect.joint = to;
    for (const chain of Object.values(clip.ik ?? {})) for (const key of ['root', 'mid']) if (chain[key] === from) chain[key] = to;
  }
}
function stretchClip(clip, duration) {
  const ratio = duration / clip.duration;
  for (const keys of Object.values(clip.tracks)) for (const key of keys) key.time *= ratio;
  for (const track of [...(clip.lightingTracks ?? []), ...(clip.resolvedTracks ?? [])]) for (const key of track.keys) key.time *= ratio;
  for (const cue of clip.cues ?? []) { cue.time *= ratio; cue.duration *= ratio; }
  for (const effect of clip.effects ?? []) for (const key of ['delay', 'span']) if (effect[key] !== undefined) effect[key] *= ratio;
  for (const item of Object.values(clip.tools ?? {}).flat()) {
    for (const key of ['start', 'end', 'blend']) if (item[key] !== undefined) item[key] *= ratio;
    if (Array.isArray(item.weight)) for (const key of item.weight) key.time *= ratio;
  }
}
export function applyDocumentCommand(project, command) {
  const { op, id, values = {} } = command;
  if (op === 'project.patch') return patchDocument(project, command.patches);
  if (op === 'project.replace') { for (const key of Object.keys(project)) delete project[key]; Object.assign(project, copy(command.value)); return; }
  if (op === 'project.rename') { project.name = command.name; return; }
  if (op === 'joint.add') {
    if ('id' in values) throw Error('Pass the joint ID as id');
    if (project.joints.some(joint => joint.id === id)) throw Error('Duplicate joint ID');
    project.joints.push({ id, name: command.name ?? id, parent: command.parent ?? null, rest: identity(), layer: 40, ...copy(values) });
    return id;
  }
  if (op.startsWith('joint.')) {
    const joint = requireItem(project.joints, id, 'joint');
    if (op === 'joint.update') { if ('id' in values) throw Error('Use joint.rename'); Object.assign(joint, copy(values)); }
    if (op === 'joint.remove') removeJoint(project, id);
    if (op === 'joint.rename') renameJoint(project, id, command.newId);
    if (op === 'joint.origin') moveOrigin(project, id, command.point);
    if (op === 'joint.ik') enableIK(project, requireItem(project.clips, command.clip, 'clip'), id, command.time ?? 0, command.options ?? {});
    return command.newId ?? id;
  }
  if (op === 'clip.add') {
    if ('id' in values) throw Error('Pass the clip ID as id');
    if (project.clips.some(clip => clip.id === id)) throw Error('Duplicate clip ID');
    project.clips.push({ id, name: command.name ?? id, duration: 2, fps: 30, loop: true, tracks: {}, ...copy(values) });
    return id;
  }
  if (op.startsWith('clip.')) {
    const clip = requireItem(project.clips, id, 'clip');
    if (op === 'clip.update') {
      if ('id' in values) throw Error('Clip IDs are stable');
      if (values.duration !== undefined && command.retime !== false) stretchClip(clip, values.duration);
      Object.assign(clip, copy(values));
    }
    if (op === 'clip.duplicate') {
      if (!command.newId || project.clips.some(clip => clip.id === command.newId)) throw Error('Choose a unique clip ID');
      project.clips.push({ ...copy(clip), id: command.newId, name: command.name ?? clip.name + ' copy' });
      return command.newId;
    }
    if (op === 'clip.remove') {
      if (project.clips.length === 1) throw Error('Keep at least one animation');
      project.clips = project.clips.filter(item => item !== clip);
      for (const other of project.clips) if (other.tools?.layers) other.tools.layers = other.tools.layers.filter(layer => layer.sourceClip !== id);
    }
    if (op === 'clip.bake') bakeMotion(project, clip);
    return id;
  }
  const asset = requireItem(project.assets, id, 'asset');
  if (op === 'asset.update') { if ('id' in values) throw Error('Asset IDs are stable'); Object.assign(asset, copy(values)); }
  if (op === 'asset.remove') project.assets = project.assets.filter(item => item !== asset);
  return id;
}
