# Shapeshift Studio Web

Private browser editor for 2D puppets, SVG artwork, illustrated 3D scenes, animation, sound and JSON entity definitions.

This is the current web editor; the older `siliconjungle/shapeshift-studio` motion-capture workstation is a separate project.

Shared transforms, IK, scene definitions, rendering, effects, sound, lighting and grading come from the private `@shapeshift-labs/studio-core` npm package. Core is temporarily pinned to its private GitHub source until npm authentication is available. It is never fetched from a public CDN.

Run `npm ci`, `npm run restore:assets`, `npm run build`, then `npm start`. Open http://127.0.0.1:4354/.

Example artwork and the optional Little Gods preview are private release assets (`examples-v1`). They are not dependencies of Studio Core. The imported Little Gods authoring adapter remains in this application as optional integration source; it does not belong in the shared core. The native preview fixture is pinned to the previously verified game build, and is never published as the game itself.

Little Gods has its own build and deployment, which excludes Studio. Do not use the Little Gods deployment command to publish this editor.
