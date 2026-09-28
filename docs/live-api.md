# Live editor API

The API operates the project and UI in an **existing browser tab**. It shares selection, views, playback, the validated project store, and undo history with the person using that tab. No AI provider is embedded.

Run `npm ci`, `npm run build`, and `npm start`, then open the displayed URL. Node 22 or later is required. The local server binds to `127.0.0.1`; `PORT` changes its default port, 4354. Hosted/static copies expose the browser API but do not register with a remote relay.

```sh
npm run studio -- sessions
npm run studio -- capabilities
npm run studio -- inspect
npm run studio -- call workspace.open --json '{"view":"scene"}'
npm run studio -- call selection.set --json '{"id":"emitter"}'
npm run studio -- call panel.set --json '{"panel":"timeline","open":true}'
npm run studio -- dispatch --json '{"op":"joint.add","id":"socket","parent":"root"}'
npm run studio -- export project --out character.puppet.json
```

Use `--session ID` whenever more than one tab is registered. The CLI refuses to guess. `--url URL` (or `STUDIO_URL`) chooses another local server. Use `--file commands.json` instead of `--json` for larger command payloads. After `npm link`, the same CLI is available as `shapeshift-studio`.

## Request and response

All three transports use the same operation and arguments:

```js
const api = window.shapeshiftStudio.api; // window.puppetStudio is an alias
const state = await api.call({op: 'editor.inspect'});
const result = await api.call({
  op: 'document.dispatch',
  expectedRevision: state.revision,
  expectedContext: state.result.context,
  args: {commands: [
    {op: 'joint.update', id: 'body', values: {name: 'Body artwork'}},
    {op: 'key', joint: 'body', clip: 'idle', time: 0.5, value: {rotation: 15}}
  ]}
});
// {ok:true, id, revision, result}
// or {ok:false, id, revision, error:{code,message}}
const unsubscribe = api.subscribe(event => console.log(event));
// document.changed includes revision, reason and changed scopes.
```

`api.describe` supplies operation arguments, module methods, panel names, and existing command capabilities. `editor.inspect` supplies current workspace, selection, playhead, transport, history, recording state, UI controls and a context token. Add `{project:true}` or use `document.read` to read the entire normalized document. `document.graph` inspects the 2D/3D scene graph; `runtime.inspect` reads live controller state.

`--revision N` supplies `expectedRevision`. `--context TOKEN` supplies the context token from inspection. Context detects changes of workspace, selected item, clip, mode or tool; time is intentionally excluded because playback advances it. Pass explicit times and IDs when targeting a particular pose.

The broker routes `POST /api/sessions/:id/call` to that tab, returning `{id,status}`. Read `GET /api/requests/:id` for its eventual response. `GET /api/sessions` lists tabs. Use an explicit `requestId` to deduplicate a submission; the same ID with different input is rejected. The CLI does this automatically, waits up to 60 seconds by default, and prints the request ID if it remains pending. Continue with `studio result ID`; do not resubmit an uncertain edit. `--timeout MS` changes the CLI wait, not the duration of the operation. Completed requests are retained for one hour, in memory, until the server stops.

Sessions belong to a page lifetime. Reload/disconnect invalidates the old session, including queued work. A newly opened tab never receives that work. Cross-origin browser requests and non-loopback Host headers are rejected. The broker is a local development interface available to local processes; it is not a multi-user hosting service. Requests may contain up to 192 MiB, including base64 overhead. File-specific editor limits still apply.

## Authoring data

`document.dispatch` accepts one existing command or an array. The whole array is one validated, undoable transaction; failure restores the prior document. `history.undo` and `history.redo` operate that same history. Examples:

```json
[
  {"op":"joint.add","id":"socket","parent":"root","values":{"layer":3}},
  {"op":"joint.update","id":"socket","values":{"rest":{"x":20,"y":-10,"rotation":0,"scaleX":1,"scaleY":1}}},
  {"op":"clip.add","id":"pulse","values":{"duration":2,"fps":30,"loop":true}},
  {"op":"key","joint":"socket","clip":"pulse","time":1,"value":{"rotation":20}}
]
```

Additional document commands:

| Command | Arguments |
| --- | --- |
| `project.rename` | `name` |
| `project.replace` | complete validated document in `value` |
| `project.patch` | `patches` as below |
| `joint.add` | `id`, optional `name`, `parent`, `values` |
| `joint.update` | `id`, `values` (top-level fields; nested objects are complete values) |
| `joint.remove` | `id` |
| `joint.rename` | `id`, `newId`; updates animation bindings |
| `joint.origin` | `id`, `point:{x,y}` |
| `joint.ik` | endpoint `id`, `clip`, `time`, `options` |
| `clip.add` | `id`, optional `name`, `values` |
| `clip.update` | `id`, `values`; duration stretches timing unless `retime:false` |
| `clip.duplicate` | `id`, `newId`, optional `name` |
| `clip.remove`, `clip.bake` | `id` |
| `asset.update` | `id`, `values` |
| `asset.remove` | `id`; referenced assets must be unbound in the same batch |

Existing commands remain available for vector artwork, scene nodes/materials/surfaces, lighting, keys/events, motion tools, particles, fluids, compositing, sound, Library sources, entities, components, behaviours, preview references, body joins, ownership and recording. `api.describe` lists these commands, including the nested `scene3d` capabilities. Read the current document for concrete IDs and data shapes. Existing `window.puppetStudio.dispatch` callers remain compatible.

`document.patch` provides field-level coverage for **all supported document data**, including fields without a dedicated convenience command. Paths are arrays, not executable expressions. `set` replaces a field; `insert` inserts into an array; `remove` deletes an existing field/array element; `test` checks the old JSON value. Parent paths must exist. Array indices are integers. Reserved prototype paths and invalid project data are rejected. All patches in a request commit together.

```json
{"op":"document.patch","args":{"patches":[
  {"op":"test","path":["joints",1,"id"],"value":"body"},
  {"op":"set","path":["joints",1,"rest","rotation"],"value":25}
]}}
```

For an import, prefer `import.project`: it preloads and validates the incoming artwork and supports both project JSON and animation packets. `project.replace` is a direct document transaction and, like other document commands, reports a later resource-loading error without silently undoing a committed edit. Inspect its returned revision before deciding what to do next.

## Live session controls

| Operation | Purpose |
| --- | --- |
| `workspace.open` / `workspace.back` | Open Rig (`puppet`), Scene, Artwork or Preview; return through editing context |
| `panel.set` | Open/close named panels; see `api.describe.panels` |
| `selection.set` | Select a rig joint, scene node/face, or artwork shape(s) |
| `editor.mode` / `editor.tool` | Choose rig/animate and the active workspace's tool |
| `viewport.set` / `viewport.fit` | Change 2D pan/zoom or a full 3D camera definition; fit/reset the view |
| `playback.set` | Set clip, time, playing, sound (`audible`, Scene/Preview), scene sequence (`all`), or preview transport `{speed,loop,from,to}` |
| `recording.set` | Arm/disarm gesture recording and choose simplification tolerance |
| `runtime.event` | Dispatch `{node,event,data}` to the live entity state machine |
| `editor.invoke` | Call an explicitly listed editor module method, using positional `args` |

Useful `editor.invoke` contracts:

- `workspace.editArtwork(assetId)`, `workspace.editPuppet(instanceId, sourceClipId)`, `workspace.capture()`, `workspace.restore(capturedState)`.
- `referenceNavigation.open({kind,id,dimension?})`, `back()`; `references.show()`.
- `artwork.openAsset(assetId)`, `select(shapeId)`, `restore({...snapshot,selection:[ids],tool,pan,zoom,time,guides})`, `review('ghosts'|'arc')`.
- `timeline.focus({node,channel,id})`; `scene3d.inspectEvent(eventId)`, `addPuppet()`.
- `entities.show({kind:'entity'|'component',id})`, `library.show(sourceId)`, `sound.show(libraryId)`; their `context()`/`restore(state)` preserve panel filters and selections.
- `resolved.set(context,channel,value)`, `resolved.release(context,channel)`, `resolved.read(context,channel)`; context includes `{dimension,clip,selected,time,mode}`. For complex baking/ownership workflows, inspect and operate the panel controls.
- `arena.saveReference()` freezes a playable reference, including its artwork and sound.

Module calls are whitelisted. There is no arbitrary function lookup or code evaluation.

## UI controls, dialogs and gestures

`ui.inspect` (also included in `editor.inspect`) lists visible controls with their current refs, labels, values, options, disabled state and bounds. It lists hidden file inputs separately. With a modal dialog open, normal controls are restricted to that dialog. Reinspect after edits: controls can be rebuilt, and old refs are rejected. Refs cannot be reused after reload.

```json
{"op":"ui.set","args":{"ref":"<ref from inspection>","value":"New name"}}
{"op":"ui.activate","args":{"id":"add-joint"}}
{"op":"ui.set","args":{"id":"new-joint-id","value":"socket"}}
{"op":"ui.activate","args":{"id":"create-joint"}}
```

A target can be a `ref`, an `id`, or a CSS `selector` matching exactly one element. Hidden or disabled controls cannot be activated. Use `ui.close` to close the top dialog, `ui.focus`, `ui.scroll`, and `ui.key` for focus/navigation/shortcuts. Set text through `ui.set`, because synthetic key events do not perform native text insertion. `ui.set` emits input/change events; `commit:false` omits change. `ui.batch` runs ordered UI actions and stops on failure. It is not an atomic project transaction: earlier UI actions remain applied.

`ui.pointer` sends a **complete gesture** to a canvas or other visible element, with coordinates in CSS pixels relative to that element:

```json
{"op":"ui.pointer","args":{"id":"av-canvas","events":[
  {"type":"pointerdown","x":100,"y":100,"button":0,"buttons":1},
  {"type":"pointermove","x":160,"y":150,"buttons":1},
  {"type":"pointerup","x":160,"y":150,"button":0,"buttons":0}
]}}
```

This uses the editor's gesture handlers, including virtual pointer capture for canvas tools and gizmos. Incomplete streams are rejected before dispatch; interrupted streams are cancelled. It also supports wheel, double-click, modifiers and multiple pointer IDs. Use `recording.apply` for deterministic time-sampled recordings. Vector paths, bezier points, pixel painting/cropping, effect paths and timeline handles remain reachable through these UI actions or the corresponding document data.

Browser autoplay policy still applies: a fresh tab may need one human click to enable sound. Use `playback.set` with `audible:false` for silent Scene/Preview playback; a blocked audio unlock returns an error rather than hanging.

Native text prompts consume the request's `answers` array. For example, use `--answers '["Hello"]'` when activating the text tool. Missing answers produce an error instead of opening a blocking native prompt. For the system eyedropper, provide the chosen colour directly through a colour control or vector command. Clipboard example text is shown by the panel; agents can read it directly rather than depending on browser clipboard permission.

## Files and exports

`import.project` takes `{file:{name,type,text}}` or base64 data in place of text. `import.artwork` takes `{files:[...],replace?:jointId}`. `ui.files` accepts the same file representations and uses the actual file input handler, including entity packets, Library packets, texture files, GIF/sprite sheets, model files and palettes. Dynamically created effect file inputs appear after activating their import button; inspect again to obtain the ref. No native file picker is needed.

`export` supports `project`, `clip`, `runtime`, `html`, `scene-html`, `svg`, `png`, `gif`, `sheet`, `frames`, and `view`. `view` captures the active canvas; the raster animation formats render the 2D rig through the same exporter as the UI. `scene-html` exports the standalone 3D player. Render options include width, height, FPS, skip, reverse and trim. SVG accepts `asset` and `time`. Artifact responses include `{name,type,encoding:'base64',data}`; animation exports also include metadata.

UI export buttons return their downloads in `response.artifacts`, including entity and Library packets and model reference sheets. During API actions they do not also trigger browser downloads. The CLI's `--out PATH` writes a returned artifact locally. Ordinary human exports continue to download normally.

## Concurrency and completion

API mutations are serialized. Use revisions for read/modify/write and context tokens for commands that rely on the current selection. A pending human pointer gesture or uncommitted form returns `EDITOR_BUSY`; the API does not cancel, blur or overwrite it. People can continue using the editor during asynchronous work. Project/artwork imports check that their source revision still matches before committing.

Success waits for tracked image, geometry, UI handler and export work. UI errors are returned as errors even when the visible handler catches them and shows a toast. Failure after a committed edit can still have an increased revision; inspect before retrying. A disconnect is ambiguous for already-running work and never causes an automatic replay. Undo is available for committed document changes; session navigation itself is not an undo entry.

## Coverage and verification

The API covers each UI domain through both its authored data and its live controls. The following maps those entry points and the maintained verification:

| UI domain | API path | Verification |
| --- | --- | --- |
| Project, rig, clips, history | Named document commands, patch, import/export, history | Atomic validation/rollback/undo/redo tests; live CLI edits and animation dialog |
| SVG artwork | `vector.*`, selection/tool, UI gestures, SVG export | CLI draws a path and exports SVG |
| Raster artwork | Image input, pixel dialog, UI gestures | CLI imports PNG, paints and applies changed bytes |
| 3D objects, materials, surfaces, cameras | `scene3d.*`, patch, selection/viewport, UI controls | Live emitter load, camera/tool selection; existing dual-renderer browser suite |
| ECS and behaviours | `component.*`, `entity.*`, scene controller data, runtime events | Entity tests; live controller event; existing behaviour browser suite |
| Timeline, keys, motion, body joins | Existing key/motion/bodyJoin commands, panel controls, patch | Clip retime test; panel lifecycle; body-join and timeline runtime coverage |
| Effects, compositing, particles, fluids, model references | Existing FX commands, inspectable effect tabs/file inputs/gestures | Shared dispatch tests; live text prompt, pixel workflow and all raster export formats |
| Lighting, styles, environment, sound | Existing commands, patch, panel UI | Panel lifecycle, shared validation; both-renderer behaviour suite |
| Library and references | Library/entity commands, panel methods, file input/export buttons | Live capture/place/export; existing dependency and reference tests |
| Temporary overrides and recording | `resolved` module, recording operation, UI controls | Panel inspection and recording state; existing authoring handlers are shared |
| Preview and comparisons | Preview workspace, scenario commands, live controls, capture | Live seek and playable reference capture |
| Navigation/dialogs/focus | Workspace/panel operations and `ui.*` | Open/close views and panels, modal controls, stale ref rejection |
| Human/AI concurrency | Revisions, context tokens, draft/gesture guards | Live human edits, stale calls, delayed import race, reload and multiple tabs |
| Machine transport | Loopback broker and CLI | Real child-process CLI to Chrome; broker isolation, request deduplication and cross-origin rejection |

Run `npm test`, `npm run build`, and `npm run test:api`. The API browser suite launches its own ephemeral local server and installed Google Chrome, and mutes audio. `npm run test:browser` runs the existing behaviour/rendering suite against a running server. The tests cover representative workflows and critical boundaries; they do not enumerate every possible authored value or every click combination.

## Feature discovery

Discovery is read-only and does not require an idle editor. `api.describe` advertises the catalogue version, entry count and links.

```json
{"op":"catalog.search","args":{"query":"liquid","scope":"web"}}
{"op":"catalog.feature","args":{"id":"liquid"}}
{"op":"catalog.command","args":{"op":"illustration.liquid"}}
{"op":"catalog.recipe","args":{"id":"add-liquid","inputs":{"joint":"body","fill":0.7}}}
```

`catalog.search` accepts optional `query`, `category` and `scope` (`core` or `web`). Feature detail includes requirements, limits, commands, Core imports, documentation, example links and recipe input schemas. `catalog.recipe` expands validated inputs into concrete request payloads and does not execute them. Input schemas use JSON Schema 2020-12; they describe the supported recipes, not every advanced command payload. The project store remains responsible for validating IDs and contextual constraints when requests are dispatched.

For discovery without a session, use `npm run studio -- catalog`, or GET `/api/catalog?query=liquid` from the local server. Static builds include `/features/catalog.json`, `/features/index.html` and `/docs/features.md`; these require no local API server.
