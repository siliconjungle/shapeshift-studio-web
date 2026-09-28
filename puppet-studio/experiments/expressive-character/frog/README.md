# Frog wizard portrait puppet

Run `npm start` in `shapeshift-studio-web`, then open:

- [Live portrait workshop](http://127.0.0.1:4354/puppet-studio/experiments/expressive-character/frog/index.html)
- [Editable baked Studio project](http://127.0.0.1:4354/puppet-studio/index.html?portrait=frog)

For a focused rebuild: `node scripts/build-frog-portrait.mjs`. This avoids rebuilding the map's artwork. The ordinary production build includes this demo too.

## Use it

Choose one of nine reactions. The playhead scrubs the complete anticipation, expression and recovery. **Hold expression** pauses before recovery; uncheck it to play the full gesture. **Play all** runs all nine performances. A new reaction blends from the current pose so interruption does not snap to neutral.

Shape sliders override the sampled controls. **Key these controls here** records those values at the playhead in the selected reaction. **Save rig / Load rig** round-trips the portable `inkwell-portrait` control document. This demo does not overwrite Studio autosave.

Hold the mouth buttons to inspect REST, M/B/P, A/I, E, O, U, F/V and L/T. The latter contact shapes are stylised for a toothless frog. They are shared *visual* groups, not a one-mouth-per-letter animation.

**Speak** plays one Hume babble phrase, or composes a conversation from three chunks with varied pauses and middle/end phrases. Speech overlays the expression. Six newly generated multi-syllable chunks share the game's existing woodland v3 Hume character voice. They are invented language, not animal recordings or English TTS. The initial frog recordings and temporary English tests are not shipped or used.

## Artwork and construction

The approved `../concepts/frog-portraits.png` is the visual reference. GPT Image generated six separate production pieces. `scripts/prepare-frog-portrait.mjs` separates alpha, runs the **real Little Gods `cel` conversion** with 12 colors, traces spline paths, maps them to a shared palette, and writes both genuine SVGs and editable Studio vector documents. There are no PNG textures embedded in the delivered SVG artwork.

- [Generation prompt](assets/source/generation.json)
- [Conversion metrics and palette](assets/pipeline.json)
- [SVG assets](assets/artwork.json) as editable path documents

`puppet.js` combines those generated paths with purpose-authored facial vector geometry. One continuous face surface changes cheek width, chin/jaw shape and throat volume. Eyes, pupils, glints, lids, mouth, tongue and cheeks are separately controlled. The happy-eye corrective has compatible cubic points with the open-eye shape. The jaw stays within the deformed chin. Eye caps clip to the eye opening. The upper hat region bends and trails head motion; ties are separate paths.

The costume overlaps the neck. Sleeves sit behind it. Curled, pointing and splayed hand drawings share wrist coordinates; a contact solver positions the pointing fingertip against the moving chin. Face/chin contact coordinates are in the same parent transform as the head. Hands use authored drawing replacements as gestures change; they are not inferred anatomical finger rigs.

This is a front-view head-and-shoulders rig with limited head tilt and squash/stretch. It does not yet have authored profile/back views. It is an animation prototype, not a claim that every frame reproduces the concept sheet exactly.

## Reusable system

`puppet-studio/portrait/controls.js` supplies validated named controls, deterministic timeline sampling, bounded blending, springs and coarticulated viseme weights. It uses Studio's existing vector key sampler and transform math.

`rig.js` supplies frog defaults, limits, nine 24 fps reaction timelines and expression targets. `frogFrame()` is a deterministic geometry evaluation; seeking backwards is independent of frame history. Live pointer gaze and occasional blinks are separate from export.

`puppet-studio/portrait/studio-export.js` bakes a performance into a standard `inkwell-puppet` v1 project with twelve named joints and editable SVG point tracks. It expands eye clips into vector paths before export, preserves matching path topology, records transforms at 24 fps, and linearly interpolates vector keys sampled at 12 fps. Exported files can be opened in Puppet Studio's normal Open project flow; the example URL loads a prebuilt throat-inflation clip. **Export Studio clip** exports the selected reaction and its keyed edits, not the currently playing random speech sequence. **Save SVG pose** captures the complete current drawing, including its mouth pose.

The live renderer creates SVG nodes once, parses no SVG and runs no tracing or fullscreen outline shader during playback. Only numeric paths, group transforms and appearance attributes change. No unbounded per-frame pose cache is kept.

## Composable voice chunks

`audio/babble/manifest.json` has each chunk's file, duration, emotional tag, Hume generation ID, IPA phonemes, visual mouth cues and 100 Hz audio envelope. `source/*.json` preserves the original API response metadata and request; WAV masters are retained. Generation credentials remain outside the assets and browser bundle.

Run `node scripts/generate-frog-babble.mjs` to process/reuse the stored generations. Missing chunks use the game's existing Hume credential lookup and its saved woodland v3 voice. Completed chunks are reused, so a rebuild does not generate them again.

New requests use Octave 2's [phoneme timestamp support](https://dev.hume.ai/docs/text-to-speech-tts/timestamps). Returned short onset intervals are extended toward the next sound (bounded to 280 ms for vowels and 100 ms for consonants). Mouth targets overlap over short envelopes; voice energy closes the jaw through silence. FFmpeg normalises loudness without trimming or changing playback speed, keeping cue times aligned. The audio context's clock drives the visemes. There is no runtime letter guessing.

Final character voice design, additional chunks and a more extensive dialect can replace this bank without changing the puppet. The current bank is a working six-chunk set.

## Checks

`node --test puppet-studio/portrait/portrait.test.mjs`

Covers all nine reaction paths and reverse seeking, mouth containment across reaction/viseme extremes, a moving head's fingertip contact, continuous speech blending, native project validation and morph topology, and Hume cue bounds/vowel coverage.

`scripts/check-frog-portraits.mjs` renders a contact sheet from the actual rig for comparing poses. The live browser is also checked for reaction playback, scrubbing, speech composition, sliders and export.
