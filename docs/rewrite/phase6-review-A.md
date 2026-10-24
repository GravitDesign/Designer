# Phase 6 review, group A: editor-core, editor-view, editor-guides, editor-touch

Scope: every old module that port-map.tsv assigns to these four clusters (GEditor, GEditorOptions, cursor, the editor and icon annotations, paint configuration, workspace, GStyleEdManager, GActionManager, GPanning, GSceneWidget, GWidget, GRulerWidget, GEditorWidget, all guides and the distance helper, all touch modules). I compared each function, static, prototype default and event against the new file, read the ported parity ids, and ran Vitest on the test files in scope (editor.test.ts 16, editor-core-parts.test.ts 10, view/ 39, guides 26, touch 32; all pass).

The port is close. Two behaviour differences were found (R6-A-001, R6-A-002). Everything else is an untested branch, a wiring risk or style.

Coverage note: next/parity/ported/editor-guides.json is empty, but 21 of the 31 snap scenarios in editor-tools/cases-snap.ts are ported and credited to editor-tools-base.json and editor-tools-select.json (see R6-A-031).

## High

### R6-A-001 (high): long press on an element inside an SVG now swallows the next release
- Old: public/designer.browser.dev.js:165722-165730
- New: next/src/editor/touch/long-press-event.ts:113
- Differs: the old check calls `parentElement.className.indexOf(...)`. When the parent is an SVG element, className is an SVGAnimatedString: truthy, no indexOf. The old code threw inside the rAF callback after dispatching "long-press" and never installed the release swallower, so the following touchend/mouseup (and the click) still reached their handlers. The new code wraps it in `String(...)`, gets "[object SVGAnimatedString]", the check passes and the next trusted touchend/mouseup is cancelled. Long-pressing an svg icon or a path inside one behaves differently.
- Fix: treat a non-string className as "no swallow": `typeof parent.className === "string" && parent.className && parent.className.indexOf("g-scene-widget") === -1`. Add a test with an SVG parent and list it as a kept quirk in QUESTIONS.md.

### R6-A-002 (high): getAnnotationsExceptions resets the annotation list per node; the old hoisted var carried it over
- Old: public/chunk.vendor.js:20425-20435
- New: next/src/editor/editor.ts:1099-1115
- Differs: old `var o` is function-scoped and never reset. After the first node that is a page with annotations (or an AnnotationsList), every later node takes the `if (o)` branch again: the same list is re-added and the node's own check is skipped, so an annotation or comment that comes after such a page in the selection is never excluded. The new `let list` is reset per node. With a selection that mixes a page with annotations and a later annotation/comment, the old cloneSelection and applySelectionTransform(clone) copied the other user's annotation; the new code leaves it out. Not listed in QUESTIONS.md or BUGS-FIXED.md.
- Fix: declare `list` before the loop with a comment on the old hoisting to keep the quirk, or record it as a deliberate fix in BUGS-FIXED.md with a test.

## Medium

### R6-A-003 (medium): the app gets its ToolManager and element editors only through the parity bridge
- Old: public/chunk.vendor.js:107563 (GEditorWorkspace constructor always does `new GToolManager()`)
- New: next/src/editor/editor-workspace.ts:82, next/src/editor/tools/tool-manager.ts:451, next/src/editor/index.ts
- Differs: EditorWorkspace creates a tool manager only if registerToolManagerFactory ran, which only happens as a side effect of importing tool-manager.ts. In the app path that import comes from editor/index.ts, which is reached only via parity/app/document.ts and the eager import.meta.glob in parity/bridge.ts. app/shell/designer.ts uses `import type`. If the bridge is left out of a production build or import order changes, getToolManager() returns null and Designer.getToolManager().activateTool/setView crashes; element editor registration hangs on the same import.
- Fix: import editor/index.ts from the app bootstrap, or have EditorWorkspace throw or warn when no factory is registered.

### R6-A-004 (medium): DocumentTouchTarget's input-box exception never applies
- Old: public/designer.browser.dev.js:152140 (`$(t.target).data("ginputbox") && this._touchmoved`)
- New: next/src/editor/touch/document-touch-target.ts:37, 55
- Differs: the static isInputBox hook defaults to `() => false` and nothing sets it; no gInputBox port exists in src/app yet. Old: a finger that moved over a gInputBox and lifted did not focus or blur. New: it always blurs the active element and focuses the input, so swiping across a panel number field brings up the keyboard.
- Fix: set DocumentTouchTarget.isInputBox when the input box is ported (track it in the phase 7 plan), or detect a marker the new input box sets. Add a test that fails while the hook is the default.

### R6-A-005 (medium): deleteSelection's special branches are untested
- Old: public/chunk.vendor.js:20537-20593
- New: next/src/editor/editor.ts:1249-1317
- Differs: code matches; the only test deletes a plain rectangle. Untested: NoDelete program-lock filtering, a symbol instance inside a master being hidden and locked instead of removed, the Multireference master-sibling check, `continue` when a Block editor disallows deleting parts, deletePartsSelected vs isRemovalBlocked, removing emptied Groups and CompoundShapes, deleteActiveLayer, PartialLocked skipping. The edit.delete scenarios in editor-actions are not ported.
- Fix: one unit test per branch, each also asserting that a single undo restores everything.

### R6-A-006 (medium): cloneSelection repeat and page-clone branches are untested
- Old: public/chunk.vendor.js:20466-20535
- New: next/src/editor/editor.ts:1166-1241
- Differs: code matches. No test for `repeat` (step and repeat from _lastCloneSelection), the Page clone path (insert at end, offset from getPosition(true,true,true,true), renameClone), the scene editor's transform box staying active, or the exclusions from getLinkedElementsInSelection and getAnnotationsExceptions. Only alt-drag-duplicates is ported.
- Fix: unit tests: duplicate, move, duplicate again (second copy repeats the move); clone a page with another user's annotations; clone text-on-path with its path.

### R6-A-007 (medium): insertElements relinkSymbols and the other-parent fallback are untested
- Old: public/chunk.vendor.js:21053-21190
- New: next/src/editor/editor.ts:1912-2090
- Differs: code matches. api-insert-elements covers default target, active layer, locked layer, NoNewChildren, annotations and besideSelection within the target. Untested: relinkSymbols (instances become masters, masterRef rewritten across the scene, scene.link), besideSelection in another container (validateInsertion, locked parent, other-page filter), the `next` argument, dropping a Text whose path is in the list, initialSetup taking the style of a single selected Stylable. The symbol branch writes masterRef into the file.
- Fix: unit tests for relinkSymbols with an instance whose master lives in another scene, and for insertion beside a selection inside a group and on another page.

### R6-A-008 (medium): multi-page and snap-zone paths of move/scale/transformSelection are untested
- Old: public/chunk.vendor.js:20804-20914
- New: next/src/editor/editor.ts:1587-1735
- Differs: code matches. Untested: multiPage (isMultiPage, doCollisionlessTransform, transform conjugated by page offset), getGroupGeometryBBox relativeToPage, the Guides.options.zones branch with zonePoint, the annotation guide-id quirk. scaleSelection and resizeSelection have no direct test.
- Fix: unit tests moving two elements on two pages with multiPage, moving with zones on, scaleSelection with each sign of dx/dy.

### R6-A-009 (medium): arrangeOrder BringForward, SendToBack and block vetoes are untested
- Old: public/chunk.vendor.js:21336-21399
- New: next/src/editor/editor.ts:2273-2352
- Differs: code matches; only SendToFront and SendBackward on three plain rects are tested. Untested: the BringForward loop skipping selected and non-element siblings, SendToBack's insertion-point search, validateBlockInsertion refusing a move, explicit nodes with noTransaction (no reselect). arrange.order.* in exec.spec.ts are not ported.
- Fix: unit tests with selected and unselected neighbours and an AlwaysBack/AlwaysFront block.

### R6-A-010 (medium): arrangeAlign: most branches untested, including the mid-loop return
- Old: public/chunk.vendor.js:21400-21534
- New: next/src/editor/editor.ts:2361-2501
- Differs: code matches; only AlignRight on two rects is tested. Untested: single element against its parent, toArea, alignParts, lockedUnion over area, asGroup, both justify transforms. The risky one: a fully locked element or empty target returns from inside the try mid-loop, after earlier elements moved, and the finally still commits one undo state.
- Fix: unit tests for partial align then commit, single element vs parent, locked reference, justify with non-integer ratios.

### R6-A-011 (medium): convertSelectionToPaths, joinPaths and splitCompoundPath have no test
- Old: public/chunk.vendor.js:21215-21335
- New: next/src/editor/editor.ts:2120-2266
- Differs: code matches, but nothing reaches it. Risky paths: PathBase to Path via constructor plus assignFrom, Text to text shapes inserted in reverse before the same sibling, vertex sources with $trf swapped around assignFrom, the remove-if-unconvertible fallback, joinPaths moving CompoundPath sub-paths and inserting before the last path's getNext(), splitCompoundPath with no parent.
- Fix: unit tests for rect, ellipse, text and compound path checking tree order, selection and undo name.

### R6-A-012 (medium): updateByMousePosition is untested
- Old: public/chunk.vendor.js:21535-21611
- New: next/src/editor/editor.ts:2510-2601
- Differs: code matches (label-height rect, active page sorted first, MOVE_MASTER/hasLinks rule, _activatedPage). Every drawing tool calls it; no test or multi-page scenario does.
- Fix: unit test with two pages in multi-page view: label hit selects and activates the page, highlightOnly toggles Highlighted, outside the view clears the highlight.

### R6-A-013 (medium): isModified(filter) and markSavePoint(id) are untested
- Old: public/chunk.vendor.js:22058-22113
- New: next/src/editor/editor.ts:2807-2867
- Differs: code matches. Untested: the filter path (stops at the save point, checks newSelection and selection elements, property-change actions only when neither selection is saved) and markSavePoint with an id not on the stack. editor-actions/undo/save-point and undo/redo-cleared-by-new-state are not ported.
- Fix: unit tests for both branches; port the two undo scenarios.

### R6-A-014 (medium): selection-mode branches of _tryAddToSelection are untested
- Old: public/chunk.vendor.js:22310-22344
- New: next/src/editor/editor.ts:3093-3130
- Differs: code matches; tests use only rectangles. Untested: setCatchHandle(false) for a path in a compound path, pathResize false removing ResizeAll, selectionEdit putting image or paths-graph editors in edit mode, "subselect" double-click in detail mode, validateSelectionChange() returning false.
- Fix: unit tests with a path inside a compound path and an image under setSelectionEdit(true) and setSelectionDetail(true).

### R6-A-015 (medium): StyleEdManager gradient-editor routing has no tests
- Old: public/chunk.vendor.js:107676-107702, 107717-107733, 107747-107771, 107778-107792
- New: next/src/editor/style-ed-manager.ts:191, 235, 271, 305
- Differs: code matches. Unreached: parent lookup via getOwnerStylable, isDeactivatable early return, validateAlreadyActive, EditorChangedEvent only with a previous editor, the pattern-prop filter on AfterPropertiesChangeEvent, block/release around handleEditorPartUpdate, the overlay-lock hit test. The eledit/gradient-* scenarios need phase 7 and are not ported.
- Fix: Vitest with a real Scene and a rect with a LinearGradient fill: editor opens; switch to radial fires EditorChangedEvent(previous, new); non-gradient fill closes it; a change during handleEditorPartUpdate does not reopen it.

### R6-A-016 (medium): icon-handle painting and icon loading have no tests; setIcon race kept silently
- Old: public/chunk.vendor.js:67675-67802
- New: next/src/editor/handles/icon-annotation.ts:61, 126, 166, 176
- Differs: ported faithfully with the old quirks: a 404 or Error leaves a "visible" icon with no canvas; a second setIcon before the first load finishes removes the listener from the wrong Image; setIcon(null) during a load is overwritten and _statusEvent then throws on a null _icon. Only bbox and half-width are tested; not the rotated or tinted blit (createCanvas, fillCanvas, DestinationIn, transform pre-multiply), the {width,height} iconSize form, or the listener cleanup. Touch handle icons (app/shell/designer.ts:1359-1362) depend on these.
- Fix: test _updateBounds with number and object, _statusEvent on Loaded and Error, paintAnnotation with a recording canvas at angle 0 and non-zero with iconDynamicColor. List the setIcon race in QUESTIONS.md.

### R6-A-017 (medium): EditorAnnotation's handle-image cache and outsideStroke branch are untested
- Old: public/chunk.vendor.js:19628-19713
- New: next/src/editor/handles/editor-annotation.ts:20-122
- Differs: code matches (cache key, shrink by 2*lineWidth, +0.5/+1/+2 for non-rect white outlines, half-pixel radius for odd widths, mask canvas for outsideStroke). Tests reach it only through fakes. It paints every handle.
- Fix: test canvas.width for rect vs circle with a WHITE outline, that outsideStroke skips the enlargement, and that an identical second call returns the cached canvas.

### R6-A-018 (medium): device-pixel-ratio 2 paths have no test
- Old: public/chunk.vendor.js:62742, 62555, 63556, 58055
- New: next/src/editor/view/scene-widget.ts:400, 310, 1425; panning.ts:96; editor-widget.ts:237, 551
- Differs: code matches, but all unit tests run at devicePixelRatio 1 (view/testing/fake-dom.ts:181) and corpus/view/retina is not ported.
- Fix: unit tests at dpr 2 for canvas sizes, inline-hint position, ruler mouse position, auto-pan edge, guide-line div position and the 2px ruler hot zone. Port corpus/view/retina.

### R6-A-019 (medium): deferred resize during a pending repaint or pan is untested
- Old: public/chunk.vendor.js:62762
- New: next/src/editor/view/scene-widget.ts:421-429
- Differs: code matches. The path that cancels the resize frame and reschedules with force=true while _repaintRequestFrameId or _finishPanRequestFrameId is pending never runs in tests. A slip leaves canvases at the old size after a window resize.
- Fix: unit test: invalidate(), resize() before frames run; size unchanged until the frame, then updated; done called once.

### R6-A-020 (medium): drop handling has no test; node and symbol drops are not ported
- Old: public/chunk.vendor.js:237071-237226
- New: next/src/editor/view/editor-widget.ts:821-988
- Differs: code matches. handleDropEvent and _handleDrop are never called in tests; only api-drop-font-and-custom is ported. Risky: symbol master linking in one transaction, the "no editor accepted" fallback inserting every Node source, pattern acceptDrop routing.
- Fix: unit tests for file drop, node drop at the page point, symbol drop reusing an unattached copy, master-symbol drop in one transaction, acceptDrop stopping the insert. Port dnd.spec.ts cases when the app allows.

### R6-A-021 (medium): ruler interactions have no parity coverage
- Old: public/chunk.vendor.js:236826, 236845, 236547
- New: next/src/editor/view/editor-widget.ts:549-568, 227-262
- Differs: code matches. view/show-rulers(-vertical) are not ported. Untested: pressing a ruler (including the ignored leftmost 2px of the vertical ruler), Meta toggling re-snap mid-drag, moving an existing line ("Change guide line" commit), inline hint text and position.
- Fix: unit test driving Down on the ruler widget then Move and Release on the view; a moved-line test asserting the commit name.

### R6-A-022 (medium): tile cache and clip-content views are not covered
- Old: public/chunk.vendor.js:62918, 63661, 63664
- New: next/src/editor/view/scene-widget.ts:680, 1464, 1469
- Differs: code matches. corpus/view/zoom-cache, clip-content, outline-view and fast-view are not ported; view-host.ts relies on invalidateAndResetCache for paint-mode switches.
- Fix: port zoom-cache and clip-content, or unit test that invalidateAndResetCache(null) calls setDirtyCache with the full scene area, logical zoom and scroll.

### R6-A-023 (medium): multi-page snapping branches have no test
- Old: public/chunk.vendor.js:32200-32230, 32411-32445, 101383-101410, 101680-101708, 40769-40778
- New: next/src/editor/guides/bbox-guide.ts:110, 348; points-guide.ts:85; page-guide.ts:46; guides.ts:161, 261, 411, 708, 786
- Differs: code matches. All fake views and snap scenarios use one page with multiPageView off, so page lookup, page-box clipping translated by minus the active position, toGuideSpace for a non-active page and the page offsets in finishMap and paint never run. A sign slip would only show in multi-page documents.
- Fix: unit tests with multiPageView true, two pages at different positions, point on the second page, page-relative and not; assert snapped value, hit page and snap line points.

### R6-A-024 (medium): DistanceHelper crossing and corner cases and label sliding are untested
- Old: public/chunk.vendor.js:77147-77763, 77907-78095
- New: next/src/editor/guides/distance-helper.ts:399, 541, 1004-1035, 1060-1089
- Differs: about 350 lines were restructured out of one minified function. The choices match on reading, but no test reaches the 6 crossing flags or 8 corner flags, nor the off-screen label that slides along its bounds and flips direction.
- Fix: table-driven tests, one rect pair per flag, expected values generated by running old module 540 on the same inputs; one off-screen case per axis.

### R6-A-025 (medium): snap line segment splitting and painting are only covered by screenshots
- Old: public/chunk.vendor.js:40513-40553, 40874-40925, 40944-41021
- New: next/src/editor/guides/guides.ts:174-231, 584-612, 678-827
- Differs: code matches. srcBounds splitting (neighbours before and after, source past the line end, no bounds), the point-line extension when a marker is replaced (guides.ts:586), and painting of freeSegmentsColor, markers and value hints are only hit incidentally by three overlay shots.
- Fix: unit test mapRect then finishMap with two or three boxes and a stub distance helper, asserting freeSegments and valueSegments; paint test with a recording canvas.

### R6-A-026 (medium): grid painting with several dirty rects and zoomed-out cells is untested
- Old: public/chunk.vendor.js:101020-101300
- New: next/src/editor/guides/grid-guide.ts:46, 54-170
- Differs: code matches. Parity runs at zoom 1 with 25px cells and one dirty area, so the MIN_CELL_SPACE multiplier, the saved-canvas copy/restore (boxed with several dirty rects, axonometric with merged rects) and the flat-angle row path never run.
- Fix: fake-canvas tests: zoom 0.1 with gx 5, two dirty rects in boxed mode (clearRect/drawCanvas order), ga1 = 0.

### R6-A-027 (medium): label guides and the action guide have no test
- Old: public/chunk.vendor.js:101792-101983, 235527-235699
- New: next/src/editor/guides/page-label-guide.ts:30, 68; label-guide.ts:77-118; action-guide.ts:52; symbol-label-guide.ts:30
- Differs: code matches. Untested: page filter (later or active page covering), selected and highlighted colours, ellipsis truncation loop, the "○"/"●" symbol prefixes, the 5px action offset. page-overlay is not ported.
- Fix: unit tests with a measureText stub for truncation, filter cases and action placement.

### R6-A-028 (medium): snap scope rules have no test
- Old: public/chunk.vendor.js:32759-32790, 32822-32845, 101618-101640
- New: next/src/editor/guides/bbox-guide.ts:720, 752, 799-848; points-guide.ts:309-349
- Differs: code matches. Nothing tests that group children are skipped without a scope, that a scope limits snapping to the container's children, or that the effective scope switches when the point is over another page.
- Fix: unit test with a group of two rects: no snap to a child without scope, snap with the group as scope, _eSnapElems switch over another page.

### R6-A-029 (medium): snapping toggles and snap zones are only partly tested
- Old: public/chunk.vendor.js:25350-25363, 41160-41215, 41231-41238
- New: next/src/editor/guides/guide.ts:236; guides.ts:856-918, 940
- Differs: code matches. Tested: Cmd/Ctrl inverting, the right-center zone. Untested: other closest-side branches of getBBoxSnapZones and the small-box length rule. snapping-disabled, bbox-guide-toggled-off, full-pixels-off and snap-zones are not ported.
- Fix: parametrise the getBBoxSnapZones test over nine sides and three box sizes.

### R6-A-030 (medium): risky touch branches have no test; synthesized mouse event fields are never asserted
- Old: public/designer.browser.dev.js:152138-152145, 57985-57989, 58049-58069, 104184-104189, 152438-152448, 165779-165806
- New: next/src/editor/touch/document-touch-target.ts:51-64; tap-gesture.ts:98; gesture.ts:56-75; pan-gesture.ts:32-38; pinch-gesture.ts:135-148; long-press-event.ts:146-165
- Differs: code matches. Untested: DocumentTouchTarget._touchEnd focus/blur cases; touchcancel (TapGesture.cancel's cancelable mouseup, Pan/LongPress cleanup); PanGesture ignoring non-cancelable touchmove and touches not down at start; PinchGesture.end returning true with a finger still down (deactivates Tap/Pan/LongPress, so no mouseup) and start without a view; gesturestart dropping the delayed start; the Safari path (passive capture, stopping the trusted mousedown); the in-scene no-swallow branch. FakeMouseEvent in touch-testing.ts keeps only type, cancelable, clientX/Y and button, so bubbles, detail=1, screenX/Y and view (the initMouseEvent replacement) are never checked.
- Fix: unit tests per branch; make FakeMouseEvent keep the whole init dictionary and assert `bubbles: true, detail: 1`, screen coordinates and `relatedTarget: null`.

## Low

### R6-A-031 (low): parity bookkeeping hides the guides cluster's coverage
- New: next/parity/ported/editor-guides.json
- Differs: empty, while 21 snap scenarios exercising the cluster are listed under editor-tools-base.json and editor-tools-select.json. Not ported: snapping-disabled, snapping-disabled-ctrl-enables, bbox-guide-toggled-off, full-pixels-off, page-overlay, snap-zones, snap-zones-overlay, snap-to-pixel-grid-action, guides/ruler-*.
- Fix: list the snap ids in editor-guides.json too, or add a note that the cluster is credited through editor-tools.

### R6-A-032 (low): clearInternalSelection no longer swallows exceptions
- Old: public/chunk.vendor.js:20770-20775
- New: next/src/editor/editor.ts:1542-1551
- Differs: old `finally { return (this._finishSelectionUpdate(), !0); }` swallowed any exception from removeFlag (e.g. a listener) and returned true. New rethrows.
- Fix: return true from the finally with a comment, or note the change in QUESTIONS.md.

### R6-A-033 (low): GLongPressEvent document listeners now register after DocumentTouchTarget's
- Old: public/designer.browser.dev.js:165828 (started at module load, before GDesigner)
- New: next/src/app/shell/designer.ts:284 vs 1388
- Differs: the long-press touchstart/mousedown listener now runs after DocumentTouchTarget's, which calls preventDefault; long press bails on defaultPrevented. Document touch listeners are passive by default in current browsers, so probably no visible change. Not tested on a device.
- Fix: call startLongPressEvents() before `new DocumentTouchTarget(document)`, or comment why order doesn't matter.

### R6-A-034 (low): openInlineEditor tolerates a missing tool manager; stale comment
- Old: public/chunk.vendor.js:22134-22140
- New: next/src/editor/editor.ts:2906-2911
- Differs: old threw without a tool manager; new treats null as "no temporary tool". The comment says the tool manager "arrives with the tools cluster (level 9)", which is already ported.
- Fix: reword the comment to the real reason (workspace without the tools module, as in unit tests), or list it as an accepted deviation.

### R6-A-035 (low): _finishPaint returns quietly when no tile holds the graphic
- Old: public/chunk.vendor.js:63163-63166
- New: next/src/editor/view/scene-widget.ts:934-935
- Differs: old threw a TypeError and skipped resetting renderInProgress and the noWebGL restore; new returns. Only reachable with DRAW_DURING_RENDERING true (default false).
- Fix: keep the guard, comment it as a deliberate deviation.

### R6-A-036 (low): debug timing hooks dropped without a note
- Old: public/chunk.vendor.js:63128, 63339, 63373, 62778
- New: next/src/editor/view/scene-widget.ts:450-453, 891-903
- Differs: ENABLE_TIMING console.time/timeEnd calls are gone; the debug-canvas clear has a real window check instead of the always-true one. Debug only.
- Fix: restore the ENABLE_TIMING calls or note the drop in the file header.

### R6-A-037 (low): late-bound.ts hides wiring errors and has a dead no-op
- Old: public/chunk.vendor.js:236437, 236868
- New: next/src/editor/view/late-bound.ts:44-62; editor-widget.ts:157, 473, 600
- Differs: tools are ported now. A scene on a plain workspace silently gets no tool painting or invalidation instead of failing. registerCursorStyle has no caller (`void init`). Related to R6-A-003.
- Fix: drop registerCursorStyle, use ToolManager.InvalidationRequestEvent directly, warn in development when getToolManager() is null.

### R6-A-038 (low): limitScrollingToView and watermark are dead and untested
- Old: public/chunk.vendor.js:63020-63120, 63189-63208
- New: next/src/editor/view/scene-widget.ts:823-888, 940-948, 966-985, 1040-1048
- Differs: code matches. Nothing enables limitScrollingToView; app/shell/window.ts:513 only sets watermark to null. _limitScrollPosition keeps the old reuse of the content-box variable in output mode.
- Fix: one unit test each, or mark both kept-but-unused in QUESTIONS.md.

### R6-A-039 (low): PROGRESS.md claims the updateActiveEditorCursor quirk is pinned by a test; none exists
- Old: public/chunk.vendor.js:107742-107746
- New: next/src/editor/style-ed-manager.ts:265; next/docs/rewrite/PROGRESS.md:254
- Differs: no test calls updateActiveEditorCursor or StyleEditor.updateCursor, and nothing in the new code calls it on a style editor.
- Fix: add a test expecting the TypeError, or drop the "pinned" claim.

### R6-A-040 (low): EditorWorkspace test leaves a dummy tool-manager factory behind
- New: next/src/editor/editor-core-parts.test.ts:106-116
- Differs: finally sets the factory to `() => null` instead of restoring the previous one; the first assertion only passes because the file doesn't import tool-manager.ts.
- Fix: export a reset helper or restore the previous factory.

### R6-A-041 (low): copied minified names in _measureCorners
- Old: public/chunk.vendor.js:77406-77437
- New: next/src/editor/guides/distance-helper.ts:551-558
- Differs: flags are still named de, ge, fe, me, ye, _e, ve, be.
- Fix: name them after the aligned edge and which rect is inside (e.g. alignedBottomTargetInside), one-line comment each.

### R6-A-042 (low): resizeSelection keeps minified parameter names
- New: next/src/editor/editor.ts:1738, 1673
- Differs: parameters `a, b, c` (old e,t,n) are the part id, part data and modifier/options that BlockEditor.resize takes. scaleSelection's `_unused` (old `r`) has no comment saying the old code ignored it.
- Fix: rename after BlockEditor.resize's parameters; comment `_unused`.

### R6-A-043 (low): heavy casts in editor.ts
- New: next/src/editor/editor.ts:98-134, 2150-2237 (71 `as unknown as`, 22 `as never` in the file)
- Differs: no `any`, but EdNode's `[member: string]: unknown` index signature lets member typos type-check, and convert/join/split are full of double casts (including for $evenodd and $closed) exactly where no test runs (R6-A-011).
- Fix: type locals as Path/CompoundPath, use engine setters for $evenodd/$closed, drop the index signature and type the few members that need it.

### R6-A-044 (low): unneeded casts in ActionManager, StyleEdManager and the view
- New: next/src/editor/action-manager.ts:41-45; style-ed-manager.ts:203, 206, 212, 307; view/editor-widget.ts:171-172, 665, 822, 842, 908, 1000; view/scene-widget.ts:100, 835-836, 894, 1488
- Differs: Scene.hitTest is fully typed but cast to `unknown as {hitTest(...args: unknown[])}`; StyleEdManager passes the holder `as never` three times without a reason comment; editor-widget casts a field already typed RulerWidget | null via `unknown`; local interfaces paper over engine types (getPaintBBox, getSymbols, hitTest, Symbol._master). ActionManager has no registerClass, unlike its siblings (cosmetic).
- Fix: call typed APIs directly, type PatternHolder properly or add reason comments, fix the engine declarations and remove the local interfaces.

### R6-A-045 (low): comment claims a guarantee that doesn't hold
- Old: public/chunk.vendor.js:40587-40593, 77781
- New: next/src/editor/guides/guides.ts:277-281; distance-helper.ts:780-783; bbox-guide.ts:151; points-guide.ts:151
- Differs: the comment says "every visual added at least one line", but a GuideLine without two points leaves bounds null, which coerces to 0 as in the old code. The `pagePosition as unknown as Point` casts hide a similar mismatch.
- Fix: reword to "null bounds coerce to 0 as in the old code", or type as `number | null` with an explicit Number().
