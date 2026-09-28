# Little Gods — illustrated journey experiment

Open `/puppet-studio/experiments/bramble-map/index.html` after `npm run build`.

Hearth Village → Warden’s Grove → Solis Village → Fallen Shrine → Cryos Pass →
Old Sanctuary. Six original generated locations, inspired by the Warden, Solis,
and Cryos and their villages. Existing game sprites are references, not displayed art.

## Actual Little Gods art pipeline

1. Built-in GPT Image 2 generates the location/prop atlas, parchment background,
   compass, blank ribbon, and separate side/front/back puppet sheets.
2. Transparent gutter detection splits the atlases; alpha cleanup and tight
   bounds remove stray fragments without assuming exact thirds.
3. The game's `tools/vectorize/convert.mjs` runs its cel preset: alpha cleanup,
   median filtering, 16-colour reduction without dithering, VTracer, and final
   SVG fill snapping. The compass uses six colours.
4. The game's unchanged `scripts/palette/map-assets.py` runs in an isolated
   staging directory. Its perceptual colour and shade-family mapping produces
   `assets/bramble-map/palette.json`, using the game's editable palette-index
   contract with a warm, restrained parchment palette.
5. Runtime imports the actual `art-palette.js`, `vector-art.js`, and
   `ColorGradingPass` from the sibling Little Gods repository. SVG paths become
   coloured meshes, with the game's MSAA/FXAA and neutral colour grading.

Current sources under `assets/bramble-map/source`: `gods-locations.png`,
`parchment-map.png`, `map-ribbon.png`, `compass.png`, `traveller-parts.png`,
`traveller-front.png`, and `traveller-back.png`. The whole `traveller.png` is a
reference for the separate-piece rig. Full generation prompts and source paths
are in `assets/bramble-map/generation.json`; conversion reports are in
`map-assets.json` and `traveller-conversion.json`. Older source trials are unused.

Regenerate SVGs and mappings:

```sh
node scripts/prepare-bramble-map-revision.mjs
node scripts/prepare-map-traveller.mjs
node scripts/map-bramble-palette.mjs
node scripts/prepare-map-silhouettes.mjs
node scripts/recolor-map-ink.mjs
npm run build
```

The labels use actual Inkwell Text/Display variable WOFF2 fonts from
https://github.com/siliconjungle/inkwell-lettering
(commit b2b1db1c0f3967dd28b7287e56716cbf5087cb1a).
Text stays live in SVG; ribbon animation does not stretch it.

## Motion, travel, and layers

Reference: https://www.wildfrostgame.com/wp-content/themes/wildfrost/content/features/feature_1.gif

Inspected its 120 frames at 30ms/frame, particularly frames 36–65. It shows short,
mostly uniform landmark pops and routes arriving between staggered reveals.
Exact engine implementation cannot be established from the GIF.

This experiment uses a 240ms grounded pop, then 340ms route reveal; reversible
springs make hover/selection banners responsive. All landmarks, including the lantern tree, remain still when idle. Scenery trees move continuously
with occasional stronger gusts, and motes drift.
Gentle motion suppresses sway, tilt, and walking exaggeration. Pause stops time.
The separate trees and rocks are twice their previous size, repositioned inside
safe margins and clear of the route. Banners are 20% wider with extra text
insets. The fixed 1440×960 view fits the viewport without cropping.

Travel uses a fixed 170 map units/second pace and 54-unit stride, with no
destination-distance acceleration. A 340-unit journey takes two seconds. Longer
routes take proportionally longer, using elapsed time independently of the spring
integration limit. Actual Little Gods `gaitSample` drives separate feet, arms,
body, head, backpack and cape. Front/back sheets are selected for down/up travel;
a side sheet handles right/left with mirroring. Each staff preserves its art
aspect ratio and attaches at a per-view shaft grip to the right hand socket,
behind the hand artwork. It inherits the arm animation.

Route endpoints share the traveller's resting anchor inside each location.
Perfect Freehand marks darken only behind its progress. Passed/visited places
keep their labels; selected/hovered places also show banners. Unvisited art is
muted while the banners retain their parchment colour. Approaching a stop reveals its full
colour over the final 650ms, completing at arrival; hover never changes the outline ink.

Explicit painter order: background → ink routes → scenery/locations → banner
art → live SVG labels → traveller. The traveller has a transparent foreground
mesh/grade pass above the SVG layer so even labels cannot cover it.

## Reusable routes

`@shapeshift-labs/studio-core/procedural/ink-route` samples curves by arc length
and calls Perfect Freehand's real `getStroke` for each filled contour. Pressure
and seeded variation shape each dash; dots use point strokes. These SVG paths
are rendered by the same Little Gods vector mesh tooling.

Spacing research consulted tldraw's primary source:
https://github.com/tldraw/tldraw/blob/main/packages/editor/src/lib/editor/shapes/shared/getPerfectDashProps.ts
No tldraw code was copied.

## Verification

- Core `tests/ink-route.test.mjs`: deterministic marks, endpoints, invalid inputs.
- `node --test puppet-studio/experiments/bramble-map/map.test.mjs`: grounded
  proportions, reveal timing, enlarged artwork bounds, endpoint continuity,
  responsive springs, constant walking speed, behind-only ink, and four-way facing.
- Standalone web build and browser checks for travel, visited/selected banners,
  route visibility, foreground traveller, cutouts, and console errors.

## Boundary-only ink

The map uses alpha boundaries rather than dark-colour classification to choose
where ink belongs. `scripts/map-edge-ink.mjs` writes filled Perfect Freehand
vector bands at the exterior and transparent-hole contours. All original paths
and interior fill colours are preserved, including bark lines, masonry and
painted shadows. The compass and background are excluded.

Those new boundary bands have an explicit `data-ink-edge` group. Runtime tags
only that group's dedicated ink colour for the optional colour control. Original
interior colours continue through the Little Gods palette and arrival grading.
The general colour-family tools remain available but are not used to classify
interior map artwork for recolouring.

`node --test puppet-studio/art/ink-colours.test.mjs` checks boundary bands,
transparent holes and preservation of the original tree artwork.

## Cached asset borders

The finished outline is part of the saved SVG, not a per-frame outline effect.
`scripts/prepare-map-silhouettes.mjs` extracts alpha contours from original art,
including enclosed transparent openings. `scripts/recolor-map-ink.mjs` calls
Perfect Freehand once during asset preparation and writes the filled bands into
43 SVG files. Bark, masonry and other internal painted lines remain original.
Background and compass are excluded.

`ink-style.js` defines the finished 4.4-map-unit border shared with route marks;
banners use 3 units. Baking divides by each asset's authored display width, so
small props receive the same border weight as landmarks at the shared camera
scale. Normal viewport/camera scaling scales the cached art and routes together.
If an asset's authored size changes, rebake it. Hover/sway/puppet transforms move
its existing geometry, including its borders; no contour analysis, projection,
shader stroke construction or geometry rebuilding occurs in the frame loop.

`source-vectors/` preserves the unmodified generated SVGs. `ink-recoloring.json`
caches hashes of source art, contours, style, implementation and output. Unchanged
builds reuse the existing files; changed inputs or damaged outputs rebuild only
the affected files. `npm run build` validates this bake before bundling. Runtime
loads/triangulates each asset once and reuses its geometry for all instances.
The lightweight arrival material preserves the baked dark ink while blending
surface saturation; it does not generate or redraw outlines.

Banner lettering follows a shallow SVG textPath matching the ribbon's dip.
Actual Inkwell glyph measurements fit the text into its inset central panel.

## Location revision and full-screen presentation

The header, debug controls and footer have been removed. The map fills the
viewport while preserving its complete 3:2 frame. Selecting another destination
shows one absolutely positioned travel button; at the current location it stays
visible as an enabled “Enter” action for the temporary level-clear transition. Location
names remain on their ribbons and in accessible labels.

Hearth keeps its three leaf-roof cottages with an open courtyard replacing the
mask. Warden’s Grove is one massive lantern tree. Fallen Shrine is an architectural
ruin without a mask. `source/{camp,shop,shrine}-revised.png` stores the new
built-in generated edits; `location-edits.json` stores their conversion results.
Solis, Cryos and Old Sanctuary retain their existing artwork and palette mappings.

To rebuild just these edited locations:

```sh
node scripts/prepare-map-location-edits.mjs
node scripts/map-bramble-palette.mjs camp shop shrine
node scripts/prepare-map-silhouettes.mjs
node scripts/recolor-map-ink.mjs
npm run build
```

`approachColour` starts each stop’s colour transition 650ms before arrival,
including intermediate stops on a longer route. The travel speed is unchanged.

### Regional scenery
Scenery resolves its nearest location in `scene.js`. Hearth and the Grove retain
the woodland props; Solis uses a generated ochre acacia and sandstone; Cryos uses
a generated snowy conifer and frost-coloured boulders. Trees use the existing
Little Gods 16-colour cel reduction, SVG conversion, palette and edge-ink flow.
Prompts and conversion provenance are saved in `assets/bramble-map/regional-scenery*.json`.
Regenerate with `prepare-map-scenery.mjs`, then `map-bramble-palette.mjs`,
`prepare-map-silhouettes.mjs` and `recolor-map-ink.mjs`.

Regional scenery inherits its landmark’s exact colour-reveal progress and visited/highlight state, so trees and rocks stay muted until their biome activates and reveal together on approach.

### Clouds and grounded shadows
Solis and the sanctuary were edited from the original map art; the sanctuary's
three figures reference the actual Warden, Solis and Cryos portrait assets.
`atmosphere-prompts.json` records the image prompts. Rebuild those four SVGs with
`node scripts/prepare-map-atmosphere.mjs`, then map their palette and regenerate
landmark and cloud silhouettes/edge ink. Clouds use the same dark boundary ink
baked with Perfect Freehand into their SVGs, just like the other world artwork.

`map-atmosphere.js` uses Little Gods' `sampleCloudMotion` directly. Three sparse
clouds draw above the art, with banners and the traveller still on top.
`map-shadows.js` adapts the game's silhouette-caster/contact approach to this flat
map: vector geometry supplies the shadow mask, a common light direction projects
it from its ground anchor, and a lower-contour contact pass grounds each prop.
MAX blending combines triangles and puppet pieces before softening, preventing
internal overlap seams. Cloud shadows use a separate softer mask over the world.
The game’s 3D terrain depth pass is not used for this 2D orthographic map.

### Rendering diagnosis
The opt-in `?profile=1` suite now compares full rendering, no shadows, no grading, then a full repeat. Outlines are always baked into the art; the removed live outline pass cannot be toggled back on. It records CPU stages, frame gaps and GPU queries in `script#map-profile`. Normal map visits do not activate timing probes. The pre-fix diagnostic stopped early on request because of host slowdown: full rendering averaged 113.7 ms/frame versus 20.2 ms without extra outlines; disabling shadows averaged 111.3 ms. This points to per-pixel Perfect Freehand stroke construction, not the sub-millisecond animation update. Those figures diagnose the old renderer; they are not a measurement of the finished bake. Summary artifacts: `scripts/performance/results/bramble-map-diagnosis-20260915-150247.json` and `.html`.

After replacing the live pass with the complete cached SVG bake, two full-scene
phases measured 19.07 and 18.52 ms/frame (p95 33.5/33.3 ms, max 34.3 ms, no >50 ms
frames). The buffer and scene counts match the prior diagnostic, except live
outline segments are now zero. The baseline ran under different host load, so
this is not a precise speedup claim. Raw measurements, methods and initial/arrival
screenshots: `scripts/performance/results/bramble-map-baked-ink-20260915.{json,html}`.
Sixteen focused tests pass; a repeated bake reuses all 43 files unchanged.

`?profile=post` isolates FXAA, colour grading, offscreen MSAA, target precision,
and foreground post-processing individually, then restores the full pipeline.
The September 15 diagnostic suggests offscreen 4× MSAA and FXAA are substantial
costs, but full-baseline GPU elapsed times drifted across the suite. Background
frame pacing stayed near 33.3 ms, so it cannot establish FPS gains or precise
per-effect costs. Raw samples and caveats:
`scripts/performance/results/bramble-map-post-stages-2026-09-15T05-11-56-147Z.{json,html}`.
Production visual settings were not changed by this investigation.

## Selection and traveller feedback

`selection-arrow.svg` is a new built-in GPT Image generation, converted through
Little Gods' six-colour cel preset, palette mapping and baked edge ink. Source
and prompt: `assets/bramble-map/source/selection-arrow.png` and
`selection-arrow-generation.json`. It bobs above the selected landmark, squashes
out over 130 ms into a compact smoke puff, then springs in over 340 ms at the latest
selection. Two reusable puff groups handle rapid retargeting without queued
transitions. Each uses one new generated smoke-pop SVG and two small satellite
lobes; landscape cloud art is no longer used for selection feedback. Reduced motion removes the
bob, rotation and puffs.

The traveller uses the game's `EmotePlayer`, `emoteEnvelope`, `deformReaction`,
`socialAccent`, original reaction SVGs and villager-v3 MP3 performances. Random
reactions avoid immediate repeats and wait a random 25–55 seconds after the
previous reaction finishes. The initial wait uses the same range. Walking and
arrival never bypass that cooldown. Symbols stay above the head and readable
when facing left. The generated puppet's face art remains intact; head/body/arm
gestures respond to reactions.

One audio context shares the original `soundRecipe` / `scheduleAudioRecipe`
foley and cached decoded voices. `wish-select` handles UI clicks, `slime-move`
quietly accents the puff, and `complete` marks arrival. Footstep landings use
actual `gaitSample` contacts, with Hearth/Solis/Cryos recipes based on the nearest
biome. Hitches don't replay missed steps. Audio unlocks on interaction, respects
the game's saved sound/voice preferences, stops when hidden, and disposes on exit.

All overlays use cached SVG geometry in the existing foreground layer; there is
no additional canvas, post-process pass, live outline shader or shadow caster.
`?feedback-test=1` exposes read-only diagnostic JSON for browser QA. Normal visits
have no diagnostic interval. Tests: `node --test
puppet-studio/experiments/bramble-map/feedback.test.mjs`.

To reproduce assets from the saved source:

```sh
node scripts/prepare-map-feedback.mjs
node scripts/map-bramble-palette.mjs selection-arrow selection-puff emote-humming emote-thinking emote-idea emote-delight emote-determined emote-cold
node scripts/prepare-map-silhouettes.mjs
node scripts/recolor-map-ink.mjs
npm run build
```

### Inflate / deflate and smoothing preview

Puppet Studio already supports keyed `visual.morph.inflate`, including negative
values for deflation, through `motion.morph` and **Shape & motion accents →
Inflate / bend**. `fx/morph-profile.js` shares its normalized bulge/taper/bend
formula between the existing canvas renderer and the map's vector adapter.
The arrow's bob combines a ±15% vertical squash/stretch with ±18% middle
inflation/deflation. Only its vertex positions deform; the cached SVG and ink
stay together. This adds no per-pixel stroke reconstruction or render pass.

The new puff source and prompt are in `source/selection-puff.png` and
`selection-puff-generation.json`. Rebuild with `prepare-map-feedback.mjs`, palette
mapping, silhouettes and cached edge baking. `feedback.test.mjs` covers signed
inflation, unchanged endpoints, timing bounds and no forced travel reactions.

`?aa=off` disables offscreen MSAA and FXAA on both map layers, plus default-canvas
multisampling. Palette grading and cached borders remain. `?aa=high` restores
the original 4× MSAA and full FXAA. The default is now `?aa=light`: FXAA with
three edge-search steps (formerly six), 0.65 subpixel blending (formerly 1),
and a higher threshold that skips low-contrast details. Multisampling is off
in this preset; render resolution, grading, cached borders and SVG text stay
unchanged. Both map layers use the same setting.

## Gameplay camera and floating action

Camera movement is controlled by gameplay only. Entering a location focuses and
zooms toward it; returning restores the overview before the next lock unlocks.
Drag, wheel, pinch and keyboard input no longer pan or zoom the scene. The
parchment margin still covers cinematic framing, and the overview keeps the
Cryos banner clear of the floating action. All rendered layers share one view.

Clicks and taps activate landmarks, scenery, clouds and birds; dragging does not
activate artwork. The parchment action button remains fixed on screen. Travel
clicks use a 280 ms squash/rebound and nine short-lived ink flecks. Reduced motion
uses a short opacity accent and suppresses particles.

Validation: camera math and level-transition tests cover framing and restoration;
button tests cover states and particle cleanup. The preview uses `?aa=light`.

### Light antialiasing validation

`?aa=light&profile=aa` runs high/light/light/high in one scene with 60 warm-up
frames and 90 measured frames per phase. The September 15 run improved initial
main/foreground GPU means from 13.45/18.70 ms to 6.87/11.16 ms, but later phases
had severe host-load drift, including unchanged shadow work. This is not reliable
FPS or speedup evidence. Light is retained as the requested visual quality preset.
The browser compiled both variants without errors; buffer size stayed 1584×1056.
Summary statistics and caveats: `scripts/performance/results/bramble-map-light-aa-20260915.{json,html}`.


## Parchment actions, biome reactions and occasional wildlife

The floating Travel / Enter / On our way button uses a new built-in GPT Image
backing, not CSS-drawn glass. `assets/bramble-map/travel-backing-generation.json`
records the complete prompt and source. Preparation uses the game's cel preset
with four-colour reduction (three retained fills), eight traced SVG paths, the
real palette mapper, and cached 2.2px silhouette ink. `travel-backing-ui.svg`
bakes the same palette into a standalone cacheable SVG for the CSS background.
Live Inkwell text and the existing click squash/particle burst stay separate.

Rebuild the new source assets with `node scripts/prepare-map-extras.mjs`, then
`node scripts/map-bramble-palette.mjs`, `node scripts/prepare-map-silhouettes.mjs`
and `node scripts/recolor-map-ink.mjs`. The latter also emits the palette-baked
button SVG; no per-frame edge processing is involved.

The eight-reaction pool always includes thinking, humming, idea, delight,
determined, cold, overheated and love. Solis weights overheated ×6; Cryos weights
cold ×6; Hearth and the grove weight love ×6. Other reactions retain weight 1
(walking humming/determined weight 2); only the immediately previous reaction
is temporarily excluded. Icons, voice recordings and puppet gestures come from
Little Gods. Cooldowns remain random 25–55 seconds after the previous emote ends.

`MapWildlife` uses a generated four-piece parchment wren (body, head, wing,
tail), with articulated wings and the game's `birdFlightPosition` movement.
`WildlifeVisits` schedules a first visit after 18–45 seconds, then a fresh random
25–70 second quiet interval after each 14-second visit, with random direction.
Butterflies are disabled and their art is no longer loaded by the demo.
Reduced motion suppresses visits.

The bird uses the same 4.4-map-unit baked edge ink as the scenery, with each
piece's display width accounted for during baking. Source and prompt are in
`assets/bramble-map/map-wren-generation.json`; rebuild with
`node scripts/prepare-map-bird.mjs`, then palette mapping, silhouettes and ink.

Flying silhouettes are projected onto the ground along Little Gods' actual sun
direction, using their current altitude and ground position. Higher flights cast
more offset, fainter shadows. Ground position also determines painter order so
birds can pass behind or in front of landmarks. Shadow geometry follows puppet
articulation; the existing two shadow targets are reused. Traveller silhouette
coverage is .25.

### Harvestable scenery and reward drops

`map-scenery-effects.js` runs the game's `createActionEffects`, `treeMotion`,
falling-leaf trajectories, hit timing, chips, sound and falling-tree dissolve.
Three hits fell a tree or break a rock. Trees retain their stump; rocks disappear. After an independent 20–35-second
cooldown, each depleted prop fades back over 1.2 seconds. Stumps and shadows
crossfade with returning trees; interaction and fresh drops reset when the fade
finishes. No scale/growth animation is applied.
Scenery and location controls have no visible focus cue, as requested.

Generated Hearth/Solis/Cryos stump and leaf variants match the map tree artwork.
The native effect tools accept optional `stumpAssets` and `leafArtIds`; existing
game callers keep their original defaults. Reused leaf meshes switch geometry
and art metadata to the current species. Stumps inherit their region's colour
reveal and use the shared dark baked edge treatment. Their widths and horizontal
anchors follow the original root footprints in `scenery-art.js`; the two-trunk
Hearth prop leaves two separately sized stumps. They draw behind the falling tree. Effect materials render in
the transparent queue so the map background cannot cover stumps or leaves.
Source, references and full prompt: `assets/bramble-map/map-tree-effects-generation.json`.
Rebuild with `node scripts/prepare-map-tree-effects.mjs`, followed by palette
mapping, silhouettes and ink baking.

Wood and stone use the game's resource SVGs. On destruction two or three rewards launch
in staggered sideways arcs, squash on landing, rebound, then hold before fading
at 2.1 seconds each. Resources have the shared 4.4-unit baked edge ink and
height-aware silhouette shadows. Each first landing triggers a quiet native
wood or mining impact sound. Shadow registrations are removed with the rewards. Reduced motion shows a still reward. These temporary meshes and
materials are disposed after their animation.

The travelling label has three staggered dots: dip/squash, stretch upward,
land/squash, rebound, rest. Nodes remain stable when selection changes during a
journey. Reduced motion keeps the dots still; accessible destination text remains
on the button. Styling affects only transforms, with fixed dot/label width.

Validation: 11 focused feedback/camera/button tests pass, including all eight
reactions remaining reachable, exact local weighting, cooldown bounds and bird
path/facing bounds. Headed preview showed the parchment Travel button, the
travelling state, and an articulated bird flyby, without browser errors.


Current validation: 17 focused map tests and 2 native action-effect tests pass,
including randomized bird scheduling, airborne shadow projection, reward landing
and rebound, and switching species on a pooled falling-leaf mesh.

Cloud drift uses Little Gods' native periods, drift rate and meandering curve.
Drift and depth amplitudes scale with each cloud's displayed width, preserving
the original game's proportions. The upper-left wisp's anchor and phase keep
its wider path inside the map. Shadow silhouettes follow the same transforms.

### Playful clouds

Click or tap a cloud for a short damped squash/stretch jiggle and the game's
`slime-hit` squish sound. Cloud clicks unlock audio before scheduling the sound,
including on the first interaction, and respect the existing mute preference. Each cloud chooses
its own 3–6-click threshold; reaching it starts a 4–8-second local rain shower.
The next threshold is rolled when that shower ends. Clicks during rain still
jiggle the cloud without extending the shower. Enter/Space work too, with no
focus outline; dragging does not move the camera or trigger clicks.

`cloud-rain.js` adapts Little Gods' seeded drop lifecycle, tapered streaks and
expanding splash rings to a local footprint below each cloud. Each cloud uses
one pooled instanced draw (40 drops plus their splashes), hidden while dry; no
new post-processing or shadow pass. Rain follows the drifting cloud and renders
below cloud art and labels. Reduced motion keeps jiggle/rain positions still.
`cloud-play.test.mjs` covers per-cloud random cycles, retriggering, expiry, reduced
motion, pooled geometry and following the current cloud position.

Cloud showers reuse the game's exact seven-second stereo `weatherSamples` rain
buffer and 200–3100 Hz filter chain, through the map's existing audio context.
A quiet shared loop follows the strongest current shower, so overlapping clouds
do not stack volume. Gain eases over 180 ms and the source stops once faded.
Weather volume/enabled preferences and the map's master mute are respected;
hiding the tab or resetting the map immediately stops the loop.

### Clicking the bird

The bird has a moving click target (also Enter/Space). A hit disables further
hits for that visit, applies Little Gods' `bindHitFlash` shader, plays its
`bird-hit` wood impact, and spawns six warm feather SVGs.
The feathers reuse the game's chicken-feather artwork, map palette and baked
edge ink. Their four-second spread/flutter/fade follows the game's
`village-creatures-view.js` formula. The existing generated map puff covers impact.
Bird fall uses the native squared-time descent, 0.4-second tip and 2.2-second
death fade; its existing shadow follows descent and opacity. The visitor slot
ends after the feathers clear, then schedules the usual random quiet interval.
All effect meshes are pooled and reused on the next visit.

All eight emote icons join the same cached silhouette-ink pipeline. The bake
uses their actual 58-unit display box (accounting for aspect ratio) and the
shared 4.4-unit dark edge width. Exterior contours and transparent holes get
the edge treatment, while original interior colours and detail remain intact.

The map's warm bird uses Little Gods' native `bird-hearth` call once per flyby,
after a short randomized delay and only while inside the map. A killed bird
does not keep calling. Hits play only the game's `wood` cue, matching the
`bird-hit` event mapping; there is no added slime sound.

Each location's first introduction plays a tuned native `pot-place` cue quietly
40 ms into its pop animation. Startup randomly chooses one of five six-note
pentatonic melodies; replay chooses a different phrase from the previous one.
Each phrase stays fixed for all six reveals, with the native placement thump
and noise beneath it. Each play varies its volume
(.36–.44), ringing duration (225–275 ms) and tuning (±6 cents); reveal timing
stays synchronized. The event is consumed once, so hovering, selecting
and visiting cannot retrigger it. Replay resets the introduction cues. Suspended
audio, reduced-motion reveals and missed frames do not queue a delayed burst.
Audio is primed during initialization where browser autoplay permits; normal
user gestures still unlock it when required.

Every startup and replay also rerolls each path's drawing duration between
220 and 460 ms. Landmark pops stay crisp at 240 ms; each next landmark begins
when its incoming path finishes, with its melody note following that pop.
The full introduction stays under four seconds. This only changes the opening
reveal rhythm; the traveller's walking speed is unchanged.

Passing an intermediate landmark plays a quieter version of that landmark's
melodic pop, with the same random expression. It triggers once per crossing
in either direction, including on return journeys through already visited
locations. The final stop retains its existing arrival sound.

## Location progression and lock

Hearth starts visited but uncleared. Enter Hearth and finish its temporary
level-clear transition to unlock Warden’s Grove. Each later location becomes
travelable only once its predecessor is cleared; clearing is separate from
arrival and map coloration. Selecting
or hovering never unlocks travel. The action says “Locked” for blocked choices,
and the travel handler independently enforces the same rule.

Only the nearest blocked location displays the generated `location-lock.svg`.
On first clearing its prerequisite, that lock gives a short squash/stretch rattle,
disappears into the generated selection puff, and plays the game's
`belief-discovery` sound. After 380 ms the next frontier lock pops in with a
quiet native `pot-place` cue. The final unlock leaves no lock. Replay resets
progression and the pooled feedback; reduced motion uses fades.

Art provenance and the exact built-in GPT Image prompt are in
`assets/bramble-map/source/location-lock-generation.md`. The lock uses the same
palette mapper, cached SVG geometry, and baked outer/hole ink bands as the map.

## Selection while travelling

A separately GPT Image-generated journey pennant marks the active destination
only while a different location is selected. It uses the same squishy pop,
inflation and bob, and hides on arrival or when the destination is selected
again. Its color-reduced SVG uses the Little Gods palette, baked thick edge
bands, and the same inflation shader as the selection arrow. Its SVG geometry
is cached with the existing feedback artwork. Rebuild with
`scripts/prepare-map-destination.mjs`, the palette mapper and edge-ink scripts.

“On our way…” applies only to the selected active destination. Other unlocked
selections show “Travel here”, including the departure location during travel;
blocked choices still show “Locked”. Clicking Travel retargets from the exact
current point on the path, choosing the shortest way via either endpoint.
Partial segments retain constant walking speed and preserve only already
travelled path ink, including when the traveller turns back.

During the opening reveal, the lock entrance and its sound fall on the half
beat between its location's pop note and the next location's note. This uses
that run's randomized path duration, keeping the accent rhythmically spaced.

Selecting a locked location uses Little Gods' short descending `wish-invalid`
cue instead of `wish-select`, including repeated clicks and keyboard selection.
It retains the native random pitch variation and existing audio unlock/mute
handling. The location remains inspectable and travel remains locked.

A killed bird plays a separate soft native `slime-land` thud on its first
zero-height frame. Flight height determines impact timing; the hit cue remains
at the click. A per-death latch prevents repeats while grounded or fading.

The Locked action remains clickable: it plays `wish-invalid` and a 300 ms
squishy side-to-side rejection shake, without starting or redirecting travel.
Repeated presses restart the feedback. Reduced motion uses a brief opacity pulse.

## Enter and temporary level clearing

Enter gives the parchment button a distinct squash/lift response and native
`pot-add` cue. The camera eases toward the location and zooms in, then a circular
WebGL fragment-shader iris closes around its projected center. It covers the
whole browser viewport, including live labels and the button, holds fully black
for 240 ms, then reverses. Native `wish-nightfall` / `wish-daybreak` cues accompany
the wipe. Once the scene is visible again and the camera has returned to the full-map overview, a temporary clear outcome plays the
`skill-level-up` cue, a landmark squash/rebound and a warm particle burst.
The entry and wipe cues are deliberately quiet (.32 and .14 gain respectively).
The camera uses a small anticipatory pullback and a soft rebound; the iris
edge has a subtle organic wobble. Clearing and unlocking occur only after the
zoom-out finishes, keeping the next lock in view.

The first clear unlocks the next location and advances the single lock marker.
Entering an already cleared level can replay the effect but cannot unlock an
additional level. Map interactions are inert during the transition; repeated
Enter presses cannot start another transition. Reduced motion keeps the camera
still and fades to black. The iris uses one quad, no multisampling or copied
scene texture, and does not render while idle. Replay clears all level progress.

The iris now begins closing 120 ms into the camera move. Reopening and the
return to the overview start together; clearing still waits for both to finish.
The overlap removes the stop/start staging without hiding the unlock.

Emote edges use a 3-unit band with finer curve sampling. Tiny disconnected
accents and openings cap the band to their local size, preserving side curls,
rays and dots instead of filling them with ink. Interior source art is unchanged;
all corrections remain baked SVG geometry. Visual comparisons are in
`work/emote-ink/cleaned-comparison.png` (source beside cleaned output).

Enter randomly chooses among native pot-add, bowl and pot-place cues; completion
chooses skill-level-up, belief-discovery or offering. Each family avoids its
previous cue independently, retains the native pitch variation, and varies its
balanced gain by ±8%. These variations do not change transition timing.

### Title screen

The initial screen uses GPT Image lettering (`assets/bramble-map/source/title-logo.png`), converted by `scripts/prepare-map-title.mjs` with Little Gods' cel color reduction and SVG tracing. The map palette and baked ink pipeline produces `title-logo-ui.svg`; the exact generation prompt is saved beside the source. Rebuild with `node scripts/prepare-map-title.mjs`, `node scripts/map-bramble-palette.mjs title-logo`, `node scripts/prepare-map-silhouettes.mjs`, and `node scripts/recolor-map-ink.mjs`.

`title-screen.js` accepts a click/tap or an ordinary keyboard key once loading finishes. It unlocks native Little Gods audio on that gesture, squashes/stretches the title, and overlaps its fade with the map's first reveal. The map stays inert and its animation clock does not start behind the title. Repeat input cannot start it twice. Reduced motion uses a short fade. Reload to see the title again.

The overview now uses zoom `0.88` and center `(720, 525)`, leaving clearance for the
selection arrow and its overshoot above the tallest landmarks. Camera control
remains gameplay-only.

`?capture=trailer` optionally shows a small recorded cursor/click ripple and
connects the game's actual audio master bus to MediaRecorder. F8 begins audio
capture and F9 saves it through the local receiver on port 4355. This records real
input; it does not script interactions or change gameplay. Normal URLs do not
mount the recorder or cursor.

### Sunflower at Warden’s Grove

The tree now has a second independent character. `sunflower-resident.js` mounts
all three authored SVG views from the sunflower study, reuses its pose sampler,
and displays the front view at the Grove. Its stem sways, head lags and gently
squashes, and hands follow through. Click it or press Enter/Space to wave; it
also greets the approaching traveller. Introduction, pause, camera and reduced
motion use the map clock/settings. Both actors use the existing vector foreground pass. Whole-character drawing
slots sort by their ground Y positions, with stable ties and independent local
limb order. The sunflower is about 94 map units tall (the traveller is about 93).
`prepare-map-sunflower.mjs` crops attachment artwork and bakes the shared
4.4-unit silhouette ink into cached SVG assets at that display scale. Curved
stems use filled mesh strips with matching dark borders; all parts also enter
the existing silhouette shadow pass. The raised hand and arm paint over the
face in the map, SVG study and exported Studio rigs. No extra WebGL pass is added. Existing travel and unlock progression remains in place.
