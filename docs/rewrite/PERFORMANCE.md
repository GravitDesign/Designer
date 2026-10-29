# Performance

A benchmark of the real app, the baselines it measured, and where the time
goes. The first round's numbers are from a production build of commit
`0e937670` (the last commit before its fixes), on the machine below; the
second round's are from GitHub Actions (see "Second round: baseline").

## Running the benchmark

```sh
node scripts/bench/run.ts                          # every case, 5 runs each
node scripts/bench/run.ts --filter pan             # cases whose id contains "pan"
node scripts/bench/run.ts --filter cold-start,export-svg --runs 9
node scripts/bench/run.ts --ref HEAD               # build the committed sources, not the working tree
node scripts/bench/run.ts --no-build               # reuse the last build
node scripts/bench/run.ts --profile                # also one CPU-profiled run per case
node scripts/bench/run.ts --gpu                    # Chromium's own GPU settings instead of the parity flags
node scripts/bench/run.ts --group doc20k,fx-pages  # the cases of these groups
node scripts/bench/run.ts --list                   # the cases, their groups and run limits; runs nothing
```

The groups are `base` (the original cases), `doc20k`, `doc50k`,
`fx-pages` and `import-export`. `--filter` and `--group` combine.

### On GitHub Actions

The full suite takes over an hour and loads every core, so it can run on
a GitHub runner instead: the Benchmark workflow
(`.github/workflows/bench.yml`), started by hand. On ubuntu-latest every
case at 5 runs took 69 minutes in one job; with `split` the longest job
(doc50k) took 36 minutes and the five jobs 80 minutes together. The first
run in a job also builds the generated documents and files, which is
part of those times (a few minutes) but not of any measurement.

```sh
gh workflow run bench.yml --ref main                                  # every case, 5 runs
gh workflow run bench.yml --ref main -f filter=doc20k-flat -f runs=1
gh workflow run bench.yml --ref main -f refs="0e937670 44eaa5c5"      # before and after
gh workflow run bench.yml --ref main -f split=true                    # one job per group
gh workflow run bench.yml --ref main -f profile=true -f filter=fx-zoom
gh run download <run id>                                              # the results
```

Inputs: `filter` and `runs` as on the command line, `refs` (git refs,
built and measured one after the other in the same job, so before and
after come from the same runner; empty means the checked-out commit),
`profile`, and `split`. With `split` each group gets a job of its own
that still measures every ref, so a before/after comparison stays on one
runner while the groups run in parallel. The runner is ubuntu-latest:
the benchmark measures time, not pixels, and nothing in it needs
Windows. Its numbers are not comparable with the ones from the machine
below. Each job uploads `scripts/bench/results/` (the JSON, and the
profiles with `profile`) as the artifact `bench-results-<group>`.

What it does:

- Builds the client with `vite build` into a folder under the system temp
  directory, so `dist/` and lint never see it. With `--ref` the sources come
  from `git archive`, so a baseline can be built while `src/` is being
  edited.
- Serves the build with `server/main.ts` on port 3197 (`GD_CLIENT_ROOT`).
- Drives headless Chromium through Playwright with the parity flags
  (software canvas, SwiftShader, sRGB, 1600 x 1000, scale 1). Each case
  gets a fresh browser context, except that cases on the same large
  document share one while they run one after the other (each leaves
  the document and the view as it found them). Files are opened through File > Open Local
  File with the file input, as the parity corpus scenarios do, and the app
  is driven through `window.__parity` hooks and real mouse and keyboard
  input.
- Runs each case once to warm up, then `--runs` times, and reports the
  median. Slow cases have a run limit of their own (3 for the 50,000
  object documents and the large imports), which `--runs` can lower but
  not raise. A case that takes more than 40 minutes in all is stopped
  and reported as failed. The table goes to stdout; everything (all runs,
  CDP metrics, the cold-start request list, bundle composition) goes to
  `scripts/bench/results/<time>.json` and `latest.json`, and the results
  so far to `<time>.partial.json` after each case, in case a run is cut
  short. That folder is ignored by git.
- With `--profile` it records one more run with the CDP profiler (200 us
  sampling), saves the `.cpuprofile` next to the results and summarises
  top self and total time by function, mapped to the TypeScript sources
  through the build's sourcemaps. It also counts React commits and
  component renders through a minimal DevTools hook.

The code is in `scripts/bench/`: `run.ts` (entry, table, JSON), `cases.ts`
(the original cases), `cases-docs.ts` (large documents, many pages, the
effects page and their exports), `cases-import.ts` (large imports),
`drive.ts` (sessions, File > Open, measuring helpers), `in-page.ts`
(frame recorder, long-task observer, idle wait, render counter),
`synthetic.ts`, `synthetic-docs.ts` and `synthetic-files.ts` (generated
inputs), `profile.ts` (CPU profiles), `bundle.ts` (sizes and
composition), `lib.ts` (build, server, browser, statistics). It is a plain script, so neither the Playwright
projects nor vitest pick it up.

### The cases

| case | what it measures |
| --- | --- |
| cold-start | fresh context: navigation until the app is ready (`window.__parity` set) and until an empty document is painted (`docReadyMs`) |
| open-* | File > Open of the three largest corpus files (effects-webgl-2, fills-textures, effects-webgl-1, 65 to 79 KB) until the document is ready and painted |
| pan-wheel | heavy document: 90 wheel scrolls, one per 16 ms; frame times |
| zoom-wheel | heavy document: Ctrl + wheel, 20 steps in and 20 out |
| pan-api | heavy document: `view.scrollBy(15, 8)` once per frame for 120 frames |
| zoom-api | heavy document: `view.zoomAt` by 1.05 per frame, 30 in and 30 out |
| drag-group | heavy document: drag a selected group of 200 shapes with the pointer tool, 60 moves; `moveMedian` is the time until the page has handled one move |
| type-long-text | 40-paragraph text (2,400 words, 600 pt wide), inline editing, 30 keystrokes at the end; time from keydown to the next frame |
| export-svg/pdf/png | the heavy document's page (4000 x 3000) through `Exporter.exportExportable`, the export dialog's code path |
| import-svg-3000 | File > Open of a generated SVG with 3,000 elements |
| import-svg-welcome | File > Open of `assets/icon/welcome.svg` (256 KB, the largest SVG in the repo) |
| import-pdf-print | File > Open of `parity/expected/import-export/ui/print-pdf.pdf` (131 KB) |
| import-pdf-2pages | File > Open of `parity/fixtures/import/pdf/vector-2pages.pdf` (small; pdf.js start dominates) |
| import-eps-2000 | File > Open of a generated EPS with 2,000 filled and stroked curves |
| import-eps-gradient | File > Open of `parity/fixtures/import/eps/gradient.eps` (small; worker start dominates) |
| bundle | build size by file, gzip, and what the entry chunk is made of |

Large documents (groups `doc20k` and `doc50k`). `<doc>` is one of
doc20k-flat, doc50k-flat, doc20k-nested, doc20k-symbols and
doc50k-nested; which operations each document gets is in the second
table.

| case | what it measures |
| --- | --- |
| \<doc\>-open | File > Open of the saved document until painted |
| \<doc\>-zoom-api | `view.zoomAt` at the centre by 1.1 per frame, 10 in and 10 out |
| \<doc\>-pan-api | `view.scrollBy(15, 8)` once per frame for 60 frames |
| \<doc\>-pan-wheel | 60 wheel scrolls over the canvas, one per 16 ms |
| \<doc\>-select-all | Edit > Select All until painted (`ms`; `actionMs` is the action alone) |
| \<doc\>-nudge | select the topmost objects holding 200 shapes, then 2 arrow-key nudges; `nudgeMedian` is keydown until painted |
| \<doc\>-drag | the same selection dragged by one of its shapes with the pointer tool, 10 moves; `moveMedian` as in drag-group, `upToPaintedMs` from release until painted |
| \<doc\>-undo | the same selection nudged once, then Edit > Undo until painted |
| \<doc\>-redo | the same selection nudged once and undone, then Edit > Redo until painted |
| \<doc\>-layers-scroll | the layers list scrolled from top to bottom with 60 wheel events, one per 16 ms; frame times |

The move cases (nudge, drag, undo, redo) move 200 shapes, not
everything: 200 shapes or instances, or in the nested documents the
topmost group of 1,000. Every moved object makes the page re-measure all
its children (see the findings), so one nudge of all 20,000 shapes takes
longer than the case's time limit of 40 minutes. They run without a
warm-up, 3 times on the 20,000-object documents and once on 50,000.

| document | objects | operations |
| --- | --- | --- |
| doc20k-flat | 20,000 shapes on the page | all |
| doc50k-flat | 50,000 shapes on the page | all, 3 runs (moves 1) |
| doc20k-nested | 20,000 shapes in 20 groups of 10 groups of 10 groups of 10 | all but layers-scroll (the list shows 20 collapsed groups) |
| doc20k-symbols | 5 masters of 2 shapes, 1,999 instances (every tenth object), 17,996 shapes | all |
| doc50k-nested | 50,000 shapes, 50 groups of 10 x 10 x 10 | open, select-all; 3 runs |

The symbol documents are not all instances, and there is no 50,000
version: putting an instance into a scene walks the whole scene
(`Scene.link` → `_refreshLinks` → `nodesBySceneId`, see the findings),
so building a document of 2,000 instances took 35 s on the runner and
20,000 would take hours; opening one costs about 17 ms per instance, so
20,000 instances would take some 6 minutes per open.

Many pages, effects and exports (groups `fx-pages` and `import-export`):

| case | what it measures |
| --- | --- |
| pages-open | File > Open of 60 pages of 1200 x 900 with 250 shapes each (15,000 shapes) until painted |
| pages-multipage | the same document: switch to multi-page view (the action behind F6) until painted |
| pages-zoom-api, pages-pan-api | the same in multi-page view: zoom by 1.1 per frame, 10 in and 10 out; scrollBy for 60 frames |
| fx-zoom-api, fx-pan-api | the effects page: as zoom-api and pan-api on the heavy document |
| fx-zoom-min | the effects page: from fitted, zoom to 6% at once; ms until painted. 6% is the editor's minimum zoom, so 1% can't be reached |
| fx-zoom-max | the effects page: from fitted, zoom to 6,400% on one object at once; ms until painted |
| fx-zoom-step-min, fx-zoom-step-max | the same in steps of 0.8 and 1.25 per frame; frame times, and `ms` until painted |
| export-doc20k-flat-svg/pdf/png | the 20,000-shape page (10,328 x 7,746) through `Exporter.exportExportable`; 3 runs |
| export-fx-svg/pdf/png | the effects page through `Exporter.exportExportable` |

Large imports (group `import-export`, 3 runs each): File > Open until
painted, with the number of nodes. A bitmap's document ends in the
Loaded status, not Ready (it gets its scene, and with it Ready, before
the importer reports Loaded), so the open counts as done at Loaded with
a scene.

| case | file |
| --- | --- |
| import-svg-20000 | SVG, 20,000 elements: paths, rects, circles, ellipses, texts (3 in 10), embedded PNG images (1 in 40), linear and radial gradients; 3.7 MB |
| import-pdf-20pages | PDF, 20 pages, each with 600 curves, 150 text runs (Helvetica, Times), 4 images and 4 axial and radial shadings; 0.8 MB |
| import-eps-4000 | EPS, 4,000 objects: curves, texts (1 in 10), 16 x 16 images (their data as a procedure; the interpreter has no ASCIIHexDecode, and an unknown filter ends the import) and shadings (1 in 100 each) |
| import-sketch-4000 | Sketch 49, 4 artboards of 50 groups of 20 layers: shapes with colour and gradient fills, borders and shadows, texts (1 in 6), bitmaps (1 in 20); 7.3 MB. File > Open refuses .sketch (as the old app did), so this case runs the Sketch importer through the parity hook `app.sketchImport` until it calls back (`ms`; nothing is inserted or painted) |
| import-png-6000x4000, import-jpeg-6000x4000 | a 6000 x 4000 bitmap drawn in the browser and encoded by `canvas.toBlob` |

Not covered: .ai, which File > Open refuses like .sketch (an .ai saved
as PDF would go through the PDF importer anyway); PostScript (.ps), which
can't be opened, only .eps; and HEIC, since making a HEIC file needs an
encoder the repo doesn't have.

The heavy document is built in the page: 3,000 rectangles, ellipses, stars
and paths with fills, every tenth with a drop shadow, on a 4000 x 3000
page. The corpus has no large files (the biggest is 79 KB) and the import
fixtures are all under 30 KB, so the heavy SVG and EPS are generated too.
All generated content is seeded and the same on every run.

The large documents have the heavy document's density (a 20,000-shape
page is 10,328 x 7,746, a 50,000-shape page 16,330 x 12,247):
rectangles, ellipses, stars and paths with random fills, a border on
every third and a drop shadow on every fiftieth. In the nested documents
each group's shapes lie together in one tile of its parent's area. The
symbol document has five masters of two shapes (an ellipse and a star)
along the top, and every tenth object is a copy of one of them. The pages document has 60 pages; every
25th shape has a shadow. The effects page is a 24 x 18 grid of objects
that cycle through eight styles: linear, radial and angular gradients,
image textures (four generated 64 x 64 PNGs), up to three fills and two
borders per shape with layer opacity and blend modes, element blend
modes (multiply, screen) and opacity, drop and inner shadows, canvas
blur, WebGL blur on one object in sixteen, and clipping masks.

The documents are built in the page through `window.__parity` and the
`G` namespace (`scripts/bench/synthetic-docs.ts`), each on a page that
is filled before it joins the scene, then saved with File > Save As
(`corpus.saveDocumentBytes`, the app's own save). The cases open the
saved file through File > Open, so they measure what a user's open
costs, not the build. The effects page is inserted straight into a new
document from serialized nodes. The import files are written in Node
(`synthetic-files.ts`: SVG and EPS as text, PDF with a minimal writer,
Sketch as a store-only zip with archived strings in binary property
lists). Everything generated is kept in `gd-bench/inputs` under the
system temp folder; the file names carry a hash of the generator, so a
changed generator makes new files. The first run on a machine builds
them, which takes a few minutes and is not measured.

## Machine

AMD Ryzen 7 5700G (8 cores, 16 threads, 3.8 GHz), 64 GB RAM, Windows 11
Pro (10.0.26200), Node 22.23.2, Chromium 156.0.8078.4 headless with the
parity flags (software canvas).

Other test runs were using the CPU while the baseline ran, so the spread
between runs is wide (see min and max). Cold start measured 805 ms median
(775 to 910) in a quieter moment and 1,127 ms in the full run below.
Compare runs made on the same machine under the same load, and prefer
more runs (`--runs 9`) for small differences.

## Baseline

Commit `0e937670`, 5 runs plus one warm-up, median. Times in ms. Frame
times are quantised to the 16.7 ms frame of headless Chromium. "script ms",
"layouts" and "styles" are the CDP Performance deltas (ScriptDuration,
LayoutCount, RecalcStyleCount) over the measured part.

| case | headline | median | min | max | frame p95 | long tasks (ms) | script ms | layouts | heap MB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| cold-start | docReadyMs | 1,127 | 826 | 1,513 | | | 254 | 38 | 18 |
| open-effects-webgl-2 | painted | 625 | 610 | 687 | | | 464 | 49 | 25 |
| open-fills-textures | painted | 262 | 229 | 271 | | | 75 | 49 | 25 |
| open-effects-webgl-1 | painted | 367 | 306 | 412 | | | 172 | 50 | 27 |
| pan-wheel | frameP95 | 16.7 | 16.7 | 16.7 | 16.7 | 0 | 575 | 90 | 95 |
| zoom-wheel | frameP95 | 50.0 | 50.0 | 54.2 | 50.0 | 7 (536) | 713 | 39 | 46 |
| pan-api | frameP95 | 35.0 | 35.0 | 50.0 | 35.0 | 3 (241) | 1,321 | 120 | 51 |
| zoom-api | frameP95 | 235 | 185 | 235 | 235 (median 117) | 49 (6,462) | 5,954 | 60 | 43 |
| drag-group | moveMedian | 36.2 | 34.0 | 50.7 | 24.2 | 1 (73) | 1,337 | 65 | 66 |
| type-long-text | keyP95 | 374 | 264 | 417 | | 60 (9,225) | 8,984 | 170 | 63 |
| export-svg | ms | 94 | 80 | 108 | | | | | 68 |
| export-pdf | ms | 1,588 | 1,185 | 1,879 | | | 1,207 | | 51 |
| export-png | ms | 431 | 335 | 527 | | | | | 43 |
| import-svg-3000 | painted | 4,255 | 2,868 | 4,685 | | | 3,916 | 37 | 118 |
| import-svg-welcome | painted | 309 | 263 | 376 | | | 155 | 41 | 41 |
| import-pdf-print | painted | 699 | 694 | 831 | | | 128 | 47 | 24 |
| import-pdf-2pages | painted | 618 | 503 | 668 | | | 72 | 44 | 26 |
| import-eps-2000 | painted | 19,861 | 11,612 | 32,507 | | | 19,615 | 153 | 90 |
| import-eps-gradient | painted | 145 | 130 | 161 | | | 34 | 43 | 21 |

More numbers from the same run:

- Cold start: first contentful paint 155 ms, app ready 1,021 ms, empty
  document painted 1,127 ms; 49 requests, 11.4 MB transferred.
- Typing: 318 ms median per keystroke.
- Drag: 58 ms p95 per mouse move.
- Exports: SVG 816 KB, PDF 669 KB, PNG 3.1 MB.
- Imports: the 3,000-element SVG gives 3,062 nodes, the EPS 4,002 nodes.

Bundle (the whole build without sourcemaps): 13.4 MB, 4.1 MB gzip.

| file | KB | gzip KB |
| --- | ---: | ---: |
| bundle/index-*.js (the entry chunk) | 4,727 | 1,250 |
| designer.browser.light.css | 2,290 | 886 |
| designer.browser.dark.css | 2,287 | 886 |
| bundle/pdf.worker-*.js | 1,600 | 302 |
| bundle/heic2any-*.js | 1,178 | 296 |
| bundle/harfbuzz-2.2.0-*.wasm | 494 | 179 |
| brand/accent.light.css, accent.dark.css | 189, 193 | 51, 51 |
| bundle/ps.worker-*.js | 138 | 33 |
| bundle/pdf-export.worker-*.js | 103 | 35 |

The entry chunk by source (sourcemap attribution): about 1 MB is not
mapped to a source, mostly JSON tables (the locale table alone is 327 KB);
then `src/engine/scene` 369 KB, `src/engine/text` 319 KB,
`src/app/inspector` 292 KB, react-dom 203 KB, `src/editor/element-editors`
199 KB, `src/io/export` 182 KB, `src/engine/style` 170 KB, `src/io/import`
142 KB, `src/parity` 27 KB. Only heic2any is loaded on demand.

Cold start loads the entry chunk, the theme stylesheet (twice, see
finding 7), the CMYK profile `USWebCoatedSWOP.icc` (544 KB), the HarfBuzz
wasm, OpenSans (212 KB), three Lato fonts, and about 30 icons and images.

## Where the time goes

Ranked by how much a user notices it. File and line numbers are at commit
`0e937670`; the profiles are in the `profiles-*` folder next to the
results. "Risk" is the risk to parity output: rendered pixels, saved
bytes and exported bytes. None of these changes should alter any of them,
and the parity suite is the check.

1. **EPS import is quadratic in the number of shapes.** 2,000 curves take
   12 to 33 s, 97% of it on the main thread rebuilding bounding boxes.
   The worker returns quickly; the time is spent in
   `src/app/document/open-import.ts:210`, which moves every child into the
   live page one by one, and `:219`, which then transforms every child
   one by one. Each insert and each transform makes the page recompute
   its paint box over all children
   (`src/engine/scene/element-accelerated.ts:86` →
   `src/engine/scene/page.ts:483` →
   `src/engine/scene/element.ts:220` `_calculateChildrenPaintBBox`, 10.9 s
   in the profile; `element.ts:193` `getChildrenGeometryBBox`, 6.3 s). On
   top of that `page.ts:266` `_getAnnotations` caches the annotations list
   only when there is one: with none it walks all children backwards on
   every call (`page.ts:271` `_findAnnotations`, 5.3 s;
   `page.ts:134` `isAnnotationsList`, 2.5 s self).
   Fix: cache "no annotations list" (and clear it when a child is
   inserted or removed), and translate the children before they go into
   the page, or block geometry updates around the loop the way the code
   already blocks child changes. Win: from tens of seconds to well under
   a second for this file; any large import into a page gains. Risk: low.
   The values come out the same; only the number of recomputations
   changes. The annotations cache must be cleared on every child change,
   or a page with a new annotations list would paint without it.

2. **Typing in a long text: about 320 ms per keystroke.** 40% of it is
   the text inspector, not the text. Each keystroke fires several
   selection-changed events (`src/engine/text/gtl/document.ts:688`), and
   each runs `_updateProperties`
   (`src/app/inspector/text-properties.ts:1280`). That calls
   `_hasMultipleLanguages` and `_hasMultipleStylisticSets`
   (`text-properties.ts:2028`, `:2032`), and both run
   `getDocumentRange().getFormatting()` over the whole text
   (`text-properties.ts:2036`), which merges the formatting of every run
   (`src/engine/text/gtl/formatting.ts:170` `merge`, 2.1 s self;
   `src/engine/text/gtl/list-util.ts:150`, 1.2 s self). In the profile
   `_updateProperties` is 3.9 s of 9.9 s. The other half is the repaint
   of the whole text node every keystroke (`_repaint` 4.4 s, with
   `src/engine/text/gtl/inline.ts:137` `draw` 2.4 s).
   Fix: update the inspector once per frame instead of once per event,
   compute the whole-text formatting once per update (both checks read
   the same result), and skip it when the selects aren't shown. Win:
   about 40% per keystroke. Risk: none for documents; the inspector shows
   the same values a frame later.

3. **Zoom renders every styled shape through new canvases.** zoom-api
   frames take 117 ms median and 235 ms p95 on the heavy document. Per
   frame, each shape with a style layer or effect gets a new canvas from
   `src/engine/style/element-stylable.ts:744` `_createStyleCanvas` →
   `src/engine/paint/paint-canvas.ts:700` →
   `src/engine/paint/render-scheduler.ts:206` (`document.createElement`
   and `getContext`), and the effect cache clones canvases
   (`element-stylable.ts:506` → `paint-canvas.ts:1404` `clone`). Zooming
   also throws the effect caches away (`element-stylable.ts:561` →
   `src/engine/scene/scene.ts:2227`). In the profile `getContext` (606
   ms), `save` (593 ms), the first state write that creates the canvas
   backing (`set textBaseline`, 326 ms), `clearRect` (296 ms) and garbage
   collection (439 ms) are about 30% of the 8.6 s.
   Fix: a canvas pool by size for style and effect canvases. Win: 20 to
   30% per zoom frame, and similar for any full re-render of styled
   content (opening effect-heavy files, see open-effects-webgl-2). Risk:
   medium. A reused canvas must start fully reset (size, transform,
   state stack, filter, composite mode, pixels); anything left over
   changes pixels. The parity render scenarios would show it.

4. **The action overlay walks the whole visible tree on every repaint.**
   `src/editor/guides/action-guide.ts:68` collects actionable nodes by
   visiting every visible node and calling `hasMixin`
   (`src/engine/core/object.ts:289`) on each. That is 187 ms self in the
   pan-api profile (9%) and 105 ms in the drag profile, plus the quadtree
   queries it makes (`src/engine/geometry/quadtree.ts:162`). Fix: keep the
   list of actionable nodes per page and rebuild it on structure changes.
   Win: about 10% of each pan and drag frame on large documents. Risk:
   none for document pixels; the overlay draws the same actions.

5. **Snapping while dragging scans strips across the whole page on every
   move.** Moving 200 shapes costs about 36 ms per mouse move.
   `src/editor/guides/bbox-guide.ts:814` `_applySnappingToPivots` (496 ms
   of 1,672 ms total) queries the page's quadtree for full-height and
   full-width strips through each pivot, and
   `bbox-guide.ts:785` `_getAllChildrenInBBox` recurses with
   `Array.concat`. It runs through `src/editor/guides/guides.ts:387`
   `mapRect` (504 ms). Fix: collect the snap candidates once at drag
   start (only the dragged selection moves), sorted by x and y, and look
   them up by range per move. Win: about 30% of the drag cost. Risk:
   low to medium. The snap result must be the same, including ties and
   order; the parity snap scenarios cover it.

6. **Cold start paints gradient swatches nobody has asked for.**
   `src/app/color/color-chooser.ts:2913` creates both pattern choosers as
   soon as the designer exists (`createPatternChoosers`, `:2878`).
   `initPatternType` (`:2743`) renders swatch images, including an
   angular gradient through `src/engine/style/angular-gradient.ts:67`
   `asCSSBackground` (a canvas paint and `toDataURL`). That is 314 ms of
   the 1,358 ms profiled for cold start (23%); without the profiler the
   app's whole boot script is about 250 ms, so expect 50 to 100 ms. Fix:
   create the choosers on first use, or render the swatches lazily. Risk:
   none for documents. The swatches are UI; check the chooser still looks
   the same in the UI scenarios.

7. **The theme stylesheet is downloaded twice at start.**
   `src/app/themes/theme.ts:100` fetches the theme's CSS (2.3 MB) only to
   know when it has loaded, while the `<link>` load event already tells
   it (`theme.ts:80`). Both requests get a full 200 response of 2.3 MB
   (the server sends `max-age=0`, and the fetch doesn't reuse the
   stylesheet's response). Fix: drop the fetch, or skip
   it when the link's href didn't change and its sheet is loaded. Win:
   2.3 MB of the 11.4 MB per cold start and a 2.3 MB string decode. Risk:
   none.

8. **Nothing is compressed.** `server/app.ts:41` serves the build with
   `express.static` and no compression, so a cold start moves 11.4 MB
   where gzip would move about 4 MB. This matters for the browser server,
   not for local Electron use. Fix: serve precompressed `.gz`/`.br` files
   made at build time (no new runtime dependency). Risk: none.

9. **The theme stylesheet is 2.3 MB with 5,285 rules**, half of it
   (1.1 MB) data URIs. The first layout after boot
   (`src/app/shell/designer.ts:1904` `relayout` →
   `src/app/shell/dom.ts:46` `getComputedStyle`) pays a style recalc over
   all of it: 169 ms in the cold-start profile. Fix: move the data URIs
   to files and drop rules for removed features. Win: a smaller first
   recalc and 1 MB less CSS. Risk: medium for UI screenshots (the old
   app's look is compared pixel for pixel); none for documents.

10. **PDF export copies every node.** `src/io/export/pdf/pdf-export.ts:139`
    `proxy` copies all own properties of each node with `extend`
    (`src/engine/core/util.ts:27`, 176 ms self of 1,154 ms profiled), and
    drop shadows are rasterised on the main thread
    (`src/io/export/pdf/effects/drop-shadow.ts:103`, 532 ms). Fix: a
    proxy that inherits from the node (`Object.create(node)`) instead of
    copying it; shadow rasterising could move to the PDF export worker.
    Win: 15 to 20% of PDF export, more with the worker. Risk: medium. The
    proxy must see the same values; exported bytes are compared by the
    PDF scenarios.

11. **Large SVG import: the per-node cost is in the engine.** 3,000
    elements take 2.9 to 4.7 s. A closer look found the imported tree is
    already built detached, and events cost 73 ms in all. The time goes to
    text layout in SvgTextElementBase.ready (270 ms, 45 ms of it a new
    canvas per TLCore), Block._updateElementVisibility and the quadtree
    insert on every append (150 ms) and property handlers. A speed-up has
    to come from the engine (a shared measuring context in TLCore, a lazy
    quadtree, no second ChildGeometryUpdate on insert), not from the
    importer. Not done: each needs every reader of that state checked.

12. **One 4.7 MB entry chunk.** Only heic2any is split off. Importers and
    exporters (`src/io`, 341 KB), the parity bridge with its eager globs
    (`src/parity/bridge.ts:54` and `:58`, 27 KB, also installed in
    production) and the inspector panels all load at start. Splitting
    `src/io` behind `import()` saves about 7% of the chunk. V8 parses
    lazily, so the measurable win at start is small (a few tens of ms at
    most). Risk: low for output, but some modules register classes as a
    side effect of being imported (`Node._nameToNodeClassMap`, the
    exporter registry), so the load order must not change what is
    registered when.

13. **The CMYK profile loads at every start** (`src/app/shell/designer.ts:1753`,
    544 KB). Loading it later saves the transfer, but CMYK colours
    painted before it arrives would render differently. Risk: high; leave
    it unless the profile is awaited wherever CMYK is converted.

What is fine:

- Wheel panning holds 60 fps on the heavy document (16.7 ms every frame):
  the view moves the existing tiles and repaints only the strip that came
  into view.
- React is not a cost. The render counter saw 6 commits during cold start
  and none during any of the other cases: the canvas, inspector and
  panels update outside React.
- Layout and style work is small everywhere except typing (170 layouts
  and style recalcs for 30 keystrokes, from the inspector updates of
  finding 2).
- SVG and PNG export of the heavy page take 80 to 110 ms and 340 to
  530 ms.

Candidates for a worker: the scene building after EPS and PDF import (the
parsers already run in workers, but the node tree is built on the main
thread; fix finding 1 first), shadow rasterising in PDF export, and SVG
parsing. Each needs the result to be passed back as data the main thread
can turn into the same nodes.

A note on the benchmark itself: the idle wait polled the parity hook
`corpus.assetsReady`, which walks the scene, on every frame. On the heavy
document it showed up in the profiles as `src/parity/app/corpus.ts:54`
(about 30 ms per case), only while waiting for the view to settle, not
inside the measured frames. On 50,000 objects one walk takes longer than
a frame, so the idle wait now asks it once, when the view and the fonts
have been quiet for three frames (and again three frames later while an
image is still loading). Images and textures only turn ready while the
wait runs, never back, so the result is the same; the "painted" times of
the original cases lose two walks of the scene, around a millisecond on
the 3,000-shape document.

## After the speed-ups

Measured on 2026-10-26 on the same machine, quiet apart from the
benchmark: `--ref 0e937670` (the baseline commit) and `--ref 44eaa5c5`
(the last speed-up), one right after the other, 5 runs plus a warm-up,
median. Everything between the two commits is in the second column: the
bug fixes of the same day (none aimed at speed) and the ten `perf:`
commits below. The baseline numbers here are lower than in the table
above, which was measured while other test runs loaded the machine.

| case | headline | before | after | script ms before | script ms after |
| --- | --- | ---: | ---: | ---: | ---: |
| cold-start | docReadyMs | 1,044 | 828 | 173 | 235 |
| open-effects-webgl-2 | painted | 702 | 654 | 499 | 464 |
| open-fills-textures | painted | 228 | 262 | 69 | 75 |
| open-effects-webgl-1 | painted | 324 | 278 | 150 | 121 |
| pan-wheel | frameP95 | 16.7 | 16.7 | 533 | 483 |
| zoom-wheel | frameP95 | 75.0 | 66.7 | 1,092 | 850 |
| pan-api | frameP95 | 33.3 | 33.3 | 1,115 | 833 |
| zoom-api | frameP95 | 285 | 267 | 8,332 | 7,677 |
| drag-group | moveMedian | 35.9 | 18.3 | 1,245 | 650 |
| type-long-text | keyP95 | 316 | 266 | 7,848 | 6,212 |
| export-svg | ms | 99 | 99 | | |
| export-pdf | ms | 1,010 | 855 | 731 | 624 |
| export-png | ms | 288 | 275 | | |
| import-svg-3000 | painted | 2,971 | 3,081 | 2,768 | 2,867 |
| import-svg-welcome | painted | 215 | 222 | 107 | 110 |
| import-pdf-print | painted | 466 | 424 | 59 | 55 |
| import-pdf-2pages | painted | 427 | 398 | 48 | 41 |
| import-eps-2000 | painted | 18,414 | 1,772 | 18,157 | 1,582 |
| import-eps-gradient | painted | 130 | 148 | 34 | 36 |

Cold start transfers 2.9 MB instead of 11.4 MB (48 requests instead of
49); the decoded size went from 11.4 MB to 9.1 MB, the theme stylesheet no
longer being downloaded twice. Changes of less than about 15% in the cases
the speed-ups don't touch (open, svg import, png export) are within the
run-to-run spread: repeated runs of the same build vary by that much.

Per speed-up. Each row compares the commit before with the commit itself,
measured with `--ref` one after the other. Where the machine was not
quiet enough to tell commits apart, the row says so and gives the
agent's profile numbers instead.

| commit | what | case | before | after |
| --- | --- | --- | ---: | ---: |
| 6ae981ee | EPS open: the page is not re-measured per shape | import-eps-2000 painted | 25,027 | 4,548 |
| f4a2f09b | SVG open with a group result: the same batching | import-svg-3000 painted | 3,034 | 3,368 (spread; the file has 60 top-level groups, so no change is expected) |
| 43eda078 | EPS parse: the drawing is measured once | import-eps-2000 painted | 4,548 | 2,123 |
| f7f89105 | typing: one formatting merge per inspector update | type-long-text keyP95 (9 runs) | 258 | 224 |
| | | type-long-text script ms | 5,748 | 4,656 |
| cfca07bd | action overlay: class checks per prototype | pan-api profile, walk time | 437 ms (12%) | 230 to 250 ms (9%) |
| b6901501 | action overlay skipped while no element has actions | pan-api | not separable (machine loaded) | |
| d81f0fcb | snapping: no rescans of found shapes | drag-group, _applySnappingToPivots in the profile | 454 to 496 ms | 250 to 266 ms |
| | the three guide commits together, quiet runs | drag-group moveMedian, script ms | 35.9, 1,245 | 18.3, 650 (full runs above) |
| 18606c39 | start without colour chooser previews | cold-start docReadyMs (15 runs) | 891 | 892 (no change measurable; script 256 to 222 ms in the agent's runs) |
| f5095a7f | theme stylesheet downloaded once | cold-start docReadyMs (15 runs) | 892 | 735; transfer 3,488 to 2,916 KB |
| 44eaa5c5 | compressed static files | cold-start transfer | 9,126 KB | 2,917 KB |

The benchmark serves every `--ref` build with the working tree's server,
so the per-commit cold-start runs above already had compression; the
compression row is the decoded size against the transferred size.
Loopback hides its time win; on a real network it is the 6 MB less to
download.

Left as found (see the findings above): canvas creation on zoom
(finding 3, medium risk to pixels), PDF export copies and shadow
rasterising (finding 10), the theme CSS size (finding 9), the entry chunk
split (finding 12), the CMYK profile (finding 13), and in typing the
whole-text repaint (TLCore.render redraws the whole text per keystroke;
a partial redraw risks pixel differences) and Text.getProperty merging the
paragraph formatting per read (about 1 s of a 12 s typing profile; it
needs a document-level formatting cache with every writer listed). In
EPS import 344 ms remain in _refreshIndicesForward
(src/engine/scene/element-accelerated.ts), renumbering siblings each time
open-import removes the parser group's first child.

## Second round: baseline

The second round goes after what heavy documents do: tens of thousands
of objects, effect-heavy pages, many pages, large imports and exports.
Its baseline is commit `bf570f0e` (the benchmark of the second round,
no app changes since `be745b96`), measured on GitHub Actions on
2026-10-29: Benchmark run 40826836634, `split`, 5 runs plus a warm-up
(fewer where a case sets its own limit, e.g. 1 for the 50k moves),
median, times in ms.

The runner: ubuntu-latest, AMD EPYC 7763 (4 logical cores), 16 GB RAM,
Node 22.23.4, Chromium 156.0.8078.4 headless with the parity flags.
These numbers are not comparable with the Ryzen numbers above, and two
jobs on different runners can differ by up to 2x; every before/after
pair in this round comes from one job that measures both commits.
"frame p95" is given for the move cases, whose headline is the input
round trip; "script ms" is the CDP ScriptDuration over the measured part.

| case | headline | median | min | max | frame p95 | script ms | heap MB |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cold-start | docReadyMs | 508 | 501 | 695 |  | 152 | 18 |
| open-effects-webgl-2 | painted | 925 | 796 | 980 |  | 803 | 24 |
| open-fills-textures | painted | 187 | 168 | 194 |  | 71 | 26 |
| open-effects-webgl-1 | painted | 262 | 243 | 285 |  | 138 | 24 |
| pan-wheel | frameP95 | 16.7 | 16.7 | 16.7 |  | 258 | 51 |
| zoom-wheel | frameP95 | 33.3 | 33.3 | 33.3 |  | 405 | 43 |
| pan-api | frameP95 | 33.3 | 33.3 | 35.0 |  | 470 | 50 |
| zoom-api | frameP95 | 135 | 133 | 152 |  | 3,198 | 40 |
| drag-group | moveMedian | 17.3 | 17.2 | 17.4 | 16.7 | 452 | 63 |
| type-long-text | keyP95 | 158 | 121 | 173 |  | 3,104 | 129 |
| export-svg | ms | 47.7 | 45.7 | 53.7 |  | 0 | 126 |
| export-pdf | ms | 516 | 501 | 589 |  | 381 | 66 |
| export-png | ms | 189 | 182 | 218 |  | 0 | 40 |
| import-svg-3000 | painted | 1,518 | 1,368 | 1,620 |  | 1,393 | 129 |
| import-svg-welcome | painted | 131 | 111 | 145 |  | 70 | 33 |
| import-pdf-print | painted | 336 | 335 | 368 |  | 53 | 24 |
| import-pdf-2pages | painted | 318 | 303 | 347 |  | 36 | 31 |
| import-eps-2000 | painted | 1,078 | 1,033 | 1,114 |  | 932 | 104 |
| import-eps-gradient | painted | 114 | 106 | 134 |  | 34 | 21 |
| doc20k-flat-open | painted | 11,877 | 11,372 | 12,761 |  | 10,650 | 192 |
| doc20k-flat-zoom-api | frameP95 | 617 | 583 | 720 |  | 8,191 | 174 |
| doc20k-flat-pan-api | frameP95 | 50.0 | 50.0 | 50.0 |  | 397 | 202 |
| doc20k-flat-pan-wheel | frameP95 | 16.7 | 16.7 | 16.7 |  | 295 | 226 |
| doc20k-flat-select-all | ms | 7,528 | 7,332 | 7,748 |  | 351 | 281 |
| doc20k-flat-nudge | nudgeMedian | 5,807 | 5,807 | 5,903 |  | 11,338 | 522 |
| doc20k-flat-drag | moveMedian | 114 | 112 | 118 | 280 | 6,655 | 443 |
| doc20k-flat-undo | ms | 6,199 | 5,716 | 6,267 |  | 254 | 462 |
| doc20k-flat-redo | ms | 6,243 | 6,172 | 6,259 |  | 253 | 351 |
| doc20k-flat-layers-scroll | frameP95 | 33.3 | 33.3 | 33.3 |  | 332 | 185 |
| doc20k-nested-open | painted | 40,548 | 40,526 | 40,807 |  | 8,246 | 249 |
| doc20k-nested-zoom-api | frameP95 | 563 | 517 | 637 |  | 7,248 | 161 |
| doc20k-nested-pan-api | frameP95 | 66.7 | 66.7 | 85.8 |  | 608 | 177 |
| doc20k-nested-pan-wheel | frameP95 | 16.7 | 16.7 | 16.7 |  | 289 | 157 |
| doc20k-nested-select-all | ms | 811 | 803 | 849 |  | 52 | 180 |
| doc20k-nested-nudge | nudgeMedian | 457 | 357 | 542 |  | 742 | 202 |
| doc20k-nested-drag | moveMedian | 80.8 | 67.7 | 86.9 | 84.2 | 824 | 230 |
| doc20k-nested-undo | ms | 200 | 195 | 211 |  | 35 | 248 |
| doc20k-nested-redo | ms | 214 | 213 | 214 |  | 35 | 265 |
| doc20k-symbols-open | painted | 41,272 | 40,944 | 41,516 |  | 11,947 | 367 |
| doc20k-symbols-zoom-api | frameP95 | 602 | 500 | 650 |  | 7,353 | 182 |
| doc20k-symbols-pan-api | frameP95 | 83.3 | 66.7 | 84.2 |  | 571 | 191 |
| doc20k-symbols-pan-wheel | frameP95 | 16.7 | 16.7 | 16.7 |  | 273 | 200 |
| doc20k-symbols-select-all | ms | 2,114 | 1,982 | 2,472 |  | 293 | 276 |
| doc20k-symbols-nudge | nudgeMedian | 5,623 | 5,616 | 5,873 |  | 11,000 | 450 |
| doc20k-symbols-drag | moveMedian | 97.6 | 91.3 | 98.9 | 280 | 6,704 | 337 |
| doc20k-symbols-undo | ms | 6,210 | 5,632 | 6,419 |  | 279 | 313 |
| doc20k-symbols-redo | ms | 5,987 | 5,609 | 6,194 |  | 277 | 456 |
| doc20k-symbols-layers-scroll | frameP95 | 33.3 | 16.7 | 33.3 |  | 309 | 204 |
| doc50k-flat-open | painted | 71,907 | 71,302 | 82,903 |  | 69,541 | 591 |
| doc50k-flat-zoom-api | frameP95 | 1,585 | 1,520 | 1,775 |  | 20,906 | 495 |
| doc50k-flat-pan-api | frameP95 | 33.3 | 33.3 | 33.3 |  | 328 | 507 |
| doc50k-flat-pan-wheel | frameP95 | 16.7 | 16.7 | 16.7 |  | 327 | 580 |
| doc50k-flat-select-all | ms | 99,475 | 96,285 | 107,238 |  | 865 | 818 |
| doc50k-flat-nudge | nudgeMedian | 13,289 | 13,289 | 13,289 |  | 26,168 | 994 |
| doc50k-flat-drag | moveMedian | 223 | 223 | 223 | 572 | 15,949 | 476 |
| doc50k-flat-undo | ms | 13,609 | 13,609 | 13,609 |  | 501 | 965 |
| doc50k-flat-redo | ms | 14,342 | 14,342 | 14,342 |  | 522 | 419 |
| doc50k-flat-layers-scroll | frameP95 | 33.3 | 33.3 | 33.3 |  | 349 | 589 |
| doc50k-nested-open | painted | 99,743 | 99,702 | 99,820 |  | 19,936 | 452 |
| doc50k-nested-select-all | ms | 2,507 | 2,487 | 2,510 |  | 88 | 597 |
| pages-open | painted | 6,408 | 6,336 | 6,610 |  | 5,470 | 153 |
| pages-multipage | ms | 63.6 | 63.4 | 64.4 |  | 25 | 127 |
| pages-zoom-api | frameP95 | 33.3 | 33.3 | 50.0 |  | 365 | 113 |
| pages-pan-api | frameP95 | 33.3 | 33.3 | 33.3 |  | 503 | 120 |
| fx-zoom-api | frameP95 | 883 | 868 | 900 |  | 28,206 | 35 |
| fx-pan-api | frameP95 | 50.0 | 50.0 | 66.7 |  | 783 | 42 |
| fx-zoom-min | ms | 981 | 964 | 999 |  | 921 | 31 |
| fx-zoom-max | ms | 64.5 | 64.4 | 64.6 |  | 18 | 32 |
| fx-zoom-step-min | frameP95 | 742 | 717 | 817 |  | 3,222 | 47 |
| fx-zoom-step-max | frameP95 | 943 | 922 | 963 |  | 6,754 | 29 |
| export-doc20k-flat-svg | ms | 659 | 636 | 661 |  | 0 | 399 |
| export-doc20k-flat-pdf | ms | 3,352 | 3,291 | 3,629 |  | 1,988 | 237 |
| export-doc20k-flat-png | ms | 1,708 | 1,567 | 1,829 |  | 0 | 167 |
| export-fx-svg | ms | 1,969 | 1,945 | 2,043 |  | 0 | 237 |
| export-fx-pdf | ms | 5,570 | 5,511 | 5,701 |  | 1,811 | 71 |
| export-fx-png | ms | 3,343 | 3,189 | 3,411 |  | 0 | 65 |
| import-svg-20000 | painted | 24,484 | 23,595 | 27,027 |  | 23,503 | 850 |
| import-pdf-20pages | painted | 8,769 | 8,409 | 8,882 |  | 3,266 | 972 |
| import-eps-4000 | painted | 7,261 | 7,115 | 7,451 |  | 6,940 | 786 |
| import-png-6000x4000 | painted | 1,833 | 671 | 1,869 |  | 253 | 20 |
| import-jpeg-6000x4000 | painted | 1,997 | 1,973 | 2,015 |  | 1,455 | 20 |
| import-sketch-4000 | ms | 118,654 | 118,647 | 118,751 |  | 3,665 | 74 |
