# Follow Path

Open **Constraints**, select the object to move, choose **Follow Path**, then **Add constraint**. Choose an SVG target and an individual path, or traverse all of its paths in order. Raw SVGs are converted to editable paths automatically using the Artwork importer; unsupported SVG constructs produce the same import error.

- **Distance (%)** measures travelled arc length. Key 0% at the beginning and 100% at the end to traverse the path. Linear easing gives constant speed on a static path. Negative distances and values over 100% wrap; exact nonzero whole laps reach the endpoint of an open path.
- **Orient to path** points the object's local +X axis along the tangent, replacing its authored rotation. Turn it off to retain the object's rotation. Strength blends from the authored pose to the constrained pose.
- **Keep authored position offset** adds the object's animated local position to the path position in its parent's coordinate system. It does not add an orientation offset.
- Distance, orientation and position offset have separate defaults and **At playhead** controls. Use their **Key** buttons to animate them. Strength uses the existing constraint keys. Edit values, easing, timing and deletion in the shared **Timeline**. Boolean properties use step keys.
- Hidden or fully trimmed paths remain usable as guides. SVG point animation and bone binding deform the followed geometry. Path coordinates include sprite sizing, pivot and parent transforms. Empty or zero-length geometry leaves the follower in its authored pose.

The feature runs in the 2D editor, portable HTML/JavaScript playback, rendered exports, library characters and 3D puppet layers. It does not author native XYZ splines for 3D scene objects. Mesh-warped, cropped, sliced, skewed, body-joined or procedurally generated target artwork is rejected; use a separate ordinary SVG guide for those cases. The SVG's own animation uses its existing asset-local clock. Constraint properties in state machines follow the dominant animation, as strength keys already do.

Use **Constraints → Load Follow Path example**, or open `puppet-studio/index.html?example=follow-path`, for an editable paper plane flying around a path. Loading an example replaces the current project; save your work first.

Data: `project.constraints` contains a `followPath` constraint with `node`, `target`, `path` (shape ID or null), `distance` (fraction of total length), `orient`, `ownerOffset` and `strength`. Animated properties use `clip.constraintTracks: [{constraint, channel, keys}]`; strength continues to use `clip.constraintWeights`. `constraint.key` accepts `channel: 'distance' | 'orient' | 'ownerOffset'`; omitted channel means strength. Joystick source timelines can drive these properties too.

Validation:

- `node --test puppet-studio/constraints/follow-path.test.mjs`
- `node scripts/verify-follow-path-browser.mjs` against the built local editor on port 4354

Reference: [Rive Follow Path constraint](https://rive.app/docs/editor/constraints/follow-path-constraint).
