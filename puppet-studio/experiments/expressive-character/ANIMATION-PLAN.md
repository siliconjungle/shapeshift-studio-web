> Superseded design study: the user has narrowed the scope to head/shoulders and optional hands, and rejected this art direction as too anime. See [PORTRAIT-PLAN.md](PORTRAIT-PLAN.md) for the current plan. Full-body sections below are archived exploration, not current work.

# Expressive character — concept and animation plan

Status: concept design and production plan. Three GPT Image concept PNGs exist. No production SVG puppet, recorded dialogue or finished interactive character demo exists yet.

## Direction

Use **02-graphic-direction.png** as the production direction. **03-startle-storyboard.png** explains the acting and spacing. **01-identity-study.png** records the more detailed initial exploration.

A guarded, blue-haired adventurer tries to look composed; her face keeps betraying her. Adult proportions, expressive hands, bold asymmetry, clean curved dark ink, restrained flat colour. Retain the green eyes, swept blue bob, purple marking on the anatomical left cheek, choker buckle and chunky shoulder armour. Never mirror the whole head: the marking and haircut must keep their anatomical sides.

The second study is substantially simpler but still has small tonal variations. Production uses deliberate palette reduction and hand cleanup. Concepts are not a perfectly registered sprite sheet. Some hand details, panel edges and costume joins need redrawing when making independent assets.

### What the references contribute

- [Moho features](https://moho.lostmarble.com/pages/features): pose controls can coordinate vector changes, replacement drawings, meshes and follow-through. Use the same broad combination in our tools. Moho also documents mouth switching and automatic lip sync; this is not evidence our engine already has a speech aligner.
- [Nobody Saves the World](https://www.nobodysavestheworld.com/): my visual takeaway from its official character art is strong silhouettes, graphic faces and very legible flat colour. This is art direction, not a claim about its production software.
- [Wytchwood](https://www.alientrap.com/games/wytchwood/): its official screenshot shows a rich illustrated world built from clear foliage shapes. Borrow restraint in material detail and intentional colour relationships; keep this character's face more open and readable.
- [The Behemoth](https://www.thebehemoth.com/): graphic cartoon clarity and broad visual comedy.
- The supplied Anna and dark-haired expression sheets: brows, gaze, head angle and hands work together.
- The supplied extreme-face and Tumblr intensity charts: vary the skull/jaw silhouette and build emotion through stages, including an attempt to suppress it.
- All supplied image references were viewed except the Reddit chart, which presented a human-verification challenge. The Wix and Pinterest images were visible in the browser.

## Demo composition

One large character on an uncluttered warm ivory stage, framed knees-up with generous head/hand margins. A quiet ground shadow provides weight. Fixed camera; no unrelated camera motion.

Primary controls:
1. Twelve expression buttons, each with a readable miniature pose.
2. An intensity slider from restrained to extreme.
3. Four short performed lines: dry/confident, delighted, irritated, nervous.
4. Play the 15–20 second acting showcase; pause/replay.
5. A small optional breakdown drawer: drawing IDs, viseme name, timeline scrubbing and rig overlay.

Click response starts immediately. Eye/brow intention appears within 1–2 animation frames; the larger action follows. A new expression can interrupt a reaction: transition from the current pose rather than snapping to neutral. Smears are brief transitions, never the stable state while a control is held. Reduced motion retains expression changes with short blends and omits violent smears/rebounds.

## Construction and reusable controls

Rig groups:
- pelvis/root; torso/neck; two shoulder plates; upper/forearms; hands; legs/boots;
- back hair, skull/ears, lower jaw, front fringe, three secondary hair locks;
- independently controlled brows, eye whites, pupils, upper/lower lids;
- mouth opening, upper teeth, lower teeth, tongue;
- cheek marking and authored blush/shadow shapes bound to the face.

Expose **head turn, head pitch, jaw open, cheek inflate, mouth width, brow pinch, eyelid openness, eye aim, shoulder hunch, torso curl, hand gesture, emotion and intensity**.

The base head and moderate expressions use shared, deliberately authored vector topology. Do not attempt to blend independently traced paths from separate GPT images. Dramatically different silhouettes use replacement drawings, with matching pose anchors and a compatible rig. Teeth, tongue and brows remain separate; do not stretch an entire face image to simulate speaking.

Armour rotates/translates as rigid pieces. Flesh and fabric deform; a shoulder plate should not breathe like rubber. Hair reacts after the head, with short damped follow-through. Keep face/neck connections overlapped and explicitly hide their attachment edges.

The current Illustration tools support driver-based artwork replacement, vector-pose time, deformation, authored shading, edge rebuilding and line boil. See ../../../../docs/illustration-tools.md. The remaining work is the actual character artwork/rig/clips, a speech cue player and the demo UI. Speech recognition/alignment has not been verified as an existing Studio feature.

## Complete first-version drawing inventory

These are **authoring drawings or pose targets**, not an instruction to generate a full character image for every rendered frame. One composited pose can reference many reusable pieces.

| IDs | Count | Required artwork |
| --- | ---: | --- |
| H00–H06 | 7 | Neutral head assemblies: front; three-quarter left/right; profile left/right; hero three-quarter looking up/down. The main acting/talking view is hero three-quarter. |
| E01a/b–E12a/b | 24 | Two designed head/face targets per expression: readable build and extreme break. Moderate changes use matched points; the break can replace the assembly. |
| V00–V11, each calm / smile / strained | 36 | Twelve mouth shapes in three emotional treatments. Each set shares mouth anchors and separates tongue/teeth. |
| O00–O07 | 8 | Eye/lid target configurations: open, half-lid, soft closed, clenched closed, wide, asymmetric squint, smiling crescent, tear-heavy. Pupils/brows remain independent. |
| G00–G05, left/right | 12 | Relaxed, fist, splay, point, face-touch and cupped hands. Draw both hands where perspective differs. |
| C00–C03 | 4 | Torso/neck connection corrections for deep hunch, recoil, forward lean and folded laugh. |
| S00–S05 | 6 | Turn-left, turn-right, upward stretch, downward compression, pointing-arm jab, lateral head-shake smears. |
| FX00–FX05 | 6 | Question curl, surprise marks, sweat drop, angry steam, delight stars, tear drop. Procedural arcs and scale animate these drawings. |
| B00–B07 | 8 keyed rig poses | Upright, slouch, shrug, recoil, forward lean, laughing fold, proud/pointing and dejected fold. These are pose data, not eight new full-body paintings. |

That is 103 planned modular drawing/target entries plus eight body poses. Much of the count is small mouth, eye and hand components. It does not include another drawing for every intermediate frame.

### Expression targets

| ID | Expression | Build target (a) | Break target (b) |
| --- | --- | --- | --- |
| E01 | Unimpressed | One brow up, eye slides sideways | Head sinks into collar, horizontal lids, crooked tiny mouth |
| E02 | Delight | Cheeks rise before lips part | Broad cheek silhouette, huge grin, lifted fists |
| E03 | Laughter | Suppressed grin and held breath | Head back, eyes squeezed, torso folds in a second beat |
| E04 | Surprise | Raised brows, small O | Round wide eyes, lifted jaw/neck, open hands |
| E05 | Panic | Sudden full-face compression | Tall jaw/head silhouette, tiny irises, recoiling torso |
| E06 | Fury | Brow pinch, clenched mouth | Wide low head, asymmetric tooth band, forward thrust |
| E07 | Disgust | Nose wrinkles, one eye closes | Face pulls diagonally away, upper lip curls, hand wards off |
| E08 | Mortified | Gaze drops and lips press | Head disappears into collar, huge crooked grimace, face-touch |
| E09 | Sadness | Inner brows lift and mouth softens | Long drooping cheek/jaw, heavy lids, torso folds |
| E10 | Defiance | Sideways smirk, chin leads | Pointing gesture, proud chest, sharply cocked brow |
| E11 | Determination | Eyes narrow, inhale | Chin down, focused stare, controlled forward stance |
| E12 | Relief | Tension loosens, eyes close | Cheeks soften, shoulders drop on long exhale |

Expression combinations are authored, not the unrestricted sum of incompatible extremes. A smile mouth on an angry brow is allowed; simultaneously applying full panic and full compressed hunch is not. Use a dominant expression with secondary brow/gaze accents.

### View coverage

Full-strength reactions and dialogue are authored for the hero three-quarter view. Moderate head yaw/pitch can deform within that view. The other six neutral views support looks and turns; profiles are not promised full dialogue/expression coverage in this first version. Full turns switch drawings while blink/smear covers the change. This avoids multiplying 36 mouth drawings by seven angles before proving the acting.

## Animation clock and complete clip keys

The authoring clock is **24 fps**; the display still renders smoothly at its native refresh rate. Poses can be held on twos (12 drawings per second), but fast accents and smears use single frames. Smooth root/contact motion remains independent. All numbers below are design targets to tune against the actual artwork and audio.

Every timeline frame is covered by these rules:
- A key establishes a pose. Between keys, interpolate rig and compatible vector controls using the stated action; a drawing ID holds until its explicit switch.
- Smear drawings hold for one frame unless a two-frame hold is explicitly stated. Never alpha-dissolve a pair of eyes or unrelated mouths.
- After the last key, hold that expression with independent eye aim and small breathing.
- On release, blend to the current idle pose over 8 frames; shoulders lag by 2 and hair settles by frame 14. Panic/fury use a 10-frame recovery to avoid an elastic snap. Interruption overrides this release with a short bridge from the live pose.

| Clip | Full key schedule (frame : action) |
| --- | --- |
| Unimpressed | 0 live pose; 1 sideways eye flick; 3 one brow rises; 6 shoulders lift/head sinks; 9 lids lower and mouth skews; 14 settle into E01b. Ease gently into the final slouch. |
| Delight | 0 live pose; 2 cheeks begin lifting; 4 anticipation dip; 5 upward smear S02; 6 E02b + fists lift; 9 small down rebound; 13 settle head; 18 hair finishes. Hold a bright smile. |
| Laughter | 0 live pose; 3 closed-mouth grin; 6 inhale/cheek inflate; 9 head-back E03b; 13 torso folds; 16 second smaller laugh lift; 20 fold; 25 breath recovery; 32 grin. The two pulses have different spacing/amplitude. |
| Surprise | 0 live pose; 1 eyes snap toward stimulus; 3 brows up; 5 small recoil; 7 E04b; 10 shoulders overshoot; 15 settle. No smear needed at medium intensity. |
| Panic | 0 composed; 3 notice E04a; 5 anticipation squash; 6 upward smear S02; 7 stretched breakdown; 8 E05b; 9–10 hold shock; 12 rebound; 15 hair catch-up; 20 mortified E08a; 26 chin lifts; 32 play-it-cool E10a. Matches the storyboard. |
| Fury | 0 live pose; 1 eye lock; 3 brows pinch; 5 shoulders load; 6 forward smear; 7 E06b; 9 overshoot compressed jaw; 13 recoil slightly; 18 steady glare. A short steam accent at 9–19 only. |
| Disgust | 0 live pose; 2 nose/lip lead; 4 asymmetric squint; 7 head withdraws diagonally; 10 E07b + warding hand; 15 head settles; 22 hand settles. Face deformation follows an arc. |
| Mortified | 0 live pose; 2 dart eyes away; 4 shut mouth; 7 lower head; 10 hand meets cheek; 13 E08b + blush; 18 shoulders settle; 26 tiny second eye dart. Preserve hand-to-cheek contact. |
| Sadness | 0 live pose; 3 inner brows lift; 8 gaze drops; 14 jaw/cheeks droop; 22 shoulders follow; 32 E09b; 44 exhale/settle. Use weighted timing, no bounce. |
| Defiance | 0 live pose; 2 one brow/eye lead; 4 lean away in anticipation; 6 pointing-arm smear S04; 7 point lands + E10b; 10 hand overshoot retracts; 16 chest settles; 22 hair settles. |
| Determination | 0 live pose; 3 inhale; 6 chin dips; 10 eyes narrow; 14 fists set; 20 E11b; 28 controlled exhale. No comedic spring on the held stance. |
| Relief | 0 tense pose; 3 soften gaze; 6 close eyes; 10 jaw releases; 16 shoulders drop; 24 exhale lean; 32 E12b; 42 open eyes into quiet smile. |

Short utility clips:
- Blink: frames 0 open, 1 descending, 2 closed, 3–4 opening, 5 open. Clenched blink holds 2–5. A double blink repeats once after an uneven 3–6-frame gap.
- Head turn: 0 eyes lead, 2 head starts, 4 blink/compressed drawing, 5 directional smear, 6 new view, 9 overshoot, 14 settle. At low speed omit smear and use intermediate head view.
- Nod: 0 current, 3 up anticipation, 6 down accent, 10 return, 15 settle.
- Head shake: 0 centre, 3 left, 4 S05, 6 right, 8 smaller left, 12 centre, 18 settle.
- Emote pop: 0 absent, 1 tiny/wide, 3 tall overshoot, 6 settled, 7–15 hold, 16 compress, 18 gone. Longer tears/steam use their own local path.
- Listening idle: intentional gaze changes and breathing. Blink intervals initially 2.8–6.5 seconds; a posture adjustment at 8–15 seconds. Pause idle actions during speaking accents. Seed randomness for reproducible capture. No perpetual side-to-side rocking.

Smear line in the concept sheet is only a directional sketch: production needs a custom clean in-between at the correct arc and length. The timeline contains more frames than the eight illustrated storyboard panels.

## Talking: visemes and performance

A viseme is a visible mouth pose shared by one or more speech sounds. It is not a letter sprite. [Microsoft's official explanation](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme) documents phoneme groups and timed viseme events. Our twelve-shape set below is an intentionally simplified English cartoon design, not a universal standard or Microsoft's exact 22-ID mapping.

| ID | Shape | Sound examples / use |
| --- | --- | --- |
| V00 | Relaxed rest | Silence; lips gently meet, no clench |
| V01 | Pressed seal | M, B, P; visible contact and optional cheek pressure |
| V02 | Wide open | AH and broad stressed vowels |
| V03 | Medium open | EH / UH and transitional open positions |
| V04 | Wide narrow | EE / IH; corners spread |
| V05 | Round open | OH / AW |
| V06 | Tight rounded | OO / W |
| V07 | Lower lip under teeth | F / V |
| V08 | Tongue tip raised | L; tongue flick for selected T / D / N |
| V09 | Tongue forward | TH when visible |
| V10 | Narrow teeth gap | S / Z |
| V11 | Projected soft round | SH / CH / J; adapt toward R with lip/jaw control |

K/G/NG and H primarily inherit nearby vowel mouth/jaw shape in this simplified set. Diphthongs travel between vowel shapes. The mapping must be tuned to the recorded delivery and accent.

The 36 drawings are the same twelve visemes in calm, smiling and strained treatments. Add mouth-width/jaw/cheek controls; don't multiply every possible emotion into a separate alphabet.

Plan:
1. Use four short voice takes with known text. Proposed lines: “Oh, please. I had that completely under control.” / “Wait—those are all for me?” / “Do. Not. Touch. That.” / “There's something behind me, isn't there?”
2. Prepare timestamped mouth cues against the actual audio. Start with manual alignment for this small showcase, leaving an importer for externally aligned phoneme/viseme JSON. An automatic aligner is additional integration, not assumed present.
3. Re-time lips to audible sounds, then artistically anticipate selected closures/roundings by 1–2 frames where it improves sync. Do not apply a universal lead to every phoneme.
4. Preserve M/B/P closures; suppress unnecessary tiny transitions; hold stressed vowel shapes. Starting exposure target 2–3 frames, with one-frame consonant accents where audible.
5. Keep eye contact, brows, blinks and gestures on a separate acting track. Jaw energy can follow syllable stress, not merely microphone volume.
6. Moderate emotional speaking uses deformable mouth sets. Maximum panic has a dedicated open-mouth/gasp drawing; it does not carry arbitrary lip sync until that extreme jaw gets its own compatible mouth rig.

No exact spoken-word frame times are invented before the audio exists. The twelve expression clips above are fully timed; the dialogue cues are deliberately pending real recordings.

## SVG / ink production flow

1. Generate isolated production parts and extreme pose references from the chosen concept; preserve clean background/alpha and registration markers outside final crops.
2. Repair cutouts, hidden overlaps and missing behind-hand/hair areas. Do not slice a flattened face into disconnected pasted pieces.
3. Use the real Little Gods converter: inkwell-little-gods/tools/vectorize/convert.mjs, cel preset, initially 12–16 reduced colours with dark colours preserved. Inspect eye whites, irises, cheek marking, teeth and tiny holes after reduction.
4. Map palette roles through the existing art palette contract. Keep character-specific teal/green/plum accents; do not apply the map's sepia palette indiscriminately.
5. Simplify editable contours; give interpolating poses identical path/point order. Keep genuine replacement drawings independent.
6. Bind face ink and fills to the same geometry. Maintain relatively thin internal eye/nose/mouth ink and a shared dark silhouette colour. Include transparent-hole boundaries where relevant.
7. Bake and cache edge-corrected discrete drawings/boil variants. At this fixed stage size, target roughly 2–3 px exterior ink, then judge at final display size; do not stack an extra outline on top of already adequate art. Avoid a full-screen outline pass and avoid tracing at runtime.
8. Use existing matched vector paths/stroke controls for continuously deforming contours. If alpha-edge rebakes are needed, restrict them to small changing head regions and bounded quantised states; profile the result. Do not create an unbounded cache of every floating-point pose.

Selective line boil: three coherent variations on steam/question marks at about 8 drawings/s; a very brief contour tremble during peak panic/fury. Skin, armour and ordinary idle hair stay clean. Dynamic Perfect Freehand lines suit accent arcs, sweat trajectories and steam; stable facial features use authored vector curves.

## Validation before calling the demo finished

- Render every expression at restrained/mid/extreme intensity and check identity, marking side, hand anatomy and negative spaces.
- Scrub every smear and drawing swap: no doubled eyes, unexpected crossfade, holes at neck, or disconnected shoulders.
- Test expression interruption and rapid clicks. Response remains immediate and returns from the current pose.
- Watch every spoken line at normal speed and frame-step mouth closures against actual audio.
- Verify filled eye/teeth shapes survive conversion and no outline clips at the image boundary.
- Review at the intended stage size and on a small viewport; leave enough space for peak panic hair/hands.
- Measure warmed steady playback and worst-case changing faces. Set budgets after measuring on the user's machine; make no unmeasured performance claim.
- Export a deterministic short showcase using the same assets, rig and renderer as the interactive page.

## Build order after this concept stage

1. Isolated master + neutral SVG puppet and two test expressions (unimpressed/panic).
2. Prove jaw/head correction, edge treatment, hand contact and one clean smear.
3. Build mouth library and a single spoken line.
4. Complete the remaining expression families and four performances.
5. Add the compact demo controls, breakdown view, transition interruption and polished idle timing.

