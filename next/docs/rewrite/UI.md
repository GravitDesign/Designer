# App and UI architecture (phase 7)

How the app (designer.browser.dev.js) is built in the new stack. Every
phase 7 cluster follows this. PORTING.md still applies (old names, old
order of operations, quirks kept, one class per file).

Status: the shell foundation exists (src/app/shell, src/app/state,
src/app/themes, src/main.tsx, src/app/App.tsx). Sections marked
"convention" describe how the other clusters write their parts.

## 1. Two layers

The app keeps the old object model and puts React on top of it.

- **Controllers** are plain TypeScript classes with the old names minus
  the G prefix and the old public methods: `Designer` (GDesigner),
  `Windows`, `Window`, `Sidebars` (GSidebars), `Sidebar`, `Footer`,
  `Header`, `Toolbar`, `Document` (GDocument), the actions, the panels
  (GPanel subclasses), `SystemDialog`, `Menu`, `MenuItem`. They extend the
  engine's `EventTarget` (src/engine/core/event-target.ts) and trigger the
  old G events (`DocumentEvent`, `SettingChangedEvent`,
  `Windows.WindowEvent`, `SidebarEvent`, ...). Other code, tests and the
  parity hooks talk to controllers, never to components.
- **Components** (React 19 function components, `.tsx`) render what a
  controller holds. They read state through Zustand stores or the
  `useGEvent*` hooks (section 4) and call controller methods on input.
  A component never changes controller state on its own.

The engine (src/engine) and editor (src/editor) stay framework free. The
app imports them; they never import the app.

Why this split: the old code is driven from everywhere by imperative
calls (`gDesigner.getWindows().getActiveWindow().getView()`,
`SystemDialog.alert(...)`, `menu.open(x, y)`), and the order in which
those calls and their events happen is part of what the parity suite
compares. Keeping the controllers keeps that order; React only decides
how the DOM looks.

## 2. Boot order

The old order is kept exactly (bootstrap a1483, GDesigner a1491):

1. `main.tsx` waits for `load` (old a1373: `document.readyState` or the
   load event), creates the `BrowserContainer` and calls
   `container.initLanguage(cb)`; the callback runs `container.init(boot)`.
2. `boot(container)` (src/app/shell/bootstrap.ts, old a1483 export):
   sets the container singleton, creates the `Designer` (its constructor
   adds the document-level listeners and the default settings), creates
   the drag image element, builds the registration tables (tools,
   actions, sidebars, panels, footer panels; section 9), then
   `designer.init()`, `designer.relayout()`, `await designer.start()`
   (settings and swatches restored, one `SettingChangedEvent` per stored
   setting with `restoring = true`), `container.start()`, body class
   `loading` removed, then the first document or the welcome screen,
   then `ApplicationStatusEvent(Ready)`.
3. `designer.init()` creates the parts in the old order: `#mainframe`
   (hidden), `.frame`, then `#windows`, `#info`, `#header`, `#toolbar`,
   `#banner`, `#overlay`, `#panels`, `#footer`, `#left-sidebars`,
   `#right-sidebars`. It renders the shell with React synchronously
   (`flushSync`, see `installShell` in src/app/shell/mount.tsx), so every
   part element exists when the part controllers' `init()` run, in the old
   order: info, header, toolbar, panels, footer, left sidebars, right
   sidebars, windows, banner, overlay. Then the default sidebars, the
   tool and the menu, `#mainframe` shown, `_initialized = true`.

The React root is created once in `main.tsx` on `#root`; `installShell`
renders `<App designer={designer} />` into it. Code that needs the DOM
right after a state change (old code measuring `outerHeight` after
`.css(...)`) runs after a synchronous render or writes the DOM itself
(section 5).

## 3. Singletons

The old globals become module singletons in src/app/shell/globals.ts:

```ts
import { designer, container } from "../shell/globals.ts";

designer().getActiveDocument();
container().getProperty("designer.settings");
```

- `designer()` is the old `gDesigner`, `container()` the old
  `gContainer`, `dragImage()` the old `gDragImage()`,
  `appRegistry()` the old `window.gravit` table. They throw before boot.
- Nothing is put on `window`. The old app had no outside consumer of
  `gDesigner`/`gContainer` apart from its own code and the old parity
  harness; the new parity bridge goes through `designer()`. (If Electron
  or a plugin needs one later, add it in globals.ts with a comment.)
- `gPatternChooser` and friends belong to the color cluster; keep them
  as module singletons in that cluster's files.
- Unit tests create their own `Designer` and call `setDesigner(d)` /
  `resetGlobals()` from globals.ts.
- Clusters that started before globals.ts existed defined a structural
  host and a setter (src/app/actions/host.ts `setActionHost`). Boot fills
  those right after the designer and container exist; new code imports
  `designer()` from globals.ts. A cluster's structural interface may stay
  (it keeps the cluster testable with fakes), but it must describe the
  real Designer's members with the same names and signatures.

## 4. State and subscriptions

### Stores (src/app/state)

Zustand stores hold the **projection** of controller state that React
renders. The controller is the source of truth and the only writer:

| Store | File | Holds | Written by |
| --- | --- | --- | --- |
| `useShellStore` | state/shell-store.ts | documents (refs), active document, windows (refs), active window, `version` (bumped on title, tab and modified changes), `initialized` | Designer, Windows |
| `useSettingsStore` | state/settings-store.ts | the settings object (`designer.settings`), `useSetting(key)` | Designer.setSetting / start |
| `useOverlayStore` | state/overlay-store.tsx | open overlays (dialogs, menus, popups) in open order | `openOverlay` (section 6) |

A cluster that needs more shared UI state adds its own store file in its
own folder (for example src/app/menus/menu-store.ts), following the same
rules.

Rules:

- Store values are immutable snapshots (new arrays/objects on change).
  Controller references inside them (a `Document`, a `Window`) are fine;
  the store changes when the list changes, not when the object mutates.
- Components select narrowly: `useShellStore((s) => s.activeWindow)`.
- Controllers update stores with `store.setState(...)` right where the old
  code changed its fields, before triggering the G event, so a listener
  that renders sees the new state.
- No component writes a store. Input calls the controller:
  `designer().setSetting("rulers_visible", true)`.

### Engine and editor events

Components that show engine or editor state (selection, zoom, page
properties, undo state) subscribe to the G events directly with the hooks
in src/app/state/g-events.ts:

```ts
import { useGEvent, useGSnapshot } from "../state/g-events.ts";

// Re-render when the selection changes; the snapshot is recomputed only
// after one of the events fired.
const selection = useGSnapshot(editor, [Editor.SelectionChangedEvent], () =>
  editor ? editor.getSelection() : null,
);

// Run a side effect on an event (subscribe on mount, unsubscribe on unmount).
useGEvent(scene, AfterPropertiesChangeEvent, (event) => { ... });
```

`useGSnapshot` is `useSyncExternalStore` over `addEventListener` /
`removeEventListener`; it caches the snapshot and bumps a version on every
event, so `getSnapshot` may return a fresh array. `target` may be null.

When the old code updated a panel from an event handler in a fixed order
with other listeners (for example GPropertiesSidebar updating before the
tool manager), keep that handler in the controller, not in a component:
React effects run later than G event listeners, and listener order is
observable.

## 5. DOM structure, class names and CSS

### Same DOM, same classes

Components output the old DOM: same tags, same nesting, same class names
(typos included: `tranformBox`, `hacr-start`, ...), same ids, the same
attributes the DOM snapshots record (`title`, `data-*`, `tabindex`, ...).
Copy them from the old module and check against the running old app
(http://127.0.0.1:3190) and parity/expected/ui/*.dom.json. Text comes
from the string tables (section 10).

```tsx
// Old: $("<div></div>").addClass("sidebar-container sidebar-" + id + " multiple")
<div className={`sidebar-container sidebar-${id}${multiple ? " multiple" : ""}`} />
```

Keep class order as the old code added it; the DOM snapshots record
`classList` in order. Toggled classes are appended at the end, as
`toggleClass` did.

### Who owns which element: parts, containers and islands

- App.tsx renders only `#mainframe > .frame` and the empty part
  elements (`#windows`, `#info`, `#header`, `#toolbar`, `#banner`,
  `#overlay`, `#panels`, `#footer`, `#left-sidebars`,
  `#right-sidebars`, in the old order) plus `<OverlayHost/>`. It never
  re-renders them.
- The shell controllers create the containers the old code created with
  jQuery as plain DOM, in the old order, with the old classes and inline
  styles: `.window` (Window), `.sidebar-selector`, `.sidebar-option`,
  `.sidebar-container` (Sidebars), `.root > .panel-container` (Footer),
  `.panels-tabs`, `.panels-frame` (Panels). Each hosted controller still
  gets its container in `init(container)`, as before.
- What goes inside a part or a container is React: the controller calls
  `renderInto(element, <TheView controller={this} />)` from
  src/app/state/islands.tsx (one React root per island, rendered
  synchronously, so code that looks at the DOM right after `init()`
  works). The header and the toolbar (menus cluster) do the same with
  their part element; the sidebars with their `.sidebar-container`; the
  footer panels with their `.panel-container`.
- Islands share state through the Zustand stores, not through React
  context. Never render React children into an element a controller
  owns other than through its island, and never toggle classes or
  styles imperatively on an element your component renders with a
  `className` or `style` prop.

### Inline styles that the old code wrote with jQuery

The DOM snapshots also record the `style` attribute text, and jQuery
wrote properties one by one in a specific order (`top: 73px; display:
none;`). React's `style` prop doesn't reproduce that order on updates.
So:

- Part geometry (top, left, right, width, height of `#header`,
  `#toolbar`, the sidebars, `#panels`, `#footer`, `#banner`, `#overlay`,
  window containers) and the old `.css("display", ...)` toggles of those
  elements are written by the controllers with the helpers in
  src/app/shell/dom.ts, in the old order:

  ```ts
  import { css, outerHeight } from "./dom.ts";
  css(header, "top", n + "px");   // jQuery .css("top", ...)
  n += isVisible(header) ? outerHeight(header) : 0;
  ```

  Components render these elements **without** a `style` prop, so React
  never touches what the controller wrote.
- Everywhere else, use the `style` prop when the old code built the
  element with its style in one go, and compare the DOM snapshot. If the
  order still differs, set it from a ref in the controller.

`css(el, name, value)` follows jQuery: numbers get `px` for length
properties, `""` removes the property (leaving `style=""`, as jQuery did).

### The old stylesheets

designer.browser.light.css and designer.browser.dark.css are the old
files unchanged, in next/public, so Vite copies them to the build as they
are (no hashing, no CSS modules, no imports from TS). index.html links
the light one exactly as the old index.html did:

```html
<link id="theme-stylesheet" rel="stylesheet" href="/designer.browser.light.css" />
```

The theme switch rewrites that link's href (section 11). Never import the
old CSS into a component or edit it; app CSS that the old app didn't
have is not allowed (the screenshots compare pixels). Images and fonts
the CSS references come from /assets (served from the shared assets
folder, see server/paths.ts).

### Where elements live

- The shell renders into `#root`: `body > #root > #mainframe > .frame >
  parts`. `#root` has `style="display: contents"` in index.html, so it
  makes no box and `#mainframe { height: 100% }` resolves against body as
  before. No old selector depends on `#mainframe` being a direct child of
  body (checked in both stylesheets; `body > form` is the only `body >`
  rule).
- There is no `<StrictMode>`: its double effects and refs would change
  the order of G event subscriptions.
- Everything the old app appended to `body` (dialogs, menus, tooltips,
  the drag image, the hidden clipboard element, file inputs) is a child
  of `body` again, appended in the same order: overlays are portals into
  `document.body` (section 6); plain helper elements are created with
  `document.createElement` and appended, as before.

## 6. Dialogs, menus and popups opened from imperative code (convention)

Old code opened UI from anywhere (`new GMessageDialog(text).open()`,
`menu.open(x, y)`, `gDesigner.openNewDocumentDialog()`), and then often
queried the DOM it had just built. The replacement is the overlay host:

```ts
import { openOverlay } from "../state/overlay-store.ts";

const handle = openOverlay({
  key: "message-dialog",          // for tests and logging only
  render: () => <MessageDialogView text={text} onClose={() => handle.close()} />,
});
handle.close();                   // removes it; onClosed callbacks run
handle.update();                  // re-render after controller state changed
```

- `<OverlayHost />` (rendered once by App) renders every open overlay as a
  portal into `document.body`, in open order, so each overlay's root
  element ends up appended to `body` just like `appendTo($("body"))`.
- `openOverlay`, `handle.update` and `handle.close` render synchronously
  (`flushSync`) when called outside React rendering, so old code that
  measures or queries the overlay right after opening still works.
  Never call them from inside a component render; from effects, use the
  controller.
- The overlay's controller keeps the old class and API
  (`MessageDialog.open/close`, `SystemDialog.alert/confirm/prompt`,
  `Menu.open/close`, `ContextMenu.open`). It owns its state; the
  component is its view.
- The dialog stack (Esc closes the top dialog) and the active menu
  manager stay controllers in their clusters; they use `openOverlay` for
  rendering.

## 7. jQuery plugins become components (convention for app-widgets-dialogs)

Each old `$.fn.gXxx` plugin becomes one React component in
src/app/widgets/<name>.tsx plus, where other code drove it imperatively,
a small handle type.

| Old plugin | New | Notes |
| --- | --- | --- |
| `gInputBox` | `<InputBox value onChange ...>` | keyboard: Enter commits, Esc reverts, arrows step, scrubbing; keep the old event moment (commit on blur/Enter, not on every key) |
| `gUnitBox` | `<UnitBox value unit scene ...>` | parsing and formatting through the engine (`Length`, the scene unit); keep the old rounding |
| `gInputSelect`, `gUnitSelect` | `<InputSelect>`, `<UnitSelect>` | |
| `gCheckboxSlider`, `gSlider` | `<CheckboxSlider>`, `<Slider>` | |
| `gPivot` | `<Pivot value onChange>` | |
| `gPropertyRow`, `gInputLabel` | `<PropertyRow>`, `<InputLabel>` | |
| `gAccordion` | `<Accordion>` | |
| `gRichTooltip`, `data-title` tooltips | `<RichTooltip>`, tooltip manager controller | tooltip positions from shell/tooltip-position.ts |
| `gDialog`, dialog container | `Dialog` controller + `<DialogView>` via `openOverlay` | |
| `gMenu`, `gMenuButton` | `Menu`/`MenuItem` controllers + `<MenuView>` via `openOverlay` | menus cluster |
| `gAutoEdit`, `gElastic` | `<AutoEdit>`, `<ElasticTextarea>` | |

Conventions:

- Props are controlled: `value` plus `onChange(value, { final })` where
  the old plugin fired both `input` and `change`-like events. The parent
  panel decides when to write the scene, as the old panel did.
- A widget renders exactly the old element tree and classes, including
  the wrapper elements the plugin inserted around an `<input>`.
- Widgets that other code reached through `$(el).gInputBox("value", v)`
  expose the same operations on a handle via `useImperativeHandle`
  (`ref.current.value(v)`), named after the old plugin methods.
- No widget reads the designer or the document; panels pass what they
  need.

## 8. Actions (convention for the action, menus and toolbar clusters)

### The action object

`Action` (src/app/actions/action.ts, old a31 GAction) keeps the old
methods: `getId`, `getTitle` (a `LocaleKey`), `getFullTitle`, `getIcon`,
`getCategory`, `getGroup`, `getGroupIcon`, `getShortcut`,
`isShortcutGlobal`, `getAdditionalShortcuts`, `isEnabled(...args)`,
`isCheckable`, `isChecked`, `isAvailable`, `isVisible`, `execute(...)`,
`executeFromShortcut`, `getTooltipConfig`, `getStyleClass`, `noHover`.
Ids are the old strings (`file.new`, `edit.undo`, `view.zoom.in`, ...)
and stay byte for byte; menus, toolbar, context menus, shortcuts and
`app.execute(id)` all go through them. `isPro()` returns false
everywhere (licence dropped) unless the old code's always-pro build said
otherwise.

### The registry

- The order of `designer.getActions()` is the old one: `gravit.actions`
  as bootstrap lists them, with the sidebar toggle actions
  (`ToggleSidebarAction`, one per sidebar) spliced in before
  `PresentationModeAction`'s old neighbour (`U.ID` in a1491 init), exactly
  as GDesigner.init did. `getAction(id)` is the map built in
  `_createMainMenu`.
- `designer.executeAction(id, args, source, noStats)` is the only way to
  run an action: it checks `isAvailable() && isEnabled(...args)`, picks
  `executeFromShortcut` for source `"shortcut"`, returns the action's
  result or true. Throws for an unknown id, like the old code.
- Categories (src/app/actions/category.ts, old a18) are the old chain of
  `{ label, visible, icon, parent }`; the menu tree comes from category
  chains, groups give dividers. The menus cluster builds the main menu
  from `designer.getActions()` in `Designer._createMainMenu`'s order;
  `_createMainMenu` itself stays in designer.ts and calls the menus
  cluster's `Menu`/`MenuItem` through `designer.addMenu`,
  `addMenuItem`, `addMenuSeparator`, `updateMenuItem`.

### Shortcuts

- `designer.registerShortcut(keys, down, global, up)` keeps the old
  signature and the inline-text-editor guard. Key combos are converted
  with `_shortcutToMouseTrapShortcut` and bound through the shortcut
  binder (src/app/shell/shortcut-binder.ts). The binder interface is
  Mousetrap's `bind(combo, cb, action)` / `bindGlobal`; the default
  binder handles single keys and their keyup (what the tools need). The
  app-actions-file-edit cluster ports Mousetrap (a1595/a1596; PORT-PLAN
  says npm:mousetrap@1.6.5, now in next/node_modules) and installs its binder
  with `setShortcutBinder(...)` before boot binds anything.
- Shortcuts are bound from the menu build, as before (only actions that
  are in the menu get their shortcut bound), plus
  `registerAdditionalShortcuts(action)`.

### Enabled and checked state in the UI

Nobody caches enabled/checked state. Menus ask the action when they open
(`updateMenuItem(item, title, action.isEnabled(), checkable && checked)`,
as the old `addMenu` update callback did). Toolbar buttons and panels
that show it live re-evaluate on the G events the old code updated on,
with

```ts
const enabled = useGSnapshot(designer(), [DocumentEvent], () => action.isEnabled());
```

listing the same event sources the old toolbar listened to.

## 9. Registration tables (bootstrap) and pending clusters

bootstrap.ts holds the old `gravit` table in old order: `actions`,
`sidebars`, `panels`, `footer`, `tools`. Each entry names the old class,
its module, its port-map file, the export it needs and how to construct
it (the class and the late-module lookup are passed in):

```ts
entry("GCutCopyAction", "a1331", E + "cut-copy-action.ts", "CutCopyAction", (cls) => [
  new cls(true),
  new cls(false),
]),
entry("GSnapUnitAction", "a1295", V + "snap-unit-action.ts", "SnapUnitAction", (cls) =>
  ["FullUnit", "HalfUnit"].map((name) => new cls(type(cls, name))),  // cls.Type[name]
),
```

At boot every module below src/app (an eager `import.meta.glob`, so they
are all in the app bundle) is handed to src/app/shell/late.ts. A module
must not do more at load than define and register its classes; one that
throws at load stops the app. An entry whose file or export
doesn't exist yet is skipped and listed by `pendingRegistrations()`; it
becomes live as soon as the cluster's file exports the class under the
name in the table (the old name minus G; for the unnamed modules a1299
and a1603 the table uses `OpenSafariAction` and `FastViewAction`).
**No other cluster edits bootstrap.ts.** If your class needs another
export name or other constructor arguments than the table says, report it.

Sidebars that aren't ported yet get a stand-in with the old id, side and
width (src/app/shell/pending-sidebar.ts), so the canvas keeps the old
view offset (250px left, 300px right) that every editor scenario
depends on.

The shell reaches other clusters' classes the same way, by port-map file
and export name, at runtime (`lateExport(path, name)` from late.ts): the
header (`menus/header.ts` `Header`), the toolbar (`toolbar/toolbar.ts`
`Toolbar`), `menus/menu.ts` `Menu`, `menus/menu-item.ts` `MenuItem`,
`menus/menu-open-event.ts` `MenuOpenEvent`, `menus/context-menu.ts`
`ContextMenu`, `welcome/welcome-screen.ts` `WelcomeScreen`,
`welcome/show-welcome-setting.ts` `ShowWelcomeSetting`,
`dialogs/system-dialog.ts` `SystemDialog`, `dialogs/message-dialog.ts`
`MessageDialog`, `dialogs/notification-event.ts` `NotificationEvent`,
`dialogs/software-update-manager.ts` `SoftwareUpdateManager`,
`color/swatches-changed-event.ts` `SwatchesChangedEvent`,
`actions/view/toggle-sidebar-action.ts` `ToggleSidebarAction`,
`shell/view.ts` `View` (its `UpdateEvent`), `document/document.ts`
`Document`, `document/document-images.ts` `resolveImage`. Until one
exists the shell does without it (an empty part, no menu, a console
message instead of a dialog). A part class is constructed with its part
element and must have `init()`, `relayout()` and `getHeight()`.

Tools are complete already (src/editor/tools); their table
(src/app/shell/tool-table.ts) carries the old key, shortcuts, group,
icon and rich tooltip.

## 10. Localization

- Strings are the old tables: src/app/locale/data/en.json (a814) loaded
  into the engine locale; the engine's own tables follow
  `navigator.language` (QUESTIONS.md Q-001). There is no runtime
  language switch.
- Components read strings at render time with the old keys:

  ```ts
  import { Locale } from "../../engine/core/locale/locale.ts";
  import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
  Locale.get(new LocaleKey("GCommonNames", "text.cancel"));
  // or appString("GCommonNames", "text.cancel") from src/app/locale/strings.ts
  ```

  Use the same key the old code used even where another key holds the
  same English text; locale variants of the screenshots depend on it.
- Strings with markup the old code inserted with `.html()` are rendered
  with `dangerouslySetInnerHTML` from the string table only (never from
  user data), with a comment pointing at the old call.

## 11. Theming

- The `theme` setting (`"light"` / `"dark"`, `"default"` means light)
  selects the stylesheet. `Designer._setTheme` rewrites the href of
  `head > link[href$=".css"]` (index.html's theme link) the old way
  (third dot-separated part replaced), waits until the stylesheet is
  fetched again (the old `$(link).load(url)`) and applied, then sets
  the guide line colours, recreates the rulers of every view and runs
  `_updateTheme` (label colour from `#windows`' background). src/app/themes
  holds that code and theme-scroll.ts (a1737).
- There is no CSS-in-JS and no theme context: components don't know the
  theme; the stylesheet does it. Code that needs theme-dependent colours
  (canvas painting) reads `designer().getSetting("theme")` or the
  computed style, as the old code did.

## 12. Settings

- One typed module: src/app/shell/settings.ts. `DesignerSettings` lists
  every key the old app read or wrote with its type; `defaultSettings()`
  gives the defaults the GDesigner constructor set (in the old order,
  because `start()` triggers one event per key in object order).
  `SETTINGS_PROPERTY = "designer.settings"`.
- `designer().getSetting(key, default?)` and `setSetting(key, value)`
  (also the array form) keep the old behaviour: `setSetting` does
  nothing before `start()` loaded the settings, compares with
  `Util.equals`, triggers `SettingChangedEvent(key, previous || undefined,
  value)` per changed key and then writes the whole object through
  `container().setProperty("designer.settings", settings)`.
- Components read settings from `useSettingsStore`; they write with
  `designer().setSetting`.
- Other localStorage keys (recent documents, swatches, keep-ratio,
  outline mode, ...) go through `container().getProperty(key)` /
  `setProperty`, which keep the old JSON encoding and the old async
  `getProperty` (a resolved promise, so the old microtask order holds).
  Every key and its value type is listed in src/app/storage/local-storage.ts
  (storage half of app-shell-storage); the container delegates to it.
- The settings dialog rows (app-welcome-settings, settings-keys.ts) use
  these keys; they don't keep their own copy.

## 13. File layout under src/app

```
src/main.tsx                React root, waits for load, starts the container (old a1373)
src/app/App.tsx             the shell tree: #mainframe > .frame > parts, <OverlayHost/>
src/app/shell/              GDesigner and the shell controllers
  designer.ts               Designer (a1491)
  bootstrap.ts              boot(container) and the registration tables (a1483)
  globals.ts                designer(), container(), dragImage(), appRegistry(), whenDesigner()
  late.ts                   late-bound modules of other clusters (lateExport, systemDialog)
  registry.ts, tool-table.ts  the gravit table types, the tools
  mount.tsx                 installShell: synchronous render of App for Designer.init
  handle-options.ts         the touch and desktop handle look
  pending-sidebar.ts        stand-in for a sidebar that isn't ported yet
  part.ts                   what the shell expects of hosted views and parts
  dom.ts                    jQuery-like css/outerHeight helpers for controllers
  settings.ts               DesignerSettings, defaults
  container.ts, browser-container.ts, pwa-boot.ts   (a85, a1374, a1373)
  windows.ts, window.ts     (a603, a1503)
  layout.ts                 Sidebars (a395)
  sidebar.ts (GSidebar, a806: waits for view.ts), sidebar-event.ts, sidebar-ids.ts, layout-ids.ts
  sidebar-collapse.ts       Panels (a1539, the #panels part)
  document-loading.ts       Footer (a1521; port-map name kept)
  info.ts                   Info (a1522)
  shortcut-binder.ts        the binder Designer.registerShortcut uses
  *-event.ts                the shell's G events
  view.ts, runtime.ts       owned by app-widgets-dialogs / app-config-document (port-map)
src/app/state/              Zustand stores, g-events hooks, overlay host, islands (renderInto)
src/app/themes/             theme switch, theme-scroll
src/app/storage/            storage half of app-shell-storage
src/app/document/           GDocument and friends (app-config-document)
src/app/actions/            actions (action clusters)
src/app/menus/, toolbar/    menus and toolbar (app-menus-toolbar)
src/app/widgets/            form widgets (app-widgets-dialogs)
src/app/dialogs/            dialogs
src/app/inspector/          inspector panels
src/app/sidebars/           layers, pages, symbols, library
src/app/color/, export/, welcome/, settings/, fonts/, locale/, touch/
```

Components sit next to their controller (`header.ts` + `header-view.tsx`).
A component file exports one component named after the old class plus
`View` when both exist.

## 14. Parity hooks

`src/parity/app/*.ts` become thin wrappers over the app once the real
code exists:

```ts
// view-host.ts
export const viewHostHooks = {
  view: () => designer().getWindows().getActiveWindow()?.getView() ?? null,
};
```

- No hook keeps state or logic of its own; if a hook needs something the
  app doesn't expose, add a method to the controller (with the old name
  if the old app had one).
- `app.resetState()` and `app.newInfiniteDocument()` in bridge.ts move
  to the designer (`designer().newInfiniteDocument()`); resetState
  closes every document, resets settings and localStorage and activates
  the first tool, as old-harness.js does.
- The bridge (window.__parity) is installed only after boot resolved
  (main.tsx), so hooks always find `designer()`. Hook modules load
  before boot; code in them that must follow the designer uses
  `whenDesigner(callback)` from globals.ts instead of calling
  `designer()` at module load.
- The documents are the designer's (GDocument, src/app/document);
  src/parity/app/document.ts is a view of `designer().getDocuments()`.
- Interim stand-ins still in the hooks, each named in its file: the page
  properties clip setting (view-host.ts, until app-inspector-document)
  and the properties sidebar's default-style lookup (editor-tools.ts,
  until app-inspector-geometry).

## 15. Tests

- Controllers: Vitest unit tests next to the code, in the node
  environment, with the DOM parts they need faked or with `document`
  from a test helper. Assert on calls, events and state.
- Components: render to markup with `react-dom/server`
  (`renderToStaticMarkup`) and assert on the classes and structure.
  There is no jsdom in the project; interaction is covered by the
  parity scenarios (ask the coordinator if a cluster needs a DOM test
  environment).
- Parity: the ui/* scenarios compare screenshots in both themes and the
  DOM snapshots; list the ids your cluster makes pass in
  parity/ported/<cluster>.json.
