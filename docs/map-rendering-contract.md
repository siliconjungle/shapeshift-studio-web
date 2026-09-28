# Map asset rendering contract

The user's requested 2D outline operation is an asset preparation step. Do not
add a live Perfect Freehand contour pass to the Bramble Map renderer again.

- Generated art follows Little Gods colour reduction, SVG conversion and palette mapping.
- `scripts/map-edge-ink.mjs` writes the finished border as filled SVG paths at alpha boundaries, including transparent holes. Preserve original internal linework and surface shading. Exclude compass/background.
- `scripts/recolor-map-ink.mjs` keeps original vectors and hashes source, contour loops, authored display width, ink style, bake implementation and output. Unchanged builds reuse the persisted SVG. New art must run silhouette preparation before baking.
- `ink-style.js` shares one final map-space width with route marks. Banners use a smaller width. Camera/viewport scaling is inherited by the prepared vector geometry; authored size changes invalidate the bake.
- Each SVG is loaded/triangulated once and shared by instances. Pose, sway and colour activation operate on the retained mesh. They must not regenerate outlines.
- The small ink mask only excludes the baked edge colour from arrival desaturation; it performs no stroke construction. Keep it separate from interior painted lines.

## Evidence — 15 September 2026

The old live pass used 178 Perfect Freehand fragment-shader stroke segments.
Earlier diagnostic: 113.70 ms/frame full, 20.19 with live outlines disabled.
The new complete scene measured 19.07 and 18.52 ms/frame in two short full phases;
p95 33.5/33.3 ms, maximum 34.3 ms, no >50 ms frames. Same 2160×1440 buffer,
50 art records, 120 route marks, 54 shadow casters; live outline segments: zero.
Baseline host load differed, so don't claim an exact speedup or universal FPS.

Artifacts: `scripts/performance/results/bramble-map-baked-ink-20260915.{json,html}`,
initial and arrival PNGs, prior `bramble-map-diagnosis-20260915-150247.{json,html}`.
Tests: 16 passes across `ink-colours.test.mjs` and `map.test.mjs`. Second bake:
0 rewrites, 43 cache hits. Scoped esbuild dependency check excludes both
`svg-outer-ink` and the 3D Perfect Freehand shader. Browser reported no errors;
Grove arrival retained dark ink, coloured artwork and route progress. Server and
rendering were stopped after checking because the user reported host slowdown.

Rejected: merely hiding the outline shader at runtime, or caching its uniforms.
The actual border geometry must be in the reusable asset files.

## Post-processing diagnosis

`?profile=post` swaps exactly one setting per phase: FXAA, grade call, offscreen
4× MSAA, half-float versus byte target, foreground post-processing; original
shader/target settings are restored. A focused mock check verifies restoration.
The 2026-09-15T05-11-56-147Z post-stages JSON/HTML retains the complete run.
No-MSAA had the lowest elapsed GPU timers, with no-FXAA also lower; baseline
elapsed values drifted heavily and background frame pacing stayed at ~33.3 ms.
Do not treat those differences as isolated GPU costs or use the anomalously
slower no-colour-grade phase to conclude grading is expensive. Retain normal
visuals until a controlled confirmation supports a change. Diagnostic preview
was stopped; the already running server was not ours to stop.

Selection feedback uses the existing signed `visual.morph.inflate` model. The
canvas formula and vector vertex helper live in `fx/morph-profile.js`; avoid
implementing a fresh per-pixel deformation/outline pass. The arrow squashes and
inflates at the bottom of its bob and stretches/deflates at the top. Selection
puffs use `selection-puff.svg`, not scaled landscape clouds. Reactions use a
25–55 second random quiet interval after each emote ends, with no forced reaction
at travel start or arrival. Twenty-one focused checks passed and browser shaders
reported no errors. The current `?aa=off` preview remains available.
