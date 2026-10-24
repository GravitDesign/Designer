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
  - editor.css: the rest of the editor in the same look (CHG-002).
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

## CHG-002 The editor in the GravitDesign Next look

Asked for by the user, 2026-10-24.

After CHG-001 the welcome screen, loading screen and introduction had the
new brand, while the editor itself still looked like Gravit Designer
with a magenta accent. The next look now restyles the whole editor so it
reads as one product with the welcome screen. Layout and behaviour are
the old ones: same DOM and classes, same part sizes (header 36 px,
toolbar 37 px, sidebars 250 and 300 px), same row heights and inspector
rows. Only colour, type, borders, radius, shadows and focus rings change.
The classic look is untouched (it never loads the stylesheet, and the one
code change is behind `isNextBranding()`).

Where it lives:

- public/brand/editor.css, linked by index.html's script after next.css,
  only in the next look. Every rule starts with
  `html[data-branding="next"]`. Colours are tokens (`--rd-*`) defined
  once for light and once for `[data-gd-theme="dark"]`.
- The page shadow on the canvas is painted, not styled: brand-theme.ts
  `pageShadowColor` gives the next look an ink-tinted shadow on the light
  canvas and a deeper one on the dark canvas (the classic shadow hardly
  shows there), and switches it with the theme. Blur and offset stay the
  classic ones, so a page's repaint area is unchanged. designer.ts uses it
  in the next look only.

What changed:

- Header: the mark at the left of the menu bar (in the menu section's own
  left padding; the header keeps its height, the captions move 30 px
  right), menu captions in Manrope at a calmer weight and muted ink, a
  rounded hover, a yellow marker under the open menu. Document tabs look
  like the welcome screen's items: no frame, a quiet hover, the active
  one on a light panel with a yellow marker at its left.
- Toolbar: one hover and one pressed colour for every button, rounded
  6 px; the active tool (and a toggle that is on, such as snapping) on a
  magenta tint with a magenta icon, its menu arrow included; short
  hairline group dividers instead of full-height lines.
- Sidebars and inspector: the sidebar tabs are an underline instead of a
  magenta block; section headers on a light panel colour with Manrope
  labels; softer row and section lines; the selected layer, the active
  page and the selected fill or border row on a magenta tint with a 3 px
  magenta marker. Fields, selects, buttons, checkboxes and switches share
  one frame colour that meets 3:1 against every panel colour; pressed
  segment buttons (alignment, Auto/Fix) take the tint. The X/Y/W/H
  prefixes are muted in both themes (the old dark theme had them in the
  accent).
- Menus, context menus, dropdown panels, the color chooser and tooltips:
  one surface (8 px radius, a hairline outline, an ink-tinted two-layer
  shadow), a neutral hover with a magenta marker in menus. Dialogs use
  the same surface with the welcome screen's 10 px radius and a deeper
  shadow over an ink scrim; the primary button is magenta, the others
  are quiet outlined buttons. The welcome screen keeps its own backdrop
  and frame; only its fields and checkbox take the new control frame.
- Focus: the old stylesheets removed every focus outline. Fields now show
  a 2 px magenta ring when focused and buttons, selects and checkboxes
  when focused from the keyboard. Selected text in a field is
  highlighted in yellow.
- Canvas: the window background, rulers and scrollbars in the ink-tinted
  greys; handles, guides and the selection are painted as before.

Palette roles:

| Role | Light | Dark | Used for |
| --- | --- | --- | --- |
| Magenta (accent) | #E3136B | #E3136B | fills: primary buttons, checked boxes, switches, sliders |
| Magenta as a mark | #E3136B | #F0478B | active tool icon, underlines, row markers, focus ring |
| Magenta tint | #FCE7F0 | #4D2338 | selected rows, the active tool, pressed segments |
| Yellow | #FFD81F | #FFD81F | small markers only: active document tab, open menu, text selection |
| Ink text / muted | #2B2A35 / #625F70 | #EBEAF0 / #AEABBB | text, labels |
| Panels | #FFFFFF, #F6F5F9 | #2A2933, #22212A | panels, section headers |
| Control frame | #8C889A | #7A778A | fields, selects, buttons, checkboxes |
| Canvas | #EEEDF2 | #3C3B45 | the window around pages |

Lime and olive stay in the mark and are not used in the editor. In the
dark theme magenta on its tint is only 2.8:1, which is why marks there
use the lighter #F0478B (3.7:1). Checked in scripts/brand/editor-css.test.ts:
text 4.5:1 or more on every panel, tint and field colour; control frames,
focus rings, icons and magenta marks 3:1 or more.

Type scale (no text got smaller):

| Size | Face | Where |
| --- | --- | --- |
| 10 px | Lato 600 | field prefixes, chooser palette tabs (Manrope 700) |
| 11 px | Manrope 700, uppercase | sidebar tabs |
| 11 px | Lato 600 | inspector labels and fields |
| 12 px | Manrope 600 | menu bar, document tabs (11 px before), simple tooltips |
| 12 px | Manrope 700 | section headers |
| 12 px | Lato 500 | menu items, rows, buttons, rich tooltips |
| 14 px | Lato 500 | dialog messages |

Manrope only has Latin glyphs here; other scripts (file and layer names)
fall back to Lato. Dense UI (fields, inspector labels, menu items) stays
in Lato, which is narrower, so labels keep fitting their fixed columns.

Tests: scripts/brand/editor-css.test.ts (scope, look-only properties,
the rules the restyle is made of, tokens for both themes, contrast),
src/app/brand/brand-theme.test.ts (page shadow), and the brand scenarios
(parity/scenarios/brand), which also fail with only editor.css blocked.
