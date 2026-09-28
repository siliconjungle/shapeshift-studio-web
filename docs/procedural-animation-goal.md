# Procedural animation authoring goal

Requested outcome: ShapeShift Studio can author the techniques in all six supplied references as reusable tools, including dynamic fills and Perfect Freehand style outlines per selected layer. Creature-specific runtime code is not an acceptable substitute.

## Current result

All six reference mechanisms have a reusable authoring path and recorded runtime/browser evidence. The [reference audit](procedural-reference-audit.md) is the current acceptance record; the passes below retain the development history and earlier open-item notes.

Latest additions include bend-driven fins/attachments, three-segment sprite walkers, and native mesh bodies with editable puppet legs. SVG-style 3D shading uses smooth normals and broad coloured shadow/highlight regions in both renderers, with independent solid-colour, smooth-outline and crease controls. The hybrid camera/export proof, native eight-legged walker regression, 140 numerical/integration tests and standalone build pass. See [authoring controls](procedural-authoring.md) for usage and documented geometry/contact limits.

## Acceptance matrix

- Argonaut fish/snake/lizard: distance and bend-constrained spines, variable body radius, fins/limbs, target following and stepping.
- Soft body reference GXh0Vxg7AnQ: deformable particle networks, area preservation, rigid/soft coupling, collision and visible dynamic surfaces. The video description and the author’s Blob/Frog/Limb source have now been inspected; see the soft-creature pass below.
- Codeer spider: multiple coordinated stepping limbs, terrain contacts, body adjustment; 3D reference requires assessing 3D authoring support as well as 2D.
- Coding Train fixed tentacle: anchored arbitrary-length IK chain reaching an editable/live target.
- WeaverDev gecko: coordinated quadruped stepping, secondary movement and body following.
- Binary Lunar spider: independently configured limbs and seamless silhouette presentation.
- User-authored topology, reusable builders and parameters; saved project data, commands, undo/redo, export and playback.
- Per-surface/layer selection, fill, dynamic outer silhouette, holes and overlapping groups; actual Perfect Freehand contours where selected.
- Rigid and soft simulation share a clock and coordinate system. Scrubbing/replay must be deterministic.
- Existing artwork/joints can participate; no change for projects that do not opt in.
- Browser QA of authoring, motion, layer styling, persistence and export; numerical constraint/contact tests and package build checks.

## Architecture

Shared DOM-free model, constraints, simulation and contour generation belong in `shapeshift-studio-core`. UI, example documents and interaction belong in `shapeshift-studio-web`. The current web editor is authoritative; `research/shapeshift-studio` is an unrelated older workstation.

## Reference sources

- https://github.com/argonautcode/animal-proc-anim
- https://www.youtube.com/watch?v=qlfh_rv6khY
- https://www.youtube.com/watch?v=GXh0Vxg7AnQ
- https://www.youtube.com/watch?v=e6Gjhr1IP6w
- https://www.youtube.com/watch?v=RTc6i-7N3ms
- https://weaverdev.itch.io/procedural-animation-tutorial
- https://www.youtube.com/watch?v=ZRBS-WF7vkQ
- https://github.com/steveruizok/perfect-freehand

Completion remains unproven until this full matrix is demonstrated. A first integrated 2D authoring implementation does not by itself close the goal.

## User steering

- Puppet sprite pieces are first-class: rigid point/chain bindings and soft deformation must retain existing art and draw layers.
- Existing outlines must be recognized when pieces opt into connections. Preserve external ink, textures and internal markings; do not replace every image with a generated silhouette.

## Current implementation evidence

The reusable 2D simulation, per-layer contour renderer and authoring panel are integrated. Sprite pieces can follow points or deform as textures. Opt-in sprite-to-sprite recognition and sprite-to-generated-fill seam repair are integrated into normal and portable rendering. The outlined snake study and browser pixel checks cover the latest sprite/outline requirements. See [authoring and verification](procedural-authoring.md) for exact controls, checks and current limitations.

### Coordinated locomotion pass

- Added explicit alternating gait groups, step overshoot, contact normals, and stable planted-foot targets.
- Added smoothed body height/tilt correction from the supporting feet, applied to ordinary rig points before IK and sprite bindings.
- Added editor controls and upgraded the walking study to use diagonal groups and body support over a ramp.
- Numerical tests cover fair groups, non-sliding reachable feet, terrain clearance, no accumulated offset, stopping after travel, unreachable-contact reporting, rewind, deletion cleanup and source extraction. Web integration covers save/undo/redo and portable source data.
- Confirmed the WeaverDev source describes tracking, home-position stepping, overshoot, easing, alternating diagonal pairs, and root motion. Its current tutorial URL is https://weaverdev.io/projects/proc-anim-tutorial/ (the older blog URL redirects through HTML).
- This closes part of the 2D locomotion gap. Full 3D equivalents, runtime terrain/body collision robustness and library component persistence still require work; the full goal remains unproven.

### Native 3D primitive authoring pass

The user's explicit 3D requirement is now implemented for reusable reaching/following/stepping chains, grouped gaits and terrain-based body support. The eight-legged study uses actual primitive scene objects, not a 2D puppet plane. Existing objects can replace individual links while keeping their geometry and material. Scene-space contact queries support basic terrain primitives and animated terrain transforms.

Numerical tests cover endpoint/primitive agreement, animated parents, knee direction, terrain normals, planted contacts, body tilt, deterministic rewind and reference cleanup. The browser test edits controls, rebinds a cone and compares editor/portable-player transforms. Full completion remains unproven: collision robustness (including link/obstacle avoidance and shader-deformed terrain), library capture/placement of complete procedural rigs, and the remaining reference-by-reference acceptance audit are still open.


### Procedural library persistence pass

Library capture, placement, source updates, previews and JSON export/import now retain complete connected 2D and native 3D procedural definitions. Sprite bindings, dynamic layer settings and opt-in outline connections are remapped to the placed instance. Native 3D chains retain their independent primitive links, targets and terrain nodes. Embedded 2D procedural puppets survive 3D library dependency import. Separate placements preserve gravity/drag and receive independent controller IDs; local setting overrides survive source publication.

Evidence: `library-procedural.test.mjs` covers translated solver poses, sprite matrices, mixed physics settings, source updates from translated instances, animated terrain tracks, JSON, undo/redo and malformed import rollback. `verify-procedural-library-browser.mjs` exercises the actual capture/export/import/place UI and animated 2D/3D shelf previews. A folded-chain translation test also exposed and fixed an ambiguous half-turn bend caused by floating-point roundoff.

Remaining completion work: stronger coupled body/terrain collision behaviour; inspection and acceptance checks for the exact soft-body and remaining video references; and a final end-to-end authoring audit against every reference. Generated-only component ownership currently groups a simulation for persistence; it does not automatically turn an arbitrary root transform into a moving physics coordinate system.


### Soft-creature attachments and swept contact pass

Primary reference inspected: [Simulating soft body animals](https://www.youtube.com/watch?v=GXh0Vxg7AnQ) and [the author’s source](https://github.com/argonautcode/soft-body-proc-anim). The source uses Verlet motion, perimeter constraints and area restoration for a blob, interpolated body points for shoulder anchors, a body-derived orientation for the face, and separately constrained limbs. Its collision handling is point/bounds based. The reusable implementation here uses an area constraint rather than copying the reference’s dilation code.

Added editable weighted attachments, optional body-oriented offsets, dependency ordering and cycle validation. The soft-creature study combines these with a soft loop, bend/distance constraints, independently layered fills/ink and an existing sprite face. Source extraction, library remapping, deletion and undo/redo include the new attachment references. Point contact now sweeps through finite segments and expanded circles, so fast particles cannot tunnel through thin terrain; bounce and simultaneous corner response have regression tests.

Evidence: core attachment/contact tests; web soft-creature area, rigging, replay and library tests; `verify-soft-creature-browser.mjs` exercises the controls and finds zero position error and identical editor/portable pixels. The landing frame retains more than 99.99% of the target body area. Screenshot review confirms a deformed body, separate hind limbs and intact sprite features. Full-goal completion is still unproven until the remaining reference-by-reference authoring audit is finished; exact filled-contour or link collisions are not implemented by point sweeps.

### 3D shaped-foot reference audit

The [WeaverDev tutorial](https://weaverdev.io/projects/proc-anim-tutorial/) explicitly interpolates a foot's rotation toward its home transform during a step. Native 3D chains previously moved their joint primitives without supplying this orientation. Added opt-in target rotation and terrain alignment, a configurable local foot up axis, and an existing-object foot binding in the authoring panel. Landed orientations stay relative to moving terrain; turns interpolate during the step. No creature-specific runtime branches are involved.

Evidence: four additional core tests cover slopes, authored primitive scale, step interpolation, rotating terrain, custom axes, validation and rewind. The 3D library transfer test now checks identical foot quaternions after capture/import/translated placement. The native 3D browser check edits the foot binding and alignment and compares editor/portable matrices. The remaining full-reference audit still needs to establish the authoring coverage of head/eye tracking and target-driven root motion; this pass does not claim full goal completion.

### Native 3D head and eye tracking pass

The WeaverDev reference calls for smoothed head tracking, neutral-relative angular limits, parent-first eye tracking, distinct eye limits and a shared head origin. Added reusable native scene trackers with these controls, configurable forward/up axes, and a combined cone limit. The four-legged head/eyes study is data-only and uses ordinary primitives, keyframes, gait groups and body support.

Evidence: dedicated core tests cover smoothing/replay, asymmetric limits, animated parents, parent-first ordering, shared origins, arbitrary axes, mirrored/scaled geometry, validation and deletion. Web tests cover atomic edits and tracking-only library capture/import/placement/source updates. The browser verifier edits eye settings with undo/redo and finds identical head/eye/pupil matrices in the editor and portable player. Existing eight-legged primitive/foot browser checks still pass. Root movement toward a target and the remaining video-reference acceptance audit are still open; this pass does not close the whole goal.

### Target-following root movement pass

Inspected the Root Motion section of the [WeaverDev primary tutorial](https://weaverdev.io/projects/proc-anim-tutorial/): smooth linear/angular velocities, heading tolerance, turn-in-place when facing away, approach beyond a maximum distance and retreat inside a minimum distance. Added these as an independent reusable native 3D movement controller. The implementation measures distance on the configured movement plane and eases desired speed near the distance boundaries to settle reliably.

The target-following study has no body transform keys. Generic movement runs first, followed by terrain contacts, grouped stepping, support and parent-first head/eye tracking. Tests cover approach/retreat settling, turning in place, authored paths, arbitrary up vectors, parented actors, coincident targets, deterministic replay, input validation and ten seconds of combined creature motion. Web tests cover atomic edits and movement-only library capture/import/translated playback/source updates. Browser checks exercise speed controls and undo/redo and compare body/head/eye/link matrices with the portable player.

This closes the identified WeaverDev root-movement capability gap. The final remaining work is the reference-by-reference acceptance audit, especially primary inspection of the Codeer and Binary Lunar videos and end-to-end authoring evidence for the combined tools. The limitations documented above are not automatically additional requirements beyond the user's reference behaviours.

### Curved dynamic fill pass

The Argonaut Blob source uses `curveVertex` to draw its simulated loop. The old fill implementation joined control points with straight edges; Perfect Freehand smoothing changed only its ink. Added an independent per-shape curvature control for loops and tubes, preserving control points, tube endpoints and radius profiles. Curved geometry enters the same union/subtraction pipeline as straight shapes, so fills, exterior/hole outlines, connections and SVG share the contour. The soft-creature loop opts in through editable data.

Evidence: four numerical/geometry tests cover interpolation, widths, translation and degeneracy, layer union/holes/export and zero-curvature compatibility; the soft-creature browser verifier edits curvature and tests undo/redo plus editor/portable rendering. The library/source test retains curvature on a placed copy. Collision remains point-based rather than using the interpolated contour.

### Fresh-rig authoring evidence

The authoring browser check now starts with an empty procedural definition and builds an eleven-point reaching chain through the controls. It adds curvature, a separate ink-only layer and draw order, then downloads an actual two-layer SVG. The fixed root has zero error, maximum link-length error is below 1e-12, and sampled target error is below .001 pixels. JSON-reloaded portable rendering matches the editor pixel-for-pixel. This proves configurable topology and layer authoring beyond editing the supplied studies. It does not yet prove live game-input target APIs or every video-reference detail.

Latest verification: 72 core tests and 49 web tests pass (121 total), along with the target-movement, curved soft-creature and fresh-authoring browser checks. [The separate reference audit](procedural-reference-audit.md) now records all ten Codeer steps from actual video frames, the Coding Train primary sketch, and the remaining Binary Lunar/live-input evidence gaps. Full completion remains unproven.

### Live input, connected spines and native 3D verification

Added the portable live 2D player and an editor pointer preview, both using the existing simulation and sprite/surface renderer. Added a data-only spine-with-limbs study and generic target-position stepping for top-down creatures. Attached roots/homes now resolve in chain dependency order, and chain output points no longer accumulate free-body inertia. Two-link limbs use an exact solution where the bend limit permits; longer constrained chains can escape stalled folds through bounded retries without relaxing their length/bend constraints.

Uniform contour sampling fixes jagged ink around curved limbs. Decimal polygon fallback now snaps computed intersections to prevent microscopic gaps at a touching fold. Regression checks cover moving targets, translated rigs, spring-connected soft points, finite closed fills, and restored particle physics when a chain is removed.

The native 3D browser proof passes with eight primitive legs, four planted feet on a ramp, body height/tilt support, an existing cone link and a terrain-aligned box foot. Editor and portable link/foot matrices have zero difference. Sprite outline recognition/seam repair, soft sprite rendering, soft-body area/attachments, top-down spine/limb rendering and fresh layered-tentacle authoring browser checks also pass. Numerical/integration suites now pass 80 core tests and 51 web tests. The overall reference audit remains open for the documented Binary Lunar explanation and fish fin-mapping details.


### Final reference, hybrid and renderer pass

Completed primary visual inspection of the Binary Lunar rig/locomotion sections. Added a three-segment sprite walker using the existing generic stepped-chain and sprite-binding system. Added reusable bend measurements on attachment paths for fish fins and any other generated or sprite-bound output; measurement references participate in dependency ordering, validation, copying and deletion.

For native hybrids, linked puppet planes can fit their animation bounds to scene dimensions and rotate around their local Y axis toward the camera while keeping chain endpoints fixed. The sample mesh body retains native 3D terrain/body support; all eight puppet links share an editable source with animated details. Socket mapping respects fitting and facing. A viewport-size fallback fixes early texture creation before resize observation.

Both material pipelines now honour the flat-fill flag. New materials default to flat colour and no crease strokes, with both controls independently editable. Depth, occlusion, source art, silhouette rendering and explicit colour/effect controls remain active. The browser comparison demonstrates continuous interiors instead of face lighting and identical exported hybrid frames across perspective/orthographic camera views.


### SVG shading and smooth outline correction

The user clarified that “flat” means illustrated colour/shading, not an unlit fill. Added an explicit SVG / solid / scene-lighting selector, shared palette-band shading, shadow contrast and edge softness. Standard shading normals now follow the deformed smooth surface rather than individual triangle derivatives. Curved primitives refine their silhouette independently of the authored low-detail setting, and the outline hull joins normals across duplicate face vertices while preserving colour/UV geometry. The other compositor interpolates coverage independently from packed material identities.

The hybrid and portable rendering proof still passes. Both pipelines retain multiple coloured regions under SVG shading and exactly one interior colour under the separate solid mode. Two added tests cover outline geometry preservation and transactional shading controls; suites now pass 140 tests.
