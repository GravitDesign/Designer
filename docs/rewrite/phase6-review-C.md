# Phase 6 review, group C: editor-tools-base, editor-tools-select, editor-tools-path, editor-paths-graph-annotations

Scope: every old module that port-map.tsv assigns to these four clusters (all tools in next/src/editor/tools/, the paths graph editor and tool, the annotation editors and tools), the barrels (module 1 into next/src/engine/index.ts, module 15 into next/src/editor/input-index.ts, module 53 into next/src/editor/index.ts) and the interim GDesigner setup in next/src/parity/app/editor-tools.ts as of commit 2071910b. Each old function, static, prototype default and branch was compared with its counterpart. The unit tests in scope pass (select and sub-select 35, paths-graph-editor 13, the shape, view and tool-manager tests 39).

The tool ports are very close. Branch order, transaction names, kept quirks and float operation order match in every module. The one behaviour difference inside the editor is small (R6-C-034). The real gaps are the dropped collab-text editors (R6-C-001), an old crash in the magic tool that is kept without a note (R6-C-002), and two things the interim GDesigner setup does differently from the old app (R6-C-003, R6-C-004). Most other findings are risky branches that no unit test or ported scenario runs.

The barrels are complete. engine/index.ts re-exports every module 1 name except the dropped GRendererCtx and GRendererCtxDbg, in the old order, and it imports selector.ts, as module 1 loaded module 507. input-index.ts re-exports module 15 minus the dropped GInputRecorder. editor/index.ts loads editor.ts first and then every element editor that module 53 loaded. The gradient and style editors are loaded through style-ed-manager.ts. Nothing imports engine/index.ts or input-index.ts yet. tsc still checks them because tsconfig includes src.

## High

None.

## Medium

### R6-C-001 (medium): GCollabText and GCollaborativeTextAnnotation nodes are ported, but their element editors are not
- Old: public/chunk.vendor.js:237927-238042 (GCollabTextEditor, module 1087) and 238063-238093 (GCollaborativeTextAnnotationEditor, module 1089). The editor barrel registers both at 10552 and 10579.
- New: the nodes exist in next/src/engine/scene/annotations/collab-text.ts and collaborative-text-annotation.ts, but no editor is registered for them. ElementEditor.createEditor looks editors up by exact type, so openEditor returns null. The CollabText branch in next/src/editor/editor.ts:2914 (switch to text mode, reopen the editor) is dead code.
- Differs: in the old app, a CollabText from a cloud file got a rectangle-based editor without rotate and resize, plus an inline GTextEditor child in text mode, so it could be edited. The collaborative text annotation got an editor without rotate and resize whose _showEditor returns false. In the new app such nodes have no editor at all. The port-map drop reason ("cloud collaboration") only covers the cloud sync, but these nodes can still appear in files.
- Fix: port both editors. Each has about 30 lines of logic. Or record the drop in QUESTIONS.md with what users lose, and remove or comment out the dead branch in editor.ts.

### R6-C-002 (medium): the magic tool's crash on open sub-paths is kept but not documented
- Old: public/chunk.vendor.js:106893-106898 (calls `.item.getParent()` on raw vertex sources)
- New: next/src/editor/tools/magic-tool.ts:170-178, pinned by "MagicTool with open sub-paths" in view-tools.test.ts:182
- Differs: same as the old code, but users can hit it and it has no QUESTIONS.md or BUGS-FIXED.md entry. Select a closed shape and an open path, then draw a magic stroke. The closed shapes are removed first, then a TypeError comes out of the mouse handler. The freehand tool's `finally` still commits the transaction, so the document is left with the shape gone and the raw stroke present. I haven't tested whether undo brings the shape back.
- Fix: add a QUESTIONS.md entry, or fix it as a BUGS-FIXED item by not removing anything for the open parts, which is what the old code clearly meant. Point the test comment at the entry.

### R6-C-003 (medium): interim setup: two stored settings that GDesigner.init gives the editor are not applied
- Old: public/designer.browser.dev.js:122684-122688 (`gContainer.getProperty("designer.settings.dimension.preserveratio")` sets GEditorOptions.preserveAspectRatio and allowTextRatioPreservation) and 122694-122700 (`designer.settings.outline-view.enabled` switches the scene paint mode to Outline)
- New: next/src/parity/app/editor-tools.ts@2071910b:97-113 sets the other GDesigner.init options but not these two. The keys exist in next/src/app/storage/local-storage.ts:35 and 68, but nothing reads them into the editor at boot.
- Differs: a user who turned on "keep ratio" (or outline view) starts the new app with plain resizing (or normal paint mode). Resizing with the select tool (move-transform.ts:256) then gives different geometry than the old app did.
- Fix: read both storage properties at boot and set EditorOptions.preserveAspectRatio and allowTextRatioPreservation (and the outline paint mode) the same way. Make sure the phase 7 GDesigner port carries this over.

### R6-C-004 (medium): interim setup: replacing the scene of the active document leaves the default-style lookup on the old scene
- Old: public/designer.browser.dev.js:6016-6025 (GDocument.setScene deactivates and reactivates the active document) and 55930-55953 (GPropertiesSidebar._activateDocument binds to the new editor and scene and calls _updateFromToolOrSelection)
- New: next/src/parity/app/editor-tools.ts@2071910b:484-508. activatePropertiesDocument returns early when the document is the same object, so after InterimDocument.setScene on a ready document the listeners stay on the old editor and scene.
- Differs: in the old app, re-activation asks the active item tool for its default style, which creates the scene's default styles, and later selection, tool and page changes on the new scene do the same. In the interim app none of this runs for the new scene, so a document saved after a scene replacement can lack the default styles the old app wrote.
- Fix: key the early return on the document and its scene (or its editor), or rebind whenever the scene changes, as the old deactivate and activate did. Add a test that calls setScene on the active document and checks that the new scene gets the default styles.

### R6-C-005 (medium): moving elements onto another page and swapping pages is untested
- Old: public/chunk.vendor.js:59318-59400 (the "& Move to Page" / "& Switch Pages" part of _mouseDragEnd) and 60215-60250 (page targets in _updateSelectionTransform)
- New: next/src/editor/tools/select/drop-apply.ts:139-213 (movePagesOrElements) and select/move-transform.ts:282-345 (collectDropTargets)
- Differs: no difference found, but nothing runs this code. The eledit/page-label-* scenarios need the view.toggle-multi-page-mode action. The risky parts are the page-offset transform on moved children, the SWITCH_ORDER insert order, the undo names, and the scene's begin/end update and block-reference calls.
- Fix: add a select-tool.test.ts case that turns on multiPageView in the view configuration:
  - Drag a rectangle from page 1 onto page 2. Assert the new parent, the unchanged scene position, and an undo name ending in "& Move to Page".
  - Drag page 2's label onto page 1. Assert the child order and "& Switch Pages".

### R6-C-006 (medium): dropping an image into an image grid, and instances following a dragged symbol master, are untested
- Old: public/chunk.vendor.js:59288-59316 (`addImage(t, e.box)` for an image grid target) and 60300-60320 (visitReferences in _gatherItemsForAdd)
- New: select/drop-apply.ts:100-125 and select/move-transform.ts:383-400 (referencesOf)
- Differs: no difference found. Only pointer/meta-drag-into-image-mask is ported, and its target is a shape. referencesOf returns undefined for a non-SceneNode and the result is then iterated, as in the old code. That is safe only because Element extends SceneNode.
- Fix: unit tests for both:
  - Drag an image over an ImageGrid and assert that addImage got the page-offset box.
  - Drag a symbol master whose instance sits elsewhere and assert that both land in the target.

### R6-C-007 (medium): dragging a gradient with the subselect tool is untested
- Old: public/chunk.vendor.js:59128-59140 (no beginPan and no deactivateEditor while dragging a style editor part) and 59252-59254 (getEditorData passed to commitTransaction)
- New: select-tool.ts:780-794 (styleDrag), select/drop-apply.ts:84
- Differs: no difference found. The eledit/gradient-* scenarios need the fill chooser and aren't ported.
- Fix: in sub-select-tool.test.ts, turn styleEditors on, give a shape a linear gradient and drag a stop. Assert that commitTransaction's second argument equals getEditorData(), and that the style editor manager keeps its active editor during the drag.

### R6-C-008 (medium): the "click" distance helper behaviour is untested
- Old: public/chunk.vendor.js:58950-58955, 60716-60746 (_updateDistanceHelper with byClick and the _elementMeasurementsToggle flip), 59489-59494 (catchesContextMenu)
- New: select-tool.ts:689, select/hover.ts:225-293
- Differs: only the default behaviour runs (pointer/alt-distance-*). The touch layout sets "click" (Designer._applyTouchEditorOptions). In that mode no test reaches the toggle between page and element, the context menu capture, or the skipped selection on release.
- Fix: a unit test with distanceHelperBehaviour "click" and Alt held. Click another element twice and assert that refreshVisuals gets the element's box, then the page's, and that the selection doesn't change.

### R6-C-009 (medium): the lasso's translation during auto-pan and Space-move is untested
- Old: public/chunk.vendor.js:102519-102538 (splitVertexSource on both containers, remapping _currentPoints and _current)
- New: next/src/editor/tools/lasso-tool.ts:89-101
- Differs: no difference found. The lasso tests only cover plain drags, and remapping the already-fitted part of the outline is where mistakes would hide.
- Fix: draw more than 20 points so a fit happens, call translate(new Point(10, 0)), then expandToPoint. Assert that the first vertex of both containers moved by 10 and that the pending points were remapped.

### R6-C-010 (medium): bending a paths graph segment by dragging is untested
- Old: public/chunk.vendor.js:52193-52370 (selectToolDragStartAction, left-button segment branch) and 51904-51936 (movePart Handles, including `+ 0.01` on the right handle)
- New: next/src/editor/paths-graph/paths-graph-editor.ts:809-944 and 469-503
- Differs: no difference found, but no test reaches:
  - slope ≈0 or ≈1 becoming Point parts;
  - the three handle-creation cases (left missing, right missing, both present);
  - the rehit through pathPreview.pathHitTest;
  - the cL/cR weights and the +0.01 offset.
- Fix: unit tests that drag a straight segment, a segment with only hrx/hry, and a curved one. Assert the PartInfo data (cL, apLhr, apRhl) and the handle values after movePart and _applyPartMove.

### R6-C-011 (medium): applying an edge-mode move (_partsGeometryChanged) is untested
- Old: public/chunk.vendor.js:53646-53760
- New: paths-graph-editor.ts:2437-2508
- Differs: no difference found. These branches rewrite the saved graph (edges and anchors) and nothing runs them:
  - setPathBase and reopening the editor;
  - relinking when the curve crosses itself or another edge, or when an end point is dragged off its anchor (removeEdge, then addGraphLine with a null start or end);
  - the Handles sub-type that bypasses edge mode.
- Fix: one unit test per branch. Move an edge's middle point without crossing (same edge id, new path base). Move it across another edge (edge replaced, facets rebuilt). Move the first point (source dropped).

### R6-C-012 (medium): relinking in anchor mode, and its event blocking, is untested
- Old: public/chunk.vendor.js:53761-53870
- New: paths-graph-editor.ts:2509-2622
- Differs: no difference found. The test "moves selected anchors and the edge ends at them" covers only the non-crossing path. Nothing covers removeEdge, re-adding with addGraphLine, or _endBlockEvents running only at the last relinked edge.
- Fix: move an anchor so that an attached edge crosses another edge. Assert the edge count and anchor ids, and that GeometryChangeEvent fires once after the apply.

### R6-C-013 (medium): right-button drags in the paths graph editor are untested
- Old: public/chunk.vendor.js:52199-52215 (right-button drag on a segment selects both anchors and copies isolated/selectable) and 52371-52450 (right-button drag on a smooth point pulls handles; Alt fills only the missing one; for connector points the previous point's type picks the side)
- New: paths-graph-editor.ts:797-808 and 946-1011
- Fix: a unit test per branch. Set Platform.modifiers.optionKey for the Alt case. Assert the preview handle properties and the returned part type.

### R6-C-014 (medium): the paths graph double-click toggle has no test, and its scenario isn't ported
- Old: public/chunk.vendor.js:52460-52484 (Asymmetric becomes Symmetric with ah set true then false; anything else becomes Asymmetric)
- New: paths-graph-editor.ts:1026-1047
- Differs: no difference found. editor-tools/extra/paths-graph-delete-and-toggle (cases-extra.ts:144) exists but isn't in any parity/ported/*.json. Its old-app run fails with "same values, different formatting".
- Fix: regenerate that expected file and port the scenario. Add a unit test for the toggle on an edge point in detail mode.

### R6-C-015 (medium): Shift-constrained handle drags in the paths graph editor are untested
- Old: public/chunk.vendor.js:53453-53465 (constrainPosition), 51983-52000, 52806-52832 (constrain line and annotation in _postPaint), 51729-51737 (getBBox constrain box)
- New: paths-graph-editor.ts:2128-2142, 2244-2269, 1358-1381, 347-356
- Fix: move a LeftHandle part with Shift held. Assert the constrained handle position, that _constrainPair is set, and that _postPaint clears it.

### R6-C-016 (medium): _checkCustomStyle (writes the saved `cSt` flag) and _geometryChange are untested
- Old: public/chunk.vendor.js:53619-53645
- New: paths-graph-editor.ts:2345-2377
- Differs: no difference found. _checkCustomStyle writes the saved `cSt` edge property when a border layer is added to or removed from a selected edge, or from an edge of a selected facet. _geometryChange closes the path base editor and resets the extending mode.
- Fix: select an edge, add a BorderPaintLayer and expect `cSt === true`. Remove it and expect false. Fire a geometry change on the graph and expect getPathBaseInEdit() to be null.

### R6-C-017 (medium): marquee selection and highlighting of paths graph anchors are untested
- Old: public/chunk.vendor.js:53274-53340 (updatePartSelectionUnderCollision)
- New: paths-graph-editor.ts:1911-1989
- Fix: unit tests with a collision area over two of four anchors. Cover the plain case, the toggle with an anchor already selected, and highlighting (Highlighted flags set and cleared, element flag Highlighted or Selected).

### R6-C-018 (medium): most paths graph tool branches beyond click, Esc and Enter are untested
- Old: public/chunk.vendor.js:104227-104303 (_updateHandles, _mouseDrag), 104357-104382 (release after a press on an anchor or edge, splitEdge), 104423-104445 (_modifiersChanged), 104586-104629 (_mouseDownOnEdit), 104316-104329 (double click), 104353-104357 (Edit-mode release)
- New: next/src/editor/paths-graph/paths-graph-tool.ts:544-631, 649-724, 750-769, 886-929, 360-366
- Differs: no difference found. paths-graph-tool.test.ts and the scenarios (pen/paths-graph-tool, extra/paths-graph-*) only click and press Esc or Enter.
- Fix: unit tests for:
  - a drag after a click (hlx, hly, hrx, hry, tp);
  - Alt held at the press, then a drag;
  - a press on an existing anchor and on an edge in Edit mode (anchor and edge counts, undo names "Insert Point" then "Insert Element(s)");
  - a line ended on an edge;
  - a double click within DBLCLICKTM, for both selectDoubleClickBehavior values;
  - deactivating the tool while a preview point exists.

### R6-C-019 (medium): the comment annotation editor's painting is untested
- Old: public/chunk.vendor.js:107312-107348 (_paintOutline: white fill, then the rim in the outline, highlight or selection colour, at half scale with even-odd fill)
- New: next/src/editor/annotations/comment-annotation-editor.ts:121-153
- Differs: the code matches. Passing null instead of 0 as the composite operator is equivalent, because paint-canvas.ts:1065 falls back to SourceOver. But no test paints it, and no annotations/* scenario is ported.
- Fix: a unit test with a recording canvas stub. Assert two putVertices and fillVertices pairs ("#fff" first, then the outline colour), the highlight colour when Highlighted is set, and no calls when noVertices is set or the element is Hidden.

### R6-C-020 (medium): continuing a path from its first point (Prepend mode) is untested
- Old: public/chunk.vendor.js:78408-78428, 78461-78479, 76226-76232, 76550-76566, 76593-76612
- New: next/src/editor/tools/path-tool.ts:451-463, 493-505; pen-tool.ts:210-214, 492-505, 538-566
- Differs: no difference found. pen/continue-open-path clicks the last point of its fixture, so the following never run: inserting before the first point, shiftPreviewTable(1), ExtendingMode.Beginning, the Prepend handle mirroring, and the Prepend connector projection.
- Fix: a pen-tool.test.ts case that selects the first point of an open polyline and click-drags a new point. Check the point order and hlx/hly/hrx/hry. A "pen/continue-from-first-point" scenario would also help.

### R6-C-021 (medium): pen: pressing on an existing end point with Alt already held is untested
- Old: public/chunk.vendor.js:76614-76627 (else branch of _updateHandles), 76115, 76571-76575
- New: pen-tool.ts:567-578, 89; path-tool.ts:637-648
- Differs: no difference found. The tests only press Alt after the drag has started. Nothing reaches `_dragStartPt.hrx + dx` or `_firstAlt = !this._dragStarted`.
- Fix: drag out a curve point, hold Alt, press on that point and drag. Check that hrx/hry equal the old handle plus the drag delta and that tp is Asymmetric.

### R6-C-022 (medium): pen: dragging connector handles and rounded-corner shoulders is untested
- Old: public/chunk.vendor.js:76570-76613 (connector projection), 76760-76796 (_updateShoulders, cr/cl), 76435
- New: pen-tool.ts:507-566, 723-750, 317
- Differs: no difference found. The right-click tests click but never drag.
- Fix:
  - Alt+right-press and drag. Check that hrx/hry lie on the line through the previous point, and that they are null when dragged backwards (dot product 0 or less).
  - Right-press and drag. Check that cr equals the view distance, and that it is null when dragged back onto the point.

### R6-C-023 (medium): pen: two branches that decide the handles after closing are untested
- Old: public/chunk.vendor.js:76265-76302, 76534-76549
- New: pen-tool.ts:244-273, 469-491
- Differs: no difference found. They decide which handles a closed curved path saves.
- Fix:
  - Drag out a curve point, then click the same point. Expect hrx/hry null and no point added.
  - Close with a drag on the first point while the neighbouring end has no handle. Expect tp Asymmetric with a null handle pair.

### R6-C-024 (medium): pen: Edit-mode drags, compound paths and the "edit" double-click option are untested
- Old: public/chunk.vendor.js:76633-76643, 76479-76487, 78269-78276, 76103-76104
- New: pen-tool.ts:585-594, 423-430, 78-80; path-tool.ts:314-320
- Differs: no difference found. pen/edit-existing-path only clicks.
- Fix:
  - Drag from a middle point of a selected path. Expect symmetric handles and the undo name "Modify Point Properties".
  - Press on a segment of a sub-path of a selected compound path.
  - With selectDoubleClickBehavior "edit", double-press and expect notifyJobDone.

### R6-C-025 (medium): knife cuts of compound paths, styled corners, evenodd false and multi-piece sides are untested
- Old: public/chunk.vendor.js:105603-105767 (_performCut), 105793-105845 (convertToPath)
- New: next/src/editor/tools/knife-tool.ts:861-1063, 1100-1170
- Differs: no difference found. Tests and scenarios only cut plain rectangles, ellipses and one text. These branches change file content and nothing runs them:
  - a compound path split into closed and open groups, with a new CompoundPath when needed;
  - corners with `cl` or `cr` set, which go through PathUtil.createPathFromVertexSource and copy $evenodd and $closed;
  - evenodd false carried onto the pieces;
  - a side with several pieces, wrapped in a new Group;
  - non-CompoundShape children cloned onto every piece;
  - `fit` forced true for a filled CompoundPath or CompoundShape.
- Fix: unit tests that cut a compound path of two rectangles, a rounded rectangle, an evenodd false path, and a U shape across both legs. Assert the tree, evenodd and the piece count.

### R6-C-026 (medium): the knife's element filter is untested
- Old: public/chunk.vendor.js:105847-105868 (_selectFilter, _getSelectableElement, _getSelectableElements)
- New: knife-tool.ts:1173-1200
- Differs: no difference found. No test checks that the knife leaves these uncut: FullLocked elements, `plkt` NoSelect/NoEdit/NoDelete blocks, children of a NoEdit parent, images and groups. The quirk that a selection skips _selectFilter (it only drops groups and images) isn't pinned either.
- Fix: with nothing selected, cut a locked, a program-locked and an image element and assert that they don't change. Add a case where a selected NoEdit rectangle does get cut.

### R6-C-027 (medium): bezigon _closeIfNeeded (closing on release) is untested
- Old: public/chunk.vendor.js:106405-106462
- New: next/src/editor/tools/bezigon-tool.ts:282-348
- Differs: no difference found. Tests only close by clicking the first point (bezigon-tool.ts:118-136). The release path sets Asymmetric with `ah` false under Alt, copies hlx/hly when the end point has no automatic handles, and removes the duplicate point when _newPoint is false.
- Fix: press about 40 px from the first point, drag onto it and release, with and without Alt. Assert closed, the point count, and the first point's ah, tp, hlx and hly.

### R6-C-028 (medium): the simple shape tool (ready shapes) has no tests
- Old: public/chunk.vendor.js:106521-106617 (GSimpleShapeTool)
- New: next/src/editor/tools/simple-shape-tool.ts:47-128; tool-manager.ts:350-351 (setIcon on activation)
- Differs: no difference found. Only the registry check touches it, and no scenario uses it. Untested:
  - the annotation start values from the definition;
  - placing the shape's top-left corner at the click;
  - mapping the source box onto the drag area;
  - the empty source box returning false;
  - a null shape when the processor is missing;
  - the icon reaching the shape.
- Fix: a unit test with a small definition (one annotation, a few vertices) that asserts the transform after a click and after a drag, and that the icon is set.

### R6-C-029 (medium): the fill tool's paint branch is untested
- Old: public/chunk.vendor.js:105877-106021
- New: next/src/editor/tools/fill-tool.ts:105-188
- Differs: no difference found. fill/live-paint-tool clicks once without a fill, so it only reaches the branch that copies the graph's style. Untested:
  - setting the facet's `cSt` and a new fill layer with the opacity;
  - one transaction across press, drag and release over several facets;
  - the step from a facet's map container up to the graph;
  - both selection fill getters, including the quirk that the opacity getter returns 1 without a paths graph but null for a graph without fills.
- Fix: set a colour at 0.5 opacity, press on one facet, drag to another and release. Assert one undo step and the fill on both facets. Then set the fill to null, check that the graph's style comes back, and assert both getters.

## Low

### R6-C-030 (low): interim setup: tool shortcuts skip canActivateTool and the annotations sidebar check
- Old: public/designer.browser.dev.js:122789-122808 (the down callback checks the pro feature and `canActivateTool(t, true)`), 122540-122553, 122824-122830 (Q does nothing while the annotations sidebar is active)
- New: next/src/parity/app/editor-tools.ts@2071910b:586-612
- Differs: with the annotations sidebar active, the old app ignored the keys of path, shape, knife, insert and "special" tools (P, B, K, L, R, M, E, T, O) and Q. The interim hooks always switch. There is no sidebar yet, so nothing differs today. The pro check is always true in this build.
- Fix: carry both checks into the phase 7 shortcut registration. Add a test with the annotations sidebar active.

### R6-C-031 (low): interim setup: the default-style lookup only runs for "ready" documents
- Old: public/designer.browser.dev.js:55922-55953 (GPropertiesSidebar binds on every Activated event, whatever the status)
- New: next/src/parity/app/editor-tools.ts@2071910b:503-508
- Differs: a document that is activated while loading or locked gets no lookup until it becomes ready. In the old app getDefaultStyle ran at activation. The saved default styles are the same once the document is ready, but the timing differs.
- Fix: phase 7 should bind on activation like the old sidebar. Add a comment if the status check is only there for the interim loader.

### R6-C-032 (low): kept throw when Shift is held while hovering with the paths graph tool is not in QUESTIONS.md
- Old: public/chunk.vendor.js:104076-104083, 104478-104490
- New: paths-graph-tool.ts:449-453, 814-818. The comment points at "the BUGS-FIXED candidates", which only exist in PROGRESS.md:265.
- Differs: same behaviour, pinned by a unit test. Users can hit it: hold Shift while hovering after the first click.
- Fix: add a QUESTIONS.md (or BUGS-FIXED.md) entry and point the comment at it.

### R6-C-033 (low): code comments cite "BUGS-FIXED candidates" sections that don't exist
- New: paths-graph-editor.ts:20-23 and 2019-2023 ("Moving a whole paths graph", "Paths graph edge delete"); pen-tool.ts:764-767 and pen-tool.test.ts:187-189 ("Pen Space in a scrolled view")
- Differs: the bugs are only listed in PROGRESS.md (around lines 115, 185 and 263-268).
- Fix: point the comments at PROGRESS.md, or add QUESTIONS.md entries and cite them by number, as Q-158 and Q-159 are cited.

### R6-C-034 (low): bending a segment no longer throws when a point preview is missing
- Old: public/chunk.vendor.js:51905-51915 (reads `getProperty("x")` from getPathPointPreview(apLeft/apRight) with no null check)
- New: paths-graph-editor.ts:469-503 (calls getPathPointPreview but drops the reads)
- Differs: if the path base editor or a preview is gone mid-drag (for example after _geometryChange closed _pbEditor), the old code throws a TypeError. The new code carries on, and _transformPreviewPointCoordinates silently does nothing.
- Fix: keep the reads with a comment, or record the deviation in QUESTIONS.md.

### R6-C-035 (low): paths graph updatePartSelectionUnderCollision returns a boolean instead of the count
- Old: public/chunk.vendor.js:53339 (`this._partSelection && this._partSelection.length`)
- New: paths-graph-editor.ts:1988 (`!!(...)`)
- Differs: the return value only. The callers in editor.ts:1397-1478 test truthiness.
- Fix: return the old value, or add a comment.

### R6-C-036 (low): the select tool's paths-graph part check guards a null id where the old code threw
- Old: public/chunk.vendor.js:60093-60096, 60119-60126
- New: select/paths-graph.ts:19-21
- Differs: for a paths-graph part with a null id, the old code threw mid-drag and the new code treats it as a plain move. Normal use doesn't reach this.
- Fix: note it as a deliberate guard in a comment or in QUESTIONS.md.

### R6-C-037 (low): a hover.ts comment says no editor has highlightPart, but the paths graph editor does
- Old: public/chunk.vendor.js:53529
- New: select/hover.ts:30; the method is at paths-graph-editor.ts:2227
- Differs: behaviour is right (hover.ts duck-types the call). A cleanup that trusts the comment would break hover highlighting of graph edges and facets.
- Fix: correct the comment and add a test that hovering an unselected graph edge sets _highlightPart.

### R6-C-038 (low): unused old select tool API is kept without tests or a note
- Old: public/chunk.vendor.js:58273 (setInteractionMode), 58629-58640 (Mixed hit test), 59880-59914 (_getTopMostHit), 60795 (_switchToMoveFilter), 58275 (_pageCandidates)
- New: select-tool.ts:229, 1275, 1398, 201, 1471; select/picking.ts:66, 243
- Differs: nothing in the old vendor or app code calls these, and Mixed mode is untested.
- Fix: add a short "unused in the old app, kept for API parity" comment, or a small Mixed-mode test.

### R6-C-039 (low): two select tool helpers are no longer prototype methods
- Old: public/chunk.vendor.js:60289 (_cleanupTargetHighlights), 60300 (_gatherItemsForAdd)
- New: select/move-transform.ts:349, 371 (module functions)
- Differs: nothing outside module 334 calls them, so behaviour is the same, but subclasses can't override them.
- Fix: none needed. Optionally add thin prototype wrappers like the other helpers.

### R6-C-040 (low): pencil and highlighter tools hide a real null behind the Path type
- Old: public/chunk.vendor.js:107381-107386, 107466-107471 (_createAndAppendPath returns null when nothing was inserted)
- New: pencil-annotation-tool.ts:34-41 and highlighter-annotation-tool.ts:34-41 (`return null as unknown as Path`). The base in freehand-tool.ts:293 is typed Path, and its caller at line 424 checks for null.
- Fix: type the base method and both overrides as `Path | null` and remove the casts.

### R6-C-041 (low): `as never` and `as unknown as` casts without reason comments
- New: select-tool.ts (7), select/move-transform.ts (8), select/drop-apply.ts (3), select/hints.ts (3), magic-tool.ts:70, 107, 130-135, 156-157, 195-197, 207-209, text-tool.ts:110, 121, 298, 318, 322, shape-tool.ts:137, knife-tool.ts:896, 951, 971, 975, 1036, 1051, 1090, 1137-1144 (plus the local ContainerNode, Propertied and Cloneable stand-ins)
- Differs: no behaviour difference. Like `any`, these switch off argument checks, for example on getAlignExclusions, getCollisions, openInlineEditor, ImageGrid.addImage and, in the knife, $trf and the container methods. A wrong argument order would not be caught.
- Fix: type the engine signatures (vertex-source types for the boolean and path helpers, Text for openInlineEditor, container methods on Node, $trf on Element) so the casts can go, or add a reason comment per cast as PORTING.md asks.

### R6-C-042 (low): minified loop names in the magic tool
- New: magic-tool.ts:105-149 (loop counters `f`, `v`, `c` copied from the minified code)
- Fix: rename them to itemIndex, groupIndex and partIndex.

### R6-C-043 (low): the text tool's first hit test can never win, and nothing says so
- Old: public/chunk.vendor.js:80320-80340 (checks that the hit is both a GText and a GPath)
- New: text-tool.ts:155-173
- Differs: same behaviour. A Text is never a Path, so the second hit test, with the pick distance, always runs. Someone could later "fix" this and change hover behaviour.
- Fix: add a comment that the condition is never true and is kept on purpose.

### R6-C-044 (low): the tool exit key is untested
- Old: public/chunk.vendor.js:41264-41266, 41305-41309 (GTool), 80571-80576 (GPointerTool). The app sets the key to Escape at designer.browser.dev.js:25432-25453.
- New: tool.ts:58-67, 116-120; pointer-tool.ts:83-87
- Differs: no difference found. Nothing sets EditorOptions.toolExitKey, so these never run: the listener being added only on a full (not light) activation, the default tool coming back on the next tick, and the pointer tool returning to select mode.
- Fix: set the key to Escape, activate the rectangle tool, send Escape and expect the pointer tool after one tick. Repeat for the pointer tool in edit mode.

### R6-C-045 (low): releasing Space while the hand tool is still panning is untested
- Old: public/chunk.vendor.js:81264-81267 (fires DragEnd on the view when the hand tool can't be left)
- New: tool-manager.ts:422
- Differs: no difference found. In view/space-temporary-hand the mouse goes up before Space.
- Fix: hold Space, start a hand drag and release Space mid-drag. Assert that the view got DragEnd, panning ended and the previous tool is back.

### R6-C-046 (low): some freehand branches are untested
- Old: public/chunk.vendor.js:61217-61240 (_mouseDrag), 61335 (_mouseDblClick), 61034 (deactivate)
- New: freehand-tool.ts:456-492, 600-605, 254-268
- Differs: no difference found. Untested:
  - the Highlighted flag while the stroke's end is within 15 px of its start;
  - right-button drawing through _mouseMove;
  - a double click with selectDoubleClickBehavior "edit";
  - the 15 px threshold at zoom 2.
- Fix: drag back near the start and expect Highlighted, then move away and expect it cleared. Repeat at zoom 2.

### R6-C-047 (low): pen/path: Shift replay and starting a path on another page are untested
- Old: public/chunk.vendor.js:78566-78575, 78506-78509
- New: path-tool.ts:637-648, 550-554
- Fix:
  - Move the pointer, then fire a modifiers change with Shift and expect the preview point snapped to 45°.
  - In a two-page document, start the pen on page 2 and expect page-local x/y.

### R6-C-048 (low): no annotation drawing scenario is ported
- Old: modules 765-775
- New: next/parity/scenarios/editor-tools/cases-annot.ts. No annotations/* id is in parity/ported/*.json.
- Differs: nothing in the editor code. Every case opens the annotations sidebar (phase 7). Until then only annotation-editors.test.ts and annotation-tools.test.ts cover these modules.
- Fix: port the ids once the sidebar exists, or add a fixture hook that turns on annotation mode without the sidebar.
