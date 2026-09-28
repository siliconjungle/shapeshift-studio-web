import { timingDocument } from './timing.js';
import { svgText } from '../vector/model.js';
const clone = (x) => structuredClone(x);
// Rows are projections of existing clip/artwork/effect data, never a second timeline.
export function timelineRows(project, { dimension = 2, clip: clipId, asset } = {}) {
  const document = dimension === 3 ? project.scene3d : project,
    clip = document?.clips.find((c) => c.id === clipId) ?? document?.clips[0],
    rows = [];
  if (!clip) return rows;
  const add = (id, label, group, keys, edge = 'outgoing', extra = {}) =>
    rows.push({ id, label, group, keys, edge, domain: clip.duration, ...extra });
  if (dimension === 3) {
    for (const t of clip.tracks) {
      const n = document.nodes.find((n) => n.id === t.node);
      add('scene:' + t.node + ':' + t.channel, t.channel, n?.name ?? t.node, t.keys, 'incoming', {
        node: t.node,
        channel: t.channel,
        discrete: t.channel === 'visible',
        boolean: t.channel === 'visible',
        numericBoolean: t.channel === 'visible',
        procedural: !!t.program || !!t.controllerOwned,
        owner: t.controllerOwned ? 'Controller' : t.program ? 'Expression program' : 'Keyframes',
      });
    }
  } else {
    for (const [node, keys] of Object.entries(clip.tracks)) {
      const n = project.joints.find((j) => j.id === node);
      add('rig:' + node, 'Transform', n?.name ?? node, keys, 'outgoing', {
        node,
        channel: 'transform',
        owner: clip.ik?.[node] ? 'IK target + keyframes' : 'Keyframes',
      });
    }
    for (const t of clip.lightingTracks ?? [])
      add(
        'light:' + t.node + ':' + t.channel,
        t.channel,
        project.joints.find((j) => j.id === t.node)?.name ?? t.node,
        t.keys,
        'incoming',
        { node: t.node, channel: t.channel, owner: 'Light keyframes' },
      );
  }
  if (dimension === 2)
    for (const t of clip.illustrationTracks ?? [])
      add(
        'illustration:' + t.joint + ':' + t.channel,
        t.channel,
        project.joints.find((j) => j.id === t.joint)?.name ?? t.joint,
        t.keys,
        'outgoing',
        { node: t.joint, channel: t.channel, owner: 'Illustration properties', illustration: t },
      );
  if (dimension === 2)
    for (const t of clip.joystickTracks ?? [])
      add(
        'joystick:' + t.node,
        'Joystick handle',
        project.joints.find((n) => n.id === t.node)?.name ?? t.node,
        t.keys,
        'outgoing',
        { node: t.node, channel: 'joystick', owner: 'Joystick handle keys' },
      );
  if (dimension === 2)
    for (const t of clip.soloTracks ?? [])
      add('solo:' + t.node, 'Solo', project.joints.find((n) => n.id === t.node)?.name ?? t.node, t.keys, 'hold', {
        node: t.node,
        channel: 'solo',
        owner: 'Active child',
        discrete: true,
        solo: true,
      });
  if (dimension === 2)
    for (const t of clip.drawOrderTracks ?? [])
      add('drawOrder:' + t.node, 'Draw order', project.joints.find((j) => j.id === t.node)?.name ?? t.node, t.keys, 'hold', {
        node: t.node,
        channel: 'drawOrder',
        owner: 'Draw-order rule',
        discrete: true,
      });
  if (dimension === 2)
    for (const t of clip.meshTracks ?? [])
      add('mesh:' + t.joint, 'Mesh vertices', project.joints.find((j) => j.id === t.joint)?.name ?? t.joint, t.keys, 'outgoing', {
        node: t.joint,
        channel: 'mesh',
        owner: 'Mesh deformation',
      });
  for (const t of clip.resolvedTracks ?? [])
    add(
      'resolved:' + t.id,
      t.channel + ' · baked',
      (dimension === 3 ? document.nodes : project.joints).find((n) => n.id === t.node)?.name ?? t.node,
      t.keys,
      'outgoing',
      {
        node: t.node,
        channel: t.channel,
        owner: 'Baked final keys',
        resolved: t,
        start: t.start,
        end: t.end,
        enabled: t.enabled !== false,
      },
    );
  if (dimension === 2)
    for (const t of clip.illustrationTracks ?? [])
      add(
        'illustration:' + t.joint + ':' + t.channel,
        t.channel,
        project.joints.find((j) => j.id === t.joint)?.name ?? t.joint,
        t.keys,
        'outgoing',
        { node: t.joint, channel: t.channel, owner: 'Liquid properties', illustration: t },
      );
  if (dimension === 2)
    for (const e of clip.dialogue ?? [])
      add('speech:' + e.id, project.speech?.chunks?.[e.chunk]?.name ?? e.chunk, 'Dialogue', [e], 'none', {
        event: true,
        speech: true,
        speechDuration: (project.speech?.chunks?.[e.chunk]?.duration ?? 0) / (e.rate ?? 1),
        owner: 'Speech chunk',
        channel: 'speech',
      });
  const events = dimension === 3 ? clip.events : (clip.cues ?? []);
  for (const event of events)
    add(
      'event:' + event.id,
      event.name ?? event.type,
      (event.node ? document.nodes?.find((n) => n.id === event.node)?.name + ' · ' : '') +
        (event.type === 'sound' ? 'Sound' : event.faceControl ? 'Facial control' : 'Events'),
      [event],
      'none',
      {
        event: true,
        node: event.node ?? event.joint,
        owner: event.faceControl ? 'Facial ownership' : event.type,
        channel: event.type,
      },
    );
  for (const a of project.assets) {
    if (!a.vector || (asset && a.id !== asset)) continue;
    for (const t of a.vector.tracks)
      add(
        'art:' + a.id + ':' + t.shape + ':' + t.channel,
        t.channel,
        (a.name ?? a.id) + ' / ' + (a.vector.shapes.find((s) => s.id === t.shape)?.name ?? t.shape),
        t.keys,
        'outgoing',
        { asset: a.id, domain: a.vector.duration, channel: t.channel, owner: 'Artwork animation' },
      );
  }
  if (dimension === 2) {
    const walk = (obj, path, label) => {
      for (const [key, v] of Object.entries(obj ?? {})) {
        if (key === 'overLife' || key === 'points' || key === 'path' || key === 'contour') continue;
        const next = [...path, key];
        if (Array.isArray(v) && v.length && v.every((k) => k && Number.isFinite(k.time) && Number.isFinite(k.value)))
          add('fx:' + next.join('/'), next.slice(2).join('.'), label, v, 'outgoing', { owner: 'Effect parameter', channel: key });
        else if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, next, label);
      }
    };
    for (const group of ['emitters', 'fluids', 'nodes', 'models'])
      for (const item of (clip.fx ?? project.fx)?.[group] ?? []) walk(item, [group, item.id], item.name ?? item.id);
  }
  for (const l of project.backdrop?.layers ?? [])
    for (const t of l.tracks)
      add('backdrop:' + l.id + ':' + t.channel, t.channel, 'Backdrop / ' + l.name, t.keys, 'outgoing', {
        domain: project.backdrop.duration,
        owner: 'Backdrop animation',
        channel: t.channel,
      });
  for (const t of project.backdrop?.tracks ?? [])
    add('sky:' + t.channel, t.channel, 'Sky', t.keys, 'outgoing', {
      domain: project.backdrop.duration,
      owner: 'Sky animation',
      channel: t.channel,
    });
  for (const track of clip.constraintWeights ?? []) {
    const c = document.constraints?.find((c) => c.id === track.constraint);
    if (c)
      add('constraint:' + c.id, 'Strength', c.type + ' constraint', track.keys, 'outgoing', {
        node: c.node,
        owner: 'Object constraint',
      });
  }
  for (const track of clip.constraintTracks ?? []) {
    const c = document.constraints?.find((c) => c.id === track.constraint);
    if (c)
      add(
        'constraint:' + c.id + ':' + track.channel,
        { distance: 'Path distance', orient: 'Orient to path', ownerOffset: 'Position offset' }[track.channel],
        (document.joints ?? document.nodes).find((n) => n.id === c.node)?.name ?? c.node,
        track.keys,
        'outgoing',
        { node: c.node, owner: 'Follow Path', discrete: track.channel !== 'distance', boolean: track.channel !== 'distance' },
      );
  }
  for (const group of ['constraints', 'layers', 'follow'])
    for (const tool of clip.tools?.[group] ?? [])
      if (Array.isArray(tool.weight))
        add('tool:' + group + ':' + tool.id, 'Influence', tool.name ?? tool.id, tool.weight, 'outgoing', {
          node: tool.joint,
          owner: 'Motion influence',
        });
  if (dimension === 2)
    for (const e of clip.dialogue ?? [])
      add('speech:' + e.id, project.speech?.chunks?.[e.chunk]?.name ?? e.chunk, 'Dialogue', [e], 'none', {
        event: true,
        speech: true,
        speechDuration: (project.speech?.chunks?.[e.chunk]?.duration ?? 0) / (e.rate ?? 1),
        owner: 'Speech chunk',
        channel: 'speech',
      });
  for (const track of clip.noodleTracks ?? [])
    add(
      'noodle:' + track.node,
      'Noodle pose',
      (document.nodes ?? document.joints).find((n) => n.id === track.node)?.name ?? track.node,
      track.keys,
      'outgoing',
      { node: track.node, owner: 'Noodle deformer' },
    );
  const timing = timingDocument(project, { dimension, clip: clip.id, asset });
  for (const m of timing?.markers ?? [])
    add('marker:' + m.id, m.name, 'Timing beats', [m], 'none', {
      event: true,
      marker: true,
      asset,
      domain: timing.duration,
      owner: 'Timing marker',
      channel: m.kind,
    });
  for (const t of clip.tools?.constraints ?? [])
    if (t.pointKeys?.length)
      add('target:' + t.id, 'Target position', t.name ?? t.id, t.pointKeys, 'outgoing', {
        node: t.joint,
        owner: 'Target keyframes',
        channel: 'point',
      });
  return rows;
}
export function timelineSelection(rows, start, end) {
  return rows.flatMap((r) =>
    r.keys
      .filter((k) => k.time >= start - 1e-6 && k.time <= end + 1e-6)
      .map((k) => ({ row: r.id, time: k.time, ...(r.event ? { id: k.id } : {}) })),
  );
}
export function applyTimelineCommand(project, c) {
  if (c.op !== 'timeline.edit') throw Error('Unknown timeline command');
  const rows = timelineRows(project, c),
    byId = new Map(rows.map((r) => [r.id, r])),
    selected = [],
    seen = new Set();
  for (const ref of c.keys ?? []) {
    const row = byId.get(ref.row);
    if (!row || row.procedural) throw Error('Choose editable keyframes; procedural channels are driven by their action');
    const key = row.keys.find((k) => (ref.id ? k.id === ref.id : Math.abs(k.time - ref.time) < 1e-6));
    if (!key) throw Error('The selected key no longer exists');
    if (seen.has(key)) continue;
    seen.add(key);
    selected.push({ row, key, old: clone(key) });
  }
  if (!selected.length) throw Error('Select at least one key');
  if (c.scale !== undefined && (!Number.isFinite(c.scale) || c.scale <= 0 || c.scale > 100))
    throw Error('Retiming scale must be positive');
  if (c.delta !== undefined && !Number.isFinite(c.delta)) throw Error('Invalid time offset');
  for (const { row, key, old } of selected) {
    if (c.remove) {
      if (row.marker) {
        const timing = timingDocument(project, c);
        timing.markers = timing.markers.filter((m) => m !== key);
      } else if (row.event) {
        const doc = c.dimension === 3 ? project.scene3d : project,
          clip = doc.clips.find((x) => x.id === c.clip) ?? doc.clips[0],
          collection = row.speech ? 'dialogue' : c.dimension === 3 ? 'events' : 'cues';
        clip[collection] = clip[collection].filter((e) => e !== key);
      } else row.keys.splice(row.keys.indexOf(key), 1);
      continue;
    }
    const pivot = c.pivot ?? 0;
    key.time = pivot + (old.time - pivot) * (c.scale ?? 1) + (c.delta ?? 0);
    if (key.time < 0 || key.time > row.domain || !Number.isFinite(key.time))
      throw Error('Keys must remain inside their timeline');
    if (row.speech && c.scale !== undefined) key.rate = (old.rate ?? 1) / c.scale;
    else if (row.event && c.scale !== undefined) key.duration = old.duration * c.scale;
    if (c.easing !== undefined) {
      if (row.event) continue;
      if (row.discrete && c.easing !== (row.boolean ? 'step' : 'hold')) throw Error('Discrete selections require step/hold keys');
      key.easing = c.easing;
      if (c.easing === 'bezier') key.bezier = clone(c.bezier ?? [0.25, 0.1, 0.25, 1]);
      else delete key.bezier;
    }
    if (c.value !== undefined) {
      if (row.event) throw Error('Edit event settings in its inspector');
      key.value = clone(c.value);
    }
  }
  for (const row of new Set(selected.map((x) => x.row))) {
    if (row.illustration && !row.keys.length) {
      const clip = project.clips.find((x) => x.id === c.clip) ?? project.clips[0];
      clip.illustrationTracks = clip.illustrationTracks.filter((t) => t !== row.illustration);
    }
    if (row.resolved) {
      const t = row.resolved,
        count = selected.filter((x) => x.row === row).length;
      if (!c.remove && count === row.keys.length && (c.delta !== undefined || c.scale !== undefined)) {
        const pivot = c.pivot ?? 0;
        t.start = pivot + (t.start - pivot) * (c.scale ?? 1) + (c.delta ?? 0);
        t.end = pivot + (t.end - pivot) * (c.scale ?? 1) + (c.delta ?? 0);
      }
      if (!row.keys.length) {
        const doc = c.dimension === 3 ? project.scene3d : project,
          clip = doc.clips.find((x) => x.id === c.clip);
        clip.resolvedTracks = clip.resolvedTracks.filter((x) => x !== t);
      }
    }
    row.keys.sort((a, b) => a.time - b.time);
    if (!row.event)
      for (let i = 1; i < row.keys.length; i++)
        if (row.keys[i].time - row.keys[i - 1].time < 1e-6) throw Error('Retiming would overlap two keys on the same track');
  }
  for (const a of project.assets)
    if (a.vector && selected.some((x) => x.row.asset === a.id))
      a.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgText(a.vector));
  return selected.length;
}
