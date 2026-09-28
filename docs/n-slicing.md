# N-slicing in 2D and 3D

N-slicing resizes selected bands while protecting details such as corners, borders, pillar capitals, bases and decorative rings. It follows the fixed/stretch band approach described in [Rive’s N-slicing introduction](https://rive.app/blog/responsive-layouts-phase-two-n-slicing).

## 2D pieces

Select a piece in **Rig → Inspector → N-slicing**, then enable **Preserve fixed bands when resizing**. The current image width and height become its reference size. Change **Image width / height** to resize it. PNG/JPEG/WebP images, cropped sprite atlases and editable SVG assets use the same band mapping.

The default has cuts at 20% and 80% on both axes: fixed corners and borders with a stretching centre. For example, a 100 × 100 frame becomes 240 × 150 while its 20-unit borders remain 20 units thick.

## 3D objects

Select a geometry object in **Scene → Inspector → N-slicing** and enable it. Change its **Dimensions** to resize. The pillar default protects the bottom and top 20% of Y, stretches the middle, and scales X/Z uniformly. A 2-unit pillar resized to 6 units keeps both 0.4-unit end regions intact.

X, Y and Z are independent. Add X/Z bands to protect bevels, or several Y bands to protect rings at different heights. Percentages run from each axis’s minimum to maximum; Y runs bottom to top in 3D and top to bottom in 2D.

The mesh is split at band boundaries before resizing, so sparse triangles cannot stretch across a protected detail. UVs, paint attributes and material groups are retained, and normals are adjusted. Face artwork follows the corresponding axes, including reversed faces. Both standard and illustrated 3D renderers retain the slicing when rebuilding SVG detail during zoom. Outlines, shadows and picking consume the resized mesh.

## Editing bands

Enter comma-separated cut positions, such as `10, 30, 50, 80`, then click the coloured **Fixed / Stretch** bands to choose their behavior. Each axis supports up to 32 cuts and requires at least one stretch band. An empty cuts field means uniform stretching along that axis.

Stretch bands share the extra space in proportion to their original lengths. If the target is smaller than all fixed bands combined, the stretch bands collapse and the fixed bands shrink together; the mapping never reverses.

Disabling N-slicing preserves the saved bands and reference size. **Reset to border/pillar bands** captures the current size as a new reference and restores the preset. Project saves, undo/redo and exported runtimes retain the settings. Repeated resizes always derive from the reference geometry rather than the previous result.

N-slicing edits authored image sizes and geometry dimensions. Ordinary Scale controls, scale gizmos and transform animation still scale the complete result. It applies per image piece or geometry object; a group or linked puppet is resized through its pieces. It does not add responsive layout constraints or dimension animation tracks.

## Verification

Run `npm test` and `npm run build`. With the local server running on port 4354, run `node scripts/verify-slicing-browser.mjs`. Browser evidence is saved in `work/slicing/`, including both inspectors, 2D pixel checks and the pillar/face-art checks in both 3D renderers.
