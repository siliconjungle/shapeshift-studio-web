# Trim Path

Select a path in **Artwork**, then open **Properties → Trim Path**. The shape needs a visible stroke. Trimming changes only the stroke; the fill, clipping geometry, anchors and Bézier handles remain intact.

- **Off** shows the entire stroke and keeps the saved trim settings.
- **Sequential** treats the subpaths of one shape as one total length, traversing them in path order.
- **Synced** applies the same percentages to each subpath independently.
- **Start / End** select a percentage interval. Defaults are 0% and 100%. Equal values hide the stroke; crossed values use the interval between them.
- **Offset** moves that interval along the path, wrapping every 100%. Negative values and multiple turns work.
- **Stroke cap** chooses butt, round or square ends.

For a draw-on animation, enable Auto-key, set End to 0% at the beginning, move the playhead, then set End to 100%. Start, End and Offset have independent keyframe tracks. **Key trim** captures all three at the playhead. Animate Offset from 0% to 100% to move a partial stroke through a complete turn. Mode and cap are base appearance settings.

Changes apply to every selected unlocked shape. Sequential mode combines subpaths within each shape; it does not combine separately selected shapes. Closed paths wrap across their origin with a continuous join.

Project saves retain the original geometry and animation. SVG export captures the current playhead as ordinary filled paths and trimmed stroke paths, retaining Bézier curves. Studio metadata lets reopening that SVG restore the editable source and trim settings. SVG export is a still frame; save the project to preserve keyframes.

The controls follow [Rive’s Trim Path behavior](https://rive.app/docs/editor/manipulating-shapes/trim-path). Studio currently has one stroke per shape. This feature covers Trim Path; the separate Dashed Stroke section on that page is not included.

Validation: `npm test`; `npm run build`; with the local server running, `node scripts/verify-trim-browser.mjs`. The browser check covers rendering/export/reimport, native SVG curve-length comparisons, clipping, runtime frames, selection, inspector controls, auto-key and undo/redo. Evidence is written to `work/trim/`.
