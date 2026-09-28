# Procedural motion and existing artwork

Open **Procedural** in the Rig workspace. Editable studies cover spines, reaching chains, walking limbs, soft/rigid bodies and the existing outlined snake puppet. The examples contain ordinary project data, editable through the same controls and commands as a new rig.

## Puppet pieces

Select points on the canvas in order with Shift-click. Choose a sprite under **Puppet sprite pieces**, then:

- **Move & rotate piece** follows one point for translation or two points for orientation. Child pieces follow the resulting joint pose. A strength of zero preserves the existing animation.
- **Deform artwork** maps the original texture across the selected control points. The original asset, opacity and drawing layer remain available. A textured WebGL mesh prevents gaps between clipped image triangles.
- **Release piece** removes the procedural binding.

Bindings capture the displayed pose and point positions when you click Bind. Input anchors sample ordinary puppet animation before procedural output bindings, avoiding a feedback loop.

## Existing outlines

Connections are explicitly opt-in, per pair. Recognition estimates border colours from their prevalence near the alpha silhouette, and compares cross-sections near the connection. The existing body-join editor remains available for manual anchors.

For two sprites, select the moving piece and its body, then **Recognize & join outlines**. The renderer aligns the connected silhouettes and matching paint regions. It repairs ink at their internal seam while protecting outer outlines, interior markings and translucent paint. Recognition returns no match when it cannot identify shared paint at the candidate connection.

For a sprite and generated fill, select one point at their overlap, choose the dynamic surface, then **Connect to selected dynamic surface**. The seam region follows that point. This repairs an overlapping connection; it does not bridge a gap between disconnected shapes or invent matching paint regions. Adjust the surface geometry so it overlaps the artwork. Connection radius is editable in the advanced JSON.

## Dynamic layers

Each generated surface has its own draw order, fill, outline, width, opacity and enabled state. Add shapes to the same surface to remove their shared interior boundaries; separate surfaces retain separate contours. Subtraction creates holes. The Ink outline uses Perfect Freehand on the combined contour.

**Export generated surfaces (SVG)** exports those contours. It does not flatten sprite seam repairs into vector artwork. The existing rendered-frame/player paths include sprites and their connections.

## Persistence and runtime

The `procedural` project field holds particle constraints, drivers, surfaces, sprite bindings and outline connections. Commands run through ProjectStore validation and undo/redo. JSON round trips retain these fields. Linked puppet sources retain connected simulations; a connection spanning two separate sources is rejected explicitly. Source-free generated geometry belongs to the default source.

Shared API subpaths are `@shapeshift-labs/studio-core/procedural/{model,builders,commands,simulation,surfaces,bindings,sources,connections}`. The model, simulation and contour data are usable without a DOM; texture drawing and seam repair use browser rendering adapters. The local web checkout depends on `file:../shapeshift-studio-core` during development.

## Verification

- Core: `npm test` — numerical constraints, deterministic replay, surface unions/holes, outline pigment recognition and protected seam pixels.
- Web: `npm test` — sprite/child transforms, large-turn blending, undo/redo, JSON reload, source extraction, validation and deletion cleanup.
- Browser: build with `npm run build`, serve with `npm start`, then `node scripts/verify-procedural-browser.mjs`. This checks actual snake contour recognition, sprite-to-fill seam pixels, moving connection anchors, protected outside ink/interior marks, portable rendering and gap-free soft artwork. PNG evidence is written under `work/`.

The [reference audit](procedural-reference-audit.md) maps all six references to reusable controls and verification. Native 3D limb/body authoring and hybrid mesh/puppet pieces are described below. Soft-body collision acts on simulation particles; native terrain queries use undeformed primitives.

## Coordinated steps and body support

**Steps & body support** edits each stepping chain's stride threshold, foot lift, duration, overshoot and contact direction. Foot homes may be driven by ordinary puppet joints or procedural target points. Feet remain at their planted world positions until they need a step.

Check the limbs that may lift together, then use **New gait** and **Add group**. Groups alternate fairly; the next group waits until the previous group's steps finish. A quadruped can use two diagonal pairs, while a many-legged creature can use three or more groups. Older one-at-a-time groups still work when no explicit gait owns those limbs.

Select pinned, driven or joint-anchored body points and check their supporting limbs, then choose **Support selected points**. Height sets clearance above the contact line; response smooths adjustment, and maximum tilt limits the body angle. This is a kinematic pose correction. It does not simulate balance forces or guarantee that any arbitrary terrain is reachable. Contact diagnostics distinguish planned targets from actual reachable foot positions; green marks indicate planted contacts and red indicates a missed target.

The same corrected points drive generated surfaces and existing sprite bindings. These 2D gaits and body support survive project saves, undo/redo, linked puppet sources and portable playback. The Scene workspace provides separate native 3D chain and body controls.

## Native 3D primitive rigs

The Scene workspace now has its own **Procedural** panel. **Open 3D walker study** creates an editable walker with 4–16 legs, built from the existing cylinder, sphere and box primitives. It uses ordinary scene nodes, keyframes, materials, ink contours and shadows.

**Build editable links** creates a reaching, following or stepping chain beneath an existing root, or creates a root marker. Targets are ordinary scene nodes: move or animate them with the normal tools. Link count, spacing and primitive type are configurable. Chain settings expose the root, target, knee direction, lengths, length axis and stepping parameters. Under **Bind existing primitive pieces**, select an existing scene object for each link. Each piece keeps its geometry/material and is placed between its solved endpoints.

Check scene primitives under **Terrain primitives** to enable contact queries. Boxes, spheres, cylinders, cones and finite planes use their dimensions, tessellation and world transforms. Planted feet retain local contact coordinates on moving terrain. These queries currently use undeformed primitive geometry; shader-bent terrain and arbitrary extruded/SVG collision meshes still need integration.

Assign limbs to numbered gait groups, and choose a body node with supporting chains. Body clearance, response, maximum tilt and the world up direction are editable. Contact direction on each chain supports floor, wall or ceiling-oriented setups. This is procedural pose generation, not a full rigid-body balance simulation; links do not yet avoid every obstacle along their length.

The definition is saved as `scene3d.procedural`. The shared scene sampler evaluates it with a fixed clock and deterministic replay, so the editor and portable 3D player produce the same transforms. Gizmo authoring removes the procedural correction before committing an edit. Parent/target feedback references and duplicate chain outputs fail validation.

Run `node scripts/verify-procedural3d-browser.mjs` after building and starting the server. It edits the walker, binds an existing cone as a leg piece, checks native meshes and terrain support, and compares its editor matrix with portable-player output. Evidence is written to `work/procedural3d-walker.png` and `work/procedural3d-portable.png`.


## Reusable library components

In **Library → Save to library**, choose **Character rig & animations** to include the authored clips and procedural controls. Connected rigs include targets, primitive links, sprite pieces, dynamic layers, outline connections, gait groups and body support. Native 3D step rigs include their primitive terrain inputs. Generated-only 2D rigs can be captured from the project root; their ownership groups them for library and linked-source extraction without pinning their physics to the root.

Drag the saved character onto the canvas to place it. Placement translates the complete definition, including driver paths, terrain and sprite bind poses. Each copy gets new controller/point/surface IDs. A source update changes shared settings while retaining a copy's local edits. Topology changes, such as replacing the chain's set of nodes or terrain inputs, require a new source capture. The library thumbnail renders the current procedural animation, including native 3D leg objects.

**Export source** and **Import source** retain procedural definitions in the normal library JSON file. A 3D puppet instance also retains its embedded 2D procedural source. Imported 2D particles preserve their source gravity and damping; the shared simulation uses the highest requested solver iteration count. Colliders remain shared world geometry, so nearby components can encounter each other's terrain.

Run `node scripts/verify-procedural-library-browser.mjs` after building and serving. It captures and previews the 2D walker through the Library UI, exports a real file, imports and places it into a separate project, and checks the native 3D spider preview. Numerical/integration tests also compare translated poses, sprite matrices, rigid/soft motion, source updates, undo/redo and malformed-packet rollback.


## Soft bodies with attached art and limbs

**Soft creature attachments** is an editable study of a volume-preserving loop, spring limbs with bend limits, weighted shoulder points, and a sprite face. It uses the same point/constraint/surface data as the other studies.

In **Attach to a deforming body**, select source points in order and choose **Create attached point**. Weights control how much each source contributes; blank weights give equal influence. The offset can stay in world axes or turn with the first two source points. Bind a sprite to two attached points to preserve its artwork while it follows the body. Use an attached point as a spring-limb root or reaching-chain root. **Attach last selected** instead makes the last selected point follow the preceding ones.

Attachments follow the body in one direction. They do not transmit limb forces back into their sources; ordinary distance constraints provide that two-way coupling. Nested attachments resolve in dependency order, and cycles or competing drivers fail validation. Deleting a source removes dependent attached points and their references. Attachments survive undo/redo, library placement, source extraction and portable rendering.

Point collisions now sweep the distance travelled during each step against finite segments and circles, including segment end caps. This prevents fast point discs from skipping thin terrain. Restitution uses incoming velocity, and corner contacts resolve together. This is point-based contact: collision of the complete filled contour, links between points, and moving/deformed terrain still needs separate handling. Green marks in the procedural overlay show contact normals.

`node scripts/verify-soft-creature-browser.mjs` edits attachment weights and offsets, checks undo/redo, compares the solved position and body area after landing, and compares editor/portable pixels. Rendered evidence is in `work/soft-creature-editor.png` and `work/soft-creature-portable.png`.

### Shaped 3D feet and landing orientation

A stepping chain can now bind an existing object as its **Foot / end piece**, in addition to its individual links. **Foot orientation** is opt-in:

- **Keep artwork rotation** retains the existing animation/rotation behaviour.
- **Turn toward target rotation** captures the home target's world rotation when a step starts.
- **Align to terrain** also rotates the specified **Foot up axis (local XYZ)** onto the landing normal. For example, use `0, 0, 1` for artwork whose sole faces along local Z.

The last joint object receives the solved foot position and orientation while retaining its geometry, material and scale. Rotation blends through the lifted step; after landing, both position and orientation remain attached to the contacted terrain until another step starts. Target rotation alone does not trigger a step: the stride threshold still controls takeoff. This supports shaped primitive feet and parented foot pieces. Terrain queries still use undeformed primitive geometry; the solver does not infer the sole's thickness or shape, so author the foot pivot at its intended contact point.

The shared sampler, library definition and portable player retain these controls. `verify-procedural3d-browser.mjs` now binds a box foot through the real editor, enables terrain alignment and checks its complete matrix against the portable player. Core checks cover slope normals, interpolated turns, planted heading, rotating terrain, local up axes, preserved scale and deterministic replay.

### Head, eyes and target tracking

Open **Scene → Procedural → Head, eyes & target tracking**. Choose an existing driven object and target, then apply a tracker. This works on ordinary primitive groups, heads, eye pieces or other objects. Forward/up axes describe the piece's local orientation; mirrored and scaled pieces retain their appearance. The optional shared aiming origin lets both eyes aim from the head centre.

Yaw and pitch each have independent minimum/maximum limits in degrees. They must include zero, the neutral direction. A separate turn cone bounds the total deflection. Response controls exponential smoothing: larger values catch up faster. Limits are relative to the sampled authored pose, so a keyed parent or neutral pose can move while tracking continues. Tracking starts from neutral at time zero. Parent trackers solve before their children, irrespective of their order in the document. Cyclic references, duplicate outputs, and conflicting chain outputs are rejected. Terrain cannot be parented under a tracker because its contacts are sampled before tracking.

**Open head & eyes study** combines four stepping legs, body support, a tracked head, and two child eyes with different yaw limits and faster responses. It is an editable scene definition using the same general controllers. The target has ordinary position keys. This study uses a keyed root path; the target-following study below demonstrates root movement without body keys.

Trackers live in `scene3d.procedural.trackers`; angular limits are radians in JSON. They survive undo/redo, source updates, library transfer and portable playback, including components containing only tracking and no chains. The existing clip Look tool remains available for its immediate pose adjustment; use the procedural tracker when smooth neutral-relative tracking is wanted.

`node scripts/verify-procedural-tracking-browser.mjs` edits eye limits/response through the UI, checks undo/redo, renders the four-legged study, and compares head, eye and pupil matrices against the portable player. Screenshots are `work/procedural-tracking-editor.png`, `work/procedural-tracking-portable.png` (four seconds) and `work/procedural-tracking-front.png` (one second).

### Target-following body movement

In **Scene → Procedural → Move toward a target**, choose a root/body object and an independent target. Minimum/maximum distance define a comfortable range on the movement plane: the actor approaches beyond the maximum, retreats below the minimum, and slows to a stop inside the range. Speed and response control translation; turn speed, response and tolerance control heading. **Move within facing angle** keeps a creature turning in place while its target is behind it. The world up vector defines the movement plane, and the local forward vector identifies the artwork's heading.

Movement runs before foot queries, body support and head/eye tracking. Its displacement and heading correction layer over the sampled authored path. Body support can act on the same object, supplying terrain height/tilt while the movement controller supplies travel. This is steering, not route planning or whole-body obstacle collision. Distance is measured on the movement plane; targets above or below it do not pull the root out of that plane.

**Open target-following study** combines the movement controller with four procedural legs, support and head/eye tracking. Only the target is keyed; the body has no position or rotation track. Its adjustable distance band, speed and turning controls work through the same generic definition as any other object.

The `scene3d.procedural.movers` list survives JSON, undo/redo, source updates and library transfer. Angular values use radians in JSON and degrees in the UI. Library capture includes the independent target and its animation, including movement-only components without limbs or tracking. Fixed-clock sampling makes seeking and replay deterministic.

`node scripts/verify-procedural-movement-browser.mjs` edits translation/turn speed, checks undo/redo and degree conversion, and compares the body, head, eyes and primitive links with the portable player. It verifies actual travel without body keys and reachable planted feet. Screenshots: `work/procedural-movement-editor.png` and `work/procedural-movement-portable.png`.

### Curved fills and tubes

In **Dynamic surfaces**, select a **Shape in this layer** and adjust **Curve through points**. Zero retains the straight polygon/tube; one draws an interpolating curve through the same moving points. Closed loops wrap smoothly; tubes retain their endpoints and interpolate the authored radii. Each shape has its own setting, including shapes used to cut holes.

This changes the geometry before layer unions and outline generation, so the fill, Perfect Freehand ink, sprite-to-surface connection contour and generated SVG agree. The separate **Outline smoothing** control still styles only the ink. Physics remains defined by the original points and constraints; curved contour overshoot does not add collision particles. The soft-creature body now opts into a fully curved loop, while its limb shapes keep their own settings.

Core checks cover interpolated anchors, closed shapes, widths, coincident points, translation, holes, layer order, SVG and unchanged zero-curvature output. `verify-soft-creature-browser.mjs` edits curvature with undo/redo and compares the resulting editor and portable pixels. Library/source tests verify the shape setting survives placement.

### Authoring from an empty procedural definition

`node scripts/verify-procedural-authoring-browser.mjs` clears the procedural definition through the JSON editor, then uses the visible controls to build an eleven-point reaching chain with 18-pixel links. It enables a curved fill, creates a second independent ink-only layer, changes that layer's order, seeks several times, and downloads a real SVG. It checks fixed-root IK, link lengths, target error, unchanged authored data and pixel-identical rendering after a JSON round trip. Artifacts: `work/authored-tentacle.svg`, `work/authored-tentacle.png` and `work/authored-tentacle-editor.png`.

### Live pointer and game input

Choose **Try a live pointer target**, select a driven point, and move the pointer over the preview. The preview uses a copy of the project. Pause, restart or release the pointer to resume the authored driver. Closing the preview disposes its animation loop. Live input is not recorded into the authored timeline.

The portable 2D runtime exports `createProceduralPlayer(canvas, project, images, options)`. Call `setTarget(driverParticleId, [x, y])` using world coordinates, then `update(elapsedSeconds)` from a game loop, or `play()` for its own animation loop. `update` advances the simulation in fixed 1/60-second steps; `step(dt)` is available for explicitly controlled simulation. Use `releaseTarget(id)`, `reset()`, `stop()` and `dispose()` to manage playback. The current solved frame drives both generated surfaces and existing sprite bindings. The native 3D scene player remains a separate API.

`verify-procedural-live-browser.mjs` supplies real pointer input through the editor, verifies fixed-base reaching, compares portable pixels, checks deterministic input replay at different update rates, and confirms that source JSON remains unchanged.

### Spine with stepping limbs

The **Spine with stepping limbs** study combines a following chain, weighted body-relative hips and foot homes, four two-link legs, diagonal gait groups, curved body/limb fills, and attached eyes. All are ordinary editable definitions.

In a stepping chain, **Foot placement → Use target position (top-down)** uses the foot home's XY position directly. **Raycast terrain** retains the side-view terrain behaviour. Both use the same stride threshold, step duration and gait controls. Attached homes update after their source spine and before foot planning; limbs solve after their attached roots. Chain dependencies are ordered automatically, and cycles or competing chain outputs are rejected.

Points written by a chain are kinematic: the solver positions them without free-body gravity or inertia. Independent soft points can still connect to them through springs. Removing the chain restores the particles' authored physics. Two-link limbs use an exact triangle solution when their bend limit permits it, including folded and near-extension poses.

Curved contours are sampled at uniform distances before Perfect Freehand generates ink. This avoids jagged strokes caused by clusters of tiny tessellation edges. `verify-spine-limbs-browser.mjs` edits stride through the panel and checks link lengths, foot placement, and editor/portable pixels.

For long reaching chains, a stalled bend-limited solve can retry from distributed arcs while retaining the closest valid result. This addresses tight folds without relaxing link lengths or bend limits; difficult or unreachable targets can still retain residual error. The polygon boolean fallback also snaps computed intersections within 1e-7 world units to close microscopic gaps at touching folds.

### Bend-driven points, fins and sprite pieces

In **Attach to a deforming body → Bend drives offset**, enable the response and select at least three measured points in order. **Use selected points** copies the current canvas selection into that path. The tool adds the turns along the path, so a long spine can bend past 180 degrees without flipping its measured direction. Coincident edges are skipped.

**Offset X / radian** and **Offset Y / radian** convert the measured bend into movement along the attachment's axes. Negative values reverse the effect. **Maximum measured bend** caps the response; **Use bend amount** gives the same response for left and right turns. Click **Update attachment** to apply. Orientation can use any two named points, independently of the weighted position sources; blank orientation uses the first two sources.

These are ordinary attached points. Use them as a fin contour, a limb target, a spring anchor, or a rigid/soft sprite binding. Original sprite art and outline connections continue through the existing binding pipeline. The response is optional and does not alter the source body. Its measurement inputs participate in dependency ordering, feedback validation, deletion, library transfer and source extraction.

**Bend-driven fins** demonstrates a constrained spine with attached paired fins, bend-responsive tail and dorsal contours, and attached eyes on independent surface layers. It is editable rig data, not a fish-specific runtime. `verify-bend-fins-browser.mjs` changes the response and limit through the panel, checks undo/redo and angular conversion, verifies the resulting point offset at three times, and compares editor/portable pixels. The source-inspired shape uses a small baseline fin width so the fins remain drawable when the spine is straight.


### Mesh bodies with puppet limbs

**Scene → Procedural → Open mesh & puppet walker** builds a native mesh shell and four two-link legs from eight instances of one editable puppet source. The pale markings have their own animation. The scene uses the same native stepping, terrain and body-support settings as the primitive study. Open a leg's **Edit rig & animations** to change its linked art.

For your own pieces, add a puppet to the scene, choose **Size → Fit to dimensions**, and set its width and length in metres. The fitted artwork is centred on the scene object, with its full animation bounds spanning those dimensions. Transparent margins in the authored sprite rectangle count toward the bounds. Under a Y-axis chain, choose **Facing → Face camera around Y axis**: this rotates the drawing around the link's length while retaining both endpoints. **Face camera** is a full billboard and is suitable for free-standing artwork, whereas **Scene plane** follows the object's complete 3D orientation.

In **Chain settings → Bind primitive, SVG or puppet pieces**, assign each scene piece to a link. Puppet instances retain their source joints and clips, original ink and interior marks. Joint attachments account for the fitted size and camera-facing rotation. These are textured planes with depth testing, so mesh parts can occlude them; they are not volumetric legs. The scene allows up to sixteen linked puppet instances.

### SVG-style shading and smooth outlines

Select a mesh and open **Illustrated material → Shading**:

- **SVG-style shading** uses broad palette-based shadow, body-colour and highlight regions over smooth surface normals. **Shadow contrast**, **Shading edge softness** and **bands** control their appearance.
- **Solid colour** is the separate unlit option.
- **Scene lighting** retains conventional light/material response, now with smooth normals through deformation rather than one lighting normal per triangle.

**Smooth curved outlines** refines sphere, cylinder, cone and lathe contours to at least 64 radial segments. Turn it off to use the authored **Curve detail** directly. The outline hull also shares normals across coincident face/UV seams; the coloured geometry keeps its own hard corners, UVs and paint regions. The second rendering pipeline interpolates silhouette coverage separately from material IDs to soften pixel steps without adding false face boundaries.

**Draw crease lines** independently enables geometric edge strokes. New materials use SVG-style shading with crease strokes off. The older `flat: true` flag selects SVG shading when no explicit `shading` mode is stored; `flat: false` selects scene lighting. `shading: 'solid'` explicitly requests an unlit fill. Existing outlines and literal paint colours retain their authored colour. Depth, occlusion, colour grading and authored tint/emission remain active.

The hybrid/renderer browser verifier exercises the material selector, undo, crease toggling, fitted puppet facing and camera views, and compares editor/portable pixels. It renders all three shading styles in both pipelines. Geometry tests verify curve refinement and shared outline normals without modifying the original painted mesh. Current suites pass 85 core and 57 web tests.

### Little Gods ink preset

Select a mesh, then **Illustrated material → Little Gods ink preset**. The mesh-and-puppet walker starts with this preset. It uses heavier dark green-black ink (`#161c17`), three crisp colour bands, and no crease strokes. Original SVG colours and painted shading are preserved; unpainted mesh bodies still receive the palette shading.

- **Outline sizing → Scene units (distance)** is the preset default, at 0.025 metres. Object dimensions and object/parent scale do not change this width. Perspective makes distant strokes thinner; orthographic views keep the width constant at a given zoom.
- **With object** is an optional legacy mode that measures thickness as a percentage of the longest authored dimension, including object and parent scale. Its projected width follows camera zoom and distance. Squash/bend can move the contour without recalculating that reference dimension.
- **Screen pixels** keeps contour width steady as the camera zooms. **ink** and scene **Ink weight** multiply the width.
- **Preserve artwork shading** retains painted shadow/highlight regions instead of applying another layer of face lighting. **SVG colours → Original artwork** also keeps the original pigment choices. Authored tint, effects and final colour grading remain available.
- SVG and linked puppet outlines remain source artwork, including interior marks and holes. The mesh contour settings do not strip or retrace those strokes. Use the existing opt-in sprite connection tools for connected puppet seams.

The preset now selects **Ink drawing → Perfect Freehand shader**. **Stroke variation** changes stable pressure and contour input; **Stroke smoothing** controls Perfect Freehand's outline point filtering. The older **Mesh contour** option remains available. Both preserve imported SVG paths. Little Gods' SVG finishing tool creates an inward ink band around an artwork union; this 3D mode constructs a hand-drawn stroke around a projected mesh silhouette.

The preset is ordinary portable material data, exposed by `sceneCapabilities().materials` and `littleGodsMaterialStyle(material)` from `@shapeshift-labs/studio-core/scene3d/schema`. Apply its returned values through `scene3d.material.update`; the same fields work through JSON, undo/redo and exported players. This keeps the authoring tool and engine using one definition.

`node scripts/verify-little-gods-style-browser.mjs` exercises the visible preset, percentage and preservation controls, undo, rendered outline widths at two zoom levels, and source paint/holes in both renderers. `verify-hybrid-flat-browser.mjs` checks the preset on the animated hybrid and compares editor/player pixels across camera types and viewing angles.

### Perfect Freehand shader

The shared `@shapeshift-labs/studio-core/scene3d/core/perfect-freehand` export ports Perfect Freehand **1.2.3** into GLSL. The production renderer does not call the JavaScript `getStroke` function. CPU code caches mesh adjacency, extracts the visible silhouette centreline and submits overlapping batches of up to 48 input points. The fragment shader performs input normalisation, streamline filtering, minimum-length filtering, pressure simulation, thinning, outline smoothing, sharp-corner arcs, rounded/flat caps and default taper easing. It fills the resulting polygon with non-zero winding and eight coverage samples, retaining depth-tested occlusion.

The shader accepts linear pressure easing and the library's default taper easing; arbitrary JavaScript easing callbacks are not a shader input. Its material integration uses explicit pressure derived from stable object coordinates so playback does not introduce random stroke changes. SVG and puppet artwork continues through its existing source renderer.

`verify-freehand-shader-browser.mjs` compares GPU strokes against upstream `getStroke` polygons for pressure, streamline, simulated pressure, taper, flat caps, sharp turns, dots, stationary strokes, default pressure, unfinished strokes, two-point lines and coincident inputs. The reference also evaluates the shader's coverage sample locations, separating algorithm differences from Canvas2D antialiasing. The original MIT attribution is included beside the shader source. Mesh contour tests check welded seams, closed contours and suppression of internal triangle edges.


Current shader checks: 12 upstream cases; at most two edge pixels differ by one of eight coverage samples, with the rest matching within 8-bit rounding. The visible shader/contour selector, variation control and undo pass. All 142 unit tests pass (85 core, 57 web). Studio rounds projected stroke inputs to 1/1024 pixel to prevent insignificant transform roundoff from changing editor/player coverage.

The final shader hybrid regression passes with `PFH_QUICK=1`: orthographic and perspective views at two clip times have identical editor/player pixels after subpixel input normalisation, with source animation, sockets and authored JSON retained. All three shading modes render correctly in both pipelines. The full camera sweep remains available without that environment flag.


### Distance-based ink width

The Little Gods preset now defaults to `outlineUnits: 'world'` and `outlineWorldWidth: 0.025` metres. The generated base width is independent of mesh dimensions and object/parent scale. Camera projection converts that width to pixels; perspective depth reduces it with distance, while orthographic depth does not. `outlineUnits: 'object'` retains the older percentage mode only when explicitly selected. Existing authored sprite/SVG strokes remain source artwork.

`verify-world-ink-browser.mjs` passes for both Perfect Freehand and mesh-hull ink in both renderers. Differently sized meshes have the same base width, doubling an object's scale does not thicken it, and doubling perspective camera distance halves the projected shader width. Orthographic depth changes leave all measured widths unchanged. The check uses a 0.06-metre stroke for readable pixel measurements; the preset's default remains 0.025 metres.

### Optional mesh / puppet attachment blend

Select a linked puppet in the 3D scene, open **Attachment blend**, and enable
**Blend into mesh body**. This is off by default, including in the hybrid walker
example. Pick the body, the top or bottom of the source artwork, a blend length
in metres, strength, and whether to match the body's base colour. For procedural
links the inspector initially chooses the bottom end (the chain's starting point)
and looks for a body sharing the hip's parent. The source artwork is not changed.

Tools discover this through `sceneCapabilities().puppets.join`. Use an ordinary
`scene3d.node.update` command, so changes use the same save, undo and player path:

```json
{
  "op": "scene3d.node.update",
  "id": "leg-0-link-0",
  "values": {
    "puppet": {
      "join": {
        "enabled": true,
        "target": "shell",
        "end": "bottom",
        "length": 0.15,
        "strength": 1,
        "matchColor": true
      }
    }
  }
}
```

The renderer infers boundary ink from the live puppet frame. Optional
`inkColors: ["#1a2531"]` overrides recognition. It repairs only terminal ink
reachable from the selected end, protects the side strokes, and blends the
predominant fill towards the target material's first palette colour. Enclosed
ink marks, distinct painted details, transparency, animation, sockets and mesh
placement are retained. Length uses the rendered puppet's world scale and is
limited to half the artwork height. Disabling restores the unmodified frame;
removing the target disables its dependent joins.

This is an attachment seam treatment for ends already overlapping a mesh, not
an automatic geometric union or a surface-shading sampler. The body target
supplies a base colour; the tool must place the pieces in contact. It does not
remove the body's silhouette, normalize baked sprite stroke widths, or add
asymmetry. Those remain separate choices.

Verification: `node --test tests/attachment-blend.test.mjs` in studio-core checks
ink/detail/alpha preservation, both ends, disabled identity, schema validation,
serialization and target deletion. `node scripts/verify-attachment-blend-browser.mjs`
in studio-web checks the inspector, undo, both renderers, animated source frames,
unchanged transforms, and exact visual restoration when disabled.
