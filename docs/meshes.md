# SVG and raster meshes

Studio's **Mesh** toolbar tool adds an editable triangle surface to a 2D artwork instance. It accepts both SVG and raster assets. **Load SVG cloth example** opens an original editable banner with a pinned left edge and keyed waves. Loading the example is undoable.

## Authoring

1. Select an image piece and open **Mesh**. Choose grid rows/columns and **Create mesh**. A 1×1 grid starts with four vertices and two triangles.
2. Use **Edit contour / source vertices** to move source vertices without warping the preview. The closed boundary clips the image. **New contour** lets you click a polygon, then **Finish contour**. **Auto-trace** follows the largest visible alpha island, with detail, threshold and padding controls.
3. In **Add vertices**, click within the surface to add a point, or close to a contour edge to split that edge. **Generate more vertices** inserts triangle centers. Select two points with Shift-click and **Force edge** to retain a seam during triangulation. Forced edges cannot cross. Delete points and remove forced edges with their buttons.
4. In **Deform vertices**, drag vertices or edit X/Y percentages. Shift-select and drag to move a group. **Key edits at the playhead** records positions in the current clip; turn it off to change the base mesh pose. **Key mesh pose** explicitly inserts a key. **Reset pose** restores undeformed positions using the same key/base mode.
5. The shared **Timeline** shows a **Mesh vertices** row for key selection, retiming, easing and deletion. Mesh keys are independent of joint transform keys.
6. Under **Bone weights**, select joints and bind at the current pose. Weights are initially assigned to the two closest bones. Select vertices and apply a custom nonnegative mix; it normalizes to 100%. Animate the bones with normal joint keys. Numeric mesh edits and mesh keys apply before skinning. Direct vertex dragging requires unbinding bones.
7. Copy/paste transfers normalized mesh geometry to another image; bone references are removed when pasting. Replacing the source image preserves the instance mesh. **Deform**, **Triangles** and **Dim art** control preview visibility.

The canvas is an isolated view of the selected artwork. Selected vertices are orange, contour vertices teal, and interior vertices purple. All committed operations participate in project undo/redo. Topology changes require removing bone bindings and vertex keys first. **Reset mesh & keys** explicitly replaces the topology and clears its keys/binding.

## SVG preservation and rendering

The original SVG and its editable vector model remain unchanged. Artwork animation is sampled first, then mapped onto the mesh. Rendering uses the same WebGL 2 texture pipeline as Studio's soft-sprite system, with shared triangle edges to prevent antialias gaps. The mesh works in the rig editor, exported animated HTML, PNG/frame output and 3D puppet layers. **Export posed PNG** writes the selected artwork at its current pose.

A deformed mesh is not baked back into SVG path commands. Save the project to retain editable SVG plus mesh data, or export an animated player. Static SVG mesh export is not offered because browser clipping of triangle fragments can introduce seams. Studio's separate **Bind Bones** tool directly deforms SVG vertices and Bézier handles and supports posed SVG output when that representation is preferable.

Current limits: one outer contour per sprite, up to 256 vertices and 32 influencing bones. Alpha holes remain transparent, and separate image instances can cover multiple islands. Meshes cannot share a sprite with vector-point binding, crop, N-slicing, body joins or procedural sprite binding. Mesh bones must be unbound before changing their joint origins. This is a 2D deformation surface, including when displayed as a puppet layer in 3D; it is not a volumetric 3D mesh editor.

## Data and commands

`joint.sprite.mesh` contains normalized source `vertices`, base `positions`, a boundary `contour`, forced `edges`, generated `triangles`, and optional bone binding. Coordinates are flat x/y pairs; vertex indices address pairs. Source vertices stay inside [0,1], while deformed positions may extend outside the image. Bind matrices convert through sprite size, pivot and the final joint world pose. `clip.meshTracks` stores keyed position arrays per joint.

```js
studio.dispatch({op:'mesh.create',joint:'cloth',columns:6,rows:4});
studio.dispatch({op:'mesh.positions',joint:'cloth',positions:[/* x, y, ... */]});
studio.dispatch({op:'mesh.key',joint:'cloth',clip:'wave',time:1,
  positions:[/* x, y, ... */],easing:'smooth'});
studio.dispatch({op:'mesh.bind',joint:'cloth',bones:['pin','tip'],clip:'wave',time:0});
studio.dispatch({op:'mesh.weights',joint:'cloth',vertices:[4,5],
  weights:[{bone:'pin',weight:25},{bone:'tip',weight:75}]});
studio.dispatch({op:'mesh.unbind',joint:'cloth'});
```

Commands also cover contour replacement, vertex insertion/removal, forced edges, subdivision, enable/disable, paste and removal. `@shapeshift-labs/studio-core/mesh` exports validation, triangulation, normalized coordinate transforms, pose sampling and reference cleanup without requiring a DOM. Mesh data, bone references and tracks are retained when saving/copying library characters.

Constrained triangulation uses [cdt2d](https://github.com/mikolalysenko/cdt2d), with input validation, T-junction splitting and contour-based face filtering. Bundled dependency notices are in `puppet-studio/MESH-LICENSES.txt`.

## Verification

`npm test` covers contours, forced edges (including 100 irregular fixtures), topology edits, keyed interpolation, transformed parents, weights, bounds, undo/redo, round trips, alpha tracing and library placement. `node scripts/verify-mesh-browser.mjs` checks the real panel, portable rendering, translucent triangle seams, rig drawing and 3D puppet playback, with screenshots and results under `work/mesh/`.

Reference: [Rive meshes](https://rive.app/docs/editor/manipulating-shapes/meshes). Rive's documented mesh workflow targets raster images; Studio also accepts SVG artwork as the source.
