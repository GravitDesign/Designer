# Bug-fix pass plan

Prepared 2026-10-24 for the decision in PROGRESS.md ("Decisions by the user
(2026-10-24)"): every clear old bug gets its own `fix:` commit with a
BUGS-FIXED.md entry, a test for the correct behaviour (that fails with the old
code), and a parity exception (parity/exceptions/BUG-NNN.json plus `.fixed`
files for every enabled scenario that records the old behaviour). Odd but
harmless quirks stay and keep their QUESTIONS.md entry.

How to read an entry:

- Old: the old bundle and lines. "dev.js" is public/designer.browser.dev.js,
  "vendor" is public/chunk.vendor.js.
- Port: where next/ keeps the old behaviour, and the test that pins it. That
  test has to be turned around by the fix.
- Category: crash, data loss, wrong output or broken UI (a hang counts as
  broken UI).
- Parity: scenarios whose recording shows the old behaviour. "(enabled)" means
  the id is in parity/ported/*.json and needs a `.fixed` file in the fix
  commit; "(not enabled)" goes into the exception's `pending` list.
- Size: small (local change plus test), medium (several places or a parity
  re-record), large (algorithm work).

BF numbers are plan ids only. Each fix takes the next free BUG-NNN when it is
committed (BUG-009 onwards).

Several files named below hold uncommitted work of another session at the time
of writing (src/app/sidebars/*, src/app/color/pattern-type-menu.ts,
src/app/export/export-dialog.ts, src/app/fonts/*, parity/ported/platform.json,
parity/ported/app-library-symbols-export.json). Line numbers there may move.

## Engine

### BF-001 A painting error leaves the render phase on and the view stops repainting
- Source: Q-016, Q-017
- Old: vendor module 663 _paintAndRenderInternal 93530-93568 (scene.paint outside the try); module 103 tryRunRendering 25480-25489 (job only removed at ~26022)
- Port: src/engine/paint/tile-renderer.ts:325-337, render-scheduler.ts:114-128; pinned by tile-cache.test.ts "lets other errors of the painting code escape with the render phase on", render-scheduler.test.ts "ends the render phase on a canvas error in tryRunRendering, as the old replay did" and "keeps the render phase on when the painting code itself throws"
- Category: broken UI (hang). One exception in any element's paint leaves the phase on; afterwards every repaint only logs "render phase render, waiting" and thumbnails queue forever.
- Fix: finish the canvas and the scheduler in a finally, treat a paint error like a canvas error (log, clean up, callback(null, true, false), next request); tryRunRendering restores its parameters and leaves no job behind.
- Parity: none
- Size: small to medium

### BF-002 setText leaves the text core's change events locked while a font is missing
- Source: Q-034
- Old: vendor module 70 GText.setText 16684-16690 (early return after lockChangeEvents(1))
- Port: src/engine/text/text.ts:800-805 (lock at 772); pinned by text.test.ts "keeps the old slips (events left locked, raw trf array throws)"
- Category: data loss (likely). File restore calls setText(ct, true, true); while locked, inline edits never reach `content`, so a save writes stale text. Not reproduced in the app yet.
- Fix: unlock before the early return (or in a finally) when lockEvents is set.
- Parity: none
- Size: small

### BF-003 A mask in a plain group erases everything painted before it
- Source: PROGRESS (corpus/masks)
- Old: vendor module 911 GElement.Stylable 117504-118211 (separate-canvas choice at 117590); module 122 GGroup._paintStyleContent 28134
- Port: src/engine/style/element-stylable.ts:166 and 205-222, src/engine/scene/group.ts:204-256; no unit test
- Category: wrong output. A group with opacity 1, normal blend and no effect composites the `_sbl` m / !m child onto the shared layer canvas, wiping the page background. Reachable through the inspector blend select ("Mask", "Inverse mask").
- Fix: a group (check layers too) with a masking child paints into its own sub-canvas through the _paintStyleSeparate path.
- Parity: corpus/masks/render-light, render-dark, document, resave, preview, bitmap; io-export-bitmap/corpus/masks, io-export-pdf/corpus/masks, io-export-svg/corpus/masks; platform/gvthumb/corpus/masks (all enabled; the pixel ones need `.fixed`)
- Size: medium

### BF-004 Offset drops inset parts of an open path that come near the source
- Source: Q-025
- Old: vendor module 651 generatePolyOffset 87884-87903 (`B < w.count` on an array)
- Port: src/engine/geometry/vertex-offsetter.ts:1095-1110; pinned by vertex-offsetter.test.ts "drops inset-only parts of an open path that touch the source (old quirk)" and the insetDropped cases of vertex-offsetter.old-outputs.test.ts
- Category: wrong output. Reachable from negative Expand/Shrink, Vectorize Border with an inside border and inside text on a path; in the pinned case the result is empty.
- Fix: loop over sourceHits.length and clip the part with _excludeCircleInside like the outset branch.
- Parity: none
- Size: small

### BF-005 Offset tangent point uses dx for y
- Source: Q-027
- Old: vendor module 651 _getSegmToArcSqrDist 89212-89213
- Port: vertex-offsetter.ts:2440; pinned by vertex-offsetter.test.ts "uses dx for y in the tangent point of the segment-to-arc distance (old quirk)" and the helper cases
- Category: wrong output (rare: a line exactly tangent to an arc's circle keeps a part it should drop)
- Fix: `touchY = params[0] * dy + p1.getY()`
- Parity: none
- Size: small (can share BF-004's commit only if the user agrees; otherwise its own)

### BF-006 Boolean intersections: one collinear pair drops every later hit, quadratic-vs-curve hits unlimited
- Source: Q-020, Q-021
- Old: vendor module 187 _treeIntersect 38653-38662 (`splice(P)`) and 38669 (`I.cp2 ? 6 : 4`)
- Port: src/engine/geometry/boolean/poly-segments.ts:1050 and 1058-1065; pinned by fixture-cases.test.ts "matches the seeded differential fuzz, seed 11", the collinear.* cases and "block.quadCubicNear"
- Category: wrong output. Compound shapes and the merge tool use this branch; coincident edges (a circle and its copy) lose unrelated intersections and clip wrongly.
- Fix: `found.splice(foundIndex, 1)`; the limits become `count < 6` / `count < 4`.
- Parity: none (unit fixtures need `.fixed` variants)
- Size: medium

### BF-007 Fonts whose weight is only in the typographic subfamily get weight 400
- Source: PROGRESS
- Old: vendor module 726 getOpenTypeInfo 100134-100180 (weight and style from name id 2 only)
- Port: src/engine/text/fonts/open-type-util.ts:738-780; pinned by open-type-font.test.ts "reports weight 400 for OpenSans SemiBoldItalic (subfamily only)"
- Category: wrong output. Open Sans Light, SemiBold Italic and ExtraBold show up as Regular/Italic duplicates in local and imported fonts, and weight matching fails.
- Fix: read OS/2 usWeightClass (or name id 17 when present). Expected 300, 600 italic, 800. If STAT wght is used instead, also fix the kept off-by-one in the STAT axis tags (open-type-util.ts:927-929).
- Parity: engine-model/extras/opentype-helpers (enabled)
- Size: small (medium with OS/2)

### BF-008 Restored ready shapes skip their base constructors
- Source: PROGRESS
- Old: vendor module 530 GSimpleShape constructor 75048-75078 (base constructors only inside `if (e)`), restore 75195-75210
- Port: src/engine/scene/simple-shape.ts:59-69; pinned by simple-shape.test.ts "without a processor starts empty, like the old constructor that ran no base constructor"
- Category: wrong output, likely crash. Every load, duplicate, paste and undo of a ready shape loses `_paintSharp` (no pixel snapping) and `$refs` (SceneNode._referenceEvent calls `$refs.concat` when the shape is linked to a shared style; not run).
- Fix: the constructor without a processor runs the normal base constructors and sets _paintSharp.
- Parity: engine-model/special/ready-shape (enabled) doesn't record these fields; probably no `.fixed`.
- Size: small to medium

### BF-009 Symbol instances miss text changes of their master
- Source: Q-062
- Old: vendor module 216 43418-43556 (content merge at 43423, 43455); GText.setText doesn't write `content`
- Port: src/engine/scene/symbol.ts:1902-1915 and _mergeTextContent 1997, text.ts:763; pinned by symbol-scenarios.test.ts (engine-model/symbols-branches/text-merge)
- Category: wrong output. The merge diffs against a stale previous `content`; in-sync instances keep the old size and text after the inspector changes the master.
- Fix: keep the master's `content` current when its runs change, or take the previous runs from the event or the instance copy. Overridden instances stay skipped.
- Parity: engine-model/symbols-branches/text-merge (enabled)
- Size: medium to large (touches the content bookkeeping of BF-002)

### BF-010 An image dropped into an image grid gets a NaN itrf
- Source: Q-067 (cause found)
- Old: vendor module 534 GImageGrid addImage 75697-75722 stores nested [x, y] per cell, _prepareVertices 75588-75630 reads them flat
- Port: src/engine/scene/image-grid.ts:302-332 and 213-233; pinned by parity only
- Category: wrong output (image placed at NaN, saved as null). Only files that already hold an image grid reach it (drop onto the grid with the select tool).
- Fix: write flat offsets (offsets[2i], offsets[2i+1]), padding earlier slots with 0.
- Parity: engine-model/image/grid-images, engine-model/image/paint-grid (enabled)
- Size: small

### BF-011 The broken-image cross ignores the crop origin
- Source: Q-063
- Old: vendor module 95 GImage._paintImageCanvas 24921-24936
- Port: src/engine/scene/image.ts:790-807; pinned by parity only
- Category: wrong output (the cross of a cropped image that failed to load is off its box)
- Fix: lines from (px, py) to (px+pw, py+ph) and (px+pw, py) to (px, py+ph).
- Parity: engine-model/image/paint-error (enabled)
- Size: small

### BF-012 Contact shadow grows its kept box on every padding call
- Source: PROGRESS
- Old: vendor module 1028 getEffectPadding 234828-234852 (`_savedBBox = _savedBBox.expanded(...)`)
- Port: src/engine/style/effects/contact-shadow-effect.ts:103-119; pinned by effects-catalogue.test.ts "the contact shadow keeps the box grown by the other effects" (the "Each call grows the kept box again" assertion)
- Category: wrong output. The overlay paint calls it on every paint, so the shadow should drift and grow until the paint box is recomputed (follows from the code, not watched).
- Fix: keep the raw box, compute the expanded box locally per call.
- Parity: none
- Size: small

### BF-013 A fake text gives only its first backup outline to vertex readers
- Source: Q-041
- Old: vendor module 70 readVertex 16880-16887, hasVertexForRead ~16915-16921
- Port: text.ts:1013-1022, 1056-1062, 858-865; pinned by text.test.ts "reads only the first backup outline of a fake text"
- Category: wrong output (PDF-imported or missing-font text with several runs: outline view, hover and selection show only the first run, while painting draws all)
- Fix: move _vertexIterator on to the next backup path; hasVertexForRead checks the rest.
- Parity: none
- Size: small

### BF-014 HarfBuzz clusters used as UTF-16 indexes
- Source: Q-014
- Old: vendor module 587 stringToGlyphs 82205-82250
- Port: src/engine/text/fonts/open-type-font.ts:336-367; pinned by harfbuzz.test.ts "reports clusters as UTF-8 byte offsets" and the shaping entries of __fixtures__/old-fonts.json
- Category: wrong output. glyph.text is read by the SVG and PDF export of text on a path (svg-tl-render.ts:306, pdf-tl-render.ts:322) and the text pattern bounds (tl-canvas-context.ts:593). Non-ASCII text gets shifted characters, RTL text gets "" for every glyph. Carets and selection don't use it.
- Fix: map UTF-8 byte offsets to UTF-16 indexes; the first glyph of a cluster gets its text, the others "".
- Parity: engine-model/fonts/browser-probe (enabled)
- Size: medium

### BF-015 Text core undo splices at the start and rolls back in a cascade
- Source: Q-050
- Old: vendor module 652 makeEditCommand 89677-89688, rollback ~89759
- Port: src/engine/text/gtl/document.ts:104-124, 199-201; pinned by document.test.ts "undoes and redoes setText", "setTextAtStart", "twoEdits", "toggleList", "toggleListOff" and "fails to load, splice or lay out: …"
- Category: data loss, but only after another layout failure: the "invalid state - rolling back" path then wrecks the text (no frame, plainText and save throw). No real input that throws in layout is known.
- Fix: `this.makeEditCommand(start, words.length, removed)`.
- Parity: none
- Size: small

### BF-016 replaceFonts writes the style twice and never the weight
- Source: Q-037
- Old: vendor module 70 17982-17986
- Port: text.ts:2272-2275; pinned by text.test.ts "replaces fonts (fontSetterContent)" and "(fontContent)"
- Category: wrong output (after a font replacement, e.g. text-properties.ts:1338 on a fake text, `_tfw` stays stale in `content` and the file)
- Fix: `$_tfw = replacement.getWeight()`.
- Parity: none
- Size: small

### BF-017 Text border pattern box reads the text's own `_ba`
- Source: Q-039
- Old: vendor module 70 18615-18618
- Port: text.ts:2992-2994; no test
- Category: wrong output (gradient or texture Inside borders on text get a widened pattern box)
- Fix: test the border layer's `$_ba` as shape.ts:1120 does.
- Parity: none
- Size: small

### BF-018 deCRLFify replaces only the first line break
- Source: Q-045
- Old: vendor module 161 GTLUtil.deCRLFify 35257-35263
- Port: src/engine/text/gtl/tl-util.ts:155-157; pinned by tl-core.test.ts "parses fonts and CSS like GTLUtil"
- Category: wrong output (stray "\r" laid out and saved; CRLF is normalized earlier, so mainly lone "\r" from classic Mac text and PDF words)
- Fix: global regexes for "\r\n" and "\r".
- Parity: none
- Size: small

### BF-019 Undo, Save, Redo of an inserted image makes the next save fail ("Missing entry value for dictionary://...")
- Source: PROGRESS (seen with Flatten; pasted and dropped images too)
- Old: vendor module 227 GDictionary serialize 44947-44956 (sanitize then flush); module 658 GSceneDictionary 92130-92374 (throw at 92322)
- Port: src/engine/style/dictionary.ts:185-190, scene-dictionary.ts:332 (flush), 298-326 (sanitize, throw at 302), 157-185 (_afterInsertEvent); pinned by scene-dictionary.test.ts "recreates a missing entry from the stored url and says so" (last assertion)
- Category: data loss. Every save flushes entries without references; after Undo the image's entry is deleted while the undo history still holds its dictionary:// url. Redo re-inserts it and every later save throws, the image data is gone. Reachable with Flatten (F7), Paste Image or dropping a PNG.
- Fix: serialize writes only referenced entries but keeps unreferenced ones in memory (or a side map that sanitize restores from).
- Parity: editor-actions/exec/modify.path2bmp, modify.path2bmp--two (enabled); editor-actions/shortcuts/modify (modify.path2bmp case), editor-actions/clipboard/paste-events (paste.paste), editor-actions/dnd/drops (png-file, two-files) (not enabled)
- Size: medium

## Editor

### BF-020 Toggle marquee over a highlighted selected node throws
- Source: PROGRESS (phase 6 list)
- Old: vendor module 82 GEditor highlightSelectablesUnderCollision, `removeFlag++` at 20723
- Port: src/editor/editor.ts:1491-1498; pinned by editor.test.ts "throws like the old code when a toggle marquee meets a highlighted selected node"
- Category: crash. Shift-drag a marquee over a selected element, release Shift mid-drag, press it again: every move throws and the highlight stops updating.
- Fix: clear Highlighted, set keptSelected and carry on.
- Parity: none (pointer/marquee-* don't hit it; add a scenario)
- Size: small

### BF-021 Magic tool throws on a selection with open sub-paths
- Source: Q-193
- Old: vendor module 764 GMagicTool._doTheClip 106867-106930 (throw at 106924, `.item.getParent()`)
- Port: src/editor/tools/magic-tool.ts:174-178 (collected at 101/141); pinned by view-tools.test.ts "throws when the shaped selection also has an open sub-path (old crash, kept)"
- Category: crash. The closed shapes are already removed and "Create freehand path" commits, so the shape is gone until Undo.
- Fix: keep each open part with its source item and remove those items as meant.
- Parity: none
- Size: small

### BF-022 Finishing a freehand stroke with Shift up throws in the multi-page view
- Source: Q-162
- Old: vendor module 335 GFreehandTool._modifiersChanged 61192-61201
- Port: src/editor/tools/freehand-tool.ts:440-453 then _mouseRelease 519; the throw is editor.ts:2551 (`containsPoint(undefined)`); no test
- Category: crash (traced, not run). The path isn't closed or selected and the tool doesn't reset. The multi-page view is reachable (F6, pages sidebar switch).
- Fix: finish with the last mouse event, or skip updateByMousePosition without a client position.
- Parity: none (freehand/shift-straight-segments is single-page)
- Size: small

### BF-023 Scaling a slice with the transform box sets its height to 0
- Source: Q-190 (Q-135 alone is not a bug)
- Old: vendor module 1084 GSliceEditor._applyTransform 237400-237424 (`* o[1]` at 237413)
- Port: src/editor/element-editors/slice-editor.ts:54-79; pinned by slice-editor.test.ts "sets the height to 0 for a scale without a preview (old bug)"
- Category: data loss (slice geometry). Scaling a selection with a slice through the Q transform box takes this path; x/y also become x + tx instead of mapped.
- Fix: without a preview, map the slice rect through the transform and write it back (rotation still dropped).
- Parity: none (add a scenario)
- Size: small

### BF-024 Shift on a corner shoulder drag starts the right shoulder from the left one
- Source: Q-189 (detail branch; the NaN outside detail mode only reaches a hint that ignores path parts)
- Old: vendor module 127 _movePreviewPointShoulders 29993-30045 (bug at 30019)
- Port: src/editor/element-editors/path-editor.ts:1892-1899; pinned by path-editor.test.ts "reads cl for cr when Shift drags a shoulder in detail mode (old bug)"
- Category: wrong output (cl 10 / cr 20, Shift-drag to 15 gives cr 5)
- Fix: `right = cr ?? 0`.
- Parity: none
- Size: small

### BF-025 A transform box pivot at x = 0 or y = 0 counts as no pivot
- Source: Q-137
- Old: vendor module 546 GTransformBox constructor 79587-79588
- Port: src/editor/element-editors/transform-box.ts:161-162; pinned by transform-box.test.ts "rotates around the centre unless one is given; 0 counts as none"
- Category: wrong output. A pivot snapped to the page's left or top edge is 0 and resets to the box centre after the first transform.
- Fix: `cx != null ? cx : (tlx + brx) / 2`, same for cy.
- Parity: none (add a scenario)
- Size: small

### BF-026 Pen: Space during a handle drag throws the anchor off by the scroll
- Source: PROGRESS, code comment
- Old: vendor module 539 GPenTool._updatePointProperties 76805-76820
- Port: src/editor/tools/pen-tool.ts:762-778; pinned by pen-tool.test.ts "in a scrolled view throws the anchor off by the scroll (old bug, kept)"
- Category: wrong output. The app view is always scrolled (centred page), so the point flies off on every move; zoom and path transforms break it too.
- Fix: map the point to view space first, add clientDelta, pass the view position to _updatePoint.
- Parity: editor-tools/pen/space-moves-anchor (enabled)
- Size: small

### BF-027 Snapping returns the unsnapped rect when equal spacing loses
- Source: Q-121
- Old: vendor module 210 GGuides.mapRect, bbox branch 40798-40822
- Port: src/editor/guides/guides.ts:487-518; no test pins the losing case
- Category: wrong output (edge, grid, guide line, page and full-pixel snaps are all skipped)
- Fix: return only when the spacing result won, otherwise continue.
- Parity: editor-tools/snap/equal-spacing, snap/equal-spacing-overlay (enabled; re-run, add a "spacing loses" scenario)
- Size: small

### BF-028 Full pixels guide also rounds the bottom-right corner
- Source: Q-122
- Old: vendor module 544 GFullPixelsGuide constructor 79044-79050 (forEach while splicing)
- Port: src/editor/guides/full-pixels-guide.ts:27-34; pinned by guides.test.ts "keeps bottom-right on the full pixels guide (the constructor skips it while splicing)"
- Category: wrong output (fractional widths land x off-pixel)
- Fix: keep only TOP_LEFT (filter a copy).
- Parity: editor-tools/snap/snap-zones, snap-zones-overlay (enabled; re-run, add a fractional-size scenario)
- Size: small

### BF-029 mapPoint returns another page's local coordinates (multi-page view)
- Source: Q-183
- Old: vendor module 210 mapPoint 40626-40687 (mapRect converts at 40733-40742); module 742 GPageGuide
- Port: guides.ts:329, 339; pinned by guides-multipage.test.ts "mapPoint passes the other page's local value through unchanged"
- Category: wrong output (point drags near another page's edge jump: (498,100) becomes (0,100))
- Fix: convert the hit into active-page space as mapRect does.
- Parity: none
- Size: small

### BF-030 Snap scope stays on the other page after the pointer comes back
- Source: Q-184
- Old: vendor module 153 GBBoxGuide 32343, 32485; module 741 GPointsGuide 101546
- Port: src/editor/guides/bbox-guide.ts:282, 420; points-guide.ts:251; pinned by snap-scope.test.ts "keeps the other page's elements as scope after the point comes back"
- Category: wrong output (multi-page view, editing inside a group: main-page siblings stop snapping)
- Fix: reset the effective scope when the point is over the main page again.
- Parity: none
- Size: small

### BF-031 The text tool caches an empty default measure for the session
- Source: Q-151
- Old: vendor module 547 GTextTool._getDefaultMeasure 80490-80512
- Port: src/editor/tools/text-tool.ts:362-377; pinned by shape-tools.test.ts "keeps an empty measure for good when the font isn't resolved yet"
- Category: wrong output. If the first text box is dragged before the default font resolves, every dragged text box gets a fixed height for the rest of the session.
- Fix: don't cache a null measure; measure again next time.
- Parity: none
- Size: small

### BF-032 A freehand click leaves an invisible closed one-point path
- Source: Q-163 (borderline)
- Old: vendor module 335 _mouseRelease 61265, _closeIfNeeded 61325-61328
- Port: freehand-tool.ts:523-530, 578-593; pinned by freehand-tool.test.ts "a click without moving gets a second point 1 px right, which the closing then merges"
- Category: wrong output (a selected, invisible, closed one-anchor path with fill stays in the document)
- Fix: don't close a stroke that is only the click point plus the added point.
- Parity: none
- Size: small

### BF-033 A blocked arrange shortcut nudges the selection by 1 px
- Source: PROGRESS
- Old: vendor module 334 GSelectTool arrow handling ~59623, _applyKeyTransformation 59916
- Port: src/editor/tools/select-tool.ts:1170-1172, 1231-1232; select/nudge.ts:79-100; no test
- Category: wrong output (when Ctrl+arrow arranging moves nothing, the arrow's preview is applied as its own "Transform Selection" step)
- Fix: the select tool doesn't nudge on arrows while Ctrl/Meta is held.
- Parity: editor-tools/editor/arrange-order-always-back, probe blue-backward-blocked (not enabled)
- Size: small to medium

### BF-034 Alt-drag duplicate shows the plain select cursor
- Source: PROGRESS
- Old: vendor module 334 getCursor 58437-58443, drag start 59090-59135 (Moving set in a 33 ms timeout, cursor updated before it)
- Port: select-tool.ts:284-291, 812-815; no test
- Category: broken UI (minor)
- Fix: updateCursor() right after _updateMode(Mode.Moving) in the timeout.
- Parity: editor-tools/pointer/alt-drag-duplicates, probe "dragging" (enabled)
- Size: small

### BF-035 The adaptive outline colour reads the bottom-right pixel
- Source: Q-131
- Old: vendor module 39 GBaseEditor.getOutlineColor 7428-7436
- Port: src/editor/element-editors/base-editor.ts:142-143; pinned by base-editor.test.ts "reads the outline background from the bottom-right pixel whatever x and y are"
- Category: broken UI (minor: blue or white outline chosen from the dirty area's corner)
- Fix: `Math.min(canvas.getWidth() - 1, x)` and the same for y; check the canvas offset in partial repaints.
- Parity: editor-tools/eledit/adaptive-outline-white, adaptive-outline-dark (enabled; re-run)
- Size: small (medium if the offset mapping is needed)

### BF-036 After an editing session ends mid-composition, editing keys do nothing
- Source: Q-185
- Old: vendor module 752 GInlineTextEditor deactivate 102926, _compStart 103462, _compEnd 103470
- Port: src/editor/element-editors/inline-text-editor.ts:187-203, 389-400; pinned by inline-text-editor.test.ts "composition state survives deactivation" (fixture inline-text-editor.fixture.json)
- Category: broken UI (Backspace, Enter, Delete, Up/Down and Tab are ignored in the next session until a new composition)
- Fix: reset the composition state in deactivate.
- Parity: editor-tools/extra/ime-composition (enabled, unaffected)
- Size: small

### BF-037 A page drop target is never shown highlighted
- Source: Q-203
- Old: vendor module 334 _updateSelectionTransform 60238-60254, cleanups 60277 and 60281
- Port: src/editor/tools/select/move-transform.ts:334-356; indirectly select-tool-drop.test.ts "moves the element into the page under the pointer, keeping its scene position"
- Category: broken UI (no hover feedback when dragging onto another page in the multi-page view; the drop works)
- Fix: the image-mask cleanup doesn't clear page targets.
- Parity: none
- Size: small

## IO

### SVG import

### BF-038 Rotated arcs come out almost unrotated
- Source: Q-075
- Old: vendor module 1392 arcToBezier 248961-248962
- Port: src/io/import/svg/helpers.ts:139-140; pinned by helpers.test.ts "matches the old importer's arc segments exactly"
- Category: wrong output (the rotation, already in radians, is converted again)
- Fix: use the rotation as radians.
- Parity: io-import-svg/paths-svg (enabled)
- Size: small

### BF-039 SVG import never finishes when a font is asked for after another resolved
- Source: Q-076
- Old: vendor module 1391 245165-245185, 245258-245264
- Port: src/io/import/svg/svg-parser.ts:304-357; pinned by parity
- Category: broken UI (hang: the tab stays Loading)
- Fix: reset `_hasFontListener` when the listeners come off.
- Parity: io-import-svg/text-unknown-family-svg (enabled)
- Size: small

### BF-040 Font queries are keyed "[object Object]", so families get each other's answer
- Source: Q-077
- Old: vendor module 1391 245110-245135
- Port: svg-parser.ts:177-219; pinned by svg-parser.test.ts "passes every argument of the provider's answer to every waiting query" and parity
- Category: wrong output (texts get another family's font)
- Fix: key by family, style, weight and name.
- Parity: io-import-svg/font-fallback-svg (enabled); import-export/import/open/svg-font-fallback.svg (not enabled)
- Size: small

### BF-041 `<switch>` imports every child
- Source: Q-079
- Old: vendor module 1391 svg.Element.switch 246421ff
- Port: svg-parser.ts:1473-1481 (children built by the base toScene 552-580)
- Category: wrong output (all alternatives on top of each other)
- Fix: build only the first child that isn't foreignObject or unknown (ideally the first whose conditions pass); keep the Gravit graphic-source branch (1024-1044).
- Parity: io-import-svg/anchors-svg, structure-svg (enabled)
- Size: medium

### BF-042 Imported text gets a square box for gradients and patterns
- Source: Q-080
- Old: vendor module 1391 247571-247580
- Port: svg-parser.ts:2043-2051; pinned by parity
- Category: wrong output
- Fix: use getHeight().
- Parity: io-import-svg/text-layout-svg (enabled)
- Size: small

### BF-043 Text children take the position and style of another child
- Source: Q-081
- Old: vendor module 1391 svg.Element.text 247583ff
- Port: svg-parser.ts:2112-2133, 2298-2318
- Category: wrong output (mixed tspan, textPath, tref, a)
- Fix: each created text keeps its own span; no splicing of the children list for textPath.
- Parity: io-import-svg/text-layout-svg, use-text-svg (enabled)
- Size: medium

### BF-044 class on `<use>` doesn't style the instance
- Source: Q-083
- Old: vendor module 1391 svg.Element.use 248111ff
- Port: svg-parser.ts:2634-2658
- Category: wrong output (sprite icons styled through `use.class` lose the style)
- Fix: class rules of the use apply to the instance (copy class and style before the clone resolves styles, or resolve through the use).
- Parity: io-import-svg/use-symbol-svg, use-text-svg, structure-svg (enabled)
- Size: medium

### BF-045 `<use>` of a `<text>` fails the import
- Source: IO research (Extra)
- Old: vendor module 1391 svg.Element.use 248111ff
- Port: svg-parser.ts:2656-2661 (array result, getTransform TypeError)
- Category: crash (import fails)
- Fix: handle an array result (transform each text or wrap them in a group).
- Parity: io-import-svg/use-text-svg (enabled)
- Size: small

### BF-046 feColorMatrix fails the whole import
- Source: Q-084
- Old: vendor module 1391 248535ff, 248669
- Port: svg-parser.ts:2997-3001, via SvgFilter.apply 2975-2977
- Category: crash (import fails)
- Fix: apply is a no-op, like feMorphology and feComposite.
- Parity: io-import-svg/color-matrix-svg (enabled)
- Size: small

### BF-047 Line and polyline bounds move the bottom edge to x
- Source: Q-085
- Old: vendor module 1391 svg.Rect expand 245500-245505
- Port: src/io/import/svg/svg-values.ts:121-126; pinned by svg-values.test.ts "moves the bottom edge to the x of a lower point (old quirk)"
- Category: wrong output (objectBoundingBox gradients on lines, polylines, polygons)
- Fix: `this._y1 = point.y`.
- Parity: possibly io-import-svg/gradients-svg, patterns-svg (enabled; check after the fix)
- Size: small

### BF-048 em and ex lengths fail the import
- Source: Q-086
- Old: vendor module 1391 getEM 245360
- Port: svg-values.ts:313-315; pinned by svg-parser.test.ts "fails on em lengths, which needed canvg's canvas"
- Category: crash (import fails; `dy="0.35em"` is common)
- Fix: resolve em against the element's computed font size; ex = em / 2.
- Parity: io-import-svg/units-em-svg (enabled)
- Size: medium

### BF-049 matrix() and skew in a transform list apply on the wrong side
- Source: Q-087
- Old: vendor module 1391 Type.matrix 245652 (SkewBase reuses it)
- Port: svg-values.ts:425-440, SkewStep 446; pinned by svg-values.test.ts "applies matrix() on the other side than translate()" and "applies transform lists like the old importer"
- Category: wrong output
- Fix: preMultiplied like the other steps.
- Parity: io-import-svg/transforms-svg (enabled)
- Size: small

### BF-050 CSS rules and ids named like Object.prototype members
- Source: PROGRESS (R5-E-401)
- Old: vendor module 1391 Styles 248074, Definitions 245913, References 245340
- Port: svg-parser.ts:234-237, 2566-2574, 468-469; svg-values.ts:281; pinned by svg-parser.test.ts "writes a __proto__ rule onto Object.prototype and still imports", "writes a constructor rule onto the Object function", "fails the import for a use of #toString or of an element with id constructor"
- Category: crash (import fails), plus prototype pollution for the session
- Fix: Object.create(null) or Map with own-property lookups.
- Parity: io-import-svg/prototype/style-proto-svg, prototype/style-constructor-svg, proto-id-constructor-svg, proto-use-tostring-svg (enabled)
- Size: small

### BF-051 The image size listener of an imported image is never removed
- Source: Q-082 (not run; verify first)
- Old: vendor module 1391 svg.Element.image 247930-247945
- Port: svg-parser.ts:2460-2474
- Category: wrong output. Inspector > Replace Image on such a node fires it again and overwrites the new trf/itrf, compounding the scale.
- Fix: remove the listener after the first Loaded or Error.
- Parity: io-import-svg/images-svg-placed (enabled; probably unchanged)
- Size: small

### BF-052 Pasting an SVG file does nothing
- Source: PROGRESS
- Old: dev.js module 1313 101900-101910
- Port: src/app/clipboard/clipboard-bridge.ts:224-233; no test
- Category: broken UI
- Fix: take getAsFile() for image/svg+xml file items.
- Parity: import-export/clipboard/paste-event-svg-file (not enabled)
- Size: small

### BF-053 Placing or dropping a .svgz does nothing
- Source: PROGRESS
- Old: dev.js module 163 7855; vendor module 1390 244963
- Port: src/io/import/svg/svg-import.ts:82-88 (Blob read as text), src/app/document/place-import.ts:280-289 (error ignored)
- Category: broken UI
- Fix: read Blobs as ArrayBuffer so the gzip check runs; show a message when a placed SVG fails.
- Parity: import-export/import/place/svg-shapes.svgz (not enabled)
- Size: small

### SVG export

### BF-054 Texts coloured by their font colour export as `fill:[Object GRGBColor]`
- Source: Q-088
- Old: vendor module 1467 257703
- Port: src/io/export/svg/svg-text-attributes.ts:225-231; no test
- Category: wrong output (every text made with the text tool exports black; Print goes through SVG too)
- Fix: convert the colour to CSS before style.set (fill and stroke).
- Parity: io-export-svg/corpus/text-layout, text-runs, text-character-styles, text-lists, text-on-path, symbols, pages-master, pages-master-odd-even, transforms, io-export-svg/extra/symbol-instance (enabled)
- Size: small (many `.fixed` files)

### BF-055 A broken image makes the SVG export never finish
- Source: PROGRESS
- Old: vendor module 1456 256488-256493 (undeclared `dashed`)
- Port: src/io/export/svg/svg-paint-canvas.ts:74-96; exporter.ts:344-346 drops the error; no test
- Category: broken UI (hang, nothing written)
- Fix: strokeLine without `dashed`; report SVG export errors through the callback.
- Parity: io-export-svg/extra/image-broken (enabled)
- Size: small

### PDF and bitmap export

### BF-056 Concurrent raster drops the last pixels of PDF images
- Source: Q-091
- Old: vendor module 1113 concurrencyRaster 239343-239349
- Port: src/workers/raster.ts:69-74; pinned by workers.test.ts "Raster.concurrencyRaster remainder (kept old bug)" and the 7x3 case of "splits into slices of 4 pixels per worker..."
- Category: wrong output (transparent last pixels and a soft mask on opaque images over 100x100)
- Fix: copy `pixels.slice(range.start, range.end + remainder)`.
- Parity: probably io-export-pdf corpus/effects-*, export/effects-150dpi, sharp-shadows* (enabled; depends on the worker count, check each)
- Size: small

### BF-057 A PDF export never calls back when a node's paint throws
- Source: Q-092
- Old: vendor module 1406 ~251589-251661
- Port: src/io/export/pdf/pdf-export.ts:497-500, 565-571; pinned by pdf-export.test.ts "never calls back when a node's paint throws (kept hang)"
- Category: broken UI (dialog waits forever)
- Fix: catch around the paint and fail(error).
- Parity: none
- Size: small

### BF-058 Cancelling a PDF export during rasterization never calls back
- Source: Q-093
- Old: vendor module 1406 ~251549-251610
- Port: pdf-export.ts:457, 514; pinned by pdf-export.test.ts "never calls back after an abort while nodes are rasterized (kept hang)"
- Category: broken UI
- Fix: on abort end the job and call back once without bytes; attach the rejection handler before abort can reject.
- Parity: none
- Size: small

### BF-059 PDF bleed box is written as x y width height
- Source: Q-119
- Old: vendor module 1440 253481-253509, setBleedBox 251555
- Port: src/io/export/pdf/media-box.ts:34-41, page.ts:39-40, pdf-export.ts:463-465
- Category: wrong output
- Fix: write [llx lly urx ury]; with bleed b the media box includes it, so BleedBox = [0 0 W H] and TrimBox [b b W-b H-b].
- Parity: io-export-pdf/export/bleed, import-export/export/pdf/bleed (+ .render) (enabled)
- Size: small

### BF-060 ToUnicode of astral characters is not valid hex
- Source: Q-089 (only this part; /Length1 and the ignored compress/version options stay)
- Old: vendor module 1431 _updateUnicode 252964-252968
- Port: src/io/export/pdf/cid-font-type.ts:141-143; pinned by pdf-writer.recorded.test.ts "embeds fonts like the old classes: cid-cff"
- Category: wrong output (copying emoji or math letters out of the PDF breaks)
- Fix: floor the lead surrogate.
- Parity: the recorded fixture; maybe io-export-pdf corpus text scenarios (check)
- Size: small

### BF-061 "Keep Fonts" is always disabled in the PDF missing-fonts dialog
- Source: PROGRESS (intended behaviour not traced)
- Old: dev.js module 841 53469
- Port: src/app/dialogs/missing-fonts-dialog.ts:97, 245-252; opened from open-import.ts:263-270 before texts become fake texts
- Category: broken UI (the user can only Replace or close)
- Fix: decide what Keep means for a PDF (probably keep the PDF outlines as fake texts) and enable it there.
- Parity: import-export/import/open/pdf-missing-fonts-dialog (not enabled)
- Size: medium

### BF-062 An export right after opening clips auto-sized text to the default 142x27 box
- Source: PROGRESS
- Old: dev.js module 1253 GExporter.exportExportable ~80606
- Port: src/io/export/exporter.ts:299ff; no test
- Category: wrong output (race with font loading)
- Fix: wait for pending fonts before painting the export.
- Parity: none (page-lib.ts:186-197 works around it; a scenario without the workaround is needed)
- Size: medium

### BF-063 Export file names keep HTML escaping
- Source: PROGRESS
- Old: same name escaping
- Port: src/engine/scene/block.ts:56 (escaped on set), exporter.ts:245-257, 392-406; pinned by exporter.test.ts "matches import-export/meta/exportables-assets"
- Category: wrong output ("a&lt;b&gt;_c.png")
- Fix: unescape before sanitizeFilename.
- Parity: import-export/meta/exportables-assets (enabled)
- Size: small

### BF-064 A hidden page blocks every export and Save As
- Source: PROGRESS
- Old: dev.js module 163 8321-8325
- Port: src/io/gvdesign/save-checks.ts:35-40; used by export-action.ts:100, save-as-action.ts:191; no test
- Category: broken UI ("…empty infinite canvas is not allowed")
- Fix: an empty infinite canvas is a page with w and h 0 and no content, regardless of visibility.
- Parity: import-export/ui/hidden-page-blocks-export (enabled)
- Size: small

### BF-065 A multi-file export silently drops a file whose final name is taken
- Source: Q-094
- Old: dev.js module 1253 80664-80725
- Port: exporter.ts:392-406, 437; pinned by exporter.test.ts "drops a file whose final name is taken and still finishes (old behaviour)" and "makes subdirectories for "/" ..."
- Category: data loss
- Fix: number per target directory until the final name is free.
- Parity: none records the drop (import-export/meta/export-names enabled, names only)
- Size: small

### BF-066 A directory or ZIP export never finishes when an item has no name
- Source: Q-095
- Old: dev.js module 1253 80664-80725
- Port: exporter.ts:448-482; pinned by exporter.test.ts "never calls onDone when an item has no name (old behaviour)"
- Category: broken UI (hang; a whitespace-only layer name reaches it)
- Fix: count a skipped item as done (or use the fallback name).
- Parity: none
- Size: small

### Document load and import

### BF-067 A .gvdesign without a scene, or with cut-off JSON, stays Loading forever
- Source: Q-118, PROGRESS
- Old: dev.js module 163 GDocument.deserializeData 6486-6512
- Port: src/io/gvdesign/load.ts:47-60, src/app/document/document.ts:585-594; pinned by load.test.ts "never settles for JSON that is cut off, like the old document left Loading", "never settles for %s, like the old document left Loading", "never settles for %s, whose restore never calls back", "rejects when deserializeAsync throws, like the old .catch(o)"
- Category: broken UI (hang, no message)
- Fix: validate the root before deserializeAsync, settle with a failure, set LoadFailed with "text.error-reading-file".
- Parity: none
- Size: medium

### BF-068 Merging equal clip paths on import keeps only the first child of the second
- Source: code comment, src/app/document/import-optimizer.ts:120-122
- Old: dev.js module 163 function Q 8374-8398 (loop at 8393)
- Port: import-optimizer.ts:118-127; pinned by src/app/document/import.test.ts "moves only the first child of the merged path, like the old loop"
- Category: data loss (runs on every PDF, AI and EPS open, place and drop)
- Fix: move `getFirstChild()` in a loop until empty.
- Parity: unknown until re-recorded; candidates import-export/import/drop/pdf-plain.pdf, drop/eps-gradient.eps (enabled), import-export/import/open/pdf-*, eps-*, place/* (not enabled)
- Size: small

### BF-069 A broken or encrypted PDF never finishes loading
- Source: Q-104, PROGRESS
- Old: vendor module 1393 getDocument().then without a rejection handler; dev.js module 163 7202-7207
- Port: src/io/import/pdf/pdf-import.ts:203, 215; open-import.ts:244-245 (empty dialog, no LoadFailed); place-import.ts:212; pinned by parity
- Category: broken UI (overlay stays, empty OK dialog)
- Fix: rejection handlers call done(error); open shows a readable message and sets LoadFailed.
- Parity: io-import-pdf-eps/pdf/broken-pdf, pdf/encrypted-user-password-pdf (enabled); import-export/import/open/pdf-broken.pdf.state (not enabled). The ai-check scenarios stay.
- Size: medium

### BF-070 A HEIC that fails to convert leaves the tab Loading
- Source: IO research (Extra)
- Old: dev.js module 163 7337 (open), 7851 (place)
- Port: open-import.ts:355-360, place-import.ts:271-275
- Category: broken UI (hang on open, silent on place)
- Fix: show "text.error-reading-file" and set LoadFailed.
- Parity: none
- Size: small

### EPS and the PostScript worker

### BF-071 Any exception in the PostScript worker makes the EPS import wait 300 s
- Source: IO research (Extra); covers the hang part of the closepath case, Q-106, Q-107, Q-112 internaldict and the throwing filter and math operators
- Old: public/ps.worker.js onmessage (no try/catch)
- Port: src/workers/ps/ps.worker.ts:50, parser.ts:540-557
- Category: broken UI (5-minute hang, then "timeout")
- Fix: catch in the run and read loop (and its setTimeout continuation), post error "04" and done.
- Parity: the corpus crash programs in interpreter.recorded.test.ts get `.fixed.json`; io-import-pdf-eps/eps/arc-closepath-eps(-text) (enabled) see BF-072
- Size: small

### BF-072 `x y r 0 360 arc closepath` breaks the EPS import
- Source: PROGRESS
- Old: public/pscore.js closepath
- Port: src/workers/ps/operators/graphics-setup.ts:56-75, graphics-geometry.ts:86-106
- Category: broken UI (hang; the standard circle idiom)
- Fix: arc and arcn without a current point start the subpath with a moveto to the arc's start, as PostScript does.
- Parity: io-import-pdf-eps/eps/arc-closepath-eps, arc-closepath-eps-text (enabled); import-export/import/open/eps-worker-exception-hangs (not enabled)
- Size: small

### BF-073 rectfill mirrored, rectstroke missing, rectclip wrong, dashes lost
- Source: PROGRESS
- Old: public/pscore.js rectfill, rectstroke, rectclip
- Port: src/workers/ps/operators/graphics-output.ts:42-131, src/io/import/eps/eps-parser.ts:428-436
- Category: wrong output (the old render of eps-shapes.eps shows all of it)
- Fix: rectfill and rectstroke build CTM-mapped rectangle paths through the normal fill and stroke (with clip); rectclip uses x+w, y+h corners. The dash cause (node has `_bds [6,3]`, render solid) still has to be traced.
- Parity: io-import-pdf-eps/eps/shapes-eps, shapes-eps-text, shapes-ps, shapes-ps-text, gfx-rectclip-ps (enabled); import-export/import/open/eps-shapes.eps (+ .render/.state), place/eps-shapes.eps (not enabled)
- Size: medium

### BF-074 PostScript filters lose or corrupt data (LZWDecode never works)
- Source: Q-109 (ReusableStreamDecode part stays a quirk)
- Old: public/ps*.js filters
- Port: src/workers/ps/filters.ts:48-50, 184 and the ASCII85 and SubFileDecode code; pinned by corpus filter-lzw.ps, filter-ascii85-*, filter-subfile-* (interpreter.recorded.test.ts)
- Category: crash (LZW: undeclared global) and wrong output (ASCII85 restarts its tuple per call, SubFileDecode reads an extra byte)
- Fix: local per filter.
- Parity: the recorded corpus programs get `.fixed.json`
- Size: medium

### BF-075 Text set with xshow, yshow, xyshow and charpath stacks at the start point; stroked fonts are filled
- Source: Q-110 (kshow/cshow and the ashow stack order stay quirks)
- Old: public/ps*.js text operators
- Port: src/workers/ps/show.ts:388-390 (`paintType`) and the x/y/xy show and charpath paths; pinned by corpus show-builtin-*, show-outlined-*, font-type1-stroked.ps
- Category: wrong output (cairo and Inkscape EPS use xyshow)
- Fix: advance glyphs in those paths; read PaintType.
- Parity: the recorded corpus programs
- Size: medium

### BF-076 atan throws in the PostScript worker
- Source: Q-114 (the rest of Q-114 stays)
- Old: public/ps*.js atan (calls a missing radianToDegree)
- Port: src/workers/ps/operators/basic-math.ts:125-133; pinned by corpus basic-atan.ps
- Category: crash (any file using atan fails)
- Fix: `* 180 / Math.PI`, normalized to 0-360.
- Parity: the recorded corpus program
- Size: small

### BF-077 Mesh shadings read their parameters from the wrong dict
- Source: Q-108
- Old: public/ps*.js shadings
- Port: src/workers/ps/color-shadings.ts; pinned by corpus color-sh4-*, sh5-*, sh6-*, sh7-*, color-sh-pattern-mesh.ps
- Category: wrong output (mesh shadings in patterns wrong or missing; lattice meshes draw two rows only; Illustrator gradient meshes go this way)
- Fix: read the shading dict, accept array data, build every lattice row.
- Parity: the recorded corpus programs
- Size: large

### BF-078 Cancelling an EPS import leaves the document Loading
- Source: IO research (Extra)
- Old: recorded in import-export/import/open/eps-worker-exception-hangs (afterCancel ["Ready", "Loading"])
- Port: src/io/import/eps/eps-import.ts:104-112, open-import.ts:187-196
- Category: broken UI (minor; tab look not checked)
- Fix: set LoadFailed (or close the tab) on cancel.
- Parity: import-export/import/open/eps-worker-exception-hangs (not enabled)
- Size: small

### Sketch import

### BF-079 Sketch layer effects are dropped
- Source: Q-098
- Old: vendor module 794 109422-109430
- Port: src/io/import/sketch/sketch-shape.ts:92-101
- Category: data loss (every shadow and blur except background blur)
- Fix: parse() before applyTo.
- Parity: io-import-sketch/styles-v49 (enabled)
- Size: small

### BF-080 Sketch overrides replace the wrong layer
- Source: Q-099
- Old: vendor module 796 replaceChild 109568-109583
- Port: src/io/import/sketch/sketch-base.ts:87-101; pinned by sketch-model.test.ts "replaces the first child when the layer is not a direct child (old inverted test)"
- Category: wrong output
- Fix: replace a matching direct child at its index, otherwise recurse.
- Parity: io-import-sketch/symbols-v49, symbols-edge-v49 (+ -ignore-symbol-page, -late-fonts) (enabled)
- Size: medium

### BF-081 Sketch boolean groups that start with a union are merged with one operation
- Source: Q-101
- Old: vendor module 1213 242909-242912
- Port: src/io/import/sketch/sketch-shape-group.ts:96-106
- Category: wrong output
- Fix: `first !== null`.
- Parity: io-import-sketch/booleans-v49 (enabled)
- Size: small

### BF-082 Sketch "Regular" fonts import as italic
- Source: Q-102
- Old: vendor module 1136 composeQuery 240408-240409
- Port: src/io/import/sketch/sketch-text.ts:81-96; pinned by sketch-patterns.test.ts "reads \"OpenSans-Regular\" like the old importer"
- Category: wrong output
- Fix: regular maps to Normal; Italic only for italic and oblique.
- Parity: io-import-sketch/text-v49, text-v49-late-fonts, text-v49-default-provider, text-valid-v49(-late-fonts), symbols-edge-v49 (enabled)
- Size: small

### BF-083 Sketch borders always import as Inside
- Source: Q-103
- Old: vendor module 439 70841
- Port: src/io/import/sketch/sketch-element.ts:33-37, 59-60
- Category: wrong output
- Fix: read each border's `position`, test for undefined instead of `|| 1`.
- Parity: io-import-sketch/styles-v49 (enabled)
- Size: small

## App UI

### BF-084 Settings: "Disable notifications" + Save leaves the dialog stuck
- Source: settings-dialog.ts header, PROGRESS
- Old: dev.js module 1275, Save 94455-94458, _saveNotificationSetting 94460-94467
- Port: src/app/settings/settings-dialog.ts:68, 287, 309; pinned by settings.test.ts "fails after writing the settings when notifications were switched (old bug kept)"
- Category: broken UI (Save rejects on JSON.parse of the HTML answer, the dialog stays open)
- Fix: store notifications_disabled as a local setting (default already in shell/settings.ts), or drop the row. Save closes.
- Parity: platform/storage/settings-dialog-notifications (enabled)
- Size: small

### BF-085 A malformed swatch in localStorage stops the app from starting
- Source: PROGRESS
- Old: dev.js module 1491, swatches at 122979
- Port: src/app/shell/designer.ts:1859-1872, engine/style/gradient.ts:151, 221; no test
- Category: crash (the designer never becomes ready until site data is cleared)
- Fix: try/catch per entry, skip bad ones with a warning.
- Parity: none (add a test or scenario with a bad entry)
- Size: small

### BF-086 Pasting a texture with nothing copied shows the arrowhead message
- Source: PROGRESS
- Old: dev.js module 1150 68890-68918 (GCommonNames "arrow-paste.alert")
- Port: src/app/color/color-chooser.ts:1361; no test
- Category: wrong output (UI text)
- Fix: a texture paste string ("Select a shape, copy it to clipboard then paste it as texture here.").
- Parity: none
- Size: small

### BF-087 Simplify Path ignores the typed tolerance
- Source: Q-248
- Old: dev.js module 1318 102679-102686, 102704
- Port: src/app/actions/modify/simplify-action.ts:41-64, 63, 132; no test
- Category: wrong output (always 10; the port's slider has no track either)
- Fix: typing sets the slider, OK uses it; reuse the real slider from color/opacity-slider.ts.
- Parity: editor-actions/path-dialogs/simplify-typed-40, simplify-typed-0 (not enabled)
- Size: small to medium

### BF-088 Invalid Expand/Shrink value shows the outline text
- Source: Q-246
- Old: dev.js module 1185 ~76689-76691, module 1317 102591-102593
- Port: src/app/actions/modify/outline-action.ts:107-109, offset-action.ts:52-56; pinned by path-actions.test.ts "shows the outline action's alert for an invalid offset"
- Category: wrong output (wording only; a missed override)
- Fix: alert with this._dialogAlertMessage().
- Parity: editor-actions/path-dialogs/offset-invalid (not enabled)
- Size: small

### BF-089 Ctrl+Shift+= doesn't zoom in
- Source: PROGRESS
- Old: dev.js module 1491 123232-123237
- Port: src/app/shell/designer.ts:761-764, actions/view/zoom-in-action.ts:17; no test
- Category: broken UI
- Fix: also bind mod+shift+=; keep ctrl++ for numpad +.
- Parity: editor-actions/shortcuts/view-zoom, case zoom-in-plus (not enabled)
- Size: small

### BF-090 Split Line throws on a line from a path without fill and border
- Source: Q-249
- Old: dev.js module 1319 102879-102893
- Port: src/app/actions/modify/split-line-action.ts:151-160; no test
- Category: crash (the scene is left half split)
- Fix: a line piece without a border always gets the black border, no fill appended.
- Parity: editor-actions/exec/modify.split-line (enabled, unaffected)
- Size: small

### BF-091 Edit > Deselect All selects the text of a focused field
- Source: Q-220
- Old: dev.js module 1334 104774
- Port: src/app/actions/edit/deselect-all-action.ts:47; pinned by edit-actions.test.ts "select the text of a focused field instead"
- Category: wrong output (minor; reachable from the menu)
- Fix: collapse the field's text selection.
- Parity: none
- Size: small

### BF-092 Cut names its undo step with an empty string
- Source: Q-221
- Old: dev.js module 1331 104441
- Port: src/app/actions/edit/cut-copy-action.ts:295; no test
- Category: wrong output ("Undo ")
- Fix: `new LocaleKey("GCutCopyAction", "text.cut-selection")`.
- Parity: editor-actions/exec/edit.cut--group-child (enabled), edit.cut (not enabled)
- Size: small

### BF-093 Copying a group together with its child pastes the child twice
- Source: Q-219
- Old: dev.js module 1331 104308-104326
- Port: cut-copy-action.ts:169-186; no test
- Category: wrong output (Ctrl+click in the layers panel selects both)
- Fix: hasKeptAncestor returns true when an ancestor is kept.
- Parity: editor-actions/clipboard/keyboard, check copy-group-child-and-parent (enabled)
- Size: small

### BF-094 Turning fast view off ignores the page's clip setting
- Source: Q-254
- Old: dev.js module 1603 154695-154697 (undefined constant names)
- Port: src/app/actions/view/fast-view-action.ts:20-21, 79-82; pinned by view-actions.test.ts "fast view ignores the page clip setting on a fixed page"
- Category: wrong output (screen only)
- Fix: read "cce" like Outline view.
- Parity: none differ
- Size: small

### BF-095 The fallback file input keeps the multiple flag of its first use
- Source: Q-217
- Old: dev.js module 1195 77177
- Port: src/app/storage/file-system-access.ts:393; pinned by file-system-access.test.ts "creates the input once: multiple stays as first set, accept follows each call"
- Category: broken UI (without the File System Access API, Open allows one file after a Place, or pickers take several files after an Open)
- Fix: set multiple on every call.
- Parity: platform/files/input-fallback-open (enabled, unaffected)
- Size: small

### BF-096 After one cancelable import, every later overlay closes on a click
- Source: Q-204
- Old: dev.js module 1503 129276-129279
- Port: src/app/shell/window.ts:331-338; no test
- Category: broken UI (the user can edit while a save is running)
- Fix: one-shot listener, or remove it on close.
- Parity: none
- Size: small

### BF-097 The low-memory estimate counts only the last document
- Source: Q-209
- Old: dev.js module 85 3367-3380
- Port: src/app/shell/container.ts:229-239; no test
- Category: wrong output (missing warning; throws and is swallowed when an untitled document follows a saved one)
- Fix: parenthesize the reduce.
- Parity: none
- Size: small

### BF-098 Save with linked images silently does nothing
- Source: Q-259 (reachable, unlike the entry says: BrowserFileStorage can save in Chrome, Edge and the Electron app)
- Old: dev.js module 1511 130707-130819, opened from module 447 19415-19419
- Port: src/app/dialogs/warn-linked-image-dialog.ts:32-41, 81-91; save-action.ts:104-113; no test
- Category: broken UI (open() throws before the dialog is built; the save rejects unhandled)
- Fix: open() waits until the dialog is built, or build it at once and skip it when never-remind is set.
- Parity: none (corpus/edge/linked-file/resave uses Download File)
- Size: small to medium

### BF-099 File, layer and font names are inserted as HTML
- Source: code comment pattern-type-menu.ts:74; app UI research
- Old: dev.js module 1238 78533, 78553-78562 (unsupported-features dialog); module 1491 canUnloadDocument 124502 with GSystemDialog .html() (document title in the "save changes?" prompt)
- Port: src/app/color/pattern-type-menu.ts:48-58, 76; src/app/shell/designer.ts:1450-1453 with system-dialog-view.tsx:11-13; also font names in src/app/fonts/imported-fonts-provider.ts:77 and local-font-list.ts:55; pinned by pattern-type-menu.test.ts "lists one line per feature and drops repeated element blocks", system-dialog-view.test.tsx "puts the message in as markup"
- Category: wrong output, and markup or script injection from file content and file names
- Fix: build text nodes (or escape) for names; string-table text can stay HTML.
- Parity: ui/dialog/svg-unsupported-features (enabled, unaffected), ui/dialog/close-modified-confirm (not enabled)
- Size: small (one commit, or one per place)

### BF-100 Clip Selection and Create Nested Compound share Ctrl+Alt+M
- Source: Q-003, Q-245
- Old: dev.js module 809 (GClipAction), module 1316 (GCreateNestedCompoundAction)
- Port: src/app/actions/modify/clip-action.ts:73-75, create-nested-compound-action.ts:40-42; no test
- Category: broken UI (the menu shows Ctrl+Alt+M for Create Nested Compound, the key always runs Clip)
- Fix: Create Nested Compound gets no shortcut (a new key would be a product decision).
- Parity: editor-actions/shortcuts/modify, case nested-compound-keys (not enabled)
- Size: small

### BF-101 Page Down / Page Up never change the page
- Source: Q-003, Q-253
- Old: dev.js module 1341 getAdditionalShortcuts
- Port: src/app/actions/modify/change-active-page-action.ts:59-70; no test
- Category: broken UI (listed, does nothing)
- Fix: `[[PAGE_DOWN]]`, `[[PAGE_UP]]`; check text fields and inline editing still get the keys.
- Parity: editor-actions/shortcuts/windows-pages, cases next-page-pagedown, previous-page-pageup (not enabled)
- Size: small

### BF-102 Scrubbing a number box without decimals always steps up
- Source: Q-229
- Old: dev.js module 1702 mousemoveIncrement 167517-167544
- Port: src/app/widgets/input-box.ts:221, 246-262; pinned by input-box.test.ts "takes at least one whole step per move without decimals, even down or still"
- Category: broken UI (dragging down increases)
- Fix: in scrub, 0 stays 0 and a size under 1 becomes Math.sign(size).
- Parity: none
- Size: small

### BF-103 Advanced Export in a tall window pushes the settings off screen
- Source: parity/scenarios/ui/dialogs.spec.ts:136
- Old: public/designer.browser.light.css 15332-15334 (and dark 15381): `.g-export-dialog > .g-dialog-content { width: 120vh }`
- Port: next/public/designer.browser.light.css:15333, dark 15381; no test
- Category: broken UI
- Fix: `width: min(120vh, calc(100vw - 40px))` in both stylesheets.
- Parity: ui/dialog/export-canvas-tall-window .dom/.light (enabled)
- Size: small

### BF-104 Selecting an element with a true blur, bend blur or adjust effect breaks the inspector
- Source: PROGRESS, BUG-004 note
- Old: dev.js module 1262 lookup 86723-86728, table from 86738
- Port: src/app/inspector/effect-forms.ts:1677-1686 (entryOf), table 1371-1668; called from effect-properties.ts:430, 722; pinned by effect-properties.test.ts "finds an effect's entry by instance and by class and rejects others"
- Category: crash ("Invalid effect/class"; the remaining effect rows and the panels after Effects don't update). Reachable with old files (corpus effects-webgl-2, -4).
- Fix: hidden webGLForm entries for GLTrueBlurEffect and GLBendBlurEffect, a hidden entry for AdjustMultiEffect (or a generic fallback).
- Parity: none select these elements
- Size: small

### BF-105 Dragging an effect row and not dropping it on a row deletes the effect
- Source: code comment effect-properties.ts:560 (cites a title that doesn't exist yet)
- Old: dev.js module 1262 dragstart 84561, drop 84615, dragend 84661-84690
- Port: src/app/inspector/effect-properties.ts:549-574; no test
- Category: data loss (undoable). Escape, letting go between rows or on the canvas all delete it.
- Fix: delete in dragend only when handleDragForDeleteIcon said so, like the border panel.
- Parity: none
- Size: small

### BF-106 Undo of a border colour change with the chooser open throws
- Source: Q-291
- Old: dev.js module 1162 _updatePaintLayer 74750-74803 (`$element` at 74798)
- Port: src/app/inspector/border-properties.ts:1372-1382; pinned by border-properties.test.ts "throws on undo with the chooser open, as the old undefined $element did"
- Category: crash (later border rows and panels not updated, chooser not reopened)
- Fix: reopen the chooser like fill-properties.ts:930-940.
- Parity: none
- Size: small

### BF-107 Add Border on an open path aligns it Inside
- Source: Q-281
- Old: dev.js module 1162 74015-74042
- Port: border-properties.ts:142-151 (newBorderAlignment); pinned by border-properties.test.ts "aligns open paths inside, since paths are shapes (old quirk)"
- Category: wrong output (the new border of a straight line is invisible; Inside is disabled for open paths in the settings)
- Fix: check open paths before the shape branch: Center.
- Parity: none
- Size: small

### BF-108 Image palette (Color Thief) boxes are too small
- Source: Q-274
- Old: dev.js module 1267 vboxFromPixels 87984-87986
- Port: src/app/inspector/color-thief.ts:228-236; pinned by color-thief.test.ts "keeps the else-if bounding box: a first sample only lowers the minimum" and "gives the old app's palette for two clusters, including the empty third box"
- Category: wrong output (a single-colour image gives [104,104,104] instead of [200,200,200])
- Fix: independent min and max checks.
- Parity: none
- Size: small

### BF-109 The eye dropper stays active after a tool change
- Source: Q-293
- Old: dev.js module 1698 setActive 166421, handler 166425-166430
- Port: src/app/color/eye-dropper.ts:107, 115; pinned by eye-dropper.test.ts "removes the loupe on a tool change but stays active (the old quirk)"
- Category: broken UI (the next click anywhere applies the last sampled colour)
- Fix: setActive(false) on a tool change, without colorchange.
- Parity: ui/color/eyedropper.dom (enabled, unaffected)
- Size: small

### BF-110 The noise type select doesn't show the pattern's type
- Source: Q-294
- Old: dev.js module 1150 70115-70127 (looks in _patternEditor)
- Port: color-chooser.ts:2305; pinned by color-chooser.test.ts "never selects the noise type of the pattern in the type select"
- Category: broken UI
- Fix: look in the noise editor and select getType().
- Parity: ui/color/fill-noise.light/.dark (enabled, unaffected); ui/color/fill-noise.dom (not enabled; check)
- Size: small

### BF-111 New Page with the pages section folded shows the header open but no list
- Source: Q-300
- Old: dev.js module 1260 81903-81908
- Port: src/app/sidebars/outline-sidebar.ts:316-323, widgets/accordion.ts:95; no test
- Category: broken UI
- Fix: also show `.pages-container`.
- Parity: none
- Size: small

### BF-112 Dragging several layer rows leaves another layer's name on the row
- Source: Q-301
- Old: dev.js module 1706 dragstart 168171-168200
- Port: src/app/sidebars/layers-panel.ts:608-634; no test
- Category: broken UI (minor, until the next render)
- Fix: restore the row's own name, as the pages panel does.
- Parity: none
- Size: small

### BF-113 A second window of a document stops the page clip sync
- Source: Q-308
- Old: dev.js module 1339 _windowEvent 105412-105458
- Port: src/app/inspector/page-properties.ts:432-470; no test
- Category: broken UI (Output/Full no longer follows page changes after View > New Window)
- Fix: remove from the last scene before adding, or skip both when it's the same scene.
- Parity: none
- Size: small

### BF-114 Dragging a slice background colour writes `@cls` into the file
- Source: Q-310
- Old: dev.js module 1272 90971-90974
- Port: src/app/inspector/slice-properties.ts:306-311; pinned by document-panels.test.ts "writes temporary changes to the custom property, the rest in one transaction"
- Category: wrong output (no preview while dragging; the stale `@cls` is saved, node store copies every "@" key)
- Fix: pass the temporary flag, not custom.
- Parity: none
- Size: small

### BF-115 A non-number isometric grid angle stores NaN
- Source: Q-312
- Old: dev.js module 1659 159789
- Port: src/app/inspector/scene-properties.ts:236-250; no test
- Category: wrong output (the grid disappears, the file stores null)
- Fix: accept only finite values, else restore the field.
- Parity: none
- Size: small

### BF-116 The text panel stops updating for a family the font cache doesn't know
- Source: Q-325
- Old: dev.js module 1701 weightsForFont 167356-167365
- Port: src/app/fonts/fonts-panel.ts:456-470; pinned by fonts-panel.test.ts "reads names, styles and weights from the cache" (`rejects.toThrow(TypeError)`)
- Category: broken UI (family, size, colour, weight and script keep the previous selection's values)
- Fix: check the entry before isLocalFont, answer null.
- Parity: none
- Size: small

### BF-117 Fonts that can't be fetched stay pending forever
- Source: Q-168 (404 case), Q-170, PROGRESS ("unresolvable fonts leave text pending forever")
- Old: dev.js module 590 26490-26506, module 1379 109908-109924, module 255 FontsProviderManager.resolveFont 12188-12237
- Port: src/app/fonts/fonts-provider.ts:76-104, font-manager.ts:255-292; pinned by providers.test.ts "fails only the first request on a connection error, and none on a 404" and font-manager.test.ts "leaves a listed font pending when its download had no connection"
- Category: broken UI (hasPendingFonts stays true: the open-document font wait never ends, the missing-fonts dialog never opens; reachable offline in Electron or on a 404)
- Fix: fail every waiting request and forget the url on non-2xx or error; an unparsable file or a ConnectionError for a listed family falls through to the next provider or fails.
- Parity: none
- Size: medium

### BF-118 The first request to the imported fonts provider runs twice
- Source: Q-169
- Old: dev.js module 1118 initialize 67441, load 67469-67474, callbacks 67571-67582
- Port: src/app/fonts/imported-fonts-provider.ts:235-257, 280-283, 350-353; pinned by providers.test.ts "runs its first request twice, later ones once"
- Category: wrong output (minor: families listed twice in the first query, missing-font events twice)
- Fix: pass the first call to initialize or to the callback list, not both.
- Parity: none
- Size: small

## Platform

No code fix is needed: the platform bug the old app had is already gone in the port (BF-128 below). Two housekeeping items:

- BUG-008 (COOP/COEP) still needs import-export/workers/isolation in BUG-008.json (it isn't listed there, not even under `pending`) with a `.fixed` file (same-origin / credentialless, crossOriginIsolated true) once that scenario is enabled.
- BUG-001, BUG-003, BUG-005 and BUG-006 have no parity exceptions file. BUG-003 has an empty one; the others need none unless the check starts to require a file per entry.

## Already fixed in the port: BUGS-FIXED entry only

These need an entry (old vs new, a test for the new behaviour where one is missing) but no code change. Parity: none of them changes an enabled recording unless noted.

### BF-119 Layer and page names are no longer read as HTML (app-ui)
- Old: dev.js module 1351 107382 (row title `.html(l)`), module 1717 171568, 171587, 171597 (page title and drag), module 1706 168182, 168192 (layer drag)
- New: src/app/sidebars/layer-item.ts:84-86, pages-panel.ts:345-347, 367, 376, layers-panel.ts:141-144 (textContent). The comments already cite this title.
- Test: none yet; add a layer named "a <b>x</b>" whose row shows that text with no b element.
- Parity: none (markup names only appear in engine-model and import-export/meta scenarios, which don't render the panels)

### BF-120 Menu captions and tab titles are set as text (app-ui)
- Old: dev.js module 339 setCaption 14297-14307 (`.html()`); module 1500 128585, 128677
- New: src/app/menus/menu-item.ts:277-286; src/app/menus/header.ts:387, 441, 646, 664
- Test: menu.test.ts "shows captions as text and icons as an <i> with the class names"; header.test.ts needs a title with "<" or "&amp;"
- Parity: none

### BF-121 Layers panel style update no longer throws for a row that isn't rendered (app-ui; the "a1706" guard)
- Old: dev.js module 1706, timer at 168611-168613, Q at 168643-168661 (`n.element.parent()` throws for a collapsed or scrolled-out row)
- New: src/app/sidebars/layers-panel.ts:966, 1003-1006 returns quietly. Optionally recurse to the parent row too (both old and new skip it today).
- Test: none yet; add one for an unrendered row.

### BF-122 Long press on an SVG icon no longer throws (editor)
- Source: Q-176
- Old: dev.js module 1693 _fireLongPressEvent 165724-165741 (`className.indexOf` on an SVGAnimatedString)
- New: src/editor/touch/long-press-event.ts:112-129; test long-press-event.test.ts "doesn't swallow the release when the parent's className isn't a string (SVG)"

### BF-123 The theme callback waits for the stylesheet (app-ui)
- Source: Q-208
- Old: dev.js module 1491 _setTheme 123731-123760 (callback on fetch only; rulers could keep the old theme's colours)
- New: src/app/themes/theme.ts:51-87
- Test: none yet (a fake link that loads after the fetch)

### BF-124 The web fonts tab doesn't push a missing system fonts provider (app-ui)
- Source: Q-324 (no user-visible change against the old browser build; the literal code would throw in the new container)
- Old: dev.js module 1700 166810-166811
- New: src/app/fonts/fonts-button.ts:82-94; test fonts-button.test.ts "builds the tabs and the panel in the font list overlay"

### BF-125 The merge tool menu tolerates a missing merge action (app-ui)
- Old: dev.js module 1541 141177-141189. Unreachable in the old app (the action is always registered); a one-line entry.
- New: src/app/toolbar/toolbar.ts:1171-1178; no test

### BF-126 Root dividers in the main menu build are skipped (app-ui)
- Source: Q-206. Dead with the full action table; a one-line entry.
- Old: dev.js module 1491 123373-123374. New: src/app/shell/designer.ts:887-890

### BF-127 _finishPaint without a tile no longer throws (editor)
- Source: phase6-review-A R6-A-035. Only reachable with RendererConfig.DRAW_DURING_RENDERING, which nothing sets; a one-line entry.
- Old: vendor 63176-63183. New: src/editor/view/scene-widget.ts:945-951

### BF-128 Electron: a taken port shows the error box and quits (platform)
- Source: PROGRESS
- Old: electron-main.js:72-89 with routes/ws.js:11 (ws re-emits EADDRINUSE with no listener: "A JavaScript error occurred in the main process", no window, the single-instance lock stays held). The main app still has this bug after #6 (1090be4a); `wss.on("error", ...)` in routes/ws.js would fix it there.
- New: next/electron/main.ts:22-46 (no WebSocket server; the handler shows "Port 47823 is already in use..." and quits). No unit test.
- Parity: electron/port-in-use (not enabled; the electron suite runs only against the old app so far). Needs a `.fixed` with the showErrorBox event, timedOut false and the exit code.

## Not BUGS-FIXED: removed features (REMOVED.md, DROP-NNN)

- File > Save of a new document without the File System Access API: the old app threw "gravit-cloud.save-as not registered"; the port downloads through Save As (Q-222, save-action.ts:103-125). Scenarios: platform/files/save-new-without-fsa (enabled in untracked platform.json), editor-actions/dialogs/file.save, file.save--ctrl-s (not enabled).
- Service worker precache (public/cacher.js, frozen at build 8795): the port has no service worker (browser-container.ts:7-8, PORT-PLAN.md:1287). Scenarios: platform/pwa/service-worker, platform/pwa/cacher-precache.

## Not clear bugs: keep as they are

Each keeps its QUESTIONS.md entry (or gets one).

Engine
- Q-011 end-block throw: needs a caller that ends codes in another grouping; none exists.
- Q-012 GLength.toString "5undefined": nothing displays it.
- unpackNumbers extra entries: no callers.
- makeClockWise on a bare container: callers pass scene nodes.
- Q-023 / Q-029 DEBUG in clone: only malformed vertex data reaches it; the knife passes real paths (probed). getPathLength and QuadTree.clear: no callers.
- Compound path hit test needs an update, addGraphLine refuses a Path: every app flow runs the update; editor callers pass path bases.
- "Rectangle Default" `_sdf`: the feature "new shapes take the selected shape's style".
- Q-015, Q-030: port-side deviations without visible effect.
- Q-018 / Q-019 pip policy: the traversal is built on odd-even; no caller passes 0.
- Q-022 image tracer zeros: fixed options only.
- Q-024 offset 0 crash: no caller can pass 0.
- Q-026 unset cut point: the segment is always dropped.
- Q-028 degenerate fit: the straight segment passes the error check; a fix only re-shapes strokes.
- Q-031 shared fx cache, Q-032 index without +1: no visible effect found.
- Q-033, Q-036, Q-040, Q-046, Q-047, Q-048, Q-049, Q-052, Q-053: unreachable or no effect.
- Q-035 pending content property: no path sets content before a workspace.
- Q-038 font listener: harmless without a workspace, undo relies on it.
- Q-042 MAXLENGTH surrogate: needs an emoji at exactly 8192.
- Q-043 recorder undo of attachPath: the editor undo restores it by other means; recheck only if seen.
- Q-044 oblique as strikeout: unreachable (importers map oblique first).
- Q-051 blocks without next: gives two valid adjacent lists.
- Q-054 scene ms, Q-055 VisualProperties, Q-056 selector, Q-057 nested transactions, Q-058 page shadow: unreachable from the app.
- Q-059 rebuild moves the master: nothing calls synchronize(null, true).
- Q-060 sibling map, Q-061 swap pair: no visible effect, no UI path.
- Q-064, Q-065, Q-066: broken files only, a temporary preview, or a stale outline the editor refreshes.
- Q-068 to Q-071 dictionaries: small leaks or unreachable.
- Q-073 / Q-074 annotation slips: the annotation tools and sidebar aren't active in the new app.
- MultiEffect padding order: the only multi effects pad equally.
- ltag reader throw: no real font has those bytes.

Editor
- StyleEdManager cursor update: dead code (no caller).
- Q-186 rotate cursor outside the box: rotation works, only the cursor shape differs.
- Q-188 segment drag at slope 0/1: needs a segment over ~5000 px, no crash.
- Paths graph (Q-194 to Q-198, align throw, render error): the tool isn't in the tool table and nothing creates a paths graph. If loaded graphs should work, Q-194 (can't drag one) is the one to fix.
- Ctrl+B / Ctrl+I "handled twice": not double handling; the effect is late Bold/Italic font loading (PROGRESS line should be corrected).
- Q-120, Q-123, Q-124, Q-125, Q-126, Q-127: names, rare near guides, annotation-only, or no effect.
- Q-128 focus not restored, Q-129 margin repaint, Q-130: no visible effect found.
- Q-132 to Q-136, Q-138 to Q-142: harmless nudges, dead code or repaint-area details.
- Q-143 un-bold needs a Regular variant: avoids switching to a missing variant.
- Q-144 to Q-150, Q-152 to Q-156: no visible effect, unreachable or undo names in the English-only app.
- Q-157 freehand digits set `_bop`: the document doesn't change; if touched, remove the handler rather than invent opacity.
- Q-158, Q-159 pen exit and cursor: cosmetic.
- Q-160 knife cuts at every release: by design; Alt builds a polyline.
- Q-161, Q-164 to Q-167: dead code.
- Q-172 pinch centre: correct in the app (pageX fallback runs).
- Q-173, Q-174, Q-177 to Q-182, Q-187: no effect, unreachable, or debounced.
- Q-175 annotation exceptions: no other users and annotations aren't selectable.
- Q-191, Q-192: naming and the dropped collab editors.
- Q-199 subselect to pen, Q-200 Alt on the end point: nothing lost, design choice.
- Q-201, Q-202: no visible effect or unreachable.
- Q-171 Chinese default font: Han text gets CJK SC on edit and paste; enabling the branch is a feature change.

IO
- Q-078 nested svg name/style: children inherit the style.
- SVG whose root isn't `<svg>`: the tab shows "Loading has failed"; only the reason is missing.
- Q-089 /Length1 and the ignored compress/version options: readers tolerate it; the app always passes the defaults.
- Exporting the same page array twice: the app builds a new array each time.
- Q-096 fallback ZIP: unreachable (no storage can choose a directory).
- Q-097 zip addData: no caller.
- Q-100 Sketch event blocks: same geometry.
- Q-105 EPS show without font name: the worker throws first; only an empty name reaches it.
- PS worker's own timeout: the page's 300 s timer still ends the import (and BF-071 removes the waits).
- Q-106, Q-107, Q-112: malformed input only; BF-071 turns their hang into an error.
- Q-111, Q-113, Q-115, Q-116, Q-117 and the rest of Q-109, Q-110, Q-114: deviations from PostScript with no real file known to hit them.

App UI
- Settings keys saved as undefined and the "inverted" rows: no visible effect (defaults restored on start), and the rows match their labels (PROGRESS line should be corrected).
- Simplify keeps straight segments: the action refits curves only.
- Menu Copy alert without clipboard permission: true and only when the system write fails.
- Closing documents leaves the view unpainted: only seen through the parity hook; recheck from the tab close button.
- Send to Back past AlwaysBack, insertElements dropping annotations, layer `cls` colour: nothing in the app sets AlwaysBack, annotations only from old files, cosmetic.
- Q-001 to Q-010: product decisions.
- Q-205 to Q-207, Q-210 to Q-216, Q-218, Q-222 to Q-228, Q-230, Q-231, Q-234, Q-237 to Q-244, Q-247, Q-250 to Q-252, Q-255 to Q-258, Q-260, Q-261, Q-263 to Q-267, Q-269 to Q-271, Q-273, Q-278, Q-280, Q-282, Q-284, Q-286 to Q-290, Q-292, Q-295 to Q-299, Q-303 to Q-307, Q-311, Q-314, Q-315, Q-317 to Q-323, Q-326, Q-327: harmless, cosmetic, unreachable, recorded look the user is used to, or decided as kept in the entry.
- Q-232 unchanged renames, Q-233 double change: empty transactions are dropped, no extra undo step.
- Q-235 menu info, Q-236 inline SVG icons: no action has info; the icons never showed in the old app either.
- Q-262 notification HTML: no caller besides the parity hook.
- Q-268 transform panel: unreachable.
- Q-272, Q-279, Q-283 wrong tooltips and undo label: text only (Q-283 is a one-line fix if wanted).
- Q-275 line height 4/3: no single constant is right; a design question.
- Q-276 Infinity weight: practically unreachable.
- Q-277 font size list labels: the port already shows px (pt and px are equal here); note it as a deviation in Q-277.
- Q-285 shadow blur ranges: the class ranges equal the defaults.
- Q-302 Alt-drag selects originals: only when modifiers disagree with the drop event.
- Q-309 page size tooltips: plain tooltips still show.
- Q-313 export chooser: closes with the dialog anyway.
- Q-316 remembered settings: only a remembered default changes.
- Image grid restored images outside the Images container (R4-D-508): no UI creates a grid, painting is unaffected.
- SVG export of a whole Scene with a gradient page background (svg-export.ts:1822): the app exports pages, slices and selections, not scenes; check reachability before treating it as a bug.
- Backspace/Delete remove one UTF-16 unit of an emoji (R6-B-029, inline-text-editor.ts:538-560): probably a bug (lone surrogate in the text); confirm GTL ordinals are code units first, then move it up.
