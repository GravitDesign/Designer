# Corpus

A fixed set of `.gvdesign` files written by the old app, one feature area
per file, for any scenario that needs real documents. The scenarios in
`parity/scenarios/corpus/` open every file and record what the old app does
with it (load, save again, embedded preview, canvas renders in both themes,
offscreen page bitmaps).

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
idle (see `parity/scenarios/corpus/contract.ts`).

## Contents

| File | Features | Inventory items |
| ---- | -------- | --------------- |

<!-- TABLE -->
