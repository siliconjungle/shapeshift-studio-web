# Example support

Rendering, motion and sound helpers extracted from the Little Gods example projects. They keep the examples self-contained without importing a neighbouring game checkout. They are example support, not Studio public APIs; reusable authoring primitives live in Studio Core.

The renderer uses daytime lighting with exploration fog disabled. Scenery effects accept authored assets and contain no game simulation persistence. Butterfly and bird modules retain the pure flight samplers used by the example. Three.js and colour grading come from the same dependencies as Studio.
