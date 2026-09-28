# Shapeshift Studio Web

Start with `README.md` and `docs/features.md`. Discover the whole feature set offline with `npm run studio -- catalog`; search using `--query`, inspect a feature by ID, or get validated example requests with `npm run studio -- recipe RECIPE_ID --json INPUTS`. Discovery never edits a project.

For live work, read `docs/live-api.md`, run `npm start`, open the editor and inspect `sessions`, `capabilities` and `inspect`. Use explicit project IDs and revision checks. Prefer the public live API over evaluating internal browser state.

The shared feature catalogue is maintained in Studio Core `src/catalog/features.json`. Update its records and the pinned Core version when adding tools; regenerate `docs/features.md` with `npm run catalog:docs`. Do not hand-edit generated feature documentation.

For catalogue changes run `node --test puppet-studio/catalog/catalog.test.mjs scripts/api-server.test.mjs` and `npm run build`. Tests check public command coverage and execute/undo every document recipe. Verify visible interface changes in a browser.
