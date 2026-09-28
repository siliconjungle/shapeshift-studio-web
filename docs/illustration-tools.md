# Illustration tools

Open **Illustration tools** beside **Motion tools** in Puppet Studio. These are ordinary project data, editable through the UI or the command API, validated by ProjectStore, saved in project JSON and included in undo/redo.

## Try the examples

With `npm start` running in shapeshift-studio-web:

- [Puppet, ink, fluid and wind study](http://127.0.0.1:4354/puppet-studio/index.html?illustration=puppet)
- [3D bend region study](http://127.0.0.1:4354/puppet-studio/index.html?illustration=fold)

Press Play or scrub the timeline. Example URLs do **not** overwrite device autosave. Use Save project to keep example edits. A regular Studio session still saves normally.

## Pose-driven corrective drawings

1. Select a puppet piece; add a correction, or select an existing captured pose layer from Motion tools.
2. Choose a source joint and local channel, with a start value and a full-correction value. Rotations use degrees. Reversed ranges and absolute values are supported.
3. Set replacement artwork, inflate/bend/taper corrections, and/or authored shading on the selected piece. Select other pieces to add their responses to the same layer.
4. For actual SVG point deformation, make the source SVG editable, author its point keys in Artwork, then set **Vector pose time** to the drawing time representing the full correction. Driver weight maps from time zero to that time. Driven drawing time clamps at the last drawing, even if the source artwork normally loops.
5. Enable **Rebuild alpha edges** if deformation should retain a consistent silhouette ink width.

2D drivers read a snapshot of the **solved local pose**, including IK, look constraints and procedural bindings, before corrective layers. 3D drivers read keyed/procedural node transforms; runtime scene contact constraints run later. They do not feed back into themselves. Transform correction layers apply after the solver, so an intentional corrective offset can move a contact; use artwork/point corrections when a planted contact must remain exact. Ordinary non-driver pose layers retain their existing pre-solver order. All correction layers read the same snapshot.

Replacement drawings switch at their threshold. This does not invent a morph between unrelated SVG path topologies. Use a point timeline for matching topology, replacement artwork for a genuinely different drawing, and morph/shading controls together as needed.

Baking motion preserves artwork layers with sampled influence keys, instead of silently discarding drawing corrections. Their pose-driver references are removed after baking to avoid applying the driver twice. Scene-level wind remains live.

### Command example

```js
puppetStudio.dispatch({
  op: 'illustration.corrective', dimension: 2,
  joint: 'head', clip: 'idle',
  values: {
    name: 'Smile when looking up',
    driver: {joint: 'head', channel: 'rotation', from: 5, to: 35},
    artwork: {
      head: {
        asset: 'smiling-head', threshold: 0.6,
        morph: {inflate: 0.15},
        shade: {kind: 'hatch', opacity: 0.25, color: '#604c3d',
                angle: -30, spacing: 14, protectInk: true}
      }
    }
  }
});
```

IDs must refer to artwork and joints in that project. Pass the returned correction ID on subsequent updates. Pose transforms use the existing layer `values` map / Motion tools capture workflow.

## Rebuilt edges

`illustration.edge` stores `{enabled, width, color}` in `joint.visual.edge`. The renderer rasterises the deformed drawing into a padded local image, recolours a centred band on both sides of its alpha boundaries, then caches the resulting pixels. Transparent holes are included. Interior ink/details retain their source colours. It is not a full-screen outline shader.

Width is measured in render-canvas pixels and compensates for displayed scale. Static drawing results are reused; changing the drawing, deformation, relevant lighting or scale invalidates the bake. Animated contours require new bakes as their silhouette changes. Keep this opt-in; baking many large, unique deformations every frame is more expensive than drawing cached sprites. It cannot semantically identify an arbitrary thick painted border farther inside the silhouette.

## Line boil

`illustration.boil` edits `asset.vector.boil`:

```js
{enabled: true, amount: 0.6, rate: 8, variants: 3, seed: 1, scale: 60}
```

Amount and spatial scale use SVG viewBox units. The tool displaces neighbouring points/Bezier handles coherently, holds a drawing for `1 / rate` seconds, then cycles a deterministic set of variations. Fill and ink follow the same deformation. The object itself does not wobble or drift. It uses the artwork's timeline and loop setting.

The same asset's users share its boil. Duplicate artwork when only one instance should boil. Complex SVGs containing masks, filters or embedded raster content must first be expanded into editable paths; the importer preserves the original when it cannot do that. Animated SVG planes in the 3D scene use the existing vector-to-texture path, with 3D depth, deformation and shadows retained. This is not deformation of an extruded solid's topology.

## Illustrated shading

A correction's `artwork[joint].shade` may use:

- A user-authored transparent shadow/highlight asset, fitted to the source image.
- A broad clipped shadow shape.
- Clipped hatch lines with colour, angle, spacing and opacity controls.

Its opacity follows the same pose driver. It is clipped to the source alpha and deforms together with the artwork. **Protect existing ink** attenuates shading over dark pixels; it is a luminance-based protection, not semantic edge recognition. This complements existing SVG lighting/shading. These authored overlays operate on 2D puppet pieces, including a puppet rendered as a 3D layer; the 3D material lighting controls remain separate.

## Connected smoke and droplets

In **Effects → Fluids**, existing buoyancy, vorticity, viscosity, obstacle/source masks and density advection now also support:

- Surface tension: a curvature force near density boundaries.
- Vector contours: connected filled shapes and Perfect Freehand ink, retaining holes and separate droplets.
- Threshold, stroke width and ink colour.
- Source X/Y, source wobble, pulse frequency and duty cycle.
- Gravity X/Y.
- Shared motion fields affecting the fluid in scene space.

Zero pulse frequency means continuous emission; duty is the active fraction of each pulse. Source positions are normalised within the simulation rectangle. Vector fill uses the last palette colour; raster output keeps the existing density palette treatment. The example demonstrates smoke and a pulsed, gravity-driven source separating into droplets.

This is a stylised, deterministic 2D density-fluid solver. It is suitable for illustrated effects; it is not a volume-conserving water simulator or a 3D fluid solver. Resolution controls detail/cost. Scrubbing backwards reconstructs from the seed; long seeks require simulating preceding frames.

## General bend regions in 3D

The **Finite bend region** controls expose:

- `deform.foldAngle`: total angle in degrees.
- `deform.foldAxis`: orientation of the bend axis in the object's local XY plane, in degrees.
- `deform.foldOffset`: start of the bend region along its perpendicular direction, in local metres.
- `deform.foldWidth`: distance over which rotation is distributed. Zero produces a sharp crease.

The negative side stays fixed. Inside the region, the neutral surface follows a circular arc; beyond it, the surface continues at the final angle. Existing stretch/waist/bend/taper run before the region bend. Controls create animation keys at the playhead. Parent groups can stack deformations using the existing rig chain (maximum eight owners).

CPU picking/effect positions, rendered vertices, normals and shadow depth use the same bend operation. Existing front/back surface slots provide separate artwork; this tool does not create a special page object. Plane subdivision now respects the existing Segments setting. Increase subdivision when a narrow curved region needs more geometry. There is no automatic self-collision or paper physics; sharp creases work best with vertices near the crease.

For code authoring, `illustration.fold` with `time` creates keys; omit `time` to edit rest deformation.

## Shared environmental motion

Use **Add field** and opt nearby pieces into **Receive motion fields**. Fields belong to the project (2D) or `scene3d` (3D). Both gusts and pulses have reach, direction, strength, start and duration; their centres can move. Pulses travel outward with configurable speed/decay. Radial mode pushes away from the centre.

Receivers specify strength and lag, plus 2D rotation/translation or 3D bend response. These values describe a material's response: a light leaf and heavy sign can respond differently to the same field. Forces are sampled in world space and converted into the receiver's local axes. A deterministic lag kernel supplies delayed follow-through without frame-history dependence. It is not a full spring/cloth solver.

2D positions/radii use pixels; 3D uses metres. Receiver angles use degrees in 2D; the 3D bend response scales the existing bend channel. Fluid fields use the same 2D world positions. No object responds unless opted in.

## Runtime and tooling integration

`puppetStudio.capabilities().illustration` describes the fields, and its command list includes:

- `illustration.corrective`
- `illustration.edge`
- `illustration.boil`
- `illustration.fold`
- `illustration.field`
- `illustration.receiver`

The shared core exports `illustration/controls`, `illustration/contours`, `illustration/fold` and `illustration/fluid`. Studio supplies the authoring UI and renderer integration. No Little Gods game scene or map asset is automatically rewritten: a game adopting these new project fields should use the updated runtime/adapter.

## Validation

`npm test` includes `puppet-studio/illustration/illustration.test.mjs`: driver snapshot/solved angles, drawing substitution and vector pose time, undo/redo/reload, bake preservation, world-space receivers, fold arc length and rewind, deterministic boil, transparent holes/no canvas frame, tension, droplet separation and both study documents.

`puppet-studio/illustration/browser-check.js` is a browser rendering regression for viewBox-only SVGs: it compares ordinary, baked and high-resolution rendering and reports silhouette/ink pixel checks. The ordinary editor studies also exercise real controls and rendering.

To rebuild the browser regression page, run `node scripts/verify-illustration-build.mjs`, then open the printed local URL.
