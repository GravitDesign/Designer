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

## Bug-fix pass (bugfix-plan.md)

Each clear old bug is fixed in its own `fix:` commit with a BUGS-FIXED
entry, a test and parity exceptions. Done: engine BF-001..019 except
BF-009 (BUG-009..026), editor BF-020..037 (BUG-040..057), import
BF-067..083 except BF-077 (BUG-100..115), platform (BUG-130). In
progress: SVG/export BF-038..066 (branch bugfix/io-export, BUG-070..099).
Open: app UI BF-084..128 (BUG-131 onwards), BF-077 (EPS mesh shadings),
BF-009 (symbol instances miss master text changes), the knife's Space
drag (same as BF-026), the multi-page drop target that stays marked,
dashed EPS borders rendered solid, BF-119's name escaping regression
(layer and page names show `&lt;` instead of `<`).

## Decisions by the user (2026-10-24)

- The annotations (comments) sidebar's tab row above the inspector is
  removed with the sidebar; scenarios that differ only by it get a DROP
  exception (REMOVED.md).
- Bug-fix pass: fix every clear old bug (crash, data loss, wrong output,
  broken UI) with a BUGS-FIXED entry, a test for the correct behaviour, a
  parity exception and its own `fix:` commit. Odd but harmless quirks stay.
- Cutover: next/ moves to the repo root; the old app moves to legacy/.
- Desktop updates: electron-builder publishes to and checks GitHub
  Releases of GravitDesign/designer (the repo moved there from
  rathlinus/gravit-designer). Nothing is published or pushed by the agent.
- Packaging: every target (Windows nsis + portable, Linux AppImage + deb,
  macOS dmg x64 + arm64) is built in GitHub Actions; Windows is also built
  and launch-tested locally.
- First start after the old desktop app: take over settings, swatches and
  the other kept localStorage keys, the imported fonts (IndexedDB
  gravitFontsDB) and the recent files list.
- Overnight: undecided points are decided closest to the old behaviour,
  logged in QUESTIONS.md, and work carries on.
- Brand: the app is GravitDesign Next (mark "Gravit planet, red anchor",
  wordmark with "Next" in a selection box, the old pink accent in the
  brand magenta) with a one-time introduction that says it is not the
  Gravit Designer people know. The old look stays as the classic look,
  which the parity suite uses (CHANGES.md CHG-001).

## Phases

| # | Phase | State |
| - | ----- | ----- |
| 1 | Inventory | done (2311 items) |
| 2 | Parity harness and corpus | done: 2855 old-app scenarios, review fixed, re-recorded |
| 3 | Scaffold next/ | done |
| 4 | Engine core | done: all engine clusters ported, review (phase4-review-A..D) fixed; 330+ parity ids pass in the new app; scenarios that need the editor are enabled in phase 6 |
| 5 | File format and import/export | done: .gvdesign, SVG/PDF/PNG/JPG export, SVG/PDF/AI/EPS/Sketch import, workers; review (phase5-review.md) fixed; export output compared in the browser (io-export-svg/pdf/bitmap); export scenarios that need the editor wait for phase 6 |
| 6 | Editor | done: editor core, view, guides, all element editors, all tools, touch input; review (phase6-review-A..C) fixed |
| 7 | UI | done: every app cluster ported on React 19 + Zustand (UI.md), removed features documented (REMOVED.md, DROP-001..013), review (phase7-review-A..C) fixed. Started before the phase 6 review was fixed, at the user's request (2026-10-23). The GravitDesign Next look and introduction were added at the user's request (CHANGES.md). |
| 8 | Platform | done: shared server, Electron 45 with electron-updater (GitHub Releases of GravitDesign/designer), first-start migration of settings, swatches and fonts from the old releases, desktop packaging for all targets in .github/workflows/desktop.yml; Windows packaged and launch-tested locally |
| 9 | Cutover | done (2026-10-25): next/ moved to the repo root, the old app to legacy/; main is the rewrite, the old app's history is on the legacy branch |
| 10 | Final check | not started |

## Log

- Whole-suite proofs over the final phase 2 recording: all 2886 parity
  tests fail under sabotage; all 156 mutations make every listed scenario
  fail.
- Phase 4 levels 0-4 committed: core, locale, math, opentype fork,
  vertex, color, boolean ops, paint, offset/trace/knife, fonts with
  HarfBuzz 2.2.0 (own wasm build, identical on 13,030 shaping cases),
  scene node base, styles, text layout (GTL), paths, canvas effects,
  WebGL effects.

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
- GEmptyAnnotation ("ann") restores none of its meta properties (text,
  uid...) on load: data loss. GAnnotationsList.getSelected throws a
  ReferenceError as soon as anything is selected; GCommentAnnotation
  initSizeAndPosition throws on a second call (GTransform.invert missing).
- Restored ready shapes skip all base constructors (no $refs, _effId,
  _layId, _paintSharp): no pixel snapping, linking may crash.
- BUG-007 (textures missing from exports after the view painted them) is fixed; see BUGS-FIXED.md.
- Symbol labels: the instance is never painted after duplicate in the
  headless old app (editor-actions symbols/labels-on).

From the phase 5 review (old behaviour kept and pinned; QUESTIONS.md
entries Q-075..Q-119 say where):
- .gvdesign whose JSON holds no scene stays Loading forever (Q-118).
- SVG import: a CSS rule named `__proto__` or `constructor` writes onto
  Object.prototype / Object for the session; `<use href="#toString">` or
  an id `constructor` fails the import.
- SVG export: texts colored by their font color export as
  `fill:[Object GRGBColor]` (Q-088; 162 corpus texts); a broken image
  throws a ReferenceError (undeclared `dashed`).
- PDF export: concurrent raster drops the last pixels (Q-091); never calls
  back when a node's paint throws or after an abort during rasterization
  (Q-092, Q-093); bleed box geometry (Q-119); astral ToUnicode hex (Q-089).
- Multi-file export: drops a file whose final name is taken (Q-094); a
  directory export with an unnamed item never finishes (Q-095); the
  fallback ZIP is lost when the storage can't download (Q-096).
- PDF import never calls back for a file pdf.js can't open, such as one
  with a user password (Q-104).
- PS worker: a non-object errordict handler crashes it (Q-106);
  image/imagemask with PS objects die with DataCloneError (Q-107).
- Sketch: layer effects dropped (Q-098), replaceChild test inverted
  (Q-099), a first union counts as no operation (Q-101), "Regular" fonts
  import as italic (Q-102), borders always import as Inside (Q-103).

From the phase 6 editor port (old behaviour kept and pinned by unit tests):
- Toggle marquee over a highlighted selected node throws a ReferenceError
  (`removeFlag++` on an undeclared global, GEditor
  highlightSelectablesUnderCollision).
- StyleEdManager.updateActiveEditorCursor reads the never-set
  `_activeTool` and throws whenever an editor is active and a view exists.
- The cursor outside the transform box is always the rotate cursor
  (GSceneEditor.getCursor missing break; listed above).
- Segment drag at slope ~0/1 builds PartInfo with an undefined type; Shift
  in detail mode starts the right shoulder from `cl`; outside detail mode
  Shift gives a NaN translation (GPathEditor; listed above).
- A slice scaled without a preview gets height 0 (GSliceEditor
  _applyTransform multiplies by the shear `matrix[1]`).
- Paths graph: edge delete removes only the first selected edge (listed
  above); moving a whole graph throws on every move and the graph stays
  (edTransform without part selection); Shift while hovering with the
  paths graph tool throws on every move; aligning anchors throws
  (applyTransform without a target); every frame while drawing logs
  "Editor render error ... '__editor__'".
- Magic tool shaping throws a TypeError when the shaped selection has an
  open sub-path (GMagicTool._doTheClip reads `.item` on raw vertex
  sources).
- Pen: Space during a handle drag in a scrolled or zoomed view moves the
  anchor by the scroll offset (listed above).
- Fonts: the first call to the imported fonts provider runs twice, so a
  missing font fires FontUnavailableEvent and MissingFontEvent twice
  (Q-169); a failed font download leaves every request for that file
  pending forever (Q-168).

## History repair (done)

The commit check (scratchpad verify-index.sh) silently passed failing
prettier and test steps until 2026-10-23. A re-check of every commit since
f1682f36 found 22 commits, from "port path offsetting, image tracing and
the knife cut" to "keep a moved radial gradient center through save and
load", that failed `prettier --check` on JSON data only, and the last
one also one unit test. A `git filter-branch --index-filter` over that
range formatted the parity/ported lists, added `scripts/data` to
.prettierignore and gave the radial gradient commit the corrected
scenarios test. The follow-up commit that had made those two changes
became empty and was dropped. The final tree is unchanged; the repaired
commits pass the prettier check (verified per commit), and the radial
gradient commit now has the exact tree of the dropped follow-up, which
passed every check.

## Pending porting work

- The three differences found by the SVG export check are resolved:
  CMYK colours and svg/effects pixels came from the agent's scratch harness
  (no ICC file served, missing --disable-accelerated-2d-canvas); the
  fills-textures star was an old-app behaviour, now ported (ac1cb397).
- Scenes need `scene.setShadowExpandArea(9, 9, 9, 11)` as the old app's
  documents set it (exports measure 338x220 instead of 320x200 without it);
  belongs to the document/editor setup.
- Phase 6 interim font provider: the text scenarios (engine-model/text/*,
  styles/default-styles, symbols-branches/text-merge, the text exports,
  editor-tools api-transactions-and-events) fail with "fonts did not
  load": the parity app has no font provider or default font until
  app-fonts-ui (phase 7). Give the interim document host the old app's
  providers and default font so they can run in phase 6.
- The real app must import src/editor/index.ts (it registers the element
  editors after editor.ts); the parity app does through document.ts.
- Phase 7 must take over the interim GDesigner parts in
  src/parity/app/editor-tools.ts (editor options from GDesigner.init, the
  desktop handle look, restored snap settings, the tool table and tool
  shortcuts, the setView call on window changes) and
  src/parity/app/fonts.ts (providers and default font).
- Editor scenarios still waiting for phase 7: everything that runs an
  action, a shortcut (Delete, Ctrl+Z, digits, Shift+F10), the inspector
  (gradient fill chooser), the toolbar, the rulers' guide drags or the
  annotations sidebar. editor-tools/toolmgr/tool-table differs only by
  the page origin in the rich-tooltip video URLs (normalize the origin).
- snap/page-overlay: the window background outside a page resized by a fixture is wrong
  (view-host).
- engine-model/events/node-events needs the layers panel (it sets
  Expanded on the parent group when a child is selected); workers/isolation
  differs by the COOP/COEP headers (BUG-008): add it to BUG-008.json with a
  .fixed file when it is ported.
- Check corpus/text-scripts SVG export once a canvas has drawn the text: the old
  app exports it through the UI, both apps throw "reading 'getMatrix'"
  when the scene is built with G only.
- The phase 5 fix runs of io-export-pdf/bitmap had 7 and 10 failures in
  two of six runs while the machine was loaded (names not kept); check in
  the full runs whether any of them is flaky.

- Every port agent reported "old quirks kept" (in its final report and in
  comments/READMEs next to the code). At the end of phase 4, collect them
  from the code comments into QUESTIONS.md, one entry per quirk, so the
  list doesn't live only in conversation logs.
- Some unit tests read fonts from the old app's assets (e.g.
  src/engine/text/fonts/harfbuzz.test.ts). Since the cutover they read
  legacy/public/assets by relative path.
- engine-geometry-boolean deliberately converts big.js values to numbers
  in a dead branch of getCubicRoots (the old code would have concatenated
  strings); unreachable, noted for the record.

## Pending harness work

- Removed-features pass (after the last UI clusters): add DROP entries
  with `.fixed` files for the scenarios that differ only because of a
  removed feature: Pro classes and badges (`.pro`, `select.pro`,
  `span.pro`, `legacy-feature`), the login/persona area of the header
  (remove the empty `.g-persona-bar`/`.g-persona-container` the menus
  port keeps; editor-actions/registry/cloud-ui requires them gone, decided
  2026-10-24), the share/collaborator toolbar elements, File > Open from
  template, the annotations (comments) sidebar with its 32 px tab row
  above the inspector and its View menu entry, the iOS import actions.
  Each .fixed must differ from the old expected file only in the removed
  part.
- Removed-feature exceptions (decided 2026-10-23): editor-actions/exec
  font.import, file.export, file.save-as.pdf.300 and file.export.pdf record
  `pro: true`, which came from the old bootstrap Pro wrapper (license). The
  new app has no Pro actions. Extend parity/support/exceptions.ts with
  DROP-NNN files documented in a new docs/rewrite/REMOVED.md (same
  `.fixed` mechanism, each entry naming what was removed and why), add
  DROP-001 "No Pro actions" with `.fixed` files that equal the old output
  except `pro: false`, when the actions cluster is committed.
- Touch screenshots flaked twice in about 110 runs under load
  (annotations/touch-transform-box-icon-handles: the preserve-aspect-ratio
  icon missing, 27 px; touch/handles-overlay): probably the handle icon
  image not decoded yet at the shot. Wait for the icons in the harness or
  check the icon loading.
- The in-page font fetches of the io-export-* libraries (fontBytes in
  newWorkspace) have no retry: under load one fetch failed with "Failed
  to fetch" (io-export-svg/corpus/slices, level 8 run; passes alone).
  Retry like openApp does.
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
