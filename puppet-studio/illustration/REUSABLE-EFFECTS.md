# Reusable illustration effects

The potion study is a consumer of shared mechanisms. It is not a new collection
of action-specific editor tools. Cork anticipation, release, return timing, the
mixing shelf and camera framing remain authored choreography in the demo.

## Data and event driven colour

`joint.visual.colorShift` contains defaults: enabled, mode (`tint` or `hue`),
colour, amount, hue rotation, preserveInk and inkThreshold. Tint retains tonal
structure. Ink protection is based on luminance, not semantic ink recognition;
dark coloured patches are protected too. Turn it off where that is unsuitable.

The runtime accepts three independent sources, in order:

1. Authored values and optional `clip.illustrationTracks`.
2. `project.illustrationBindings` resolved against ECS data or state.
3. Runtime values/events passed as `renderFrame(..., {illustration: values})`.

The render never writes these sampled values back to the saved puppet.

```js
import {createEffectState} from '@shapeshift-labs/studio-core/illustration/effect-state';

const effects = createEffectState(); // one instance per entity / puppet
// Continuous ECS value:
effects.set('bottle', 'liquid.fill', entity.potion.fill);
effects.set('bottle', 'liquid.color', entity.potion.color);
// A damage event can animate the same generic property:
effects.dispatch({joint:'body', channel:'colorShift.amount', from:1,
  value:0, duration:.25, easing:'smooth'});
// Every update:
effects.advance(dt);
renderFrame(project, images, clip, time, {
  illustration: effects.snapshot(),
  effectData: {health: entity.health},
  effectStates: {status: entity.status}
});
```

Configure the body's colour shift as enabled and choose its colour first. Runtime
`set` cancels an in-flight transition for that property. A new event starts at the
current value unless `from` is supplied. `clear(joint, channel)` releases that
property back to its binding/animation; `reset()` clears all runtime effects.

A serialized binding can map health to colour-shift amount:

```json
{"joint":"body","channel":"colorShift.amount","source":"data",
 "path":"health","min":0,"max":100,"from":1,"to":0}
```

A state comparison can map to colours:

```json
{"joint":"body","channel":"colorShift.color","source":"state",
 "path":"status","equals":"poisoned","from":"#ffffff","to":"#668833"}
```

Omit from/to for a direct value, including a hex colour from game data. Missing or
invalid live input leaves authored values in effect. Bindings reject unsafe paths.
The state-machine 2D player supplies its inputs as effect data and current layer
state IDs as effect states; callers can additionally supply `effectData(frame)`
and `illustration(frame)`. This is an adapter contract, not a modification of the
Little Gods ECS. The actual game's entity update must supply its component data.

### Rendering

Editable SVG fills, strokes, swatches and gradient stops are transformed before
rasterization, including sampled vector animation. No full-screen shader is added.
Raster sprite fallback preserves alpha and caches four quantized variants per
source, with a 1024px processing cap. These controls currently apply to 2D puppet
artwork, including puppets rendered through that player; native 3D materials retain
their existing colour and lighting systems.

## Liquid properties and transfer

The existing `joint.liquid` tool remains the contained-liquid/slosh primitive.
Fill, base, shadow and highlight colours now support keys and runtime values.
`illustration.key` writes `liquid.fill`, `liquid.color`, `liquid.shadow`,
`liquid.highlight`, `colorShift.amount`, `colorShift.hue` or `colorShift.color`.
Use Illustration tools → Key liquid/colour shift at playhead at two times.
Keys interpolate smoothly and survive serialization and reverse seeking. They also
appear in the shared timeline and travel with captured character animations.
Runtime bindings are project-level integration settings: configure them for each
placed instance; library capture does not currently carry these bindings.

`@shapeshift-labs/studio-core/illustration/liquid-actions` exports `mixLiquid`,
`blendColor`, `liquidPalette`, and `pourImpact`. Mixing clamps to remaining
capacity and weights colour by the amount actually added. Amounts are fractions
of the receiving container's capacity. `pourImpact` finds where a world-vertical
stream meets a moving contained surface; drawing the outside/inside segments and
occluding them with glass remains the renderer's responsibility. This is an
illustrative transfer operation, not a free-surface fluid simulation.

## Motion primitives

The existing Procedural editor already supplies gravity, constraints, rigid/soft
bindings, collision friction and bounce. It now supports authored one-time
velocity changes:

```js
applyCommand(project, {op:'procedural.impulse', id:'impact', value:{
  time:.2, particles:['point-a','point-b'], velocity:[120,-300]
}});
```

Select free dynamic points → Procedural → Impulse. Values are world pixels per
second, not force/mass units. Authored impulses apply once when crossing their
time and replay deterministically on rewind. Pins, drivers, kinematic chains and
attachments keep ownership; authoring rejects impulses aimed at those points.
Game runtimes may call `simulation.impulse(ids, deltaVelocity)` directly.
Existing pose keys, easing, follow-through and deformation tools handle
anticipation, arcs, squash/stretch and recovery. There is no pop/return tool.

## Audio, plumes and shadows

`liquidSoundPreset(baseAudioLibrary)` exports editable tone/noise cue data. The
editor's Add liquid sound palette button installs it as a normal sound library;
use Sound/timeline cues or the runtime audio API to trigger it. It does not create
an automatic drinking action. The generic fluid-contour solver already supports
vapour plumes; particle emitters already support rising particles and bursts.

The potion's ground shadows are SVG-specific projected silhouettes, with height
controlling offset, blur and opacity. They remain demo code: Studio already has
3D shadow tools, and a robust general 2D shadow authoring surface needs a separate
receiver/light/depth contract. Artwork cutout masks likewise use existing vector
clipping rather than a special bottle tool.
