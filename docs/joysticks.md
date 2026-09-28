# Joysticks

Joysticks let you reuse a detailed keyed animation as a simple control. X and Y each scrub an assigned source timeline: −1 is its start, 0 its midpoint, and +1 its exact end, even if that source loops. Inverting an axis reverses this mapping. Assign only one axis for a horizontal or vertical slider. This is timeline scrubbing, not a four-corner pose blend.

## Authoring

Open **Joysticks** in the 2D toolbar, or press **J** and click the stage. Assign timelines to X and Y. The **Edit source timeline** buttons open those clips for ordinary keyframe editing; controls are bypassed while editing a source clip so it can be edited directly. Return to a playback clip to use the controls.

Drag the stage widget or the panel pad, or edit Handle X/Y. Rig setup changes the default handle. Animate mode records handle keys at the current playhead. A complete drag is one undoable edit; Escape cancels it. **Add key** / **K** on a selected joystick also records its handle. Use **Timeline** to edit values, easing, timing, or delete keys. Interpolation and overshoot use the usual easing controls, with sampled coordinates clamped to −1…1.

The control is a named group joint. Its normal Position fields in Rig setup move it; parenting attaches it to a rig. Width/Height set its rectangle. **Draw in world space** scales it with the stage zoom; disabling it keeps its display size fixed. **Show joysticks on stage** only changes the editor overlay. Widgets never render into exported artwork or expand export framing.

## Sources and ownership

Source timelines support transform keys, mesh vertex keys, Solo choices, draw-order rules, constraint strengths, light/colour keys, illustration tracks, and resolved property tracks. Effects, legacy IK and pose tools must be baked to property keys before their clips can be assigned. Global sounds, presentation cues and scene-wide FX are not replayed by scrubbing a source. Vector asset timelines retain their own clock; joystick mesh tracks and bones can deform SVG artwork.

Full transform keys include neutral components. Only components with a non-neutral keyed value claim ownership, so an X translation source and a Y translation source can independently drive the same object. Two axes/controls claiming the same property are rejected. Direct keys on a driven property in a playback clip are rejected too; edit the source or animate the handle instead. Blank controls are valid while setting up a rig.

A source timeline can contain handle keys for another joystick. Controls are evaluated in dependency order; cycles are rejected. A source timeline that drives just X of another handle must leave its Y component at zero, and vice versa.

**Handle source** follows another object's position, expressed in the joystick's local rectangle and clamped to its edges. Its mapping uses authored world-space dimensions regardless of the editor zoom/display-size setting. The source position is sampled before joystick output, including normal animation and session overrides. A source/control placement cannot depend on joystick-driven transforms, preventing feedback loops. Sourced handles cannot also be driven by another joystick. Manual keys are retained if an object source is assigned, but the source takes precedence until removed.

## Playback and portability

Keyed joysticks work in the 2D editor, state-machine clip playback, exported players, and 2D puppet layers inside a 3D scene. They do not control native 3D scene-object timelines. Character library capture, placement, publication and previews carry source clips and remap control/object/clip references. Removing a source clip unassigns its axis; deleting a source object restores manual control. Removing the joystick retains its group and children and removes its handle tracks.

Runtime applications can animate or supply normal transform overrides for an assigned source object, for example by passing its local `x` and `y` through `renderFrame(..., {overrides: [...]})`. No editor widget is required at runtime.

Data lives on `joint.joystick = {handle: [x,y], size: [width,height], worldSpace: true, handleSource: null, axes: {x: {clip, invert: false}, y: null}}`. Handle animation lives in `clip.joystickTracks = [{node, keys: [{time, value: [x,y], easing}]}]`. Authoring commands are `joystick.create`, `joystick.configure`, `joystick.default`, `joystick.key`, and `joystick.remove`.

Demo: `?example=joysticks`. Run `npm test`, `npm run build`, and `node scripts/verify-joysticks-browser.mjs` (local server on port 4354). The browser check covers real stage/panel drags, one-gesture history, numeric keys, inversion, timeline editing, source navigation, save/reload, placement, portable rendering pixels, and looping 3D puppet textures.
