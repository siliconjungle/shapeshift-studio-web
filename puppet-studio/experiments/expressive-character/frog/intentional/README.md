# Frog wizard: intentional pose study

Open `http://127.0.0.1:4354/puppet-studio/experiments/expressive-character/frog/intentional/index.html`.

This candidate replaces the rejected automatic whole-portrait morph with deliberately staged drawings: clasp, release, lift, approach, contact, overshoot and settle. The main frog page remains on the earlier drawing-based performance while this version is reviewed.

## What actually interpolates

- Head translation, tilt, squash and hat follow-through use explicit timing keys, evaluated continuously.
- One canonical hat and costume drawing stays in place beneath the changing face and hands. A skin/eye mask selects those changing regions; a shared hat-brim layer preserves overlap. A complete drawn cowl panel repairs the area revealed when the hands leave the chest.
- During anticipation, filled eyelids close over the existing round pupils. The pupil artwork is never converted into a different shape.
- Speech blends locally between authored mouth contours, driven by the existing Hume chunks and phoneme timings. The face, hands and hat keep their artwork throughout speech.
- Hands change through drawn breakdown poses. This is held-drawing animation with continuously moving controls; it is **not** continuous finger-mesh interpolation. There are no whole-image crossfades, nearest-path matches or automatic hand-outline morphs.

## Artwork and registration

[Source sheet](assets/keyframes-source.png) was generated with the built-in GPT Image tool using the approved frog as the reference. The exact [prompt](assets/generation.json) and [acting plan](assets/acting-plan.json) are retained.

`scripts/prepare-frog-intentional.mjs` uses the real Little Gods `cel` color reduction and VTracer spline conversion. It isolates each character component and retains one shared scale (600 / 443.5) and canvas. The sheet's actual column/row origins are explicitly registered; no drawing is individually resized to its bounding box. [Conversion details](assets/svg/pipeline.json) and genuine editable SVG drawings are retained. No raster images are embedded in the SVGs.

Build only this study with `node scripts/build-frog-intentional.mjs`. The main portrait build also includes it. The original audio bank is reused, and there are no audio generation requests during playback.

## Remaining review

The drawing changes are still held poses. Before promoting this candidate, review the motion at normal speed, especially the release and return to clasp. The underlying source drawings vary in their hat/costume details; the live composition reuses the canonical wardrobe so those changes are not shown. The separate native export preserves this composition without changing the older demo’s project.

Run `node --test puppet-studio/experiments/expressive-character/frog/intentional/performance.test.mjs` for shared-canvas, pupil-preservation, continuity, reverse-seeking, and local viseme checks. Browser checks cover the composed, anticipation, lift, cheek-contact and closed-mouth poses, playback to the end, and console errors. These checks do not establish that every held-drawing transition meets the final animation-quality bar.


## Editable Puppet Studio project

Open `http://127.0.0.1:4354/puppet-studio/index.html?portrait=frog-intentional` or download `frog-intentional.puppet.json` from the study.

The project has 11 joints and 10 editable vector assets: shared costume, seven face/hand drawings, eyelids, and shared hat. Drawing visibility uses hold keys. Compatible geometry uses linear point tracks baked from the explicitly authored movement controls; these are sampled export keys, not additional hand-authored acting poses. To change the high-level performance, edit `performance.js` and regenerate; to change an exported path or retime individual tracks, use Studio’s Artwork view and timeline.

The masks are flattened into vector boundaries once by `scripts/prepare-frog-native-art.mjs`. Uncut cubic paths are retained. Export-time clipping does not require runtime mask support or raster artwork. `scripts/export-frog-intentional.mjs` writes the project and reduces redundant point keys with a 0.12 px sample-error threshold. Checked review poses differ from the export source by at most 0.184 px; clipping and curve flattening add their own small approximation. The file is approximately 21 MB.

The Hume voice recordings play in both the browser study and the native project. The native file embeds the two recordings as Speech chunks on the clip timeline. Its mouth animation is already authored into SVG tracks, so its speech binding intentionally adds no extra deformation. Speech playback, seeking and preview speed use the same chunk times. The browser study now uses the shared viseme-weight sampler while retaining its existing drawings and timing.

Rebuild in order after changing artwork or acting:

```sh
node scripts/prepare-frog-native-art.mjs
node scripts/export-frog-intentional.mjs
node scripts/build-frog-intentional.mjs
```

Validation: `node --test puppet-studio/experiments/expressive-character/frog/intentional/*.test.mjs`. Tests cover editable vector validity, exactly one visible face/hand drawing at every transition, backwards seeking, and native versus source geometry at the review poses. The native Studio canvas was checked at the settled expression and during playback.
