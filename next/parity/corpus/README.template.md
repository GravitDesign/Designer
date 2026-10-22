# Corpus

A fixed set of `.gvdesign` files written by the old app, one feature area
per file, for any scenario that needs real documents. The scenarios in
`parity/scenarios/corpus/` open every file and record what the old app does
with it (load, save again, embedded preview, canvas renders in both themes,
offscreen page bitmaps), and `parity/scenarios/compat/` checks that saved
files open the same again (see "Files saved by the new app" below).

This file is generated from `documents.ts` by `build.ts`; edit the template
(`README.template.md`) or the document list, not `README.md`.

## Layout

- `files/*.gvdesign`: the corpus. Each file is exactly what File > Save to
  Local File as... (action `file.save-as.gvdesign`) downloads: one gzip
  stream of the serialized scene, with the JPEG preview spliced in as the
  first key `_preview`.
- `fixtures/sprite.png` (48x32, alpha) and `fixtures/photo.jpg` (64x40):
  the images embedded in the files.
- `documents.ts`: how each file is built, what it contains (`features`) and
  which INVENTORY.md items its outputs depend on (`covers`). The corpus
  scenarios add their own load/save/render items on top.
- `build.ts` and `builder-lib.js`: the builder.
- `edge/`: files with edge cases (plain JSON, no preview, cut-off JSON,
  unknown node type, pre-3.10, linked file, minimal), made from corpus files
  by `edge/build-edge.ts`; see `edge/README.md`.

## Scenarios

In `parity/scenarios/corpus/`:

- `load`, `images`, `render-light`, `render-dark`: per corpus file the
  loaded document (ids from the file must survive, `keepIdsOf`), the saved
  file (gzip header, preview size and the whole saved document), the
  preview, the page bitmaps, and the canvas in each theme: the top left of
  the canvas with the rulers at 25%, then the content at 25%, 33%, 100% and
  400% (at least 128 px around small content).
- `matrix`: the paint canvas API on its own: every primitive, pattern,
  CSS filter, blend mode (including the WebGL-only ones) and composite
  operator as a tile, plus extents, hit tests, bitmap operations and the
  enums. It also records the WebGL renderer string, so recordings made
  without SwiftShader fail.
- `view`: paint modes (Alt+Y outline view, fast view, clip content),
  wheel zoom steps and clamps, pan reuse and partial repaints compared with
  a full repaint, the per-zoom tile cache, low quality while panning,
  effects beyond 600%, effect cache invalidation, a 2x screen, and the
  whole window at 25% and 400% in both themes.
- `edge`: the files in `edge/`.

## Files saved by the new app open the same in the old app

`parity/scenarios/compat/compat.spec.ts` holds one `compat/<name>/roundtrip`
scenario per corpus file: open the file, save it with
`app.corpus.saveDocumentBytes()` (File > Download File, the bytes the real
save writes), close it, open those bytes with
`app.corpus.openDocumentBytes()` (File > Open Local File with the bytes as
the chosen file) and record the serialized scene, keeping the ids of the
corpus file. Recorded from the old app, that is the old app's own round
trip.

The same file defines a cross-app test for every roundtrip scenario listed
in `parity/ported/*.json` (`portedScenarioIds()`): the new app opens the
corpus file and saves it with its own `saveDocumentBytes`, then a fresh
old-app page opens the new app's bytes with `openDocumentBytes`, and the
old app's serialized scene must equal the same expected file. Until a
roundtrip id is ported the test is not defined. `GD_COMPAT_SAVER=old`
runs it for every file with the old app on the saving side, which checks
the cross-app path itself:

```sh
cd next
GD_RUN=compat GD_COMPAT_SAVER=old npx playwright test parity/scenarios/compat --project parity --workers 2
```

The new app implements both hooks (contract.ts) on top of its real save
and open code; they must not build or parse the bytes any other way.

## Rebuilding

The builder drives the old app (server on port 3190) with Playwright: for
each document it opens a fresh page, builds the content through the `G`
engine namespace and the editor (`insertElements`, actions such as
`modify.clip`, `modify.merge.union`, `edit.duplicate`, `modify.attachToPath`,
and real pointer input for the Paths Graph and annotation tools), waits until
everything is loaded and drawn, and saves through the app's own save action.

```sh
cd next
node parity/corpus/build.ts                         # every document
node parity/corpus/build.ts fills-gradients ...     # some documents
node parity/corpus/build.ts --readme                # only this README
node parity/corpus/build.ts text-runs --shot <dir>  # also write screenshots
```

Every build gives new random ids, so the committed files are the fixed
corpus. After rebuilding a file, record its scenarios again
(`GD_RECORD=1`).

Files that are not built here are listed under `EXTRA_FILES` in
`documents.ts`: `walkthrough-sample.gvdesign` is the file saved by the
phase-1 walkthrough (File > Download File of a rectangle and an ellipse).
There are no other `.gvdesign` files in the repository.

## Using a corpus file in another area

Open it the way the corpus scenarios do: run action `file.open`, answer the
file chooser with the file and wait for
`window.__parity.app.corpus.waitForDocument(<file name without extension>)`.
`app.corpus.settle()` waits until images, fonts and the tile renderer are
idle (see `parity/scenarios/corpus/contract.ts`). The helpers in
`parity/scenarios/corpus/lib.ts` (`openFile`, `downloadSave`,
`stableScreenshot`, ...) do this for you.

## Contents

| File | Features | Inventory items |
| ---- | -------- | --------------- |

<!-- TABLE -->
