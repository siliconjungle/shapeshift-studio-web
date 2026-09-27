import { trackTask } from './activity.js';

const controls = 'button,input,select,textarea,summary,canvas,[role="button"],[tabindex],[contenteditable="true"],a[download],svg,[data-landmark],[data-handle],[draggable=true],[data-shape],.ut-lane,.track';
const visible = element => !!element.getClientRects().length && !element.closest('[hidden],dialog:not([open])') && getComputedStyle(element).visibility !== 'hidden';
const label = element => element.getAttribute('aria-label') || element.labels?.[0]?.textContent.trim() || element.getAttribute('title') || element.textContent?.trim().slice(0, 160) || element.id || element.tagName.toLowerCase();

export function createUIControls() {
  let serial = 0;const prefix=crypto.randomUUID();
  const ids = new WeakMap(), elements = new Map();
  function reference(element) {
    let id = ids.get(element);
    if (!id) { id = prefix + '-control-' + ++serial; ids.set(element, id); elements.set(id, element); }
    return id;
  }
  function target({ ref, id, selector }, { hidden = false } = {}) {
    let element;
    if (ref) element = elements.get(ref);
    else if (id) element = document.getElementById(id);
    else if (selector) {
      const matches = [...document.querySelectorAll(selector)];
      if (matches.length !== 1) throw Error('Selector must resolve to exactly one control');
      element = matches[0];
    }
    if (!element?.isConnected) throw Error('Stale or missing UI control; inspect the UI again');
    const modal=[...document.querySelectorAll('dialog[open]')].at(-1);
    if(!hidden && modal && !modal.contains(element))throw Error('Close the open dialog before using this control');
    if (!hidden && !visible(element)) throw Error('Control is not visible; open its view or panel first');
    if (element.disabled || element.getAttribute('aria-disabled') === 'true') throw Error('Control is disabled');
    return element;
  }
  function describe(element) {
    const rect = element.getBoundingClientRect();
    return { ref: reference(element), id: element.id || undefined, tag: element.tagName.toLowerCase(), type: element.type,
      label: label(element),role:element.getAttribute('role'),data:{...element.dataset}, value: element.value, checked: element.checked, disabled: !!element.disabled,
      expanded: element.getAttribute('aria-expanded'), pressed: element.getAttribute('aria-pressed'),
      options: element.options ? [...element.options].map(option => ({ label: option.label, value: option.value, disabled: option.disabled })) : undefined,
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  }
  // Property handlers can return asynchronous editor work. Native dispatch alone
  // discards those promises, so retain them through the same activity tracker.
  async function fire(element, type, invoke) {
    const restores = [], pending = [], failures = [];
    for (let current = element; current; current = current.parentNode) {
      const key = 'on' + type, handler = current[key];
      if (typeof handler !== 'function') continue;
      const wrapper = function (...args) { try{const value = handler.apply(this, args); if (value?.then) pending.push(trackTask(value)); return value;}catch(error){failures.push(error);} };
      current[key] = wrapper; restores.push([current, key, handler, wrapper]);
    }
    try { invoke(); } finally { for (const [current, key, handler, wrapper] of restores) if(current[key]===wrapper)current[key] = handler; }
    await Promise.all(pending);if(failures.length)throw failures[0];
  }
  return {
    inspect() {
      for (const [id, element] of elements) if (!element.isConnected) elements.delete(id);
      const modal = [...document.querySelectorAll('dialog[open]')].at(-1);
      return { text:(modal??document.body).innerText.slice(0,50000),modal: modal ? { ref: reference(modal), label: label(modal) } : null,
        controls: [...(modal ?? document).querySelectorAll(controls)].filter(visible).map(describe),
        files: [...document.querySelectorAll('input[type=file]')].map(describe),
        panels: [...document.querySelectorAll('dialog[open],aside:not([hidden])')].filter(visible).map(element => ({ ref: reference(element), id: element.id, label: label(element) })) };
    },
    async activate(args) {
      const element = target(args);
      if (element.type === 'file') throw Error('Use ui.files with file data instead of a native file picker');
      if (element.tagName === 'SUMMARY') { element.parentElement.open = !element.parentElement.open; return; }
      await fire(element, 'click', () => element.click?element.click():element.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,...args})));
    },
    async set(args) {
      const element = target(args);
      if (!element.matches('input,select,textarea,[contenteditable=true]') || ['file', 'button', 'submit'].includes(element.type)) throw Error('Control has no editable value');
      if (element.readOnly) throw Error('Control is read-only');
      if (['checkbox', 'radio'].includes(element.type)) {
        if (typeof args.value !== 'boolean') throw Error('Checkbox value must be boolean');
        if (element.checked !== args.value) await fire(element, 'click', () => element.click());
      } else {
        if (element.options && ![...element.options].some(option => option.value === String(args.value) && !option.disabled)) throw Error('Unknown select option');
        if (element.isContentEditable) element.textContent = String(args.value); else element.value = String(args.value);
        await fire(element, 'input', () => element.dispatchEvent(new Event('input', { bubbles: true })));
        if (args.commit !== false) await fire(element, 'change', () => element.dispatchEvent(new Event('change', { bubbles: true })));
      }
    },
    async files(args) {
      const element = target(args, { hidden: true });
      if (element.type !== 'file') throw Error('Choose a file input');
      if (!Array.isArray(args.files) || (!element.multiple && args.files.length > 1)) throw Error('Invalid files');
      const data = new DataTransfer();
      for (const file of args.files) {
        const bytes = file.base64 ? Uint8Array.from(atob(file.base64), character => character.charCodeAt(0)) : file.text ?? '';
        data.items.add(new File([bytes], file.name, { type: file.type ?? 'application/octet-stream' }));
      }
      element.files = data.files;
      await fire(element, 'change', () => element.dispatchEvent(new Event('change', { bubbles: true })));
    },
    focus(args) { target(args).focus(); },
    scroll(args) { target(args).scrollTo({ left: args.x ?? 0, top: args.y ?? 0, behavior: 'instant' }); },
    close(args = {}) {
      const element = args.ref || args.id || args.selector ? target(args) : [...document.querySelectorAll('dialog[open]')].at(-1);
      if (!element?.matches('dialog[open]')) throw Error('Choose an open dialog');
      if (element.dispatchEvent(new Event('cancel', { cancelable: true }))) element.close();
    },
    async key(args) {
      const element = args.ref || args.id || args.selector ? target(args) : document.activeElement ?? document.body;
      if (!args.key) throw Error('A key is required');
      for (const type of ['keydown', 'keyup']) await fire(element, type, () => element.dispatchEvent(new KeyboardEvent(type, { ...args, bubbles: true, cancelable: true })));
    },
    async pointer(args) {
      const element = target(args), rect = element.getBoundingClientRect();
      if (!Array.isArray(args.events) || args.events.length > 4096) throw Error('Expected pointer events');
      const complete=new Set();
      for(const event of args.events){
        if(event.type==='pointerdown')complete.add(event.pointerId??1001);if(['pointerup','pointercancel'].includes(event.type))complete.delete(event.pointerId??1001);
        if(!['pointerdown','pointermove','pointerup','pointercancel','dblclick','wheel'].includes(event.type))throw Error('Unsupported pointer event');
        if(!Number.isFinite(event.x)||!Number.isFinite(event.y))throw Error('Pointer coordinates must be finite');
      }
      if(complete.size)throw Error('Send a complete gesture ending in pointerup or pointercancel');
      const captures=new Map(),restores=[],ids=new Set(args.events.map(e=>e.pointerId??1001));
      // Native capture only accepts hardware pointers. Scope virtual capture to
      // this complete gesture, preserving native behaviour for human pointers.
      for(let node=element;node;node=node.parentElement)for(const method of ['setPointerCapture','releasePointerCapture','hasPointerCapture']){
        const original=node[method];if(!original)continue;const descriptor=Object.getOwnPropertyDescriptor(node,method);
        Object.defineProperty(node,method,{configurable:true,value:function(id){if(!ids.has(id))return original.call(this,id);if(method==='setPointerCapture')captures.set(id,this);if(method==='releasePointerCapture')captures.delete(id);if(method==='hasPointerCapture')return captures.get(id)===this;}});
        restores.push(()=>descriptor?Object.defineProperty(node,method,descriptor):delete node[method]);
      }
      const active=new Set();
      try{for(const event of args.events){
        const pointerId=event.pointerId??1001,target=captures.get(pointerId)??element;
        const values={buttons:event.type==='pointerup'?0:1,bubbles:true,cancelable:true,pointerId,pointerType:'mouse',isPrimary:true,...event,clientX:rect.x+event.x,clientY:rect.y+event.y};
        const Constructor=event.type==='wheel'?WheelEvent:event.type==='dblclick'?MouseEvent:PointerEvent;
        if(event.type==='pointerdown')active.add(pointerId);
        await fire(target,event.type,()=>target.dispatchEvent(new Constructor(event.type,values)));
        if(['pointerup','pointercancel'].includes(event.type)){active.delete(pointerId);captures.delete(pointerId);}
      }}finally{
        for(const pointerId of active)(captures.get(pointerId)??element).dispatchEvent(new PointerEvent('pointercancel',{pointerId,bubbles:true}));
        for(const restore of restores)restore();
      }
    }
  };
}
