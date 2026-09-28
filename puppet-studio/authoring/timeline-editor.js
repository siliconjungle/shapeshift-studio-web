import { gestureRecorder } from './recording.js';
import { studioTransport, transportKey } from './transport.js';
import { BEAT_KINDS } from './timing.js';
import { timelineRows, timelineSelection } from './timeline.js';
import { easing, easeNames } from '../fx/math.js';
import { EASINGS } from '../scene3d/schema.js';
import { cueWaveform } from './waveform.js';
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function mountTimeline(host) {
  const { project, context, revision, dispatch, toast } = host;
  const button = document.createElement('button');
  button.id = 'timeline-open';
  button.textContent = 'Timeline';
  document.getElementById('styles-open').before(button);
  const panel = document.createElement('section');
  panel.id = 'shared-timeline';
  panel.setAttribute('aria-label', 'Shared animation timeline');
  panel.hidden = true;
  document.body.append(panel);
  let rows = [],
    selected = [],
    signature = '',
    focused = null,
    collapsed = new Set(),
    drag = null,
    curveDrag = null,
    filter = '',
    lastContext = '';
  const run = (c) => {
    try {
      dispatch({ ...context(), op: 'timeline.edit', keys: selected, ...c });
      selected = [];
      signature = '';
      refresh();
    } catch (e) {
      toast(e.message, true);
    }
  };
  const keyRef = (row, key) => ({ row: row.id, time: key.time, ...(row.event ? { id: key.id } : {}) }),
    isSelected = (r, k) => selected.some((s) => s.row === r.id && (s.id ? s.id === k.id : Math.abs(s.time - k.time) < 1e-6));
  function refresh() {
    if (panel.hidden) return;
    const c = context(),
      key = [c.dimension, c.clip, c.asset ?? ''].join(':');
    if (key !== lastContext) {
      selected = [];
      focused = null;
      lastContext = key;
    }
    const next = [revision(), key, JSON.stringify(c.guides), filter, JSON.stringify(selected), [...collapsed].join('|')].join(
      ':',
    );
    if (next === signature) {
      clock();
      return;
    }
    signature = next;
    rows = timelineRows(project(), c).filter(
      (r) => (!c.asset || r.asset === c.asset) && (!filter || (r.group + ' ' + r.label).toLowerCase().includes(filter)),
    );
    const doc = c.dimension === 3 ? project().scene3d : project(),
      clip = doc?.clips.find((x) => x.id === c.clip) ?? doc?.clips[0],
      duration = c.asset ? (project().assets.find((a) => a.id === c.asset)?.vector?.duration ?? 1) : (clip?.duration ?? 1);
    const playback = studioTransport.get(transportKey(c), duration),
      groups = [...new Set(rows.map((r) => r.group))];
    panel.innerHTML = `<header><button id="ut-prev" aria-label="Previous frame">◀│</button><button id="ut-play">▶ / Ⅱ</button><button id="ut-next" aria-label="Next frame">│▶</button><select id="ut-speed" aria-label="Preview playback speed">${[0.1, 0.25, 0.5, 1].map((v) => `<option value="${v}" ${playback.speed === v ? 'selected' : ''}>${v}×</option>`).join('')}</select><select id="ut-clip" aria-label="Animation clip" ${c.asset ? 'hidden' : ''}>${(doc?.clips ?? []).map((x) => `<option value="${esc(x.id)}" ${x.id === clip?.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select><strong>${c.asset ? 'Artwork' : c.dimension === 3 ? 'Scene' : 'Rig'} animation</strong><span id="ut-clock"></span><input id="ut-scrub" aria-label="Playhead" type="range" min="0" max="${duration}" step=".001" value="${Math.min(c.time, duration)}"><button id="ut-close" aria-label="Close timeline">×</button></header><div class="ut-body"><div class="ut-tracks"><div class="ut-range"><input id="ut-filter" placeholder="Filter tracks" aria-label="Filter tracks" value="${esc(filter)}"><label>From <input id="ut-from" type="number" step=".01" min="0" value="${playback.from}"></label><label>To <input id="ut-to" type="number" step=".01" min="0" value="${playback.to}"></label><button id="ut-range">Select range</button><button id="ut-loop-range" aria-pressed="${playback.loop}">Loop range</button><button id="ut-ghosts" ${c.asset ? 'aria-pressed="' + c.guides?.onion + '"' : ''}>Onion skin</button><button id="ut-arc" ${c.asset ? 'aria-pressed="' + c.guides?.arc + '"' : ''}>Motion path</button><select id="ut-beat-kind" aria-label="Timing beat type">${BEAT_KINDS.map((k) => `<option>${k}</option>`).join('')}</select><button id="ut-beat">+ Beat</button><button id="ut-record" ${c.asset ? 'disabled' : ''} aria-pressed="${gestureRecorder.armed}" title="Record a canvas gesture into editable keys">● Record gesture</button></div><div class="ut-rows">${
      !rows.length
        ? '<p class="ut-empty">No keyed channels yet. Pose an object, animate artwork, or add a light or effect to begin.</p>'
        : groups
            .map(
              (group) =>
                `<button class="ut-group" data-group="${esc(group)}">${collapsed.has(group) ? '▸' : '▾'} ${esc(group)}</button>${
                  collapsed.has(group)
                    ? ''
                    : rows
                        .filter((r) => r.group === group)
                        .map(
                          (r) =>
                            `<div class="ut-row"><button data-track="${esc(r.id)}" title="${esc(r.owner)}">${esc(r.label)}${r.procedural ? ' · driven' : ''}</button><div class="ut-lane" data-lane="${esc(r.id)}" data-domain="${r.domain}">${r.keys.map((k, i) => (r.event ? `<button class="ut-event ${r.marker ? 'ut-beat-marker' : ''} ${isSelected(r, k) ? 'selected' : ''}" data-row="${esc(r.id)}" data-key="${i}" style="left:${(k.time / r.domain) * 100}%;width:${Math.max(1, (Math.min(r.speechDuration ?? k.duration, r.domain - k.time) / r.domain) * 100)}%" title="${esc(r.label)} · ${k.time.toFixed(2)}s"><canvas data-wave="${esc(r.id)}" width="160" height="22"></canvas></button>` : `<button class="ut-key ${isSelected(r, k) ? 'selected' : ''}" data-row="${esc(r.id)}" data-key="${i}" style="left:${(k.time / r.domain) * 100}%" title="${k.time.toFixed(3)}s · ${esc(k.easing)}" aria-label="${esc(r.label)} key at ${k.time}">◆</button>`)).join('')}<i class="ut-playhead" style="left:${Math.min(1, c.time / r.domain) * 100}%"></i></div></div>`,
                        )
                        .join('')
                }`,
            )
            .join('')
    }</div></div><aside class="ut-key-inspector">${selected.length ? `<strong>${selected.length} selected</strong><label>Move · seconds<input id="ut-delta" type="number" step=".01" value="0"></label><label>Retime · scale<input id="ut-scale" type="number" step=".05" min=".01" value="1"></label><button id="ut-retime">Apply timing</button><button id="ut-delete">Delete keys</button><label>Cleanup tolerance<input id="ut-tolerance" type="number" min="0" step=".01" value=".25"></label><button id="ut-cleanup">Simplify recording</button>` : '<p>Select a key to edit its values and easing. Shift-click adds keys; drag them to retime together.</p>'}<div id="ut-curve"></div></aside></div>`;
    panel.querySelector('#ut-speed').onchange = (e) => {
      studioTransport.set(transportKey(c), duration, { speed: +e.target.value });
    };
    for (const id of ['ut-from', 'ut-to'])
      panel.querySelector('#' + id).onchange = () => {
        try {
          studioTransport.set(transportKey(c), duration, {
            from: +panel.querySelector('#ut-from').value,
            to: +panel.querySelector('#ut-to').value,
          });
        } catch (error) {
          toast(error.message, true);
        }
      };
    panel.querySelector('#ut-filter').onchange = (e) => {
      filter = e.target.value;
      signature = '';
      refresh();
    };
    panel.querySelector('#ut-scrub').oninput = (e) => host.seek(+e.target.value);
    panel.querySelector('#ut-clip').onchange = (e) => host.clip(e.target.value);
    drawCurve();
    clock();
    waveforms();
  }
  async function waveforms() {
    const stamp = signature;
    for (const r of rows.filter((r) => r.event)) {
      const e = r.keys[0];
      if (r.speech) {
        const chunk = project().speech?.chunks?.[e.chunk],
          canvas = [...panel.querySelectorAll('[data-wave]')].find((c) => c.dataset.wave === r.id);
        if (canvas && chunk?.envelope?.length) {
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = '#a9d3c0';
          ctx.beginPath();
          for (let i = 0; i < 160; i++) {
            const v = chunk.envelope[Math.floor((i / 160) * chunk.envelope.length)] ?? 0;
            ctx.moveTo(i, 11 - v * 10);
            ctx.lineTo(i, 11 + v * 10);
          }
          ctx.stroke();
        }
        continue;
      }
      const binding = e.audio,
        cue = binding?.cue ?? binding?.fire,
        definition = project().audioLibraries?.[binding?.library] ?? project().scene3d?.audioLibraries?.[binding?.library];
      if (!definition || !cue) continue;
      try {
        const peaks = await cueWaveform(definition, cue, e.duration);
        if (signature !== stamp) return;
        const canvas = [...panel.querySelectorAll('[data-wave]')].find((c) => c.dataset.wave === r.id);
        if (!canvas || !peaks) continue;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#a9d3c0';
        ctx.beginPath();
        peaks.forEach((v, i) => {
          ctx.moveTo(i, 11 - v * 10);
          ctx.lineTo(i, 11 + v * 10);
        });
        ctx.stroke();
      } catch {
        /* An unavailable offline renderer does not prevent editing timing. */
      }
    }
  }
  function clock() {
    const c = context(),
      el = panel.querySelector('#ut-clock');
    if (el) el.textContent = c.time.toFixed(2) + ' s';
    const scrub = panel.querySelector('#ut-scrub');
    if (scrub && document.activeElement !== scrub) scrub.value = c.time;
    for (const lane of panel.querySelectorAll('.ut-lane'))
      lane.querySelector('.ut-playhead').style.left = Math.min(1, c.time / +lane.dataset.domain) * 100 + '%';
  }
  function current() {
    const ref = selected.find((s) => s.row === focused) ?? selected[0];
    if (!ref) return null;
    const row = rows.find((r) => r.id === ref.row),
      index = row?.keys.findIndex((k) => (ref.id ? k.id === ref.id : Math.abs(k.time - ref.time) < 1e-6));
    return index >= 0 ? { row, key: row.keys[index], index } : null;
  }
  function drawCurve() {
    const target = panel.querySelector('#ut-curve'),
      item = current();
    if (!item || item.row.event || item.row.procedural) {
      target.innerHTML = item?.row.speech
        ? '<p>Retiming changes both recording speed and mouth timing. Configure bindings in Speech.</p>'
        : item?.row.event
          ? '<p>Event duration is retimed with its cue. Configure the effect in the scene inspector.</p>'
          : '';
      return;
    }
    const { row, key } = item;
    if (row.boolean) {
      target.innerHTML = `<p>This property switches instantly.</p><label><input id="ut-boolean" type="checkbox" ${key.value ? 'checked' : ''}> ${esc(row.label ?? row.channel ?? 'Enabled')}</label>`;
      target.querySelector('#ut-boolean').onchange = (e) =>
        run({ keys: [keyRef(row, key)], value: row.numericBoolean ? Number(e.target.checked) : e.target.checked });
      return;
    }
    if (row.solo) {
      target.innerHTML = `<p>Solo children switch instantly (hold keys).</p><label>Child<select id="ut-solo"><option value="">None</option>${project()
        .joints.filter((j) => j.parent === row.node)
        .map((j) => `<option value="${esc(j.id)}" ${key.value === j.id ? 'selected' : ''}>${esc(j.name)}</option>`)
        .join('')}</select></label>`;
      target.querySelector('#ut-solo').onchange = (e) => run({ keys: [keyRef(row, key)], value: e.target.value || null });
      return;
    }
    if (row.discrete) {
      const entry = project().drawOrder?.find((e) => e.node === row.node);
      target.innerHTML = `<p>Draw order changes instantly (hold keys).</p><label>Rule<select id="ut-rule"><option value="">Normal</option>${(entry?.rules ?? []).map((r) => `<option value="${esc(r.id)}" ${key.value === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></label>`;
      target.querySelector('#ut-rule').onchange = (e) => run({ keys: [keyRef(row, key)], value: e.target.value || null });
      return;
    }
    const names =
      context().dimension === 3 || row.id.startsWith('light:')
        ? EASINGS
        : row.asset
          ? ['linear', 'smooth', 'step', 'in-quad', 'out-quad', 'out-back', 'out-elastic', 'bezier']
          : easeNames;
    target.innerHTML = `<label>Easing · ${row.edge === 'incoming' ? 'into' : 'after'} key<select id="ut-easing">${names.map((n) => `<option ${n === key.easing ? 'selected' : ''}>${n}</option>`).join('')}</select></label><canvas id="ut-curve-canvas" width="210" height="130" aria-label="Easing curve handles"></canvas><small>Drag handles for custom easing and overshoot.</small><div id="ut-values"></div>`;
    const value = key.value,
      fields =
        typeof value === 'number'
          ? [['value', value]]
          : typeof value === 'string'
            ? []
            : Array.isArray(value)
              ? value.length <= 4
                ? value.map((v, i) => [['X', 'Y', 'Z', 'W'][i], v])
                : []
              : Object.entries(value);
    target.querySelector('#ut-values').innerHTML =
      typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)
        ? `<label>Colour<input data-value="color" type="color" value="${value}"></label>`
        : fields
            .map(([k, v]) => `<label>${esc(k)}<input data-value="${esc(k)}" type="number" step=".01" value="${v}"></label>`)
            .join('');
    target.querySelector('#ut-easing').onchange = (e) => run({ easing: e.target.value });
    target.querySelectorAll('[data-value]').forEach(
      (el) =>
        (el.onchange = () => {
          let next = structuredClone(value);
          if (el.dataset.value === 'color') next = el.value;
          else if (typeof value === 'number') next = +el.value;
          else if (Array.isArray(value)) next[['X', 'Y', 'Z', 'W'].indexOf(el.dataset.value)] = +el.value;
          else next[el.dataset.value] = +el.value;
          run({ keys: [keyRef(row, key)], value: next });
        }),
    );
    const canvas = target.querySelector('canvas'),
      ctx = canvas.getContext('2d'),
      b = key.bezier?.slice() ?? [0.25, 0.1, 0.25, 1],
      pos = (x, y) => [20 + x * 170, 105 - y * 80];
    function paint(custom = false) {
      ctx.fillStyle = '#252529';
      ctx.fillRect(0, 0, 210, 130);
      ctx.strokeStyle = '#55555d';
      ctx.strokeRect(20, 25, 170, 80);
      ctx.strokeStyle = '#81aff4';
      ctx.beginPath();
      for (let i = 0; i <= 100; i++) {
        const x = i / 100,
          y = easing(
            x,
            custom
              ? 'bezier'
              : ({ in: 'in-cubic', out: 'out-cubic', back: 'out-back', elastic: 'out-elastic' }[key.easing] ?? key.easing),
            b,
          );
        ctx.lineTo(...pos(x, y));
      }
      ctx.stroke();
      for (const [i, anchor] of [
        [0, [0, 0]],
        [2, [1, 1]],
      ]) {
        ctx.strokeStyle = '#797985';
        ctx.beginPath();
        ctx.moveTo(...pos(...anchor));
        ctx.lineTo(...pos(b[i], b[i + 1]));
        ctx.stroke();
        ctx.fillStyle = '#d8bb80';
        ctx.beginPath();
        ctx.arc(...pos(b[i], b[i + 1]), 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    paint();
    canvas.onpointerdown = (e) => {
      const rect = canvas.getBoundingClientRect(),
        x = ((e.clientX - rect.left) * 210) / rect.width,
        y = ((e.clientY - rect.top) * 130) / rect.height;
      curveDrag =
        Math.hypot(x - pos(b[0], b[1])[0], y - pos(b[0], b[1])[1]) < Math.hypot(x - pos(b[2], b[3])[0], y - pos(b[2], b[3])[1])
          ? 0
          : 2;
      canvas.setPointerCapture(e.pointerId);
    };
    canvas.onpointermove = (e) => {
      if (curveDrag === null) return;
      const r = canvas.getBoundingClientRect();
      b[curveDrag] = Math.max(0, Math.min(1, (((e.clientX - r.left) * 210) / r.width - 20) / 170));
      b[curveDrag + 1] = Math.max(-5, Math.min(5, (105 - ((e.clientY - r.top) * 130) / r.height) / 80));
      paint(true);
    };
    canvas.onpointerup = () => {
      if (curveDrag === null) return;
      curveDrag = null;
      run({ easing: 'bezier', bezier: b });
    };
    canvas.onpointercancel = () => {
      curveDrag = null;
      paint();
    };
  }
  panel.onclick = (e) => {
    const el = e.target.closest('button');
    if (!el) return;
    if (el.id === 'ut-record') {
      gestureRecorder.armed = !gestureRecorder.armed;
      signature = '';
      refresh();
    }
    if (el.id === 'ut-cleanup') {
      try {
        dispatch({
          ...context(),
          op: 'recording.simplify',
          rows: [...new Set(selected.map((s) => s.row))],
          tolerance: +panel.querySelector('#ut-tolerance').value,
        });
        signature = '';
        refresh();
      } catch (error) {
        toast(error.message, true);
      }
    }
    if (el.id === 'ut-close') hide();
    if (['ut-prev', 'ut-next'].includes(el.id)) {
      const c = context(),
        doc = c.dimension === 3 ? project().scene3d : project(),
        clip = doc.clips.find((x) => x.id === c.clip);
      host.seek(Math.max(0, c.time + (el.id === 'ut-next' ? 1 : -1) / (clip?.fps ?? 30)));
    }
    if (el.id === 'ut-loop-range') {
      const c = context(),
        duration = +panel.querySelector('#ut-scrub').max;
      try {
        const before = studioTransport.get(transportKey(c), duration);
        studioTransport.set(transportKey(c), duration, {
          loop: !before.loop,
          from: +panel.querySelector('#ut-from').value,
          to: +panel.querySelector('#ut-to').value,
        });
        signature = '';
        refresh();
      } catch (error) {
        toast(error.message, true);
      }
    }
    if (el.id === 'ut-ghosts' || el.id === 'ut-arc') host.review?.(el.id === 'ut-ghosts' ? 'ghosts' : 'arc');
    if (el.id === 'ut-beat') {
      const c = context(),
        kind = panel.querySelector('#ut-beat-kind').value;
      dispatch({
        ...c,
        op: 'timing.marker',
        id: 'beat-' + crypto.randomUUID().slice(0, 8),
        kind,
        name: kind.charAt(0).toUpperCase() + kind.slice(1),
        time: c.time,
      });
      signature = '';
      refresh();
    }
    if (el.id === 'ut-play') host.play();
    if (el.dataset.group) {
      collapsed.has(el.dataset.group) ? collapsed.delete(el.dataset.group) : collapsed.add(el.dataset.group);
      signature = '';
      refresh();
    }
    if (el.dataset.track) {
      focused = el.dataset.track;
      host.select?.(rows.find((r) => r.id === focused));
    }
    if (el.id === 'ut-range') {
      selected = timelineSelection(rows, +panel.querySelector('#ut-from').value, +panel.querySelector('#ut-to').value);
      signature = '';
      refresh();
    }
    if (el.id === 'ut-retime')
      run({
        delta: +panel.querySelector('#ut-delta').value,
        scale: +panel.querySelector('#ut-scale').value,
        pivot: Math.min(...selected.map((s) => s.time)),
      });
    if (el.id === 'ut-delete') run({ remove: true });
  };
  panel.onpointerdown = (e) => {
    const el = e.target.closest('[data-key]'),
      lane = e.target.closest('.ut-lane');
    if (!lane) return;
    const rect = lane.getBoundingClientRect(),
      row = rows.find((r) => r.id === lane.dataset.lane);
    if (!el) {
      host.seek(Math.max(0, Math.min(row.domain, ((e.clientX - rect.left) / rect.width) * row.domain)));
      return;
    }
    if (row.procedural) {
      toast('This channel is driven by its action; edit the action parameters.');
      return;
    }
    const key = row.keys[+el.dataset.key];
    focused = row.id;
    host.select?.(row);
    const ref = keyRef(row, key);
    if (!isSelected(row, key)) selected = e.shiftKey ? [...selected, ref] : [ref];
    else if (e.shiftKey) selected = selected.filter((s) => JSON.stringify(s) !== JSON.stringify(ref));
    drag = { x: e.clientX, scale: row.domain / rect.width, delta: 0 };
    panel.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  panel.onpointermove = (e) => {
    if (!drag) return;
    drag.delta = (e.clientX - drag.x) * drag.scale;
    panel.querySelector('#ut-clock').textContent = 'Move ' + drag.delta.toFixed(2) + ' s';
  };
  panel.onpointerup = () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (Math.abs(d.delta) > 0.008) run({ delta: d.delta });
    else {
      signature = '';
      refresh();
    }
  };
  panel.onpointercancel = () => {
    drag = null;
    signature = '';
    refresh();
  };
  function show() {
    panel.hidden = false;
    document.body.classList.add('shared-timeline-open');
    signature = '';
    refresh();
  }
  function hide() {
    panel.hidden = true;
    document.body.classList.remove('shared-timeline-open');
  }
  button.onclick = () => (panel.hidden ? show() : hide());
  setInterval(() => {
    if (!drag && curveDrag === null) refresh();
  }, 120);
  return {
    show,
    hide,
    focus({ node, channel, id } = {}) {
      filter = '';
      show();
      const row = rows.find((r) =>
        id
          ? r.id === 'event:' + id || r.id.includes(':' + id)
          : r.node === node && (r.channel === channel || (channel === 'Transform' && r.channel === 'transform')),
      );
      if (row) {
        focused = row.id;
        collapsed.delete(row.group);
        selected = row.keys.length ? [keyRef(row, row.keys[0])] : [];
        signature = '';
        refresh();
        panel.querySelector('[data-track=\"' + CSS.escape(row.id) + '\"]')?.scrollIntoView({ block: 'nearest' });
      }
    },
    snapshot: () => ({
      selected: structuredClone(selected),
      rows: rows.map(({ keys, ...r }) => ({ ...r, keyCount: keys.length })),
      visible: !panel.hidden,
      playback: studioTransport.get(transportKey(context()), +panel.querySelector('#ut-scrub')?.max || 1),
    }),
  };
}
