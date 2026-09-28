# Shapeshift Studio Web

A standalone browser editor for 2D puppets, SVG artwork, illustrated 3D scenes, animation, sound, entities, and data-defined behaviour.

## Run

Use Node.js 22 or later. Run `npm ci`, `npm run build`, then `npm start`. Open http://127.0.0.1:4354/.

The editor starts with editable artwork. All built-in examples are self-contained; no external content pack is required. Import your own artwork or project JSON and save reusable components in the Library.

Shared rendering, transforms, motion, lighting, entity schemas, and behaviour primitives come from `@shapeshift-labs/studio-core`. Browser UI and import/export workflows live here. Applications supply their own component definitions, rules, assets, and host integrations.

Open `?example=body-joins` for a geometric cutout with soft attachments. In Scene, open the emitter example to inspect named attachment points and a data-defined controller.

Run `npm test` for authoring and runtime checks, and `npm run build` to verify every editor and exported player entry point.

## Data and behaviour

Use Entities to define component schemas and entity templates. Select a Scene object and open Behaviours to choose a template, edit its state machine, and bind presentation to component fields or machine values. The emitter example has two named attachment points whose beams are controlled by a boolean component field. Both renderers run the same entity runtime.

Attachment names, component fields, event names, and state names are authored data. A consumer can name a point `eye`, `nozzle`, or `outlet` without changing the editor. Applications can use the Core runtime directly and interpret emitted events in their own host adapter. See the [Core behaviour API](https://github.com/siliconjungle/shapeshift-studio-core#behaviour-and-presentation).

Library components carry their entity definitions and controller libraries into another project. Conflicting component/template IDs are rejected so a program cannot silently address a different schema. Attachment references within a component follow its cloned nodes; references outside the saved subtree must be included in that subtree before capture.

Version 0.2 removes bundled application simulations, content packs, and fixed ability contracts. Projects using those older integrations require migration in their consuming application. Existing artwork, animation, entity schemas, and generic scene tools remain supported.

With the built editor running, `npm run test:browser` checks behaviour authoring, both renderers, state transitions, backward seeking, portable playback, and the body-join example. This check uses installed Google Chrome through Playwright and mutes audio; set `STUDIO_URL` to test a different local server.

## Live API and CLI

AI tools can operate the same open tab as a person, including project edits, undo/redo, views, panels, selection, tools, playback, canvas gestures, imports and exports. Start with `npm run studio -- sessions`, `npm run studio -- capabilities`, and `npm run studio -- inspect`. Use `--session ID` to choose a tab and `--revision N` to reject stale edits. The browser entry point is `window.shapeshiftStudio.api.call({op,args})`.

See the [live API contract, examples and coverage](docs/live-api.md). Run `npm run test:api` for the CLI-to-browser and human/AI concurrency checks.

## Liquid and speech tools

The **Liquid** panel attaches a sealed 2D liquid surface to the selected puppet
joint. Edit its boundary, fill, slosh response, colours, bubbles and draw order;
key fill/colours on the shared timeline. Its sound preset adds procedural slosh,
pop, pour and other cues to **Sound**. This is a stylized container simulation;
the existing grid-based fluid effects remain available separately.

The **Speech** panel embeds recordings, accepts timed viseme cues, binds mouth
artwork and facial pose offsets, and places dialogue on puppet clips. Playback,
seeking and timeline retiming keep recordings and mouth timing together. It uses
supplied alignment cues; it does not automatically transcribe audio. See the
[speech guide](puppet-studio/authoring/speech.md) for the data format and commands.

After starting Studio, append `?example=potion` or `?example=speech` to the editor
URL to open the included [potion](puppet-studio/examples/potion.puppet.json) or
[voiced portrait](puppet-studio/examples/speech.puppet.json). The examples contain
embedded artwork/audio and do not overwrite the autosaved project. Use Save
project to retain example edits. The portrait demonstrates authored vector facial
acting with its recordings; reusable viseme-to-artwork bindings are available in
Speech for other characters.

Both panels are exposed through the live API (`panel.set` with `illustration`
or `speech`). `api.describe` lists the `illustration.*` and `speech.*` commands;
these use the same validated undo history as the UI. Project and HTML exports
include recorded audio. Voiced HTML players start audio after a Play click.
GIF, PNG and sprite-sheet exports are visual formats and contain no audio.

Run `npm test` for liquid conservation/scrubbing, speech timing/audio scheduling,
portable recordings, undo/redo, example compatibility and the existing suites.

## Complete tool set (0.3)

This release brings the local animation and illustration tools into the public editor and Core dependency:

- Procedural 2D rigs: particles, soft bodies, constraints, collisions, stepping limbs, body support, dynamic ink surfaces and sprite attachments.
- Procedural 3D movement and terrain-aware locomotion.
- Noodle deformation in 2D/3D, including stretch, twist, lag, overshoot and skeleton binding.
- Artwork meshes, SVG bone binding and weight editing.
- Transform/distance constraints, IK and Follow Path, with animated strength and path properties.
- Pose joysticks, Solo drawing swaps, animated draw-order rules and animation state machines.
- Shape Lab field modelling, contour generation and mesh export.
- N-slicing, outline recognition, SVG path trimming and clipping.
- Illustration folds, fluid fields, colour shifts and animated container liquids, including sound effects.
- Recorded dialogue, viseme timing, facial poses, drawing swaps and envelope-driven motion.
- Dice/regular solid authoring, illustrated materials and attachment blending.
- Image/video vectorization, portrait tooling, example source and prepared artwork/audio.

All tools edit project data, which can be saved and driven through the live API. `api.describe` lists commands, panels and supported module methods. Newly added panel names include `noodle`, `shapeLab`, `procedural`, `joysticks`, `solos`, `drawOrder`, `meshes`, `boneBindings`, `constraints` and `stateMachines`.

### Examples

Open the editor with `?example=noodle-2d`, `?example=noodle-3d`, `?example=mesh`, `?example=joysticks`, `?example=solos`, `?example=draw-order`, `?example=constraints`, `?example=follow-path`, `?example=shape-lab`, `?example=book`, `?example=potion` or `?example=speech`.

The build also includes `puppet-studio/dice/`, `puppet-studio/experiments/bramble-map/`, `puppet-studio/experiments/sunflower-puppet/` and the expressive portrait studies. These are examples of the tools; their helper code and prepared assets are included in this repository.

### Vectorization and asset preparation

Use `npm run serve:video` after building for the local video conversion service (default port 8791); open `/studio/puppet-studio/video-vectorizer/`. It needs `ffmpeg` and `ffprobe` on PATH. The normal editor server can open existing vector clips, while conversion uses that dedicated service.

Asset preparation scripts are optional; a normal build uses committed assets. Scripts that import source artwork accept `STUDIO_ART_SOURCE` explicitly. `STUDIO_VIDEO_EXAMPLES` optionally mounts a directory of your own videos. Voice generation requires `HUME_API_KEY` and `HUME_VOICE_FILE`; no credentials are bundled. Music transcription takes audio paths as command-line arguments and requires the Python libraries imported by that script.

Run `npm test` for editor/runtime tests and `npm run test:examples` for portrait and standalone example tests.
