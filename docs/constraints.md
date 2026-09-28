# Object constraints

Open **Constraints** in the toolbar and choose **Working on**. Constraints belong to the 2D rig or 3D scene, so they apply across animation clips and while editing the rest pose. Each constraint has a target, enabled flag and strength from 0 to 1.

The panel includes copy, limit, IK, distance and Follow Path constraints. **Load IK arm example** opens an animated three-bone mechanical arm; loading it is undoable. **Motion tools → Contact & attention** also provides ground planting and look-at aiming.

| Type | Behavior |
| --- | --- |
| Translation | Copy position and/or impose position limits. |
| Rotation | Copy angles and/or impose rotation limits, in degrees. |
| Scale | Copy scale and/or impose scale limits. |
| Transform | Combine translation, rotation and scale controls. |
| IK chain (2D rig) | Rotate 1–32 parent bone segments so the selected endpoint follows a target. |
| Follow Path (2D rig) | Move along an SVG path with keyed distance, tangent orientation and position offset. See [Follow Path](follow-path.md). |
| Distance | Stay within (**Closer**), outside (**Further**) or exactly at a world-space distance from a target. |

For copy constraints, **Source space** selects the target's local or world coordinates, **Destination space** selects the coordinates receiving those values, and **Limit space** independently selects the frame for limits. Copy switches, multipliers and fixed offsets are per axis. **Keep authored offset** preserves the owner’s animated local position/rotation as an additive offset; for scale it multiplies the copied value by the owner’s animated scale. It defaults off for compatibility and applies before limits. Limits work even when copying is disabled. Choose **None — limits only** to constrain an object without a target. Empty Min/Max fields are unbounded.

Examples:

- Wheels: copy local rotation with multiplier 1; use -1 for counter-rotation or another ratio for gearing.
- Mechanical attachments: copy world transforms from a target on another hierarchy branch.
- Restricted movement: use Translation without a target and set local X/Y/Z limits.
- Separation: use Further distance to keep the owner outside a radius around a target. If their origins coincide, the positive world X direction breaks the tie deterministically.

## IK chains

Select the endpoint joint, choose **IK chain**, and choose a target outside the driven branch. **Bone count** controls how many parent segments can rotate; for a shoulder → elbow → hand chain, select hand and use 2. **Invert bend direction** selects the opposite bend. The panel lists the affected chain. Default/keyed strength, enable/disable and ordering work as for other constraints; use strength to blend between a manually keyed pose and IK, or between multiple targets.

The solver changes rotations only, retaining authored translations and scales. Unreachable targets extend toward the target without stretching. Zero-length segments remain finite. Each evaluation starts from the sampled pose, so scrubbing and reverse playback do not depend on previous frames. Parent transforms, including mirrored parents, are respected. Bone count is limited to 32; the iterative solve for long chains or scaled joints is approximate.

IK authoring is for 2D rigs and also plays when those rigs appear as 3D puppet layers. Native 3D scene objects retain the other five constraint families; this does not add a volumetric 3D IK solver.

## Animation and ordering

**Default strength** applies when the active clip has no strength keys. Enter **Strength at … s** and press **Key strength** to add a key at the playhead. Keys appear in the shared Timeline for retiming, value editing and easing. The panel's Strength keys list can seek to or delete individual keys. In 2D, use Animate mode to see keyed strength; Rig setup uses the default strength.

Constraints on one owner run top to bottom; the up/down buttons reorder them. Target dependencies and parents resolve before their dependants, regardless of declaration order. An IK owner’s stack runs at its highest affected ancestor, so downstream constraints read the solved endpoint. Cyclic dependencies, self-targets and targets inside the driven branch are rejected, including disabled constraints that would become cyclic when enabled.

Evaluation begins from the sampled pose every time: no solver state accumulates during playback, scrubbing or reverse playback. The new rig constraints apply after motion tools and final channel overrides, so a copied target reflects its displayed pose, including a state-machine pose blend. During state-machine playback, strength keys follow the dominant clip's clock, as do other non-blended clip behaviors.

## Data and portable playback

- 2D definitions: `project.constraints`.
- 3D definitions: `project.scene3d.constraints`.
- Per-clip animated strength: `clip.constraintWeights`, containing `{constraint, keys: [{time, value, easing}]}` tracks.
- Commands: `constraint.add`, `constraint.update`, `constraint.remove`, `constraint.order`, `constraint.key`; all accept `dimension: 2 | 3`. Add uses `node`, `type`, optional `target` and optional `id`. Update takes `id` and `values`, including `boneCount` and `invertDirection` for IK, or `ownerOffset` for copying. Order takes `id` and the new global `index`. Key takes `id`, `clip`, `time`, `value`, optional `easing`, or `remove: true`.

```js
await studio.dispatch({
  op: 'constraint.add', dimension: 2,
  id: 'wheel-link', node: 'rear-wheel', target: 'front-wheel',
  type: 'rotation'
});
await studio.dispatch({
  op: 'constraint.key', dimension: 2,
  id: 'wheel-link', clip: 'drive', time: 0, value: 1
});
```

Commands validate a private candidate before mutation. Project save/import and undo/redo retain definitions and keys. Removing a node prunes constraints that own or target it and their strength tracks. Reparenting that creates a constraint cycle is rejected.

Character library capture, placement, previews and publishing preserve constraints and remap strength tracks and targets to each instance. Capture the complete chain and its targets together. Renaming a joint updates constraint references, and linked 3D puppet sources retain their rig constraints.

Shared package entry points are `@shapeshift-labs/studio-core/constraints`, `/constraints/solve2d` and `/constraints/solve3d`. Browser `poseAt`/`renderFrame` and standard/illustrated 3D players evaluate constraints automatically. The pure 3D solver accepts node TRS values and returns constrained local transforms without mutating its inputs.

## Representation limits

Studio stores translation, rotation and scale, not skew. World rotation/scale conversion through rotated, nonuniformly scaled parents uses TRS decomposition; it cannot exactly preserve arbitrary shear. Use uniform parent scale when exact cross-hierarchy rotation/scale matching matters. Local-to-local rotation copies preserve authored turns; conversions involving world space use the nearest equivalent angle. A zero scale is kept at magnitude 0.000001 so descendants' coordinate transforms remain invertible.

The six families in [Rive’s constraints overview](https://rive.app/docs/editor/constraints/constraints-overview) are available in 2D rigs. This is Studio’s own authoring/runtime implementation; Rive files are not imported.

## Verification

Core/web tests cover coordinate-space conversion, all new types, axis masks, ratios, offsets, limits, distances, strength keys, dependency ordering/cycles, zero scale, persistence, undo/redo, cleanup and timeline editing. Run `npm test` in each package and `npm run build` in web.

With `dist` served on port 4354, `node scripts/verify-constraints-browser.mjs` checks the actual panel, keys, history and saved JSON, verifies a rendered 2D pixel, and compares repeated/backward scrubs in both 3D renderers. Evidence is written to `work/constraints/`.

`node scripts/verify-ik-browser.mjs` checks IK panel creation, bone count, inversion, ordering, keyed strength, history, save/reload, the portable player and actual 3D puppet textures. Its sample project and visual evidence are under `work/constraints/ik-*`.
