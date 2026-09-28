# Animated draw order

Use **Draw order** in the toolbar or **Draw-order rules…** in the joint inspector. **Load draw-order example** opens an arm that alternates between behind and in front of a body. Loading the example is undoable.

1. Select a piece or a joint group under **Working on**.
2. Add a rule choosing **Above target** or **Below target** and a drawable image piece. The target may belong to another hierarchy branch. A group cannot target itself or one of its own descendants.
3. In **Animate**, select a rule’s radio button to record a key at the playhead. Select **Normal** to key a return to the base order. Keys hold until the next key; there is no interpolated intermediate ordering.
4. In **Rig setup**, selecting a rule sets the default used by unkeyed clips and before the first key. Normal restores the authored numeric layer order.
5. Use the panel’s key list to seek/delete keys, or **Timeline → Draw order** to retime them and change the selected rule. The timeline shows a rule dropdown instead of an easing curve.

The existing **Forward**, **Back**, **To front**, **To back**, and layer-list drag controls create relative rules and hold keys in Animate mode. In Rig setup they continue to edit the static order. The numeric **Base draw order** field always edits the rig, not an animation key.

A rule moves the owner’s artwork and all descendant image pieces as a block, preserving their internal order, transforms, and parents. A drawable target must be a Studio image piece (SVG or raster); a joint without artwork is not a target. This orders pieces, not individual paths inside one SVG asset. Nested group rules are supported when their ordering requirements agree. Conflicting/cyclic active rules are rejected transactionally.

The Draw order list and hit testing use the currently evaluated order. Hidden pieces retain their place in the ordering, so toggling visibility does not change the meaning of a rule. Rule deletion or target deletion converts affected keys to Normal; undo restores the original keys.

## Playback and reuse

Rules run in the rig view, portable animated player, PNG/frame rendering, and 2D puppets embedded in 3D scenes. They do not alter native 3D depth testing. Other render systems, such as particle layers, keep their own numeric layer settings; image pieces occupy their sorted layer slots in the resolved order.

Project save/import, clip duplication, clip-duration retiming, joint renaming, character-library capture/placement/publishing, and linked puppet sources preserve the rules and keys. Library capture requires including the rule targets in the character. State-machine playback uses the presented clip’s rule track and clock; order switches discretely rather than crossfading.

## Data and commands

`project.drawOrder` is an array of `{node, rule, rules}` entries. `rule: null` means Normal. Each rule is `{id, name, target, placement: 'above' | 'below'}`; IDs are unique within their owner. `clip.drawOrderTracks` contains `{node, keys: [{time, value: ruleIdOrNull, easing: 'hold'}]}`.

```js
studio.dispatch({op:'drawOrder.add', node:'arm', id:'front',
  name:'Arm in front', target:'body', placement:'above'});
studio.dispatch({op:'drawOrder.key', node:'arm', clip:'wave',
  time:1, rule:'front'});
studio.dispatch({op:'drawOrder.key', node:'arm', clip:'wave',
  time:2, rule:null});
```

Other commands: `drawOrder.update`, `drawOrder.remove`, `drawOrder.default`; `drawOrder.key` accepts `remove: true`. All are undoable through the project store. Limits are 256 owners, 32 rules per owner, and 4096 draw-order keys per project. Pure validation, evaluation, reference remapping, cleanup and commands are exported from `@shapeshift-labs/studio-core/draw-order`.

Reference: [Rive’s animated draw-order workflow](https://rive.app/docs/editor/animate-mode/animating-draw-order).

## Verification

`npm test` covers held transitions, group/nested ordering, equal base layers, defaults, invalid targets, cycles, timeline operations, cleanup, library transfer and preservation of transforms. With the built editor served on port 4354, `node scripts/verify-draw-order-browser.mjs` checks the actual UI, picking, layer list, history, saved JSON, rendered pixels immediately before/at a rule key, the portable runtime and 3D puppet playback. Evidence is written to `work/draw-order/`.
