# Vector bone binding and page turns

Open **Bind Bones → Load animated book example** in the 2D rig workspace. The original, editable example demonstrates the depth illusion created by an anchored spine, moving page-edge controls, separately weighted Bézier handles, layered pages and animated shading. The page is authored as a constant-length cylindrical section projected into 2D; its top and bottom edges share a curl so the sheet does not shear or change width. Narrow vector surface sections cover each other at edge-on poses, avoiding self-intersecting silhouette holes. A hidden whole-page control cage remains available for inspecting the overall curve; edit the visible sections or animate the six controlling joints to change the rendered page. Loading the example is undoable.

## Authoring

1. Add SVG artwork, and open it in Artwork so it has editable vector paths. Add the joints that will control it.
2. Pose those joints where the control points belong. In **Bind Bones**, choose the artwork, check the controlling joints, then **Bind selected bones**. Binding captures the current pose and assigns normalized weights to the nearest two joints for each vertex and handle. It binds all paths in that artwork instance.
3. Choose a path. Pick squares (vertices) or circles (Bézier handles) in the preview, or use the Point dropdown. Shift-click selects multiple points. Set nonnegative weights and click **Apply weights**; they normalize to 100%.
4. Animate the controlling joints using the regular rig timeline. The book keeps both spine endpoints assigned to stationary spine controls, while edge and curl controls turn the page. Handles can follow entirely different bones from their vertices.
5. Save the project to retain bindings and keys. Export animated HTML for playback, frames for raster output, or **Export posed SVG** in the binding panel for a static vector snapshot of the selected artwork.

The panel's weight fields show the first selected point; applying them assigns that mix to every selected point. Rebinding replaces the weights and captures a new reference pose. Disable deformation temporarily to compare with the source, or Unbind before changing path topology. Point positions, fills, gradients and existing path animation remain editable. Deleting paths removes their bindings; newly added or duplicated paths need rebinding. Deleting bones removes their influences and normalizes survivors (or assigns the first remaining bone when no influences survive).

## Rendering and scope

Binding uses affine linear blend skinning of vector control points. It is applied after artwork animation and final joint posing, including constraints. It works in rig drawing, animated rendering, portable HTML/frame exports and 3D puppet layers. Bounds expand to avoid clipping control points that move outside the source viewBox. Authored artwork is never overwritten by playback.

This creates a 3D-looking illustration from 2D paths. It does not add volumetric page geometry, cloth physics, automatic perspective/occlusion or raster mesh skinning. For objects viewed from arbitrary angles, use actual 3D geometry. Crop, N-slicing, body joins and procedural sprite bindings cannot currently share the same bound sprite. Bound joint origins cannot be moved until unbound. A replacement artwork asset must have the same bound path IDs and topology.

## Project data and commands

`joint.sprite.boneBinding` stores the asset-to-world bind matrix, each bone's reference world matrix, and normalized influences for every flat x/y pair in each bound shape. Cubic handles have their own pairs. Each shape also records its command topology so invalid edits fail transactionally.

```js
studio.dispatch({op:'boneBinding.bind', joint:'page', bones:['spine','edge','curl'], clip:'turn', time:0});
studio.dispatch({op:'boneBinding.weights', joint:'page', shape:'paper', points:[1,2],
  weights:[{bone:'spine',weight:25},{bone:'curl',weight:75}]});
studio.dispatch({op:'boneBinding.enabled', joint:'page', enabled:false});
studio.dispatch({op:'boneBinding.unbind', joint:'page'});
```

`points` contains zero-based x/y **pair** indices, not flat numeric offsets. Commands participate in normal project history. The DOM-free engine is exported from `@shapeshift-labs/studio-core/bone-binding`; `boundVector` returns a reusable sampled vector and adjusted sprite dimensions/pivot. Its result is transient: clone it if retaining multiple frames.

## Verification

- `npm test`: includes binding math, transformed parents/viewBoxes/pivots, independent handle weights, fixed spine, looping, asset keys, dynamic bounds, invalid topology rollback, deletion and undo/redo.
- `node scripts/verify-bone-binding-browser.mjs`: verifies panel editing, undo/redo, enable/disable, JSON reload, portable frames and 3D puppet texture animation. Artifacts are written to `work/bone-binding/`.

Reference: [Rive's bone binding examples](https://rive.app/docs/editor/manipulating-shapes/bones#2-binding). Studio's book artwork and implementation are original.
