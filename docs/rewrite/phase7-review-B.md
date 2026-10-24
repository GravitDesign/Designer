# Phase 7 review, group B

Scope: clusters app-menus-toolbar, app-widgets-dialogs, app-dialogs-notify, app-welcome-settings, app-touch-ui and app-fonts-ui (next/src/app/menus, toolbar, widgets, dialogs, locale, welcome, settings, touch, fonts). Every module of these clusters in port-map.tsv was reviewed; each section ends with a per-module coverage list. No tests or Playwright were run; findings come from reading the old and new code, the unit tests and the parity scenarios.

Counts: 4 high, 22 medium, 36 low (62 total).

## Menus (app-menus-toolbar)

All ten modules are wired up in the app: Designer builds ContextMenu on #windows (shell/designer.ts:1735) and Header (init at :1708); Header builds the MenuBar around the main menu; the inspector rows, layers and pages panels call ContextMenu.trigger; actions/deps.ts reads ACTION_ICONS. No parity hook in next/src/parity/app touches menus. Pro/licence, stats, cloud rename/duplicate/sync, login and the persona bar are dropped as REMOVED.md says, and I don't report them.

### R7-B-001 (medium): most context menu parity scenarios are not ported, and the tab one can't pass as recorded
- Old: public/designer.browser.dev.js:128871 (GHeader._createContextMenu, `p && s.setPro(p, r)`), 100527 (GContextMenu)
- New: next/src/app/menus/header.ts:582, next/src/app/menus/menu-item.ts:232 (setPro only sets flags)
- Differs: parity/ported/*.json lists only fill-row-delete, border-row and effect-row from editor-actions/context-menu. canvas-tree, empty-canvas, the choose-* cases, paste-here, select-hit-list, crop-menu, layers-panel, pages-panel, tab and native-menu-suppression are not listed. The same goes for ui/context/page-row, fill-row, border-row, effect-row and crop. parity/expected/editor-actions/context-menu/tab.json records the classes `legacy-feature` and `pro` on "Advanced Export..." (from the old gPro). The new setPro never adds them, and no DROP exception covers this scenario, so it fails on a dropped feature rather than a real difference. These scenarios are the only end-to-end check of the page menu, crop menu, Select hit list, Paste Here position and tab menu.
- Fix: run the remaining editor-actions/context-menu and ui/context scenarios against the app and port the ones that pass. Add a DROP-001-style exception (a .fixed expected without `pro` and `legacy-feature`) for editor-actions/context-menu/tab.

### R7-B-002 (medium): the header tab menu and in-place rename have no tests
- Old: public/designer.browser.dev.js:128111 (rename callback), 128382 (close other/all), 128871 (_createContextMenu)
- New: next/src/app/menus/header.ts:123 (TAB_MENU), 582 (_createContextMenu), 625 (_renameTab)
- Differs: header.test.ts only covers the section order, tab creation and the modified star. Nothing tests:
  - rename: Enter or focusout commits once, and an empty or unchanged name restores the old value
  - the storage item branch (setFileName, a Modified event, cover text with the extension)
  - the earlier rename's listeners being removed
  - BeforeActivate closing the overlay, clearing the items and re-checking isEnabled before activate checks it
  - Close Other disabled with a single window
  - Duplicate inserting after the source document with duplicateTitle
  - setVisible and setEnabled from the entry table
  - entries skipped when needsAction finds no action (Save As, Open Shared File, Version History)
  The matching parity scenario (context-menu/tab) is not ported (R7-B-001).
- Fix: add header tests that build the tab menu with stub actions and assert the captions, the skipped entries and the disabled Close Other. Drive _renameTab with Enter, focusout, a blank name and a second rename. Each test should fail if the listener removal or the `done` guard is taken out.

### R7-B-003 (medium): page, fill and border context menu commands are untested
- Old: public/designer.browser.dev.js:100968 (_createPageMenu: duplicate, delete, copy, export), 101040ff (fill/border delete and copy)
- New: next/src/app/menus/context-menu.ts:540-624, 638-724
- Differs: context-menu.test.ts covers routing, the effect caption, the Select list and Paste Here. These branches have no test:
  - page Delete on a page with the NoDelete program lock (no-op)
  - page Delete on a master page (systemDialog confirm, then the "action.delete-page" transaction name)
  - page Copy clipboard text, where the old code always wrote `restricted="false"` or the storage id
  - page Duplicate offset ("off" transform from getPosition(true, true, true, true))
  - Export passing `[{ element: page }]` with force
  - fill and border Copy text, and Delete removing only the first equal layer per selected node
  Only pages-panel Duplicate has a parity case, and it is unported. clipboardText also leaves out the restricted attribute when the id is undefined, where the old code wrote `restricted="undefined"`. That case is only reachable for commercial files, but nothing pins the attribute format.
- Fix: add unit tests with a fake scene and clipboard for each page and paint layer command, asserting the transaction names and the exact clipboard string.

### R7-B-004 (low): captions and tab titles are text now, an undocumented deviation
- Old: public/designer.browser.dev.js:14297 (GMenuItem.setCaption, `t.html(...)`), 128677 (_addWindowTab cover `.html(e.getTitleWithExtension())`), 128586 (_documentEvent `.html(...)`)
- New: next/src/app/menus/menu-item.ts:277-286, next/src/app/menus/header.ts:384, 438
- Differs: the old code inserted string and locale captions and the tab title as HTML. The new code uses textContent. A file or layer named `a&amp;b` or `<b>x</b>` now shows literally. That is the safer behaviour, but the menu-item comment points to a "Menu captions are text" note in "the report", and no such entry exists in QUESTIONS.md, BUGS-FIXED.md, REMOVED.md or UI.md. The header change isn't mentioned at all.
- Fix: add a QUESTIONS.md (or BUGS-FIXED) entry covering menu captions and tab titles, and point both comments to it.

### R7-B-005 (low): setChecked and changeActiveState flip the class when given undefined
- Old: public/designer.browser.dev.js:14382 (setChecked: `e ? addClass : removeClass`), 14606 (changeActiveState)
- New: next/src/app/menus/menu-item.ts:377-380, 571-573
- Differs: the new code calls `classList.toggle(name, checked)`. With `checked === undefined`, the force argument counts as missing, so the class toggles. setChecked's guard (`undefined != isChecked()` is always true) lets every update through, so an action whose isChecked returns undefined makes the item flip between checked and unchecked on each open. The old code treated undefined as unchecked. Current actions return booleans, but toggle-snap-zones returns `getSetting(...) as boolean`, and Designer.updateMenuItem passes `checked` through.
- Fix: use `toggle("g-menu-item-checked", !!checked)` and `toggle("g-active", !!active)`. Add a test that calls update twice with an action returning undefined and expects the item to stay unchecked.

### R7-B-006 (low): the header hardcodes permission checks the rest of the app asks applicationManager for
- Old: public/designer.browser.dev.js:128263 (rename isEnabled: isEditingEnabled), 128370 (duplicate: isSavingAsEnabled), 128550 (_updateViewBasedOnPermissions: isDocumentTabManagementEnabled)
- New: next/src/app/menus/header.ts:132, 202, 334-342
- Differs: the behaviour is the same today, since the local manager returns true. But layers-panel, pages-panel, outline-sidebar and save-as-action call applicationManager().isEditingEnabled() / isSavingAsEnabled(), while the header uses `() => true` and `const enabled = true`. If the manager ever returns false (read-only mode, tests), the tab menu would still offer Rename and Duplicate.
- Fix: call applicationManager().isEditingEnabled() for Rename and isSavingAsEnabled() for Duplicate, as the old code did. Leave the tab management flag as it is, or add it to ApplicationManager.

### R7-B-007 (low): context-menu.ts keeps minified names from the old code
- Old: public/designer.browser.dev.js:100968ff
- New: next/src/app/menus/context-menu.ts:542 (`const t = { DUPLICATE, ... }`), 641, 682, 732 (`const n = {...}`), 446 and 461 (loop variables `o` and `t`), 524 and 527 (`u`, `h`); next/src/app/menus/active-menu-manager.ts:126 (`p`)
- Differs: these are the old single-letter names, which the code-quality rule forbids.
- Fix: rename them to `labels`, `index`, `hitIndex`, `parentIndex`, `level`.

### R7-B-008 (low): createActionMenu has no caller or test, and getMouseLocations is new API
- Old: public/designer.browser.dev.js:72392 (createActionMenu, no caller in the old app either)
- New: next/src/app/menus/active-menu-manager.ts:56 (getMouseLocations), 103 (createActionMenu)
- Differs: createActionMenu is ported, including its divider and group logic and the "Number of categories different thant number of groups." error, but nothing calls or tests it. getMouseLocations did not exist in the old code and has no caller either.
- Fix: either add a test for createActionMenu (nested categories, dividers on group change, the mismatch error) or drop it with a REMOVED.md entry. Remove getMouseLocations, or say in its comment who needs it.

Coverage:

Module 238: reviewed, 0 findings
Module 339: reviewed, 2 findings (R7-B-004, R7-B-005)
Module 804: reviewed, 0 findings
Module 844: reviewed, 0 findings
Module 1156: reviewed, 0 findings
Module 1157: reviewed, 1 finding (R7-B-008, R7-B-007 in part)
Module 1303: reviewed, 3 findings (R7-B-001, R7-B-003, R7-B-007)
Module 1499: reviewed, 0 findings
Module 1500: reviewed, 4 findings (R7-B-001, R7-B-002, R7-B-004, R7-B-006)
Module 1501: reviewed, 0 findings

## Toolbar, zoom menu, menu and pages buttons (app-menus-toolbar)

### R7-B-009 (medium): touch save dropdown uses an invented "file.sync" id and has one blank row fewer than before
- Old: public/designer.browser.dev.js:142790-142805 (_createSaveButtonGroup)
- New: next/src/app/toolbar/zoom-menu.ts:30-31, 207-231 (_createSaveButtonGroup)
- Differs: the old menu was [save-as.<default ext>, gravit-cloud.save-as, GCloudSynchronizationAction]. Neither of the last two is registered (INVENTORY ACT-CLOUD-001/002), so getAction gave null and createAddItem(null) added two blank rows. The new code drops the cloud entry but keeps a lookup of "file.sync", an id that exists in neither code (module 1293 is GCloudSynchronizationAction with ID "sync", not "GSyncAction"). The result is one blank row instead of two, and the comment names the wrong class and id. Nothing tests this menu.
- Fix: choose one behaviour and write it down. Either drop the dead lookup so the menu only has the real save-as entry (add a QUESTIONS/REMOVED note that the old blank rows came from unregistered cloud actions), or keep both blank rows on purpose with the right ids ("gravit-cloud.save-as", "sync"). Fix the comment either way, and add a test for the menu's items.

### R7-B-010 (medium): TouchToolbar (zoom-menu.ts) has no unit tests
- Old: public/designer.browser.dev.js:142637-142941 (module 1543)
- New: next/src/app/toolbar/zoom-menu.ts (no zoom-menu.test.ts)
- Differs: parity only covers the touch menubar button and the touch zoom button (parity/scenarios/ui/touch.spec.ts:73, 85). These have no test anywhere: updateActiveWindow (title with "*" for a modified document, the text-overflow class and the span.ending with data-ending "..." + last 3 characters, hidden with no active window), the window button menu (activates a window, detaching an entry removes the window), getActiveItem of the touch zoom menu (rounded zoom finding the magnification item), _updateTouchFullUI re-inserting the zoom button before the snap button, the touch Open menu with recent documents (Toolbar._createOpenMenu), and the Electron native button overlay.
- Fix: add zoom-menu.test.ts that runs updateTouchUI on a toolbar with a stub designer. Assert the menu-section children in order, window button caption, overflow and ending, the window menu's activate and detach, and that the touch zoom menu marks 100% active at zoom 1.

### R7-B-011 (medium): the manual zoom input is untested
- Old: public/designer.browser.dev.js:140583-140690 (_initZoomButton: menudblclick, blur/keydown/keyup/keypress)
- New: next/src/app/toolbar/toolbar.ts:708-787
- Differs: toolbar.test.ts:271 only checks the DOM structure. Nothing tests a double click on the zoom caption (hides -/+, shows the input with parseInt(100*zoom)), Enter (zoomAtViewCenter(view, value/100) and restores the buttons), Escape, blur (restores only when no key is held), or the keypress filter (digits plus 8/46/37/39). These branches run only from the UI, and the dblclick path goes through MenuButton's 500 ms timers.
- Fix: add a toolbar test with fake timers. Dispatch dblclick on the zoom action button, check that the input is shown and holds the zoom, then send keydown+keyup Enter and assert zoomAtViewCenter was called with value/100 and the -/+ buttons are visible again. Add one case each for Escape and for keypress "a" being prevented.

### R7-B-012 (low): double-clicking the zoom caption with no open document now shows an empty zoom input
- Old: public/designer.browser.dev.js:140597-140610 (menudblclick: getActiveWindow().getView() throws first)
- New: next/src/app/toolbar/toolbar.ts:712-722
- Differs: with no active window, the old handler threw on getActiveWindow().getView() before it touched the DOM, so the zoom button stayed as it was. The new handler calls _showZoomInput(false) before it checks the view, so the -/+ buttons disappear and an empty input shows. Enter then only hides it again, because there is no view to zoom.
- Fix: return before _showZoomInput(false) when there is no active window or view.

### R7-B-013 (low): _zoomChanged comment contradicts the old behaviour
- Old: public/designer.browser.dev.js:140893-140918 (_windowEvent adds _updateZoomFromWindow as the TransformEvent listener, so its first argument, the event, is truthy and counts as force)
- New: next/src/app/toolbar/toolbar.ts:1015-1018
- Differs: the old code always rewrote the caption on every view transform, because the event object was taken as `force`. The new code says "the event must not count as force" and does not force. I found no case where the user sees a difference, since every caption rebuild forces anyway. But the comment says the opposite of what the old code did, and a later caption reset (for example a rebuilt touch zoom button without a forced update) would show it.
- Fix: call this._updateZoomFromWindow(true) in _zoomChanged to match the old code, or reword the comment to say the old code forced and why not forcing is safe.

### R7-B-014 (low): simple-UI parts are ported but never wired, and the drop is undocumented
- Old: public/designer.browser.dev.js:140039-140110 (_updateUI: page button, select section, comment toggle), 142689-142707 (_updateTouchSimpleUI, _updateTouchPageButton), module 1735 ($.fn.gPageButton)
- New: next/src/app/toolbar/pages-button.ts (only caller is pages-button.test.ts); toolbar.ts:262-264, 528-535, 558-594, 947-950
- Differs: the old app built the page button, select section and comment toggle only when isPagesInspectEnabled() was false (view-only or comment-only shared files). The new _updateUI drops that, so _pageButton, _selectSection and _commentToggleSection are never assigned. PageButton, _updatePageButton, the page button branch of _updateDesktopUI, _createCommentToggleToolbarBtn and updateCommentToggleStatus are dead code. This matches the local app (no sharing), but REMOVED.md, the DROP-*.json files and port-map.tsv (1735 is still "port") don't record the simple UI drop. The comment toggle also points at the dropped annotations sidebar.
- Fix: add a REMOVED/DROP entry for the simple (shared view/comment) toolbar UI. Then either remove PageButton and the comment toggle code, or keep PageButton with a note that nothing creates it locally, and set port-map 1735 to match.

### R7-B-015 (low): needless casts in the touch toolbar and toolbar
- Old: n/a
- New: next/src/app/toolbar/zoom-menu.ts:105, 200 (`_touchZoomButton as unknown as HTMLElement` on a field already typed HTMLElement | null), 255, 259 (`window as never`); toolbar.ts:944 (`as unknown as HTMLElement` on _zoomButton), 960, 971 (`(editor.constructor as unknown as typeof Editor).SelectionChangedEvent` in place of the static the old code used)
- Differs: the double casts and `never` hide real type mismatches between TouchWindow/ToolbarWindow and the Windows API. The constructor lookup reads like a workaround for an import cycle but has no comment.
- Fix: use non-null assertions or narrow with an if. Type the window helpers with the real Window type from shell/windows.ts. Import Editor as a value for SelectionChangedEvent, or add a comment explaining the cycle.

Checked with no finding: MenuButton (all branches of mousedown/mouseup/dblclick timers, factory refill, reference, getActiveItem, g-active removal on close) matches module 1721. PageButton's scene/reinit/release/_activatePage match module 1735, including the any-listener hasEventListeners check. All toolbar action, guide, transform and arrange ids match the old ID constants. Locale keys exist in en.json. The dropped stats, Pro badges, share/collaborators, custom code buttons and recent-file storage icons (null for local items) are expected.

Coverage:

Module 1541: reviewed, 5 findings (R7-B-011, R7-B-012, R7-B-013, R7-B-014, R7-B-015)
Module 1543: reviewed, 4 findings (R7-B-009, R7-B-010, R7-B-014, R7-B-015)
Module 1721: reviewed, 0 findings
Module 1735: reviewed, 1 finding (R7-B-014)

## Widgets, dialogs, locale (app-widgets-dialogs)

### R7-B-016 (high): the designer's own isEditable counts selects and checkboxes as editable
- Old: public/designer.browser.dev.js:165544 (`$.expr[":"].editable`, module 1689), used by GDesigner's document keydown at 121776-121796 and contextmenu at 121800-121806
- New: next/src/app/shell/designer.ts:2595 (local isEditable), used at 399 (contextmenu) and 2003 (_documentKeyDown)
- Differs: `:editable` is contenteditable, a textarea, or an input whose type is missing, empty or one of the text-like types. The designer's local copy returns true for every INPUT (checkbox, radio, range, color, button) and for SELECT. Old: a keydown while a select or checkbox in a panel has focus moves the focus to the canvas view (so Space doesn't toggle the checkbox and arrows don't stay in the select), and a right click on them is prevented. New: the select or checkbox keeps focus and handles the key, and the browser's context menu opens on them.
- Fix: delete the local function and import isEditable from actions/focus.ts (or widgets/debounce.ts, see R7-B-024). Add a designer test: focused checkbox plus keydown moves focus to the view; contextmenu on a select is default-prevented.

### R7-B-017 (medium): AutoEdit.close clears its fields before removing the input
- Old: public/designer.browser.dev.js:165985-165988 (gAutoEdit close: `e.input.remove(), e.input = null, e.value = null`), 165974-165984 (submit)
- New: next/src/app/widgets/auto-edit.ts:157 (close sets input and value to null first, then removes)
- Differs: the old order matters when the browser fires blur on the focused field as it is removed, which I believe Chromium (and so Electron) does; I haven't run it. Then in the old code the blur handler runs submit while `e.input` and `e.value` are still set. Enter: the nested submit reports the value, then the outer submit reports it again (two renames). Escape: the nested submit compares against the original text that hasn't been cleared yet, so a changed name is submitted and Escape doesn't cancel. The new order makes the nested submit a no-op: one rename on Enter, a real cancel on Escape. AutoEdit has no unit test, and the layer and page rename parity scenarios don't press Escape after an edit.
- Fix: check in the old app in Electron (type, then Escape, then Enter on a layer name and count the rename undo steps). If the blur fires, restore the old order (remove, then null) and pin it with a test that fires blur from remove(); otherwise add a QUESTIONS note that the order was changed safely. In both cases add auto-edit tests for Enter, Escape, Tab (cycle and rename actions) and the touch outside click.

### R7-B-018 (medium): Dialog has no tests for its stack, Escape, backdrop and close timer
- Old: public/designer.browser.dev.js:173262-173371 (module 1727: the global Escape listener, open, isOpen, close)
- New: next/src/app/dialogs/dialog.ts:65-76 (closeTop and the keydown listener), 217 (open), 249 (close)
- Differs: the code matches the old branches, but nothing tests them. Untested: Escape closes only a top dialog opened closable; a backdrop mousedown closes it only when the container has no .g-overlay inside; alwaysCloseable closes a lower dialog with splice and others pop; closeCallback gets `cancelled`; the delayed removal also takes the dialog out of a container it was reopened in before the timer fired; releaseOnClose unmounts the React islands; `nowrap` uses the content as `.g-dialog`; the footer gets a React root when footerStart or React buttons are given. dialog-container.test.ts covers only overlay placement, and system-dialog-view.test.tsx only markup.
- Fix: add dialog.test.ts (jsdom, fake timers) for each branch above, asserting the stack (Dialog.openContents()), the DOM and the callback arguments.

### R7-B-019 (medium): SystemDialog's behaviour is untested
- Old: public/designer.browser.dev.js:1660 (confirm), 1744 (prompt), 1781 (alert), 2077 (_dialogV1), 2279 (custom), 2385 (advanced)
- New: next/src/app/dialogs/system-dialog.ts:170 (confirm), 252 (prompt), 318 (alert), 509 (_dialogV1), 606 (custom), 705 (advanced)
- Differs: no behaviour difference found, but only the view markup is tested. Risky untested branches: confirm's capture-phase keydown listener (Enter confirms, Escape cancels, only while the dialog is on top, removed only on finish) and the skipped dialog when the stored setting is true; prompt's keypress Enter/Escape and the "custom element gives true" path; alert's keypress Enter; _dialogV1 rejects on cancel, resolves with the checked option index or 0, writes the setting checkbox; custom closes before onclick, advanced calls onclick before close(false); Mousetrap combos unbound on click and on close; the click guard against double runs. designer.ts canUnloadDocument (the close-unsaved prompt) depends on advanced's order.
- Fix: add system-dialog.test.ts with Mousetrap mocked, driving buttons and key events and asserting callbacks, promise outcomes and unbinds.

### R7-B-020 (medium): InputBox's event paths are untested
- Old: public/designer.browser.dev.js:167657-167765 (init listeners), 167579-167656 (leftMouseDown/leftMouseUp scrub)
- New: next/src/app/widgets/input-box.ts:471 (_listen), 376 (leftMouseDown), 431 (leftMouseUp)
- Differs: input-box.test.ts covers only InputBoxValue (value, clamp, steps). Not tested: arrow keys step and fire change (and refocus); Enter blurs only with triggerChangeOnEnter; the wheel step only while focused, using deltaX before deltaY; the scrubbing setting gating mouseenter, mouseleave, mousedown and mouseup; the scrub flow (first move only arms, later moves step by the pixels moved, html cursor, user-select and body pointer-events reset on mouseup, blur after a desktop scrub); `properties-panel` noscroll; requestFocus selecting once after focus; detach removing every listener (it matters for the React views).
- Fix: add jsdom tests that dispatch keydown, wheel, mousedown, mousemove and mouseup on an attached box and assert the value, the change events and the inline styles.

### R7-B-021 (medium): rich tooltip timing and single-instance rules are untested
- Old: public/designer.browser.dev.js:173418-173470 (init mouseover/mouseout/mousedown, showTooltip, hideTooltip)
- New: next/src/app/widgets/rich-tooltip.ts:103-112 (closeRichTooltip), 154-181 (showTooltip), 183-188 (hideTooltip), 194-238 (attachRichTooltip)
- Differs: the port matches the old flow, but only the config, offsets and content are tested (widgets.test.tsx). Untested: the 500 ms show delay, showing at once when a tooltip is already up, the 100 ms hide that is cancelled by hovering the tooltip, mousedown cancelling a pending show, the early return for the same tooltip id, a click on the tooltip closing it, the enhanced setting read from the container (a non-boolean counts as on), and detach unmarking the element for the data-title tooltips.
- Fix: add a test with fake timers and a stub container, dispatching mouseover/mouseout on two targets and on the tooltip element.

### R7-B-022 (medium): gPropertyRow exists four times, and the module's own view has no caller and differs
- Old: public/designer.browser.dev.js:173041-173173 (module 1725)
- New: next/src/app/widgets/property-row-view.tsx:147 (PropertyRowView, no caller in src/app); real implementations in next/src/app/inspector/properties.ts:233, next/src/app/inspector/paint-dom.ts:186, next/src/app/color/color-chooser.ts:162 and next/src/app/touch/property-row-element.ts:26
- Differs: four hand-written copies of one plugin can drift (the color chooser's copy already drops icon, click, justified, prefix, html and isMenu). The ported target, PropertyRowView, is dead and isn't faithful: for a column with a prefix but neither content nor html, the old code ran `o.html("&nbsp;")` after appending the prefix, which wiped it; the view keeps the prefix. Its isMenu arrow clicks `.content > *` instead of the column's content element. widgets.test.tsx tests this unused view, not the copies the panels use.
- Fix: keep one DOM implementation (move inspector/properties.ts propertyRow into widgets/property-row.ts), make the other three call it, and delete PropertyRowView or fix the two differences. Move the markup tests to the shared function.

### R7-B-023 (low): the pivot is ported twice and the module's view is unused
- Old: public/designer.browser.dev.js:172992-173040 (module 1724)
- New: next/src/app/widgets/pivot-view.tsx:15 (PivotView, no caller); the code in use is next/src/app/inspector/transform-properties.ts:53-85 (initPivot, setPivotValue, pivotValue)
- Differs: the behaviour in transform-properties matches the old plugin, but the widget file only holds pivotSides, and the plugin logic lives in an inspector panel. PivotView has no caller and isn't tested beyond its layout.
- Fix: move initPivot, setPivotValue and pivotValue into widgets/pivot.ts and delete PivotView (or use it).

### R7-B-024 (low): debounce, input-event and elastic are ported but nothing in the app uses them
- Old: public/designer.browser.dev.js:165527-165578 (module 1689), 170715-170788 (module 1714), 170789-170882 (module 1715; its only caller was the mentions input, module 1716, at 171404)
- New: next/src/app/widgets/debounce.ts (debounce, bindDebounced, isEditable, isTextSelectable: no importer; actions/focus.ts keeps a copy of the two tests and util/designer-util.ts has its own debounce); next/src/app/widgets/input-event.ts (onInput, triggerInput: no importer); next/src/app/widgets/elastic.ts and elastic-view.tsx (no importer; module 1716 is `drop:mentions input (cloud comments)`)
- Differs: dead code next to live duplicates. Elastic also differs in a path nobody reaches: the old `n.bind("update", d)` passed the jQuery event as d's argument, so an "update" forced a re-measure; the new "update" listener calls update() without force.
- Fix: make actions/focus.ts and shell/designer.ts (R7-B-016) import the tests from widgets/debounce.ts, or delete it there and point the port-map at focus.ts. Mark 1714 and 1715 as drop in port-map.tsv (elastic with 1716), or keep them and pass `true` for "update".

### R7-B-025 (low): unused React views next to the DOM widgets
- Old: public/designer.browser.dev.js:173630-173701 (gAccordion, gInputLabel), 167881-167995 (gUnitBox)
- New: next/src/app/widgets/accordion-view.tsx (AccordionButton), next/src/app/widgets/input-label-view.tsx (InputLabel, inputLabelStyle), next/src/app/widgets/unit-box-view.tsx (UnitBoxView): no callers; the panels use initAccordion, initInputLabel and new UnitBox
- Differs: nothing is wrong today, but they are untested parallel APIs that can drift from the DOM versions the panels use.
- Fix: delete them until a React panel needs them, or note in UI.md that they are the intended path for new React panels.

### R7-B-026 (low): the translation manager and the language switch have no caller
- Old: public/designer.browser.dev.js:119198-119199 and 119261 (bootstrap creates the manager, init()s it and stores it on gDesigner), 122013 (getTranslationManager), 3227-3260 (GContainer.initLanguage calls setLanguage)
- New: next/src/app/locale/translation-manager.ts and next/src/app/locale/language.ts: used only by translation-manager.test.ts; next/src/app/shell/container.ts:183 initLanguage no longer calls Language.setLanguage
- Differs: nothing visible. The old init only enabled the locale extension when TRANSLATION_MANAGER.CONSIDER_EXTENSION was set, which it never is, and setLanguage always failed. But both modules are "port" with no caller in src/app.
- Fix: either wire them (bootstrap creates the manager, designer.getTranslationManager, container.initLanguage calls Language.setLanguage for the stored language) or mark 1037 and 1343 as drop with the reason "only the dropped translation tool and the language switch used them".

### R7-B-027 (low): language.ts says gApi.fetchTranslationsURL didn't exist
- Old: public/chunk.vendor.js:70352 (`n.fetchTranslationsURL = (e, t) => b("/i18n-url/" + e + "/" + t)`); electron-main.js:47 answers `/i18n-url/:locale/designer` with `{}`
- New: next/src/app/locale/language.ts:7-12 (header comment)
- Differs: the function exists. The switch fails because the route returns `{}`, so the URL is undefined and fetching or parsing it throws, and the Cloud project has no route at all. The outcome (nothing changes) is right; the stated reason is wrong.
- Fix: correct the comment to name the `{}` answer of the i18n-url route.

### R7-B-028 (low): dialog.ts documents a 250 ms close delay that never happens by default
- Old: public/designer.browser.dev.js:173357 (`parseInt(isNaN(t) ? (isNaN(i.closeTimeout) ? 250 : i.closeTimeout) : t)`)
- New: next/src/app/dialogs/dialog.ts:11 (header: "250 ms by default"), 249-265 (close)
- Differs: the code is faithful, but the default closeTimeout is null and isNaN(null) is false, so the delay is parseInt("null"), NaN, which setTimeout treats as 0 in both apps. 250 is only used for a non-numeric closeTimeout such as a string. The comment tells callers the wrong thing.
- Fix: say the default removes the dialog on the next task (0 ms) and that 250 applies only to a non-numeric closeTimeout. A test in R7-B-018 can pin it.

### R7-B-029 (low): stale late-lookup fallbacks around the dialogs and tooltips
- Old: none (direct requires)
- New: next/src/app/actions/deps.ts:31-45 (richTooltipConfig "until that module exists", and a second PanelIds next to inspector/panel-ids.ts), next/src/app/actions/modify/modify-deps.ts:29-36 (promptDialog "until the dialogs cluster exists"), next/src/app/shell/late.ts:41-49 (systemDialog console fallback), next/src/app/shell/designer.ts:1442-1448 (canUnloadDocument resolves true without advanced())
- Differs: the modules exist now, so the fallbacks never run. But the close-unsaved fallback, if a lookup ever failed, closes a modified document without asking. The duplicate PanelIds can drift from panel-ids.ts.
- Fix: import SystemDialog, RichTooltipConfig and PanelIds directly (or at least drop the "until it exists" fallbacks) and remove the silent resolve(true) branch.

### R7-B-030 (low): port-map names module 1685 wrong
- Old: public/designer.browser.dev.js:165317-165357 (module 1685), opened only from 165279-165314 (module 1684, after login)
- New: missing (dropped)
- Differs: the decision says "drop:language-specific marketing links", but the module is the Windows Store announcement dialog (an iframe with an empty src and an OK button), shown once after a login by module 1684, which is dropped with the cloud. The drop is right; the label is misleading.
- Fix: change the reason to "Windows Store announcement after login (cloud)".

Drops checked: 1620 (GSwitchLanguageAction, ids language.*), 1639 (GTranslationToolAction, help.translationtool), 1640 (translation tool dialog, g-translation-tool-dialog) and 1685 (g-windows-store-announcement-dialog) have no reference in next/src outside the old string tables in locale/data/en.json. help.translationtool and language.en/de appear only in the NOT_REGISTERED list of parity/scenarios/editor-actions/registry.spec.ts, which says they are never registered in the old app either. The drops are recorded in port-map.tsv. They need no REMOVED.md entry, since no scenario output changes.

Coverage:

Module 44: reviewed, 1 finding (R7-B-019)
Module 67: reviewed, 0 findings
Module 219: reviewed, 0 findings
Module 394: reviewed, 0 findings
Module 606: reviewed, 0 findings
Module 607: reviewed, 1 finding (R7-B-029)
Module 1037: reviewed, 2 findings (R7-B-026, R7-B-027)
Module 1343: reviewed, 1 finding (R7-B-026)
Module 1620: reviewed (drop), 0 findings
Module 1639: reviewed (drop), 0 findings
Module 1640: reviewed (drop), 0 findings
Module 1685: reviewed (drop), 1 finding (R7-B-030)
Module 1689: reviewed, 2 findings (R7-B-016, R7-B-024)
Module 1695: reviewed, 1 finding (R7-B-017)
Module 1702: reviewed, 1 finding (R7-B-020)
Module 1703: reviewed, 0 findings
Module 1704: reviewed, 0 findings
Module 1705: reviewed, 1 finding (R7-B-025)
Module 1714: reviewed, 1 finding (R7-B-024)
Module 1715: reviewed, 1 finding (R7-B-024)
Module 1722: reviewed, 0 findings
Module 1724: reviewed, 1 finding (R7-B-023)
Module 1725: reviewed, 1 finding (R7-B-022)
Module 1726: reviewed, 0 findings
Module 1727: reviewed, 2 findings (R7-B-018, R7-B-028)
Module 1728: reviewed, 1 finding (R7-B-021)
Module 1729: reviewed, 1 finding (R7-B-025)
Module 1730: reviewed, 1 finding (R7-B-025)

## Dialogs and notifications (app-dialogs-notify)

### R7-B-031 (high): fonts that failed while offline are never retried once the network is back
- Old: public/designer.browser.dev.js:12122-12133 (GFontsProviderManager.init adds a GNetworkAvailabilityChangedEvent listener on gDesigner; _networkAvailabilityChangedEvent resets every provider in _resetProviders when connected), :121865-121873 (GDesigner constructor turns window online/offline into that event)
- New: next/src/app/fonts/font-manager.ts:295-304 (init() is empty, "added with the app shell"); _networkAvailabilityChangedEvent has no caller anywhere in next/src; font-manager.ts:455-459 still fills _resetProviders on ConnectionError (web-fonts-provider.ts:161 raises it)
- Differs: module 291 was dropped as "network availability event (cloud)", but its main local consumer is the font manager. Start the app offline (or lose the connection while the web fonts list loads): the web fonts provider fails with ConnectionError, gets queued in _resetProviders, and in the old app it was reset and reloaded on the `online` event. In the new app the queue is never drained, so web fonts stay missing until a reload. Nothing tests this.
- Fix: in the designer constructor (or bootstrap), listen to window `online`/`offline` and call FontsProviderManager.getInstance()._networkAvailabilityChangedEvent(true/false) (or keep a tiny NetworkAvailabilityChangedEvent class and have init() subscribe, as before). Add a unit test: fail a provider with ConnectionError, fire `online`, expect reset(provider, true). Record the remaining part of the drop (library sidebar offline class, update manager isOffline) in REMOVED.md.

### R7-B-032 (medium): Save of a document with file:// images does nothing in Chrome/Edge (Q-259 says the browser can't reach it, but it can)
- Old: public/designer.browser.dev.js:19414-19419 (GSaveAction._save), :130707-130819 (GWarnLinkedImageDialog builds itself in a promise; open() runs before that)
- New: next/src/app/actions/file/save-action.ts:103-113, next/src/app/dialogs/warn-linked-image-dialog.ts:32-41,81-84; next/docs/rewrite/QUESTIONS.md Q-259
- Differs: the port keeps the old crash on purpose and Q-259 justifies it with "only when the default storage can save (desktop storage) ... which the browser build never reaches". But the browser's default storage is BrowserFileStorage (old module 1195, new storage/file-system-access.ts:288), whose canSave() is true wherever showSaveFilePicker exists, i.e. Chrome, Edge and the Electron shell. Open a .gvdesign that references a file:// image (from the old desktop app) and press Save: open() throws inside the async _save (unhandled rejection), the dialog that gets built a tick later is never shown, and nothing is saved. With "never remind" stored the save goes ahead, so only first-time users hit it. No unit test or scenario covers it.
- Fix: correct Q-259 and treat it as a BUG-NNN fix: let open() set a "pending open" flag that _init() honours (or build the dialog synchronously and only skip opening when the stored flag is set). Add a test with a fake container whose getProperty resolves false: new WarnLinkedImageDialog(...).open() must show `.g-warn-linked-image-dialog`.

### R7-B-033 (medium): font manager reset no longer forgets the open missing-fonts dialog
- Old: public/designer.browser.dev.js:12429 (GFontsProviderManager.reset: `this._missingFontsDialog && (this._missingFontsDialog = null)`)
- New: next/src/app/fonts/font-manager.ts:542-568 (reset), next/src/app/dialogs/missing-fonts-dialog.ts:319-324 (module-level missingFontsDialog; the comment says currentMissingFontsDialog is "for tests and the font manager's reset", but reset never touches it)
- Differs: the dialog reference moved from the manager into the dialog module and reset() lost the line that cleared it. After a reset (enabling a provider via the enabler switch inside the dialog, importing fonts, a reconnect), the old app built a fresh dialog for the next missing family; the new app appends rows to the old, possibly already closed-and-released dialog reference until its close callback runs. Also the old close callback of the stale dialog nulled whichever dialog was current; ordering differs now.
- Fix: in missing-fonts-dialog.ts, listen for FontsProviderManager.ResetEvent (or expose a clearMissingFontsDialog() that reset() calls through the handler slot) and set missingFontsDialog = null, as the old reset did. Test: open the dialog, reset(), report another missing font, expect a second dialog.
- Also found by the fonts review (same root cause, module 255 reset).

### R7-B-034 (medium): missing-fonts replace/keep logic and the per-document handler have no test
- Old: public/designer.browser.dev.js:53302-53520 (GMissingFontsDialog), :12043-12103 (function g of module 255)
- New: next/src/app/dialogs/missing-fonts-dialog.ts:183-294, 345-397; tests: dialogs-notify.test.tsx:139-161 renders only the static view; parity scenario dialog/missing-fonts (parity/scenarios/ui/dialogs.spec.ts:274-296) only screenshots the opened dialog
- Differs: nothing found that differs, but these branches change files and are untested: _replaceFonts on a text with $fontFamilies (runs rewritten, $content JSON, _runsDirty) vs without (replaceFonts with embedded flag), Style `_tff` replacement, _keepFonts appending to scene `cst` (with the kept duplicate quirk Q-260), setMissingFonts list vs map (Keep Fonts hidden for a map, rows not duplicated on a second call), and handleMissingFont's status switch (LoadFailed returns, Ready/Saved/... continue, families in `cst` or already asked are skipped, dialog only opens when tryToResolveMissingFont and getShowMissingFontsDialog).
- Fix: add unit tests in dialogs-notify.test.tsx (or a missing-fonts-dialog.test.ts) with a small scene holding a Text and a Style: assert the stored text runs and `_tff` after Replace, `cst` after Keep, and the handler's skip rules.

### R7-B-035 (medium): PWA install dialog still says "(subscription required)"
- Old: public/designer.browser.dev.js:148850-148870 (_getMainContent: description span, `<a href="">` with text.description-pro-link, dot)
- New: next/src/app/dialogs/install-pwa-dialog.ts:47, next/src/app/dialogs/install-pwa-dialog-view.tsx:134-140
- Differs: ported byte for byte, so the dialog tells users the PWA needs a subscription and offers a link (href="", opens the app again in a new tab). Subscriptions and Pro are removed in the rewrite (REMOVED.md), so this text is now false. Not covered by any test or scenario.
- Fix: leave out the pro-link anchor (keep the description and the dot) and record it as a DROP-NNN entry next to DROP-001, or at least list it in REMOVED.md if the text stays on purpose. Add a render test of InstallPwaDialogView for supported and unsupported (chromium-section) states while at it.

### R7-B-036 (low): update panel prints "&nbsp;" literally where jQuery parsed the string as HTML
- Old: public/designer.browser.dev.js:163000 (_handleAfterUpdate) and :163136 (_handleUpdateAvailable) (`.append(n)` with the localized string; jQuery's append parses strings containing entities/tags as HTML)
- New: next/src/app/dialogs/software-update-panel-view.tsx:333-339 and 371-380 (`{content.text}` as a text node)
- Differs: "text.update-available" and "text.after-update" end with `&nbsp;` (next/src/app/locale/data/en.json). The old panel showed a non-breaking space before the "Update Now!" / "See release notes" link; the new one shows the five characters "&nbsp;". "text.updating", "text.update-error" and "text.update-not-available" have no markup, so they look the same. Right now only update-not-available can fire (no release service), so nobody sees it yet; it shows as soon as the Electron channel or a release check comes back.
- Fix: render those message strings as HTML (dangerouslySetInnerHTML on a span, or the insertAdjacentHTML helper the notification panel already uses), and add a render test for the "available" state.

### R7-B-037 (low): Electron update channel can never deliver events
- Old: public/designer.browser.dev.js:164842-164867 (client wraps ipcRenderer), :164698-164720 (start() registers six listeners)
- New: next/src/app/dialogs/electron-update-client.ts:290-326, software-update-manager.ts:178-195
- Differs: setTransport has no caller in next/src, and on() silently drops a listener when no transport is set, so even a transport installed later would get none of the six listeners start() registered. Also BrowserContainer.getRuntime() (shell/browser-container.ts:25-27) never returns Electron, so the whole Electron branch of manager and panel (download, install, progress, force-update download) is dead code.
- Fix: either mark these parts as dropped in port-map/REMOVED.md and delete them, or make on() buffer listeners and replay them in setTransport, and document who is supposed to provide the transport (a preload) and how the runtime becomes Electron.

### R7-B-038 (low): ConfirmationDialog and NewFilePrompt are ported but nothing opens them
- Old: public/designer.browser.dev.js:113427-113508 (module 1474, required only by module 1473, the paywall, port-map drop), :148060-148141 (module 1556, used only by module 1545 GFilesPanel at :143779, port-map drop)
- New: next/src/app/dialogs/confirmation-dialog.ts, confirmation-dialog-view.tsx, new-file-prompt.ts, new-file-prompt-view.tsx; no caller in next/src/app outside the test
- Differs: both files say themselves that only dropped cloud flows opened them. ConfirmationDialog is the purchase "thanks" dialog (INVENTORY UI-DIALOG-016 "Purchase confirmation") and prints the signed-in user's e-mail, which the local app doesn't have. Kept code with no caller and no reachable path.
- Fix: change both rows in port-map.tsv to `drop:` (drop-app-cloud), delete the four files and the ConfirmationDialogView test, and mark UI-DIALOG-016 and UI-DIALOG-018 "drop in rewrite" in INVENTORY.md.

### R7-B-039 (low): `?pwainstall` deep link no longer opens the install dialog
- Old: public/designer.browser.dev.js:3094-3110 (GContainer.DeepLinking.PWADialog = "pwainstall"), :3173-3187 (handleDeepLinking), :120314-120327 (boot: when the link is present, executeWhenReady(() => gDesigner.showInstallPwaDialog()))
- New: next/src/app/shell/container.ts:132-135 (handleDeepLinking returns null: "deep links were cloud features"); no reader of "pwainstall" in next/src
- Differs: all other deep links were cloud (purchase, sign-in, shares), but pwainstall only opened the local PWA install dialog, which is ported (dialogs/install-pwa-dialog.ts, Designer.showInstallPwaDialog). A link such as `/?pwainstall` used to open it; now nothing happens. I haven't checked who published such links.
- Fix: in bootstrap, if `new URL(location.href).searchParams.has("pwainstall")`, call designer.executeWhenReady(() => designer.showInstallPwaDialog()); or record the removal in REMOVED.md.

### R7-B-040 (low): PwaSupport (module 1173) never ported; install action carries a permanent fallback copy
- Old: public/designer.browser.dev.js:75753-75781 (module 1173, isSupported = runtime Browser && Chrome/Edge && BeforeInstallPromptEvent)
- New: next/src/app/actions/file/install-to-desktop-action.ts:26-41 (lateExport of "shell/pwa-support.ts", which doesn't exist; the inline fallback is what always runs). port-map.tsv lists module 1173 as `port next/src/app/shell/pwa-support.ts` (app-shell-storage)
- Differs: behaviour is the same, but the port-map target is missing and the "until that module exists" branch is the only code path; designer.ts:2455-2462 reaches it through another lateExport of isPwaSupported.
- Fix: create shell/pwa-support.ts with the three static checks, import it directly from the action and the dialog, and drop the lateExport fallback.

### R7-B-041 (low): network availability and offline dialog drops are only recorded in port-map
- Old: public/designer.browser.dev.js:12534-12685 (module 256 GOfflineDialog), :13215-13228 (module 291)
- New: port-map.tsv rows 256 and 291 say drop; next/docs/rewrite/INVENTORY.md:2293 (UI-DIALOG-012) is still an open item, not marked "drop in rewrite"; no REMOVED.md note
- Differs: nothing references GOfflineDialog or GNetworkAvailabilityChangedEvent in code (checked next/src; the "GOfflineDialog" locale key "title.unavailable-feature" is still read by sidebars/library-sidebar.ts:109, which is fine since the string table keeps it). But the drop changed behaviour elsewhere (R7-B-031; library-sidebar.ts:31 and software-update-manager.ts:112 treat the app as never offline) and none of that is written down.
- Fix: mark UI-DIALOG-012 "drop in rewrite" in INVENTORY.md and add a short REMOVED.md note listing the consumers of the network event and what they do now.

Coverage:

Checked and found no differences: software-update-events.ts (all nine event classes and their fields), notification-event.ts (defaults including the "annonymous" spelling), update-event-names.ts (including "donwload-update"), notification.ts (builder close event), shortcuts-dialog.ts (actions then tools, isWordMode hints), memory-warning-dialog.ts (interval floor of one minute, threshold, 30 minute restart; never active in the browser, as before), notification panel (document Activated/Removed handling, custom class/enter/exit/timeout, builder), install-to-desktop-action.ts, install-pwa-dialog.ts behaviour (Escape listener removed on close, Not now stores the date), all locale keys these files read exist in next/src/app/locale/data/en.json.

Module 256: reviewed (drop, recorded in port-map; no code references), 1 finding (R7-B-041)
Module 291: reviewed (drop, recorded in port-map; no code references), 2 findings (R7-B-031, R7-B-041)
Module 841: reviewed, 3 findings (R7-B-033, R7-B-034; R7-B-031 affects the fonts it reports)
Module 1172: reviewed, 1 finding (R7-B-040)
Module 1188: reviewed, 0 findings
Module 1321: reviewed, 0 findings
Module 1349: reviewed, 0 findings
Module 1474: reviewed, 1 finding (R7-B-038)
Module 1511: reviewed, 1 finding (R7-B-032)
Module 1556: reviewed, 1 finding (R7-B-038)
Module 1562: reviewed, 2 findings (R7-B-035, R7-B-039)
Module 1644: reviewed, 0 findings
Module 1665: reviewed, 1 finding (R7-B-036)
Module 1666: reviewed, 0 findings
Module 1667: reviewed, 0 findings
Module 1676: reviewed, 1 finding (R7-B-037)
Module 1677: reviewed, 1 finding (R7-B-037)
Module 1687: reviewed, 0 findings

## Welcome and settings (app-welcome-settings)

Preset data (module 1153) was compared mechanically: the old array literal
(designer.browser.dev.js:71449-72117) and the new buildPresets body
(presets.ts:60-697) were evaluated with node and their JSON.stringify output
is identical, including key order, all 6 categories (15, 17, 12, 8, 12, 10
layouts), names, ids, units, sizes, dpi and the `default` fields. getPresets'
cache/force logic matches. No findings on the data.

Setting keys and defaults checked one by one against `_saveBasicSettings` and
the row builders: highlight_on_hover, auto_expand_layers, auto_save (default
true), autosave-prompt-for-local-files-disabled (inverted, default false),
system_fonts_enabled (no row), theme (default "light"), dont_store_textpath
(inverted, default Text.dontStorePaths = true), enable_steps_debug (default
EditorOptions.debugTransactions = false), enable_cache (default
RendererConfig.ENABLE_CACHE = true), disable_warning_unsupported_features
(false), eps_outline_fonts (true), ui_toolbar_alignment (false), decimals_num
(Scene.decimalsNum = null, box clamp 0..6, "2" fallback), auto_save_interval
([5, 10, 20], default 5, option values are indexes), create_backup_copy
(false, Electron only), scrubbing_flag (inverted, default true),
notifications_disabled, show_welcome_screen. All keys, order, inversions and
defaults match. The developer-row condition and the Electron condition match.

### R7-B-042 (high): picking a theme resets the typed rounding value
- Old: public/designer.browser.dev.js:94621 (_createDecimalsNum; the theme row click at 94565 only touches .g-theme-selector)
- New: next/src/app/settings/settings-dialog.ts:218-226 (_decimals boxRef), :268-270 (_openThemeSelector onPick -> _render)
- Differs: `_decimals()` builds a new `boxRef` callback on every `_rows()` call. InputBoxView passes it to `useImperativeHandle(ref, ..., [])`; React appends `ref` to those deps (react-dom-client.development.js:9117 `deps.concat([ref])`), so each re-render calls the old ref with null and the new one with the box. The new ref sees `this._decimalsBox === null` and runs `box.value(stored)` again. Picking a theme calls `_render()` (flushSync), so: switch rounding on, type 3, pick Dark, Save -> decimals_num is saved as the stored value ("2" -> 2), not 3. The old dialog kept the typed 3. This is exactly the sequence of platform/storage/settings-dialog-all (expected decimals_num 3), which is listed in parity/ported/platform.json, so either that scenario fails now or it hasn't been re-run since the port.
- Fix: create the boxRef callback once (a field set in the constructor) and set the first value only on the first attach (e.g. a separate `_decimalsInitialised` flag instead of `!this._decimalsBox`). Add a unit or scenario check: type a value, pick a theme, Save.

### R7-B-043 (medium): auto-save rows shown on Safari
- Old: public/designer.browser.dev.js:185 (module 10: `AUTO_SAVE_ENABLED = webBrowser !== Safari`), used at 94101 (`r.AUTO_SAVE_ENABLED && ...`)
- New: next/src/app/settings/settings-dialog.ts:50-55
- Differs: the dialog hard-codes `AUTO_SAVE_ENABLED = true` (the module 519 base value). Module 10 overrides it to false on Safari, so the old dialog had no auto-save and auto-save-warning rows there, and Save wrote auto_save, the warning key and auto_save_interval as undefined. The new dialog always shows them on Safari and saves real values. next/src/app/config.ts:18 already has the correct value; the other constants are duplicates of next/src/app/file-formats.ts:40-42.
- Fix: import `config` from ../config.ts and use config.AUTO_SAVE_ENABLED, AUTOSAVE_INTERVALS and AUTOSAVE_INTERVAL_DEFAULT instead of local copies. Add a test for the Safari branch (autoSave null -> keys written as undefined).

### R7-B-044 (medium): settings dialog and welcome screen UI scenarios are not in any ported list
- Old: public/designer.browser.dev.js:93974 (module 1275), :142942 (module 1544)
- New: next/parity/scenarios/ui/dialogs.spec.ts:73-107, 318-360 (dialog/settings, settings-theme-selector, settings-toggled, settings-escape-stays, settings-save-writes, settings-cancel-keeps, ui/theme/switch-to-dark); next/parity/scenarios/ui/welcome.spec.ts:60-175 (welcome/dialog, window, option-hover, tile-hover, create-hover, typed-size, recent-clicked, dont-show-checked, preset-hover-item, reopened)
- Differs: parity/ported/app-welcome-settings.json lists only the five editor-actions dialog ids. None of the ui/dialog/settings*, ui/theme/* or ui/welcome/* ids appear in any parity/ported/*.json. The controllers have no unit tests either: welcome.test.tsx renders the view with fixed props, and settings.test.ts drives Save with a fake content object. So the typed-size validation (_newDocumentCustomSize: empty/NaN/zero branches), Enter handling, the preset dropdown pick (unit and dpi into the scene), the recent overlay, the theme overlay, the decimals toggle and clamp, and the version click cycle are not covered by a passing check.
- Fix: run those scenarios and add the passing ids to app-welcome-settings.json. Add controller unit tests for _newDocumentCustomSize (both empty -> infinite canvas, "0" -> nothing, "abc" -> nothing, px vs mm with dpi) and for the decimals box clamp.

### R7-B-045 (low): SettingsActionId has no caller; the scrubbing key is duplicated
- Old: public/designer.browser.dev.js:95502 (module 1277, required by GSettingsAction at 155316), :95504 (module 1278, required by the input box at 167402)
- New: next/src/app/settings/settings-action-id.ts:3; next/src/app/actions/edit/settings-action.ts:11; next/src/app/widgets/input-box.ts:95-98
- Differs: SettingsAction declares its own `static ID = "edit.settings"` instead of reading SettingsActionId.ID, so the ported module is dead code. input-box.ts reimplements ScrubbingSetting.isEnabled with the "scrubbing_flag" literal instead of calling it. Values are the same today, but there are now two sources for each.
- Fix: `static ID = SettingsActionId.ID` in SettingsAction, and have scrubbingEnabled() call ScrubbingSetting (or delete one of the copies and note it in the port map).

### R7-B-046 (low): welcome screen rebuilds the preset table on every state change
- Old: public/designer.browser.dev.js:143443 (_createPresetsFrame, called once in the constructor)
- New: next/src/app/welcome/welcome-screen.ts:156 (_view)
- Differs: `_view()` calls `Presets.getPresets(true)` and runs on every `_setState` (each sidebar click, separator change, version click). The old dialog built the table once. It also replaces the shared cache the inspector's page-size select reads with a fresh copy each time. No visible effect today since the data is constant.
- Fix: read `Presets.getPresets(true)` once in the constructor, keep it in a field and pass that.

### R7-B-047 (low): recent file names rendered as text, old parsed them as HTML
- Old: public/designer.browser.dev.js:143149 (`.append(e.getName() + "." + ext)`, jQuery parses the string as HTML)
- New: next/src/app/welcome/welcome-screen-view.tsx:268
- Differs: a recent file named e.g. `<b>a</b>.gvdesign` shows bold "a" in the old overlay and the literal text in the new one. Q-262 keeps the same quirk for the notification panel, so the two are inconsistent. The new behaviour is the safer one.
- Fix: keep text rendering, but record it in QUESTIONS.md or BUGS-FIXED.md next to Q-262 so the deviation is documented.

### R7-B-048 (low): copied minified idioms and needless casts
- Old: public/designer.browser.dev.js:120517, :94477
- New: next/src/app/welcome/show-welcome-setting.ts:12; next/src/app/settings/settings-dialog.ts:192, 196, 321
- Differs: `"boolean" != typeof value || value` and `!("number" != typeof value || isNaN(value))` are the minifier's yoda/negated forms copied over. EditorOptions.debugTransactions and RendererConfig.ENABLE_CACHE are cast through `unknown` to optional types although both exist and are typed (editor-options.ts:83, renderer-config.ts:29).
- Fix: `typeof value !== "boolean" || value`, `typeof value === "number" && !isNaN(value)`, and use the typed properties directly.

Coverage:

Module 1153: reviewed, 0 findings (data identical; R7-B-046 is filed under 1544)
Module 1275: reviewed, 3 findings (R7-B-042, R7-B-043, R7-B-048)
Module 1277: reviewed, 1 finding (R7-B-045)
Module 1278: reviewed, 1 finding (R7-B-045, shared)
Module 1487: reviewed, 1 finding (R7-B-048, shared)
Module 1544: reviewed, 3 findings (R7-B-044, R7-B-046, R7-B-047)

## Touch UI (app-touch-ui)

I walked every old module line by line against the new file. All action ids
hard-coded in touch-context-menu.ts and virtual-key-bar.ts match the old
classes' ID constants (checked each referenced module: 871, 877, 1183, 1184,
1182, 876, 875, 812, 1316, 810, 872, 1320, 1185, 1317, 1318, 1179, 873, 1319,
608, 1177, 874, 566, 1176, 1178, 1180, 809, 1181, 1314, 1315, 1303, 1331,
1332, 811, 870, 1333, 1334, 869, 1335). Every module is wired: bootstrap's
eager glob loads touch-toolbar.ts (it sets Sidebars.touchToolbarUpdater),
designer.ts creates VirtualKeyBar, context-menu.ts builds the touch overlay
once per ContextMenu, toggle-fullscreen-action.ts uses FullscreenBanner, and
both actions are in the bootstrap table. The strings used exist in en.json
(GContextMenu, GQuickHelpScreen, GImageProperties, GCommonNames,
GToggleTouchAction). No jQuery, no untyped any. The dropped items (stats calls,
gPro badge, guest check in GToggleTouchAction.isAvailable) fall under the
accepted analytics, licence and account removals.

### R7-B-049 (medium): touch menu lock, hide, go to master, image and text menus have no test
- Old: public/designer.browser.dev.js:149341-149365 (lock/hide buttons), 149550-149611 (_setAllSelectionsHidden, _setAllSelectionsLocked), 149153-149212 (go to master), 149231-149305 (image/text menus)
- New: next/src/app/touch/touch-context-menu.ts:333-357, 595-660, 274-315
- Differs: behaviour matches, but touch.test.ts only checks the section order, the disabled update and one action button. _setAllSelectionsLocked loops `for (; items.length > 0;)` and only ends because removing the Selected flag splices the node out of the editor's live selection array (editor.ts:3169). If getSelection ever returns a copy, or the flag removal stops reaching the editor (e.g. a node not in the scene's selection bookkeeping), the loop never ends and the tab hangs. Hide (vis=false + undo name), go to master (selects the instance, runs view.zoom.fit-selection inside one transaction) and the crop caption update (action.crop / action.no-crop) are also unpinned. The parity scenario editor-actions/symbols covers go to master only through the old app.
- Fix: add unit tests on a real scene: lock two selected shapes (both get lkt=Full, selection empty, one undo step named "Toggle Locker"), hide two shapes (vis false, Highlighted removed, undo step), go to master with a locked and an unlocked instance, and the crop item's caption with and without selection detail. Optionally guard the lock loop with an iteration cap that matches the selection's start length so a regression fails a test instead of hanging.

### R7-B-050 (low): parity/app/editor-touch.ts is a dead re-export
- Old: none (interim hook)
- New: next/src/parity/app/editor-touch.ts:8
- Differs: nothing imports it (grep over src and parity). It doesn't fake app behaviour: the touch targets, long press and handle look really live in src/app/shell/designer.ts and handle-options.ts. The file only keeps an alias around that the brief still lists as an interim hook.
- Fix: delete the file and drop it from the brief's list of interim hooks.

### R7-B-051 (low): virtual key bar menus add their second class by hand with a wrong comment
- Old: public/designer.browser.dev.js:152663-152676 (local `r`: new GMenu(null, "g-assistant-bar-menu" + " " + t))
- New: next/src/app/touch/virtual-key-bar.ts:262-266
- Differs: Menu's constructor already splits space-separated class names (menus/menu.ts:91-93), so passing "g-assistant-bar-menu paste-menu" works. The extra classList.add after construction gives the same result, but the comment says the split is needed because of jQuery, which misleads the next reader.
- Fix: `new Menu(null, "g-assistant-bar-menu" + (className ? " " + className : ""))` as the old code did, and drop the comment.

### R7-B-052 (low): _fullscreenEventClass is a leftover indirection
- Old: public/designer.browser.dev.js:152982, 152995 (gDesigner.add/removeEventListener(GFullscreenEvent, ...))
- New: next/src/app/touch/virtual-key-bar.ts:599-600, 613-615, 627-629
- Differs: the method always returns the imported FullscreenEvent through a double cast, and activate/deactivate still test it for null. It looks like a lateExport placeholder that was never cleaned up after the direct import was added.
- Fix: use FullscreenEvent directly in activate/deactivate and remove the method and its null checks (type the listener so the cast isn't needed).

### R7-B-053 (low): action ids are copied as strings, and the tests copy the same strings
- Old: public/designer.browser.dev.js:148990-149030, 152501-152545 (the actions' classes imported for their ID)
- New: next/src/app/touch/touch-context-menu.ts:45-75, next/src/app/touch/virtual-key-bar.ts:52-68
- Differs: the ids are right today, but nothing ties them to the action classes. A renamed id makes designer().getAction return null: an action button then has no click and no enabled check (a silently dead button), and a null entry in a menu throws in _fillMenu during ContextMenu construction. touch.test.ts registers the same literal list, so it would not notice.
- Fix: import the action classes' static ID (or a shared id table used by bootstrap) instead of literals, or add a test that checks every id in these tables against the registered actions from buildRegistry().

Coverage:

Module 1336: reviewed, 0 findings
Module 1337: reviewed, 0 findings
Module 1540: reviewed, 0 findings
Module 1563: reviewed, 2 findings (R7-B-049, R7-B-053)
Module 1587: reviewed, 3 findings (R7-B-051, R7-B-052, R7-B-053)
Module 1588: reviewed, 0 findings
Module 1589: reviewed, 0 findings
Module 1634: reviewed, 0 findings
editor-touch.ts (parity hook): reviewed, 1 finding (R7-B-050)

## Fonts UI (app-fonts-ui)

Scope: modules 255, 381, 590, 1075, 1118, 1198, 1199, 1200, 1245, 1379, 1380, 1470, 1471, 1700, 1701.

Checked first:
- next/src/parity/app/fonts.ts no longer exists. Commit df2f0104 moved it to next/src/app/fonts/designer-fonts.ts, which is a real port of GContainer/GBrowserContainer.registerFontProviders and GDesigner.init's font part, and the app calls it (shell/browser-container.ts:72, shell/designer.ts). No parity hook in next/src/parity/app fakes font behaviour: parity/app/document.ts only listens to DocumentStatusEvent on the font manager to notify its own listeners.
- noto-fonts.json matches module 1075. I parsed the JSON.parse string literal at designer.browser.dev.js:61143 and the new file: JSON.stringify of both is identical (46 families, same key order, no escapes in the old literal). The new file is pretty-printed, so the bytes differ only in whitespace, and that doesn't matter for a JSON import.
- Module 1245 (font-db-loader) is not ported anywhere (see R7-B-054). Module 1380 (native fonts) is not ported and not recorded as removed (see R7-B-058).
- Every module in the bootstrap glob is loaded eagerly (shell/bootstrap.ts loadAppModules), so dialogs/missing-fonts-dialog.ts does register FontsProviderManager.setMissingFontsHandler. The old `g(e)` path is wired.
- All locale keys the font modules use exist in src/app/locale/data/en.json (GImportedFontsProvider confirm.delete-font, the GLocalFontsProvider texts, the GFontsButton tab names, GCommonNames text.loading).
- Everything else in font-manager.ts matches the old module branch for branch: _providerProbe, the merge, the cache eviction, query with its prefix cache, loadMore, reset, normalizeQuery and searchFamilyInCache. So do the providers (base, Noto, imported, Google, local), font-db.ts, font-style-naming.ts (the `\s` regex equals the old expanded class), both trackers, fonts-button.ts and fonts-panel.ts, apart from the findings below.

### R7-B-054 (high): File > Import > Add Fonts... throws, because the font importer (module 1245) was never ported
- Old: public/designer.browser.dev.js:80073-80227 (GFontDBLoader: import, _prompt at 80107, busy, getProgress, ready, checkAndAdd, _postAddAction)
- New: missing. next/src/app/actions/file/import-fonts-action.ts:52-56 looks up "fonts/font-db-loader.ts" / "FontDBLoader" through lateExport and throws "fonts/font-db-loader.ts is not ported yet". No file has checkAndAdd or _tmpFontList.
- Differs: the action is registered and enabled (import resources on, canPromptOpen, indexedDB), so the menu item shows, and clicking it throws instead of opening the picker (ttf/otf/ttc/dfont, multiple). Nothing can add fonts to gravitFontsDB, so the Imported Fonts tab and ImportedFontsProvider only ever show fonts from a migrated old profile. The old importer also did these things, none of which exist now:
  - retried while busy (100 tries, 100 ms apart)
  - split collections with GOpenTypeUtil.getFont(..., true)
  - de-duplicated by family/weight/style, filled in a missing subfamily or displayname, and appended the subfamily to the family on a conflict
  - stored each file under `<family>_<weight>_<style>`, wrote FONT_LIST once after the last file, then called reset(ImportedFontsProvider, true) and fontManager.getFont for every listed font
  - kept debugImportFont (designer.browser.dev.js:120497) as a debug entry point
  
  next/parity/ported/platform.json (currently untracked, another agent's work in progress) lists platform/storage/font-import, which drives exactly this menu item, so that entry can't pass yet.
- Fix: port module 1245 as next/src/app/fonts/font-db-loader.ts exporting FontDBLoader, on the Promise API of font-db.ts. Keep the dedupe loop with its `continue` after renaming, the _numFiles += fonts.length - 1 count, and the reset(ImportedFontsProvider, true) vs reset() choice. Add unit tests with a fake FontDB (collection split, dedupe, rename on subfamily conflict, FONT_LIST written once), and keep font-import out of ported/platform.json until it passes.

### R7-B-055 (medium): the Google font list URL gets a random cache-buster instead of the app version
- Old: public/designer.browser.dev.js:109833-109835 (GWebFontsProvider._load: `gDesigner ? gDesigner.getVersion() : random`, so the URL is `/assets/data/googlefonts.json?3.15.0`)
- New: next/src/app/fonts/web-fonts-provider.ts:37-38 and 142-144. WebFontsProvider.version and rootPath are statics that nothing in src/app sets (grep finds no writer), so version stays null and every load uses `~~(1e4 * Math.random())`.
- Differs: the 650 KB googlefonts.json is fetched under a new URL on every launch and after every resetProvider, so the HTTP cache and the service worker cache never hit. The request URL also differs from the old app's.
- Fix: read the version the way the old code did, `designer().getVersion()` (bootstrap sets "3.15.0") with the random fallback only when there is no designer. Use container().getRootPath() for the root path, or set both statics during boot. Add a test that asserts the URL ends in `?3.15.0`.

### R7-B-056 (medium): no test covers the font manager's paging, prefix cache, merge order or provider switching
- Old: public/designer.browser.dev.js:12274-12401 (_providerProbe merge branches), 12436-12470 (loadMore), 12471-12510 (query prefix path), 12148-12168 (enable/disableProviders), 12413-12433 (reset)
- New: next/src/app/fonts/font-manager.ts:331-475, 482-523, 542-595, 602-646, 170-192
- Differs: no difference found, but font-manager.test.ts only covers resolveFont, one two-provider query and normalizeQuery. These branches have no test:
  - _mergeFamilies inserting before the first family of a later enabled provider, in both the result and the cached faces (`faces !== cached.faces`, and the else branch where they are the same array)
  - the paging skip computation when `0 === index && !fresh`
  - every loadMore branch, including the first page sent without a time stamp
  - the prefix-cache answer of query (and its `faces.length < 9999 || length == total` gate)
  - the "provider removed or disabled while loading" double probe
  - disableProviders with two classes, where only the last class ends up disabled, a quirk the fonts button's web tab hits with [Imported, Local]
  - reset with keepFull and with _firstCallback
  - the 30-entry eviction
  
  These decide which fonts the panel lists and in what order.
- Fix: add font-manager tests with three fake providers: interleaved families, a later provider listed first in the cache, paging past 9999 with getTotalFonts, a prefix query after a complete shorter query, a provider disabled mid-load, disableProviders([A, B]), and reset(null, false, true) keeping the full cache. Record expected values from the old module where possible.

### R7-B-057 (medium): the font database, imported-font deletion and native font naming are untested
- Old: public/designer.browser.dev.js:77294-77554 (GFontDBClient), 67290-67395 (GImportedFontsProvider delete flow in addPreviews), 77790-77838 (parseNativeFonts variant naming)
- New: next/src/app/fonts/font-db.ts (no test file), imported-fonts-provider.ts:140-226 (_confirmDelete), font-style-naming.ts:310-350
- Differs: no difference found, but these touch stored user data and have no test:
  - FontDB (getInstance callback queue, the open failure path, updateItem writing through the store from getItem, which now happens one microtask later than with jQuery Deferred)
  - the delete flow (deleting every key of the family, rebuilding FONT_LIST from the formatted list, replacing the family with Open Sans in all documents, removeFont, reset, the per-family _queue)
  - parseNativeFonts appending the subfamily or "variant N" on duplicates
  
  providers.test.ts only checks resolveFont from a stored file.
- Fix: test FontDB with fake-indexeddb (open/upgrade, set/get/update/delete/clear, updateItem inside the same transaction). Test _confirmDelete with a fake FontDB and SystemDialog: expected deleted keys, the stored FONT_LIST, and the replaceFonts map. Test parseNativeFonts with stubbed OpenTypeUtil.getFont entries that collide on family/weight/style.

### R7-B-058 (low): native fonts (module 1380) is neither ported nor recorded as removed
- Old: public/designer.browser.dev.js:109939-110428 (GSystemFontsProvider: WebSocket client to 127.0.0.1:32119, launcher.swf), 109322-109324 (GBrowserContainer.getSystemFontsProvider returns it), 109340 (`window.GSystemFontsProvider = u`)
- New: missing. port-map.tsv line 1438 still says `port next/src/app/fonts/native-fonts.ts`. designer-fonts.ts:21-23 only says it is "left out", and shell/browser-container.ts:80 returns null from getSystemFontsProvider.
- Differs: in the browser the provider was never registered, so no font lists differently. But the container used to hand out a class where it now hands out null. fonts-button.ts works around this (Q-324), while other callers pass the value straight to enable/disableProviders: text-properties.ts:855 (the fontSet checkbox) and document.ts:850/864 (Electron only). With null, `provider instanceof null` throws a TypeError where the old code silently disabled or enabled every provider. INVENTORY FMT-IMPORT-027 says "(to drop)", but there is no REMOVED.md or DROP entry.
- Fix: mark module 1380 `drop:` in port-map.tsv and add a REMOVED.md entry (the native font helper over WebSocket, the launcher). Also guard or document the null getSystemFontsProvider for the fontSet checkbox (inspector owner).

### R7-B-059 (low): the offline retry and network reconnect reset are gone, and font-manager.ts still says "not ported yet"
- Old: public/designer.browser.dev.js:12122-12133 (init adds the network listener, _networkAvailabilityChangedEvent resets the providers that failed with ConnectionError), 12205-12210 (resolveFont: offline plus ConnectionError opens GOfflineDialog.openUnavailableFeature with a retry)
- New: next/src/app/fonts/font-manager.ts:13-16 (header), 268 (a ConnectionError returns silently), 294-304 (init is empty; nothing calls _networkAvailabilityChangedEvent)
- Differs: the port-map drops modules 256 and 291 (offline dialog, network event), so the drop is accepted. What's left: a Google font whose file download fails offline (fonts.gstatic.com) stays pending for good with no retry (Q-170), and _resetProviders fills up but is never drained. The header says the missing-fonts dialog, the offline dialog and the network listener are "Not ported yet (phase 7)", but the dialog is ported and the other two are dropped.
- Fix: rewrite the header comment to say the dialog lives in dialogs/missing-fonts-dialog.ts and the offline retry and reconnect were dropped with modules 256/291. Either delete init, _networkAvailabilityChangedEvent and _resetProviders or say they are kept for API shape. Mention in Q-170 that nothing retries any more.

### R7-B-060 (low): window.ts calls a releaseDocumentListener that doesn't exist, and the missing-fonts listeners are never released
- Old: public/designer.browser.dev.js:12262-12265 (releaseDocumentListener(e) reads e.sessionId), 129165 (called with `this._document.sessionId`, a number, so it never found a listener)
- New: next/src/app/shell/window.ts:222-225 (duck-typed optional call on FontsProviderManager, which has no such method); missing-fonts-dialog.ts listenerFor
- Differs: the result is the same as the old code (it was a no-op there too), but the new code hides that behind an `as unknown as` cast. A document closed before it becomes ready keeps its DocumentStatusEvent listener on the font manager.
- Fix: drop the shim in window.ts and record the old no-op in QUESTIONS.md. Or export releaseDocumentListener(sessionId) from missing-fonts-dialog.ts and call it, recorded as a BUGS-FIXED entry if the leak gets fixed.

### R7-B-061 (low): every FontsPanel adds a ResetEvent listener that is never removed
- Old: public/designer.browser.dev.js:167180-167185 (gFontsPanel init: o.addEventListener(r.ResetEvent, ...))
- New: next/src/app/fonts/fonts-panel.ts:125-133
- Differs: the behaviour is the same as the old code. The comment says "the panel lives as long as the app", which holds for the text panel's font field but not for the missing-fonts dialog. Each replacement field that was clicked builds its own FontsButton list and panel, and after the dialog closes they keep re-querying "%" and re-rendering a detached element on every reset. The keydown handlers pile up per batch as well (Q-documented).
- Fix: keep the behaviour, but correct the comment to name the missing-fonts dialog case. Optionally add a release() that the dialog calls on close (then a BUGS-FIXED entry).

### R7-B-062 (low): stale comments and docs after the move from parity/app/fonts.ts
- Old: n/a
- New: next/src/app/fonts/fonts-provider.ts:136-142 (says the previews "come with the font panel (phase 7); until then every provider leaves the families as they are", but every provider overrides addPreviews now); next/docs/rewrite/QUESTIONS.md Q-171 ("Kept. parity/app/fonts.ts installAppFonts", now app/fonts/designer-fonts.ts initDesignerFonts); port-map.tsv line 1317 (target fonts/font-db-loader.ts doesn't exist)
- Differs: the docs point at files and functions that no longer exist.
- Fix: update the three places. The base addPreviews comment should say that the base class does nothing and every provider overrides it.

Coverage:

Module 255: reviewed, 5 findings (R7-B-033, R7-B-056, R7-B-059, R7-B-060, plus the R7-B-054 reset/getFont tail)
Module 381: reviewed, 1 finding (R7-B-062)
Module 590: reviewed, 0 findings
Module 1075: reviewed, 0 findings (data identical)
Module 1118: reviewed, 1 finding (R7-B-057)
Module 1198: reviewed, 1 finding (R7-B-057)
Module 1199: reviewed, 0 findings
Module 1200: reviewed, 1 finding (R7-B-057)
Module 1245: reviewed, 1 finding (R7-B-054)
Module 1379: reviewed, 1 finding (R7-B-055)
Module 1380: reviewed, 1 finding (R7-B-058)
Module 1470: reviewed, 0 findings
Module 1471: reviewed, 0 findings
Module 1700: reviewed, 0 findings (the Q-324 workaround checked; R7-B-058 covers the null provider elsewhere)
Module 1701: reviewed, 1 finding (R7-B-061)
