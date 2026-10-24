# brand: the GravitDesign Next look

The new app has two looks (docs/rewrite/CHANGES.md): GravitDesign Next,
the default, and classic, which is the old Gravit Designer look pixel for
pixel. Every other area compares the new app with the old one, so the
harness opens the new app in the classic look there
(support/apps.ts `isolateNetwork` sets `window.__gdBranding = "classic"`
on every context; the desktop launcher sets `GD_BRANDING=classic`).

The scenarios here are about the other look, which the old app doesn't
have. They are not a parity comparison, so they don't use `paritySuite`
and have no "old app" side:

- Each scenario opens the new app with `?branding=next` (which wins over
  the harness's classic setting) and records a PNG or JSON from the new
  app itself, into `parity/expected/brand/`.
- After that, every run compares the new app against that recording with
  the same zero-tolerance comparison as the parity scenarios.
- Each PNG scenario also runs once with the brand stylesheets blocked
  (`/brand/next.css`, `/brand/editor.css`, `/brand/accent.<theme>.css`)
  and must then differ from its recording ("needs the brand
  stylesheets"), so a shot that doesn't show the brand can't pass. The
  Help menu entry has no brand colour, so it is recorded as text in
  `brand/names` instead of a shot.
- The shots that show the editor restyle (CHANGES.md CHG-002) run once
  more with only `/brand/editor.css` blocked and must differ then too
  ("needs editor.css"). That is every PNG scenario except the loading
  screen.

What they record, each in both themes unless noted:

- the welcome screen and the introduction;
- `editor-selection`: the whole window with a selected card (mark and
  menu bar, document tab, toolbar, sidebar tabs, selected layer,
  inspector, canvas);
- `inspector`, `inspector-text`, `inspector-border`: the inspector of a
  shape (fill row, slider, selects), of a text (font selects, pivots,
  segmented buttons, checkbox) and of a shape with a border;
- `layers` (light) and `layers-dark`: the sidebar tabs, pages and layers;
- `toolbar`: the active tool and the snap toggle in the accent;
- `focus`: a focused inspector field (focus ring, selection hint);
- `color-chooser`, `menu` (File, one item hovered, with the mark),
  `context-menu`, `dialog` (the unsaved-changes confirmation): the
  popover and dialog surfaces;
- `canvas`: an 800 x 600 page with the canvas around it and its shadow;
- the loading screen (light) and `brand/names` (window title, version
  line, stylesheets, favicon and manifest links, the introduction opening
  once and again from Help > About GravitDesign Next, the Help menu).

## Recording

Record only when the look changed on purpose, then look at every image:

```sh
npx vite build --outDir dist-run-<name>
GD_CLIENT_ROOT=dist-run-<name> PORT=<port> node server/main.ts   # in the background
GD_RECORD_BRAND=1 GD_NEW_PORT=<port> GD_RUN=<name> npx playwright test parity/scenarios/brand --project parity --workers 2
GD_NEW_PORT=<port> GD_RUN=<name> npx playwright test parity/scenarios/brand --project parity --workers 2
```

`GD_RECORD=1` (the old-app recording) doesn't touch these files.
