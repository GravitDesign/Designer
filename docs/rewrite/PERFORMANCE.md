# Performance

A benchmark of the real app, the baseline it measured, and where the time
goes. Every number here is from a production build of commit `0e937670`
(the last commit before the current round of fixes).

## Running the benchmark

```sh
node scripts/bench/run.ts                          # every case, 5 runs each
node scripts/bench/run.ts --filter pan             # cases whose id contains "pan"
node scripts/bench/run.ts --filter cold-start,export-svg --runs 9
node scripts/bench/run.ts --ref HEAD               # build the committed sources, not the working tree
node scripts/bench/run.ts --no-build               # reuse the last build
node scripts/bench/run.ts --profile                # also one CPU-profiled run per case
node scripts/bench/run.ts --gpu                    # Chromium's own GPU settings instead of the parity flags
```

What it does:

- Builds the client with `vite build` into a folder under the system temp
  directory, so `dist/` and lint never see it. With `--ref` the sources come
  from `git archive`, so a baseline can be built while `src/` is being
  edited.
- Serves the build with `server/main.ts` on port 3197 (`GD_CLIENT_ROOT`).
- Drives headless Chromium through Playwright with the parity flags
  (software canvas, SwiftShader, sRGB, 1600 x 1000, scale 1). Each case
  gets a fresh browser context. Files are opened through File > Open Local
  File with the file input, as the parity corpus scenarios do, and the app
  is driven through `window.__parity` hooks and real mouse and keyboard
  input.
- Runs each case once to warm up, then `--runs` times, and reports the
  median. The table goes to stdout; everything (all runs, CDP metrics,
  the cold-start request list, bundle composition) goes to
  `scripts/bench/results/<time>.json` and `latest.json`. That folder is
  ignored by git.
- With `--profile` it records one more run with the CDP profiler (200 us
  sampling), saves the `.cpuprofile` next to the results and summarises
  top self and total time by function, mapped to the TypeScript sources
  through the build's sourcemaps. It also counts React commits and
  component renders through a minimal DevTools hook.

The code is in `scripts/bench/`: `run.ts` (entry, table, JSON), `cases.ts`
(the cases), `in-page.ts` (frame recorder, long-task observer, idle wait,
render counter), `synthetic.ts` (generated inputs), `profile.ts` (CPU
profiles), `bundle.ts` (sizes and composition), `lib.ts` (build, server,
browser, statistics). It is a plain script, so neither the Playwright
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

The heavy document is built in the page: 3,000 rectangles, ellipses, stars
and paths with fills, every tenth with a drop shadow, on a 4000 x 3000
page. The corpus has no large files (the biggest is 79 KB) and the import
fixtures are all under 30 KB, so the heavy SVG and EPS are generated too.
All generated content is seeded and the same on every run.

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

11. **Large SVG import notifies per node.** 3,000 elements take 2.9 to
    4.7 s. Text nodes fire change events when they join the workspace
    (`src/engine/text/text.ts:2339` → `src/engine/scene/node.ts:831`,
    200 ms), each append notifies (`src/io/import/svg/svg-parser.ts:724`),
    and the first paint of the result is 800 ms. Fix: build the imported
    tree detached and attach it once. Win: 20 to 30%. Risk: low.

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

A note on the benchmark itself: the idle wait polls the parity hook
`corpus.assetsReady`, which walks the scene every frame. On the heavy
document it shows up in the profiles as `src/parity/app/corpus.ts:54`
(about 30 ms per case), only while waiting for the view to settle, not
inside the measured frames.
