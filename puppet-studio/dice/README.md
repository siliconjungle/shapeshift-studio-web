# Fable & Fortune

Open `/puppet-studio/dice/index.html` after `npm run build` and `npm start`.

- **Roll:** click or press Space to toss a random die, then tap again to catch the incoming timing windows at the fixed line above it. Gold earns +2, green +1, a missed attempt −1, and skipping +0. Adjustments affect the total, never the physical face. The note stream keeps moving through the fixed line.
- Successful timing automatically launches the next random die, timed to the next sword target. Perfect hits have a short snap; good hits settle less cleanly. Misses break the combo and reset the pace, then automatically resume after the penalty pause. Skips/cocked rolls pause. An unlucky below-target roll still keeps a successful timing streak. Feedback occupies a separate row below the canvas.
- Breaking a longer streak produces stronger and longer shake, a heavier layered crash, a combo-loss readout, without a longer restart wait. These use the lost combo before resetting, including when timing is skipped. Failure feedback grows smoothly instead of stopping at a combo threshold.
- Timing hits and strong landings emit lightweight ink sparks. Faster throws use Studio geometry echoes and baked GPU stretch smears; the die returns to its normal silhouette at contact. Particle counts and echoes are bounded, and reduced-motion mode disables these accents.
- Higher combos progressively strengthen capped screen shake, combo text pops, and layered audio. Reduced-motion mode disables screen shake and the pop animation. Good and perfect timing assists produce progressively cleaner landings while retaining the physical roll outcome.
- Physics determines the result; unnumbered or unsettled landings report a cocked roll. This is not a certified fair dice simulator.
- D5 uses ten congruent kite faces numbered 1–5 twice. D5 has five **outcomes**, with matching faces. D3 is no longer offered. D5 and D10 are shortened 22% along their pole axis, in both the rendered mesh and the collision hull. D4 is a tetrahedron and scores the face on the table. The others score the uppermost face.
- Standalone dice use uniform geometry scaling plus camera framing from their current projected hull. Each die’s longest visible dimension stays at 36% of the stage height across rotations; the framing preserves the die’s screen position and toss arc. Intentional squash/smear can briefly exceed that footprint. Rendered geometry and collision hull use the same scale; Studio geometry retains its authored size.
- D6 has Inkwell numerals and opposite faces summing to seven. D10 is a pentagonal trapezohedron; D8/D12/D20 use their usual polyhedra. Explicit prism mode remains available as a separate geometry tool.

## Studio authoring

In the 3D section, use **+ Dice / solid**. Choose dice geometry or a prism, Inkwell SVG numerals, bevel, finish, and a throw seed. Roll clips record fixed-step rigid-body motion and collision-driven squash into ordinary editable Studio tracks. Selecting a generated solid and reopening the tool lets you edit it.

`regularSolid` is a reusable core module at `@shapeshift-labs/studio-core/scene3d/regular-solid`. It returns a beveled mesh with UVs, convex hull vertices, and ordered face metadata. Mesh validation and the renderer preserve authored UVs. `simulateDice` and `physicsRollClip` separate physical simulation from portable animation. Collision uses the convex hull; squash/stretch is a visual effect, not a soft-body solver. Crunchy Web Audio impacts are driven by contact times in the standalone page; exported clips use Studio sound events.

Run `node --test puppet-studio/dice/dice.test.mjs` for geometry, timing, physics, floor contact, mesh validation, and clip round-trip checks. Included in `npm test`.

## Rendering and artwork

Dice have a single GPU hull contour, flat SVG-style shading, and no crease outlines or active CPU Noodle deformer. The D6 source mesh has 72 triangles (previous identity-deformer tessellation: 9,888); D20 has 180 (previously 20,460). Squash/stretch remains in the GPU rig.

The face atlas is an SVG containing numeral outlines from the existing `assets/bramble-map/fonts/InkwellText-Variable.woff2`, using weight 500 and default remaining axes. All dice use these digits, including D6; there are no pips. The atlas uses nonzero fill so overlapping font contours stay filled. The same font and weight render the entire page, matching the tagline. Source outlines and attribution are in `../scene3d/assets/dice/inkwell/`; regenerate with `python scripts/build-dice-font.py` (requires current fonttools with WOFF2 support). The earlier generated glyph artwork is unused.

Each roll has an independent `RollTiming` sweep, explicitly reset to zero before starting and after the result hold. Its grade locks on a timing click while the note stream continues; ignoring it leaves the modifier at zero. There is no free-roll mode or impact shockwave. A throw applies upward velocity first and starts tumbling after 0.125 seconds of liftoff.

## Landing dust

`scene3d/landing-dust.js` reuses the laser-eye cube's original `landing-sprite.svg`, component metadata, `watcherLanding` animation and `LayeredVectorEffect` ground projection. One burst marks the first strong floor contact, with a smaller takeoff burst. Each plume captures its contact position and floor projection once; camera motion and zoom cannot shift it on screen. A two-effect pool bounds rendering work. The earlier removed shockwave ring stays hidden. Reduced-motion mode disables dust.

Dust uses a pale cream palette against a uniform cream background with a transparent shadow catcher. Airborne spinning is silent; throw, landing and timing feedback retain their short sound effects. A missed timing click breaks the combo, settles the die, waits 0.55 seconds, and automatically throws again at base tempo. Skipping timing still pauses.

The header total score adds a valid roll’s final value (face plus timing bonus or penalty) only when it reaches the displayed target. Combo resets do not erase it; reloading starts a fresh score.

Dust uses four segments per curve, precompiled shaders, and recorded contact positions/times. Die changes clear old dust before camera reframing; inactive effects skip sampling.

## Roll targets and incoming timing

Each die shows its target (`floor(sides / 2) + 1`, e.g. D6 needs 4+). Face plus timing modifier must reach it to bank that total; lower rolls earn zero. Timing alone determines a valid roll's combo, so good/perfect timing keeps the streak even with no points. Missed timing keeps the existing −1, combo reset and automatic recovery pause. No turn limit is added.

## Incoming attacks and the shield response

`scene3d/assets/dice/icons/shield-gpt-image-2.png` is the player-facing block icon (with `shield.svg` retained as the vector fallback). During a throw with a skull window, the skeleton samples one hidden attack from `strike` or `feint`. The shield appears as a timing tile beside the skull; landing on it declares the block response. A selected strike costs half a heart only when the shield tile was missed. A feint never deals damage. The possible choices stay hidden from the player, so the result is based on the attack the opponent actually selected rather than punishing the player for every hypothetical choice.

The resolver returns the possible choices, selected attack, defence, `blocked`, `hit`, and `damage` fields. The dice duel wires those fields into the shield timing tile, heart damage, block feedback and the existing hurt reaction.

The reload marker moves left to right across fixed sword, shield and skull zones. The lane keeps its marker identities and positions through input and between throws. A perfect hit pauses only the lane for 75 ms, a green hit slows it during recovery, and a miss freezes it for the penalty. The die uses an independent animation clock, including a landing deformation tail. Consumed targets disappear immediately on input, so the next visible target is always still playable. Total score remains in the header; there is no recent-rolls footer.

## Reload bar and hearts

Each throw starts a fresh stationary reload bar. The marker sweeps left to right once, and input freezes it at the exact click position. Sword, shield and skull tiles stay fixed for that throw. Layouts cycle through single- and double-sword arrangements; the die's first physical landing aligns with the primary sword center.

- Sword: green gives +1, gold gives +2; keeps/increases the streak, with green/gold squash-and-pop feedback.
- Shield: declares a block response and can stop the hidden opponent strike for that throw.
- Skull: marks the opponent threat, breaks the streak, resets speed and keeps two recovery rolls slow. If the opponent selected `strike` and the shield tile was missed, the strike removes half a heart at resolution; a selected `feint` is harmless.
- No click: breaks the streak and resets speed, costs no heart, waits 300 ms and keeps one recovery roll slow.
- Click empty space: breaks the streak and resets speed, costs no heart, waits 950 ms and keeps three recovery rolls slow.

Three lost hearts end the run. Click/Space starts a fresh run and score. The base sweep takes 1.55 seconds and speeds up by 4% per successful sword; recovery rolls temporarily hold it at base speed. Positive landings auto-chain after 100–140 ms. Timing and die follow-through use independent clocks, so freezing the marker does not freeze the die's squash and rebound. The page has no music, streaming targets, branding header, Studio/sound controls or recent-rolls section.

Audio is effects-only: rolls, impact, positive click and damage. The rail is 64 px high (54 px on mobile), with large vector icons. Skull, sword and heart artwork was generated using the built-in image tool and traced to real SVG contours by `scripts/trace-dice-icons.mjs`. Source PNGs, SVGs and exact prompts are in `scene3d/assets/dice/icons/`. Hearts use a 680 ms squash, stretch and rebound on loss.
