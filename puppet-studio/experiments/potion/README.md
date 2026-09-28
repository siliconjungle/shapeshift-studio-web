# Potion workshop

Live demo: `/puppet-studio/experiments/potion/index.html`
Editable Studio puppet: `/puppet-studio/index.html?potion=1`

## Artwork and construction

The bottle was generated with built-in GPT Image, then traced through the same
`inkwell-little-gods/tools/vectorize/convert.mjs` entry point as Little Gods.
Original prompts and image sources are in `assets/`. The uncorked image edit
reconstructed the hidden opening. It returned a baked checkerboard, so neutral
background vectors were removed after tracing. The failed alpha repair is not used.
The final charm-free bottle uses a further GPT Image edit on a white background;
white background paths were removed after tracing. Its prompt is saved in
`assets/charm-removal-prompt.json`.

The generated cork's top face is preserved. Its lower barrel is extended in the
SVG geometry, and a separate front-lip clipping layer hides that barrel while
inserted. This occluder switches off after release and back on before insertion,
so a falling cork renders in front of the entire flask. Bottle, back glass, lip,
and cork remain separately editable vector puppet pieces.

The liquid uses a smooth authored cavity (including the neck), not a traced paint
region. Paint highlights are not physical walls. The amount slider supports 0–100%.

## Research and decisions

- [Gil Damoiseaux: bottle-liquid implementation](https://80.lv/articles/simulating-liquids-in-a-bottle-with-a-shader): movement-driven damped springs, visible surface shading, separate glass/liquid layers, and agitation-based effects. Adopted spring response and separate surface appearance; not its full 3D shader or refraction system.
- [David J. Vandepeer: Health Potion](https://stitchshift.artstation.com/projects/xJgvGm): a 2D game asset with offset bottle/liquid animation, separate shade/light artwork and bubbles. Inspected its art and animation breakdown.
- [Iby Ahmed: Potion Bottle Liquid Simulation](https://iby.artstation.com/projects/mqkrg9): separate rotation/translation and fill tests, delayed liquid response.
- [USGS: water meniscus](https://www.usgs.gov/water-science-school/science/water-meniscus) and [OpenStax: cohesion and adhesion](https://openstax.org/books/college-physics-2e/pages/11-8-cohesion-and-adhesion-in-liquids-surface-tension-and-capillary-action): the small rise at a wetting glass wall is distinct from the broad ellipse produced by viewing the top surface in perspective.
- [Lasseter, 1987: animation principles](https://www.evl.uic.edu/aej/527/papers/lasseter.pdf): anticipation, conserved squash/stretch, overlapping action and arcs. Used a short squeeze, fast release, world-gravity fall, landing compression, and a separate arcing return with seating compression.

Art decisions: no black liquid stroke by default; a pale curved top cap, short
highlight, restrained depth colour and a curved lower shade. The perspective cap
is illustrative, not a 3D volume calculation. Waves stop when the bottle settles.

## Native tool

Select a 2D joint → **Illustration tools → Liquid inside this piece**.
Controls include fill, spring frequency, damping, agitation, palette, surface
ink width (0 disables it), surface depth, meniscus, bubbles and interior boundary.
Changes are validated, undoable and stored under `joint.liquid`.

Programmatic command:

```js
applyCommand(project, {
  op: 'illustration.liquid', joint: 'bottle',
  values: {fill: .6, damping: .32, lineWidth: 0}
});
```

The shared model is exported as
`@shapeshift-labs/studio-core/illustration/container-liquid`.
Use `liquidDefaults`, `createLiquidState`, `advanceLiquid` and `liquidSurface`
for interactive motion, or `LiquidTimeline` for repeatable timeline seeking.
Motion uses radians and joint-local pixel geometry, with world x/y translation.
The exported paths work with SVG and Canvas Path2D.

This is a stylized **2D area-conserving contained-liquid model**, not a volumetric
fluid simulation. It does not pour, spill, simulate arbitrary deforming walls or
track a fully 3D free surface. At 100% the free surface disappears, but bubbles remain visible. The open cork
is an animation effect; the liquid remains contained even when the bottle tips.

## Cork, gas, shadows and audio

`motion.js` is the shared authored-action sampler. It is sampled into native
editable keyframes and also used by the interactive demo. The initial impulse
follows the neck direction; gravity then acts in world coordinates. Demo side
bounds keep the cork visible. Return motion aligns to the rotated neck before
seating. Gas comes from the opening at release.

The demo uses projected SVG silhouettes for shadows. Airborne height controls
cork shadow spread, opacity and softness; these are stylized depth cues, not a
3D shadow-map simulation. The native puppet currently carries the artwork,
liquid, occlusion, animation, gas and sound cues; these demo ground projections
are not part of the exported puppet.

**Potion sounds** enables procedural pop, hiss, cork landing, return/plug, shake,
slosh and fill/drain cues. Manual drag/tilt drives slosh energy too. Sound variation
uses Studio's shared ProceduralAudio system; slosh is rate-limited and fades when
motion settles. Fill/drain cues follow slider changes. Audio is on by default and unlocks on the first interaction.

## Mixing demo

The main vial starts empty. Three unlabelled coloured vials add up to 28% each,
clamped to remaining capacity; the mixed colour is weighted by actual volume.
The glass keeps its original palette. There are no colour pickers.
The donor uses the same SVG dimensions and unit scale as the main bottle; the
view temporarily frames both. Its liquid level drops as the main vial fills.
The outside stream joins an interior stream behind the front glass, clipped to
the cavity, ending at the animated liquid surface with a small ripple.

Take a gulp uncorks if needed, tips the bottle, triggers three procedural gulp
sounds and drains up to 30%. These are authored pouring/drinking actions layered
on the contained-liquid model, not a free-pouring fluid simulation. The exported
puppet retains its authored tilt/pop/return clip, rather than exporting the live
mixing session.

Vapour uses the shared fluid contour solver with no ink stroke. Small bubbles
rise through the neck and escape while open; in-liquid bubbles remain at full fill.
The foreground rim follows a curved mask, rather than a horizontal layer cut.

## Rebuild / verify

From `shapeshift-studio-web`:

```sh
node scripts/prepare-potion.mjs
node scripts/assemble-potion.mjs
node scripts/build-potion.mjs
node --test puppet-studio/illustration/container-liquid.test.mjs puppet-studio/experiments/potion/potion.test.mjs puppet-studio/illustration/illustration.test.mjs
```

Preparation reuses existing trace files unless `--force` is supplied. It never
generates images or makes a model request. The standard Studio build includes
native editor changes; `build-potion.mjs` refreshes this demo and puppet JSON.

## Shared building blocks

See [Reusable illustration effects](../../illustration/REUSABLE-EFFECTS.md) for
data/event-driven colour shifts, liquid properties, impulses and audio presets.
The demo uses the shared liquid mixing/stream geometry and sound palette.
Its cork choreography and shelf remain specific to the experiment.

## Smooth scripted demo capture

From `shapeshift-studio-web`, with the normal demo server on port 4354:

```sh
node scripts/build-potion.mjs
node scripts/record-potion-demo.mjs --preview # optional sampled rehearsal
node scripts/record-potion-demo.mjs
node scripts/encode-potion-demo.mjs
```

Writes `../outputs/potion-alchemist-scripted/potion-alchemist-scripted.mp4`.
The director sends ordinary button and range inputs. `?capture=frames` opts into
fixed 1/60-second simulation steps and a visible, smoothly moving cursor.
Screenshots can take as long as necessary without skipping simulation frames.
The same ProceduralAudio implementation renders the emitted cue log through an
OfflineAudioContext, using matching simulation timestamps. There is no live
screen recording, operating-system input, time compression or montage cut.
The 44-second sequence covers two mixes, repeated shakes, rocking, manual tilt,
a directional cork pop, replacement, emptying, full-fill bubbles and gulps.
The ordinary page continues to use requestAnimationFrame and live audio.
