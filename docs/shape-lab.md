# Shape Lab: metaballs, SDF merging and geometry baking

Open **Shape Lab** in the toolbar. Recipes are stored in the project and all edits/bakes participate in normal undo/redo. Choose **+ 2D blobs** or **+ 3D blobs** to start with an animated example.

## Author a field

- **SDF** combines circles/spheres, rounded boxes, capsules, rings/toruses and imported filled SVG outlines. Each primitive after the first can **Merge**, **Subtract**, or **Intersect**. **Blend radius** controls the softness of those operations; zero gives hard booleans. Operations run in list order.
- **Metaballs** adds inverse-square influence from balls, with a threshold of one. Nearby balls attract into one surface. This mode accepts additive balls only; use SDF for other primitives and operations.
- Edit X/Y/Z, radius, half-size and rotation around Z. In 2D, drag a primitive's centre handle. In 3D, drag the preview to orbit it. The preview and baked meshes use the spider's SVG shading with smooth normals, flat colour bands and Perfect Freehand silhouette strokes. The material remains editable in the scene.
- **Key parameter edits at playhead** creates parameter keys, seeding the initial value when needed. Position, radius, size, rotation and blend radius can animate. **Key primitive pose** captures the four primitive channels. Scrub or play the lab's own timeline. Expand the primitive's key list to seek, delete or choose linear, smooth or step interpolation. Changing duration retimes the recipe's keys.
- **+ Selected SVG** imports the filled paths of the artwork selected in the rig. Each filled path becomes a separate additive primitive, preserving compound-path holes. Imported SVGs are normalized to about three field units. Curves are flattened to outlines for field evaluation. Stroke-only artwork and clipping should be expanded first. This imports the authored outline, not an existing rig's transforms or animation. In 3D it becomes an extruded volume; half-size Z controls its depth.

## Bake for animation

Baking runs in a worker and can be cancelled. The source recipe stays editable. Each bake adds new geometry and a clip rather than overwriting the source or a previous bake.

| Output | What is created |
| --- | --- |
| 2D **Bake SVG shape** | One editable SVG asset and rig piece at the current lab time. |
| 2D **Bake animation** | One SVG asset containing discrete vector frames, with step opacity keys. Each frame's paths remain editable in Artwork. Splits, merges, islands and holes are preserved without forcing equal path topology. |
| 3D **Bake 3D mesh** | A native mesh object in the 3D scene, with positions, indices and normals. It supports the normal scene transform, material and deformation controls. |
| 3D **Bake animation** | A group of native mesh frames and a clip with step visibility keys. Only one frame is visible at a time. |
| 3D **Bake SVG silhouette** | A flat, filled vector silhouette looking along Z. This is not a shaded rendering or an editable volumetric SVG. |
| **Download SVG / OBJ** | The current vector shape or mesh as a standalone file. |
| **Download animation ZIP** | SVG or OBJ frames, explicit frame times, and the editable recipe. 2D archives also include `animated.svg`, using discrete SVG opacity animation. |

2D field units bake to 100 pixels. 3D field units are metres. Resolution controls the extraction grid, so small details below a cell's size may disappear. The lab previews at a capped resolution while bakes use the chosen resolution. Meshes are extracted with marching tetrahedra and welded shared edges; vector contours are sampled and simplified polylines, not fitted Bézier curves.

Limits: 24 primitives, 16 recipes, 0.1–10 seconds, 1–30 bake FPS, up to 96 intervals plus the exact endpoint. Resolution ranges are 32–256 in 2D and 12–48 in 3D. Worker and document geometry budgets can require fewer frames or lower resolution. Existing project node/asset limits still apply. Animated bakes use frame replacement rather than skeletal deformation or mesh morph targets. The source field remains in Shape Lab; scene playback uses the baked geometry and has no SDF evaluation cost.

## Integration and verification

Authoring uses `project.shapeLab = {version:1, recipes:[...]}` and `shapeLab.*` commands. Sampling/extraction lives in Studio core's `shape-lab/model`, `field`, `contours`, and `mesh` exports. Native baked meshes use `node.type = 'mesh'`; their normalized geometry is scaled by `node.dimensions`. Visibility animation uses numeric 0/1 `visible` tracks with step easing and is sampled as booleans for Three.js. Both standard and illustrated scene pipelines support it.

- Unit coverage: `puppet-studio/shape-lab/shape-lab.test.mjs`.
- Browser verification: `scripts/verify-shape-lab-browser.mjs` against the built editor on port 4354. Covers 2D/3D preview and insertion, keyed parameters, history, portable playback, both 3D pipelines, SVG projection, ZIP export, SVG import, cancellation, and project round trips.
