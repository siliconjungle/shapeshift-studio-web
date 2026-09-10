# Pillar study — Hearth, Cryos, Solis

Run `node serve.mjs` from this directory and open http://127.0.0.1:4357/pillar-study/index.html.

Three actual interactive 3D models with straight sides and planar chamfers: 1.30 × 4.60 × 1.30 metres, with 0.055-metre bevels. Each pillar rests directly on the ground, with no base or footing. No curved profiles, decorative frames or metal corner pieces.

Each final face starts as generated artwork. `source/prompts.json` and `source/cap-prompts.json` record the exact prompts and original output paths; the selected originals are copied into `source/`. `source/prepare.mjs` and `source/prepare-caps.mjs` run the same Little Gods VTracer/Sharp conversion used for the Watcher, with an eight-colour palette and preserved dark outlines. Final SVGs contain paths only, with no embedded raster images. `vector-report.json` and `cap-vector-report.json` record conversion statistics. Top and bottom sources are prepared from the left and right squares of each generated cap atlas.

The study imports Studio's existing `parseSVG` and `svgGeometry` functions, which triangulate the SVG fills. These are actual coloured face triangles, not raster textures. Each variant reuses its generated face on all four vertical sides and has separate matching top and bottom SVGs. `chamfer.js` clips artwork triangles at every crease and projects the outer artwork onto the chamfers and corner planes; adjacent face boundaries meet at the same physical positions. The underlying solid uses the same projection. A stepped lighting shader preserves the generated artwork's colours, and a silhouette pass adds black body outlines. This uses Studio's vector geometry workflow in a separate review page; it does not replace the Watcher or change saved Studio projects.

Drag each model to orbit, scroll to zoom, toggle SVG faces to inspect the underlying geometry, or turn on wireframe to inspect the actual vector triangulation. Top view exposes the caps. Underside temporarily hides the ground so the bottom faces can be inspected; Reset view restores the ground.

## Surface maps

`node source/prepare-surfaces.mjs` derives height, roughness, tangent-space normal and ambient-occlusion PNGs from each of the nine SVGs (36 maps total). Like the Watcher preparation flow, it classifies the vector colours into material families. Here the dark ink is recessed, the light carved marks sit below the stone surface, and all material is rough stone. Height is lightly blurred before computing the normal response. Normals account for the physical dimensions and a 0.045 m height scale. These are finite-resolution shading maps, not geometric displacement; the silhouette and scene depth follow the actual bevelled solid.

The renderer samples the same UVs for artwork and maps, including on bevels. The map selector shows height/relief depth, roughness, perturbed world-space normals, occlusion, and actual view-space scene depth. `Surface relief` toggles normal/occlusion response for comparison. `Move light` changes the light direction so the carved relief and roughness-dependent highlights can be inspected. The original SVG colours remain vector geometry.

Surface map files are `assets/<variant>[-top|-bottom]-{height,roughness,normal,ao}.png`; dimensions and scale are recorded in `assets/surface-maps.json`.

`node --test chamfer.test.mjs` checks that all six patches form a closed solid with outward winding and the requested dimensions, and that large artwork triangles are split at creases with their UVs preserved.

After modifying the viewer, run `node build.mjs` to rebuild its browser bundle.

Artwork generated with the built-in image-generation tool. Discarded ornamental drafts were not used in the final models.

## Native Studio scene

Build Studio with `npm run build` from the web repository and run `npm start`. In the Scene workspace, choose **Watcher & pillars** to load the Watcher and three editable pillars. The **Palette** selector switches Hearth, Cryos and Solis for the cube, ground and every pillar, including the matching surface maps. **+ Pillar** adds another instance to this scene. The normal, depth, relief and roughness views remain available under View.

The native recipe lives in `../scene3d/recipes/watcher-sanctuary.js`, with reusable pillar definitions in `pillars.js`. Studio and this study share the chamfer geometry implementation. The approved SVGs and maps are also stored in `../scene3d/assets/pillars/` so the built editor and exported projects can load them independently of this review page. Studio's normal Save project flow embeds the registered resources and all three variants.

Native verification: `node --test puppet-studio/pillar-study/chamfer.test.mjs puppet-studio/scene3d/recipes/watcher-sanctuary.test.mjs` from the web repository.
