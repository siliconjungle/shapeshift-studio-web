const esc = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));

export function mountBehaviour({ project, dispatch, scene, toast }) {
  const button = document.createElement('button');
  button.textContent = 'Behaviours';
  document.querySelector('.top-actions').append(button);
  const panel = document.createElement('dialog');
  panel.setAttribute('aria-label', 'Entity behaviour');
  document.body.append(panel);
  let selected;
  const apply = work => { try { work(); render(); } catch (error) { toast(error.message, true); } };
  function render() {
    const current = project().scene3d, libraries = current?.controllerLibraries ?? {};
    if (!Object.hasOwn(libraries, selected)) selected = Object.keys(libraries)[0];
    const definition = libraries[selected], node = current?.nodes.find(node => node.id === scene.selection().selected);
    panel.innerHTML = `<h2>Behaviours</h2><p>States coordinate component operations and presentation. Attachment names and component fields belong to your project.</p>
      <label>Definition<select id="behaviour-choice">${Object.keys(libraries).map(id => `<option ${id === selected ? 'selected' : ''}>${esc(id)}</option>`).join('')}</select></label>
      <button id="behaviour-new">New behaviour</button>
      ${definition ? `<label>State machine<textarea id="behaviour-definition" rows="14" spellcheck="false">${esc(JSON.stringify(definition, null, 2))}</textarea></label><button id="behaviour-save">Save definition</button>` : ''}
      ${node && definition ? `<h3>${esc(node.name)}</h3><label>Entity template<select id="behaviour-entity"><option value="">Presentation only</option>${(project().entityDefinitions?.entities ?? []).map(entity => `<option value="${esc(entity.id)}" ${node.controller?.entity === entity.id ? 'selected' : ''}>${esc(entity.name)}</option>`).join('')}</select></label>
      <label>Attachments and presentation<textarea id="behaviour-presentation" rows="10" spellcheck="false">${esc(JSON.stringify(node.controller?.presentation ?? { attachments: {}, beams: [], bindings: [] }, null, 2))}</textarea></label>
      <button id="behaviour-attach">Apply to selected object</button>${node.controller ? '<button id="behaviour-detach">Remove from object</button>' : ''}` : '<p>Select a Scene object to bind a behaviour and its presentation.</p>'}
      <details><summary>Operation reference</summary><p>States support enter, update, exit, and event handlers in on. Instructions include set, if, call, enter, emit, schedule, and command. Component commands include component.set, component.add, component.remove, component.modify, entity.create, entity.destroy, and query.</p><p>Beam origins refer to named attachments. A value such as {"path":"enabled"} reads controller state. Every state-owned timer and modifier ends when its state exits.</p></details><button id="behaviour-close">Close</button>`;
    const get = id => panel.querySelector('#' + id);
    get('behaviour-close').onclick = () => panel.close();
    get('behaviour-choice').onchange = event => { selected = event.target.value; render(); };
    get('behaviour-new').onclick = () => apply(() => {
      let id = 'behaviour', i = 2; while (Object.hasOwn(libraries, id)) id = 'behaviour-' + i++;
      const commands = current ? [] : [{ op: 'scene3d.new' }];
      commands.push({ op: 'scene3d.settings', values: { controllerLibraries: { ...libraries, [id]: {
        initialState: 'idle', initial: { enabled: false }, states: {
          idle: { enter: [['set', 'enabled', false]], on: { activate: [['enter', 'active']] } },
          active: { enter: [['set', 'enabled', true]], exit: [['set', 'enabled', false]], on: { deactivate: [['enter', 'idle']] } }
        }
      } } } });
      dispatch(commands); selected = id;
    });
    if (definition) get('behaviour-save').onclick = () => apply(() => dispatch({ op: 'scene3d.replace', value: {
      ...structuredClone(current), controllerLibraries: { ...libraries, [selected]: JSON.parse(get('behaviour-definition').value) }
    } }));
    if (node && definition) get('behaviour-attach').onclick = () => apply(() => {
      const entity = get('behaviour-entity').value;
      const next = structuredClone(current), target = next.nodes.find(item => item.id === node.id);
      target.controller = { library: selected, ...(entity ? { entity } : {}), presentation: JSON.parse(get('behaviour-presentation').value) };
      dispatch({ op: 'scene3d.replace', value: next });
    });
    if (get('behaviour-detach')) get('behaviour-detach').onclick = () => apply(() => {
      const next = structuredClone(current); delete next.nodes.find(item => item.id === node.id).controller;
      for (const clip of next.clips) {
        if (clip.controllerActions) clip.controllerActions = clip.controllerActions.filter(action => action.node !== node.id);
        if (clip.controllerParameters) delete clip.controllerParameters[node.id];
      }
      dispatch({ op: 'scene3d.replace', value: next });
    });
  }
  button.onclick = () => { render(); panel.showModal(); };
  return { show() { render(); if (!panel.open) panel.showModal(); } };
}
