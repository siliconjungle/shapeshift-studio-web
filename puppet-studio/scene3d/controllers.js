import { EntityRuntime } from '@shapeshift-labs/studio-core/behaviour/runtime';
import { ActionPresenter } from './core/action-presenter.js';
import { ControllerPlacement } from './core/controller-placement.js';
import { mergeControllerParameters } from './core/action-machine.js';
import { ProceduralEffects } from './core/procedural-effects.js';
import { ProceduralAudio } from './core/audio.js';
import { toWorld } from './effects.js';

export class SceneControllers {
  constructor(host, options = {}) { this.host = host; this.options = options; this.actors = new Map(); this.time = 0; }

  configure() {
    this.dispose();
    const host = this.host, scene = host.project.scene3d;
    this.library = structuredClone(host.project.entityDefinitions ?? { version: 1, components: [], entities: [] });
    for (const node of scene.nodes.filter(node => node.controller)) {
      const definition = node.controller.presentation ?? {};
      const template = node.controller.entity ?? 'Scene.' + node.id;
      if (!node.controller.entity) this.library.entities.push({ id: template, name: node.name, components: {} });
      const visuals = definition.effectLibrary ? new ProceduralEffects(scene.effectLibraries[definition.effectLibrary], { pass: this.options.pass }) : null;
      const audio = definition.audioLibrary ? new ProceduralAudio(scene.audioLibraries[definition.audioLibrary]) : null;
      if (visuals) (this.options.effectRoot ?? host.scene).add(visuals.root);
      const uniforms = this.options.uniforms?.(node.id) ?? host.uniformTargets.get(node.id)?.[0]?.material.userData.uniforms ?? {};
      const presenter = new ActionPresenter({ root: host.objects.get(node.id), uniforms, visuals, audio,
        definition, objects: host.objects, effectRoot: this.options.effectRoot ?? host.scene,
        projectPoint: this.options.projectPoint ?? ((point, object) => toWorld(point, host.sample.byId.get(object.userData.node), host.objects, host.sample.byId)) });
      presenter.obstacles = host.pickables.filter(object => object.userData.node !== node.id);
      this.actors.set(node.id, { node, template, presenter, visuals, audio });
    }
    this.reset();
  }

  reset(clip, { actions = true } = {}) {
    this.runtime?.dispose();
    const pending = [];
    this.runtime = new EntityRuntime(this.library, { emit: event => pending.push(event) });
    for (const actor of this.actors.values()) {
      actor.presenter.reset();
      if (actor.audio) actor.audio.enabled = false;
      actor.entity = this.runtime.create(actor.template);
    }
    for (const actor of this.actors.values()) {
      const definition = this.host.project.scene3d.controllerLibraries[actor.node.controller.library];
      const parameters = mergeControllerParameters(actor.node.controller.parameters ?? {}, clip?.controllerParameters?.[actor.node.id]);
      actor.controller = this.runtime.attach(actor.entity, definition, parameters);
      actor.machine = this.runtime.controllers.get(actor.controller)?.machine;
      if (!actor.machine) { actor.presenter.root.visible = false; continue; }
      actor.presenter.attach(actor.machine);
      if (actor.presenter.pose()) actor.presenter.placement = new ControllerPlacement(actor.presenter.pose(), actor.node);
    }
    const deliver = event => {
      const actor = [...this.actors.values()].find(actor => actor.controller === event.controller);
      actor?.presenter.emit(event.event, event.data);
    };
    this.runtime.emit = deliver; pending.forEach(deliver);
    for (const command of actions ? clip?.controllerActions ?? [] : []) {
      const actor = this.actors.get(command.node);
      this.runtime.dispatch(actor.controller, command.procedure, command.args);
    }
    this.time = 0;
  }

  seek(time, clip, { continuous = false, audible = false } = {}) {
    if (!this.actors.size) return;
    if (!continuous || clip.id !== this.clip || time < this.time) this.reset(clip);
    for (const actor of this.actors.values()) {
      if (actor.audio) actor.audio.enabled = audible;
      actor.presenter.placement?.set(this.host.sample.byId.get(actor.node.id));
    }
    const rate = clip.controllerTimeScale ?? 1;
    for (let remaining = (time - this.time) / rate; remaining > 1e-9;) {
      const dt = Math.min(1 / 60, remaining); this.runtime.step(dt); remaining -= dt;
    }
    this.time = time; this.clip = clip.id;
    this.render();
  }

  render() {
    this.runtime?.prune();
    for (const actor of this.actors.values()) {
      if (this.runtime.world.alive(actor.entity) && actor.machine) actor.presenter.applyPose();
      else { actor.presenter.root.visible = false; actor.presenter.reset(); }
    }
  }
  unlock() { for (const actor of this.actors.values()) if (actor.audio) { actor.audio.enabled = true; actor.audio.unlock(); } }
  pause() { for (const actor of this.actors.values()) actor.audio?.stop(); }
  snapshot() { return Object.fromEntries([...this.actors].map(([id, actor]) => [id, {
    alive: this.runtime.world.alive(actor.entity), ...(actor.machine?.save() ?? {}), components: this.runtime.world.alive(actor.entity) ? this.runtime.components(actor.entity) : {}
  }])); }
  dispose() {
    this.runtime?.dispose();
    for (const actor of this.actors.values()) {
      actor.presenter.dispose(); actor.visuals?.dispose(); actor.audio?.dispose();
    }
    this.actors.clear();
  }
}
