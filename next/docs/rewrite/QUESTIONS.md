# Open questions

Places where it was unclear whether the old behaviour is a bug or intended.
The new app keeps the old behaviour for every entry here.

Format: `## Q-NNN title`, then where it lives in the old code, what it does,
and why it is unclear.

## Q-001 Only English strings exist

Old code: locale tables in designer.browser.dev.js modules 814/815 (copies in
821/822) and chunk.vendor.js modules 885/941; translations for the other 14
languages come from gApi.fetchTranslationsURL (module 1037) and the server's
/i18n-url route returns {}. The language switch action (module 1620) is never
registered.

The old app lists 15 locales but only ever shows English, and no translated
strings exist anywhere in the repo. The new app keeps the 15-entry language
table, the same lookup by locale key and English as the only string table.
Locale screenshots in the parity suite therefore compare English in both apps,
with each of the 15 language codes set. If translation files turn up, they
can be dropped into `next/src/locale/` without code changes.

## Q-002 Language codes differ between client and server

routes/user.js numbers languages with 0 = de-DE, 1 = en; the client's
GLocaleLanguage uses 0 = English. Nothing reads the server's numbering, since
the language can't be changed. Kept as is in the server; the new app uses the
client table.

## Q-003 Shortcut conflicts and malformed shortcuts

- modify.clip and modify.createnestedcompound both use Cmd/Ctrl+Alt+M. The
  action registered later wins in the old app; the new app registers in the
  same order so the same one wins.
- view.change-active-page has PageUp/PageDown extra shortcuts written as a
  single key instead of an array of arrays, so they never fire. Kept unbound.
- New from Clipboard uses a real Ctrl on Mac where everything else uses Cmd.
  Kept.

## Q-004 "Show Grid" is a document property

Toggling the grid writes scene property `gm`, so it is undoable, saved with
the file and also switches grid snapping. Could be intended (grid mode as a
document setting). Kept.

## Q-005 Hidden but implemented actions

view.toggle-paint-layers-visibility (F / Shift+B), check for updates, the
language switcher and the Fill / PathsGraph / Connector tools exist in code
but are never registered, so users can't reach them. Kept unreachable.

## Q-006 Different JPEG qualities per export path

Per-element export uses quality 100, quick export passes none (browser
default 0.92), the export dialog defaults to 92 and the PDF writer uses 85.
The docs say quick export uses 100. Kept as in code.

## Q-007 Placing a PDF imports only page 1

Opening a PDF imports every page, placing one imports the first page only.
Kept.

## Q-008 AI, SVGZ and Sketch import are unreachable

The importers exist but are not in the file-type list the UI offers. Kept
unreachable from the file picker; the importers are still ported so drag and
drop and paste behave the same where the old code reached them.

## Q-009 Anchor coordinates are stored as float32

GUtil.packPoint stores anchor coordinates as base64 float32, so they lose
precision on every save. This is the file format, and files must open in the
old app, so it is kept.

## Q-010 Cloud-only features

Autosave, version history, templates and recent files only work with the
cloud backend, which doesn't exist. With the cloud code dropped, the old app
has no local autosave and no recent-files list that survives a reload. The
new app keeps that: no new autosave or recent-files persistence is invented.
The autosave worker is ported so the code path exists, but it is only
triggered where the old app triggered it.
