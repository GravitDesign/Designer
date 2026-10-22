# Phase 2 review: parity recordings

Read-only review of the parity harness as of commit a466a410 plus the
working tree. Playwright was not run (a re-record was in progress). Paths
are relative to `next/` unless they start with `../` (old app).

Sampled: 46 engine scenarios, 30 corpus and import-export, 50 editor-tools,
55 editor-actions and 45 ui, platform and smoke. That is about 225 in all,
listed per area at the end. Each finding has an id, a severity, a location,
what is wrong and a fix.

Severity means:
- high: a broken or missing feature in the new app would pass, or a
  correct new app would fail.
- medium: part of the claimed behaviour is unchecked, or the outcome can
  vary from run to run.
- low: a small gap or a cleanup.

## 1. Coverage

`node scripts/inventory-check.ts` reports 2311 items, 1896 named by a
test and 415 named by none.

### R2-001 (high): 415 inventory items have no scenario

Location: docs/rewrite/INVENTORY.md, see the lists below.

Classification:

**(a1) Removed in the new app.** These still need a `removedInNewApp`
check (see R2-003):

- ACT-CLOUD-001…015 and 017…021
- EDT-ANNOT-019
- UI-SHELL-007, UI-SHELL-034
- UI-TOOLBAR-011, UI-TOOLBAR-014
- UI-TABS-003
- UI-WELCOME-009
- UI-LIBRARY-014
- UI-INSPECT-027
- UI-FIELD-039, UI-FIELD-054, UI-FIELD-055
- UI-DIALOG-010, 014, 015, 016, 017, 018, 021, 022, 023, 024, 025, 026,
  027, 029, 030, 031, 032, 034, 035, 036, 037, 040, 041, 042, 043, 044,
  045, and the cloud part of 047
- UI-NOTIFY-003, 004, 006
- UI-STORAGE-008, UI-STORAGE-009
- UI-I18N-005 (CDN fetch), UI-I18N-008
- FMT-GVD-017, 018, 019
- FMT-PREVIEW-005
- FMT-IMPORT-027, FMT-IMPORT-031
- FMT-EXPORT-049, FMT-EXPORT-052
- FMT-WORKER-016, FMT-WORKER-017
- FMT-AUTOSAVE-004
- FMT-STORAGE-018, FMT-STORAGE-019
- FMT-IMPORT-023 (iOS import)
- UI-TOUCH-003, if it stays a "pro OK" prompt

**(a2) No parity scenario needed.** These are dead code, things that don't
exist, build or tooling, or internals with no output of their own. Each
should get an inventory note saying what checks it instead:

- Dead or absent:
  - UI-WELCOME-008
  - UI-LAYERS-021
  - UI-FIELD-022
  - FMT-IMPORT-032
  - UI-DIALOG-048
  - FMT-THUMB-007
  - EDT-RENDER-061 (debug renderer)
- Libraries, checked through the behaviour that uses them: FMT-LIB-001…018.
- Build and CI, which need a build smoke test rather than parity:
  - FMT-PKG-001…006
  - FMT-CI-001, FMT-CI-002
  - FMT-THUMB-003, 005, 006
  - FMT-SCRIPT-001, FMT-SCRIPT-002
  - FMT-PREVIEW-004
  - FMT-SERVER-015
- Engine internals with no output of their own:
  - EDT-PAINT-012, 013, 018, 044, 045, 052, 053
  - EDT-PCTX-004, EDT-PCTX-005
  - EDT-RENDER-001, 054, 055, 057, 058, 060
  - EDT-GL-002, 003, 004, 005, 007
  - ENG-SCENE-016
  - EDT-ELEDIT-001, 005
  - EDT-EDITOR-026, EDT-EDITOR-029
  - UI-FIELD-169, 170, 172
- Dev-only: UI-TOOLBAR-007 and UI-STORAGE-011 (mods). Decide whether they
  are dropped. If so, move them to (a1).

**(b) Needs a scenario.** Each group lists what the scenario should record.

| Items | Proposed scenario and recorded output |
|---|---|
| EDT-PAINT-002…008, 041, 046…048; EDT-GL-001, 006, 008…016; EDT-RENDER-015…017; UI-FIELD-091, 097, 098, 115 | Render matrix PNGs: one 64×64 tile per canvas blend mode (16), per WebGL blend mode (12), per GL effect with non-default values, per CSS filter, plus mask and inverse mask (`m`, `!m`). Include a document that holds the hidden or legacy effects (115 can still appear in old files). Pin WebGL as in R2-071. |
| EDT-PAINT-009…011, 019…040, 042, 043, 051; EDT-RENDER-019, 048…050 | Page-decoration renders: a transparent page (chessboard), margins (magenta), page shadow, background opacity, and an image downscaled 4× (smooth downscale). Add `hitTest` pixel results as JSON. |
| EDT-PCTX-002, 003, 006…009 | Outline-mode render PNG (outline colour stack). Name EDT-PCTX-006…009 in the SVG and PDF export scenarios if those already go through these paint contexts, after checking that they do. |
| EDT-RENDER-004, 007…011, 020, 022, 023, 025, 029…031, 033, 035…037, 039…041, 051; EDT-VIEW-039 | View-mode scenarios: Alt+Y outline view, fast view, clip-content Output mode, and pixel-sharp borders at 0.5 px offsets, each as PNG plus the setting key. Wheel zoom steps, recorded as the zoom sequence for 15 Ctrl+wheel ticks in and out, clamped at 0.06 and 256. zoomAll and limitScrollingToView scroll values. Page thumbnails event. |
| EDT-EDITOR-001…025, 027, 030, 031 | Editor API through the UI: selection edit mode (Enter on an image or path), path resize toggle, hide selection during drag (shot mid-drag), auto-close of editors on deselect, active page by mouse in multi-page view, insert above selection, exchange, convert to paths (undo name "convert to paths"), join/split compound, arrange order with AlwaysBack lock, center selection, editor option defaults. |
| EDT-ELEDIT-002…004, 006…055 except 044, 045; EDT-HANDLE-021, 023; EDT-XFORM-025 | Element-editor scenarios with real input. Gradient editor: add a stop by clicking the line, snapping, linear, radial and angular handles, with doc plus shot. Page editor: drag by label, resize, collision. Group, layer, slice and compound-shape resize rules. Program locks (`plkt`) remove handles. Catch handle on an item inside a shape. Pattern drop on stroke vs fill. Adaptive outline colour on a dark fill (shot). Simple-shape annotation handles. |
| EDT-ANNOT-001…018 | Annotation tools and editors (if annotations stay): place each type, record doc fields (name, uid, time, seq, loc, typ), hide or resolve visibility shots, delete blocked by lock, comments panel click selects and zooms. |
| EDT-TOOL-026, EDT-TOOL-062, EDT-ELEDIT-045 | Key forwarding to a text editor while the pointer tool is active. Connector tool: hover a path, press source, release on target, record doc. |
| EDT-SEL-010, 011; EDT-DND-011, 012; EDT-SYMBOL-008; UI-COLOR-026, 028; UI-SWATCH-004…007; UI-TOUCH-020 | Select by pattern. Blink selection (Highlighted flag sequence). Swatch drag (reorder, drag out to delete, MIME on dragstart). Touch DnD polyfill. Swatch import/export file bytes (gunzip plus normalized nodes). Touch "go to master". |
| EDT-TEXTEDIT-001…003, 023, 030 | Ctrl+B/I/U/D on a selected text and inside inline edit (doc). Font family drop (doc plus undo name "drop-font"). RTL and TTB text renders. |
| EDT-GUIDE-019, 020; EDT-VIEW-027, 033…035 | Symbol labels toggle shot plus setting. New view window count. Fullscreen request (record the requestFullscreen call). Enhanced tooltip toggle (tooltip DOM). |
| ENG-NODE-035 | CMYK JPEG import: record convert status and decoded pixels. |
| UI-SHELL-024, 025, 028, 032, 033; UI-TOOLBAR-015; UI-NOTIFY-002, 005; UI-IMAGE-001, 002; UI-DIALOG-006…009, 011, 012, 019, 020, 028, local part of 047 | Shell overlays and dialogs: loading overlay text, save-failed overlay, file drop with and without a document, PWA prompt rules (with a fixed clock), fonts download progress, page button menu, autosave toast, image-too-big, linked-image warning, one-time dialog, v1 and custom dialogs, offline dialog, memory warning (stub performance.memory). |
| UI-LIBRARY-008, 009; UI-INSPECT-011; UI-FIELD-009, 010, 019, 161, 173; UI-FONT-005, 007…009; UI-SETTING-020 | Library asset drag and click-insert (doc). Inspector API entry points. Touch align fields. Scrubbing gate setting. Imported font delete (replaced with Open Sans). Multi-file font import dedupe. Settings that have no defaults. |
| FMT-GVD-009…011, 013…015, 020; RUN-SAVE-007…009 | Load fixtures for: an uncompressed file, invalid JSON, an unknown `@` type, a dictionary-embedded image, a `file://` linked image (warning before save), a file under 200 bytes. Record the saved document JSON itself (not a boolean, see R2-024). |
| FMT-IMPORT-026; FMT-CLIP-011; FMT-STORAGE-016 | Local fonts API with a stubbed queryLocalFonts. Copy style. Tab overflow "more" dropdown with 12 tabs (shot plus DOM). |
| FMT-ELECTRON-001…010; ACT-MENU-010 | Electron suite, see R2-155. |
| RUN-I18N-005 | Server request with `lang=0/1`: record the language the server answers. |
| ADD-SHELL-001, ADD-MENU-001, ADD-IMPORT-001, ADD-SCENE-002, ADD-TOOLMGR-001, ADD-FIELD-001 | Each addendum item: resize debounce (relayout count after 3 resizes), menu close rules, ACV parse result JSON, page collision after resize (`off`), 1 px drag threshold, texture paste alert text. |

### R2-002 (medium): "named by a test" counts any mention

Location: scripts/inventory-check.ts:36-46.

The check counts an id that appears anywhere in any file under
parity/scenarios. That includes shared constant lists such as
RENDER_COVERS, which puts 33 ids on every corpus document
(corpus/corpus-scenarios.ts:55-89), ACT-MENU-002 on every exec scenario
(editor-actions/exec.spec.ts:445), and the roughly 20 ids on
nodes/class-registry. Only ADD-TOOL-001 is named solely in a comment
(engine-model/special-nodes.spec.ts). The 1896 figure overstates real
coverage. Many of the weak scenarios below are the only coverage of their
ids.

Fix:
- Count only ids inside a `covers` field.
- Report ids that are covered only through a list shared by more than 5
  scenarios.
- Require every scenario to name the output field that shows each covered
  id (for example `covers: { "EDT-X-001": "doc.fills" }`). Reviewers can
  then check it.

### R2-003 (high): `removedInNewApp` is used nowhere

Location: support/suite.ts:102-108 and platform/dropped.spec.ts:116-276.

No scenario sets `removedInNewApp`. dropped.spec.ts says "new app must NOT
match", but nothing enforces that. Once these scenarios are enabled, the
new app will be compared against the old license and subscription
responses. Mixed covers make it worse: startup-traffic also covers
FMT-SERVER-004 (a kept route) and FMT-AUTOSAVE-001. The autosave
expectations are the cloud "SAVE TO CLOUD" dialog (R2-063). None of the
(a1) items has a removal check.

Fix:
- Add `removedInNewApp` to each dropped scenario. It should assert:
  - each route returns 404;
  - the WebSocket upgrade is refused;
  - startup traffic is exactly `HEAD /connection/test`;
  - no menu item or DOM node of the feature exists.
- Move the kept ids out into kept scenarios.
- Add one removal scenario per (a1) group.

## 2. Weak scenarios

### Harness-wide

#### R2-010 (high): shared-page state leaks and depends on order

Location: support/suite.ts:46-56, 82-90, 179-185.

Scenarios without `open` or `driver` share one page. Between scenarios the
harness only calls newInfiniteDocument. Settings, the clipboard, global
swatches, the active tool and open documents carry over, and documents
pile up. Example: editor-actions/exec.spec.ts:405 (grid--snapping-off,
`restore:false`) leaves snapping off for every later scenario.

For the new app the list is filtered to the ported ids. That is a
different sequence from the one recorded, so inherited state differs.
This can cause false failures, and it can also hide a broken reset.

Fix:
- After each shared scenario, reset settings, the clipboard, the tool and
  documents to the state right after boot, and assert the reset worked.
- Or give each scenario a fresh context. That costs time, so do it at
  least for any scenario that writes settings.

#### R2-011 (medium): JSON.stringify drops -0 and undefined

Location: support/runner.ts:29, engine-geometry/lib.ts:50,
engine-model/helpers.ts:21-24.

compare.ts claims -0 and 0 differ, but every JSON output passes through
JSON.stringify first. -0 becomes 0 and undefined keys disappear, as
`custom` does in nodes/serialize-options. NaN and Infinity are encoded by
the engine helpers but not by other areas.

Fix:
- Encode -0, NaN, ±Infinity and undefined as tagged strings in
  storeOutput, before stringify.
- Throw on a raw NaN, because stringify turns it into null.

#### R2-012 (medium): parity:prove can't catch a weak output

Location: scripts/prove-failing.ts and support/suite.ts:33-44.

Sabotage appends a space or flips one pixel. That proves the comparison
runs. It doesn't prove the output depends on the feature, so every
"records nothing" case in this review passes prove.

Fix: add a mutation mode for the old app. For a list of inventory ids,
monkeypatch the named old function (from the `old:` line range) to return
a wrong value, and require the scenarios that cover the id to fail. Start
with the high findings below.

#### R2-013 (low): the harness exposes raw old internals

Location: support/old-harness.js:27-28.

`app.designer` and `app.require` give scenarios the raw old app.
`window.gDesigner` is used directly in:
- ui/welcome.spec.ts:25 and :253
- platform/files.spec.ts:53, :276, :320 and :354
- ui/dialogs.spec.ts:390
- platform/dropped.spec.ts:202
- import-export/node-lib.ts and page-lib.ts

The new app would have to fake these globals.

Fix: add `documents()` and `isReady()` to the shared contract, ban
`gDesigner` and `app.designer` in scenario code with a lint rule, and use
the DOM where it is enough.

### Engine (engine-geometry, engine-model)

#### R2-020 (high): text/render paints only half its content

Location: engine-model/text.spec.ts:472-503.

The 189×147 PNG paints only "Regular text" and "Underlined & struck". The
bullet list and "Red bold" leave the lower half blank, so list markers
(ENG-TEXT-009) and coloured or bold runs are never checked in pixels.

Fix:
- Find out why the regrouped texts don't paint (layout is invalidated
  after remove and append).
- Throw in the page when the bitmap has a blank band.
- Re-record.

#### R2-021 (high): WebGL blend modes and GL effects are never rendered

Location: engine-model/styles.spec.ts:371-459 and 511-539, nodes.spec.ts:224.

- effects-catalogue records only defaults, serialization and boxes. GL
  paintBBox records `<throws>`.
- blend-and-opacity echoes the `_sbl` and `_bl` it set.
- Only multiply and screen are ever rendered.
- The angular gradient (ENG-GRAD-004) is never rendered.

Fix: the render matrix from R2-001 (b), first row.

#### R2-022 (high): events/scene-and-page-events doesn't fire most of its events

Location: engine-model/events.spec.ts:161-213.

- `classes` only checks typeof.
- `pageInvalidation` is `[]`.
- ENG-EVENT-008, 009 and 013 are never fired with real payloads.

Fix:
- Listen on the scene for InvalidationRequest and InvalidationFinished, and
  record area, page and wasDirty.
- Trigger a texture update, a resolveUrl and a guides change, and record
  each event's fields.

#### R2-023 (medium): text/layout-cases leaves out markers, and smallCaps is a no-op

Location: engine-model/text.spec.ts:86-125, helpers.ts:140-161.

- The outline digest has no list markers.
- The smallCaps output equals the capitalize output, so the Unicode
  fallback branch is never reached.

Fix: add a PNG for each marker style, and add a smallCaps case with a font
that lacks `smcp`.

#### R2-024 (medium): bitmap/operations never checks DPI or encoded output

Location: engine-geometry/bitmap.spec.ts:117-122.

setDPI is followed only by toString. toImageBlob and toImageBuffer are
never called, so DPI, JPEG output and ENG-GEOM-013 go unchecked.

Fix: record the PNG and JPEG buffers at 72 and 144 DPI, or at least their
pHYs and JFIF density fields.

#### R2-025 (medium): engine covers claim behaviour that isn't exercised

- math/distances (math.spec.ts:176) and transform/line-constrain-rotation
  (transform.spec.ts:168) claim EDT-SNAP-013 but never call it.
- EDT-SNAP-014 is claimed with test-chosen angles. Nothing reads the
  app's 15° step or 4° tolerance.
- scene/clipping-render (scene.spec.ts:298) claims ENG-FILL-002 but has no
  mask.
- nodes/class-registry records only enums for about 20 behaviour ids.
- boolean/constants only echoes constants.

Fix: trim these covers, or add behaviour checks for them.

#### R2-026 (medium): pathops/flatten-element records only node names

Location: engine-geometry/pathops.spec.ts:556-567.

All leaves are "rectangle", so reordering and re-parenting can't be seen.

Fix: record each leaf's `trf` or bbox x.

#### R2-027 (medium): scene/master-pages records only ref counts

Location: engine-model/scene.spec.ts:171-204.

Which master is assigned isn't recorded, and `ompg` and `empg` are never
set.

Fix: record normalized ref ids, and add odd and even master cases.

#### R2-028 (medium): `_sdf` is dropped, so wrong default-style links pass

Location: migrations.spec.ts:101, scene.spec.ts:388, styles.spec.ts:597
(dropKeys) and helpers.ts stable().

`_sdf` links each node to its default style. With it dropped, a wrong
link passes. type-ids/classes calls typeIds(), which hands back the table.

Fix: keep `_sdf` everywhere. Replace type-ids/classes with checks on saved
files.

#### R2-029 (low): small engine gaps

- shapes/compound-path (shapes.spec.ts:436): setProperty trf is a no-op,
  so the compound transform path isn't exercised. Use transform().
- hittest/elements (hittest.spec.ts:133): `self` is a boolean. Record the
  element name or index.
- util/helpers: uuid is checked by length only. Seed Math.random and
  record the exact ids.
- nodes/serialize-options: only key lists are recorded.

#### R2-030 (medium): text/font-events depends on what loaded before it

Location: engine-model/text.spec.ts:434.

`pendingRightAway` depends on which fonts earlier shared-page scenarios
loaded.

Fix: give it its own page (an `open` option), and drop `pendingRightAway`.

### Corpus and import-export

How exports are stored is sound:
- PNG, JPEG and PDF are bytes, plus a decoded PNG. pHYs and JFIF density
  are therefore compared.
- SVG is normalized text.
- ZIP is an entry list with sha256.

#### R2-040 (high): text-layout and text-lists renders are 48×48 slivers

Location: corpus/corpus-scenarios.ts:262-270 (zoomAndMeasure).

The crop is built from the page geometry box, which is about zero for
these documents. The four zoom crops show almost nothing, in both themes.

Fix:
- Crop to the union of the children's paint boxes.
- Throw when the crop is under 100×100.

#### R2-041 (high): id renaming hides a new app that regenerates ids on load

Location: corpus/corpus-scenarios.ts:139-198 (stabilizeIds) and
support/normalize.ts:139-216.

Every `@id`, `#` and `&` is renamed in order of first appearance,
including ids that come straight from the loaded file. A new app that
regenerates every id on open or resave passes the document, resave and
render scenarios. That breaks references from outside the file, such as
clipboard and symbols across documents.

Fix:
- Keep ids that occur in the source file unchanged, and rename only new
  ids.
- Assert the id format (length and alphabet) before renaming.

#### R2-042 (high): Sketch and AI importers are never reached

Location: import-export/import.spec.ts:51-53 and 75-76.

Every recorded state for the Sketch and .ai fixtures is "This file format
isn't supported". GSketchImport, the version check and isAIFormat never
run, yet FMT-IMPORT-011 and 015 are claimed.

Fix: reach the importers through the path that accepts them, or mark the
items unreachable and drop them from covers.

#### R2-043 (high): the ZIP-worker scenario exports no ZIP

Location: import-export/fonts-workers.spec.ts:253-261.

The zipExport step only calls newInfiniteDocument, and the expected `[]`
is trivially true. FMT-WORKER-015 is therefore not exercised. FMT-WORKER-012
and FMT-EXPORT-021 rest only on the PDF bytes.

Fix: do a real multi-item ZIP export inside `workersDuring`, and record
the worker scripts that get spawned. Pin `hardwareConcurrency`.

#### R2-044 (medium): resave records only the start of the file

Location: corpus/corpus-scenarios.ts:349-381.

The recorded output is:
- the gzip magic and the first 12 characters;
- the preview mime and size;
- whether the save equals the serialize output.

The pako level, store errors, the plain-JSON fallback and unknown-type
handling are not checked. FMT-GVD-001, 002, 003 and 006 are claimed by
every document.

Fix: record the gunzipped, normalized JSON and the deflate level (from
the header bytes), and add the fixtures listed in R2-001 (b).

#### R2-045 (medium): the PDF date normalizer accepts any value

Location: import-export/pdf-normalize.ts:17-24.

The whole `CreationDate` and `ModDate` value is replaced, suffix included,
so a wrong format or a constant date passes. `lmd` in support/normalize.ts
TIME_KEYS has the same problem.

Fix: replace only the 14 digits, assert they fall between the run's start
and end, and do the same check for `lmd`.

#### R2-046 (medium): 44 of 50 dark renders equal the light ones

Location: corpus/render-dark.spec.ts.

The crops stay inside the content, so the theme never shows.

Fix: include the page edge, the canvas background and the rulers in one
crop per document.

#### R2-047 (medium): RENDER_COVERS claims behaviour the shots bypass

Location: corpus/corpus-scenarios.ts:55-89 and 283-285.

Every shot runs cleanCache and a full invalidate first. That bypasses the
partial repaint, pan reuse and low-res cache (EDT-RENDER-034, 038, 044,
045, 046). Fast and Output modes, zoom clamps, config constants, widget
layers and recorder internals are never exercised, yet all are claimed on
every document.

Fix: remove these ids from RENDER_COVERS, or add pan and partial-repaint
scenarios that compare against a full repaint.

#### R2-048 (medium): ui/print records only PDF structure

Location: import-export/export-ui.spec.ts:760-788.

Only pdf.js operator counts, text and boxes are recorded.

Fix: fix the text-layout race, then record the bytes or a render.

#### R2-049 (low): import-export covers claim calls that never happen

- ENG-GEOM-013 and EDT-PAINT-049 (crop, resize, trim, setDPI) are claimed
  but never called.
- EDT-RENDER-014 claims arguments that are unused.
- FMT-IMPORT-028 claims selects that the dialog doesn't show.
- fonts/import-ttf can't tell "rejected" from "not attempted".

#### R2-050 (low): drop and paste states round bboxes

Location: import-export/page-lib.ts:342.

sceneState rounds bboxes to 1e-3. The drop scenarios have no document
output to back them up.

Fix: record the bboxes exactly.

#### R2-051 (low): SVG editing data is compared after inflating

normalizeSvg inflates gravitGraphicSource before comparing, so the deflate
level is not compared.

### Editor tools

#### R2-060 (high): view/toggle-fill-and-border-visibility records keys that did nothing

Location: editor-tools/cases-view.ts, around line 400.

F and Shift+B had no effect in the recording. Focus was likely in an
input, where the action is disabled (../public/designer.browser.dev.js:157698).
A correct new app fails this scenario and a broken one passes.

Fix:
- Record `document.activeElement` in the probe.
- Focus the canvas before pressing.
- Assert `_vs:false` in the document.
- Audit the other single-key shortcuts for the same problem.

#### R2-061 (high): no overlay shot shows a guide or distance line

Location: editor-tools/cases-pointer.ts and cases-snap.ts; the shot step
in steps.ts.

These shots show only the hover or preview outline:
- pointer/alt-distance-guides-overlay
- pointer/alt-distance-nudge-overlay
- snap/smart-guide-overlay
- snap/equal-spacing-overlay

None shows a snap line or a distance label. EDT-GUIDE-005, 008, 021 and
022, EDT-TOOL-022 and EDT-EDITOR-008 are unverified.

Fix:
- Take the shot without the forced full repaint, or record the guide
  visuals list.
- Pick geometry where a long line must be drawn.

#### R2-062 (high): two tool scenarios record the feature not working

- pointer/meta-drag-into-image-mask (cases-pointer.ts:304): the ellipse
  never enters the image. Fix the modifier and the drop point, and assert
  the ellipse is a child of the image.
- freehand/digit-opacity (cases-path.ts:1158): the digit is pressed before
  the path exists, so `_bop` never appears. Press it right after the
  stroke.

#### R2-063 (medium): inline hints are never recorded mid-drag

Location: steps.ts readHint.

Only 12 of 422 probes have a hint, and all mid-drag hints are null,
although the old code calls updateInlineHint (../public/chunk.vendor.js:46196,
60497, 60210). EDT-TOOLMGR-012 is claimed by 56 cases.

Fix: debug readHint, and record the hint text plus its left and top.

#### R2-064 (medium): probes in PNG cases are silently dropped

Location: steps.ts shot step and case.ts toScenario.

The probes in subselect/ellipse-arc-handle, touch/long-press-context-menu
and view/show-grid are lost.

Fix: throw on a probe in a PNG case, or write the probes to a sidecar
JSON.

#### R2-065 (medium): several view and snap scenarios show no effect

- snap/bbox-guide-toggled-off (cases-snap.ts:126) gives the same result as
  smart-guide-edge.
- view/fit-selection-and-layer: there is no layer, so fitting the layer
  equals fitting the selection.
- view/show-grid-document: the on and off probes are identical.
- extra/initial-view-on-open: the page is empty and infinite, so centring
  can't show.

Fix: change each fixture so that only the feature can produce the
recorded result.

#### R2-066 (medium): freehand/continue-within-500ms can't tell continue from a new stroke

The second press lands on the last release point, so continuing and a
fresh stroke look the same. The 500 ms window is also measured against
real time.

Fix: press about 10 px away, and use page.clock.

#### R2-067 (medium): editor-tools covers claim things the output can't show

- pointer/alt-drag-duplicates claims EDT-CURSOR-003, but the recorded
  cursor is g-cursor-select.
- annotations/mode-and-blocked-shortcuts "q-ignored" proves nothing.
- EDT-SEL-002 and 007, EDT-TOOLMGR-004 and 013, EDT-VIEW-037 and
  EDT-XFORM-007 are claimed where no output can show them.

Fix: trim these covers, or add probes that show them.

#### R2-068 (medium): Pen and Connector can't be told apart

Location: support/old-harness.js:52-68.

toString gives "GPenTool" for both, and "GFillTool" appears twice.
activateTool takes the first match. A new app with Pen registered twice
passes toolmgr/registry.

Fix: record the tool index and the constructor or type id, and throw when
activateTool returns false.

#### R2-069 (medium): document() drops the scene's styles child

Location: editor-tools/steps.ts.

Changes to default styles made by tools go unseen.

Fix: keep the styles child.

#### R2-070 (low): rounding, renaming and missing mid-drag shape

- state() rounds the preview box, trf, scroll and zoom to 1e-6
  (editor-tools/old-hooks.js).
- normalizeIds renames any 32-character alphanumeric string, and any
  `time` or `mtime` anywhere.
- The mid-drag preview records only the bbox, so the curve shape during a
  drag isn't checked.

### Editor actions

#### R2-080 (high): selection is recorded as `type:name` only

Location: editor-actions/lib.ts:533-538.

After a duplicate or paste, "original selected" and "copy selected" record
the same. This hits EDT-DUP-001, EDT-CLIP-010, 016, 018 and 019, and
EDT-UNDO-006.

Fix: record each selected node's `@id` (it gets renamed stably) or its
child-index path.

#### R2-081 (high): exec/modify.crop is identical to its before state

Location: editor-actions/exec.spec.ts:271.

The action could be a no-op and the output would not change.

Fix: record the crop or edit mode and the active tool in capture().

#### R2-082 (high): the help.shortcuts table is never recorded

Location: editor-actions/dialogs.spec.ts:146, with visibleDialogs at line 31.

`fullText: ".g-shortcuts-dialog"` never matches the container, so only the
title is stored. ACT-KEY-037 is unchecked.

Fix: use `.g-shortcuts-dialog-container`, and re-record.

#### R2-083 (high): the system clipboard payload is never recorded

Location: editor-actions/lib.ts:645-649.

Only the internal clipboard is read. The `<gravit mimeType=…>` text/xml
wrapper and the text/plain copy are unchecked, and paste never has to
come from the system clipboard.

Fix:
- Record clipboardData types and data in a `copy` and `cut` listener.
- Clear the internal clipboard between Ctrl+C and Ctrl+V.

#### R2-084 (high): eyedropper-border records the "nothing happens" path

Location: editor-actions/layers.spec.ts:158-174.

A has no border, so the eyedropper never opens.

Fix: give A a border, and record whether the eyedropper overlay is shown.

#### R2-085 (medium): some toggles are visible only through the hook's value

- view.canvas.show-selection-handles and help.tooltip-visibility are seen
  only through actionInfo's `checked`.
- actionInfo (old-hooks.js:66-88) lacks category, group, icon, info and
  pro (ACT-KEY-024).

Fix:
- Record the editor HideEditor flag or a shot, and the tooltip setting.
- Add the missing fields to actionInfo.

#### R2-086 (medium): some setups make the action a no-op

- joint-type straight: the anchors are already straight.
- opacity shift-0: the rects are already at 100%.
- select-all--pages: A is already selected.
- play-mode-arrow-down.png shows a blank page, so going to any empty page
  looks the same.
- zoom-in-plus leaves the zoom at 1.
- multi-page-f6 toggles twice and ends where it started.

Fix: start each from a state the action changes, and give each play-mode
page distinct content.

#### R2-087 (medium): undo/in-text-input passes on the browser's own undo

Location: editor-actions/undo.spec.ts:206-226.

Chromium's native undo restores the input whether or not the app's code
runs.

Fix: also undo through the menu while the input is focused, and record the
value.

#### R2-088 (medium): debug export and copy exclusion are tested only as "off"

Location: editor-actions/extras.spec.ts, debug-export-off-and-copy-options.

A stub that returns null passes.

Fix: turn both on and record their output.

#### R2-089 (medium): the mac key mapping is never recorded

Location: editor-actions/keys.ts.

The mac half of ACT-KEY-027 is unchecked, and unavailable actions'
shortcuts (Ctrl+Alt+O, Ctrl+Q; ACT-KEY-025) are never pressed.

Fix: add a mac userAgent variant and negative key checks.

#### R2-090 (medium): edit.edit--text doesn't record inline editing

`isInlineEditing` isn't captured (ACT-EDIT-013).

Fix: add it to capture().

#### R2-091 (low): editor-actions details

- `returned` is always true.
- ACT-MENU-002 is padding on every exec scenario.
- Dialogs keep only their first line, and events are sorted.
- symbols/labels-on.png lacks the instance.
- clone-selection-with-offset doesn't record the transform box.

### UI, platform and smoke

#### R2-100 (high): ui/storage/after-startup is not deterministic

Location: ui/misc.spec.ts:23 and expected/ui/storage/after-startup.json:50,52.

`last_seen` and `last_update` hold the old server's start time, so the
scenario fails after any server restart. It also records license keys as
expected output.

Fix: normalize those keys, and drop the license keys.

#### R2-101 (high): notify/message records an empty notification

Location: ui/dialogs.spec.ts:279-291 and ui/old-hooks.js:11.

The message text is in neither the PNG nor the DOM.

Fix: call the old API with the payload shape the app uses, and assert the
text is in the DOM.

#### R2-102 (high): inspector field writes are only screenshotted

Location: ui/inspector.spec.ts:19-52.

UI-FIELD-004, 006, 007, 008, 020, 021 and 058…060 are never written
through the field.

Fix: one behaviour per field: type or click, then record the node
property.

#### R2-103 (high): context/crop records the page-row menu

Location: ui/contextmenu.spec.ts:160-170.

The right-click at (60,140) hits the Pages list, and crop.dom.json equals
page-row.dom.json.

Fix: right-click the image on the canvas, and assert "Confirm Cropping" is
in the menu.

#### R2-104 (high): color/pick-applies-fill records the class name, not the colour

Location: ui/color.spec.ts:257-279.

The expected output is `"[Object GRGBColor]"`: `_pt.toString()` returns
the class name. Any colour, even the wrong swatch, passes. This is the
only coverage of UI-COLOR-023 and 020.

Fix: record the serialized paint (GPattern.serialize or `asString`) and
the swatch index.

#### R2-105 (high): export/rows-stored records null

Location: ui/panels.spec.ts:394-408 and expected/ui/export/rows-stored.json.

Three clicks on "+" leave `__export` null on the selection. Either the
clicks don't add rows or the property is read from the wrong node. The
defaults in UI-FIELD-049 (1x, 2x, 3x, then 1.5x and 0.5x names) and
UI-STORAGE-015 are unverified.

Fix:
- Read the property the panel writes, from the right node.
- Assert three rows exist in the DOM.
- Re-record, and check the JSON lists three entries.

#### R2-106 (medium): export/size-presets DOM is empty

Location: ui/panels.spec.ts:273-285 and expected/ui/export/size-presets.dom.json.

The DOM dump is `[]`: neither `.g-overlay` nor a submenu is open after the
click. UI-FIELD-050 and 162 rest on a PNG that likely shows no preset
list.

Fix: open the size dropdown it needs, assert the selector matches, and
re-record.

#### R2-107 (medium): saved files are never compared

Location: platform/files.spec.ts:97-108 and 167-182.

fsa-save and download-fallback record only the first bytes, top-level keys
and the preview prefix.

Fix: gunzip, normalize and record the document. Run gvthumb on the
FSA-saved bytes too.

#### R2-108 (medium): migration checks partly can't fail

Location: platform/storage.spec.ts:592-646.

- The flags are read back raw from localStorage.
- Settings come back through the `setting()` hook.
- The rulers selector doesn't match `.g-ruler-widget`.
- The seed data is hand-written.
- Fonts rely on the resolveFont hook.

Fix:
- Assert visible effects with a PNG after seeding.
- Seed a snapshot captured from a real old session.
- Render a text node in the imported font.

#### R2-109 (medium): autosave expectations are the dropped cloud flow

Location: platform/autosave.spec.ts:64-80.

Fix: add removedInNewApp for the cloud flow, and a scenario for local
autosave recovery.

#### R2-110 (medium): two touch scenarios are no-ops, and long-press may be Chromium's

- touch/assistant-collapsed (ui/touch.spec.ts:129-143) equals the window
  shot.
- touch/virtual-shift (ui/touch.spec.ts:177-191) shows the same class
  before and after.
- The long-press menu (ui/extras.spec.ts:121-137) may be Chromium's own
  contextmenu gesture.

Fix: click the real toggles, record the key events, and add a short-press
negative check.

#### R2-111 (medium): FREEZE_CSS hides every scrollbar

Location: ui/lib.ts:17-20.

The 110 scrollbar rules per theme are never compared.

Fix: add one scenario with scrollbars visible.

#### R2-112 (low): ui details

- The DOM dump drops `style`, `aria-*`, `contenteditable` and ids with
  digits (ui/lib.ts:251-287).
- pages/rename.dom.json equals layers/empty.dom.json.
- sidebar-resize-hover equals the window shot.
- theme/switch-to-dark has no labels or guides.
- pwaKeys replaces any epoch with a placeholder, and the time is floored
  (pwa.spec.ts:60-67, 153).
- Downloads record only the filename.
- clipOf clamps to the viewport (ui/lib.ts:194-199).
- welcome/escape-keeps-dialog doesn't record that the dialog was open
  before Escape, and its name contradicts the recorded `open: 0`.

## 3. Normalizers and exact comparison

compare.ts is exact: JSON uses Object.is with key order, PNG compares raw
RGBA with zero tolerance, and bytes use equals. The search for tolerance,
threshold, approx, toFixed and Math.round found no tolerance in any
comparison.

Rounding applied before recording:
- page-lib.ts:342: 1e-3 (R2-050)
- editor-tools old-hooks `round`: 1e-6 (R2-070)
- steps.ts clip Math.round: harmless, it only sizes the clip
- pwa.spec.ts:153: 5 s floor (R2-112)

The old app doesn't round these values, so all of them are weaknesses,
though small ones.

### R2-120 (medium): nested JSON strings are re-serialized

Location: support/normalize.ts:195-205, engine-model/helpers.ts:92-96,
editor-actions/lib.ts:556-596, corpus stabilizeIds:181.

Any string that parses as JSON is written back through JSON.stringify,
even when no id changed. Spacing, number spelling, escapes and duplicate
keys inside text content, compound paths and pattern strings are file
format, but they vanish.

Fix: replace ids textually in the original string, or keep it when
nothing was renamed.

### R2-121 (medium): engine-model clean() hides values and references

Location: engine-model/helpers.ts:83 and 106.

Any non-null value under `sref`, `__ids`, `_uid`, `aid`, `pgid`, `#` or
`&` becomes `"<id>"`, whatever its type. That hides two things:
- sref defaults: old is null (../public/chunk.vendor.js:117519), yet every
  element shows `"<id>"`, so the encoding is masked.
- which node a reference points to, because every reference collapses to
  the same placeholder.

Fix: rename only id-shaped strings, to `id1`, `id2` and so on, and map
`__ids` item by item.

### R2-122 (low): the 32-character id regexes rename anything that long

Location: editor-actions lib.ts RID and editor-tools steps.ts normalizeIds.

Both rename any 32-character alphanumeric string, wherever it appears. No
false hits exist today, but nothing keeps it that way.

Fix: limit renaming to known id keys.

## 4. Contracts and hooks

| Area | Hooks | Risk |
|---|---|---|
| support/old-harness.js | serialize, deserialize, actionIds, canExecute, execute, toolNames, activateTool, activeTool, selection, setting, setSetting, typeIds, designer, require | typeIds returns the type-id table itself (R2-028). designer and require expose internals (R2-013). setting and setSetting let migration tests bypass behaviour (R2-108). |
| engine-geometry | fitCurve, vertexFitter (module 380), pixelAligner (141), redistribute (187 `.containers`), intersectPaths (187 internals plus opaque `raw`) | **R2-130 (medium).** A hook can be implemented standalone while the freehand tool, knife tool and selection outline use other code. Fix: add a tool-level scenario per hook (freehand stroke to anchors, knife cut, outline pixels). |
| engine-model | uses scene, editor and typeIds | see the old-harness row |
| corpus | settle, waitForDocument, assetsReady, fontsReady, viewIdle | Waiting only. A new app that returns early causes flakiness, not a fake pass. |
| editor-tools | prepareView, worldToView, state, document, fontsReady, repaint, toolTable, setEditorOptions, freezeCaret | **R2-131 (medium).** setEditorOptions writes GEditorOptions directly and skips the app setting (EDT-TOOLMGR-031). Fix: set the setting through the UI. toolTable is static data. state() forces the new app to copy old internals (preview clone, part ids). |
| editor-actions | actionInfo, clipboardTypes, clipboardGet, clipboardSet, clipboardClear, documents, windows, editorOption, closeOtherDocuments, sidebars, setSidebars, selectAnchorPoints, setImageCropMode | **R2-132 (medium).** actionInfo is the only evidence for some checked and enabled states (R2-085); cross-check it against the menu DOM. clipboard* read the internal map only (R2-083). editorOption can be stubbed. setImageCropMode is the claimed feature itself in modify.crop. |
| import-export | settle, exportExportable, generateExportables, generateExportName, convertSizeToScale, bitmapPaintArea, maximumCanvasSize, svgUnsupportedFeatures, pdfIsSupported, importerNames, exporterNames, fileTypes, openFileTypes, pdfWorkerSrc | **R2-133 (high).** The registry hooks (importerNames, exporterNames, fileTypes, openFileTypes, pdfWorkerSrc) return self-descriptions the new app can hard-code. They are the only coverage of FMT-IMPORT-001, FMT-IMPORT-002 and FMT-EXPORT-001. The helper hooks call old statics, so export-engine bypasses the dialog. Fix: derive these facts from the file input's accept list, the Save As menu and observed worker URLs. Keep one dialog-path byte case per format. |
| platform | resolveFont | Reaches into the font manager; the new app can fake it (R2-108). |
| ui | notify | Broken, and reaches into old internals (R2-101). |

## 5. Determinism

PARITY_CONTEXT pins locale en-US, timezone UTC and scale factor 1, and
playwright.config adds `--font-render-hinting=none` and
`--disable-gpu-rasterization`.

### R2-140 (medium): host OS, user agent, fonts and colour scheme aren't pinned

Location: support/apps.ts:292-296.

- body-and-title records `g-os-windows`.
- Key scenarios record Windows (operatingSystem 1).
- UI CSS uses local("Roboto Medium") with Helvetica, Arial and monospace
  fallbacks.
- prefers-color-scheme is not pinned.

Recording on another machine fails loudly, but a new app tested on Linux
CI can't match.

Fix:
- Pin userAgent and platform, and colorScheme "light".
- Serve the UI fonts from the app instead of local().
- Or record on one fixed machine image and say so in the README.

### R2-141 (medium): WebGL and canvas paths are not pinned

Location: playwright.config.ts launch args.

`--disable-gpu-rasterization` doesn't disable accelerated 2D canvas, and
WebGL may use the GPU or SwiftShader depending on the host. Effects and
blend renders (R2-021) then depend on the GPU driver.

Fix: launch with `--use-angle=swiftshader --use-gl=angle
--disable-accelerated-2d-canvas`, and record the WebGL renderer string in
a smoke scenario so a change is noticed.

### R2-142 (medium): fixed waits stand in for events

- import-export importFont always returns true after 200 ms, then sleeps
  1500 ms (fonts-workers.spec.ts:70-83).
- clickMenu waits 250, 400 or 300 ms.
- dropFiles waits 3 s.
- paste-events calls waitImages after it has already recorded
  (editor-actions/clipboard.spec.ts:333-337).
- view/zoom-render-after-wheel waits 900 ms, so the 750 ms quick-render
  phase is never observed.
- corpus-export settle doesn't wait for texture patterns.
- The 500 ms freehand window runs on real time.

All of these break under load, and a re-record runs in parallel.

Fix: wait on app events or a hook-free DOM state, and use page.clock for
time windows.

### R2-143 (low): the clock and randomness are free-running

Date.now and Math.random are not controlled anywhere. Ids and times are
normalized, but uuid checks are weak (R2-029). Autosave and PWA timing
depend on wall time.

Fix: install page.clock and a seeded Math.random in the init script, for
both apps.

### R2-144 (low): headed runs use the OS clipboard

The clipboard is per browser only in headless runs. In headed or debug
runs the OS clipboard is used, and other processes can interfere.

Fix: document the limitation, or stub navigator.clipboard.

## 6. Missing areas

### R2-150 (high): nothing checks that new files open in the old app

No harness path opens a file written by the new app (.gvdesign, SVG with
editing data, clipboard XML, swatches) in the old app. Only PDFs go
through the old pdf.js. Because the normalizers accept any id format and
any deflate level, an incompatible new file would not be noticed.

Fix: add a cross-app scenario kind:
1. Run the save in the app under test.
2. Open the bytes in an old-app page.
3. Compare the old app's serialize output and render against the expected
   ones.

Run it for every corpus document and every clipboard format.

### R2-151 (medium): gvthumb is checked on one sample file only

Location: platform/gvthumb.spec.ts.

The DLL runs on a file the app downloads, so it will cover new-app files.
But it uses one sample drawing, through Download File only.

Fix: run it on every corpus resave and on the FSA-saved bytes, and record
the thumbnail pixels.

### R2-152 (high): no user-data migration test for Electron, autosave or recent files

- Browser localStorage and gravitFontsDB seeding exists but is weak
  (R2-108).
- No Electron scenario exists at all.
- Nothing tests autosave or recent-files storage migration.

Fix: seed old-format IndexedDB and localStorage from a captured old
profile, then check that settings, swatches, fonts, autosave recovery and
recent files show up.

### R2-155 (high): no Electron suite

No scenario names FMT-ELECTRON-* or port 47823. Nothing checks that the
new desktop build:
- serves from http://127.0.0.1:47823;
- keeps the single-instance lock;
- handles EADDRINUSE;
- has the window size, no native menu, and the lifecycle.

Fix: a Playwright `_electron` suite. Launch it with a userData folder
copied from the old app, and record `location.origin`, the settings read
back, the window bounds and the menu.

### R2-153 (medium): no canvas renders at other zoom levels in the UI suites

Corpus renders 25%, 33%, 100% and 400% in both themes, but the crops hide
the theme (R2-046) and miss content for the text documents (R2-040). The
ui area records only the zoom caption at 100%.

Fix: one full-window shot per theme at 25% and 400% with a mixed
document, including rulers, page edge and canvas background.

### R2-154 (low): SVGZ export has no recording

Every export format has a recorded output except SVGZ (FMT-EXPORT-041).
The bundle has no Save As action for it, so it is likely unreachable.

Fix: confirm that, and mark it unreachable in the inventory or add a case.

## Scenarios sampled

- **Engine (46).**
  - ok: boolean merge-tool and live-compound-shape; pathops fitter,
    knife-intersections, redistribute and offsetter; vertex
    info-bounds-length, path-util and clockwise; hittest path-hittest;
    bitmap image-tracer; math scalar; util helpers; model extras
    border-scaling; scene links-and-references and constraints; symbols
    render and serialize-restore; nodes container-api; styles
    render-fills-borders and render-effects; colors render-gradients;
    type-ids default-style-targets.
  - weak: boolean/constants, flatten-element, pixel-aligner (EDT-SNAP-015),
    bitmap/operations, math/distances, line-constrain-rotation,
    rotation-transform, editor-constrain (EDT-SNAP-014), compound-path,
    hittest/elements, scene-and-page-events, font-events, master-pages,
    clipping-render, class-registry, defaults-constructed,
    serialize-options, blend-and-opacity, effects-catalogue,
    paint-layer-operations, layout-cases, text/render, type-ids/classes,
    special/connector.
- **Corpus and import-export (30).**
  - ok: symbols/document, images/preview, fills-textures/bitmap, export png
    page-300dpi, jpg page-q25, svg preserve-editing, pdf page-72dpi and
    multipage, meta size-specs, unknown-format and clamp-to-max, ui
    quick-export-menu and dialog-assets-zip, svg-shapes open,
    svg-roundtrip-preserved, corpus/symbols export, clipboard/copy-payload,
    drop/raster-alpha.png, eps/outline-fonts-off.
  - weak: symbols/resave, text-layout render-light, text-lists render-dark,
    shapes-rectangles render-dark, meta/registries, ui/print, both Sketch
    states, the .ai state, pdf-missing-fonts-dialog,
    workers/started-by-paths, fonts/import-ttf.
- **Editor-tools (50).** Listed in the area report: about 30 ok, and the
  weak ones are cited in R2-060…070.
- **Editor-actions (55).** About 33 ok; the weak ones are cited in
  R2-080…091.
- **UI, platform and smoke (45).** About 27 ok; the weak ones are cited in
  R2-100…112, R2-155 and R2-107…109.
