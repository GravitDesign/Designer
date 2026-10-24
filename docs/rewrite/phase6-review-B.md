# Phase 6 review, group B: element editors, path editors, text and style editors

Scope: the clusters editor-element-editors, editor-path-editors and editor-text-style-editors (32 old modules, next/src/editor/element-editors/). Every old module was walked method by method against its new file. All unit test files in the folder pass.

Summary: the ports are faithful. One real behaviour difference was found (R6-B-001, text box resize applies the scale twice). Everything else is untested branches and small style items.

The parity "ported" lists for these three clusters (next/parity/ported/editor-element-editors.json, editor-path-editors.json, editor-text-style-editors.json) are empty. Element editor behaviour is covered only by the unit tests next to each file and by editor-tools scenarios ported under the tool clusters (editor-tools-base, editor-tools-select, editor-tools-path, editor-touch, editor-core). Scenarios that reach these editors and are ported: pointer/resize-*, pointer/rotate-*, pointer/transform-box-*, pointer/multi-selection-overlay, the subselect scenarios (29, rectangle/ellipse/polygon handles, path points), textedit/*, editor/text-hotkeys-inline, editor/text-direction-*, extra/ime-composition, extra/compound-path-whole-transform, eledit/group-*, eledit/layer-*, eledit/adaptive-outline-*, eledit/many-sub-path-editors-*, eledit/slice-*, program-lock-*, most crop/*, editor/connector-tool. Not ported: all 11 gradient scenarios, all page scenarios, symbol scenarios, catch-handle-*, pattern-drop-on-border-and-fill, page-resize-relayouts-anchored-child, compound-shape-resize-and-boolean-op, extra/compound-path-points, subselect/delete-points, subselect/align-points, crop/finish-crop-action, crop/cancel-crop-action.

Modules with no findings at all: GBaseEditor, GBlockEditor, GLayerEditor, GRectangleEditor, GPolygonEditor, GImageGridEditor.

## High

### R6-B-001 (high): resizing a text box applies the resize twice (source box and trf)
Old: public/chunk.vendor.js:68450-68456 (calls the mixin at 116424)
New: next/src/editor/element-editors/text-editor.ts:530-532
What differs: the old code calls `B.Transform.prototype.preTransform.call(this._element, this._preTransform, !1, n)`, the plain GElement.Transform mixin method, which only transforms children and so does nothing for a text. The new code calls `this._element.preTransform(...)`, which dispatches to Shape.preTransform and multiplies the resize into `trf`. Every handle drag goes through BoxEditor.movePart, transformBox and BlockEditor._setPreTransform, so `_preTransform` is the resize transform whenever this branch runs. The text gets its source box resized by transformSourceBBox and then the same scale again in `trf`. A scratch Vitest run (kept outside the repo) with "Hello world", resize(BOTTOM_RIGHT, (50,30)) and applyPartMove gives a 159×57 source box (correct) but trf sx=1.4587, sy=2.1015 (should stay 1) and a 232×120 geometry box. The scale-contents bottom-right path doubles the same way. Users see text boxes grow far past the handle, and the saved `trf` is wrong.
Fix: call the mixin method directly, as the old code did, through the Element.Transform mixin exported from next/src/engine/scene/element-transform.ts (e.g. `Element.Transform.prototype.preTransform.call(this._element, this._preTransform, false, extra)`), with a comment that it skips Shape.preTransform on purpose. Add a unit test that drives resize() or movePart before applyPartMove and asserts that `trf` keeps scale 1. The current tests set the preview's trf by hand, so `_preTransform` stays null and they can't catch this.

## Medium

### R6-B-002 (medium): no scenario covers a real text box handle resize
Old: public/chunk.vendor.js:68380-68470
New: next/parity/scenarios/editor-tools/cases-text.ts:434 (textedit/resize-handles-turn-off-auto)
What differs: the scenario presses at (205,127), which misses the handle. Its expected file records a move ("Transform Selection" undo step, trf 100,100 to 155,133, box unchanged), so EDT-TEXTEDIT-005 is not exercised. That is why R6-B-001 went unnoticed.
Fix: press on the right-center or bottom-right handle of the HELLO text (about x=209/210), re-record, and probe `w`, `h` and `trf` with `doc`. Add a case that drags the bottom-right handle with `sc` set.

### R6-B-003 (medium): untested branches in the text editor
Old: public/chunk.vendor.js:68254-68310, 68340-68360, 68232-68250, 68617-68629, 68904-68949
New: next/src/editor/element-editors/text-editor.ts:419-451, 552-555, 262-299, 723-734, 1036-1102
What differs: nothing found by reading, but no test reaches:
- the text-on-path distance handle drag (movePart writing `tpthl` through the inverse path transformer, the `$tpthl` reset in _applyPartMove)
- the contentChangedHandler write-back in _attach (transaction skipped with `noTransaction`, the `afs` adaptFontSizeToFitBBox call)
- the preview box of a non-scaling resize or rotation (_getBBox, _getBoxParams mirroring signs, _paintResizeBoxOutline)
- the rotation handle branch of _applyPartMove
Fix: unit tests for the distance handle drag (resulting `tpthl`) and the contentChanged write-back with and without a transaction; a screenshot scenario of a resize preview on a rotated text.

### R6-B-004 (medium): layout relayout after a part move or transform has no test
Old: public/chunk.vendor.js:7201
New: next/src/editor/element-editors/element-editor.ts:321
What differs: _prepareApplyPartMove, _finishApplyPartMove (relayout branch and the noRelayout branch that multiplies the rotation into the children's hatrf/vatrf), _prepareApplyTransform and _finishApplyTransform match the old code, including the 1e-10 checks and when _oldBBox is cleared. No unit test or ported scenario reaches them; page-resize-relayouts-anchored-child is not ported. This code keeps anchored children in place when a page or frame is resized or rotated, so a regression changes files.
Fix: unit tests in element-editor.test.ts with a page holding anchored children: resize via applyPartMove passes new and old box to _layoutAnchorContents; size unchanged within 1e-10 does not relayout; rotation with partData.noRelayout multiplies hatrf/vatrf by the layout transform (or identity when null); applyTransform with only _transform and only _preTransform passes _layoutTransform. Then port the scenario.

### R6-B-005 (medium): symbol master resize and instance propagation are untested
Old: public/chunk.vendor.js:237777-237924
New: next/src/editor/element-editors/symbol-editor.ts:123-136, 256-448
What differs: the non-force branch of _applyTransform (resize via stored move data, frame resizing, layout transform copied from the saved preview, in-master blockEv handling, _transformSiblings opening and closing instance editors) has no test. Also untested: transformBox, getCustomBBox, getPEGeometryBBox, _geometryChange, the preview branch of canApplyTransform. Only the label drag (force=true) is tested. editor-actions/symbols/resize-master-updates-instance, drag-master-label and eledit/symbol-instance-overlay are not ported. This code rewrites instance frames in files.
Fix: a unit test that resizes a master with one instance through transformBox and applyPartMove on a resize handle, asserting the instance frame and that blockEv is restored. Port resize-master-updates-instance when phase 7 provides the action.

### R6-B-006 (medium): compound path part editing has no test
Old: public/chunk.vendor.js:45589 (partial _applyTransform), 45699 (updateOwnedPartsSelection), 45716 (updatePartSelectionUnderCollision), 45745 (deletePartsSelected), 45820 (_geometryChange)
New: next/src/editor/element-editors/compound-path-editor.ts:121, 271, 296, 341, 389
What differs: code matches, but nothing exercises: transforming only the sub-paths with a part selection; deletePartsSelected removing fully selected sub-paths and calling exchangeElements when one is left (document and undo change); updateOwnedPartsSelection with and without toggle; updatePartSelectionUnderCollision; _geometryChange releasing sub-path previews. extra/compound-path-points is not ported.
Fix: port extra/compound-path-points, or add unit tests: delete one of two fully selected sub-paths (stub exchangeElements, called with noSelect true); partial transform moves only the selected sub-path; updateOwnedPartsSelection without toggle keeps only the last part.

### R6-B-007 (medium): compound path removeFlag and alignParts are untested
Old: public/chunk.vendor.js:45863 (removeFlag), 45796 (isAlignPartsAllowed/alignParts)
New: next/src/editor/element-editors/compound-path-editor.ts:443, 367
What differs: code matches. The removeFlag rules (clearing ResizeAll takes Outline off the children; Outline stays while ResizeAll is set) are never asserted; alignParts is never called.
Fix: unit test: set Selected and ResizeAll, children have Outline; remove Outline, children keep it; remove ResizeAll, children lose it. Plus one alignParts call.

### R6-B-008 (medium): path editor delete, align and symbol-instance guard have no coverage
Old: public/chunk.vendor.js:29605-29696
New: next/src/editor/element-editors/path-editor.ts:1415-1518
What differs: code matches (the double symbol-instance search moved into a shared helper with the same loop). No test runs deletePartsSelected, alignParts or movePoint (including its handle translation branch), or _canDeletePart returning false for a point the symbol master also holds. subselect/delete-points and subselect/align-points need app actions.
Fix: unit tests calling deletePartsSelected and alignParts(…, x, null) on a transformed path and on a point with handles, and one with a path inside a symbol instance asserting the point is kept and isDeletePartsAllowed counts it as not deletable.

### R6-B-009 (medium): centred border logic for lines has no coverage
Old: public/chunk.vendor.js:28441-28459, 30084-30099
New: next/src/editor/element-editors/path-editor.ts:279-298, 1981-1999
What differs: code matches. Untested: filterFlags in simple line mode (drops ResizeAll and RotateHandle); _handleFinishDrawing, _setBorderAlignmentToCenter and _afterInsert setting `_ba` to Center on a multi-point line when defaultBorderPositionForLines is on; _geometryChange releasing the preview. A wrong import here changes saved `_ba` values.
Fix: unit tests: a two-point line in simple line mode never gets ResizeAll; with SceneOptions.defaultBorderPositionForLines on, ResizeAll on a three-point open line or inserting a BorderPaintLayer gives `_ba` = Center; a GeometryChangeEvent After drops _elementPreview.

### R6-B-010 (medium): partial path preview building and extending only covered through pixels
Old: public/chunk.vendor.js:29719-29885
New: next/src/editor/element-editors/path-editor.ts:1548-1714
What differs: identical code. The unit tests always extend to the full preview right away, so the run detection in _createPathPreviewIfNecessary (related points, reset when only one end found, reset on non-contiguous selection, opening a closed path) and the insert-before-and-shift branches of extendPreviewToFull are only checked by drag-anchor screenshots.
Fix: select a middle point of a five-point closed path, call _createPathPreviewIfNecessary(), check point count, closed flag and _sourceIndexToPreviewIndex; then extendPreviewToFull and check every source index maps to the right preview index.

### R6-B-011 (medium): no gradient parity scenario is ported
Old: public/chunk.vendor.js:53942-54380, 107832-109266
New: next/parity/scenarios/editor-tools/cases-eledit.ts:221-412
What differs: the 11 gradient scenarios (linear add/slide, end snaps, shift constrain, overlay; radial hover, three drags, end with shift, extra-handle toggle, overlay; angular handles, overlay) all start from openFillChooser (inspector, phase 7) and none is ported. Painting is only checked by call counts in gradient-editors.test.ts; colours, alignHandlePoint offsets, the 0.6-opacity shadow strokes and the angular circle transform were never compared with the old app's pixels.
Fix: add an interim app hook that activates the style editor for a fill's `_pt` directly so overlay shots and drag probes can run now, or port them as soon as the chooser exists.

### R6-B-012 (medium): radial gradient movePart branches untested
Old: public/chunk.vendor.js:108232-108275, 108320-108378
New: next/src/editor/element-editors/radial-gradient-editor.ts:409-439, 479-526, 360-372
What differs: code matches. Untested: the y-leading end drag (!_xLeading: scale on y, skew c = dx/dy, defaultEps when dy is 0); the middle-stop slide (projection, snapping to 0/1 within DEFAULT_EPS, _synchIdx); stop 0 at position 0 acting as the focal handle; Shift on START and on the x-leading END.
Fix: unit tests: toggle to y-leading then drag END and check pivots[2] and skew; drag a middle stop including the clamp; drag stop 0 and check `_fx`/`_fy`; drag END with shift and check the 45° constraint.

### R6-B-013 (medium): angular gradient middle-stop drag and paint untested
Old: public/chunk.vendor.js:108719-108758, 108537-108632
New: next/src/editor/element-editors/angular-gradient-editor.ts:310-343, 66-163
What differs: code matches. Untested: the middle-stop branch (atan2, +PI2 wrap below _a0, clamp 0..1, _synchIdx), Shift around the centre, and paint (centre-to-end line, unit ellipse through (0.5,0,0,0.5,fx,fy) × composite × view, cross condition, big selected stop). An off-by-PI error would hide in the wrap.
Fix: a test dragging a middle stop past the start angle (wrap and clamp to 1), one with shift, and a recording-context paint test like the radial one.

### R6-B-014 (medium): page editor has no ported scenario and several untested branches
Old: public/chunk.vendor.js:57724-57972 (57750, 57804, 57826, 57850)
New: next/src/editor/element-editors/page-editor.ts:84-312
What differs: code matches. No page scenario is ported (eledit page-label-*, page-resize, page-selected-overlay, page-resize-relayouts-anchored-child, editor/page-decoration, editor/active-page-by-mouse, extra/multi-page-toggle). For page-label-select-and-drag the old app itself differs from the expected file, so the expected files look stale. Untested: the shift-drag collision-less branch passing the option to doCollisionlessTransform, the relayout on scale in _prepareApplyTransform, _applyTransform onto another page, getCustomBBox growing by the label height and falling back to the label box, MOVE_MASTER with hasLinks, SWITCH_ORDER reorder.
Fix: regenerate the page expected files and port them; until then unit tests for shift-drag, relayout, cross-page _applyTransform and getCustomBBox.

### R6-B-015 (medium): scene editor and selection position editor page-offset branches untested
Old: public/chunk.vendor.js:79144, 79272, 79535 (scene editor); 102089, 102129, 102198 (selection position editor)
New: next/src/editor/element-editors/scene-editor.ts:146-184, 290-308, 410-492, 581-627; selection-position-editor.ts:156, 203, 313
What differs: code matches, but all tests run with the active page at 0,0 and multiPageView off. Untested: the canvas origin shift in paint, the pageTransform passed to requestInvalidation, the page translation in updateTBoxUnderMouse, getTBoxPartInfoAt and _updateSelectionTransformBox, and the per-page transform remapping in SelectionPositionEditor.edTransform when isMultiPage is set. Also untested in the scene editor: _geometryChange applying a pending centre transform, afterTBoxChange on the transaction recorder, the annotation margin in getBBox, snap-zone painting. A selection on a second page is the normal case in a multi-page document.
Fix: unit tests with an active page at a non-zero position (multiPageView on and off) checking requestInvalidation args, box translation, hit testing, and that each element editor gets toPage·T·toPage⁻¹ in movePart; one test each for _geometryChange (After) and afterTBoxChange.

### R6-B-016 (medium): text elements in a multi-selection are untested
Old: public/chunk.vendor.js:102154 (_getBBox), 102168 (_paintResizeBoxOutline)
New: next/src/editor/element-editors/selection-position-editor.ts:233, 251
What differs: code matches. The branch that unites a Text editor's bbox into the selection box, and draws the outline with an identity transform around the united view rect, is never reached.
Fix: unit test with a rectangle plus a Text selected; assert _getBBox includes the text editor's box and _paintTransformedQuadrilateral gets identity and the united rect.

### R6-B-017 (medium): adaptive resize handles have no test
Old: public/chunk.vendor.js:15218 (_getResizeHandlesBBox), 14969 (_getResizePartInfoOffsetAt)
New: next/src/editor/element-editors/box-editor.ts:774, 492
What differs: code matches. EditorOptions.adaptiveResizeHandles defaults to false and nothing turns it on, so the grown handle box for small boxes, the offset in resize part data and movePart adding it are untested. This is the riskiest arithmetic in the box editor.
Fix: unit test with adaptiveResizeHandles on and a box of about 5×5 view px: assert handle positions, the offset in the hit part data, and that a zero drag gives an identity resize.

### R6-B-018 (medium): transform box skew and rotate annotation handles untested
Old: public/chunk.vendor.js:79744-79790 (paint), 79855-79905 (getPartInfoAt)
New: next/src/editor/element-editors/transform-box.ts:248-284, 381-428
What differs: code matches. tranformBox.skew.enabled and tranformBox.rotate.enabled default to false, so the SKEW_HORIZONTAL/SKEW_VERTICAL hits, the rotate handle hit (overriding an earlier hit, a kept quirk) and the outline not counting as skew when skew annotations are on are untested.
Fix: unit tests with each option on, hitting the skew and rotate handle points; check no OUTLINE part with skew annotations enabled.

### R6-B-019 (medium): inline text editor IME composition keys and range replace untested
Old: public/chunk.vendor.js:103152-103230, 103558-103583
New: next/src/editor/element-editors/inline-text-editor.ts:383-396, 430-526, 820-846
What differs: code matches. extra/ime-composition only composes "k", "ka" and commits "か" at a collapsed caret. Untested: Left/Right/Home/End while composing (_compositionSelectionDelta, skipping the apostrophe IMEs insert between syllables), composing over a non-collapsed selection (setText range replace), Ctrl+Z/Y swallowed while composing, other keys returning undefined. The delta arithmetic in _keyPress (start - delta + text.length - lastLength) is the likely regression point.
Fix: unit tests calling _compStart, several _keyPress({target:{value}}, true), then _handleKey(LEFT/HOME/END) with an apostrophe in the composed text, checked against values worked out from the old code; one case with a range selected before _compStart.

### R6-B-020 (medium): inline text editor list keys, Ctrl+I and isSelectionHit untested
Old: public/chunk.vendor.js:103262-103285, 103041-103054, 103351-103373, 103700-103712
New: next/src/editor/element-editors/inline-text-editor.ts:572-594, 273-283, 669-682, 1064-1075
What differs: code matches, but no test text has a list: Enter in a list (createListItem, or unlistify on an empty item), Tab/Shift+Tab (increaseList/decreaseList), _isSelectable stopping the caret before the list marker (also guards _changeLine). Also untested: Ctrl+I checking an italic variant exists before committing, and isSelectionHit.
Fix: unit test with a bulleted paragraph (Enter on non-empty and empty item, Tab, Shift+Tab, Up onto the list start); Ctrl+I with and without an italic variant (no transaction expected without); isSelectionHit inside and outside a range.

### R6-B-021 (medium): catch handle painting and drag only checked by a hit test
Old: public/chunk.vendor.js:51577
New: next/src/editor/element-editors/item-editor.ts:76
What differs: code matches (_postPaint identity fallback, transform order, paintAnnotation with WHITE and selectionOutlineColor). catch-handle-overlay and catch-handle-drag are not ported; item-editor.test.ts only tests _getPartInfoAt.
Fix: port the two eledit/catch-handle-* scenarios, or spy on EditorAnnotation.paintAnnotation and check point and colours.

### R6-B-022 (medium): pattern drop transaction and default style lookup not covered
Old: public/chunk.vendor.js:30165, 30196
New: next/src/editor/element-editors/shape-editor.ts:126, 152
What differs: code matches. pattern-drop-on-border-and-fill is not ported. getDefaultStyle (the `style[_sdf="<typeId>"]` lookup falling back to Shape's type id) and initialSetup without a source shape are untested, and every newly drawn shape goes through them.
Fix: test with scene styles holding a style with `_sdf` set to Rectangle's type id, then Shape's; check the copied properties, layers and effects, and that commitTransaction gets "action.drop-pattern".

### R6-B-023 (medium): shape centre cross painting has no test
Old: public/chunk.vendor.js:30216
New: next/src/editor/element-editors/shape-editor.ts:170
What differs: code matches (floor + 0.5, extra 0.5 for odd outlineWidth, 2 × centerCrossSize threshold). Easy to break pixel snapping in a refactor.
Fix: unit test with Detail and Selected, _hasCenterCross returning true, checking strokeLine coordinates for odd and even outlineWidth.

### R6-B-024 (medium): compound shape outline and boolean op flow not covered
Old: public/chunk.vendor.js:237277-237292
New: next/src/editor/element-editors/compound-shape-editor.ts:57-78
What differs: code matches. _paintOutline (own vertices through transformer and pixel aligner, highlight colour switch) is untested; eledit/compound-shape-resize-and-boolean-op is not ported.
Fix: recording-canvas unit test for highlighted and normal stroke colour, or port the scenario.

## Low

### R6-B-025 (low): text editor _paintOutline guards getEffects() where the old code didn't
Old: public/chunk.vendor.js:68839
New: next/src/editor/element-editors/text-editor.ts:973-975
What differs: old `u.getEffects().getFirstChild()` would throw without an effects node; new `?.` silently skips the brightness tint. Unreachable in practice.
Fix: drop the `?.` or note the guard in a comment.

### R6-B-026 (low): small null guards added in element, group and box editors
Old: public/chunk.vendor.js:7140, 102800, 15060
New: next/src/editor/element-editors/element-editor.ts:266; group-editor.ts:200; box-editor.ts:599
What differs: getPEGeometryBBox now checks `transform && box` and returns null where mapRect(null) threw. GroupEditor.resetTransform uses `?.resetTransform()` on an entry that can't be undefined. BoxEditor's resize handle paint reads `configuration?.multiPageView` (the value is unused), while SelectionPositionEditor paint (line 160) still reads configuration directly.
Fix: either comment the guards as deliberate or remove them; call resetTransform directly as LayerEditor does; drop the dead third argument of _iterateResizeHandles.

### R6-B-027 (low): comments point to "BUGS-FIXED candidates" that don't exist
Old: public/chunk.vendor.js:79331 (missing break after OUTSIDE), 237413 (`h * o[1]`)
New: next/src/editor/element-editors/path-editor.ts:74-75, 596-598, 1904-1905 and path-editor.test.ts:146; scene-editor.ts:347-351; slice-editor.ts:45-50
What differs: the path editor quirks are listed in PROGRESS.md ("From the phase 6 editor port"), not under that title. The scene editor rotation zone cursor quirk and the slice editor height × matrix[1] quirk are in neither BUGS-FIXED.md nor QUESTIONS.md (Q-135 is a different slice quirk). All quirks are correctly kept.
Fix: add QUESTIONS.md entries for the kept quirks and point the comments at the Q numbers.

### R6-B-028 (low): inline text composition state survives deactivation (kept quirk, undocumented)
Old: public/chunk.vendor.js:103425-103435, 102880-102899
New: next/src/editor/element-editors/inline-text-editor.ts:789-799, 178-194
What differs: same behaviour. text-editor.ts reuses the InlineTextEditor instance; if editing ends mid-composition, endCaptureInput removes the compositionend listener first, so `_compositionOn` stays true and the next session ignores Backspace, Enter, Delete etc. until a new composition starts.
Fix: keep it, record it in QUESTIONS.md.

### R6-B-029 (low): emoji and astral characters are deleted one UTF-16 unit at a time (kept quirk, untested)
Old: public/chunk.vendor.js:103231-103249
New: next/src/editor/element-editors/inline-text-editor.ts:535-560
What differs: same in both; Backspace, Delete and Left/Right step one ordinal, leaving half a surrogate pair. No test uses non-BMP text.
Fix: add a test pinning the current result so a later "fix" doesn't silently break parity.

### R6-B-030 (low): image editor bitmap pre-transform path untested
Old: public/chunk.vendor.js:56783, 56869
New: next/src/editor/element-editors/image-editor.ts:179-198, 250-260
What differs: code matches. Untested: ImageBoxEditor._applyPartMove calling preTransformImage/transformImage on resize or rotate, ImageEditor._applyTransform with _preTransform, ImageEditor.getBBox adding the inner box editor's box, the ImageBoxEditor preview. crop/finish-crop-action and crop/cancel-crop-action are not ported, and their old runs also differ from the expected files.
Fix: unit test that transformBox-es the ImageBoxEditor with a scale, applies it, and asserts the image transform; re-check those two expected files.

### R6-B-031 (low): simple shape editor painting and bbox untested, no scenario
Old: public/chunk.vendor.js:237451-237533
New: next/src/editor/element-editors/simple-shape-editor.ts:40-58, 131-151
What differs: code matches. getCustomBBox and _postPaint (all annotations drawn selected once ANNOTATION_PART_ID is selected) are untested; no parity scenario uses a simple shape.
Fix: a short unit test for both, or a subselect scenario on a library shape.

### R6-B-032 (low): ellipse initialSetup comment and test title describe the rule wrongly
Old: public/chunk.vendor.js:80845-80863
New: next/src/editor/element-editors/ellipse-editor.ts:158-161
What differs: code matches. The real rule is butt caps when there is no source, a non-ellipse source without paint layers, or a non-ellipse source whose paint layers include a border; an ellipse source never sets them. The comment and the test title say otherwise, and the ellipse-source branch is untested. The `(stylable.getPaintLayers as () => unknown)()` casts are hard to read.
Fix: rewrite the comment with the three cases and the ellipse exception, rename the test, add an ellipse-source case; type the source as `{ getPaintLayers(): PaintLayers | null }`.

### R6-B-033 (low): gradient base-class branches for other property holders untested
Old: public/chunk.vendor.js:54099-54122, 54200-54221, 54318-54329
New: next/src/editor/element-editors/gradient-style-editor.ts:304-324, 415-437, 524-542
What differs: code matches. All tests use a FillPaintLayer on a Rectangle. Untested: getEditorData's pagePattern and effectIndex branches, the Effect branch of _getCompositeTransform (geometry box instead of pattern box plus element transform), the parent walk in _getBBoxElem stopping at Group or Scene, LinearGradientEditor.resetPartMove.
Fix: tests with a gradient on an Effect, one with a page pattern, one for resetPartMove.

### R6-B-034 (low): connector editor gets an invented type name
Old: public/chunk.vendor.js:235700
New: next/src/editor/element-editors/connector-editor.ts:30
What differs: the old class had no G name; toString still inherits "[Object GPathEditor]", but registerClass gives it a type id "GConnectorEditor" that never existed. Matters only for lookups by type name; the comment explains it.
Fix: mention it in QUESTIONS.md next to the other naming deviations.

### R6-B-035 (low): code style nits
New: next/src/editor/element-editors/box-editor.ts:965, 977; path-base-editor.ts:57-64; compound-path-editor.test.ts:139, 145; path-editor.ts:107-110, 855-881, 1609, 2013-2021; inline-text-editor.ts:20-26, 298, 329, 737-747; style-editor.ts:78-86
What differs:
- stray blank lines inside parameter lists (box-editor _paintOutline/_paintResizeBoxOutline, path-base-editor edTransform), probably left from removed eslint comments
- compound-path-editor.test.ts uses `setFlag(2)` instead of NodeFlag.Selected
- path-editor goes through a local ConstrainEditor interface although Editor.convertToConstrain is typed (src/editor/editor.ts:521), and through EventHost casts that compound-path-editor and symbol-editor don't need
- inline-text-editor: the WEIGHT_NORMAL const sits between imports; _changeLine/_endOfline return `undefined as unknown as number`; _canHandleInput returns `unknown`; many repeated `as NonNullable<ReturnType<TLCore["getRange"]>>` casts
- StyleEditor.updatePartSelection has no old counterpart; it only widens the signature for the gradient editors' `noEvent` argument
Fix: run the formatter; use NodeFlag.Selected; call Editor.convertToConstrain directly and drop the casts; move the const below the imports, use honest return types and a local alias for the range type; say in the StyleEditor comment that the override exists only for typing.
