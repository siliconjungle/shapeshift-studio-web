# Frog wizard — layered puppet trial (shelved)

Shelved after visual review: the intentional-pose version remains the preferred demo. Keep this isolated experiment for reference; do not promote its reconstructed artwork as the character baseline.

This sibling study separates the existing intentional poses into a reusable layer hierarchy. GPT Image edits reconstruct the hidden head/costume and complete the clasped hands. Existing vector eye, mouth, hat and raised-hand drawings are retained wherever possible. Generated bitmaps pass through the real Little Gods color-reduction → SVG pipeline before use.

The original intentional-pose study is retained for comparison.

Layer authoring principles:

- Each hand has its own wrist anchor and parent forearm. Hand-pose changes do not replace the face or costume.
- Eyes, pupils, eyelids and mouth artwork attach to the head.
- The head and costume are complete underneath the visible overlaps.
- Pose keys coordinate the layer transforms and drawing choices; unrelated contours are not automatically matched or morphed.
- Source generation prompts, registration and extraction metadata are retained with the assets.
