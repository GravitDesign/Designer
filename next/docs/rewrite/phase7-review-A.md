# Phase 7 review, group A

Scope: clusters app-designer-main, app-shell-storage, app-config-document, app-actions-file-edit, app-actions-modify and app-actions-view (next/src/app/shell, storage, document, util, config.ts, file-formats.ts, actions/**, clipboard), plus the parity hooks in next/src/parity/app that wrap them. No Playwright or Vitest was run; findings come from reading the old and new code, the unit tests, parity/ported/*.json and parity/expected.

Counts: 2 high, 5 medium, 7 low (14 total).

How the review was done. For every port row of the six clusters I compared the old module with its new file in three ways:
- Every quoted string of the old module was looked up in the new file, then in the whole of next/src. What was left over was read by hand. Almost all of it is cloud, licence, analytics, Teams, 123rf, Magenta, personas or jQuery selectors.
- Every old method name (prototype members, class methods, statics) was looked up in next/src/app.
- Functions were read side by side. This covered all the action base classes (GAction, GCategory, GElementAction, GSubAction, GMainAction), cut/copy, paste and its variants, undo and redo, select all and invert, outline, fit all, GDocument (isModified, getTitle, insertElement, _updateScene, the load and deserialize chain, setTitle, buildPreview), GStorage, GFileSystemAccessStorage.openPrompt, GContainer, GBrowserContainer, GInfo, GPanels and GWindow._documentStatusChanged. In GDesigner I read executeAction, canExecuteAction, registerShortcut, set/getSetting, add/remove/activate/replaceDocument, openDocument and _processOpenDocument, executeWhenReady and the PWA dialog, plus the paste handler (module 1313).

The ports are careful. Branch order, null checks, numeric order and kept quirks match, for example the memory estimate quirk in container.ts, the duplicate getIcon in paste-here, the never-true parent filter in cut/copy and the unreachable LoadFailed branch in deserializeData. I found no `any`, no jQuery and no minified names in the scope. Every one of the 122 action table entries in bootstrap.ts points at a file and export that exist. The findings below are features that are missing, coverage gaps, and lookups that fall back silently.

## High

### R7-A-001 (high): the unsupported-browser notice is gone
- Old: public/designer.browser.dev.js:121988 (GDesigner._initBrowserSupported), isBrowserSupported and setSupportedBrowsers/setSupportedTabletBrowsers in module 1491; the call in init at 122746-122760 (`this._initBrowserSupported(GPlatform.webBrowser), this.isBrowserSupported() || ee.showOneTimeDialog(...)`); the lists set by the bootstrap at 119293-119322 (module 1483).
- New: next/src/app/shell/designer.ts:1647. Only the comment "The unsupported-browser notice: Chrome, Firefox and Edge on the desktop are supported." is left, with no code after it. bootstrap.ts sets no browser lists.
- Differs: the old app showed a one-time dialog, text.unsupported-browser or text.unsupported-browser-touch with %app replaced, and setting designer.settings.dont_show_unsupported_browser_dialog. It appeared on any desktop browser outside the list (in the isCorel build that includes desktop Safari), on tablets other than Android Chrome or iOS Safari, and on every phone, because a phone is neither Tablet nor Desktop so _isBrowserSupported became false. The new app never shows it. The setting key still exists in storage/local-storage.ts:74, and nothing reads it.
- Fix: port _initBrowserSupported, isBrowserSupported, setSupportedBrowsers and setSupportedTabletBrowsers into designer.ts with the old defaults (`_isBrowserSupported = true`, empty lists). Have bootstrap set the isCorel lists: Chrome, Firefox, Edge; tablets Unix+Chrome and OSX_IOS+Safari. Call SystemDialog.showOneTimeDialog at the old place in init. Add a unit test with System.hardware = Phone and one with desktop Safari that fails without the call. The scenario ui/dialog/one-time-dont-show-again is not ported either.

### R7-A-002 (high): File > Import > Fonts throws instead of importing
- Old: module 1608 (GImportFontsAction.execute, `(e || new GFontDBLoader()).import(t)`) and module 1245 (GFontDBLoader).
- New: next/src/app/actions/file/import-fonts-action.ts:52-57. The lookup `lateExport("fonts/font-db-loader.ts", "FontDBLoader")` finds no file, so the action throws "fonts/font-db-loader.ts is not ported yet".
- Differs: the menu entry is registered and enabled, but executing it throws. Module 1245 belongs to app-fonts-ui (group B's scope), but the user sees the broken action from this cluster. The scenarios editor-actions/dialogs/font.import and editor-actions/exec/font.import.fixed are not ported.
- Fix: port module 1245 as fonts/font-db-loader.ts on top of fonts/font-db.ts. Until it exists, make ImportFontsAction.isEnabled return false when the loader is missing, so the menu doesn't offer an action that throws.

## Medium

### R7-A-003 (medium): the `?pwainstall` start link no longer opens the install dialog
- Old: public/designer.browser.dev.js:3173 (GContainer.handleDeepLinking, DeepLinking.PWADialog = "pwainstall"), 120316 and 120324 (bootstrap: `p.has(DeepLinking.PWADialog) && gDesigner.executeWhenReady(() => gDesigner.showInstallPwaDialog())`, the local branch after io()), 109641 (GBrowserContainer.handleDeepLinking, which strips the query with history.pushState).
- New: next/src/app/shell/container.ts:133 (`handleDeepLinking(): null`); bootstrap.ts never calls showInstallPwaDialog.
- Differs: container.ts calls every deep link a cloud feature, but pwainstall is local: the PWA install dialog (module 1562) and showInstallPwaDialog are both ported. A link with `?pwainstall` now opens the plain app.
- Fix: in boot, after the first document or the welcome screen, read `new URL(location.href).searchParams.has("pwainstall")` and call `designer.executeWhenReady(() => designer.showInstallPwaDialog())`. Keep the browser container's pushState, which drops the query for links other than directlink, annot and create_share. Record the other links as dropped in REMOVED.md.

### R7-A-004 (medium): most action scenarios of these clusters are not ported
- Old: parity/expected/editor-actions/** (recorded from the old app).
- New: parity/ported/app-actions-*.json, app-designer-main.json, app-config-document.json.
- Differs: 75 of the 367 editor-actions expectations are not in any ported list. These belong to this group:
  - registry/registered: the ordered list of the 186 action ids with each one's title, category, group, shortcut and enabled state. It is the only check of the bootstrap order and of the menu state.
  - shortcuts/joint-type, modify, view-zoom and windows-pages (GMainAction sub keys, Mousetrap binding).
  - exec/edit.paste.in-place and --with-selection, exec/view.zoom.fit.all--fixed-page, exec/view.zoom.original--fixed-page.
  - clipboard/paste-events.
  - undo/in-text-input and undo/drag-and-nudge.
  - path-dialogs/*: offset, outline and simplify values (invalid, negative, 0, Enter, cancel) and create-symbol.
  - dialogs/file.save--ctrl-s, dialogs/file.export*, exec/file.export*.fixed, exec/file.save-as.pdf.300.fixed.
  - dnd/drops, main-menu/tree.

  Reading the actions behind them found no divergence: paste-in-place, fit-all, original-view, outline, redo and undo all match, including the ElementAction check in paste-in-place. So the failures, if there are any, sit in the shell, the dialogs or the binder, and nothing shows them today.
- Fix: run these scenarios against the app, port the passing ones and file the failing ones as findings. Start with registry/registered, since it checks the action table, ids and shortcuts all at once.

### R7-A-005 (medium): the real open and save path of GDocument is mostly unverified
- Old: module 163 (GDocument.load, store, _handleSecondaryFormatRead/Save, placeOrImport) and module 1195 (the file input path).
- New: next/src/app/document/document.ts, open-import.ts, store-document.ts, place-import.ts; storage/file-system-access.ts.
- Differs: 13 of the 53 compat/<name>/roundtrip scenarios are not ported: fills-gradients (.fixed), fills-textures, pages-master, pages-master-odd-even, paths-graph, symbols, text-character-styles, text-layout, text-lists, text-on-path, text-runs, text-scripts and transforms. These open a corpus file, save it through file.save-as.gvdesign and open it again through file.open, so they are the byte-exact check of the app's save. Of import-export/import/open/*, 101 of the 110 expectations are not ported: opening png, jpg, heic, svg, pdf, eps, ai and sketch, multiple-files, pdf-missing-fonts-dialog/replace and eps-worker-exception-hangs. parity/ported/app-storage.json is empty. The unit tests (document.test.ts, import.test.ts, storage/*.test.ts) cover the pieces but not one open or save through the actions.
- Fix: run the compat roundtrips and the import/open scenarios. Each failure is either an app difference to fix here or an engine one to file. Port the passing ones into app-config-document.json and app-storage.json.

### R7-A-006 (medium): a design with the cloud-sync flag loads differently and saves `cfs: true`
- Old: public/designer.browser.dev.js:6465 (deserializeData). A scene with `isCloudSynchronization()` (cid set and cfs true) went to loadFromCloud at 6517. When that failed it called setScene and moved to SyncFailed instead of Loaded, and its failure callback ran `gDesigner.isOffline() || scene.setProperty("cfs", false)`.
- New: next/src/app/document/document.ts:585 and io/gvdesign/load.ts:47. Every scene takes the plain branch (_updateScene, Loaded, setScene).
- Differs: a .gvdesign that was once synced with Gravit Cloud keeps `cfs: true` in the scene, so a save writes it back unchanged, where the online old app wrote false. The window also gets Loaded, which runs centerAndZoom, where the old app got SyncFailed, which only cleared the overlay. I haven't confirmed which of the two old outcomes the recording browser hit (online or offline). None of the 59 corpus .gvdesign files carries a cid or `cfs: true`, so no scenario covers this.
- Fix: record a corpus file with `cid`/`cfs: true` in the old app to see what the old save writes. If it writes `cfs: false`, clear cfs in deserializeData for such scenes. Either way, note the decision in QUESTIONS.md.

### R7-A-007 (medium): a missing late export silently turns behaviour off
- Old: direct requires; a missing module failed at load.
- New: shell/late.ts lateExport, used across designer.ts, bootstrap.ts and the actions.
- Differs: a typo or a renamed export makes the feature quietly do nothing, with no error at boot. These lookups resolve today only by luck or not at all:
  - bootstrap.ts:95-97 looks up `getFileTypesArray` in document/file-types.ts, which is a method of FileTypes and not an export, so the lookup always falls back to `Object.values(FileTypes)`. It gives the same three Save As formats (png, jpg, svg) only because the object keys happen to be in the old array order.
  - install-to-desktop-action.ts:32 looks up shell/pwa-support.ts, which doesn't exist (see R7-A-010), and runs an inline copy of the checks instead.
  - import-fonts-action.ts:52 (R7-A-002).
  - shortcut-binder.ts:220 starts with a SingleKeyBinder that silently drops every combo shortcut. Only the side effect of importing actions/mousetrap-binder.ts swaps in Mousetrap, so if that module isn't evaluated before boot, Ctrl+S, Ctrl+Z and the rest stop working without an error.
- Fix: use the FileTypeList export in bootstrap.ts. Add a boot-time check, or a unit test over the real module map, that every lateExport path and name resolves and that the installed binder is the MousetrapBinder. The test should fail on a renamed export.

## Low

### R7-A-008 (low): leaving the page during an update install can show the "leave site?" prompt
- Old: public/designer.browser.dev.js:124125 (`_beforeInstallUpdate`: `_reloading = true` on GSoftwareUpdateEvents.BeforeInstallUpdate) and 124250 (isReloading). The bootstrap's onbeforeunload started with `gDesigner.isReloading() || ...`.
- New: next/src/app/shell/bootstrap.ts:717. Neither isReloading nor the BeforeInstallUpdate listener exists in designer.ts.
- Differs: the software update panel only installs after canUnload says yes, so the prompt can only appear when a document changes between that check and location.reload(). The old reload() maintenance flow that also set the flag is cloud and dropped.
- Fix: add `_reloading`, isReloading and the BeforeInstallUpdate listener to Designer, and check it in onbeforeunload.

### R7-A-009 (low): opening a file without an extension no longer throws
- Old: public/designer.browser.dev.js:122385 (_processOpenDocument, `e.ext.toUpperCase() === n.toUpperCase()` with n = getExtension(), which is null for "README").
- New: next/src/app/shell/designer.ts:1311 (`(extension || "").toUpperCase()`).
- Differs: the old code threw a TypeError out of openDocument. The new one shows text.unsupported-file-extension. That is the better behaviour, but it isn't recorded.
- Fix: add a line to QUESTIONS.md, or keep the throw.

### R7-A-010 (low): port-map rows point at files that will never exist
- Old and new: next/docs/rewrite/port-map.tsv.
- Differs: these port rows have no file, and every one of them is either merged or only used by dropped code:
  - a1155 (condition) became Designer._readyCallbacks in executeWhenReady, designer.ts:2247. The old listener was never removed because _do removed `this._do`, not `_listenEvent`; that leak is gone, which is fine.
  - a1173 (PWA support) is inlined as isPwaSupported in install-to-desktop-action.ts:31.
  - a1191 (children tracker): its only users are the annotation modules a1356, a1357 and a1713.
  - a1346 (GUnloadEvent): its only listener is a1668, the collab text panel.
  - a1347 and a1672 (in-app link event and reload): only the login flow used them.
  - a1354 (GInvalidationOptions): only the annotation panel a1712/a1713 used it.
  - a1493 (steps): only a1249, the cloud step runner, used it.
  - a1554 (value stack, a query builder): only a1553, the cloud files panel, used it.
  - a1571 (document event relay): the realtime WebSocket client.
  - a1670 and a1671 (plugin loader and GModule): storage.getPlugins() is always [] in the browser, and bootstrap.ts has `plugins: []`.
  - a1694 (widgets index): a list of side-effect requires.
- Fix: change these rows to `drop:<reason>` or to the file they were merged into.

### R7-A-011 (low): stale comments
- designer.ts:1147-1149: createDocument says "Until GDocument exists ... this gives null". GDocument exists.
- designer.ts:1647: the dangling unsupported-browser comment (R7-A-001).
- install-to-desktop-action.ts:27-29: "Until that module exists"; see R7-A-010.
- parity/app/corpus.ts:13-17: "Interim, until the app shell and the font providers exist". Both exist.
- Fix: update or delete them.

### R7-A-012 (low): GInfo and GContainer.initLanguage drop their bodies without a QUESTIONS.md entry
- Old: module 1522 (GInfo._updateInfo, the e-mail confirmation notice) and module 85 at 3227 (initLanguage applying the stored or browser language).
- New: shell/info.ts (always hidden), container.ts initLanguage (reads the settings and applies nothing).
- Differs: both are right for a local English-only app (Q-001 covers the language), but container.ts doesn't cite Q-001 for the stored `language` setting. A stored "de" from an old profile is silently ignored.
- Fix: cite Q-001 in container.ts, and mention the ignored setting in the migration notes.

### R7-A-013 (low): the parity hooks are thin and hide nothing, but their Node fallback differs from the designer
- New: next/src/parity/app/document.ts:184-253 (NodeDesigner).
- Differs: the hooks go through designer.executeAction, removeDocument and the real file actions. corpus.ts saves through file.save-as.gvdesign and opens through file.open, so none of them reimplements app logic. The Node-only NodeDesigner (used when there is no DOM) activates the last document after a removal and has no actions or windows. It only serves unit tests of other hooks, but a hook test that passes against it says nothing about the designer.
- Fix: name it in the file header as unit-test-only, and keep app behaviour tests on the real Designer.

### R7-A-014 (low): GDesigner.downloadFonts and calculateFontsSize are not ported
- Old: public/designer.browser.dev.js:124659 (downloadFonts, with the .fonts-download-progress strip and its text.downloading-fonts, text.fonts-downloaded and text.error-downloading texts).
- New: none.
- Differs: nothing in the old bundle calls them, so no user can notice. Listed so nobody looks for them later.
- Fix: none needed, or record them as dead code in REMOVED.md.

## Coverage by module

Checked and matching apart from the findings above:
- base actions a18, a31, a106, a1168, a1281
- file and edit actions: all port rows of app-actions-file-edit, string and method check on every one; read side by side were a1331, a1182, a1183, a1284, a1171, a1599, a1333 and a1608
- modify actions: all port rows of app-actions-modify, with a1185 and a866 read side by side
- view and help actions: all port rows of app-actions-view, with a449 read side by side
- a1313 (paste handler)
- config and document modules: a10, a40, a78, a86, a119, a163, a173, a217, a237, a355, a389, a442, a443, a519, a536, a554, a555, a592, a594, a790, a1042, a1154, a1195, a1301, a1472, a1482, a1557, a1610, a1688, a1690
- shell modules: a85, a135, a198, a395, a444, a450, a565, a603, a806, a807, a808, a863, a1161, a1328, a1330, a1373, a1374, a1483, a1488, a1491, a1492, a1503, a1517, a1521, a1522, a1539, a1673, a1737
