# Speech chunks and viseme bindings

Studio has a **Speech** button beside **Sound**. This connects recorded audio to
2D puppet clips. The existing procedural sound-effect library remains available.

## Authoring

1. Open Speech and choose an audio file (up to 15 MB). Saving embeds the recording,
   measures its duration and stores a 60 Hz amplitude envelope.
2. Paste timed cues in seconds: `[{"start":0.1,"end":0.25,"pose":"MBP"}]`.
   Cues should come from the generation/alignment pipeline, such as the Hume
   timestamps already used by the frog. A `phoneme` metadata field is retained.
   There is no speech recognition or automatic text alignment in this editor.
3. Create a character binding. The template lists supported visemes and the
   selected joint's existing artwork. Replace asset IDs with the registered
   mouth or face drawings. Keep artwork dimensions and pivots consistent.
4. Add the chunk at the playhead. Change placement/rate through the shared
   timeline's move/retime tools; delete through either the timeline or Speech.
   Select a placed chunk in Speech to seek to its start.
5. Save project to retain recordings, timings and bindings together. Playback
   through the exported runtime uses the same speech data.

A viseme is a visible speech pose. Several speech sounds can share one drawing.
The supported labels are `rest`, `MBP`, `AI`, `E`, `O`, `U`, `FV`, `L`, `WQ`, `TH`
and `CDGKNRSTYZ`. Map these to character-specific pose names when desired.
These labels are an authoring vocabulary, not a universal phoneme alphabet.

## Binding example

```json
{
  "name": "Wizard voice",
  "attack": 0.035,
  "release": 0.055,
  "map": { "U": "O", "WQ": "O", "L": "AI" },
  "poses": {
    "rest": { "artwork": { "mouth": "mouth-closed" } },
    "MBP": { "artwork": { "mouth": "mouth-closed" } },
    "AI": {
      "artwork": { "mouth": "mouth-open" },
      "values": { "jaw": { "y": 2, "scaleY": 1.04 } }
    },
    "E": { "artwork": { "mouth": "mouth-wide" } },
    "O": { "artwork": { "mouth": "mouth-round" } }
  },
  "envelope": { "joint": "head", "channel": "y", "amount": -1.5 }
}
```

Joint IDs and artwork IDs must exist in the project. Pose transform values are
additive offsets; scales use 1 as neutral. They blend through short attack/release
windows. Artwork uses the strongest named pose as a held replacement; it never
crossfades or automatically matches unrelated paths. Unmapped visemes fall back
to `rest`. Outside a chunk the original authored animation owns the rig again.

One binding may control several joints or replace a combined face drawing.
Separate mouth layers are optional. For point deformation, use existing authored
SVG point tracks on the same clip. The intentional frog is an example: its mouth
animation is already baked into its vector tracks, so its native speech binding
is empty and only the embedded recordings are added. It does not receive another
layer of deformation.

## Data and runtime

- `project.speech = {version:1, chunks:{}, rigs:{}}`
- Chunk: `{src, duration, cues, name?, envelope?, envelopeRate?}`
- `clip.dialogue = [{id, time, chunk, rig, rate:1, gain:0.72, enabled:true}]`
- Commands: `speech.chunk`, `speech.rig`, `speech.place`, `speech.remove`.
  All go through Studio's validated undoable transactions.
- Shared core API: `@shapeshift-labs/studio-core/speech` exports `speechAt`,
  `visemeWeights`, `envelopeAt`, `validateSpeech`, `applySpeechCommand`,
  `VISEMES` and `SPEECH_COMMANDS`.
- `speechAt(project, clip, time)` returns viseme weights, chosen poses, additive
  transform deltas and artwork selections. A game can sample with its audio
  playback time and drive its own rendering. Native 3D facial/node binding and
  a dialogue graph are not included in this first editor integration.
- `SpeechAudio` caches decoded buffers and schedules chunks on one Web Audio
  clock. Seeks use source offsets; pause cancels pending playback; playback rate
  scales audio and viseme timing together. Slow preview also lowers pitch.
- Chunk placement must fit the clip. Two chunks cannot overlap on the same rig.
  Use independent joints/bindings for different speakers. Keep authored SFX on
  the existing sound cue tracks.
- Timeline waveform bars use saved envelopes without decoding audio per frame.
- Speech uses presentation time during hit stops; acting tracks may remain frozen.
- Imported relative audio URLs resolve against the host page. Embedded audio is
  preferable for portable projects. Browser playback must begin from a gesture.

## Validation

`node --test puppet-studio/authoring/speech.test.mjs`

Covers normalized viseme transitions, rests, registered artwork selection,
pose offsets, rate changes, timeline retiming/removal, validation rollback,
undo/redo, buffer caching, sample offsets, slow preview, cancellation while
loading and avoiding doubled speech transforms when baking ordinary motion.
