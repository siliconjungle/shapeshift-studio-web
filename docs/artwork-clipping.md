# Artwork clipping

In **Artwork**, select one or more paths, then use **Clipping → ＋** in the
Properties inspector. Pick a source on the artboard or in Layers, or choose it
from the source dropdown and click **Add clipping path**. Escape cancels picking.
Sources are hidden when assigned; select **Edit** to move their geometry or
edit anchors, including while hidden. Visibility can be restored in Layers.

Each target can have multiple clipping sources. Their regions intersect. Choose
**Inside · Non-zero**, **Inside · Even-odd**, or **Outside · Even-odd** per source.
Outside uses an artboard-sized boundary with the source as an even-odd hole.
Source geometry is used regardless of its fill, stroke, opacity, visibility,
or its own clipping relationships. Shape morph keys and line boil affect the
clipping geometry at the current playback time.

Clipping is non-destructive. Removing a relationship preserves both paths.
Deleting a source removes references to it. Duplicating targets and sources
together remaps their relationships. Undo/redo and project JSON retain clips.
A locked target is excluded from inspector edits.

Studio currently has a flat editable path list. Selecting several paths applies
the same clipping relationship to all of them. Imported group-level SVG clips
are flattened to these per-path relationships, preserving their transforms.

SVG export writes ordinary `clipPath` definitions and nested clip groups at the
current frame. Supported imports include user-space clip paths containing one
shape (which may be a compound path), including inherited group clipping.
Object-bounding-box clips, multi-element clip sources, stylesheet-driven SVGs,
and nested clipping inside a source need expansion before import; the editor
reports this rather than silently changing their appearance. This does not
recover animation tracks from SVG; save project JSON to retain animation.

Validation:

- `node --test puppet-studio/vector/clipping.test.mjs`
- Build and serve, then `node scripts/verify-clipping-browser.mjs`.

The browser check exercises inspector controls, source picking, history,
animated hidden sources, selection hit-testing, group transforms, and pixel
parity between Canvas, exported SVG, and reimported paths. Evidence is saved
under `work/clipping/`.
