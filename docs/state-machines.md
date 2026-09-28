# Animation state machines

Open **State Machines** in the top toolbar. The current workspace chooses 2D or 3D. A project can contain multiple machines for each dimension; choose or create one in the machine selector. The existing procedural ActionMachine controllers remain separate.

1. Create animation clips in the regular timeline, then add animation states and choose their clips in the inspector. Drag cards to arrange the graph. Select a state and choose **Use as entry** to set the starting animation.
2. Add a transition, choose its **From** and **To** states, and set its blend duration. Clicking an arrow or the numbered transition list opens its inspector. **Any state** is a wildcard source; **Exit** ends a layer; blank states contribute no animation.
3. Add boolean, number or trigger inputs. Add conditions to transitions. Conditions on one transition are ANDed; separate transitions provide OR alternatives. The first eligible transition in the list wins. Priority arrows change that order.
4. Set **Exit time** to the number of source clip cycles to wait before checking a transition (1 = one complete cycle, .5 = halfway). Clear the field for an immediate transition. Conditions must also match. Negative state speed plays backward; zero pauses its animation clock. Playback may inherit the clip's loop setting or explicitly loop/play once.
5. Add layers for independent motion. Lower layers in the list override only properties they animate. All layers see a trigger during the same evaluation, then it is cleared, even if no transition used it. Any-state transitions skip their current destination. A crossfade finishes before another transition can start. At most one transition per layer is taken in one `advance()` call, preventing instantaneous cycles from hanging playback.
6. **Start preview** renders the actual pose in a separate canvas. **Test** values and **Fire** are temporary; **Default** values are saved. Pause freezes the preview; Reset restores entry states and default inputs. Editing the document stops the preview so changes can be restarted consistently. Closing the dialog releases rendering resources.

Machines live in `project.stateMachines`. Edits use `stateMachine.put` (validated whole-machine replacement) and `stateMachine.remove`, with normal undo/redo and JSON save/import. Deleting a referenced clip is rejected: first change/remove the corresponding animation state. Removing a state removes its connected edges; removing an input removes its conditions and disables affected transitions so they cannot accidentally become unconditional.

## Portable players

The shared `@shapeshift-labs/studio-core/state-machine` export supplies validation, commands, the renderer-independent `createStateMachine(project, id)` evaluator, and `blendMachineLayers`. Runtime inputs and clocks never modify authored JSON. `snapshot()` exposes active states, weighted clip samples, input values, and events from the last advance. `advance(seconds)` accepts 0–60 seconds; exit-time overshoot carries into the target animation.

The built 2D runtime exports:

```js
import {loadImages, createStateMachinePlayer} from './runtime.js';
const images = await loadImages(project);
const player = createStateMachinePlayer(canvas, project, images, 'machine-id');
player.setInput('is-running', true);
player.fire('jump');
player.play();
// Or deterministically step without requesting animation frames:
player.pause();
const state = player.advance(1 / 60);
player.reset();
player.dispose();
```

The 3D runtime exports the asynchronous equivalent, using either the standard or illustrated scene pipeline:

```js
import {createSceneStateMachinePlayer} from './scene3d/runtime.js';
const player = await createSceneStateMachinePlayer(canvas, project, 'machine-id', {
  width: 800, height: 600,
  onFrame(frame) { /* active states and transition events */ }
});
player.play();
```

`pause()` / `stop()` preserve the current pose. `reset()` pauses and restores defaults. Treat project data as immutable during playback; dispose and recreate a player after editing.

## Current scope

This is a clip-state graph with conditional transitions, crossfades and independent layers, inspired by Rive's state-machine workflow. It is not full Rive format/runtime parity. There are no 1D/additive blend-state nodes, listener/data-binding authoring, transition actions, random transition selection, or crossfade interruption controls yet.

Blending covers resolved local joint transforms in 2D and numeric/vector node channels in 3D, including supported eye/deformation/final channels. 2D joint tracks own their five transform properties; 3D tracks own individual channels. The dominant animation owns artwork, clip effects and other non-blended visual behavior. Playback is silent; animation audio is not mixed across states. Procedural controller-owned 3D actions, procedural soft-body geometry, and constraints that depend on the final combined pose are not a separate graph layer/solver. Use baked animation clips for those motions. Rotations interpolate authored Euler degrees, so author unwrapped angles across transitions when needed.

## Verification

- `npm test` in web and core includes graph evaluation, conditions, priority, trigger fan-out/consumption, exit times, reverse/one-shot playback, layer blending, validation, serialization and transactional undo/redo.
- `npm run build` builds editor and portable players.
- With `dist` served at `http://127.0.0.1:4354`, run `node scripts/verify-state-machine-browser.mjs` for authoring, drag/undo/redo, JSON round-trip, live previews, a 2D pixel check and rendered 3D pose checks in both pipelines. Proof files are written to `work/state-machines/`.

Reference: [Rive state machines](https://rive.app/docs/editor/state-machine/state-machine).
