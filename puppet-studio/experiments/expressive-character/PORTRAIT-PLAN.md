# Portrait demo: current direction

## Scope and status

Head, shoulders and optional hand gestures only. No full-body locomotion, legs or feet in the initial demo. The earlier anime-style concepts and full-body planning are superseded.

The intended style is chunky, graphic cartoon illustration in the visual territory of Cult of the Lamb, Castle Crashers and drawn Binding of Isaac art: simple eyes, big elastic silhouettes, heavy curved ink and a few flat colours. Current concept sheets:
- cartoon-directions.png: three alternative cartoon treatments of the original two human characters.
- frog-portraits.png: nine portrait/hand expression studies.
- wooden-portraits.png: nine portrait/hand expression studies.

These are generated raster concept studies. They need colour reduction, actual SVG conversion, cleaned/registered pieces and rigging. No finished animated portrait is claimed. The earlier 24-expression human inventory remains an acting research catalogue, not an approved style or completed asset library.

## What moves, and how it stays smooth

Pose art supplies targets; a continuously evaluated puppet supplies motion. Facial shape controls interpolate along authored curves. Do not alternate flattened whole portraits as the main animation technique.

Use a continuous face surface and its attached details wherever possible. The skin/ink/marking vertices share deformation; the eye and mouth pieces use local masks and semantic anchors. A mouth opening, upper teeth and tongue need independent layers rather than all being a single stretched image.

Keep adjacent target paths compatible by authoring the same vector point order. Independently traced generated drawings are not compatible morph targets automatically. For a genuinely different shape, prepare a replacement assembly with matching neck, jaw, eye and mouth anchors. Show it during a deliberate transition. A one-frame smear can bridge fast motion; slow slider movement needs compatible intermediate shapes, not a hidden hard switch.

Motion layers:
1. Expression and speech cues supply desired face controls.
2. Keyed curves move jaw, cheeks, lids, brows and head; eye attention can lead.
3. Shoulders follow the main gesture. Hand targets retain contact with cheek/chin/scarf.
4. Hair, hat tips, cords or beads get delayed follow-through.
5. Corrective shapes and drawing replacements fix silhouettes/occlusion.
6. Ink is rendered from the resulting geometry or cached discrete drawings.

Initial portrait proof: rest → smile → suppress emotion → exaggerated reaction → recovery, plus one speech line and one hand-to-face contact. Scrub the transition slowly and interrupt it during playback to expose jumps.

## Frog wizard: pieces and behaviour

| Piece | Construction | Motion |
| --- | --- | --- |
| Main frog face | One continuous SVG surface with cheek/jaw/throat cage | Width/height changes, cheek lift, jaw opening |
| Throat | Connected local face region or an overlapping shape with a hidden seam | Inflate while mouth seals; deflate into croak with overshoot |
| Eyes and lids | Two amber eye shapes, pupils/glints and upper/lower lid paths | Gaze, asymmetric squint, blink; crescents for delight |
| Mouth | Broad lip/opening path, dark interior, tongue; no human teeth | Wide-to-round point deformation; special extreme mouth if needed |
| Hat | Brim, cone and floppy tip | Brim follows head; cone bends mildly; tip follows late |
| Hat ties / scarf | Separate short chains and overlapping cowl pieces | Delayed sway, collar follows throat expansion |
| Hands | Left/right webbed hands with gesture replacements | Cheek touch, raised finger, clasp, splay |
| Shoulders | Small coat assembly | Hunch/recoil/lean; no full-body rig needed |

Planned nine reaction beats at 24 fps (controls interpolate between keys):
- Composed: 0 rest; 36 inhale; 72 rest. Occasional blink/eye aim, no constant swaying.
- Curious: 0 rest; 1 eyes lead; 4 head tilt; 8 finger reaches chin; 16 settle.
- Smug: 0 rest; 3 lid lowers; 7 mouth corner rises; 12 throat/chin forward; 20 hold.
- Delight: 0 rest; 3 compress; 5 cheek expansion; 7 broad grin/hands open; 11 rebound; 18 hat-tip settle.
- Holding a croak: 0 rest; 3 lip seal; 7 throat grows; 13 full inflation; 18 hold; 23 release; 28 compressed overshoot; 36 settle. Re-time the release to actual croak audio.
- Outraged: 0 rest; 2 eyes lock; 5 compress/load; 6 forward smear if needed; 7 shout; 12 recoil; 22 glare.
- Panic: 0 rest; 2 notice; 4 compression; 5 smear; 6 tall jaw; 9 hold; 13 rebound; 23 recover.
- Sheepish: 0 rest; 2 gaze aside; 6 head sinks; 10 hand touches hat/head; 18 uneven mouth; 28 hold.
- Sleepy: 0 rest; 5 lids lower; 12 jaw yawns; 20 hat droops; 30 mouth closes; 42 settle.

## Wooden wanderer: pieces and behaviour

| Piece | Construction | Motion |
| --- | --- | --- |
| Upper mask | Main rigid carved shape | Head rotation, small tilt; replacement silhouette for view changes |
| Cheek/brow regions | Separate plates or coordinated vector target regions | Raise/angle to suggest a grin, worry or anger |
| Lower jaw | Distinct wooden assembly with left/right hinge anchors | Open/drop/tilt; stop against authored limits, small clack/rebound |
| Eyes | Dark socket shapes and small glints | Socket/lid shape changes; gaze moves glints sparingly |
| Nose | Rigid shape attached to upper mask | Maintains placement during jaw motion |
| Straw hair | Few broad pieces, not individual strands | Short delayed tilts with occasional replacement for turns |
| Horns / ties / beads | Horns fixed to head; ties and beads on small chains | Follow head; pendants lag and settle |
| Scarf / shoulders | Overlapping front/back cowl and shoulder plate | Hunch, tilt, head tuck; armour stays rigid |
| Hands | Articulated wood fingers or drawn gesture variants | Clasp, finger to chin, splay, cheek touch |

The wooden face should not just inherit the frog's rubber motion. Jaw/plate relationships do most of its acting, with authored alternative eye/mouth shapes where needed. Concept artwork still contains extra wood grain and straw detail; simplify that before tracing.

Planned nine reaction beats at 24 fps:
- Composed: 0 rest; 36 tiny shoulder breath; 72 rest. Jaw remains seated.
- Curious: 0 rest; 2 eye asymmetry; 6 head tilt; 10 finger at chin; 18 beads settle.
- Mischievous: 0 rest; 3 one lid lowers; 7 cheek plate lifts; 11 offset jaw grin; 20 hold.
- Delight: 0 rest; 3 compress; 6 jaw opens; 8 eye crescents/hands splay; 12 small jaw rebound; 22 beads settle.
- Trying to smile: 0 rest; 4 one corner rises; 8 other corner catches; 12 awkward grin; 18 hand to cheek; 28 hold.
- Indignant: 0 rest; 2 eye lock; 6 brow plates angle; 10 chin rises; 15 fist near shoulder; 24 hold.
- Panic: 0 rest; 2 notice; 4 jaw preload; 6 jaw drops; 8 open extreme; 11 jaw stop/rebound; 20 recover; 28 ornaments settle.
- Dejected: 0 rest; 4 eye shapes soften; 12 head bows; 20 shoulders drop; 30 jaw droops; 42 hold.
- Playing innocent: 0 rest; 2 sideways eye glance; 6 round mouth seam; 10 finger up; 17 counter-tilt head; 26 hold.

Each timeline describes animation intent, not completed keys. Dialogue phoneme times must come from actual audio. Frog speech will use toothless wide/round/sealed mouth shapes with throat accents. Wooden speech will combine a hinged jaw with authored mouth-seam variants; it need not imitate human lips literally.

## Existing Little Gods and Studio tools to reuse

Verified in the real game:
- directional-puppet.js: separate head/body/arm/hand/boot assets and collar attachment.
- vector-puppet.js and vector-rig-deformation.js: original vector art bound to a small animated cage; GPU deformation and shadow pass.
- face-animation.js: landmark-driven procedural eyes/mouths; useful foundation, not a detailed portrait speech rig.
- god-portrait-rig.js: normal editable Puppet Studio projects with separate head/body/eyes/halo.

Use Studio hierarchy/keys, SVG point poses, soft bindings, IK/contact, Illustration corrective layers, selective Body joins and follow-through. Add a reusable facial-control evaluator, semantic anchor registration, local eye/mouth clipping, safe transitions and timestamped speech cues. These integrations are planned, not asserted to already be packaged.

Static parsing/vectorisation/triangulation/binding happens once. Cache discrete corrected drawings. Continuously moving geometry changes control points. Do not use per-frame tracing, unbounded pose caches or the expensive full-scene outline shader. Deformed ink can change thickness; use restrained cage deformation, authored contour stroke geometry and measured local rebuilding where necessary.

## Sources / provenance

The style reset follows direct visual inspection of the official Castle Crashers and Cult of the Lamb pages:
- https://www.castlecrashers.com/
- https://www.devolverdigital.com/games/cult-of-the-lamb

The image prompts and original generated file paths are in concepts/cartoon-generation.json. Images were generated with the built-in image tool. This plan describes proposed animation; concept art alone does not establish that a rig behaves correctly.

