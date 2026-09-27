# Body joins

Open `/puppet-studio/index.html?example=body-joins` to load the snake with joins enabled and its animation playing. Narrow windows open with **Focus canvas** enabled; **Show rig panels** restores the inspector and keyframe tracks. The example uses the self-contained geometric SVG artwork, with look, turn and strike clips.

In **Body joins**, select a moving artwork piece and the body it should bend, then choose **Join pieces**. The moving piece's pivot supplies the connection point. Adjust **Bend reach**, **Strength**, or **Pick connection on body** to tune the attachment. **Joined movement** temporarily disables the entire join; **Match outlines & colours** independently controls contour matching. **Unjoin pieces** removes the relationship. These edits support undo/redo and project saving.

Matching samples the silhouettes and colour transitions on either side of the connection. It maps the body's outer edges and corresponding colour bands onto the moving piece's cross-section, then blends that deformation into the stationary body. A local compositor removes dark cut lines that have become internal to the combined silhouette. Exterior outlines and interior drawn details are protected. Shared colours blend near the connection; translucent paint retains its normal compositing.

The editable SVGs remain separate. This is an animation-time deformation and seam treatment, not a destructive SVG path union. It works best with overlapping pieces, a connection near the cut edge, and corresponding flat colours. If suitable cross-sections cannot be found, the join still bends but skips contour matching. Large separations, incompatible contours and animated changes to the source silhouette may require artwork or attachment adjustments.

## Renderer integration

The relationship is stored on the moving joint as `bodyJoin: {targetNode, enabled, matchEdges, anchor, radius, strength}`. Existing projects have no joins and retain their original rendering. Library copies remap the body reference; deleting the body clears dangling joins.

The editor, exported Canvas player and puppet layers in 3D scenes share the same `renderFrame` implementation, including outline and colour matching. Motion is evaluated from the original rest pose, so seeking and playback use identical deformation. The renderer requires WebGL 2 for its textured deformation mesh.

For custom Three renderers, the runtime exports `bodyJoinFrame`, `prepareBodyJoinProfiles` and `bindBodyJoinGeometry`. Bind each original XY geometry once, update it with the body's frame joins, and restore it when disabled. This preserves Z, UVs, indices and materials. The geometry adapter supplies deformation only; custom vector renderers must also implement or reuse the seam compositor to match the Canvas result.

Run `npm test` for deformation, project editing, library remapping, outline/colour matching, seam protection and geometry adapter checks. `npm run build` includes the example and all shared runtime paths.
