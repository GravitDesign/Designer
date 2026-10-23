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
| 2 | Parity harness and corpus | done: 2855 old-app scenarios, review fixed, re-recorded |
| 3 | Scaffold next/ | done |
| 4 | Engine core | in progress: levels 0-1 committed (core, locale, math, opentype fork, vertex, color); level 2 (boolean, paint) running |
| 5 | File format and import/export | not started |
| 6 | Editor | not started |
| 7 | UI | not started |
| 8 | Platform | not started |
| 9 | Cutover | not started |
| 10 | Final check | not started |

## Log

- 31 parity scenarios pass against the new app (parity/ported/*.json).

- Phase 2 review: 84 findings (28 high). Harness-wide fixes done by the
  coordinator, uncommitted until the areas re-record: shared-page reset
  (resetState), tagged -0/NaN/Infinity/undefined, normalize.ts follows more
  reference forms and keeps loaded ids (keepIdsOf), nested JSON renamed in
  place, lint ban on old globals in scenarios, PARITY_CONTEXT (en-US, UTC,
  light) and SwiftShader, mutation testing (parity/mutations,
  scripts/prove-mutations.ts). Seven fix agents work through the area
  findings.
- Re-record with the locale pinned changed one file (a flake in
  platform/dropped/startup-traffic), so earlier recordings didn't depend
  on the system locale.

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
- A malformed gradient swatch in localStorage `swatches` stops the app from
  starting ("reading 'length'"; gDesigner never ready).
- Settings dialog: toggling "Disable notifications" and saving leaves the
  dialog stuck (GET /user/settings returns HTML, JSON parse throws); any
  Save sets system_fonts_enabled, enable_steps_debug and enable_cache to
  undefined, so they vanish from designer.settings.

- GOpenTypeUtil.getOpenTypeInfo reports weight 400 for OpenSans
  SemiBoldItalic, ExtraBold and Light (imported fonts get the wrong weight).
- GVertexInfo / GPathsGraph / GCompoundPath quirks from engine-geometry
  (see that area's notes): getPathLength cx2, hit test needs an update
  cycle, addGraphLine refuses GPath.
- engine-model saw shapes inserted with editor.insertElements all get the
  "Rectangle Default" `_sdf`; engine-model/type-ids shows each kind gets
  its own when they are inserted together. Check how the first scenario
  inserted them before calling it a bug.

- Flatten, undo, redo: saving then throws "Missing entry value for
  dictionary://..." (data loss risk).
- Simplify Path ignores the typed "% Tolerance" value (handler looks for
  the slider inside the field's span); Simplify never removes points from
  straight open paths.
- Invalid Expand/Shrink value shows the "outline value" alert text.
- Ctrl+Shift+= doesn't zoom in (only Ctrl+=); menu Copy without clipboard
  permission shows an alert although the internal copy works; pasting an
  SVG file does nothing (SVG as text works); unresolvable fonts leave text
  pending forever; closing documents leaves the view unpainted until a
  relayout.

- Saving a document with a ready shape that has no handles (Rectangle,
  Oval, Triangle ready shapes) throws in GSimpleShape store
  (`_annotationsParamVals.length` of null, chunk.vendor.js:75187), so no
  file is written (data loss).
- Effects inspector throws "Invalid effect/class" for GGLTrueBlurEffect and
  GGLBendBlurEffect (designer.browser.dev.js:86727).
- Layers panel throws "reading 'parent'" in a setTimeout after selection
  changes on groups (designer.browser.dev.js:168651).
- Paths Graph tool logs "Editor render error ... '__editor__'" while
  drawing.
- Odd/even master pages are stored as full page copies and come back with
  new reference ids on every load (probably a question).

- A hidden page blocks every export ("empty infinite canvas" refusal),
  because hasPagesWithInfiniteEmptyCanvas treats it as empty.
- EPS with `newpath x y r 0 360 arc closepath` hangs the import
  (PSCore.closepath throws in the worker, never reported).
- A broken PDF never finishes loading (overlay stays, empty OK dialog).
- An SVG whose root isn't <svg> leaves a failed tab with no message.
- File > Open refuses .ai, .svgz, .gif, .sketch although loaders exist
  (see Q-008); Place Image with .svgz does nothing.
- EPS import: rectfill/rectstroke mirrored, dashes dropped, clipped arc
  missing. SVG import: <switch> draws every child, nested <svg> dropped,
  class on <use> ignored.
- Auto-sized text is exported in its default 142x27 box if the export runs
  before the font has loaded.
- Export file names keep HTML escaping (`a&lt;b&gt;`); exporting the same
  page array twice gives an empty PDF; "Keep Fonts" disabled in the PDF
  missing-fonts dialog.

- Pen: holding Space while dragging a handle in a scrolled view throws the
  anchor far away (each move adds another -scroll offset).
- Ctrl+B / Ctrl+I on text apply inconsistently between identical runs (key
  handled twice through view and DOM paths); not recorded.
- Spring-loaded tool keys misfire when the main thread stalls > 450 ms.
- Knife cut of a rectangle along a right-click polyline gives one open path.
- Alt-drag duplicate shows the plain select cursor instead of SelectPlus.

- Electron, port 47823 taken: the friendly EADDRINUSE box never shows; the
  ws server re-emits the error, Electron shows "A JavaScript error occurred
  in the main process", no window opens and the single-instance lock stays
  held (parity/scenarios/electron port-in-use). Clear bug: fix in the new
  app with a BUGS-FIXED entry and a `.fixed` expectation.
- Freehand opacity digits write the legacy `_bop`, which is neither painted
  nor saved; getOutlineColor calls Math.min with one argument (always the
  bottom-right pixel); layer `cls` colour has no visible effect; Send to
  Back ignores AlwaysBack at the first slot; a blocked arrange falls
  through to a 1 px nudge; insertElements drops annotations when a layer
  is active; RTL reverses glyph order without mirroring; Delete is ignored
  for annotations while the panel deletes NoDelete-locked ones;
  view.toggle-paint-layers-visibility is never registered (Q-005).
- A mask (`_sbl` m or !m) in a group without its own sub-canvas renders
  nothing (ellipse-mask and star-inverse-mask groups empty; works with
  opacity or an effect on the group). Recorded in corpus/masks.
- A .gvdesign with cut-off JSON stays "loading" forever with no message.
- Opening a document whose reference ids are already open gives it new
  ids (text `#` refs, second page's annlst, `__ids` regenerate on load).
- AdjustMultiEffect saves only fxP and fxN, always as `{}`, so its sepia
  and blur settings are lost on save (data loss; ColorAdjustMultiEffect
  saves fine). Contact shadow grows its kept box on every
  getEffectPadding call; MultiEffect.getEffectPadding returns
  [left, right, top, bottom].
- Symbol labels: the instance is never painted after duplicate in the
  headless old app (editor-actions symbols/labels-on).

## Pending porting work

- engine-text-node must call `registerStylable(Stylable)` from
  src/engine/text/gtl/late-bound.ts (TLCore.initialize throws until then).
- engine-effects-webgl must register GGLBlurEffect, GGLBendBlurEffect,
  GGLDotScreenEffect, GGLSepiaEffect, GGLBrightnessContrastEffect,
  GGLHueSaturationEffect, GGLColorAdjustEffect node names; canvas effects
  look them up by name (src/engine/style/effects/effect-paint.ts).

- Every port agent reported "old quirks kept" (in its final report and in
  comments/READMEs next to the code). At the end of phase 4, collect them
  from the code comments into QUESTIONS.md, one entry per quirk, so the
  list doesn't live only in conversation logs.
- Some unit tests read fonts from the repo root's public/assets (e.g.
  src/engine/text/fonts/harfbuzz.test.ts). At the cutover (phase 9) the
  old app moves to legacy/, so these paths must go through
  server/paths.ts ASSETS_ROOT or a shared test helper.
- engine-geometry-boolean deliberately converts big.js values to numbers
  in a dead branch of getCubicRoots (the old code would have concatenated
  strings); unreachable, noted for the record.

## Pending harness work

- Run `npm run parity:prove` and `npm run parity:mutations` over the whole
  final recording once (each area ran its own; not yet run in one go).

- normalize.ts gaps also seen by editor-actions (which works around them
  in lib.ts `stabilize`): anchor ids (third element of `pts` tuples), `sbl`
  entries, dictionary `uuid`s and `dictionary://<uuid>` URLs, ids inside
  JSON strings held in arrays (compound path `paths`).
- About 1 in 150 old-app loads timed out under heavy parallel load. Give
  openApp a clearer failure message; re-check once the load is lower.

- Pin the browser locale (`locale: "en-US"` in playwright.config.ts) once
  all phase 2 agents are done, then re-record and re-verify every area.
  Today the recordings depend on the Windows system locale (de-DE).
- normalize.ts: also rename random ids used as object keys (scene `_links`),
  inside pattern strings (`"N#{...}"`, `"T#{...}"`) and in compact anchor
  arrays (`[..., "#", id]`); add annotation `time`/`mtime` to TIME_KEYS.
  engine-model works around these in-page today (helpers.ts `clean()`).
- engine-model drops `_sdf` in document scenarios; engine-model/type-ids
  now records the numbers separately, and the new engine must match them.
- platform/dropped.spec.ts: add `removedInNewApp` checks (404 for license,
  subscription, quota, paywall routes; WebSocket upgrade refused) when the
  new server exists.

## Known pixel/parity diffs

None yet.
