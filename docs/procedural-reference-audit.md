# Procedural reference audit

Status: reference mechanisms and requested authoring paths verified. This audit maps primary reference behaviour to current authoring/runtime evidence; completion is based on the coverage below, not test counts alone.

## Codeer — native 3D spider

Primary: [Unity procedural animation tutorial (10 steps)](https://www.youtube.com/watch?v=e6Gjhr1IP6w). Inspected the actual public video in a browser at 5, 11, 17, 23, 29, 35, 41, 47, 53 and 58 seconds on 2026-09-15. These cover all ten numbered steps. The final body-tilt instruction is visible at 58 seconds; the video lasts 64 seconds.

| Reference behaviour | Current implementation / evidence |
| --- | --- |
| IK segments reach a foot target | Generic native `addSceneChain`, reach/step modes; numerical endpoint and segment-length checks |
| Foot remains planted as the body moves | Persistent world contact, also stored relative to moving terrain; planted-contact tests |
| Body-relative foot home | Ordinary target node parented to the body, editable in Chain settings |
| Ground query beneath the home | CPU primitive raycast with configurable world direction/range; rotated ramp and sphere/box geometry |
| Distance threshold triggers a new step | Stride threshold, lifted interpolation, overshoot; browser edits the actual controls |
| Alternating legs | Editable gait groups; default walker uses diagonal pairs |
| Opposing group stays planted | Group sequencing and non-sliding foot tests across the ramp |
| Body height from supporting feet plus clearance | Smoothed support-plane height and editable clearance |
| Body tilt from foot heights | Fitted support plane, configurable tilt limit and response |

`verify-procedural3d-browser.mjs` exercises eight native primitive legs, terrain contact, support, an existing cone link and a shaped foot. Editor and portable link/foot matrices match. `verify-procedural-movement-browser.mjs` adds a target-driven body without movement keys and verifies the combined system. The runtime is generic; the study supplies scene nodes and controller data.

Scope note: the reference demonstrates planted opposing legs in reachable terrain. The tool reports unreachable contacts; it does not promise that any limb proportions or terrain are traversable, and it does not implement whole-link obstacle avoidance.

## Fresh fixed-tentacle authoring

`verify-procedural-authoring-browser.mjs` starts with an empty procedural definition, builds an eleven-point reaching chain through the panel, enables a curved fill, adds an independent ink layer and downloads SVG. It verifies the fixed root, ten 18-pixel links, sub-.001-pixel target error, JSON rendering, layer independence and SVG groups. The primary sketch and live-input verification are recorded below.

### Coding Train primary sketch inspected

The [linked p5 sketch](https://editor.p5js.org/codingtrain/sketches/p8hH8INCv) was inspected through its public project data endpoint. `sketch.js` creates a configurable chain (the example has forty equal-length segments). `RobotArm.update` follows the mouse backward through the chain, restores the base, then places segments forward; `Segment.follow` keeps the segment length while pointing toward its target. The Studio reaching-chain solver supplies fixed-base inverse kinematics and configurable lengths/counts; the fresh-authoring browser test proves the editable equivalent. Per-segment colour can be authored as separate surfaces. Live pointer input is now verified below.

### Live target API found

`ProceduralSimulation.step(dt, {targets})` accepts live XY overrides keyed by driver particle ID. `applyPins` consumes the override before constraint and IK evaluation, without mutating the definition. The deterministic `ProceduralTimeline` samples authored drivers and does not replay arbitrary external input.

### Live input evidence completed

The portable `createProceduralPlayer` feeds external targets into the existing shared simulation and supplies its solved frame to the same renderer and sprite bindings. The editor's live preview accepts actual pointer movement. The browser verifier checks the fixed root, endpoint error, deterministic input replay, invalid input rejection, release back to the authored driver, unchanged source JSON, cleanup, and pixel-identical portable rendering. This closes the identified Coding Train mouse-input gap. Arbitrary input is not automatically recorded into timeline keyframes.

### Argonaut spine and limb composition

Inspected the primary `Fish.pde` and `Lizard.pde` in [Argonaut's source](https://github.com/argonautcode/animal-proc-anim). The lizard combines a fourteen-point constrained spine, body-relative foot homes, threshold-based stepping and two-link limbs. The editable `spine-limbs` study composes those mechanisms with weighted attachments, target-position stepping, gait groups and curved surfaces. Its timeline test checks planted contacts, reach and length preservation across motion and replay; the browser verifier changes stride and compares editor/portable pixels.

This composition exposed two solver issues now fixed: attached limb roots must update before their limb solve, and kinematic outputs must not accumulate unrelated free-body inertia. A separate regression checks that soft points can still be spring-connected while chain outputs remain controlled. Uniform-distance contour sampling also removes jagged ink caused by densely tessellated curved limbs.

### Bend-driven fish surfaces

The primary [Fish source](https://raw.githubusercontent.com/argonautcode/animal-proc-anim/main/Fish.pde) uses body-relative paired fins and signed spine turns to vary its tail and dorsal contour offsets. The new optional attachment bend response supplies that reusable mapping. It measures accumulated turns along a chosen point path, scales them into local XY offsets, and optionally clamps or takes the absolute amount. Measurement inputs participate in the dependency graph and library remapping. The attached outputs can drive generated contours or existing sprite bindings.

The data-only `bend-fins` study uses a twelve-point spine, body radius profile, paired fins, bend-driven tail/dorsal contours and eyes on independent layers. It uses a small baseline width for straight fins and an interpolating contour instead of matching the reference's exact Bézier construction. `verify-bend-fins-browser.mjs` edits the response and angular limit, tests undo/redo, and compares editor/portable pixels at three times. Offset error is zero; the measured local displacement changes from +8.13 to -6.68 pixels. Five core tests cover signed/absolute/clamped response, rotation/translation, turns beyond 180 degrees, degenerate edges, validation, ordering, copying, deletion, replay and sprite binding scale.

## Binary Lunar — layered sprite spider

Primary: [Recreated Limbo Spider Using Procedural Animation in Unity: Concept Tutorial](https://www.youtube.com/watch?v=ZRBS-WF7vkQ). Direct public browser playback succeeded by loading timestamped watch URLs. Actual video frames were inspected at 60, 120, 180, 240, 300, 360, 420, 450, 480, 510, 540, 600 and 660 seconds on 2026-09-15. The transcript panel remained empty; no claim relies on a recovered transcript or paid project files.

The visual evidence shows layered Photoshop artwork (120s), three-segment sprite bone chains (180s), four CCDSolver2D instances (240s), a moving kinematic body with fixed foot targets (300s), and foot mover state, target positions and ground-query gizmos (360–540s). The final scene adds environment artwork and postprocessing (600–660s). The creator labels this a conceptual explanation rather than a step-by-step tutorial.

The editable `sprite-walker` study binds thirteen original SVG sprite pieces to a supported body and four three-link stepping chains. The implementation uses the shared fixed-length reach solver rather than Unity's CCD component. Threshold steps, lifted arcs, terrain queries and gait groups are reusable data. Tests run eleven seconds across terrain, check at least two planted legs, preserve sprite scale and all link lengths, and replay without changing source JSON. The browser check edits foot lift and finds identical editor/portable pixels, maximum matrix error 1.5e-14 and foot reach error below .001 pixels.

## Reference and requirement coverage

| Reference / requirement | Reusable controls | Evidence |
| --- | --- | --- |
| Argonaut fish, snake and lizard | Following chains, angle limits, radius profiles, bend-driven attachments, body-relative foot homes, top-down stepping | `bend-fins`, `spine-limbs`; source inspection, geometry tests and browser proofs |
| Argonaut soft frog | Verlet particles, distance/bend constraints, area preservation, curved loops, weighted limb and face attachments, collision | Primary Blob source; `soft-creature`, area/attachment tests and browser proof |
| Codeer 3D spider | Native 3D chains, primitive terrain, planted contacts, alternating gait, body height and tilt | All ten primary steps inspected; native walker browser proof |
| Coding Train tentacle | Configurable fixed-base reaching chains and live targets | Primary sketch inspected; fresh authoring and live-pointer browser proofs |
| Weaver gecko | Native limb stepping, foot orientation, body support, smoothed head/eye tracking, target-following root movement | Primary tutorial; tracking and movement tests/browser proofs |
| Binary Lunar sprite spider | Existing sprite bindings and three-link stepped limbs | Primary video frames; `sprite-walker` numerical/browser proofs |
| Dynamic fills and ink | Curved loops/tubes, layer unions and holes, Perfect Freehand outlines, SVG export | Geometry/export tests and fresh two-layer SVG authoring proof |
| Rigid and soft pieces | Rigid groups, soft areas/springs, bindings to original artwork | Core constraints, soft sprite and library/source tests |
| Opt-in existing outlines and joins | Recognise authored contour pigment, repair internal seams, protect outside ink and internal markings | Outline connection and soft sprite browser proofs; no rewrite when disabled |
| Reusable authoring | Editable topology, per-layer surfaces, independent controllers, JSON, undo/redo, library capture/import/update | Fresh authoring plus library and transactional tests |
| Hybrid mesh and puppet objects | Native chains can drive linked puppet planes fitted to dimensions, with axial camera facing | `verify-hybrid-flat-browser.mjs`: endpoints, animated source, socket fitting, camera views and portable pixels |
| SVG-like 3D appearance | Smooth normals, coloured shadow/highlight regions, refined outlines, independent solid fill and crease lines | `verify-hybrid-flat-browser.mjs`: SVG / solid / scene-lighting modes in both pipelines; undo and crease toggle |

The examples are ordinary authored documents. None of the solvers switches behaviour on a creature or study name. Reach limits, point-based soft-body contacts and undeformed primitive terrain remain documented constraints; reproducing the reference mechanisms does not promise arbitrary obstacle navigation or automatic semantic recognition of every imported drawing.


### Hybrid and flat renderer evidence

The hybrid study combines a native sphere mesh body with eight linked puppet pieces, driven by four native 3D stepping chains. The camera test covers orthographic and perspective projection from three directions at three clip times. Maximum endpoint error is 1.5e-15 metres and editor/portable matrix difference is 5.6e-16; frame pixels match exactly. The marking animation changes the original puppet texture, fitted joint socket position has zero error, and sampling leaves authored JSON unchanged.

An isolated sphere has broad coloured regions in SVG shading and exactly one interior colour in the separate solid mode, in both rendering pipelines. Smooth surface normals replace triangle-based normals in the standard renderer. Curve refinement and outline-hull normal joining have numerical tests; material mode, contrast, softness and smoothing are independently stored and undoable. The native eight-leg primitive/terrain/foot browser regression passes. Current suites: 85 core and 57 web tests, 142 total; standalone build passes.


### Little Gods material treatment

The **Little Gods ink preset** is shared schema data: 0.025-metre near-black mesh contours, independent of object size, crisp palette bands and preserved original SVG paint/shading. Authoring controls expose the preset, screen/object sizing, relative thickness and artwork preservation. The hybrid study uses it on its mesh body while retaining the original linked puppet strokes. `verify-little-gods-style-browser.mjs` covers UI edits/undo, rendered thickness under zoom, and unchanged source paint/holes in both renderers, including SVG extrusions. The source distinction and portable fields are documented in `procedural-authoring.md`.


The ink implementation now includes an actual Perfect Freehand 1.2.3 shader port, selected by the Little Gods preset. GPU-reference comparisons are in `verify-freehand-shader-browser.mjs`; the CPU provides centreline points, while the GPU constructs and fills strokes. Stable object-space input variation, material smoothing controls, and preserved source SVG/puppet ink are documented in `procedural-authoring.md`.
