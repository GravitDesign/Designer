# Deliberate changes

Changes the new app makes on purpose that are neither bug fixes
(BUGS-FIXED.md) nor removed features (REMOVED.md). None of them changes
what the parity scenarios compare: the harness runs the new app in its
classic look, which is the old app's look pixel for pixel.

## CHG-001 Two looks: GravitDesign Next and classic

Decided by the user, 2026-10-24.

The app is called GravitDesign Next and looks like it by default. The old
Gravit Designer look is kept as the classic look.

How the look is picked (src/app/brand/branding.ts; index.html's inline
script decides before the first paint by the same rules, and
branding.test.ts runs both):

1. `?branding=next` or `?branding=classic` in the address, which is also
   stored in localStorage "designer.branding" for later starts;
2. `window.__gdBranding`, set before the page's scripts run: by the
   parity harness (support/apps.ts) and, in the desktop app, by the
   preload when the main process has `GD_BRANDING=classic|next`; never
   stored;
3. the stored choice;
4. GravitDesign Next.

There is no switch in the UI. In the desktop app only `GD_BRANDING`
picks the classic look.

What the next look changes, all in new files plus small hooks:

- Stylesheets, loaded after the old theme stylesheet only in the next
  look (public/brand):
  - accent.light.css and accent.dark.css turn the old pink accent
    (#d72e63 and its shades: active tabs, primary buttons, sliders,
    checkboxes, links, list highlights) into the brand magenta #E3136B.
    They are generated from the old stylesheets
    (scripts/brand/gen-accent-css.ts) and restate the old rules with the
    colours mapped, plus the later rules that competed with them, so
    the result is the same as editing the old stylesheet in place
    (checked on the welcome screen and an editor window in both themes:
    no pixel differs).
  - next.css: the loading screen (the mark on ink instead of the pink
    gradient), the welcome screen's left panel (mark and wordmark on ink,
    a yellow marker on the active item), the wordmark and the
    introduction. Manrope (SIL OFL 1.1, public/brand/fonts) for the
    wordmark.
- Welcome screen: the mark and wordmark in the sidebar
  (welcome-screen.ts `brandHead`), and the version line
  "GravitDesign Next 2.0.0 Web" (the package version) instead of
  "Version i015.3 Web". Everything else works as before.
- Window title: "<document> - GravitDesign Next" (shell/designer.ts
  `_updateTitle`).
- Favicon and web manifest: index.html's script points the icon and
  manifest links at public/brand (name "GravitDesign Next", the dark
  avatar icons). The served index.html and /manifest.json stay the old
  ones, so platform/pwa compares as before.
- The introduction (src/app/brand/intro-dialog.ts): opens once on the
  first start, on top of the welcome screen (in the desktop app after the
  profile migration). It says plainly that this is a community rebuild
  and not the Gravit Designer people know, that it runs locally and
  offline without account, cloud or subscription, that files stay on the
  computer and open in both apps, what's gone (cloud sync, sharing and
  comments, cloud templates, Pro) and where to report problems.
  localStorage "designer.next-intro-shown" remembers that it was
  closed. Help > About GravitDesign Next (ShowIntroAction, added to the
  action table in shell/bootstrap.ts only in the next look) opens it
  again. Its strings are in src/app/brand/brand-strings.ts: the app's
  string table is the old bundle's byte for byte
  (scripts/extract-locales.test.ts), and the app has English strings
  only; other languages would fall back to English.
- Desktop app: electron-builder `productName` "GravitDesign Next" and
  the icons in build/ (icon.png 1024 px for macOS and Linux, icon.ico
  for Windows and the installer), rendered from the dark avatar
  (scripts/brand/render-icons.ts). The window icon is
  dist/brand/icons/icon-512.png; native error boxes say
  "GravitDesign Next" (the old name with `GD_BRANDING=classic`, as the
  electron scenarios record). The appId and the package name
  "gravit-designer-local" stay: Electron names the profile folder after
  the package name (electron-builder doesn't put `build.productName` into
  the packaged package.json), so settings, fonts and the migration
  marker stay where they are. The install folder, the executable and the
  installer file names change with productName.

Tests: src/app/brand/*.test.ts, src/app/welcome tests,
scripts/brand/*.test.ts, and the new-app-only scenarios in
parity/scenarios/brand (README there), which fail when the brand
stylesheets are left out.
