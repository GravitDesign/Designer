# Rewrite progress

Read this file first when resuming. Then INVENTORY.md, QUESTIONS.md and
BUGS-FIXED.md.

## Ground rules (from the task)

- Worktree: C:\Users\info\worktrees\gravit-designer-rewrite, branch
  `rewrite/modern-stack`. Never commit to main, never push.
- Root node_modules is a junction to the main checkout. Never install there.
  Install only into `next/node_modules`.
- The reference is public/chunk.vendor.js, public/designer.browser.dev.js and
  the CSS in public/. Never run `npm run build` at the root.
- Every commit builds, lints and passes all tests.
- At the very end: `cmd /c rmdir node_modules` first, then remove the worktree.

## Approach

The old engine is a port target, not a design reference. To reach exact
parity (pixels, geometry, serialized JSON) the new engine keeps the old
algorithms and their order of floating-point operations, rewritten as
readable, typed TypeScript with clear names. Class names drop the `G` prefix
inside `next/` but keep a mapping table (docs/rewrite/class-map.md) so tests
can call both sides by the same name.

Navigation aid: docs/rewrite/old-module-index.tsv lists every webpack module
of both bundles with its line range, size and class names.

Port plan: docs/rewrite/PORT-PLAN.md (60 clusters in 15 dependency levels)
and docs/rewrite/port-map.tsv (one row per old module: port, npm, data or
drop, with its target file). Generator scripts for both are in the session
scratchpad (pm/); edit the files directly from now on.

Decisions taken:

- The command recorder (GRendererCtx, modules v111/v897/v899/v205) is not
  ported. The renderer paints the same calls in the same order straight
  into the tile canvases. The tile grid, tile size and zoom levels stay the
  same, because they decide where antialiasing falls.
- Text shaping: try the `harfbuzzjs` npm package first. If text parity
  fails because of shaping, build HarfBuzz 2.2.0 (the version the old
  bundle embeds) to wasm with Emscripten from a script in next/vendor/,
  and commit the script with the binary.
- pdf.js: pdfjs-dist 2.1.266 (closest published to the bundled 2.1.286)
  plus the CMYK patch re-applied in our code.
- opentype.js, canvg, imagetracerjs, StackBlur, jpgjs, quadtree, the
  intersection code, the Sly selector engine and zip.js v1 are modified
  forks in the old bundle, so they are ported, not taken from npm.

## Phases

| # | Phase | State |
| - | ----- | ----- |
| 1 | Inventory | done (2311 items) |
| 2 | Parity harness and corpus | not started |
| 3 | Scaffold next/ | not started |
| 4 | Engine core | not started |
| 5 | File format and import/export | not started |
| 6 | Editor | not started |
| 7 | UI | not started |
| 8 | Platform | not started |
| 9 | Cutover | not started |
| 10 | Final check | not started |

## Log

- Phase 1 started: six inventory subagents (engine model, renderer/editor,
  actions/menus, UI, formats/platform, running-app walkthrough).

## Bug candidates

Found while recording. Decide when porting the code: a clear bug (crash,
data loss, wrong output, broken UI) gets a BUGS-FIXED.md entry and its own
`fix:` commit; anything else goes to QUESTIONS.md and keeps the old
behaviour. Until decided, the parity scenarios record the old behaviour.

- Radial gradient center lost on save/load: `_serializeToBlob` writes
  `_cx`/`_cy`, `_deserializeFromBlob` reads `cx`/`cy`
  (chunk.vendor.js:33135-33148).
- Scene `_handleChange` uses undeclared `mpIdx` when property `ms` changes
  (chunk.vendor.js:34950).
- GVertexInfo.getPathLength throws ReferenceError (`cx2`) on cubic segments
  (chunk.vendor.js ~13240).
- GLength.toString prints "5undefined" (unit lookup by lowercase key).
- GUtil.unpackNumbers returns extra trailing entries.
- GPathUtil.makeClockWise throws on a plain GVertexContainer.
- GSceneEditor.getCursor falls through OUTSIDE to ROTATE (missing break,
  chunk.vendor.js:79331).
- `_movePreviewPointShoulders` reads `cr` as `cl` (chunk.vendor.js:30019).
- GPathEditor segment drag builds PartInfo with undefined type `H`
  (chunk.vendor.js:28715-28740).
- Paths-graph edge delete removes only the first selected edge
  (chunk.vendor.js:53376).
- File > Save on a new document without the File System Access API throws
  "gravit-cloud.save-as not registered".
- Settings dialog rows bound inverted: store text path, scrubbing, auto-save
  warning (designer.browser.dev.js module 1275).
- ps worker timeout never fires (string concatenation); Atomics.wake
  instead of Atomics.notify; EPS embedded JPEGs need COOP/COEP headers.
- Service worker precache frozen at build 8795 and lists
  designer.browser.js instead of designer.browser.dev.js.
- Texture paste alert shows the arrowhead message.

## Known pixel/parity diffs

None yet.
