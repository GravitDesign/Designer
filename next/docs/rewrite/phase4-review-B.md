# Phase 4 review, group B

Scope: clusters engine-geometry-vertex, engine-geometry-boolean, engine-geometry-offset-trace and engine-paint (45 old modules, the dropped recorder modules 111, 897 and 899 compared against the emulation). Every module was walked method by method. Besides reading, the geometry modules (boolean, intersection, offsetter, simplifier, image tracer, knife cut) were run old against new in Node on random and edge-case inputs; none of those runs found an output or thrown-error difference. The fuzz harnesses live in the review scratchpad, not in the repo; the findings below suggest which of them to turn into committed tests.

Counts: 0 high, 16 medium, 27 low.

All behaviour differences are in the paint cluster. Most come from painting synchronously where the old code recorded and replayed later (R4-B-001 to R4-B-003, R4-B-006, R4-B-007, R4-B-009, R4-B-010); R4-B-011 to R4-B-014 are small WebGL edge cases. Everything else is untested branches and kept quirks missing from QUESTIONS.md.

## B part 8: engine-paint (render pipeline, bitmap, blender, caches)

Checked modules:
- 103 render-scheduler.ts, old 25419-26307: complete (recorder replay, worker and debug paths dropped by design; kept surface compared)
- 112 element-data.ts, old 27216-27223: complete
- 118 destroyable.ts, old 27986-27992: complete (interface instead of throwing mixin; no hasMixin users)
- 133 scene-paint-configuration.ts, old 30761-30836: complete
- 166 renderer-config.ts, old 37334-37380: complete
- 228 paint-context.ts, old 45001-45064: complete
- 345 bitmap.ts, old 61377-61678: complete
- 643 blender.ts, old 83467-83758: complete
- 663 tile-renderer.ts, old 93297-93800: complete
- 664 dirty-list.ts, old 93801-94027: complete
- 895 png-chunks.ts, old 112992-113086: complete
- 896 png-dpi.ts, old 113087-113106: complete
- 898 render-job.ts, old 114017-114121: complete
- 907 paint-configuration.ts, old 116381-116387: complete
- 934 tile-cache.ts, old 121746-122049: complete
- 935 rect-matcher.ts, old 122050-122316: complete
- 936 tile-grid.ts, old 122317-122445: complete
- 937 render-request.ts, old 122446-122457: complete

RectMatcher, TileGrid, DirtyList/DirtyMatcher, PngChunks, JpegDpi, ScenePaintConfiguration, PaintContext, RenderJob and Blender match the old code branch for branch (including the kept quirks: stale DataView after addChunk, unreachable DirtyList branch, consolidate(undefined) no-op, first cache entry with undefined scale, one-argument drawImage in Bitmap). The findings below come from the port painting synchronously where the old code recorded and replayed later.

### R4-B-001 (medium): tile cache is never filled because paint time is measured after painting
- Old: public/chunk.vendor.js:93555 (`w[x] = !!S && Date.now()` before `l.render(...)` at 93558; checked at 93472 `Date.now() - w[a] > A.CACHE_WHEN_DRAWING_LONGER_THAN`)
- New: next/src/engine/paint/tile-renderer.ts:340 (and 324), checked at 241
- Differs: in the old code scene.paint (93534) only recorded commands; the real drawing happened inside l.render, after the start time was taken, so a tile that took over 50 ms to draw went into the tile cache via setCache. In the port scene.paint (line 318) already draws everything, the start time is taken afterwards (line 340) and RenderScheduler.render calls back synchronously, so `Date.now() - paintStarts[index]` is about 0 and setCache is never called from the renderer. The cache stays empty in the real app: repeated zoom levels repaint everything instead of copying cached tiles, and cachedRender/getGimmick never have anything to serve. Parity doesn't see it because the editor hooks switch this caching off (parity/scenarios/editor-tools/contract.ts prepareView). The existing tile-cache test calls setCache directly, so the renderer-to-cache link is untested.
- Fix: take the time before painting so it covers the drawing, as the old replay did, e.g. `const paintStart = Date.now();` right before `RenderScheduler.begin(threaded)` (line 313), and use `paintStarts[index] = !!toPaint && paintStart` (plus the DEBUG_GRID_PAINT_DELAY offset in the other branch). Add a TileRenderer test whose scene.paint busy-waits past CACHE_WHEN_DRAWING_LONGER_THAN and assert that `_paintCanvasCache._getItemFromZoom(scale)` exists with non-empty `cacheMatcher.getRects()` afterwards (fails today).

### R4-B-002 (medium): a canvas error during painting leaves the render phase on and blocks all later repaints
- Old: public/chunk.vendor.js:93534-93536 (paint then `l.finish()`), 93558 (render inside try), 93561-93565 (catch: cleanup, `p(null, !0, !1)`, `_renderNext()`)
- New: next/src/engine/paint/tile-renderer.ts:313-320 (outside the try at 322-352)
- Differs: in the old code canvas API calls were recorded during scene.paint and executed during l.render, so a DOMException from the canvas (for example IndexSizeError from arc/ellipse with a negative radius, InvalidStateError from createPattern or drawImage of a zero-sized or broken source that isn't guarded) was thrown inside the try: the tile renderer cleaned up, called back with (null, true, false) and moved on to the next request, with RenderScheduler.finish() already done. In the port the same call throws inside scene.paint, which is outside the try, so canvas.finish() and RenderScheduler.finish() are skipped and the exception leaves paintAndRender. After that RenderScheduler._renderPhase stays true (getRenderer keeps handing out recorder contexts, isRenderPhase() is true) and `_renderQueue` keeps the failed request, so every later paintAndRender just queues (length > 1) or logs "render phase render, waiting": the view stops repainting. Untested.
- Fix: wrap the paint block in try/catch/finally: always call canvas.finish() and RenderScheduler.finish() in finally; on a DOMException (what the old replay would have thrown) take the same path as the existing catch (console.error, this.cleanup(), callback(null, true, false), this._renderNext(), return false); rethrow other errors, which also escaped in the old code. Test with a scene whose paint calls `paintContext.canvas._canvasContext.arc(0, 0, -1, 0, 1)`: expect the callback (null, true, false), `RenderScheduler.isRenderPhase()` false and a second paintAndRender painting again.

### R4-B-003 (medium): same stuck render phase in tryRunRendering
- Old: public/chunk.vendor.js:25482-25489 (`d.begin(n, r), t(), d.finish()`, then `d.render(...)`)
- New: next/src/engine/paint/render-scheduler.ts:107-115
- Differs: old renderFunc only recorded, so canvas errors surfaced in d.render after d.finish() had reset the render phase. In the port renderFunc draws for real; a canvas DOMException skips `this.finish()` (the finally only restores paintingForTryRun), leaving `_renderPhase` true. Every later tryRunRendering is then queued in `_scheduledRenderings` and never runs unless some other depth-0 render with a callback happens; getRenderer keeps returning recorder contexts. (JS errors in renderFunc left the phase on in the old code too, so only canvas errors differ.) Untested.
- Fix: call `this.finish()` in the finally block as well (or in a finally around renderFunc), then rethrow. Test: renderFunc that throws a DOMException; afterwards `RenderScheduler.isRenderPhase()` is false and the next tryRunRendering runs at once.

### R4-B-004 (medium): untested tile renderer and cache branches the editor will hit
- Old: public/chunk.vendor.js:93474-93475 (setCache from the render callback), 93483-93489 (low-res gimmick), 93630-93660 (moveContent), 93716-93780 (drawTo with dirty and graphic), 121777-121851 (getGimmick), 121895-121903 (MAX_CACHED_PER_ONE_ZOOM eviction)
- New: next/src/engine/paint/tile-renderer.ts:236-251, 261-271, 399-437, 517-577; next/src/engine/paint/tile-cache.ts:63-135, 228-237
- Differs: no unit test or ported scenario covers getGimmick (scale selection, area scaling, the two-canvas upscale), the per-zoom eviction loop in setCache, moveContent (scroll copy through the pan helper), drawTo with a dirty matcher and with the `graphic` filter, or drawFragmentFrom. The code reads the same as the old, but these are the pan/zoom paths of the scene view and are only reachable once the editor view is ported; a slip in an offset sign would only show as misplaced pixels while scrolling.
- Fix: add tile-cache.test.ts cases: (1) setCache at scale 1 for a 0,0 area, then getGimmick([Rect(0,0,w,h)], origin, 2) returns a canvas of w x h whose pixels are the cached ones upscaled; null for two areas or a non-zero first area; (2) setCache with an area spanning more than MAX_CACHED_PER_ONE_ZOOM grid items (lower the config temporarily) drops the oldest items from both the grid and the matcher; (3) TileRenderer.moveContent shifts a filled tile by (dx, dy) and clears the rest; (4) drawTo with a DirtyMatcher draws only those fragments and, with a non-tile `graphic`, draws the graphic's fragments.

### R4-B-005 (low): Blender, TileRenderer, TileCache and TileGrid get fresh type ids
- Old: public/chunk.vendor.js:83481 (`s.inheritAndMix(p, s, [r, c])`), 93322, 121766, 122329
- New: next/src/engine/paint/blender.ts:23, tile-renderer.ts:45, tile-cache.ts:33, tile-grid.ts:325
- Differs: the old classes were anonymous module exports; the port registers them under invented G names ("GBlender" is real in toString, "GTileRenderer", "GTileCache", "GTileGrid" are not) that are absent from core/type-ids.ts, so they take ids from the fresh counter. Nothing serializes these ids, so no file or pixel changes; it only matters if a scenario ever compares type ids of these objects.
- Fix: either drop registerClass for the three anonymous ones or add a comment that the names are new and the ids are not old ids.

## B part 7: engine-paint (paint canvas, WebGL base, recorder emulation)

- 14 GPaintCanvas, public/chunk.vendor.js:4011-5108, next/src/engine/paint/paint-canvas.ts (+ paint-canvas-class.ts, context-2d.ts): complete. Every method walked; statics, prototype defaults, smoothing helpers, clone, setFilter, hitTest, _drawSmoothImage match except the entries below. Vitest paint-canvas.test.ts passes (30 tests with the recorder test).
- 42 shader base, 7832-8560, next/src/engine/paint/webgl/shader.ts: complete. apply/_renderTile/_copyCanvas argument mapping and the final drawImageFragment arguments checked one by one; caches, uniforms, drawRect, fxaa match.
- 226 GL context + GLTexture, 44393-44866, next/src/engine/paint/webgl/gl-context.ts: complete (also compared the texture-type probe and readPixels patch from module 899, 115145-115451).
- 346 blend shader, 61679-61787, next/src/engine/paint/webgl/blend-shader.ts: complete, no differences (shader sources byte-equal).
- 470 GL texture registry, 70977-71046, next/src/engine/paint/gl-textures.ts: complete, no behavioural differences (real textures never reach the array walks in either version).
- 473 GWebGLRenderer, 71359-71635, next/src/engine/paint/webgl/webgl-renderer.ts: complete.
- Recorder 111 (26572-27215) and 2D half 897 (113107-114016) against next/src/engine/paint/recorder-state-context.ts: property copies, defaults, one-level save, restoreCount/forceRestore, closePath-as-lineTo with the shared start point, composite operator filter, imageRendering, arc boolean, drawImage argument forms, empty getImageData are emulated. Gaps below. WebGL half 899: only the probe and readPixels patch matter for pixels; both are ported.

### R4-B-006 (medium): render-phase clone() threw in the old app, the port returns a working copy
- Old: public/chunk.vendor.js:4877-4880 (GPaintCanvas.clone, render-phase branch), 26841-26852 (__clone), 26587/26613-26618 (recorder constructor)
- New: next/src/engine/paint/paint-canvas.ts:1409-1410, 1470-1539 (_cloneRecorded)
- Differs: the old `__clone` passes its arguments shifted by one: `__renderer` lands in the contextAttributes slot and `__multiThreaded` (false) lands in the renderer slot `s`. With a falsy `s` the constructor takes the `this.canvas = null` branch, so the clone has no canvas and line 4880 (`i.canvas.rendered = a.canvas.rendered`) throws "Cannot set properties of null". So `clone()` without `renderPhaseDraw` during a render phase always threw. The port instead copies pixels, the 19 synced properties and the area clip into a working canvas. The comment on _cloneRecorded ("The old render-phase clone copied the recording ...") describes behaviour that never happened. Even if the old call had worked, two more things would differ: the clone's getters would have answered the recorder defaults (prototype `$` values, 113682-113703), not the source's values, and `o._blender._ctx` stayed bound to the context made in the constructor (blender 83478-83481), so every draw the blender routes (fill, stroke, fillRect, strokeRect, drawImage, drawCanvas) would have gone into a discarded context. All in-tree callers pass `renderPhaseDraw: true` (vendor 117873, 117988, 235236; new element-stylable.ts:480, 619), so I found no path that reaches this branch. No test covers it.
- Fix: keep the old outcome. Replace _cloneRecorded with `throw new TypeError("Cannot set properties of null (setting 'rendered')")` (or keep it and add a QUESTIONS.md entry that explains why the port deviates). Correct the comment either way. Add a unit test: start a render phase, call `canvas.clone()` without options, expect the throw.

### R4-B-007 (medium): measureText on recorded canvases used the real context's stale font
- Old: public/chunk.vendor.js:113580-113583 (recorder measureText), 4778-4784 (GPaintCanvas.measureText); callers 101950-101955 (GLabelGuide.paint label truncation), 101805 (GPageLabelGuide hit test)
- New: next/src/engine/paint/recorder-state-context.ts:412-414
- Differs: the recorder only recorded `font = ...`. It measured with `__realCtx.measureText`, and the real context had not seen the new font yet, because recorded setters reach it only at replay. On a recorded canvas the old GPaintCanvas.measureText(text, font) therefore ignored `font` and measured with whatever font the last replay left on the real canvas ("10px sans-serif" on a fresh one). The wrapper sets the font on the real context right away, so it measures the requested font. Where labels are truncated with "…" (101950-101957), the old app measured with a different width and could cut at a different place. I haven't confirmed that GLabelGuide paints into a recorded canvas: scene tiles are recorded (tile-renderer.ts:313 starts the render phase), but guides may paint outside it. The recorder test has no measureText case.
- Fix: find out whether any measureText caller runs on a recorded context (guides, page labels, ruler). If one does, make RecorderStateContext.measureText measure on a second context that only gets the font at the points where the old replay would have applied it. The simplest version that matches a fresh canvas is a scratch context left at "10px sans-serif". Then add a parity scenario with an artboard or slice label long enough to be truncated. If no caller does, add a one-line note to the class comment.

### R4-B-008 (medium): branches of GPaintCanvas no test or listed scenario reaches
- Old: public/chunk.vendor.js:4370-4396 (createCanvas with clipToAreas and padding), 4458-4481 (createTexture: incomplete image, zero-size source, createPattern throwing), 4706-4728 (setRenderAlgorithm), 4778-4784 (measureText with a number), 4961-5035 (_drawSmoothImage on a skewed or rotated transform), 5054-5075 (_convertImage "Not Supported.")
- New: next/src/engine/paint/paint-canvas.ts:700-731, 821-845, 1180-1195, 1292-1296, 1542-1657, 1679-1691
- Differs: no difference found. These are untested. paint-canvas.test.ts covers prepare, the geometry helpers, fillRect, strokeLine, strokeVertices, putVertices, clipVertices, drawCanvas, putAuxilliaryText, setFilter, hitTest, gradients and clone outside a render phase. corpus/matrix covers drawImage, drawImageFragment, drawCanvas, setFilter and clone(true) on a plain canvas. createCanvas padding is mutated inside the loop (padding number becomes an array), and _drawSmoothImage resets the context to the raw transform without scale and origin (5024-5032). Both are quirks a refactor could easily "fix".
- Fix: add unit tests for createCanvas(rect, true, 4) on a canvas with two areas (expect the areas moved by -x,-y and expanded by 4), createTexture with an Image that isn't complete (null) and a 0.4-wide canvas (null), setRenderAlgorithm(Pixelated) on a plain and a recorded canvas, measureText("a", 12) setting "12px Verdana", and a _drawSmoothImage case at scale 0.2 that checks the context transform afterwards equals the raw transform.

### R4-B-009 (low): isRendered() is always true, the old fx cache treated a canvas recorded in the same pass as not rendered
- Old: public/chunk.vendor.js:5082-5087, 26726-26734 (RendererCanvas.isRendered), caller 117799 (Stylable._getFxCache)
- New: next/src/engine/paint/paint-canvas.ts:1698-1701
- Differs: old `_getFxCache` used a cached fx bitmap only once its recording had been replayed to the end (`f.finished`). A cache made earlier in the same pass, for example by the previous tile of the same frame while its replay was still time-sliced, counted as a miss and the effect was computed again. The port always reports rendered, so it hits at once. The pixels should be the same. The scale-mismatch path after a hit (117801-117815, rescaling and "_resetFxCacheAndState") now runs in cases where the old code recomputed instead. This deviation is not in QUESTIONS.md.
- Fix: add a QUESTIONS.md entry. A parity scenario that paints an element with a cached effect across two tiles at a changed zoom would show whether the rescale path changes pixels.

### R4-B-010 (low): hitTest on a recorded canvas never found anything in the old app
- Old: public/chunk.vendor.js:4796-4808 with 113546-113552 and 113418-113440 (recorder getImageData returns a lazy ImageData whose `.data` is an ImageDataArray without `length`)
- New: next/src/engine/paint/paint-canvas.ts:1311-1334, recorder-state-context.ts:447-450
- Differs: on a recorder, `getImageData(...).data.length` is undefined, so the loop never runs, `best` stays MAX_VALUE, and hitTest returned null. The wrapper returns real pixels, so hitTest finds hits. I found no caller of GPaintCanvas.hitTest in either bundle or in next/src, so this is a documentation gap. The same lazy `.data` also changed Bitmap.trim and getPixelValue on recorded canvases (61605-61645), which belong to module 345.
- Fix: note in the recorder-state-context.ts header that synchronous pixel reads now return real data where the recorder returned a placeholder, and list hitTest, trim and getPixelValue.

### R4-B-011 (low): GLContext.createTexture reads width and height with fewer than three arguments
- Old: public/chunk.vendor.js:44801-44813
- New: next/src/engine/paint/webgl/gl-context.ts:593-602
- Differs: the old code assigned `t = arguments[1]`, `i = arguments[2]` only when `arguments.length >= 3`. `createTexture(canvas, w)` therefore uploaded the whole canvas. The port passes args[1] through. initFromCanvas then sees a width without a height, takes the resize branch and throws ReferenceError("resizedCanvas is not defined"). The bytes form `createTexture(bytes, w)` also gets w instead of undefined. No current caller passes two arguments.
- Fix: `const sized = args.length >= 3; fromCanvas(first, sized ? args[1] : undefined, sized ? args[2] : undefined)`, and do the same for fromBytes. Add a unit test with a fake GL context that calls createTexture(canvas, 5) and expects no throw.

### R4-B-012 (low): drawShader no longer returns null when the GL-bug probe can't prepare its blur shader
- Old: public/chunk.vendor.js:71566-71567
- New: next/src/engine/paint/webgl/webgl-renderer.ts:236, 310-315
- Differs: old `if (!m.prepareShader()) return ((h = !1), null);` returns null from drawShader itself, so that first effect is not drawn. The port's probeGLBug returns to drawShader, which then renders with the DIRECT method. This only happens when the GL context is available for the caller's shader but GGLBlurEffect.prepareShader fails. It is very unlikely, but it is the old control flow.
- Fix: have probeGLBug return a flag (`"abort"`) and have drawShader `return null` on it.

### R4-B-013 (low): prepareShader's "third webgl type" branch no longer throws on empty backup slots
- Old: public/chunk.vendor.js:71494-71498
- New: next/src/engine/paint/webgl/webgl-renderer.ts:172-176
- Differs: old `"function" == typeof this.backupShaderData[t].destroy` throws a TypeError when a slot is null (extraTexture or flippedShader null, which happens right after the first swap). The port checks `saved &&` and continues. With the recorder gone, the context changes only after a webglcontextrestored, so this needs two context restores to reach.
- Fix: drop the `saved &&` guard to keep the throw, or document it in QUESTIONS.md.

### R4-B-014 (low): Shader._genAreas([]) throws in the port but returned [] in the old code
- Old: public/chunk.vendor.js:8460-8471
- New: next/src/engine/paint/webgl/shader.ts:588-592; test next/src/engine/paint/paint-context.test.ts:132-134
- Differs: the old code reads `t.getX()`, `t.getY()` and then maps with the undefined `rescale` only inside the callback. An empty areas array with a valid offset returned [], and a null offset threw TypeError. The port throws ReferenceError for any non-null array, and the unit test asserts that for `[]` with a null offset. The function is unused (_updateAreas has no callers).
- Fix: `const x = offset.getX(); const y = offset.getY(); return areas.map(() => { throw new ReferenceError("rescale is not defined"); });`. Change the test to expect [] for `([], new Rect(0,0,1,1))` and a throw for a one-element array.

## B part 5: GVertexOffsetter

- Module 651 (GVertexOffsetter), public/chunk.vendor.js:87043-89608, new file next/src/engine/geometry/vertex-offsetter.ts: complete. I compared every method branch by branch. I also ran a differential fuzz in Node: I loaded the old chunk in a vm with a stub webpack require and ran old and new on the same random inputs (lines, quadratic and cubic curves, extra Moves, Close or open, offsets 0/0.5/1-61/negative, every side combination including neither, caps undefined/null/butt/round/square, tolerances undefined/0/0.3/1/2.5, plus a run with duplicate and collinear points). 98,000 cases with 0 differences: identical output vertices, compared with Object.is, and identical thrown errors (538 throws in both). A run with 1e5-scale coordinates hadn't finished when I wrote this. To find unreached branches I ran the parity scenario's inputs (engine-geometry/pathops/offsetter, 570 runs) through the new file under V8 block coverage (Node strip-types loader, so the offsets match the source). The line numbers below come from that run.

No behaviour difference found. The findings are untested branches, and old quirks the port keeps but QUESTIONS.md doesn't list.

### R4-B-015 (medium): line-to-arc joins in _trimOffsetPoly are never exercised
- Old: public/chunk.vendor.js:88226 (line then arc, inside the loop), 88294-88327 (arc then line), 88417-88449 and 88513-88517 (closing joins)
- New: next/src/engine/geometry/vertex-offsetter.ts:1488-1518, 1538-1541, 1635-1638, 1691-1694
- Differs: no difference. The fuzz agrees with the old code bit for bit. But no scenario or unit test reaches the line-to-arc join inside the loop (the whole branch from line 1488, including the three TIP/PFIP sub-cases), the arc-to-line join without an intersection, or the closing joins without an intersection. The scenario sources are either all lines or all curves (quad only meets a line at the closing join). Real shapes mix the two all the time: rounded rectangles, and paths with a straight segment followed by a curve.
- Fix: add sources to the offsetter scenario that alternate lines and cubic corners, such as a rounded rectangle (Move, Line, Curve2 corner, Line, ...) and an open path with a line followed by a Curve2, at offsets 1/18/60 with each side. Then record them from the old app.

### R4-B-016 (medium): the arc branch and the cut branches of _excludeCircleInside are untested, and they read cutX/cutY before anything sets them
- Old: public/chunk.vendor.js:88995-89065 (arc branch), 89054-89055 (`new r(v, b)` with v and b only set by a line cut), 89083-89108
- New: next/src/engine/geometry/vertex-offsetter.ts:2180-2255, 2243-2244, 2274-2301
- Differs: same as the old code. The scenarios never reach the arc branch, the param0 <= 0 and 0 < param0 < 1 cuts, the second cut (param1), or the advance onto current.next. The arc branch's "rest of the arc" segment starts at Point(cutX, cutY). Those are the coordinates of an earlier line cut, or undefined when there was none. My fuzz reached that line twice in 6000 random open paths (both sides, round caps), both times with cutX undefined. The segment was dropped later each time, so no NaN reached the output, but nothing guarantees that. QUESTIONS.md doesn't mention it; only a code comment does.
- Fix: add a scenario source that reaches the arc branch, for example an open tightly curved Curve2 path with both sides and offset 60, which my fuzz showed reaches it. Add a Q entry for the undefined cut point, and a unit test asserting that the output has no NaN for that input.

### R4-B-017 (medium): offset 0 on an open path with both sides throws a TypeError, kept without a QUESTIONS/BUGS entry
- Old: public/chunk.vendor.js:89068 (`c.next.point` with c.next null in _excludeCircleInside)
- New: next/src/engine/geometry/vertex-offsetter.ts:2257
- Differs: same in both (the recorded expected file has 8 `"throws": true` rows, all openPolyline at offset 0 with inset and outset, every cap and tolerance). It is a crash, not a quirk. Outline Stroke or a vectorized border with stroke width 0 on an open path would reach it if the callers don't guard it. Neither QUESTIONS.md nor BUGS-FIXED.md mentions it, and no unit test pins the throw.
- Fix: check whether the old callers can pass 0 (vectorize border, outline stroke, text on path). If they can, it's a BUG-NNN candidate (return no outline for offset 0). Either way, add a unit test that pins the current behaviour and a QUESTIONS/BUGS entry.

### R4-B-018 (medium): generatePolyLine branches for open compound paths and implicitly closed paths are untested
- Old: public/chunk.vendor.js:87713-87715 (Move after an open sub-path), 87782-87784 (last point equals the first, so the path counts as closed), 87738/87756 (curve without a previous point), 87773 (unknown command)
- New: next/src/engine/geometry/vertex-offsetter.ts:898-901, 975-979, 928-931, 950-953, 968-970
- Differs: no difference (fuzz with extra Move commands agrees). But the scenarios only have closed multi-contour input (twoContours) and single open paths. No test covers an open sub-path followed by another Move, which is how a later sub-path starts without a Close. Nothing tests that an open path ending on its start point gets `closed = true`, which changes caps and clipping. The ReferenceError on an unknown command is also untested.
- Fix: add scenario sources such as `[1,0,0,2,100,0,1,0,50,2,100,50]` (two open sub-paths) and `[1,0,0,2,100,0,2,50,80,2,0,0]` (ends on its start, no Close). Add a unit test that a vertex with command 99 throws "vertex is not defined".

### R4-B-019 (low): open inset-only parts that touch the source are always dropped, kept without a QUESTIONS entry
- Old: public/chunk.vendor.js:87896 (`B < w.count` on an array, so the loop never runs)
- New: next/src/engine/geometry/vertex-offsetter.ts:1103-1107
- Differs: kept faithfully and explained in a code comment. It makes the inset of an open path behave differently from the outset, which goes through _excludeCircleInside. That is a likely typo bug with visible output (an inset-only offset of an open path loses pieces), so per PORTING.md it belongs in QUESTIONS.md.
- Fix: add a Q entry. Add a unit test with an open path, inset only, at an offset large enough that a split part crosses the source, asserting that the part is missing.

### R4-B-020 (low): distance helpers have untested branches, including the dx-for-y quirk
- Old: public/chunk.vendor.js:89210-89246 (the line touches the circle; `g = c[0] * p + o.getY()` uses dx for y), 89162-89175 (source line against an arc part)
- New: next/src/engine/geometry/vertex-offsetter.ts:2429-2476, 2387-2397, 2634 (arcs crossing on both, result 0)
- Differs: same as the old code. None of these run in the scenarios, and the dx-for-y quirk is only explained in a code comment, not in QUESTIONS.md.
- Fix: add direct unit tests for _getSegmToArcSqrDist with a line tangent to the arc's circle (expected values from the old formula), and for _getArcToArcSqrDist with crossing arcs. Add a Q entry for the dx/dy mix-up.

### R4-B-021 (low): degenerate-curve fallbacks in the flattening are untested
- Old: public/chunk.vendor.js:87244-87258, 87288, 87300-87320, 87342 (quadratic biarc fallbacks), 87545-87582, 87628-87645 (cubic: missing tangents, incenter on an end, Sturm endpoint nudges, the single-root case)
- New: next/src/engine/geometry/vertex-offsetter.ts:335-356, 387-394, 439-489, 559-572, 708-740, 796-829
- Differs: no difference (the fuzz with duplicate and collinear points agrees). No scenario covers curves with coincident control points, a quadratic folding back onto its start, or cubic pieces with exactly one extremum.
- Fix: add scenario sources with degenerate curves: a Curve2 whose controls equal its ends, a Curve that returns to its start, and a nearly straight cubic.

## B part 4: poly-segments and vertex simplifier

- Module 187 (polygon intersector, old lines 37831-39011) vs next/src/engine/geometry/boolean/poly-segments.ts: complete. Every method read side by side (PolyLine, redistribute, polyFromVertexSource, quadTreeFromPolygon, intersect, _getPlacement, addIntersectionsToPolygon, _makePolygon, _addPoly, _treeIntersect, _addIsect, _subdivideBezier, _recursive_bezier3/4). No behaviour difference found.
- Module 1002 GVertexSimplifier (old lines 232871-233129) vs next/src/engine/geometry/vertex-simplifier.ts: complete. No behaviour difference found for real inputs.

How I checked beyond reading: ran the old modules in Node next to the new ones (scratch loader in scratchpad\boolfuzz\loader.cjs) and compared outputs.
- Existing differential fuzz (scratchpad\boolfuzz\fuzz.mjs), seeds 11, 12, 13, 21 at 120-150 iterations: about 26,000 comparisons of boolean ops in 7 flag configs (including blockIntersector and useIntersector), simplify in all 4 modes, redistribute, intersect (plain, retainBezier+useIntersector, self with `lines`). 0 diffs. With counters on the new code, these runs reach collinear() returning true (curve/curve and line/line), the blockIntersector path, quad and cubic splitting in addIntersectionsToPolygon, and _getPlacement landing on a curve.
- Edge script (scratchpad\b4seg\edge.mjs): empty source, Move only, Move+Move, open paths, Close only, Line before Move, truncated Curve/Curve2, NaN control points, duplicate points, unknown command (both throw ReferenceError "vertex is not defined"), zero-length cubic, 1e300 coordinates, double Close; each through _makePolygon in 4 configs, simplify in 4 modes with and without `force`, redistribute and intersect with blockIntersector. 0 diffs.

The findings below are therefore about test coverage in the repo and code style, not output differences.

### R4-B-022 (medium): blockIntersector path of _treeIntersect has no repo test
- Old: public/chunk.vendor.js:38631 (the `!this._blockIntersector` condition), 38653-38669 (666 marker, collinear drop, per-pair hit counts)
- New: next/src/engine/geometry/boolean/poly-segments.ts:1021, 1040-1080
- Differs: nothing differs (fuzz agrees), but no unit test or ported parity scenario sets blockIntersector. I ran every geometry test and the boolean/pathops scenarios with counters: `_treeIntersect` never ran with blockIntersector = true. The app reaches this path for compound shapes with more than BLOCK_INTERSECTOR_CHILD_NUM children, or after the 10 s timeout (next/src/engine/scene/compound-shape.ts:132-136, 214). Only on this path do line/curve and quad/cubic pairs go through the flattened count logic: `count < 3 / < 2`, and the quirk where quad-vs-any yields the constants 6 or 4, which are always truthy.
- Fix: add a vertex-poly-boolean.test.ts case with `new VertexPolyBoolean(PIP_CHECK_ODDEVEN, AUTO, false, true)` on rect vs ellipse, quad vs rect and ellipse vs ellipse (union and intersection), with expected values recorded from old module 264 through the scratch loader. Or add a compound-shape parity scenario with more than BLOCK_INTERSECTOR_CHILD_NUM children.

### R4-B-023 (medium): the collinear drop in _treeIntersect (found.splice(P)) is never hit by repo tests
- Old: public/chunk.vendor.js:38653-38662
- New: next/src/engine/geometry/boolean/poly-segments.ts:1040-1050
- Differs: no difference (the fuzz hits it about 1000 times with matching output). But in the repo tests collinear() returned true 0 times out of 274 calls, so the branch that marks the pair 666 and truncates `found` from index P to the end (an old quirk that drops later, unrelated hits too) is not covered. A refactor to `splice(P, 1)` would pass every current test.
- Fix: add a poly-segments.test.ts case with two shapes whose cubic edges overlap: the same ellipse twice, or a circle and a copy shifted along its tangent, with `new PolyIntersector(true, true, false, 4)`. Assert the hit list against old output. Also add one with blockIntersector = true and two squares that share an edge, which hits collinear on plain lines.

### R4-B-024 (low): `lines` mode of _treeIntersect and the NaN early return of _subdivideBezier are untested
- Old: public/chunk.vendor.js:38604 (the lines branch with its string key), 38768 (the Number.isNaN guard)
- New: next/src/engine/geometry/boolean/poly-segments.ts:965-1005, 1198-1207
- Differs: no difference. In the repo tests `_treeIntersect` never runs with `lines` = true, and `_subdivideBezier` never gets a NaN. No new caller passes `lines` = true (paths-graph and shape pass false), so that branch may only matter for a later port. NaN coordinates can come from broken files: a NaN quad is kept as a single point, and the old app does the same.
- Fix: add two small cases to poly-segments.test.ts with expected values from the old module: `new PolyIntersector(false, false, false, 2).intersect(s, s, true)` on a self-crossing zigzag, and `_makePolygon` on `[1,0,0, 3,NaN,10, 3,5,5, 5,0,0]`, expected list `[[NaN,10,seg 1],[0,0,seg 2,isLast]]`.

### R4-B-025 (low): VertexSimplifier accepts only registry-mixin sources, not duck-typed hasMixin
- Old: public/chunk.vendor.js:232883 (`e.hasMixin && e.hasMixin(s)` calls the object's own method)
- New: next/src/engine/geometry/vertex-simplifier.ts:24, 287-291 (hasMixinMethod checks that `hasMixin` exists, then asks the registry)
- Differs: an object whose own `hasMixin()` returns true but is not registered gets 1 poly in the old code and 0 in the new (checked: old 1, new 0). Real callers pass GVertexContainer or scene elements. GRectangle and GEllipse register the mixin and give 1 poly in both, so I know of no user-visible case.
- Fix: call `(source as { hasMixin(m: unknown): boolean }).hasMixin(VertexSource)` to match the old dispatch, or leave it and add a comment. Low priority.

### R4-B-026 (low): minified loop names and a typed-away undefined segment number
- Old: n/a (style)
- New: next/src/engine/geometry/boolean/poly-segments.ts:1027 (`B`), 1044 (`P`), 579/664 (`f`); next/src/engine/geometry/vertex-simplifier.ts:143, 196, 240 (`E`); poly-segments.ts:1213 (`const segNumber = seg as number`)
- Differs: the loop indices keep the minified letters, against PORTING.md's rule on minified locals. `seg as number` hides that the simplifier calls `_subdivideBezier` without a segment, so its PolyLine nodes get `seg` = undefined even though the field is typed `number`. This matches the old behaviour, but the type says otherwise.
- Fix: rename the indices to `i`/`hitIndex`/`curveIndex`. Type the parameter as `seg: number | undefined` and keep the cast with a comment ("the simplifier flattens without segment numbers; nodes get undefined as in the old code").

## B part 3: intersection (cluster engine-geometry-boolean)

- 646 (lines 84458-84472) -> next/src/engine/geometry/boolean/intersection-point.ts: complete. Constructor and fields match; the prototype null defaults are always overwritten by the constructor, so nothing is lost. No findings.
- 647 (lines 84473-86907) -> next/src/engine/geometry/boolean/intersection.ts: complete. I read every function side by side (intersect and its helpers, all intersectBezier* variants, hitTestBezier3, coefficient helpers, _roundPoint, _lerpPrecise, Polynomial, removeMultipleRoots, JenkinsTraub quadSD/calcSC/nextK/newest/quad/quadIT/realIT/fxshfr/rpSolve). Argument order, shared-object quirks (realIT writing result.a instead of the shift, the dropped `c = U.a, p = U.b` in fxshfr being dead) and float operation order match.
- I also ran a differential fuzz: the old module text, loaded in Node with the new Point/GMath/big.js, against the new module, compared bit-exact (including -0 and polySeg identity). The script is C:\Users\info\AppData\Local\Temp\claude\c--Users-info-Downloads-gravit-designer\310ed16b-8088-49c6-b54c-0ed414c8334e\scratchpad\b3-fuzz\fuzz.mjs. It covered 4000 random cases per function, 12000 intersect() calls over every degree combination with fast true/false/undefined, all Polynomial methods with number and Big coefficients, and bezoutResultant. A targeted run added 20000 cases for the quadratic `a2y == 0` branch and both-pass cubic/cubic, plus getRootsInInterval end snapping. The only differences are the ones listed below; everything the engine reaches (intersect without `fast`) is identical.

### R4-B-027 (low): Polynomial.scale(true) lets big.js errors escape
- Old: public/chunk.vendor.js:85941
- New: next/src/engine/geometry/boolean/intersection.ts:1537
- Differs: the old precise branch wraps both loops in `try { ... } catch (e) {}`. The port only drops the second loop (the one that hits the undeclared `n`) and has no try. When the leading coefficient is a zero Big (scale does not simplify first), `.div(leading)` throws. The old code swallows it and leaves the coefs as they were. The port throws `[big.js] Division by zero`. Repro: `new Polynomial([0, 62.73, 0, 4].map(c => new Big(c))).scale(true)`. Old: no throw, coefs `[4, 0, 62.73, 0]`. New: throws. The fuzz found this in 582 of 4000 cases. Nothing in the engine calls scale.
- Fix: wrap the precise loop in `try { while (--i >= 0) ... } catch { /* old code swallowed big.js errors */ }`, and add a test that `scale(true)` with a zero leading Big coefficient doesn't throw and keeps the coefs.

### R4-B-028 (low): _lerpPrecise throws the wrong error for a non-array second argument; comment is wrong
- Old: public/chunk.vendor.js:85496
- New: next/src/engine/geometry/boolean/intersection.ts:1031
- Differs: in the old code, `s(n)` with `n` undefined does not throw. Calling big.js `Big()` without `new` and without an argument returns a new Big constructor. The error only comes later, from the arithmetic. A non-array first argument ends in `[big.js] Invalid number` (from `o.minus(n)`), the same as the port. A non-array second argument ends in `TypeError: o.minus is not a function`, while the port throws `Error: [big.js] Invalid number` right away. The doc comment ("Anything but arrays makes big.js throw") describes this wrongly. The function is unused.
- Fix: throw `new TypeError("o.minus is not a function")` (or any TypeError) in the second branch, and correct the comment to say that big.js `Big(undefined)` returns a constructor and the failure comes from the arithmetic that follows.

### R4-B-029 (low): Polynomial.getCubicRoots(true) drops the console.log and changes the TypeError message
- Old: public/chunk.vendor.js:86182 and 86159
- New: next/src/engine/geometry/boolean/intersection.ts:1773 and 1794
- Differs: the old code logs `putting some unfound!` every time it adds a GMath root. The port is silent. When getCubicRootsAnalPrecise returns undefined (big.js threw while computing p or q, e.g. leading coefficient 0), the old message is `Cannot read properties of undefined (reading 'length')` and the new one is `Cannot read properties of undefined`. The port also converts Big coefficients to numbers before GMath.getCubicRoots. The fuzz showed identical roots for every degree-3 Big case, so only the log and the message differ. Unused in the engine.
- Fix: none needed for behaviour. Either keep the message text identical or note the dropped console output in the method comment.

### R4-B-030 (medium): several numeric branches of intersection.ts have no unit test
- Old: public/chunk.vendor.js:84827 (Bezier2Bezier2 `0 == a.getY()`), 84877/85024/85391/85460 (early `return []`), 85416 (cubic/cubic second pass), 86261 (getRootsInInterval end snapping), 84579-84616 / 84617 / 84729 (intersect dispatch 1/2, 2/1, 2/2, 3/3)
- New: next/src/engine/geometry/boolean/intersection.ts:383, 429/588/938/1004, 956, 1878, 199-221/291
- Differs: nothing differs today (the differential fuzz is bit-exact on all of these). But intersection.test.ts only pins a few hand-picked inputs. The quadratic used there has `a2y != 0`, so the `ac2.getY() == 0` resultant is never run. The second cubic/cubic pass never adds a hit in the test (both=true and both=false give the same list, and 20000 random pairs never added one either). intersect() is tested only for the 1/1, 1/3, 3/1, 2/3 and 3/2 combinations. The boolean parity scenarios reach cubic/cubic and quadratics only indirectly. These are the most fragile float expressions in the cluster, so a later "cleanup" there would go unnoticed.
- Fix: add recorded-old-output cases to intersection.test.ts. At minimum: intersectBezier2Bezier2 with a first quadratic whose y1 - 2*y2 + y3 == 0 (e.g. a1=(0,0), a2=(80,10), a3=(100,20) against a crossing quadratic), intersect() on two quadratic segments, on two cubic segments and on line/quadratic in both orders, and getRootsInInterval snapping (`new Polynomial([1, -1 + 1e-13]).getRootsInInterval(0, 1)` gives `[0.9999999999999]`, and `[1, -3, 2 - 1e-13, 0]` gives `[0, 0.9999999999998999]`). Better: commit a small seeded differential test like the scratch fuzz.mjs against old outputs recorded to JSON (the same way old-outputs.json is built), over a few hundred random curve pairs.

## B part 6: image tracer and knife cut

- Module 1003 GImageTracer, public/chunk.vendor.js:233130-233759, next/src/engine/geometry/image-tracer.ts: complete. Walked every method line by line (checkoptions, rand, colorquantization, samplepalette, generatepalette, layering, pathscan, batch*, internodes, tracepath, tracepath2, fitseq, blur, loadImage, getImgdata). No behaviour difference found. Also ran a differential fuzz in Node (old module loaded from chunk.vendor.js through a fake webpack queue, against the new class): 6000 random small images with random options (pal, colorsampling off, blur radius/delta, pathomit, ltres/qtres, colorquantcycles, mincolorratio), comparing the full trace data, the mutated options object, the generator state and tracepath2 output on every internode path: 0 differences, including identical throws.
- Module 1079 (knife cut), public/chunk.vendor.js:235752-236290, next/src/engine/geometry/knife-cut.ts: complete. Walked every method; the function-scoped leftovers in _fitVertices (d, _, v reused by the fill-in loop) are kept. Differential fuzz of performCut plus checkSideOfUncut, 60000 random cases (open and closed, lines, Curve and Curve2, 0-4 intersections, null paths, fit undefined/true/false, alternateParts on/off): 0 differences in results, UNCHANGED/null returns and thrown errors. The two unit test expectations also match the old module's output.

The fuzz scripts are in C:\Users\info\AppData\Local\Temp\claude\c--Users-info-Downloads-gravit-designer\310ed16b-8088-49c6-b54c-0ed414c8334e\scratchpad\oldknife (load.cjs, fuzz.mts, fuzz-tracer.mts; run with `OLD_JS=<repo>/public/chunk.vendor.js node --experimental-strip-types fuzz.mts`).

### R4-B-031 (medium): knife cut has no parity scenario and the unit tests skip its risky branches
- Old: public/chunk.vendor.js:236141 (_fitVertices), 236147 (alternate-parts join), 236170-236212 ("second source to same path?" exits), 236023 (curve handling in _breakApart), 236100 (_distributeSides)
- New: next/src/engine/geometry/knife-cut.ts:545 (_fitVertices), 562, 594-645, 443-475, 492
- Differs: no behaviour difference found (fuzz above), but nothing committed would catch a regression. parity/ported/engine-geometry-offset-trace.json lists no knife scenario, and the knife tool (editor) that calls performCut(paths, cut, cutter, closed, source, fit, alternateParts) is not ported yet, so no UI parity run reaches it. knife-cut.test.ts covers only a straight cutter through a square, an open line, UNCHANGED/null and checkSideOfUncut on lines. Untested: Curve/Curve2 splitting and the 6/8-number segments in _getSide, the alternateParts path with more than 3 cutter parts, the join loop that merges side paths (prepend/append, reversed or not), the fill-in of unused cutter parts, the "second source" failure, _distributeSides' clone branches for the first/last cutter part, and multiple input paths with null entries.
- Fix: add a scenario `engine-geometry/pathops/knife-cut` (record from the old app) that runs performCut on a few fixed inputs: a curved cutter crossing a closed path 4 times with alternateParts true and false, a closed path cut by a cutter whose ends both lie on it, two paths in one call with a null entry, and an open path with fit=false; serialize each side with GVertexContainer.serialize. Alternatively commit the fuzz as a fixture test with old outputs captured once.

### R4-B-032 (low): image tracer branches not covered by tests: fixed palette, holes, tracepath2, getImgdata
- Old: public/chunk.vendor.js:233198 (t.pal), 233546 (tracepath2), 233755 (getImgdata), 233744 (loadImage)
- New: next/src/engine/geometry/image-tracer.ts:198, 619, 878, 866
- Differs: no difference found (fuzz above). The parity scenario engine-geometry/bitmap/image-tracer covers sampling, generated palettes, blur and pathomit 0, but never passes `pal`, and imagedataToTracedata never calls tracepath2 (no caller in the old app either, so it is dead code). getImgdata is what Image > Vectorize (designer.browser.dev.js:155524) uses to read the bitmap, and it is only covered once the action is ported. The pathscan dead-end throw (image-tracer.ts:536) is documented in a comment but not tested.
- Fix: add a unit test that passes a two-color `pal` and asserts the palette is the same object, mutated by the refinement cycles; add one tracepath2 call to the parity scenario (e.g. on `batchinternodes(batchpathscan(layering(q), 0))` of the existing image), recorded from the old app, so its VertexFitter dependency stays checked.

### R4-B-033 (low): old tracer crashes on colorquantcycles 0 and numberofcolors 0; kept but not listed
- Old: public/chunk.vendor.js:233200-233249 (cycle loop never fills the index array), 233243 (palette[0] read with an empty palette)
- New: next/src/engine/geometry/image-tracer.ts:204, 230
- Differs: same in both: `colorquantcycles: 0` leaves the index array at -1, so layering reads `layers[-1]` and throws "Cannot read properties of undefined (reading '2')"; `numberofcolors: 0` throws "reading 'r'". The Vectorize action passes fixed options (8 colors, 5 cycles), so users can't reach it. Kept quirk, but QUESTIONS.md doesn't mention it.
- Fix: no code change; add a one-line note in the image-tracer.ts doc comment (or QUESTIONS.md) that these option values throw as in the old code, so a later caller with user-set options knows to validate them.

### R4-B-034 (low): tracer defaults live on the instance instead of the prototype
- Old: public/chunk.vendor.js:233139-233140 (prototype._m_w/_m_z), 233664 (prototype.gks)
- New: next/src/engine/geometry/image-tracer.ts:140-153
- Differs: the old seeds and Gaussian kernels are also on GImageTracer.prototype, and gks is one shared array; the new class has instance fields only, so `GImageTracer.prototype.gks` is undefined and each tracer allocates its own kernels. No caller reads the prototype or mutates gks, so nothing observable changes.
- Fix: none needed; optionally make gks a static readonly table referenced from the instance getter to avoid the per-instance copy.

## B part 1: engine-geometry-vertex

Checked (old line ranges from old-module-index.tsv, compared method by method with the new file, tests and parity/ported/engine-geometry-vertex.json):

- 48 GVertex, chunk.vendor.js:10195-10208, next/src/engine/geometry/vertex.ts: complete, no differences.
- 54 GVertexContainer, 10587-10790, vertex-container.ts: complete, no behaviour differences (clone reverse, split, merge, makeClockWise, DEBUG ReferenceError all match; parity vertex/container covers them).
- 59 GVertexInfo, 12309-13597, vertex-info.ts: complete. Walked _hitTestSegment/_hitTestCurve/_hitTestCurve2 (including the t1 nudge carried into the next piece), _hitUnderSegment/_evalConicReg/_hitUnderCurve/_hitUnderCurve2, hitTest, calculateBounds, getPathLength, getSegmentPoint, collinear, _collinearBezier: no behaviour differences found.
- 63 GVertexTransformer, 14128-14177, vertex-transformer.ts: complete, no differences.
- 87 GVertexSource, 23781-23904, vertex-source.ts: complete, no differences (isClockWise, toSVGPath).
- 140 quadtree, 31579-31748, quadtree.ts: complete, no differences; no parity scenario in this cluster (exercised through scene clusters), unit tests only.
- 141 GVertexPixelAligner, 31749-31866, vertex-pixel-aligner.ts: complete, both barycentric triangles and the floor branch match.
- 380 GVertexFitter, 67252-67643, vertex-fitter.ts: complete. Dropped a duplicate pure _computeCenterTangent call (old 67352), no effect. Branch coverage measured with an instrumented copy (see first entry).
- 903 GVertexTarget, 115882-115901, vertex-target.ts: complete, no differences.

### R4-B-035 (medium): fitter hook branch of _fitCubic is not reached by any test or parity scenario
- Old: public/chunk.vendor.js:67342
- New: next/src/engine/geometry/vertex-fitter.ts:139
- Differs: no difference in the code, but untested. I ran the six point sets and five configurations of parity pathops/fitter through an instrumented copy of the new fitter: the isHook path (negative error from _computeMaxError) never runs, so the refit with a zeroed end tangent (line 143), the splitPoint + 1 step (line 145), the `first < split < last` guard (line 158) and the zero split tangents (line 159) are unverified against the old app. The unit test "reports a hook as a negative error" only checks _computeMaxError's return value. This is the code path for freehand strokes with sharp reversals. (The `splitPoint == last` branch at 146-151 is dead in old and new: a hook split is at most last - 2.)
- Fix: add point sets that hit it to parity pathops/fitter, e.g. `[[1,18],[8,4],[13,7],[12,0],[11,14],[2,9]]` with `new GVertexFitter(7).fitCurve(pts, 20)` (hits isHook, splitPoint + 1 and the hook split) and `[[8,11],[13,12],[14,6],[14,12],[6,12]]` with tangents `(1,0)`/`(-1,0)` (hits the refit with a zeroed left tangent). Both found by random search; plus a unit test asserting the resulting segment count and joints.

### R4-B-036 (low): comment claims the degenerate fit gives NaN control points; it collapses them onto the end points
- Old: public/chunk.vendor.js:67486
- New: next/src/engine/geometry/vertex-fitter.ts:349
- Differs: behaviour matches (the port calls GMath.ptDist with two points, as the old code did), but the comment is wrong. GMath.ptSqrDist returns 0 when an argument is null/undefined (next/src/engine/math/math.ts:354, old 3016), so `third` is 0 and control points 1 and 2 equal the start and end points; nothing becomes NaN. Checked: `_generateBezier([P(0,0),P(5,5),P(10,0)], 0, 2, [0,0.5,1], P(0,-1), P(0,-1))` returns `[[0,0],[0,0],[10,0],[10,0]]`. The branch is hit often (124 times across the parity fitter sets), so it shapes freehand output: the old code meant control points at a third of the chord. This kept quirk isn't in QUESTIONS.md.
- Fix: rewrite the comment ("ptDist gets two points, the null check in ptSqrDist makes it 0, so the control points sit on the end points"), add a QUESTIONS.md entry for the kept quirk, and a unit test asserting the collapsed control points for the input above.

### R4-B-037 (low): kept crashes in this cluster are documented only in code comments, not in QUESTIONS.md
- Old: public/chunk.vendor.js:13234 (getPathLength `cx2`), 10757 and the other `DEBUG && console.log` lines in GVertexContainer.clone, 31744 (QuadTree.clear)
- New: next/src/engine/geometry/vertex-info.ts:1135, vertex-container.ts:14, quadtree.ts:208
- Differs: behaviour matches (all three throw as before). PORTING.md says kept quirks get a QUESTIONS.md entry, and these are crashes, which PORTING.md counts as bugs to fix later. getPathLength and QuadTree.clear have no callers in the old bundle. clone(reverse) is reachable through makeClockWise with a broken curve (parity vertex/container "cloneBad").
- Fix: add one QUESTIONS.md entry listing the three throws and their reachability, so a later fix commit has a place to start.

### R4-B-038 (low): _hitUnderCurve2's implicit-equation closure keeps the minified variable names
- Old: public/chunk.vendor.js:12835
- New: next/src/engine/geometry/vertex-info.ts:616-660
- Differs: style only. The conic closure uses the minified locals from the old code (`i, n, r, o, a, s, l, h, A, c, p, u, d, g, f, m, y, v, b, C, w`, and `e, t` for the point), which breaks the "no minified names, no copied minified code" rule. The region closure and the rest of the file use readable names.
- Fix: rename to names that describe the terms (for example `x3rd, x2nd, x1st, x0th` for the power-basis coefficients and `det*` for the cross terms) without changing the operation order, then rerun parity vertex/info-hittest to confirm the floats are unchanged.

### R4-B-039 (low): QuadTree depth limit and re-split of an already split node are untested
- Old: public/chunk.vendor.js:31579 (insert, `this.level < this.max_levels`)
- New: next/src/engine/geometry/quadtree.ts:105
- Differs: no difference in code; quadtree.test.ts never fills a node at max_levels (where boxes must stay in the node), and no parity scenario in this cluster drives the quadtree directly. The scene uses max_levels 50 (element-accelerated.ts:41), so retrieval order at depth comes only from scene-level scenarios.
- Fix: unit test with `new QuadTree(bounds, 1, 1)` inserting three boxes in the same quadrant: the level-1 child must keep all three in `objects` and have `nodes === null`; and one inserting into a split root a box that crosses the middle and overflows again, checking that existing quadrants are reused (no second split).

## B part 2: GVertexPolyBoolean (cluster engine-geometry-boolean)

- Module 264 (GVertexPolyBoolean), public/chunk.vendor.js:46723-48974 -> next/src/engine/geometry/boolean/vertex-poly-boolean.ts and poly-line-extended.ts (PolyLineExtended is the nested d.PolyLineExtended of this module). Complete: walked every method of both classes against the old code. big.ts is module 913, not part of 264, so not reviewed here.

How I checked: compared each old function side by side (branch order, operand order, side effects, null returns, thrown errors). I found no behaviour difference in the port. Kept quirks I confirmed are ported faithfully: the constructor ignoring the PIP argument, `policy || AUTO`, the `-10` placeholder trick in disableBadIntersections, `splice(indexOf(..)=-1, 1)` in the containment tree removal, the end-of-loop `n.isectPoly` alias in removeDuplicates, the swapped control points on the backward walk in clip, and the ReferenceErrors in fromVertexSource (unknown command) and joinVertices (second Move). The unit tests and scenarios.test.ts pass (19 tests).

Branch coverage, measured by wrapping methods while the merge-tool, compound-evenodd and compound-winding scenarios ran in Node (scratch harness, not in the repo): _fixCycles reaches its cut-and-reconnect path (40 _connect calls), and colinear reaches all six variants (line, quadratic and cubic pieces, curve or line on both sides of the node). _isInsideBezier, the known-matrix branch of _getContainment, all three _mergeNonIntersecting rules, xor, and the AUTO and AUTO_MAX_PASSTHROUGH branches of disableBadIntersections all run. So the parity scenarios cover the live paths well. The gaps are below.

### R4-B-040 (low): constructor comment cites a QUESTIONS.md entry that doesn't exist
- Old: public/chunk.vendor.js:46739 (`this.pip_check_policy = d.PIP_CHECK_ODDEVEN`, the argument is ignored), 46740 (`t || d.AUTO`)
- New: next/src/engine/geometry/boolean/vertex-poly-boolean.ts:91-105
- Differs: the doc comment says the winding compound shapes clipping odd-even is in QUESTIONS.md, but QUESTIONS.md has no entry about it, and none for `commonSegmentsPolicy || AUTO` either, which makes OUTSIDE (0) unusable. Behaviour matches the old code. This is a quirk users can see (a compound shape with winding fill clips its children by odd-even), so PORTING.md wants it listed.
- Fix: add two QUESTIONS.md entries: "GVertexPolyBoolean ignores its pip_check_policy argument (always odd-even)" and "common_segments_policy 0 (OUTSIDE) becomes AUTO". Point to vertex-poly-boolean.test.ts "ignores the point in polygon argument...".

### R4-B-041 (low): dead methods ported without tests
- Old: public/chunk.vendor.js:47319 (_stitch), 47373 (_reverseLoop), 47454/47461 (cleanForwards/cleanBackwards), 47529 (_getClosestTime), 47841 (removeDuplicates), 47913 getPoints(true) branch (47917-47940), 48189 (joinVertices), 48335 (numIntersections), 48535 (determineInside)
- New: poly-line-extended.ts:580, 633, 722, 731, 839, 1219, 1302-1328; vertex-poly-boolean.ts:123, 241, 481
- Differs: nothing in the old bundle calls any of these. grep over chunk.vendor.js and designer.browser.dev.js finds only their definitions (and _stitch calling _reverseLoop), and getPoints is only ever called with false or no argument. The new code doesn't call them either, and no unit test runs them, so a slip in them (for example the curve-control swap in _reverseLoop, or the end-of-ring merge in removeDuplicates) would go unnoticed if a later cluster starts using them.
- Fix: either mark them in a comment as unused in the old app (so later porters know they are unverified), or add small unit tests against values recorded from the old module, the way old-outputs.json is built. Useful cases: _stitch joining two open sub-paths that share an end point, _reverseLoop on a ring with one cubic (check that cx1/cx2 swap), and removeDuplicates on a ring with a duplicate intersection node (check the polySeg0/polySeg1 relink).

### R4-B-042 (low): fixed common-segment policy and useIntersector=true only covered by one unit test each
- Old: public/chunk.vendor.js:47637 and 47664-47667 (`t >= 0` saves the policy as -10 and restores it), 46741 (`i ? 0.125 : 4` with useIntersector)
- New: poly-line-extended.ts:983-1013; vertex-poly-boolean.ts:106-112
- Differs: no difference found. The app always passes AUTO (merge tool, chunk.vendor.js:106934/106940) or AUTO_MAX_PASSTHROUGH with useIntersector false (compound shape, 45207-45213), so the parity scenarios never reach these branches. The only cover is vertex-poly-boolean.test.ts "applies a fixed policy to common segments" (policy INSIDE on one shared-edge pair) and "splits cubics at the intersections with useIntersector" (two circles). Policy 0 can't be reached at all because of `|| AUTO`.
- Fix: optional. Add one more INSIDE-policy pair with a partial shared edge (sharedPartialEdge from boolean.spec.ts) and one curved pair with a shared segment to the unit test, using recorded old outputs.

### R4-B-043 (low): minified one-letter locals kept in the long methods
- Old: public/chunk.vendor.js:47535-47800 (disableBadIntersections), 48682-48698, 48938-48965
- New: poly-line-extended.ts:862-1166 (`o`, `h`, `t`, `P`, `N`, `U`, `V`, `H`, `O`, `X`); vertex-poly-boolean.ts:190 and 232 (`a`), 257 (`r`), 536 (`p`, `u`), 666-668 (`A`, `c`), 917-925 (`r`, `a`)
- Differs: style only. PORTING.md says the minified locals get names that say what they hold. The second half of disableBadIntersections is the hardest code in the module and keeps the minified names (U = one sub-path's intersections, V = their count, H = current intersection, O = the inside state being carried, X = the next intersection, o = start offset).
- Fix: rename, e.g. U -> run, V -> runLength, H -> isect, O -> inside, X -> following, o -> startIndex, P -> step, N -> runIndex, and `a`/`r`/`c`/`A`/`p`/`u` in the other spots to index names. Keep the evaluation order; scenarios.test.ts and the unit tests will catch slips.

