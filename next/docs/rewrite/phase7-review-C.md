# Phase 7 review, group C: inspector, color UI, layers and pages, library, symbols and export

Scope: every old module that port-map.tsv assigns to app-inspector-geometry, app-inspector-shapes, app-inspector-text-styles, app-inspector-paint, app-inspector-effects, app-inspector-document, app-color-ui, app-sidebars-layers-pages and app-library-symbols-export, compared function by function with next/src/app/inspector, color, sidebars, export, the two widgets (blend-select.ts, corner-type-select.ts) and next/src/engine/scene/simple-shapes.json, as of commit 04ee3eca. Module 1253 now lives mostly in next/src/io/export/exporter.ts and was read there.

Tests run, all passing: src/app/color (6 files, 50 tests); border, fill, appearance and blend-select (25); effect-properties (13); text-properties and designer-style-editor (31); inspector-sidebar and inspector-geometry (15); shape-panels, color-thief, image-crop, rectangle-properties (27); export-dialog, export-properties, page-properties, document-panels (31); virtual-tree, outline-sidebar, layers-panel (32); library-document, symbols-panel, symbols-sidebar, library-panel, simple-shapes (21).

The ports are close to line for line. Branch order, transaction titles, stats names, DOM classes, inline styles, float operation order and the recorded quirks match. Every locale key used in scope exists in src/app/locale/data/en.json (the one wrong key, GCommonNames/evenodd.non-odd, is the old one and sits in an unreachable branch). There is no jQuery and no minified names. The ready-shape data was evaluated from the old module and compared key by key: all 29 shapes and 364 expressions are identical, and library-elements.ts matches the old category table byte for byte. Cloud, Unsplash and Pro parts are dropped as REMOVED.md says and are not reported.

Two real behaviour differences were found (R7-C-101, R7-C-501), plus one construction-order bug in the virtual tree (R7-C-801). Most other findings are risky branches that no unit test or ported scenario runs; event handlers of the inspector panels are the weakest spot. Several parity scenarios have expected files but are in no ported list (ui/inspector ellipse, rectangle, polygon-advanced.dom, nothing, page-a4-mm, grid-on, grid-isometric).

## High

### R7-C-101 (high): color chooser drops the noEvent argument when it selects the stop on the canvas gradient editor
- Old: public/designer.browser.dev.js:69765-69789; the call at 69787 is `t.updatePartSelection(!1, n ? [n] : null, !0)`. GGradientStyleEditor.updatePartSelection (chunk.vendor.js:54090-54134) skips `this._manager.handleEditorPartUpdate(n)` when the third argument is set.
- New: next/src/app/color/color-chooser.ts:1950-1965. Line 1963 says "Old: a third argument (true) that the editor doesn't take" and line 1964 calls `editor.updatePartSelection(false, part ? [part] : null)`.
- Differs: the comment is wrong. next/src/editor/element-editors/gradient-style-editor.ts:255-300 and radial-gradient-editor.ts:295 take noEvent and, without it, call handleEditorPartUpdate, which fires StyleEditorEvent ActivePointChange. The open chooser listens to that event and runs _updatePatternFromActiveGradient. So with the canvas gradient editor active, every stop press or insert in the chooser (and setActiveGradientStopByIdx) echoes back and sends one more non-transient onPattern / "patternchange" with the same gradient, which the panel commits as an extra undo step. The old chooser never got this echo.
- Fix: pass `true` as the third argument (widen the editor type if needed), correct the comment, and add a unit test with a fake StyleEdManager that asserts no ActivePointChange and no extra onPattern after _updateOnlineEditorStops. It must fail on the current code.

### R7-C-501 (high): touch mode re-shows the appearance toolbar for the text panel instead of the slice panel
- Old: public/designer.browser.dev.js:55696 (`_ = n(1272)`, GSliceProperties; text is `b = n(1273)`), 56058, 56075
- New: next/src/app/inspector/inspector-sidebar.ts:467-470, 487-488, 510
- Differs: the old code remembers the toolbar of the panel that is `instanceof _` (the slice panel) and in touch mode sets it back to display "". The new code looks up tableString("TextProperties"). Both panels share the appearance toolbar. With a slice selected the appearance panel (not Stylable) hides the shared toolbar; the old app showed it again in touch mode, the new one leaves it hidden, so the slice panel's toolbar content and the "Appearance" title are missing.
- Fix: use tableString("SliceProperties") (or instanceof SliceProperties) and rename textToolbar to sliceToolbar. Add a test: touch on, slice selected, appearance toolbar has display "". Check it fails with the text lookup.

## Medium

### R7-C-801 (medium): a new VirtualTree never runs its first delayed render, because its class fields are set after super() returns
- Old: public/designer.browser.dev.js:19813, 20043-20045, 20072-20085, 20174-20181
- New: next/src/app/sidebars/virtual-tree.ts:401, 413, 427, 472, 513-515, 553-565, 669-671; virtual-list.ts:52-56
- Differs: the build target is ES2023, so class fields are defined after super() returns. The VirtualList constructor calls the overridden endUpdate, which calls requestInvalidation while `_invalidationRequestTimerId` is still undefined, so `null === this._invalidationRequestTimerId` is false and the 25 ms timer never starts. _updateScroller also runs with `_freeHeight` undefined and writes "NaNpx". The old fresh tree rendered after 25 ms, called renderFinishCallback and set the scroller height to freeHeight px. A tree that nothing invalidates after construction (for example the selected panel with no hits) now gets none of the three.
- Fix: declare the fields the base constructor reaches (`_invalidationRequestTimerId`, `_freeHeight`, `_renderFinishCallback`) with `declare` and prototype defaults, or call `this.requestInvalidation()` at the end of the VirtualTree constructor. Add a fake-timer test that checks the scroller height is `${freeHeight}px` after 25 ms and that renderFinishCallback ran.

### R7-C-401 (medium): language selector no longer stops on an unknown language tag
- Old: public/designer.browser.dev.js:93387-93407
- New: next/src/app/inspector/text-properties.ts:1954-1963
- Differs: openTypeLanguageSystemTagStringToBCP47 returns null for unknown tags, giving the key `text.lang.null`. In the old code GLocale.get returned undefined and `e.name.localeCompare` threw inside sort: the select kept only "Default" and _updateStylisticSetSelector never ran, so the stylistic set select stayed disabled and empty. The new text() returns "", these entries sort first with blank labels, and the stylistic set selector updates normally. Better, but not recorded, and untested.
- Fix: decide and record it in QUESTIONS.md. If the new behaviour stays, label unknown tags with the raw tag instead of "". Add a test with a font that has an unmapped language tag.

### R7-C-301 (medium): copy hint is now removed after its fade; the old one stayed in the panel
- Old: public/designer.browser.dev.js:84874-84896 (same pattern in border 74109 and fill 83331)
- New: next/src/app/inspector/effect-properties.ts:114-126, 683-696
- Differs: the old `s.animate({opacity: 0, top: "+=20"}, 500, s.remove)` calls remove with `this` set to the span, so jQuery removes nothing. The `.copy-info-overlay` span stayed at opacity 0, 20px lower, position absolute with z-index 999 and no pointer-events rule, catching clicks over that part of the panel until the next copy removed it. The new code removes it at animation end. Easing also changed (swing against ease-in-out). No QUESTIONS.md entry.
- Fix: keep the hint after the fade, or keep the removal and add one QUESTIONS.md entry covering effects, fill and border.

### R7-C-102 (medium): touch long-press "add to swatches" keeps undocumented quirks, has no tests, and its comment is misleading
- Old: public/designer.browser.dev.js:159143-159216 (initContextMenu)
- New: next/src/app/color/pattern-chooser.ts:85-136
- Differs: the port copies the old logic, but three quirks are not in QUESTIONS.md and no test pins them:
  - withFirstStop always clones the current pattern; for a color or texture the pressed swatch is ignored and the current paint is added with the pressed swatch's opacity.
  - for a gradient, `_stops[0].color` is set to the swatch's whole `_pt`, which can be a gradient or texture.
  - a long press on the hex box always adds to the document scope, even from "Add to global swatches".
  The comment at line 103 describes only the gradient case. Nothing tests initContextMenu or the long-press handlers (color-chooser.ts:792-797, 1476-1481).
- Fix: add a kept-quirk QUESTIONS.md entry, fix the comment, add tests for a long press with a color current, with a gradient current, and on the hex input with the global item.

### R7-C-103 (medium): risky color chooser branches with no test
- Old: public/designer.browser.dev.js:69241-69275 (option-click on a swatch), 68859-68920 (texture "Choose image..." and "Paste"), 68746-68765 (desktop "Advanced" toggle)
- New: next/src/app/color/color-chooser.ts:1489-1509, 1310-1362, 1100-1105
- Differs: no difference found, but nothing exercises these. Option-click walks Overlay.of and PatternTarget.of, closes every `.g-overlay .pattern-chooser`, calls blinkSelection and dispatches a native click on the matching fill preview.
- Fix: fake-DOM tests: option-click (selection updated, overlays closed, preview clicked); paste with no shape (arrow-paste.alert) and with a group (texture with source "texture_paste"); choose image (openPrompt with enableFileTypes, result becomes a TexturePattern).

### R7-C-201 (medium): border panel's advanced stroke settings, drag and chooser events are untested
- Old: public/designer.browser.dev.js:73136-73537, 74285-74330, 74458-74633, 74873-74994
- New: next/src/app/inspector/border-properties.ts:521-762, 926-1050, 1170-1223, 1463-1546
- Differs: code matches, but border-properties.test.ts only checks the advanced panel's structure. Untested: miter limit (ignored unless join is miter, value <= 0 re-renders); dash parsing dropping negative and unparsable boxes; the custom "#" marker and `select.value || null`; arrow paste and its alert; Inside/Outside disabled with "border-alignment.disabled" when mixing open and closed shapes; drag reorder, Shift-duplicate, drag-out delete; chooser open/close, overlay lock and CDR warning; _styleEditorChange suppressing _updateProperties.
- Fix: tests that change each advanced field and assert layer properties and undo title; an open path plus rectangle for the disabled alignment buttons; a Shift drag that checks the clone and its index.

### R7-C-202 (medium): fill panel's drag, chooser and undo re-open paths are untested
- Old: public/designer.browser.dev.js:83064-83127, 83645-83822, 83851-83896, 84091-84103
- New: next/src/app/inspector/fill-properties.ts:172-189, 493-612, 733-786, 924-939
- Differs: code matches, untested: the fill-rule toolbar buttons (`.completely-fill`/`.winding-fill` across the document, evenodd); drag reorder, duplicate, delete; patternchange with fromChooser writing fillLayerIndex/activeStopIdx into the transaction data; the undo/redo branch that re-opens the chooser at the stop through clickPreview (the only panel where this works, since border throws by design, Q-291); the touch slider re-firing change on `.fill-op` (0 falls back to the box value).
- Fix: test patternchange then undo with chooserOn data and assert the chooser opens at stopIndex; tests for the rule buttons, the touch slider and drag.

### R7-C-203 (medium): appearance panel's opacity slider, sync button and shared-style states are untested
- Old: public/designer.browser.dev.js:72624-72692, 72797-72818, 72914-72922, 72957-73002
- New: next/src/app/inspector/appearance-properties.ts:202-266, 126-137, 324-334, 377-410
- Differs: code matches; tests cover only opacity and blend display, blend write and "No Shared Style". Untested: slider input (temporary setProperty that also updates the box); box change dividing by 100; sync button (assignStyleFrom, preview image, g-disabled); several elements with a shared style ("multiple-selection", g-disabled); the parts-editor path in _updateProperties/_assignProperties; _afterFlagChange for a selected PGEdge or PGFacet; the touch refresh icon.
- Fix: tests for each, with a stub element editor that has getPartsProperty/applyPropertiesToParts.

### R7-C-302 (medium): effect drag reorder, duplicate and drag-out delete have no test
- Old: public/designer.browser.dev.js:84544-84689, 85172-85179
- New: next/src/app/inspector/effect-properties.ts:438-574, 104-111
- Differs: matches by reading, but nothing covers: the mousedown drag gate; the touch header check in dragstart; canDropOn with Shift on the same effect; drop moving up and down (`target.getNext()` against `target`); Shift-drop cloning; dragend removing the effect and its equals on every selected element when nothing was dropped; drop clearing `dragged`.
- Fix: Vitest cases on two rows asserting effect order, undo name ("action.move"/"action.duplicate"), the Shift clone, and removal across two selected elements after a dragend without drop.

### R7-C-303 (medium): effect form edits, undo data and chooser reopen have no test
- Old: public/designer.browser.dev.js:84805-84849, 84914-85018, 85180-85504
- New: next/src/app/inspector/effect-properties.ts:628-670, 718-803; effect-forms.ts:360-666
- Differs: untested: the temporary assign path (5th argument true), the _ownChange guard, commitTransaction with `{effectIndex, ...related}`; _updateEffect after undo/redo reopening the chooser at activeStopIdx; the WebGL form conversions (normalizeValue for hue, saturation, contrast, brightness; propertyTransform/Inverse with toFixed(3); the JSON copy of `shp`; recolour hue redrawing the saturation slider); the overlay chooser's style-editor lock path.
- Fix: per-form Vitest cases with a real Document: change input or slider, assert property values and transaction data, then undo and assert the chooser of the row at effectIndex opens.

### R7-C-402 (medium): text panel _updateProperties has no unit test
- Old: public/designer.browser.dev.js:92784-93361
- New: next/src/app/inspector/text-properties.ts:1430-1913
- Differs: no difference found, but every test mocks _updateProperties and parity only screenshots one default text. Untested: two texts with different families; the weight/style intersection with the `prefix##` rewrite; the "mixed" weight when `_tfw`/`_tfs` is multipleValues; the fake-text family from hasFontsToResolve (missing fonts); SmallCaps and fractions disabled for unresolved fonts; list markers; the on-path row; "%" against unit display for line height and paragraph spacing; chooser reopen after undo; the early return when getFont gives null.
- Fix: tests with a fake FontsPanel covering two families and weights, a fake text, a multipleValues weight and undo data that clicks `.preview`.

### R7-C-403 (medium): font assignment paths untested
- Old: public/designer.browser.dev.js:93617-93637, 93672-93786
- New: next/src/app/inspector/text-properties.ts:2157-2172, 2199-2307
- Differs: untested: _assignFont waiting for the weightsForFont callback; _assignFontMain on a fake text (replaceFonts with all run families); the per-run style/weight correction with its two early breaks; skipping a Style when getFont is null; copying the default style back through the element editor; all of it in one "action.modify-text-properties" transaction.
- Fix: a test with runs mixing italic and bold assigned a family that has neither, checking `_tfs`/`_tfw` and one undo step; a fake-text test checking the replaceFonts map.

### R7-C-404 (medium): Noto font switch and fake-text inline editor flow untested
- Old: public/designer.browser.dev.js:92653-92728
- New: next/src/app/inspector/text-properties.ts:1298-1361
- Differs: untested: _tryModifyingInitialFont switching to the Noto family for the typed script and setting `dir` for right-to-left scripts (on BeforeClose with getWasEdited, or TextEdited when wasModifiedBefore is false, skipped when `_we` is set); _tryOpenInlineEditor's confirm, replaceFonts in a "Replace fonts" transaction and the `_openingInlineEditor` guard.
- Fix: fire TextEdited with Arabic or Hebrew content (expect `_tff` and `dir`) and with Latin content; a fake-text TryOpen test stubbing SystemDialog.confirm.

### R7-C-405 (medium): text formatting, marker and unit-switch handlers untested
- Old: public/designer.browser.dev.js:91560-91624, 91750-91801, 93582-93613, 93638-93671
- New: next/src/app/inspector/text-properties.ts:1001-1046, 1092-1119, 2136-2151, 2175-2193
- Differs: the conversion helpers are tested, the handlers are not: line height and paragraph spacing unit clicks (per-editor transactions, label change, no-op on non-numeric input); _toggleFormatting on the inline selection against the whole range; _assignMarker with `_ownChange` and toggleList.
- Fix: click `_plh_unit` and `_pas_unit` and check values, label and one transaction; toggle underline with an open inline editor and check only the selection changes; assign a marker, then null.

### R7-C-406 (medium): style picker unlink, delete and edit flows untested
- Old: public/designer.browser.dev.js:173757-173988, 174124-174150, 174154-174189
- New: next/src/app/inspector/designer-style-editor.ts:169-298, 459-471, 483-519
- Differs: untested: the "No Shared Style" row (removeStyle in one "text.style-attribution" transaction, then updateSelection); the organizer trash button; the settings button's edit flow (Apply writes `name`/`ps` without assignStyleFrom or append, refreshes the organizer rows); creator checkbox defaults in edit and create mode; moving the picker 34px up near the viewport edge.
- Fix: tests for unlink, delete and edit that check `ps`, rebuilt organizer rows and no extra undo step.

### R7-C-502 (medium): inspector sidebar's panel update has no unit test
- Old: public/designer.browser.dev.js:56034-56127
- New: next/src/app/inspector/inspector-sidebar.ts:461-572
- Differs: matches except R7-C-501, but the tests stub _updatePropertyPanels. Untested: the divider rule (isGroup of the previous visible panel); accordion setup and hidden accordion buttons in touch mode; the touch toolbar re-show; creating and toggling `.appearance-divider`; hiding the last visible hr; moving `last-toolbar`; _updateUI moving the frame, group frame, item and symbol panels in desktop and touch mode; _settingChanged("touch"). Parity snapshots cover only desktop.
- Fix: jsdom tests with fake Properties subclasses for 2-3 visible panels, touch on and off, and panel order after _updateUI.

### R7-C-503 (medium): applying a transformation is not tested
- Old: public/designer.browser.dev.js:161340-161490
- New: next/src/app/inspector/transform-properties.ts:479-605
- Differs: this is the transform panel's only path that changes the file, and nothing calls it. Untested: copies > 0 (clones after the element, selection on the last clone, original at step 0 with scale 2 - scale); one element without copies; no pivot or empty box; skew only inside (-90°, 90°); reflect only on odd indices; no element editor (Q-268); copies parsing to NaN; stringToPoint returning null.
- Fix: Vitest cases with a real Scene and Rectangles: move/scale/rotate around cc; copies=2 with move 10; reflect with copies=2; a 90° skew is ignored.

### R7-C-504 (medium): dimension panel branches have no test
- Old: public/designer.browser.dev.js:97513-97550, 97649-97717, 97864-97908
- New: next/src/app/inspector/dimension-properties.ts:533-557, 645-731, 868-927
- Differs: untested: W/H/X/Y/R with several elements (one transform from the union box, keep-ratio on the union); linked elements skipped; the full-content flag for symbols and fullContentTransform; the live update while dragging (getPEGeometryBBox, selection editor angle); the decimals_num refresh; isAvailable in touch mode ("Close", have-anchor, down, more-z-index).
- Fix: add those cases to inspector-geometry.test.ts.

### R7-C-505 (medium): frame, group frame, item and align handlers are not tested
- Old: public/designer.browser.dev.js:158563-158588, 158652-158673, 158703-158728, 158797-158818, 158853-158903, 158976-159027, 93907-93925, 93953-93968
- New: frame-properties.ts:33-43, 104-128; group-frame-properties.ts:31-41, 90-114; item-properties.ts:59-73, 132-184; align-properties.ts:87-107, 140-148 (all in next/src/app/inspector)
- Differs: tests only check update()'s return. Untested: "Turn On/Off Frame Mode" and "Switch to Frame/Group" transactions; clk/scc only on items with item children (scc only on shapes); item _updateProperties' three branches; group-frame values "1"/"0"; align Enter in a space box (arrange.distribute.<type>, values <= 0 reset to 1); align buttons with source "alignproperties". No parity scenario touches these controls.
- Fix: jsdom tests that init() each panel, fire change or keydown and assert scene properties and titles, including an image in dblMode.

### R7-C-601 (medium): ellipse panel handlers untested, ui/inspector/ellipse not ported
- Old: public/designer.browser.dev.js:87356-87394, 87482-87527
- New: next/src/app/inspector/ellipse-properties.ts:73-95, 172-206
- Differs: untested: the type button click; Arc running _setBorderAlignmentCenter as a second transaction on BorderPaintLayer instances; the angle input falling back to _updateProperties on invalid input; g-active through etp.toString(). parity/expected/ui/inspector/ellipse.* exists but no ported list has it.
- Fix: jsdom test with a real Ellipse with a border: click Arc, assert etp, `_ba` Center and two commit titles; type "abc" in sa and assert it is restored. Port ui/inspector/ellipse.

### R7-C-602 (medium): boolean-op click and active state untested
- Old: public/designer.browser.dev.js:87148-87177, 87305-87314
- New: next/src/app/inspector/bool-op-properties.ts:84-98, 165-172
- Differs: nothing tests the click writing "bool" to every element in one transaction or the g-active toggle after AfterPropertiesChange on the first element. ui/inspector/compound is a screenshot only.
- Fix: a CompoundShape with three children, click SUB, assert bool, the title, and that only SUB is g-active.

### R7-C-603 (medium): image panel actions and image-crop branches untested
- Old: public/designer.browser.dev.js:87651-87696, 87781-87842, 88293-88410
- New: next/src/app/inspector/image-properties.ts:109-158, 214-267; image-crop.ts:53-144
- Differs: untested: cropImage resetting the crop with noCrop and toggling sub-select against pointer mode; replaceImage (storage fallback, the three image-too-big checks, itrf at the bbox top left, edit-mode switch); _updateImagePalette (dominant colour or BLACK, skipping duplicates of the first, stop at 8, button disabled); _updateConvertStatus; the crop label switching with hasSelectionDetail.
- Fix: tests with a fake tool manager and fake storage (oversized blob and valid PNG), and a stubbed ColorThief palette with duplicates and more than 8 entries.

### R7-C-604 (medium): path panel's DOM-wired branches untested
- Old: public/designer.browser.dev.js:88458-88621, 88827-88914, 89045-89180, 89219-89270
- New: next/src/app/inspector/path-properties.ts:176-467, 469-537, 583-684, 718-758
- Differs: untested: collecting points from Path and CompoundPath children; _afterFlagChange with the grandparent lookup; x/y through movePoint; unchecking Closed (border alignment Center first, two commits); Closed disabled for compound paths; negative corner values rejected; the slider's temporary setProperty and hideSelection/resetHideSelection; corner-only and point-only visibility.
- Fix: jsdom test with a real Path with selected anchors and a CompoundPath; fire change and click on each control and assert properties, titles and border alignment.

### R7-C-605 (medium): polygon panel handlers and assign methods untested
- Old: public/designer.browser.dev.js:89312-89465, 89869-90110
- New: next/src/app/inspector/polygon-properties.ts:97-210, 482-638
- Differs: untested: validation fallbacks; the angle conversion `PI2 - normalize(toRadians(v))`; _assignCornersRadius (absolute/relative, plain edges/star halving, invisible polygons skipped, return from index 0); _assignSize and _assignEdges; the temporary flag skipping begin/commit; the edges checkbox hiding the plain-edges row. polygon-advanced.dom has expected files but is not ported.
- Fix: jsdom test firing the inputs and asserting values and the begin/commit log, including an invisible first polygon. Port polygon-advanced.dom.

### R7-C-606 (medium): rectangle panel handlers untested, ui/inspector/rectangle not ported
- Old: public/designer.browser.dev.js:90135-90489, 90532-90611
- New: next/src/app/inspector/rectangle-properties.ts:72-325, 368-442
- Differs: untested: uf and csc handlers; smoothness fallback; lock toggle; slider input/change including the text box during a temporary drag; the radius input writing ["uf","tl_sx"]; the null-bbox branch; csc disabled for an Image; corners hidden when uf is on; decimals_num; _openAdvanced. Only rectangle-corners is ported.
- Fix: jsdom test with a real Rectangle covering these, plus the null-bbox and Image cases. Port ui/inspector/rectangle.

### R7-C-607 (medium): CornerTypePicker class untested
- Old: public/designer.browser.dev.js:166236-166357
- New: next/src/app/widgets/corner-type-select.ts:80-180
- Differs: only cornerTypeIcon is tested. Untested: rotate default 0; the inline build (5 buttons at 20%, active class, data-title); click setting the value, dispatching a bubbling cornertypechange, stats with the key name ("unkn" fallback), closing only in overlay mode; value() in overlay mode; update() marking buttons across the document. Rectangle and polygon depend on it.
- Fix: jsdom test for both modes; value(null) on an overlay picker leaves the span without class.

### R7-C-701 (medium): Page and Document panel parity scenarios are not ported
- Old: public/designer.browser.dev.js:105987-106374, 160353-160593
- New: next/src/app/inspector/page-properties.ts:851-1147; scene-properties.ts:325-468
- Differs: ui/inspector.spec.ts defines nothing, page-a4-mm, grid-on and grid-isometric, but none is in a ported list. page-properties.test.ts covers only the clip button, infinite pages and master copying. Untested: the preset select (includes sub-sizes, hidden presets, unit filter, `@custom`/`@infinite`); margin lock, rotate, trim, opacity box; template preset disabling and `.tooltip-wrapper`/default-data-title; scene ut, dpi, gx, gy, gaw handlers and the cm alert with setColorModeElms.
- Fix: get the four scenarios passing and add them to app-inspector-document.json; unit tests for _updatePresetSizes and updatePropertiesAvailability with a template document and a plkt lock.

### R7-C-702 (medium): symbol panel swap, select-master and detach branches untested
- Old: public/designer.browser.dev.js:159490-159548, 159604-159671
- New: next/src/app/inspector/symbol-properties.ts:62-112, 149-211
- Differs: untested: swap through swapWith with the `_disabledSiblingMaps` save and restore and page activation; value "0" (select master, FitSelectionAction); value "-1" (DetachSymbolAction, updateSelection); the option list (-1/-2, selected master, "(Master)" only when in a scene).
- Fix: a Vitest that swaps A to B and back and asserts the overrides return, then select-master and detach.

### R7-C-703 (medium): touch layout of the page, scene and slice panels has no test
- Old: public/designer.browser.dev.js:154715-154784, 105989-105994, 90895-90907, 160394-160416
- New: next/src/app/inspector/page-properties-touch.ts:31-66; page-properties.ts:851-859; slice-properties.ts:215-222; scene-properties.ts:364-378
- Differs: no test or ported scenario turns touch on, so the touch row order, the moved color-mode row, the dpi-text label and the slice checkbox sliders are unchecked.
- Fix: one Vitest per panel that toggles isTouchEnabled, fires the touch SettingChangedEvent and asserts row order and labels both ways.

### R7-C-802 (medium): the animated (touch) drag path of the tree has no test
- Old: public/designer.browser.dev.js:20185-20270, 20423-20533
- New: next/src/app/sidebars/virtual-tree.ts:681-751, 929-1036
- Differs: untested: setAnimatedDragEnabled; one against two hits in _drag; the Math.abs asymmetry between _moveDown and _moveUp; the drop on dragend; row reuse during a drag (g-drag-vrow, g-drag-mouse, g-dragging, no second click listener).
- Fix: tests with animated drag on, dispatching draginit/dragstart/drag with set clientY and asserting the helper's setDroppableNode* calls.

### R7-C-803 (medium): free-zone drops, duplicate drops and putLastChildWhenInside have no test
- Old: public/designer.browser.dev.js:20587-20679, 20730-20751
- New: next/src/app/sidebars/virtual-tree.ts:1091-1188, 1242-1265
- Differs: only plain above/below/into drops are tested. Untested: the duplicate branches that decide where Alt-drag copies of layers land; free-zone drop appending to root; putLastChildWhenInside; the `_specCounter` countdown; the 10 ms _updateMarks timer.
- Fix: tests that drop on `_freeZone`, drop with isDuplicateEffectCallback returning true, and one with putLast on.

### R7-C-804 (medium): risky outline sidebar branches have no test
- Old: public/designer.browser.dev.js:82464-82509, 82528-82552, 82707-82762, 82905-82941, 82122-82137, 81973-82003, 82083-82101, 82313-82356
- New: next/src/app/sidebars/outline-sidebar.ts:785-816, 840-865, 1037-1100, 1257-1290, 526-540, 359-386, 494-513, 637-658
- Differs: untested: delete page (NoDelete lock, master confirm with navigate and refresh before the answer); page reorder (reverse insert, reassignMasterPages); duplicating into a Shape (paint-bbox offset, assignStyleFrom on CompoundShape); deleting the active layer once empty; toolbar drop forwarded with altKey and layerY 0; divider clamp; touch row heights 48/34; removing every listener on Deactivated.
- Fix: one unit test per branch, each checked to fail when the branch is broken.

### R7-C-805 (medium): risky layers panel branches have no test
- Old: public/designer.browser.dev.js:168199-168234, 168343-168411, 168570-168662, 168741-168779, 168864-168875
- New: next/src/app/sidebars/layers-panel.ts:241-256, 334-384, 637-661, 717-780, 918-969, 998-1026
- Differs: untested: outline toggle doing nothing under a hidden parent; layer colour change recolouring children with the old colour and skipping temporary changes; the onlyUpdateStyle timer; auto_expand_layers with expandAndFocus; g-has-selection and g-highlighted-row; blank rename ignored; lock under a partially locked parent; scene(null) removing all seven listeners.
- Fix: unit tests for each, e.g. patternchange on `.layer-color`, submit "   " in the AutoEdit, insert into the old scene after scene(null) and expect no row.

### R7-C-806 (medium): the pages panel has no tests at all
- Old: public/designer.browser.dev.js:171542-171747, 171759-171839, 171927-171996
- New: next/src/app/sidebars/pages-panel.ts:156-184, 320-477, 492-566
- Differs: no unit test or ported scenario renders a page row. Untested: " (master)" suffix and touch icons; lock click (Full lock, editing off, selection cleared, and back); visibility toggle and page-hiden class; no rename on a locked page; blank rename; the multi-page drag label; hover Highlighted only for pages with a width that aren't hidden; context menu activating the page; the flag handler; listener removal on scene switch.
- Fix: pages-panel.test.ts using the tree-dom helper in sidebars/testing, starting with lock/editing, context menu activation and no handler firing on the old scene.

### R7-C-807 (medium): scroll virtualization and the selected panel have no tests
- Old: public/designer.browser.dev.js:169072-169141, 169288-169333, 169407-169415
- New: next/src/app/sidebars/virtual-list.ts:107-182; selected-panel.ts:136-236
- Differs: untested: _onScroll re-rendering only first or beyond _scrollCacheSize; _renderViewport hiding from child 1 (the .vscroller stays); the `min(rowCount, first + 3 × visibleRows)` bound; the 300 ms clean timer with its 100 ms throttle; selected panel submenu rows keyed by the index in elementHits, not filteredElementHits; click and expand mapping back to the node.
- Fix: virtual-list.test.ts with stubbed offsetHeight/scrollTop and fake timers; selected-panel.test.ts with a submenu hit and a filtered subset.

### R7-C-901 (medium): library photo columns measure with getComputedStyle and getBoundingClientRect instead of jQuery's sizes
- Old: public/designer.browser.dev.js:162012-162020, 162125-162127, 162884-162889
- New: next/src/app/sidebars/library-panel.ts:121-132, 234-235, 914-919
- Differs: old `css("width")` gives "0px" in a hidden box (2 columns); new getComputedStyle gives "auto", parseInt gives NaN, no columns, min index -1, photos never appended. Column height sums getBoundingClientRect (with padding and border) instead of height(). The debounced resize reflows only the first `.assets-wrapper` instead of every non-empty one. Dead while marketApi() throws, but the file says the code is kept for a future source. No test.
- Fix: use width() and height() from next/src/app/shell/dom.ts, reflow every non-empty wrapper, add a test with photo assets.

### R7-C-902 (medium): symbols panel adds one thumbnail listener per master on every document activation
- Old: public/designer.browser.dev.js:172055 (removes the unbound `l`, so nothing comes off), 172121
- New: next/src/app/sidebars/symbols-panel.ts:169, 191-196, 242
- Differs: same as the old code: each activation adds another SymbolThumbnailEvent listener per master and none is removed, so tab switching piles them up and each runs _thumbnailUpdated. Q-070 covers the symbol dictionary, not this. No test pins it.
- Fix: a kept-quirk QUESTIONS.md entry and a test counting listeners after two setScene calls, or keep one listener per master and remove it in _clear and _removeSymbol.

## Low

### R7-C-104 (low): "Advanced" texture settings appear without the old slide animation
- Old: public/designer.browser.dev.js:68760, 159346 (`slideToggle()`, 400 ms)
- New: next/src/app/color/color-chooser.ts:1103, 2849-2852; pattern-chooser.ts:215
- Differs: the section snaps open; not in QUESTIONS.md or REMOVED.md. The touch chooser reimplements the toggle instead of using the shared helper.
- Fix: animate the height for 400 ms or record it as accepted; use the exported helper in pattern-chooser.ts.

### R7-C-105 (low): color field updateSettings copies undefined values
- Old: public/designer.browser.dev.js:70918-70921 (`$.extend`, skips undefined)
- New: next/src/app/color/color-chooser.ts:3132-3135 (`Object.assign`)
- Differs: `updateSettings({ asButton: undefined })` overwrites the option. No current caller does this.
- Fix: merge with the file's own skip-undefined `extend`.

### R7-C-106 (low): the SizeMode "array" concat is a substring search hidden by casts
- Old: public/designer.browser.dev.js:70131-70135
- New: next/src/app/color/color-chooser.ts:2315-2319
- Differs: same behaviour (`"lengthpercent".indexOf(mode)`), but `as unknown as string[]` hides it.
- Fix: write `(SizeMode.Length + SizeMode.Percent).indexOf(mode)` with a comment.

### R7-C-107 (low): invisible Unicode literals in the hex key filter
- Old: public/designer.browser.dev.js:68331
- New: next/src/app/color/color-chooser.ts:809
- Differs: the regex holds raw U+017F and U+212A (Kelvin sign, looks like "K").
- Fix: write them as `ſK` with a comment that they come from the old transpiled /iu class.

### R7-C-204 (low): border/fill copy note shows when no row is selected; the old code threw
- Old: public/designer.browser.dev.js:74092-74110, 83314-83332
- New: next/src/app/inspector/border-properties.ts:497-518; fill-properties.ts:305-326
- Differs: `.position()` on an empty set returned undefined and `.top` threw, so no note appeared. The new code falls back to top 0 and shows it. Rare (stale active Border/Fill style).
- Fix: keep the throw or record the change in QUESTIONS.md.

### R7-C-205 (low): two DOM ports of gPropertyRow and el
- Old: module 1725
- New: next/src/app/inspector/paint-dom.ts:40-45, 186-286; properties.ts:157-164, 231-343 (widgets/property-row.ts is a third, React port)
- Differs: they already differ (`:input` check, null height, prefix width), so panels can drift.
- Fix: keep one DOM propertyRow/el/isVisible and import it everywhere.

### R7-C-206 (low): openEyeDropper parameters are misnamed and cast
- New: next/src/app/inspector/border-properties.ts:852-855; fill-properties.ts:870-873; text-properties.ts:1152
- Differs: named event and options but passed on as pageX/pageY, with `as number | undefined` casts.
- Fix: type the override as `(pageX?: number, pageY?: number)` and drop the casts.

### R7-C-304 (low): effect dragend comment points to a QUESTIONS.md entry that doesn't exist
- New: next/src/app/inspector/effect-properties.ts:559-560
- Differs: "see 'Effect drag without drop deletes' in QUESTIONS.md" does not exist; the quirk is BF-105 in bugfix-plan.md.
- Fix: point at BF-105 or add the entry.

### R7-C-305 (low): `_defaultEffects` default is in a different order
- Old: public/designer.browser.dev.js:84230-84235 (DropShadow, InnerShadow, Blur, GLColorAdjust)
- New: next/src/app/inspector/effect-properties.ts:155-160 (Blur, GLColorAdjust, DropShadow, InnerShadow)
- Differs: only read with indexOf, nothing visible, but a public prototype default changed.
- Fix: restore the old order.

### R7-C-306 (low): needless casts and jQuery-style helper names in the effect forms
- New: next/src/app/inspector/effect-properties.ts:186-194; effect-forms.ts:191-194, 231-239, 578-592, 709-724, 840-855
- Differs: TouchTool config casts `as unknown as string` although TouchToolTarget accepts Element; `text$` name; the hideSelectionWith doc comment refers to nothing; three forms repeat the `chooser()` helper's code inline.
- Fix: drop the casts, rename `text$`, fix the comment, use `chooser()` keeping the value-before-listener order.

### R7-C-407 (low): text size box builds a second UnitBox on the same input
- Old: public/designer.browser.dev.js:93058-93072
- New: next/src/app/inspector/text-properties.ts:1922-1936
- Differs: the second construction adds another markSelected change listener (next/src/app/widgets/unit-box.ts:67) only to rebind the click; the Q-277 comment doesn't say why.
- Fix: give UnitBox a method that enables the list, or explain the re-construction.

### R7-C-506 (low): touch mode adds change listeners on every frame/item panel update, not documented
- Old: public/designer.browser.dev.js:158605, 158638-158642, 158924, 158960-158966
- New: next/src/app/inspector/frame-properties.ts:56, 88-93; item-properties.ts:78, 114-121; widgets/checkbox-slider.ts:28
- Differs: same as old: each update calls mountCheckboxSlider and adds a listener to frm, clk and scc; the SettingChangedEvent listener is added per document but removed only after the panel was shown. Q-311 and Q-230 don't cover these modules.
- Fix: extend Q-311 for modules 1654 and 1656.

### R7-C-507 (low): Enter turns negative move values into 0, not documented
- Old: public/designer.browser.dev.js:161317-161338
- New: next/src/app/inspector/transform-properties.ts:466-477
- Differs: same as old (`isNaN(t) || t <= 0 || !t ? 0 : t`); -10 then Enter shows 0, so left/up moves only work via Apply without Enter. Users notice this.
- Fix: a QUESTIONS.md entry and a pinning test.

### R7-C-508 (low): transform keep-ratio, Enter formatting and touch switch untested
- Old: public/designer.browser.dev.js:160982-161059, 161280-161286, 161311-161339
- New: next/src/app/inspector/transform-properties.ts:214-238, 256-271, 420-430, 458-477
- Differs: the test stubs _copiesAndApply and _advancedTransformPanel, so the linked-ratio rescale (toFixed(1)), Enter reformatting and the desktop/touch block switch are never run.
- Fix: init() in jsdom: link ratio, set scale X 200, expect Y "200.0"; Enter in move X; update() with touch on and off.

### R7-C-509 (low): the pivot widget lives in the transform panel file
- Old: public/designer.browser.dev.js:172992-173040 (module 1724)
- New: next/src/app/inspector/transform-properties.ts:53-85; widgets/pivot.ts; widgets/pivot-view.tsx
- Differs: widgets/pivot.ts claims to port 1724 but holds only pivotSides; the DOM widget is in transform-properties.ts.
- Fix: move initPivot, setPivotValue, pivotValue into widgets/pivot.ts.

### R7-C-510 (low): transform panel casts without reason comments
- New: next/src/app/inspector/transform-properties.ts:87-102, 231, 496
- Differs: tooltip helper builds an untyped Record cast through unknown, its learnMoreOnly flag only drops `middle: false`; boxValue returns `undefined as unknown as string`; 231 and 496 keep the old double parseFloat silently.
- Fix: type the helper, rename the flag to keepMiddle, return `string | undefined`, comment 231 and 496.

### R7-C-511 (low): dimension panel casts its touch tools with a wrong comment
- New: next/src/app/inspector/dimension-properties.ts:120, 139-154, 896-900, 1040
- Differs: `as unknown as string`/`SidebarTouchTool[]` casts with a comment saying a selector is required, though TouchToolTarget (editor/touch/touch-tool.ts:11) accepts elements; `as never` on getLinkedElementsInSelection; aliases declared after use.
- Fix: drop the casts and comment, type the call, move the aliases up.

### R7-C-512 (low): inspector sidebar dead import, misleading comment and unexplained casts
- New: next/src/app/inspector/inspector-sidebar.ts:334, 449-450, 601-602
- Differs: `void ToolManager;` claims instanceof users that don't exist; filterIndividualElements casts `as never[]` and `as unknown as InspectedElements`; setPathPointsNodeType goes through `as unknown`.
- Fix: remove the import and line; type the calls or comment them.

### R7-C-608 (low): shape panels redefine editorOf/sceneOf/PanelScene with casts
- New: next/src/app/inspector/bool-op-properties.ts:19-25; ellipse-properties.ts:22-28; path-properties.ts:38-57, 172-174; polygon-properties.ts:26-40, 82-84; rectangle-properties.ts:31-33
- Differs: properties.ts:351-360 already exports sceneOf and editorOf; PanelScene duplicates methods Scene already has.
- Fix: import from properties.ts and drop the unknown casts.

### R7-C-609 (low): splice(indexOf) quirk in the path panel kept without a comment
- Old: public/designer.browser.dev.js:89057-89059
- New: next/src/app/inspector/path-properties.ts:594-595
- Differs: if the point isn't in `_points`, splice(-1, 1) removes the last point. Not commented, not in QUESTIONS.md.
- Fix: add a kept-on-purpose comment or entry.

### R7-C-610 (low): polygon control("corners-type") throws where the old one returned undefined
- Old: public/designer.browser.dev.js:89398
- New: next/src/app/inspector/polygon-properties.ts:209
- Differs: new throws "Unknown input property"; no caller passes it.
- Fix: return early as before, or comment that it is built inline.

### R7-C-611 (low): corner type widget imports propertyRow from the inspector
- New: next/src/app/widgets/corner-type-select.ts:22
- Differs: widgets/ depends on inspector/properties.ts, reversing layering and risking an import cycle.
- Fix: use widgets/property-row.ts or move propertyRow into widgets/.

### R7-C-612 (low): color thief leaves its canvas in body when sampling throws; dropped helpers not in REMOVED.md
- Old: public/designer.browser.dev.js:87851-87858, 88225-88249
- New: next/src/app/inspector/color-thief.ts:369-413
- Differs: same as old: if getImageData throws (tainted canvas, zero-size image) removeCanvas never runs and each Colors click leaves a canvas. forcebw, getColorFromUrl, getImageData, getColorAsync and CanvasImage.clear/update are dropped without a REMOVED.md line.
- Fix: record the leak as a quirk or use try/finally; list the dropped helpers in REMOVED.md.

### R7-C-704 (low): export panel shows "undefined" for a row without sz or sf
- Old: public/designer.browser.dev.js:136307, 136368 (`.val(undefined)` sets "")
- New: next/src/app/inspector/export-properties.ts:357, 389
- Differs: `input.value = row.sz` writes "undefined" for a hand-written `__export` list.
- Fix: `row.sz ?? ""` and `row.diff ? "" : (row.sf ?? "")`.

### R7-C-705 (low): export dialog looks up the JPEG slider and the unsupported-features dialog late
- Old: public/designer.browser.dev.js:131380-131393, 132369
- New: next/src/app/export/export-dialog.ts:336-345, 1042-1046
- Differs: both modules are ported; if the late-module map is not set (Vitest, or a missed glob) the dialog silently lacks the quality slider and never shows the unsupported-features dialog.
- Fix: import InputSlider and UnsupportedFeaturesDialog directly.

### R7-C-706 (low): document chooser now removes its image listener, without a comment
- Old: public/designer.browser.dev.js:113597-113606 (removes `this`, so nothing is removed)
- New: next/src/app/export/document-chooser.ts:136-147
- Differs: the new code removes the listener properly without saying it departs from the old code. Nothing opens the chooser now that cloud sync is gone.
- Fix: add a one-line comment, or record a DROP entry for the unreachable chooser.

### R7-C-808 (low): AutoScroll has no test
- Old: public/designer.browser.dev.js:19840-19848, 20816-20904
- New: next/src/app/sidebars/virtual-tree.ts:206-330
- Differs: the offsetParent walk, edge zones, the equal-coordinates exit and the chained onmouseout are untested.
- Fix: a small test with stubbed offset and scroll sizes.

### R7-C-809 (low): outline sidebar export rows are late-bound and can fail silently
- Old: public/designer.browser.dev.js:82013-82014
- New: next/src/app/sidebars/outline-sidebar.ts:402-407, 1292-1294
- Differs: if lateExport returns null the export rows don't appear and nothing reports it; export-properties.ts is ported.
- Fix: import ExportProperties directly.

### R7-C-810 (low): touch "Select" overlay opens empty if the SelectedPanel lookup fails
- Old: public/designer.browser.dev.js:149523-149543
- New: next/src/app/touch/touch-context-menu.ts:541-545 (outside this cluster)
- Differs: the overlay opens before the lateExport lookup; a null result leaves it empty.
- Fix: import SelectedPanel directly.

### R7-C-811 (low): an undefined option replaces the SelectedPanel default
- Old: public/designer.browser.dev.js:169337-169362 (`$.extend`)
- New: next/src/app/sidebars/selected-panel.ts:75-97 (`...options`)
- Differs: `{ renderer: undefined }` drops the default renderer. No current caller.
- Fix: leave undefined entries out before merging.

### R7-C-812 (low): `as unknown as` casts without a reason comment in the sidebars
- New: next/src/app/sidebars/outline-sidebar.ts:253, 482, 791, 926, 1022, 1068, 1087, 1323; layers-panel.ts:128, 130, 763, 765, 933, 934; layer-item.ts:160, 188, 199; pages-panel.ts:325, 427, 430, 556
- Differs: they cover missing engine typings (getScene/getPage on Node, getProperty/setProperty, getContentBBox, assignStyleFrom, TouchTool panel type).
- Fix: add the methods to the engine types or a reason at each cast.

### R7-C-813 (low): pages panel name fix cites the wrong document and has no test
- Old: public/designer.browser.dev.js:171568, 171587, 171597 (names inserted as HTML)
- New: next/src/app/sidebars/pages-panel.ts:345-347, 367, 376 (names set as text)
- Differs: the comment cites BUGS-FIXED.md, but the entry is BF-119 in bugfix-plan.md with "Test: none yet".
- Fix: move BF-119 into BUGS-FIXED.md or fix the comment; test that a page named "a <b>x</b>" shows that literal text.

### R7-C-903 (low): stale header comments in the library and symbols sidebar files
- New: next/src/app/sidebars/symbols-sidebar.ts:8-10; library-sidebar.ts:14-15; library-document.ts:7-8
- Differs: both sidebars say they extend View because shell/sidebar.ts doesn't exist, but they extend Sidebar from it. library-document.ts says the preset document is fit to the window, but presets are never fitted (old 80955, new 49).
- Fix: correct both comments.

### R7-C-904 (low): Unsplash credit link hardcodes the app title
- Old: public/designer.browser.dev.js:162180 (`DESIGNER.TITLE`)
- New: next/src/app/sidebars/library-panel.ts:279
- Fix: use DESIGNER.TITLE from next/src/app/file-formats.ts:38.

### R7-C-905 (low): library _transformNode checks for a transform method instead of the Transform mixin
- Old: public/designer.browser.dev.js:162397 (`hasMixin(GElement.Transform)`)
- New: next/src/app/sidebars/library-panel.ts:411-417
- Differs: `typeof element.transform === "function"` through an `as unknown as` cast.
- Fix: `node.hasMixin(ElementTransform)`.

### R7-C-906 (low): "Back to top" uses native smooth scrolling instead of jQuery's "slow" animation
- Old: public/designer.browser.dev.js:162433-162436 (600 ms swing; also unbinds every scroll handler)
- New: next/src/app/sidebars/library-panel.ts:449-450
- Differs: duration and easing depend on the browser.
- Fix: animate scrollTop over 600 ms with swing in requestAnimationFrame, or comment the accepted difference.
