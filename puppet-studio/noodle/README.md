# Noodle deformation

Open **Noodle** in the Studio toolbar. **2D example** and **3D example** load a small squash, stretch, bend and twist demonstration. These replace the current project like the other example loaders; save authored work first.

Select SVG artwork or a native 3D mesh and choose **Add Noodle deformer**. Drag the spine handles, edit their position, thickness and twist, then play or scrub the clip. In 3D, switch between the X/Y and Z/Y handle planes. Coordinates are relative to object height, with the default spine running from −0.5 to +0.5 on local Y. Stretch is anchored at the first handle. Preserve area/volume compensates the cross section for spine length and stretch.

**Key edits at playhead** records complete poses. The handle controls show the authored pose before lag/overshoot; changing one field preserves the other authored fields. Uncheck it to edit the rest definition. Pose keys support smooth, linear and step interpolation and appear in the regular timeline. Lag progressively delays the handles; spring adds deterministic overshoot. This is an authored follow-through effect, not a physical soft-body simulation. Scrubbing, reverse sampling and portable playback give the same result.

## Artwork and skeletons

**Drive artwork with an existing skeleton** binds selected control bones in their current neutral pose. Skeletons may branch; they need not form a single chain. Animate bone rotation, translation and scale through the normal timeline:

- Editable 2D SVGs use the existing per-point bone binding and weight editor. Artwork with a mesh uses its mesh binding. Path control points and artwork mesh vertices actually move.
- 3D meshes blend up to four nearby bone transforms per vertex, with adjustable per-bone influence. Binding stores the rest matrices. Rebind after changing the neutral skeleton layout. The Noodle spine can be layered on the skinned artwork.
- SVG paths gain sampled edge points during Noodle bending. Coarse 3D meshes receive bounded edge subdivision when the deformer activates. Source paint, UVs, normals and material groups are retained. Subdivision is capped for large imports.

The native 2D renderer requires no 3D scene. Twist projects the rotated cross section into the drawing plane. Optional side/back drawings are selected by the overall Turn angle; those drawings must be authored because hidden artwork cannot be inferred from the front view. Use the normal mesh renderer for raster artwork. Existing SVG gradients retain their paint definition; the deformer does not convert them into warped gradient meshes.

## Baking and export

**Bake SVG pose** creates an independent editable vector asset at the current pose. **Bake SVG animation** samples the clip into vector frames with step visibility keys, up to 96 intervals. It includes point bone deformation and turning drawings, keeps the original rig, and supports undo. All turning drawings must be editable vectors. Mesh/raster artwork uses the regular rendered export instead.

The 3D **Download posed OBJ** command exports the selected mesh's current Noodle-deformed geometry in local coordinates. It does not embed SVG face attachments, materials, animation, or additional GPU-only deformation. Use the existing portable scene player for animated scenes and attached artwork. Both standard and illustrated 3D renderers deform actual mesh vertices and attached SVG geometry; depth, picking, shading and freehand silhouettes follow those vertices.

## Data and validation

Definitions live on `joint.noodle` / `node.noodle`; full pose keys live in `clip.noodleTracks`. 3D bind matrices live in `node.skin`. All edits use project commands/history. The shared core exports `noodle/model` and `noodle/deform`; no UI state is needed for playback.

Run `npm test` for integration checks. After `npm run build`, run `node scripts/build-noodle-proof.mjs` and open `/puppet-studio/noodle-proof.html` on the local server for native 2D, raster mesh composition, SVG bake, both 3D renderers, attached artwork, and exact-loop rendering checks.
