# Destination pennant

Generated using the built-in GPT Image tool. Source: `destination-pennant.png`.
Final asset: `../destination-pennant.svg`.
Processed with Little Gods cel color reduction, SVG tracing, palette mapping,
and cached 4.4-unit edge ink at its 48×58 map display size.

## Prompt

Use case: stylized-concept. Asset type: one small destination icon for a hand-inked sepia fantasy map, subsequently color-reduced and traced into SVG. Draw a charming little JOURNEY FLAG: a short slightly crooked wooden pole with a rounded finial and a soft, wavy, rectangular swallowtail cloth pennant attached near its top. A simple dark stitched X on the cloth indicates the journey's destination. Clearly a flag, NOT an arrow and NOT a map pin. Handmade storybook game art with imperfect curvy contours, thick dark brown-black #211e1a outlines, broad flat warm parchment cream, muted brown and tan color areas, one restrained flat shaded fold. Readable at 48 pixels. Isolated single object, centered, generous transparent padding, genuinely transparent background. No base, no ground, no cast shadow, no scenery, no characters, no words, no realistic fabric texture, no gradients, no tiny details. The cloth should feel plump and floppy rather than angular. Front view, modest asymmetry, friendly tactile little adventure-map marker.

## Rebuild

```sh
node scripts/prepare-map-destination.mjs
node scripts/map-bramble-palette.mjs destination-pennant
node scripts/prepare-map-silhouettes.mjs
node scripts/recolor-map-ink.mjs
```
