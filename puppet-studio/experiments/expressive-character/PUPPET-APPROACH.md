> Superseded design study: the user has narrowed the scope to head/shoulders and optional hands, and rejected this art direction as too anime. See [PORTRAIT-PLAN.md](PORTRAIT-PLAN.md) for the current plan. Full-body sections below are archived exploration, not current work.

# How these characters will actually animate

## Current deliverable

Eight expanded GPT Image concept sheets: 24 face poses, eight body poses and twelve mouth studies **per character**. This supersedes the smaller exploration in ANIMATION-PLAN.md. The earlier file retains useful timing studies and the startle storyboard, but its inventory is no longer the authoritative scope.

The sheets are raster design references in the intended SVG style. They are not cutouts, registered animation frames, rigged puppets or completed SVGs. This phase establishes the art and construction plan before production. The demo page currently presents that review material.

## What I verified in the real Little Gods game

1. **Villager parts:** directional-puppet.js loads separate head/body/arm/hand/boot artwork, chooses front/back/side views and positions the head relative to a neck/collar attachment. I inspected the actual Solis SVG parts.
2. **Deforming vector limbs:** its arm routine builds a curved strip with 17 cross-sections and maps the original arm artwork onto it. vector-puppet.js binds the vector art; vector-rig-deformation.js moves a small control cage on the CPU and applies barycentric weights to artwork vertices on the GPU. The implementation caps a cage at 64 control points and patches the shadow material too.
3. **Faces:** face-animation.js draws eye/mouth shapes from landmarks and has many expression names. It is a simple procedural face system, not a complete close-up speech rig. The Solis male landmark file currently has mouth: null.
4. **God portraits:** god-portrait-rig.js makes normal editable inkwell-puppet projects with body, head, halo and separate eyes. Keys use the Studio transform sampler. It has six portrait expression clips; it does not supply the entire facial construction proposed here.
5. **Studio:** runtime.js uses procedural soft bindings and body joins. Illustration tools add pose-driven artwork/point corrections, local shading and cached alpha-edge treatment. The game’s custom vector path and the latest Studio Canvas path are separate integrations; sharing a format does not automatically wire every new feature into the game.

Sources relative to the workspace:
- inkwell-little-gods/directional-puppet.js
- inkwell-little-gods/vector-puppet.js
- inkwell-little-gods/vector-rig-deformation.js
- inkwell-little-gods/face-animation.js
- inkwell-little-gods/god-portrait-rig.js
- shapeshift-studio-web/puppet-studio/body-join-example/README.md
- shapeshift-studio-web/docs/illustration-tools.md

## The central idea

**A pose is a target for a small set of controls. The renderer draws the continuously changing puppet between those targets.**

Example: moving from a neutral face to delight changes cheek volume, mouth-corner positions, lower lids, brow arcs and jaw opening. Each control has an authored curve and timing. The cheek marking shares the face deformation; it does not float as an independently positioned decal. The jaw contour changes locally, rather than scaling the entire head image.

A replacement drawing is reserved for a change the existing geometry cannot represent well: a profile nose becoming visible, a truly enormous panic mouth, a strongly foreshortened hand, or a one-frame smear. Smooth movement does not mean every drawing must dissolve into the next.

## Piece-by-piece construction

| Region | Separate puppet artwork | Continuous motion | When a new drawing is needed | Existing tool / work needed |
| --- | --- | --- | --- | --- |
| Torso and hips | Upper torso, pelvis, clothing panels | Spine bend, lean, breath, crouch | Extreme foreshortening/fold exposes new surfaces | Studio rig, pose layers, soft bindings; author cage and correction shapes |
| Limbs | Upper/lower arms and legs, hands, boots | IK/contact targets; soft cloth around elbows/knees | Hand gesture or near-camera forearm changes perspective | Studio constraints and point chains; game curved-arm approach informs binding |
| Woman's armour | Chest plate and two shoulder plates, separate from cloth | Rigid pivot/translation following shoulder/spine | Plate turns enough to reveal another side | Ordinary joints + artwork replacement; no uniform rubber scaling |
| Man's scarf | Back wrap, front wrap, knot/overlap and tail | Small bend/volume change; delayed tail follow-through | Chin disappears into wrap or wrap turns edge-on | Soft binding, overlap layers, corrective drawings |
| Neck / head connection | Neck behind face, behind collar/scarf | Shared attachment points follow torso and jaw | Deep hunch/recoil requires a revised overlap silhouette | Explicit anchors; Body joins for compatible connections; inspect seams |
| Skull, cheeks and jaw | One continuous face surface with local control regions; nose/ear details separated where needed | Matched SVG points or small cage: jaw drop, cheek inflate, face width, pitch/yaw | Extreme panic shape or profile changes visible topology | Editable SVG point timelines + corrective layers; author facial controller |
| Brows and lids | Each brow and lid independently editable | Curvature, pinch, lift, asymmetric squint | Highly graphic closed eye / clenched drawing | SVG point poses and occasional substitution |
| Eyes | Eye-white shapes; iris/pupil/glint layers clipped to eye shapes | Gaze and eye opening without eyeballs crossing lids | Full closed/crescent eye | Face assembly clipping and anchors need to be wired into the character renderer |
| Mouth | Lip/opening contour, upper/lower tooth bands, tongue, corner creases | Compatible lip-path interpolation + jaw/cheek response | Mouth treatment changes topology or extreme scream | Vector point tools + clip masks; new timestamped mouth-cue player |
| Marking / facial hair | Marking bound to face; moustache above lip and beard bound to jaw | Share deformation weights/anchors with underlying surface | Corrective nose/lip pose changes occlusion | Shared binding; no independent drifting transforms |
| Hair | Back mass, front fringe and a few locks | Damped bend/rotation after head acceleration | Turn reveals hidden hair or a smear stretches silhouette | Procedural chains, follow-through and replacement art |
| Emotes / accents | Separate steam, tear, sweat, punctuation drawings | Local paths, scale, draw-on; selective boil | One or two special accent shapes | FX, procedural surfaces, Perfect Freehand, Illustration boil |

The face is **not** a pile of movable square cutouts. It is a contiguous surface with meaningful deformable regions and separately layered facial details.

## Making transitions continuous

### Continuous path / cage states

Construct a master face with deliberately placed control points around temple, cheekbone, cheek, jaw corners and chin; pin the upper skull enough to retain identity. Use a small cage per relevant assembly, below the game adapter's 64-point limit. Bind all related fill/ink geometry once.

For SVG interpolation, each corresponding path has the same number and order of points. Hand-author the targets from the concepts. Independently tracing two GPT images produces unrelated paths, so automatic point-to-point interpolation between them is not acceptable.

A slider can move through neutral → restrained → pronounced → extreme controls. It needs multiple corrective samples where interpolation collapses a cheek, intersects the jaw or pulls the hairline apart. One neutral/extreme pair is not enough for every expression.

### Replacement boundaries

Prepare the outgoing and incoming drawings to coincide at a shared transition pose. Both define identical semantic anchors: neck, jaw hinge, eye centres, mouth corners and hair roots. Each also has its own viewBox-to-anchor registration, so bounding-box differences cannot make the head jump.

While preparing a large panic reaction:
1. Existing face compresses and the eyes close.
2. A one-frame authored smear carries the rapid upward arc.
3. The extreme face appears already in the correct world position, with matching velocity, scale and attachments.
4. Its own point/cage controls drive overshoot and settling.

For a slow intensity scrub, use a matched transition drawing/corrective near the switch threshold. A blink cannot hide an arbitrary slider crossing. If a boundary still pops, author another compatible intermediate or limit that particular extreme to a triggered reaction until it is ready. Never claim smooth continuous interpolation across unrelated artwork.

Use small threshold hysteresis to avoid repeated artwork flipping if an input hovers at the boundary. A controller must also support reversing and interrupting the reaction, not just forward playback.

### Timing and interruptions

Key the intention, not every output vertex. Eyes may lead by 1–2 frames, head follows, shoulders react later, and hair follows the acceleration with a damped response. Body contacts are solved during that motion.

On a new click, bridge from the current evaluated controls to the new target; preserve initial motion where possible with a short cubic/Hermite transition, then hand off to the new clip. Bound overshoot to keep geometry valid. Do not reset to neutral or restart the same reaction every input frame.

The authored clock is 24 fps for pose exposure decisions. Render/continuous motion runs at display rate. Smears and selected mouth drawings are held intentionally, while the surrounding head/body trajectory remains smooth.

## Concrete sample: startled, then trying to look cool

| Frame | Face | Body and attachments | Rendering method |
| --- | --- | --- | --- |
| 00 | Composed | Resting stance | Base vector puppet |
| 03 | Eyes notice; brow rises | Body still mostly at rest | Continuous eye/brow controls |
| 05 | Compressed cheeks; shut lids | Neck retracts; shoulders load | Face points + pose correction; anchored collar |
| 06 | Stretched transition silhouette | Head accelerates along curved path | One-frame replacement smear, aligned to anchors |
| 07 | Extreme shape catches trajectory | Hands begin opening | Registered extreme cage / hand replacement |
| 08–10 | Tall jaw, tiny pupils | Strong recoil; hands splayed | Extreme controls and authored hold |
| 12 | Jaw begins closing | Head rebounds; hair still moving | Continuous deformation with delayed locks |
| 20 | Uneasy grin and sideways eyes | Shoulders relax; hand touches neck | Compatible return pose + hand contact |
| 32 | Overconfident smirk | Body regains composure | Base rig with smug expression layer |

The startle storyboard is a pose reference for these keys. It is not the playback mechanism.

## Talking

Twelve baseline viseme studies per character are now concepted. Production requires calmly speaking, smiling and strained versions, either matching vector corrective targets or additional drawings where necessary. Existing game singing/ellipse mouths are insufficient.

- Drive lips from timestamped **sounds**, not letters or random open/closed shapes.
- Keep lip opening/roundness/width, jaw, cheek response and tongue as separate controls.
- Example AH → OH: jaw rises slightly while corners travel inward on curves; tongue relaxes and upper teeth become occluded behind the lip mask. The head keeps its independent acting motion.
- M/B/P: explicitly close the lips; do not over-smooth away the closure.
- F/V: upper teeth contact lower lip. L: tongue tip meets the upper dental ridge. TH: tongue tip passes between teeth.
- Blend adjacent compatible visemes over a short context-sensitive interval, preserve stressed vowels, skip insignificant transitions, and let facial emotion bias corners/brows without destroying the speech shape.
- Audio and mouth events share the audio playback clock. Initial demo uses a few manually aligned recordings; importing aligned JSON can follow. Text alone does not provide truthful audio timing.

**Concept QA:** the generated L tongue position is not yet correct, F/V needs a clearer tooth/lip contact, and some resting/closed-mouth studies are too similar. The generated mouth boards must be redrawn and tested, not automatically promoted to animation assets.

## Ink and performance

Run isolated artwork through the existing Little Gods cel colour-reduction and SVG conversion flow. Keep ink and material palette roles separate. Register and simplify the result before rigging.

Avoid seam outlines on an artificial cheek/neck split. Prefer a contiguous face. Use explicit masked overlap and the Body joins tool only where corresponding cross-sections really exist; its colour-based seam treatment is not semantic facial understanding.

Cache vector parsing, triangulation, skin bindings, source images and discrete edge-corrected variants. Continuous motion updates control points, not the source asset conversion. Filled stroke geometry deformed by a cage can still vary in thickness; keep deformation mild where possible and rebuild selected contour strokes from the changed paths if needed. That contour step needs a measured implementation in the chosen renderer.

Do not reintroduce the expensive full-scene outline shader. Studio's local alpha-edge bake is useful for discrete corrected sprites, but freely changing a large face every frame could cause repeated bakes; continuous facial geometry needs a geometry/path-based ink strategy and profiling. Do not assume all rendering backends already have identical stroke rebuilding.

## Tool integration and next implementation

Reuse:
- normal inkwell-puppet project, hierarchy, transforms, clips and pose layers;
- Studio IK/contact and procedural soft bindings;
- SVG point editing and vector pose timelines;
- Illustration corrective drivers and artwork replacement;
- selected Body joins, local shading, emote/line effects and follow-through.

Add/wire:
- a character facial-control schema and evaluator composing expression, intensity, visemes and gaze;
- shared semantic anchors and compatible target registration;
- local eye/mouth clipping plus pose-dependent layer ordering;
- interruption-safe transitions and replacement-boundary handling;
- timestamped mouth cues synced to audio;
- project data authoring/presets so these are reusable tools rather than hard-coded screenshot animation.

The **first animated proof** should be neutral → smile → cheek puff → extreme panic → recovery, plus one spoken line and a hand-to-face contact. Inspect that continuously at normal speed and in a scrubber before producing the rest of the finished animation assets. More concept art alone does not prove the puppet works.

