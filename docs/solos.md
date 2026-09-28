# Solo groups

A Solo renders exactly one direct child's entire branch, or None. Nested Solos can select independently inside that branch. Use this for expression frames, skins, or alternate rigs built from SVGs, raster artwork, bones and groups.

Open **Solos** in the 2D toolbar. Select sibling pieces in the panel and choose **Wrap in Solo**, convert a group without artwork using **Make this group a Solo**, or create an empty Solo and use pieces' **Parent** fields to move them inside. Wrapping inserts an identity transform and preserves local animation and world positions. Wrapping children of an existing Solo also transfers its switches to the new nested group.

The radio controls beside children in the hierarchy and in the panel set the rig default in Rig mode, or record a hold key at the playhead in Animate mode. Re-selecting the active child also records a key. **None** hides every child. Before the first key, the rig default applies. Use **Timeline** for moving, retiming, deleting, and changing selections; selections cannot interpolate. Converting to an ordinary group removes Solo selection tracks while retaining children and their transform animation. Undo restores these edits.

Inactive branches are excluded from rendering, lights, body-join deformation/seams, sprite-bound liquids/connections, canvas picking, gizmos, and framing. Transform/constraint evaluation continues for all branches so other rig references remain valid. Scene-wide procedural surfaces and global FX are not joint children and are not selected by a Solo.

Solos survive project save/load, character library capture/placement/update, runtime export and 2D puppet playback inside 3D scenes. They do not currently select among native 3D scene objects. Demo: `?example=solos`.

Data: `joint.solo = { activeChild: childId | null }` on a group without a sprite; `clip.soloTracks = [{ node: groupId, keys: [{ time, value: childId | null, easing: 'hold' }] }]`. Only direct children are valid selections. Deleting or reparenting a selected child changes dangling defaults/keys to None. Commands: `solo.create`, `solo.wrap`, `solo.enable`, `solo.disable`, `solo.default`, `solo.key` (with `remove: true` to delete a key). These use the same project transaction and history path as other authoring commands.

Validation: `npm test`, `npm run build`, and `node scripts/verify-solos-browser.mjs` with the local server on port 4354. Browser checks cover actual controls, overlapping-piece picking, history, wrapping, timeline selection edits, save/reload, portable rendering pixel colors at exact key boundaries, raw rendering, and animated/looping 3D puppet textures.
