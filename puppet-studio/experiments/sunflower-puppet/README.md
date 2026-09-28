# Sunflower directional puppet

Open `http://127.0.0.1:4354/puppet-studio/experiments/sunflower-puppet/index.html`.

This follows the overworld map traveller in `../bramble-map/traveller-puppet.js`: separate front/back/side artwork, layered parts, and the actual Little Gods `gaitSample` for planted feet and swing timing. Left mirrors the side rig. View changes select drawings; they never morph the face around the head.

## Artwork and rig

The approved flower sheet is the identity reference. GPT Image generated six detached parts for each direction: head (face and petals kept together), leafy torso, two hands and two feet. Magenta is a disposable extraction key. `scripts/prepare-sunflower-puppet.mjs` removes it and uses the game's existing `tools/vectorize/convert.mjs` cel preset to make 18 pure SVG assets. Sources, exact prompts and conversion statistics are in `assets/sunflower-puppet/`.

The head stays rigid with small rotations and follow-through; its smile is part of the drawing. Curved green stem limbs connect the torso to the independently animated hands/feet. Near and far limbs have explicit draw order. Idle, walk, greeting and delight share a deterministic pose sampler, with no accumulated spring state. This first rig has a single facial drawing per direction; separate blinks, speech mouths and redrawn emotion heads are future artwork, not simulated by stretching the grin.

`motion.js` is the shared authored geometry/timing, `puppet.js` assembles and poses the pieces, and `app.js` provides a small walking sandbox and three simultaneous turnaround previews. Click the ground or use arrows; use the direction controls to inspect the rig. Pause, pace, exploded pieces and joint overlays are available.

## Editable Studio projects

The download for each view is a self-contained `inkwell-puppet` v1 project with embedded SVG assets, six independent sprite joints and five deformable strip meshes for the curved stems. Four clips include ordinary transform keys and mesh-position keys, sampled from the same motion functions at 24 fps and interpolated by Studio. Import the selected JSON through Studio's project file control. `rig.json` describes four-way facing and links the three projects. These are editable per-view projects; this experiment does not add a new global Studio preset or replace any Little Gods game character.

## Rebuild

From `shapeshift-studio-web`:

```sh
node scripts/prepare-sunflower-puppet.mjs
node scripts/build-sunflower-puppet.mjs
node --test puppet-studio/experiments/sunflower-puppet/motion.test.mjs
```

The small build updates only this experiment and its assets in `dist`; the full web build also includes it.

Rear view: the tapered neck crosses the lower petals, covering the detached
artwork's socket cap, then tucks beneath the torso. Head and body now have
opposing squash/stretch; the head, hands and stem sway at delayed phases.
These transforms are also included in the editable Studio exports.
The map example places the same puppet beside Warden’s Grove:
`../bramble-map/index.html`.

The waving arm and hand have foreground layers 55 and 60 above the face (40),
including in the exported Studio projects. The wave crosses the cheek. Map art
has separately baked silhouette borders at its authored display scale; original
study artwork remains available.
