# Features the new app removed on purpose

The licence, subscription, account, cloud and analytics parts of the old
app are dropped (port-map.tsv decision `drop`), and so is the annotations
(comments) sidebar (decided by the user, 2026-10-24). Most of that leaves
no trace a parity scenario records. Where a scenario does record it, the
new app differs from the old output on purpose, and the scenario gets a
`DROP-NNN` exception: parity/exceptions/DROP-NNN.json lists the scenarios,
and each one has a `<scenario>.fixed.<ext>` expected file with the output
the new app must produce. This works the same way as the `BUG-NNN`
entries of BUGS-FIXED.md (parity/support/exceptions.ts). A scenario that
shows several removed features is listed in each of their entries and
has one `.fixed` file. When a bug fix (BUGS-FIXED.md) changes the scenario
as well, `<scenario>.dropped.<ext>` holds the old output with only the
removals, and the checks below compare that file; the `.fixed` file adds
the bug fix on top.

Scenarios whose whole subject is a removed feature (a removed action, the
cloud save chooser) don't get a `.fixed` file. They run `removedInNewApp`
for the new app instead, which fails if the feature is still there.

Each entry: what was removed, where the old app did it, what the old
output shows, what the new one shows, and which scenarios differ.

## How a `.fixed` file is checked

A `.fixed` file is the new app's output. It may differ from the old
expected file only in the removed part, and that is checked, not assumed
(parity/support/removed.ts):

- JSON and DOM outputs: the entry's `removed.rules` describe the removal
  as an edit of the old output (drop these nodes, drop this licence class,
  drop these action ids, move these submenus up by one item).
  removed.test.ts applies the rules of every entry that lists the
  scenario to the old expected file, and the result must be the `.fixed`
  file byte for byte. A rule can be limited to some scenarios with `only`
  (scenario id prefixes).
- PNG outputs: the entry's `removed.png[<scenario>]` says where the shot
  may differ: `free` rectangles, and `moved` regions that must equal the
  old shot at an offset (the header tabs moving right by the width of the
  dropped account avatar; a menu that lost an item, with `height` for the
  shorter shot). Every other pixel must be identical.
- The comments sidebar (DROP-006) is a feature the old code can switch
  off itself: `HAS_ANNOTATIONS` in its config module. The entry names the
  old app variant `no-annotations` (parity/support/old-variants.ts: the
  old bundle served with that switch off). For each of its scenarios the
  parity suite also runs the variant ("old app variants" tests) and
  requires it to produce the `.fixed` output, after applying the rules
  and png specs of the scenario's other entries to the variant's output.
  This covers what a plain shift can't describe: with the inspector 32 px
  higher, round borders and circles antialias differently, and overlays
  opened from it sit higher. The old app without its comments sidebar
  renders all of that exactly like the new app.

## DROP-001 No Pro actions

Old code: designer.browser.dev.js module 1483 (the bootstrap) wrapped
some actions in the cloud action wrapper, module 1626 (dropped with the
cloud, port-map `drop-app-cloud`): Import Fonts, Export, Export PDF and
Save as PDF at 300 dpi among them. The wrapper made `isPro()` return
true, so menus and tooltips showed a Pro badge and the licence decided
whether the action ran.

- Old: the action info the editor-actions scenarios record says
  `pro: true` for those actions.
- New: there is no licence and no Pro action; every action says
  `pro: false` and runs. Nothing else about these actions changes.
- Scenarios: parity/exceptions/DROP-001.json. Each `.fixed.json` equals
  the old expected output except `"pro": false` where it said true.
  Pending there: editor-actions/dialogs/font.import (the font import
  dialog isn't ported yet). editor-actions/registry/registered also
  differs by DROP-005, DROP-006 and DROP-007.

## DROP-002 No Pro classes and badges

Old code: designer.browser.dev.js, the `gPro` jQuery plugin
(`$.fn.gPro`) and the licence checks that called it from the menus,
toolbar, inspector, colour chooser, effects and dialogs. It added `pro`
to the element of a licence feature, `legacy-feature` where the feature
was free for old accounts, `trial` during a trial, `has-pro-option` and
`has-trial-option` to a select with such options, and appended an empty
`span.pro` badge after some selects and checkboxes; the rich tooltips
toggled `g-pro` on their content.

- Old: the DOM snapshots and menu trees record those classes and badges.
  With a valid licence the stylesheet shows nothing for them (every Pro
  rule needs `body.pro-expired` or `.trial`), so no screenshot changes.
- New: no licence, so no classes and no badges. Nothing else changes.
- Rules: drop the classes `pro`, `legacy-feature`, `has-pro-option`,
  `has-trial-option`, `trial` and `g-pro`, and every empty `span.pro`.
- Scenarios: parity/exceptions/DROP-002.json (92: inspector, colour
  chooser, effects, menus, toolbar and shell DOM snapshots, the main
  menu tree, the tab context menu, the import and export menu lists). ui/editor/text-advanced clicked
  `.appearance-toolbar button.pro`; it now clicks
  `button[data-action="text-settings"]`, the same button. Re-recorded:
  the old output stayed identical byte for byte.

## DROP-003 No account area in the header

Old code: designer.browser.dev.js module 1500 (GHeader): the persona bar
(module 1502, `.section.persona > .g-persona-bar > .g-persona-container`)
and `_createLoginTab` (`.section.login` with the user avatar and name).
Dropped with the account and the cloud (`drop-app-cloud`).

- Old: the header ends with the login section, a 40 px avatar circle at
  the right end; the persona bar is two empty elements.
- New: neither exists (src/app/menus/header.ts). The empty
  `.section.persona` stays: the stylesheet gives it flex-grow, and it
  keeps the document tabs at the right end. **The document tabs and the
  more-tabs button move right by 40 px**, into the place of the avatar.
  Nothing else in the header moves.
- Rules: drop `.g-persona-bar` and `.section.login`; for
  editor-tools/editor/fullscreen-toggle, which records the header's
  text, drop the avatar's letter "T" from it. Shots: the header band from
  the first tab to the right end equals the old one moved right by 40 px
  (`moved`, dx -40).
- Scenarios: parity/exceptions/DROP-003.json (45: shell, tabs, welcome,
  pages, layers and context shots that show the header, the header,
  window and tab DOM snapshots, the fullscreen toggle). editor-actions/registry/cloud-ui, which
  requires `.g-persona-bar` and `.g-persona-container` gone, passes.

## DROP-004 No share and collaborators UI

Old code: designer.browser.dev.js, the toolbar's export section: a
`.share-section` with the `.g-collaborators` bar and the Share button,
both hidden for a local document.

- Old: the DOM snapshots record the two hidden elements.
- New: the empty `.share-section` stays (its margin is part of the
  toolbar layout in touch mode); the collaborators bar and the button
  are gone. No screenshot changes.
- Rules: drop `.g-collaborators` and `.share-button`.
- Scenarios: parity/exceptions/DROP-004.json (11 toolbar and window DOM
  snapshots).

## DROP-005 No Open from template

Old code: designer.browser.dev.js module 1483 (the bootstrap) registered
`file.open-from-template`, "New Design from Template...", the second
item of the File menu (disabled without the cloud).

- Old: the action is in the registry and the main menu; the File menu
  shows the disabled item.
- New: no such action or item. **The File menu is 26 px shorter**, and
  every File submenu opens 26 px higher.
- Rules: drop the action id and the menu item; move the File submenus up
  by 26 px. Shots: everything below the removed item moves up 26 px and
  the shot is 26 px shorter.
- Scenarios: parity/exceptions/DROP-005.json (39: the File menu shots
  and DOM snapshots, the main menu tree, the registry list).
  editor-actions/exec/file.open-from-template checks for the new app
  that the action is not registered (`removedInNewApp`).

## DROP-006 No comments sidebar

Old code: designer.browser.dev.js module 1483 (the bootstrap) registered
the annotations sidebar when the config module's `HAS_ANNOTATIONS` was
set (always), with its toggle action `view.toggle-sidebar.annotations`
and the View menu item "Show Comments Panel". The right side then had
two sidebars, so `.sidebar-selector` showed an Inspector / Comments tab
row above the inspector. The annotation properties set up the shared
pattern chooser with `singleOption`, which left `style=""` on the
chooser's toolbar.

- Old: a 32 px tab row above the inspector, the toggle action and the
  menu item, `style=""` on the pattern chooser toolbar.
- New: no comments sidebar, so no tab row, action or menu item. **The
  inspector starts 32 px higher**, and everything opened from it (the
  pattern chooser, style and font popups, effect settings, the context
  menus of its rows, the DPI list) opens 32 px higher. The pattern
  chooser toolbar has no style attribute. The rest of the window doesn't
  move.
- Check: the old app variant `no-annotations` must produce each `.fixed`
  output (see above). It renders the inspector at the new position, so
  the antialiasing of circles and round borders matches as well.
- Scenarios: parity/exceptions/DROP-006.json (186: inspector, colour,
  effects, style, font and editor popups, context menus, toolbar
  dropdowns, View menus, the i18n sidebar lists, touch and full-window
  shots, the main menu tree, the registry list, the View menu of
  platform/storage/migration-settings).
  editor-actions/exec/view.toggle-sidebar.annotations checks for the new
  app that the action is not registered (`removedInNewApp`).
- The variant doesn't fit scenarios that record a document: with
  `HAS_ANNOTATIONS` off the old app also creates documents without their
  annotations layer, which the new app still has.

## DROP-007 No iOS image import

Old code: designer.browser.dev.js module 1483 (the bootstrap) registered
`file.import-image-from-ios-photos` and `file.import-image-from-ios-files`
(File > Import > Place Image, available only on iOS).

- Old: both actions are in the registry and the menu's action list.
- New: neither is registered.
- Rules: drop the two action ids.
- Scenarios: parity/exceptions/DROP-007.json (2). The two
  editor-actions/exec scenarios check for the new app that the actions
  are not registered (`removedInNewApp`).

## DROP-008 No cloud save chooser

Old code: designer.browser.dev.js module 1510 (port-map `drop:cloud save
chooser`): File > Save of a new document asked "Save to File" or "Save
to Cloud".

- New: there is no cloud, so Save goes to a file directly.
- Scenarios: ui/dialog/save-chooser.light, .dark and .dom check for the
  new app that the chooser doesn't open (`removedInNewApp`). No `.fixed`
  files.

## DROP-009 No annotation tools

Old code: designer.browser.dev.js, the annotations sidebar (module 1483
registers it when `HAS_ANNOTATIONS` is set) and its toolbar
(`.annotations-toolbar`): the rectangle, ellipse, arrow, pencil,
highlighter and comment-note tools of the review mode, the comments
panel with its rows, replies, resolve and delete. The sidebar was the
only way to these tools: they are not in the tool table (`gravit.tools`),
the toolbar or the shortcuts. Decided by the user (2026-10-24) together
with DROP-006.

- Old: the comments sidebar opens the review mode; its toolbar activates
  the annotation tools, and while it is open the drawing tools and their
  keys are blocked (GDesigner.canActivateTool).
- New: nothing opens the review mode, so the annotation tools can't be
  activated. canActivateTool blocks nothing, and the tool table has no
  annotation tool (src/app/shell/tool-table.ts). The editor still
  registers the tools with its tool manager, and documents with
  annotations still load, render and save (corpus/annotations/*,
  compat/annotations/roundtrip).
- Scenarios: the 26 editor-tools/annotations/* scenarios that drive the
  review mode check for the new app that no way to the tools is left: no
  sidebar tab, annotations toolbar, tool icon or comments row, no
  annotation action, and no letter or digit key that activates an
  annotation tool (`removedInNewApp`, parity/scenarios/editor-tools/annot.spec.ts).
  editor-tools/annotations/touch-transform-box-icon-handles is about the
  touch transform box and stays a normal comparison. No `.fixed` files.

## DROP-010 No deep links but pwainstall

Old code: designer.browser.dev.js module 85 (GContainer.DeepLinking and
handleDeepLinking), module 1374 (GBrowserContainer.handleDeepLinking) and
module 1491 (GDesigner.runDeepLink), run by the bootstrap (module 1483).

- Old: a start URL with one of the DeepLinking parameters (procoupon,
  purchase_flow, purchase_flow_new, purchase, reset-password,
  set-password, passwordless-token, confirm_email, account, purchases,
  enterprise, directlink, reset_trial, annot, create_share,
  activate_trial) opened a purchase, account, sign-in, trial, shared
  document or comment flow. `?pwainstall` opened the "install the app"
  dialog once the app was ready. The browser container took the query
  off the address (history.pushState), except for directlink, annot and
  create_share.
- New: the container still finds the link and takes the query off the
  address the same way (src/app/shell/container.ts, browser-container.ts),
  and `?pwainstall` still opens the install dialog (bootstrap.ts). The
  other links do nothing: their flows were cloud, account and licence
  features.
- Scenarios: none record a deep link. Unit tests:
  src/app/shell/deep-linking.test.ts.

## DROP-011 The old build's bundle files

Old code: public/index.html and the files next to it: the webpack
bundles jquery.js, chunk.vendor.js, designer.browser.js and
designer.browser.dev.js, the workers (autosave, pdf, pdfexport, ps), the
Workbox service worker cacher.js, the unused service-worker.js,
static.css (only listed in the service worker's precache) and proxy.html
(the cross-origin probe for the cloud preview).

- Old: index.html loads the light theme stylesheet, the manifest,
  jquery.js, chunk.vendor.js and designer.browser.dev.js; the server
  serves all of the files above, chunk.vendor.js and designer.browser.js
  with an immutable Cache-Control.
- New: the Vite build replaces the bundles and workers with its own
  hashed files under /bundle (index.html loads those), and the service
  worker and the cloud pages are dropped (PORT-PLAN). The pages, the two
  theme stylesheets, the favicon, the manifest, the 512 px icon and the
  icon font are still served under the old names, exactly as before.
  cacher.js and service-worker.js are served again, as workers that
  unregister themselves, so a browser that kept the old app's worker
  stops serving the cached old app.
- Scenarios: platform/server/static-files checks for the new app that
  those kept files answer as the old server did, that the two worker
  names answer, and that every other old file answers 404 (no stale copy
  of the old build).
  platform/server/index-references checks that every file the new
  index.html references exists with a JavaScript, CSS or JSON content
  type, that none of them is an old bundle file, and that the old
  stylesheet and manifest links are still there and served as before
  (`removedInNewApp`). No `.fixed` files.

## DROP-012 No online probe at start

Old code: designer.browser.dev.js module 1483 (the bootstrap) called
`gDesigner.isOfflineAsync()` right after creating the designer, which
sent `HEAD /connection/test`. Its result was read only by the Electron
start, to open the sign-in when there was no user and the app was
online (cloud, dropped).

- Old: one `HEAD /connection/test` while the app starts.
- New: no request at start. The /connection/test route stays
  (platform/server/connection-test). The fix of R7-B-031 (font
  providers retried on the window `online` event) uses the browser
  events and sends no probe. If a later port brings back
  GDesigner.isOffline with its probe (the update check used it), this
  entry and the scenario have to change.
- Scenarios: platform/server/online-probe checks for the new app that no
  request reaches /connection/test while it starts (`removedInNewApp`).

## DROP-013 No cloud check when opening a synced file

Old code: designer.browser.dev.js module 163 (GDocument.deserializeData,
around line 6465, and loadFromCloud). A .gvdesign whose scene says it is
synchronized with Gravit Cloud (`cid` set and `cfs` true) was compared
with the cloud copy before it was shown (chooseLatestDocument).

- Old: without the cloud the comparison fails: the document shows the
  file's scene with the status SyncFailed instead of Loaded, and the
  failure handler sets `cfs` to false when the app is online. Saving it
  writes neither `cid` nor `cfs` (`cfs` null), as for any file.
- New: such a file opens like any other (status Loaded, src/app/document/document.ts).
  Saving it writes the same as the old app: no `cid`, `cfs` null.
  Checked by opening the corpus file transforms.gvdesign with `cid` and
  `cfs: true` added in both apps and saving it (no scenario: none of the
  corpus files carries these properties).

## Not ported: code nothing calls

- GDesigner.downloadFonts and calculateFontsSize (designer.browser.dev.js
  module 1491, around line 124659), with the `.fonts-download-progress`
  strip and the texts text.downloading-fonts, text.fonts-downloaded and
  text.error-downloading. Nothing in the old bundle calls them, so no
  user could reach them.
