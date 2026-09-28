# Location lock

Generated with the built-in GPT Image tool, then alpha-trimmed, color-reduced
and traced with Little Gods' `convert(..., {preset: 'cel', colors: 6})`.
The game's palette mapping and the map's cached 4.4-unit silhouette ink bands
are applied afterward, including the shackle's transparent opening.

## Generation prompt

Use case: stylized-concept. Asset type: one isolated little padlock icon for a hand-inked sepia fantasy map game, to be color-reduced and traced into SVG. Primary request: a charming squat CLOSED padlock with a slightly crooked rounded iron shackle, chunky warm parchment/brass body and one very simple dark keyhole. The aesthetic is handmade storybook game art: imperfect curvy contours, confident thick dark brown-black ink, only 4 flat muted colors (cream, tan, warm grey, near-black #211e1a), tiny flat shadow patch. Front view, readable at 48 pixels. No face, no text, no surroundings, no cast shadow, no sparkles, no realistic metallic shine, no gradients, no stippling or small texture details. Centered single object with generous padding. Genuinely transparent background, including the hole inside the shackle. This should look like a tangible little hand-drawn object, not a geometric UI glyph. Save image output for use in project.

## Rebuild

From shapeshift-studio-web:

```sh
node scripts/prepare-map-lock.mjs
node scripts/map-bramble-palette.mjs location-lock
node scripts/prepare-map-silhouettes.mjs
node scripts/recolor-map-ink.mjs
```

Source PNG: `location-lock.png` next to this file.
Final asset: `../location-lock.svg`.
