import { trackTask } from '../api/activity.js';
import { requestText } from '../api/artifacts.js';
import { referenceFrames } from './references.js';
import { zipSync } from './media-vendor.js';
import { editImage } from './image-editor.js';
import { capabilities, PRESETS } from './commands.js';
import { CUE_TYPES, presentationAt } from './presentation.js';
import { NODE_TYPES, PARTICLE_SHAPES, defaultFluid, defaultVisual } from './schema.js';
import { easeNames, curve, paletteParse } from './math.js';
import { renderExport, decodeGIF, pngBytes } from './export.js';
const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  label = (s) => s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
const options = {
  profile: ['default', 'contact', 'lightning'],
  type: Object.keys(CUE_TYPES),
  easing: easeNames,
  pathEasing: easeNames,
  shape: ['point', 'rectangle', 'ellipse', 'diamond', 'line', 'contour'],
  distribution: ['linear', 'gaussian', 'inverse-gaussian'],
  particleShape: PARTICLE_SHAPES,
  blend: ['source-over', 'lighter', 'screen', 'multiply', 'overlay', 'difference'],
  mode: ['source-over', 'lighter', 'screen', 'multiply', 'overlay', 'difference', 'destination-in'],
  axis: ['x', 'y'],
  camera: ['orthographic', 'perspective'],
  pattern: ['bayer', 'noise'],
};
export function mountFX(host, api) {
  let tab = 'moment',
    selected = null,
    busy = false,
    active = false,
    scope = null,
    selectionPath = null;
  host.classList.add('fx-panel');
  const project = () => api.project(),
    clip = () => api.clip(),
    fx = () =>
      clip()?.fx ??
      project().fx ?? {
        emitters: [],
        fluids: [],
        nodes: [],
        models: [],
        settings: { width: 512, height: 512, background: 'transparent', pixelSize: 1 },
      };
  function dispatch(cmd) {
    return api.dispatch({ ...cmd, clip: clip().id, joint: api.selected() });
  }
  function collection() {
    return tab === 'moment'
      ? (clip().cues ?? [])
      : tab === 'particles'
        ? fx().emitters
        : tab === 'fluids'
          ? fx().fluids
          : tab === 'nodes'
            ? fx().nodes
            : tab === 'models'
              ? fx().models
              : [];
  }
  function kind() {
    return { moment: 'cue', particles: 'emitter', fluids: 'fluid', nodes: 'node', models: 'model' }[tab];
  }
  function update(values) {
    if (tab === 'sprite') return dispatch({ op: 'visual', values });
    if (tab === 'render') return dispatch({ op: 'settings', values });
    return dispatch({ op: kind() + '.update', id: selected, values });
  }
  function patch(path, value) {
    const parts = path.split('.'),
      result = {};
    let p = result;
    for (const k of parts.slice(0, -1)) p = p[k] = {};
    p[parts.at(-1)] = value;
    return result;
  }
  function fields(object, prefix = '', depth = 0) {
    return Object.entries(object ?? {})
      .filter(
        ([k]) =>
          !['id', 'inputs', 'type', 'frames', 'contourPoints'].includes(k) &&
          !(
            tab === 'moment' &&
            ((['color', 'profile'].includes(k) && !['flash', 'sprite-flash', 'impact', 'fade'].includes(scope?.type)) ||
              (['frequency', 'rotation', 'damping', 'seed'].includes(k) && scope?.type !== 'shake') ||
              (['x', 'y'].includes(k) && !['shake', 'pan'].includes(scope?.type)) ||
              (k === 'amount' && scope?.type === 'freeze'))
          ),
      )
      .map(([key, value]) => {
        const path = prefix ? prefix + '.' + key : key,
          title = label(key);
        if (key === 'src' || key === 'mtl') return '';
        if (key === 'path')
          return `<div class="fx-field wide"><label>Emitter path</label><canvas id="fx-path" width="290" height="150" aria-label="Draw an emitter path"></canvas><small>Drag to draw · coordinates relative to the emitter</small><button data-clear-path>Clear path</button></div>`;
        if (Array.isArray(value) && value[0]?.time !== undefined)
          return `<div class="fx-field"><label>${title}</label><button data-curve="${path}">↗ Edit curve · ${value.length} keys</button></div>`;
        if (value && typeof value === 'object' && !Array.isArray(value))
          return `<details class="fx-group" ${depth === 0 && ['smear', 'wave', 'break', 'params'].includes(key) ? 'open' : ''}><summary>${title}</summary><div class="fx-fields">${fields(value, path, depth + 1)}</div></details>`;
        const palette = key === 'colors' || key === 'excluded',
          select =
            key === 'joint'
              ? project().joints.map((j) => j.id)
              : key === 'mode' && prefix === 'motion'
                ? ['burst', 'timed']
                : (options[key] ??
                  (['asset', 'contour', 'sourceImage', 'obstacleImage', 'patternAsset'].includes(key)
                    ? ['', ...project().assets.map((a) => a.id)]
                    : ['stepEmit', 'deathEmit'].includes(key)
                      ? [
                          '',
                          ...fx()
                            .emitters.map((e) => e.id)
                            .filter((id) => id !== selected),
                        ]
                      : null));
        if (typeof value === 'boolean')
          return `<label class="fx-check"><input data-param="${path}" type="checkbox" ${value ? 'checked' : ''}>${title}</label>`;
        if (select)
          return `<label class="fx-field">${title}<select data-param="${path}">${select.map((v) => `<option ${value === v ? 'selected' : ''} value="${esc(v)}">${esc(v || 'None')}</option>`).join('')}</select></label>`;
        if (typeof value === 'number')
          return `<label class="fx-field">${title}<div class="fx-number"><input data-param="${path}" type="number" step="${['seed', 'samples', 'burst', 'resolution', 'width', 'height', 'layer', 'pieceSize', 'fps', 'pixelSize'].includes(key) ? 1 : 0.01}" value="${value}">${(tab === 'nodes' && prefix === 'params') || (tab === 'sprite' && ['opacity', 'skewX', 'skewY'].includes(key)) ? `<button data-curve="${path}" title="Animate ${title}">◇</button>` : ''}</div></label>`;
        if (palette)
          return `<label class="fx-field wide">${title}<input data-param="${path}" data-array value="${esc(value.join(', '))}"><span class="fx-swatches">${value.map((c) => `<i style="background:${esc(c)}"></i>`).join('')}</span>${key === 'colors' ? '<button data-palette>Import .pal / colours</button>' : ''}</label>`;
        if (Array.isArray(value))
          return `<label class="fx-field ${value.some((v) => typeof v === 'object') ? 'wide' : ''}">${title}<${value.some((v) => typeof v === 'object') ? 'textarea' : 'input'} data-param="${path}" data-json ${value.some((v) => typeof v === 'object') ? '' : `value="${esc(JSON.stringify(value))}"`}>${value.some((v) => typeof v === 'object') ? esc(JSON.stringify(value)) : ''}${value.some((v) => typeof v === 'object') ? '</textarea>' : ''}</label>`;
        return `<label class="fx-field">${title}<input data-param="${path}" ${typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? 'type="color"' : ''} value="${esc(value ?? '')}"></label>`;
      })
      .join('');
  }
  function toolbar() {
    return `<div class="fx-header"><div><strong>Effects studio</strong><small>Build the whole moment</small></div><button id="fx-close" aria-label="Close effects studio">×</button></div><nav class="fx-tabs">${[
      ['moment', 'Moment'],
      ['sprite', 'Sprite'],
      ['particles', 'Particles'],
      ['fluids', 'Fluids'],
      ['nodes', 'Nodes'],
      ['models', 'References'],
      ['render', 'Export'],
    ]
      .map(([id, name]) => `<button data-fx-tab="${id}" class="${id === tab ? 'active' : ''}">${name}</button>`)
      .join(
        '',
      )}</nav><div class="fx-preview"><button id="fx-play">▶ Preview</button><button id="fx-reset">↤</button><span id="fx-clock"></span></div>`;
  }
  function render() {
    if (!active || busy) return;
    const list = collection();
    if (!list.some((x) => x.id === selected)) selected = list[0]?.id ?? null;
    scope =
      tab === 'sprite'
        ? (project().joints.find((j) => j.id === api.selected())?.visual ?? defaultVisual())
        : tab === 'render'
          ? fx().settings
          : list.find((x) => x.id === selected);
    if (tab === 'fluids' && scope) scope = { ...defaultFluid(scope.id), ...scope };
    let content = '';
    if (tab === 'moment')
      content = `<p class="fx-intro">Sequence the impact. Motion can freeze while flashes and the camera keep moving.</p><div class="fx-add"><select id="fx-type">${Object.entries(
        CUE_TYPES,
      )
        .map(([id, d]) => `<option value="${id}">${d.label}</option>`)
        .join(
          '',
        )}</select><button id="fx-add">＋ Add cue</button></div><div id="fx-cue-timeline" class="fx-cue-timeline">${list.map((c, i) => `<div class="fx-cue-lane"><button data-cue="${esc(c.id)}" style="left:${(c.time / clip().duration) * 100}%;width:${Math.max(3, (Math.min(c.duration, clip().duration - c.time) / clip().duration) * 100)}%" title="${esc(CUE_TYPES[c.type].label)} at ${c.time}s">${esc(CUE_TYPES[c.type].label)}</button></div>`).join('')}<span id="fx-cue-head"></span></div><div class="fx-preset-row">${['contact-impact', 'heavy-impact', 'lightning', 'discovery', 'slow-reveal'].map((n) => `<button data-preset="${n}">${label(n.replaceAll('-', ' '))}</button>`).join('')}</div>`;
    if (tab === 'sprite')
      content = `<p class="fx-intro">${esc(project().joints.find((j) => j.id === api.selected())?.name ?? 'Select a piece')} · appearance follows the animation clock.</p><div class="fx-preset-row"><button data-preset="smear-swipe">Smear swipe</button><button data-preset="tree-break">Break apart</button><button id="fx-paint-image">Edit image</button></div>`;
    if (tab === 'particles')
      content = `<p class="fx-intro">Seeded particles, paths, collision, attraction, and child emitters. Scrubbing reproduces the same simulation.</p><button id="fx-add">＋ Particle emitter</button><div class="fx-preset-row">${['embers', 'magic', 'rain', 'explosion', 'hearts'].map((n) => `<button data-preset="${n}">${label(n)}</button>`).join('')}</div>`;
    if (tab === 'fluids')
      content = `<p class="fx-intro">Smoke, liquid ink and connected vector shapes. Surface tension pulls density boundaries together; buoyancy and vorticity drive wisps. Obstacles use normalized rectangles.</p><button id="fx-add">＋ Fluid simulation</button><div class="fx-preset-row"><button data-preset="smoke">Smoke</button><button data-preset="fire">Fire</button></div>`;
    if (tab === 'models')
      content = `<p class="fx-intro">Use a 3D model to capture consistent reference views for puppet artwork. This utility does not create puppet joints. Orbit, lighting and camera remain editable.</p><button id="fx-model-import">＋ Import OBJ / GLB</button><button id="fx-model-mtl">Import material (.mtl)</button><button id="fx-reference-capture">Capture 4 reference views</button>`;
    if (tab === 'nodes')
      content = `<p class="fx-intro">Drag nodes to arrange the graph. Connect inputs below; branches can blend or mask each other.</p><div class="fx-add"><select id="fx-type">${Object.entries(
        NODE_TYPES,
      )
        .filter(([id]) => id !== 'scene')
        .map(([id, n]) => `<option value="${id}">${n.group} · ${n.label}</option>`)
        .join(
          '',
        )}</select><button id="fx-add">＋ Node</button></div><div id="fx-graph" class="fx-graph"><svg width="600" height="${Math.max(200, ...list.map((n) => (n.y ?? 0) + 80))}" style="width:600px">${list
        .flatMap((n) =>
          n.inputs.filter(Boolean).map((input) => {
            const source = list.find((x) => x.id === input);
            if (!source) return '';
            return `<path d="M ${source.x + 120} ${source.y + 15} C ${source.x + 170} ${source.y + 15},${n.x - 50} ${n.y + 15},${n.x} ${n.y + 15}"/>`;
          }),
        )
        .join(
          '',
        )}${list.map((n) => `<g data-node="${esc(n.id)}" transform="translate(${n.x ?? 0},${n.y ?? 0})"><rect width="120" height="30" rx="6" class="${selected === n.id ? 'selected' : ''}"/><circle cx="0" cy="15" r="4" fill="#e8b785"/><circle cx="120" cy="15" r="4" fill="#cce7ac"/><text x="60" y="20" text-anchor="middle">${esc(NODE_TYPES[n.type].label)}${fx().output === n.id ? ' ↗' : ''}</text></g>`).join('')}</svg></div>`;
    if (tab === 'render')
      content = `<p class="fx-intro">Save project / Animated HTML keeps live puppets and effects. The utilities here bake images for references, animation checks, and reusable effects. Sprite sheets include frame positions and trimmed origins in JSON.</p><div class="fx-fields">${fields(scope)}</div><hr><div class="fx-fields"><label class="fx-field">Format<select id="fx-format"><option value="png">Current frame / reference PNG</option><option value="gif">Preview GIF</option><option value="sheet">Sprite sheet + JSON (.zip)</option><option value="frames">PNG sequence + JSON (.zip)</option></select></label><label class="fx-field">FPS<input id="fx-fps" type="number" min="1" max="120" value="${clip().fps}"></label><label class="fx-field">Skip frames<input id="fx-skip" type="number" min="0" max="60" value="0"></label><label class="fx-check"><input id="fx-trim" type="checkbox">Trim transparency</label><label class="fx-check"><input id="fx-reverse" type="checkbox">Reverse</label></div><button id="fx-render" class="primary">Bake reference / animation ↗</button><progress id="fx-progress" max="1" value="0"></progress><p class="fx-intro">The live API supports these same exports. GIF has a 256-colour palette; use PNG for full alpha.</p><div class="fx-api-note"><strong>Direct access</strong><code>puppetStudio.dispatch({op:'preset', name:'heavy-impact', time:0.5})</code><button id="fx-copy-api">Copy API example</button><button id="fx-import-animated">Import GIF / sprite sheet</button><button id="fx-shape">＋ Shape</button><button id="fx-text">＋ Text</button></div>`;
    if (!['sprite', 'render'].includes(tab) && list.length)
      content += `<div class="fx-item-list">${list.map((item) => `<button data-item="${esc(item.id)}" class="${selected === item.id ? 'active' : ''}">${esc(item.name ?? CUE_TYPES[item.type]?.label ?? NODE_TYPES[item.type]?.label ?? item.id)}</button>`).join('')}</div>`;
    if (tab !== 'render' && scope) {
      if (tab === 'nodes')
        content += `<div class="fx-fields">${[0, 1]
          .map(
            (port) =>
              `<label class="fx-field">Input ${port + 1}<select data-port="${port}"><option value="">Scene / none</option>${list
                .filter((n) => n.id !== selected)
                .map((n) => `<option value="${esc(n.id)}" ${scope.inputs[port] === n.id ? 'selected' : ''}>${esc(n.id)}</option>`)
                .join('')}</select></label>`,
          )
          .join('')}</div><button id="fx-output">Use as output</button>`;
      content += `<div class="fx-fields">${fields(scope)}</div>${tab !== 'sprite' && scope.type !== 'scene' ? '<button id="fx-remove" class="danger">Remove selected</button>' : ''}`;
    }
    host.innerHTML =
      toolbar() + `<div class="fx-body">${content}<div id="fx-curve-editor"></div><p id="fx-error" role="status"></p></div>`;
    bind();
    clock();
  }
  function run(fn) {
    try {
      const result = trackTask(fn());
      if (result?.catch) result.catch(error);
      return result;
    } catch (e) {
      error(e);
    }
  }
  function error(e) {
    api.toast(e.message, true);
    const el = host.querySelector('#fx-error');
    if (el) el.textContent = e.message;
  }
  function bind() {
    host.querySelector('#fx-close').onclick = () => show(false);
    host.querySelector('#fx-play').onclick = () => api.play();
    host.querySelector('#fx-reset').onclick = () => api.seek(0);
    host.querySelectorAll('[data-fx-tab]').forEach(
      (b) =>
        (b.onclick = () => {
          tab = b.dataset.fxTab;
          selected = null;
          render();
        }),
    );
    host.querySelectorAll('[data-item],[data-node],[data-cue]').forEach(
      (b) =>
        (b.onclick = () => {
          selected = b.dataset.item ?? b.dataset.node ?? b.dataset.cue;
          render();
        }),
    );
    host.querySelectorAll('[data-param]').forEach(
      (input) =>
        (input.onchange = () =>
          run(() => {
            busy = true;
            try {
              const value =
                input.type === 'checkbox'
                  ? input.checked
                  : input.type === 'number'
                    ? Number(input.value)
                    : input.hasAttribute('data-array')
                      ? input.value
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean)
                      : input.hasAttribute('data-json')
                        ? JSON.parse(input.value)
                        : input.value;
              update(patch(input.dataset.param, value));
            } finally {
              busy = false;
            }
            render();
          })),
    );
    host.querySelectorAll('[data-preset]').forEach(
      (b) =>
        (b.onclick = () =>
          run(() => {
            selected = dispatch({ op: 'preset', name: b.dataset.preset, time: api.time() });
            render();
          })),
    );
    const add = host.querySelector('#fx-add');
    if (add)
      add.onclick = () =>
        run(() => {
          selected = dispatch({ op: kind() + '.add', type: host.querySelector('#fx-type')?.value, time: api.time() });
          render();
        });
    const remove = host.querySelector('#fx-remove');
    if (remove)
      remove.onclick = () =>
        run(() => {
          dispatch({ op: kind() + '.remove', id: selected });
          selected = null;
          render();
        });
    host.querySelectorAll('[data-port]').forEach(
      (el) =>
        (el.onchange = () =>
          run(() => {
            dispatch({ op: 'node.connect', id: selected, port: Number(el.dataset.port), input: el.value });
            render();
          })),
    );
    const output = host.querySelector('#fx-output');
    if (output)
      output.onclick = () =>
        run(() => {
          dispatch({ op: 'node.output', id: selected });
          render();
        });
    host.querySelectorAll('[data-curve]').forEach((b) => (b.onclick = () => run(() => showCurve(b.dataset.curve))));
    host.querySelectorAll('[data-palette]').forEach(
      (b) =>
        (b.onclick = () =>
          file('.pal,.txt', async (f) => {
            const colors = paletteParse(await f.text());
            if (!colors.length) throw Error('No colours found');
            update(patch(tab === 'nodes' ? 'params.colors' : 'colors', colors));
            render();
          })),
    );
    const path = host.querySelector('#fx-path');
    if (path) {
      paintPath(path, scope.path ?? []);
      let pts = null;
      path.onpointerdown = (e) => {
        path.setPointerCapture(e.pointerId);
        pts = [];
        point(e);
      };
      path.onpointermove = (e) => {
        if (pts) point(e);
      };
      path.onpointerup = () => {
        update({ path: pts });
        pts = null;
        render();
      };
      function point(e) {
        const r = path.getBoundingClientRect();
        pts.push({
          x: Math.round(((e.clientX - r.left) / r.width) * 300 - 150),
          y: Math.round(((e.clientY - r.top) / r.height) * 150 - 75),
        });
        if (pts.length > 500) pts = pts.filter((_, i) => i % 2 === 0);
        paintPath(path, pts);
      }
      host.querySelector('[data-clear-path]').onclick = () => {
        update({ path: [] });
        render();
      };
    }
    const graph = host.querySelector('#fx-graph svg');
    if (graph) {
      let drag;
      graph.onpointerdown = (e) => {
        const g = e.target.closest('[data-node]');
        if (!g) return;
        const node = fx().nodes.find((n) => n.id === g.dataset.node);
        drag = { id: node.id, x: node.x, y: node.y, startX: e.clientX, startY: e.clientY, g };
        graph.setPointerCapture(e.pointerId);
      };
      graph.onpointermove = (e) => {
        if (drag)
          drag.g.setAttribute(
            'transform',
            `translate(${Math.max(0, drag.x + e.clientX - drag.startX)},${Math.max(0, drag.y + e.clientY - drag.startY)})`,
          );
      };
      graph.onpointerup = (e) => {
        if (!drag) return;
        selected = drag.id;
        run(() =>
          dispatch({
            op: 'node.update',
            id: drag.id,
            values: { x: Math.max(0, drag.x + e.clientX - drag.startX), y: Math.max(0, drag.y + e.clientY - drag.startY) },
          }),
        );
        drag = null;
        render();
      };
    }
    const timeline = host.querySelector('#fx-cue-timeline');
    if (timeline) {
      let drag;
      timeline.onpointerdown = (e) => {
        const b = e.target.closest('[data-cue]');
        if (!b) return;
        const c = clip().cues.find((c) => c.id === b.dataset.cue);
        drag = { id: c.id, start: e.clientX, time: c.time, width: timeline.getBoundingClientRect().width };
        timeline.setPointerCapture(e.pointerId);
        e.preventDefault();
      };
      timeline.onpointermove = (e) => {
        if (!drag) return;
        const t = Math.max(0, Math.min(clip().duration, drag.time + ((e.clientX - drag.start) / drag.width) * clip().duration));
        const el = timeline.querySelector(`[data-cue="${CSS.escape(drag.id)}"]`);
        el.style.left = (t / clip().duration) * 100 + '%';
      };
      timeline.onpointerup = (e) => {
        if (!drag) return;
        const time =
          Math.round(
            Math.max(0, Math.min(clip().duration, drag.time + ((e.clientX - drag.start) / drag.width) * clip().duration)) * 1000,
          ) / 1000;
        run(() => dispatch({ op: 'cue.update', id: drag.id, values: { time } }));
        drag = null;
        render();
      };
    }
    const renderButton = host.querySelector('#fx-render');
    if (renderButton)
      renderButton.onclick = () =>
        run(async () => {
          renderButton.disabled = true;
          try {
            const format = host.querySelector('#fx-format').value,
              result = await renderExport(
                project(),
                await api.images(),
                clip(),
                {
                  format,
                  fps: Number(host.querySelector('#fx-fps').value),
                  skip: Number(host.querySelector('#fx-skip').value),
                  reverse: host.querySelector('#fx-reverse').checked,
                  trim: host.querySelector('#fx-trim').checked,
                  ...(format === 'png' ? { time: api.time() } : {}),
                },
                (v) => (host.querySelector('#fx-progress').value = v),
              );
            api.download(
              new Blob([result.bytes], { type: result.type }),
              project().name.replace(/\W+/g, '-') + '.' + result.extension,
            );
            api.toast('Animation rendered.');
          } finally {
            renderButton.disabled = false;
          }
        });
    const copy = host.querySelector('#fx-copy-api');
    if (copy)
      copy.onclick = () =>
        run(() => navigator.clipboard.writeText("await puppetStudio.dispatch({op:'preset', name:'heavy-impact', time:0.5})"));
    const paint = host.querySelector('#fx-paint-image');
    if (paint)
      paint.onclick = () =>
        run(async () => {
          const j = project().joints.find((j) => j.id === api.selected());
          if (!j?.sprite) throw Error('Select an image piece first.');
          const images = await api.images();
          await editImage(images.get(j.sprite.asset), (src, w, h) => api.replaceImage(j.sprite.asset, src, w, h));
        });
    const model = host.querySelector('#fx-model-import');
    if (model)
      model.onclick = () =>
        file('.obj,.glb', async (f) => {
          const src = await dataURL(f);
          selected = dispatch({
            op: 'model.add',
            values: { name: f.name, src, format: f.name.endsWith('.glb') ? 'glb' : 'obj' },
          });
          await api.images();
          render();
        });
    const capture = host.querySelector('#fx-reference-capture');
    if (capture)
      capture.onclick = () =>
        run(async () => {
          const model = fx().models.find((m) => m.id === selected);
          if (!model) throw Error('Import a model first.');
          const images = await api.images(),
            draw = images.models?.get(model.id);
          if (!draw) throw Error('Model has not loaded.');
          const files = await referenceFrames(model, draw);
          api.download(new Blob([zipSync(files)], { type: 'application/zip' }), model.id + '-references.zip');
          api.toast('Front, side, back, and contact sheet captured.');
        });
    const mtl = host.querySelector('#fx-model-mtl');
    if (mtl)
      mtl.onclick = () =>
        file('.mtl', async (f) => {
          if (!selected) throw Error('Import a model first.');
          dispatch({ op: 'model.update', id: selected, values: { mtl: await f.text() } });
          await api.images();
        });
    const image = host.querySelector('#fx-import-animated');
    if (image)
      image.onclick = () =>
        file('image/gif,image/png', async (f) => {
          if (f.type === 'image/gif') {
            const frames = await decodeGIF(await f.arrayBuffer()),
              urls = [];
            for (const frame of frames) urls.push(await dataURL(new Blob([await pngBytes(frame.canvas)], { type: 'image/png' })));
            await api.importFrames(
              urls,
              frames[0].canvas.width,
              frames[0].canvas.height,
              1000 / frames[0].delay,
              f.name,
              frames.map((f) => f.delay),
            );
          } else {
            const src = await dataURL(f),
              img = new Image();
            img.src = src;
            await img.decode();
            const columns = Number(requestText('Sprite sheet columns', '4')),
              rows = Number(requestText('Rows', '1'));
            if (!Number.isInteger(columns) || !Number.isInteger(rows) || columns < 1 || rows < 1 || columns * rows > 256)
              throw Error('Use 1–256 frames.');
            const c = document.createElement('canvas');
            c.width = Math.floor(img.width / columns);
            c.height = Math.floor(img.height / rows);
            const ctx = c.getContext('2d'),
              urls = [];
            for (let y = 0; y < rows; y++)
              for (let x = 0; x < columns; x++) {
                ctx.clearRect(0, 0, c.width, c.height);
                ctx.drawImage(img, x * c.width, y * c.height, c.width, c.height, 0, 0, c.width, c.height);
                urls.push(c.toDataURL());
              }
            await api.importFrames(urls, c.width, c.height, 12, f.name);
          }
          api.toast('Animated image imported.');
        });
    const shape = host.querySelector('#fx-shape');
    if (shape)
      shape.onclick = () => {
        dispatch({ op: 'shape', shape: 'star' });
      };
    const text = host.querySelector('#fx-text');
    if (text)
      text.onclick = () => {
        const value = requestText('Text to render', 'LEVEL UP');
        if (value) dispatch({ op: 'text', text: value });
      };
  }
  function showCurve(path) {
    const domain = path.startsWith('overLife.') ? 1 : clip().duration;
    selectionPath = path;
    let value = scope;
    for (const key of path.split('.')) value = value[key];
    let points = Array.isArray(value)
      ? structuredClone(value)
      : [
          { time: 0, value, easing: 'smooth' },
          { time: domain, value, easing: 'smooth' },
        ];
    const container = host.querySelector('#fx-curve-editor');
    container.innerHTML = `<h3>${esc(path)} curve</h3><p class="fx-intro">Drag keys. Double-click to add. Select a key to set its easing or remove it.</p><canvas id="fx-curve" width="290" height="160"></canvas><div class="fx-fields"><label class="fx-field">Interpolation<select id="fx-curve-easing">${easeNames.map((n) => `<option>${n}</option>`).join('')}</select></label><label class="fx-field">Bezier x1,y1,x2,y2<input id="fx-bezier" value="0.25,0.1,0.25,1"></label></div><button id="fx-curve-delete">Delete key</button>`;
    const canvas = container.querySelector('canvas'),
      ctx = canvas.getContext('2d');
    let index = 0,
      drag = false,
      lo = Math.min(0, ...points.map((p) => p.value)),
      hi = Math.max(1, ...points.map((p) => p.value));
    if (hi === lo) hi = lo + 1;
    const pad = (hi - lo) * 0.25;
    lo -= pad;
    hi += pad;
    const pos = (p) => ({ x: 10 + (p.time / domain) * 270, y: 150 - ((p.value - lo) / (hi - lo)) * 140 });
    function paint() {
      ctx.clearRect(0, 0, 290, 160);
      ctx.fillStyle = '#0d1518';
      ctx.fillRect(0, 0, 290, 160);
      ctx.strokeStyle = '#273b40';
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(10, 10 + i * 35);
        ctx.lineTo(280, 10 + i * 35);
        ctx.stroke();
      }
      ctx.strokeStyle = '#d4eeb5';
      ctx.beginPath();
      for (let x = 0; x <= 270; x++) {
        const p = pos({ time: (x / 270) * domain, value: curve(points, (x / 270) * domain) });
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      points.forEach((p, i) => {
        const q = pos(p);
        ctx.beginPath();
        ctx.arc(q.x, q.y, i === index ? 5 : 3, 0, Math.PI * 2);
        ctx.fillStyle = i === index ? '#ffbf87' : '#9ebbd4';
        ctx.fill();
      });
      container.querySelector('#fx-curve-easing').value = points[index]?.easing ?? 'smooth';
    }
    function mouse(e) {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * 290, y: ((e.clientY - r.top) / r.height) * 160 };
    }
    function save() {
      points.sort((a, b) => a.time - b.time);
      busy = true;
      try {
        update(patch(path, points));
      } finally {
        busy = false;
      }
      paint();
    }
    canvas.onpointerdown = (e) => {
      const p = mouse(e);
      index = points.findIndex((v) => Math.hypot(pos(v).x - p.x, pos(v).y - p.y) < 12);
      if (index < 0) index = 0;
      drag = true;
      canvas.setPointerCapture(e.pointerId);
      paint();
    };
    canvas.onpointermove = (e) => {
      if (!drag) return;
      const p = mouse(e);
      points[index].time = Math.max(0, Math.min(domain, ((p.x - 10) / 270) * domain));
      points[index].value = lo + ((150 - p.y) / 140) * (hi - lo);
      paint();
    };
    canvas.onpointerup = () => {
      drag = false;
      run(save);
    };
    canvas.ondblclick = (e) => {
      const p = mouse(e);
      points.push({
        time: Math.max(0, Math.min(domain, ((p.x - 10) / 270) * domain)),
        value: lo + ((150 - p.y) / 140) * (hi - lo),
        easing: 'smooth',
      });
      index = points.length - 1;
      run(save);
    };
    container.querySelector('#fx-curve-easing').onchange = (e) => {
      points[index].easing = e.target.value;
      run(save);
    };
    container.querySelector('#fx-bezier').onchange = (e) =>
      run(() => {
        const v = e.target.value.split(',').map(Number);
        if (v.length !== 4 || v.some((n) => !Number.isFinite(n)) || v[0] < 0 || v[0] > 1 || v[2] < 0 || v[2] > 1)
          throw Error('Bezier needs x1,y1,x2,y2; x values 0–1.');
        points[index].bezier = v;
        points[index].easing = 'bezier';
        save();
      });
    container.querySelector('#fx-curve-delete').onclick = () => {
      if (points.length > 1) {
        points.splice(index, 1);
        index = 0;
        run(save);
      }
    };
    paint();
    container.scrollIntoView({ block: 'nearest' });
  }
  function paintPath(canvas, points) {
    const c = canvas.getContext('2d');
    c.fillStyle = '#0d1518';
    c.fillRect(0, 0, 290, 150);
    c.strokeStyle = '#d4eeb5';
    c.beginPath();
    for (const p of points) c.lineTo(((p.x + 150) / 300) * 290, p.y + 75);
    c.stroke();
    for (const p of [points[0], points.at(-1)].filter(Boolean)) {
      c.beginPath();
      c.arc(((p.x + 150) / 300) * 290, p.y + 75, 4, 0, Math.PI * 2);
      c.fillStyle = '#ffbf87';
      c.fill();
    }
  }
  function file(accept, callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.id = 'fx-file-input';
    input.hidden = true;
    document.getElementById(input.id)?.remove();
    document.body.append(input);
    input.onchange = () => {
      if (input.files[0]) return Promise.resolve(run(() => callback(input.files[0]))).finally(() => input.remove());
    };
    input.click();
  }
  function clock() {
    const el = host.querySelector('#fx-clock');
    if (el) {
      const state = presentationAt(clip(), api.time());
      el.textContent = api.time().toFixed(2) + 's · motion ' + state.animationTime.toFixed(2) + 's';
    }
    const head = host.querySelector('#fx-cue-head');
    if (head) head.style.left = (api.time() / clip().duration) * 100 + '%';
  }
  function show(value = true) {
    active = value;
    host.hidden = !value;
    document.body.classList.toggle('fx-open', value);
    if (value) render();
    api.invalidate();
  }
  return {
    show,
    refresh: render,
    clock,
    selectCue(id) {
      tab = 'moment';
      selected = id;
      show();
    },
  };
}
async function dataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
