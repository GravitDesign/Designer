# Bugs in the old app that the new app fixes

Each entry: how to reproduce, old behaviour, new behaviour, and the test that
covers it. Parity tests that diverge because of a fix name the entry id
(`BUG-NNN`) in their exception list.

## BUG-001 HarfBuzz wrapper writes past its buffer and leaks memory

Old code: the HarfBuzz wrapper in chunk.vendor.js (around module 838),
`setVariations`, `getGlyphs` and the string helpers.

- Reproduce: shape text with a variable font and set font variations (the
  text inspector's variation axes), with more than two axes.
- Old: `setVariations` allocated `8 * variations.length` bytes, but
  `variations` is an object, so the length is undefined and wasm got
  malloc(0); the loop then wrote 8 bytes per axis past that block into
  whatever followed it on the HarfBuzz heap. The feature struct passed to
  hb_shape and the temporary strings for tag and language lookups were
  never freed, so every shape call leaked a little heap.
- New: allocates 8 bytes per axis and frees the block, the feature struct
  and the temporary strings after use. HarfBuzz receives the same values,
  so shaping output is unchanged and no parity scenario differs.
- Test: src/engine/text/fonts/harfbuzz.test.ts, "BUG-001: HarfBuzz
  variations memory" (fails with the old size formula). The leaks have no
  observable output; they are covered by review only.

## BUG-002 Radial gradient center is lost on reload

Old code: chunk.vendor.js module 158 (GRadialGradient), lines 33135-33148.

- Reproduce: import an SVG, PDF or Sketch file with an off-center radial
  gradient (the importers set the center through the constructor), or open
  parity/corpus/files/fills-gradients.gvdesign, whose second radial fill
  is centered at 0.3/0.7. Save and open the file again, or copy and paste
  the shape.
- Old: _serializeToBlob writes a center other than 0.5/0.5 as `_cx`/`_cy`,
  but _deserializeFromBlob reads `cx`/`cy`, which nothing writes. Every
  load (and every paste, which goes through the same blob) resets the
  center to 0.5/0.5, and the next save drops it from the file for good.
- New: reads `_cx`/`_cy`, and still accepts `cx`/`cy` when `_cx`/`_cy` are
  missing. It writes exactly what the old app writes, so files stay
  compatible both ways: the new app reads old files with their center, and
  the old app still opens new files (and loses the center there, as
  before).
- Test: src/engine/style/gradient.test.ts, "BUG-002: keeps a moved center
  through save and load" (fails with the old reader: expected 0.5 to be
  0.2).
- Parity exceptions (each `.fixed` file equals the old output except that
  the center is restored):
  - engine-model/colors/gradients: radial.roundTrip keeps `_cx`/`_cy`,
    radialCenterRoundTrip.after is drawn at 20% 90%.
  - corpus/fills-gradients/document, corpus/fills-gradients/resave and
    compat/fills-gradients/roundtrip: the 0.3/0.7 gradient keeps
    `"_cx":0.3,"_cy":0.7`. The compat cross-app test (new app saves, old
    app opens) still matches the old expected file.
  - io-export-svg/corpus/fills-gradients, io-export-pdf/corpus/fills-gradients
    and io-export-bitmap/corpus/fills-gradients: the exported gradient is
    centered at 0.3/0.7. The old app gives the same hashes when the file's
    `_cx`/`_cy` are renamed to the `cx`/`cy` its reader expects.
  - Not ported yet, will need a `.fixed` file from the new app's output:
    corpus/fills-gradients render-light, render-dark, preview and bitmap,
    platform/gvthumb/corpus/fills-gradients and
    import-export/corpus/fills-gradients (listed in exceptions.ts).

## BUG-003 An empty annotation loses its meta properties on load

Old: public/chunk.vendor.js:235463-235468 (module 1035, GEmptyAnnotation `_handleChange`, Restore branch). Port: next/src/engine/scene/annotations/empty-annotation.ts.

Reproduce: deserialize `{"@": "ann", "text": "T", "uid": "u", "name": "N", "rsv": true}` and read the properties back, or open a file that contains an "ann" annotation, then save it again.

Old: restore called `restoreProperties(blob, GEmptyAnnotation.MetaProperties, ...)`. GEmptyAnnotation never had a MetaProperties static (GNode.inherit copies statics only from GSceneNode and GNode), so nothing was restored. A loaded "ann" came back with the defaults (text, uid, name, seq, rsv, rmd, loc, typ, email, read and the rest all lost), and the next save wrote only "@" and "@id".

New: restore uses Annotation.MetaProperties and the annotation restore action, like the text and collaborative text annotations. Store was always right, so the new app writes the same keys as the old app, and the old app opens the new app's files exactly as it opens its own (it still drops the values on load). Since restore now sets `vis`, loading an "ann" saved with `vis: false` would have hit the old `_updateVisibility`, which throws because a scene node has no `_requestInvalidation`. While restoring, the port only sets or clears the Hidden flag instead. Changing `vis` outside a restore still throws, as before.

Test: special-annotations.test.ts, "BUG-003: keeps its meta properties through save and load", "BUG-003: loads a hidden one without throwing" and "BUG-003: loads one with a uid and no read list". annotations-probe.test.ts replaces the old fixture's "empty" section (restored, saved, savedKeys) with the restored values. With the old restore, the first test and the three probe checks fail. Without the restore guard, the hidden-annotation test fails with a TypeError.

Parity exceptions: none (parity/exceptions/BUG-003.json lists no scenarios). No recorded scenario restores an "ann" that has meta properties set: engine-model/nodes/defaults-restored restores a bare `{"@": "ann"}`, which gives the defaults either way, and editor-tools/annotations/untooled-types builds its "ann" in the page instead of loading it.

## BUG-005 A ready shape without handles can't be saved

Old code: chunk.vendor.js module 530 (GSimpleShape), _handleChange store
branch, lines 75182-75190 (the throw is at 75187).

- Reproduce: activate the ready-shape tool with a shape that has no
  handles (Rectangle, Oval, Right Triangle, Diamond, Regular Pentagon,
  Heptagon, Decagon, Dodecagon or Minus from the catalogue, module 1542)
  and drag it onto the canvas, then use File > Download File. The toolbar's
  ready-shapes menu that does this (GToolbar.createSimpleShapesMenu) is
  only reached through a "simpleshape" tool category that no tool entry
  has, so in the shipped app it takes the menu's own code:
  `activateTool(GSimpleShapeTool, icon, true)` and `getActiveTool().init(def)`.
- Old: store loops over `_annotationsParamVals.length`, which is null for
  a shape without handles, and throws "Cannot read properties of null
  (reading 'length')". Node.serialize fails, so no file is downloaded and
  the document can't be saved at all (data loss). Copy, paste and
  duplicate go through the same store and fail too. Shapes with handles
  (Triangle, Rounded Rectangle and the others) save fine.
- New: a shape without handles stores `"apv":"[]"`, the same key with an
  empty list. The other keys (`ssn`, `icn`, `pvp`) are unchanged. Both
  restores read `"[]"` as an empty list (the old one checks only that
  `apv` is set), which draws the same shape as null because a shape
  without handles has no parameters. Checked both ways: a file the new
  app saved with Rectangle, Oval and Minus reopens with the same shapes and
  the same blobs in the new app and in the old app, and the old app can
  then save that file again (its store now finds a list).
- Test: src/engine/scene/simple-shape.test.ts, "saves a ready shape
  without handles with an empty list and restores it (BUG-005)" (fails
  with the old store: TypeError: Cannot read properties of null (reading
  'length')).
- Parity exceptions: none. No recorded scenario contains a ready shape
  without handles, because the old app can't save one: the
  corpus/shapes-ready file leaves them out (parity/corpus/documents.ts),
  and engine-model/nodes/defaults-restored still records `"<throws>"` for
  the blob of a bare restored Ready Shape, which fails earlier, on the
  missing processor.

## BUG-004 GAdjustMultiEffect loses its dot screen, sepia and blur settings on save

Old code: chunk.vendor.js module 535 (GMultiEffect `_handleChange`), used by module 1027 (GAdjustMultiEffect).

Reproduce: create a GAdjustMultiEffect, set `GGLSepiaEffect&shp` to `{ amount: 0.9 }` and `GGLBlurEffect&shp` to `{ radius: 12, clip: true }`, serialize it and deserialize the result.

Old: GMultiEffect stores and restores only its own table, fxP and fxN (written as `{}`, because the deep copy of the defaults turned null into `{}`). The effect is saved as `{"@":"adjustMultiEffect","fxP":{},"fxN":{}}` whatever its settings are, and comes back with the defaults (sepia 0.5, blur radius 5). GColorAdjustMultiEffect overrides the handler and stores its prefixed properties, so only GAdjustMultiEffect is affected. The old inspector has no entry for GAdjustMultiEffect (selecting an element that has one throws "Invalid effect/class"), so the settings can only come from the API or a file.

New: MultiEffect also stores and restores the class's `<effect>&<property>` properties (the sub-effect properties register() adds), each only when it differs from its default, as GColorAdjustMultiEffect does. fxP and fxN are still written as `{}`, so an effect with default settings is saved exactly as before. Restoring sets the values through setProperties, which hands them to the dot screen, sepia and blur effects. Files from the old app have none of the keys and open with the defaults, as before. The old app opens a file from the new app: its restore reads only fxP and fxN and ignores the extra keys, so the effect gets the defaults there (checked in the old app: the blob with `GGLSepiaEffect&shp` and `GGLBlurEffect&shp` deserializes without error, has the default settings and is saved again without the keys).

Test: next/src/engine/style/effects/gl-backed-effects.test.ts, "stores the changed effect settings and restores them into the effects" and "opens the old app's blob with the default settings".

Parity exceptions: next/parity/exceptions/BUG-004.json (engine-model/styles/effects-catalogue: the GAdjustMultiEffect blob has the two changed keys).

## BUG-006 SVG import fails on elements named like built-in object members

Old code: the canvg fork in chunk.vendor.js module 1391, CreateElement.

- Reproduce: import (open, place or paste) an SVG that contains an element
  whose local name is a member of Object.prototype, for example
  `<constructor/>` or `<toString/>` (custom namespaces and generated SVGs can
  contain such names).
- Old: the element table was read with a plain property lookup, so the
  name found Object or Object.prototype.toString instead of the "unknown
  element" placeholder; the import then threw ("child.toScene is not a
  function" / "ElementClass is not a constructor") and nothing was
  imported.
- New: only the element table's own names count; any other name gets the
  unknown-element placeholder like every other unknown tag, and the rest of
  the SVG imports normally.
- Test: src/io/import/svg/svg-parser.test.ts, "BUG-006: element names that
  are built-in object members" (both cases fail with the old lookup).
- Parity exceptions: none. No recorded scenario contains such an element.

## BUG-007 Vector textures drop out of exports after the view painted them

Old location: chunk.vendor.js module 14, GPaintCanvas._convertImage (lines
5054-5075), reached from GPaintCanvas.createTexture (the "pattern couldn't
have been created" warning, line 4476) and drawImage.

Reproduce: open a document with a vector texture fill (a texture pattern
built from nodes, such as the star tile in the corpus file
fills-textures.gvdesign) so that the view paints it, then export the page as
PNG, JPEG, SVG or PDF, or render it with GElement.toBitmap.

Old: the texture pattern caches the bitmap of its nodes the first time it is
painted. When the view paints it, that happens inside a render pass, so the
bitmap's canvas belongs to the command recorder and the bitmap hands out the
recorder's canvas object instead of the real canvas. _convertImage swapped
that object for the real canvas when it was given a recorded paint canvas,
but not when it was given a bitmap. A recorder resolved it later at replay,
so the view itself looked right, but every plain canvas rejected it:
createPattern threw, createTexture returned no pattern, and the fill was
left out. From then on the texture was missing from toBitmap, the bitmap,
SVG and PDF exports, for as long as the cached bitmap lived. Whether an
export showed the texture depended on whether the view had painted it first.

New: _convertImage returns the bitmap's real canvas, the same as for a
paint canvas, so a texture shows up in exports regardless of what the view
painted before. The rest of the recorder emulation stays (the RecorderCanvas
stand-in and RenderScheduler.isRecordedCanvas, which only served this case,
are gone). Saved files are not affected.

Test: next/src/engine/paint/paint-canvas.test.ts, "bitmaps of recorded
canvases": a bitmap made during a render pass gives a pattern of its real
canvas on a plain canvas without the warning, and draws there. Both tests
fail with the old behaviour (the stand-in gives no pattern and logs the
warning; drawImage throws).

Parity exceptions: next/parity/exceptions/BUG-007.json. No scenario enabled
for the new app shows the difference yet, because the new app has no view
(nothing paints in a render pass). Pending, to get .fixed files once they are
enabled: corpus/fills-textures/bitmap (the star tile is an empty cream
square in the old output) and import-export/corpus/fills-textures (PNG,
JPEG, SVG and PDF exports without the star). The preview, the canvas renders
and the gvthumb thumbnail show the star in the old output and need nothing.

## BUG-008 EPS/PS files with JPEG images can't be imported

Old code: server.js (no cross-origin isolation headers); the page side of
the JPEG handshake in chunk.vendor.js module 1404, GEPSParser jpeg (lines
251237-251270); the worker side in public/pscore.js, PSCore
waitForResponse and the DCTDecode filter.

- Reproduce: import (open or place) an EPS/PS file whose image data goes
  through DCTDecode, for example an image dict with `/DataSource currentfile
  /ASCII85Decode filter /DCTDecode filter`.
- Old: the PostScript worker can't decode JPEGs, so it asks the page and
  blocks in Atomics.wait on a SharedArrayBuffer until the page answers. The
  old server sent no COOP/COEP headers, so the page had no
  SharedArrayBuffer and every JPEG failed at once with the "Parts of the
  EPS file aren't supported..." message: error "02" and no image when the
  data isn't a JPEG the image reader accepts, error "0" and an all-black
  image of the right size for a real JPEG (image-dct-rgb.eps). With
  SharedArrayBuffer the handshake was broken too: the page signalled with
  Atomics.wake, which browsers have removed, so it threw and the worker
  slept until its 300-second timeout; the page told a size request by a
  byte view of length 2, which the 8-byte size area never has, so it wrote
  pixels where the size belonged; and the worker asked for as many bytes
  as its reader guessed (width x height for a gray image), so gray and
  CMYK images got the first part of the RGBA bytes instead of their
  samples.
- New: the server (and with it the Electron app's embedded server) sends
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless`, so the page and its
  workers are cross-origin isolated. credentialless rather than
  require-corp, so cross-origin images and fonts without CORS headers still
  load. Chromium supports it since 96 (Electron 45 runs Chromium 156 and is
  isolated), Firefox since 119; Safari ignores credentialless, so there the
  page is not isolated and JPEGs in EPS files still report error "02" as
  before. The handshake (src/workers/ps/jpeg.ts) names its request kind:
  the worker asks for the size, then for width x height RGBA pixels; the
  page answers with Atomics.notify, also when the browser can't decode the
  image (size 0 x 0, which the worker reports as error "02"). DCTDecode
  then delivers the JPEG's own components (gray, RGB or CMYK, read from
  the frame header) like PostScript does. The imported image equals the
  browser's decode of the JPEG pixel for pixel, and equals the old app's
  result for the same JPEG placed as a bitmap. A CMYK JPEG arrives as the
  browser's RGB turned back into CMYK without black, which the app's CMYK
  profile then converts; its colors can differ from the browser's view of
  the JPEG.
- Test: src/io/import/eps/eps-jpeg-import.test.ts runs EPSImport with the
  interpreter in a worker thread against Chromium-decoded pixels of RGB,
  gray and CMYK JPEG fixtures and the parity fixture filter-dct-file.ps
  (all four hang with the old code; with only Atomics.wake fixed, gray,
  CMYK and the undecodable JPEG still fail). The handshake on each side:
  src/workers/ps/jpeg.test.ts and the "EPSParser.jpeg" tests in
  src/io/import/eps/eps-parser.test.ts (fail with the old code).
  server/cross-origin-isolation.test.ts checks the headers on every kind
  of response. The interpreter recordings of filter-dct-file.ps and
  fixture-image-dct.eps get `.fixed.json` versions that differ from the
  old worker's only in the jpeg calls (checked by
  interpreter.recorded.test.ts).
- Parity exceptions: io-import-pdf-eps/eps/image-dct-rgb-eps (fixture
  image-dct-rgb.eps, an RGB JPEG photo next to a red square). The old app
  reports the "Parts of the EPS file aren't supported..." message (error
  "0") and leaves an all-black 80 x 60 image where the photo goes; the
  `.fixed` output has the decoded photo and no message, and the rest of
  the group is the same. io-import-pdf-eps/eps/filter-dct-file-ps embeds
  bytes no browser decodes and still ends with error "02" and an empty
  group in both apps; io-import-pdf-eps/eps/image-dct-eps and
  import-export/import/open/eps-image-dct.eps.state stop at ASCIIHexDecode,
  which the worker lacks, before the JPEG.

## BUG-130 Port in use: the friendly error box never shows

Old code: electron-main.js (the port-in-use handler) and routes/ws.js (the
license WebSocket server attached to the same HTTP server).

- Reproduce: start the desktop app while another program listens on
  127.0.0.1:47823 (the fixed port since #6).
- Old: the license WebSocket server re-emitted the listen error on itself,
  where nothing listened, so it became an uncaught exception in the main
  process. Electron showed "A JavaScript error occurred in the main
  process", no window opened, the process kept running and held the
  single-instance lock, so the next start did nothing either. The app's
  own EADDRINUSE handler, which shows a readable message and quits, never
  ran.
- New: the new server has no license WebSocket server (it refuses
  upgrades), and electron/main.ts no longer re-throws the error, so the
  handler runs: a "Port 47823 is already in use..." box, then the app
  quits with code 0.
- Test: parity electron/port-in-use (new app, expected
  `port-in-use.fixed.json`: exit code 0, the showErrorBox event with that
  text, will-quit). It fails with the re-throwing listener back in place.
- Parity exceptions: electron/port-in-use. The .fixed file is the new
  app's recorded output; the old expected file records the uncaught
  exception box, a process that has to be killed and no will-quit.
## BUG-009 A painting error leaves the render phase on and the view stops repainting

Old code: chunk.vendor.js module 663, _paintAndRenderInternal (93530-93568,
scene.paint outside the try); module 103, tryRunRendering (25480-25489) and
render (the job registered at 25683 and only removed at 26022).

- Reproduce: make any element's paint throw (a bug in an effect, a broken
  shape), for example by patching an element's paint to throw, and let the
  view repaint. Then change anything and watch the view.
- Old: the tile renderer called scene.paint outside its try. An exception
  of the painting code left paintAndRender with the render phase still on,
  so every later repaint only queued or logged "render phase render,
  waiting" and thumbnails (page and symbol previews, which go through
  tryRunRendering while a render phase runs) queued forever. Only canvas
  errors (thrown at replay, inside the try) took the clean path. In
  tryRunRendering, a painting error also left the phase on, and a canvas
  error at replay cleared the render parameters and left its render job
  registered, so every later tryRunRendering went into the queue and never
  ran.
- New: the tile renderer finishes the canvas and the render phase in a
  finally and treats every painting error like the old canvas errors: it
  logs "Render error at canvas N:...", cleans up, calls back with
  (null, true, false) and goes on with the next request. tryRunRendering
  ends the render phase on any error, keeps the render parameters, leaves
  no job behind and starts the next queued rendering before it rethrows the
  error.
- Test: src/engine/paint/tile-cache.test.ts, "fails the tile on other
  painting errors and keeps painting afterwards (BUG-009)", and
  src/engine/paint/render-scheduler.test.ts, "ends the render phase on a
  canvas error in tryRunRendering and keeps rendering (BUG-009)" and "ends
  the render phase when the painting code itself throws (BUG-009)". All
  three fail with the old code (the error escapes the tile with the phase
  on; the parameters are cleared and the next rendering waits in the queue;
  the phase stays on).
- Parity exceptions: none. No recorded scenario paints an element that
  throws.

## BUG-010 setText leaves the text core's change events locked while a font is missing

Old code: chunk.vendor.js module 70, GText.setText (16684-16690).

- Reproduce: open a file whose text uses a font that isn't available yet
  (a Google font still loading, a local font that is gone). Restoring the
  text calls setText(content, true, true) with locked change events.
- Old: setText locked the text core's change events, found a run whose font
  wasn't resolved, marked the text to be set later and returned without
  unlocking. The core stayed locked until some later locked setText got
  through, so inline edits in that time sent no change events and never
  reached the text's content, and a save could write the stale text.
- New: setText unlocks the change events before it returns to wait for the
  font. The deferred setText once the font arrives is unchanged.
- Test: src/engine/text/text.test.ts, "unlocks the change events when
  setText waits for a missing font (BUG-010)" (the core's lock is 1 after
  the call with the old code, 0 now; old-text.json still records the old
  1).
- Parity exceptions: none. No recorded scenario restores a text with a
  missing font and then reads the lock or edits the text.

## BUG-011 A mask in a plain group erases everything painted before it

Old code: chunk.vendor.js module 911, GElement.Stylable _paintStyle (the
separate-canvas choice at 117590); module 122, GGroup._paintStyleContent
(28134).

- Reproduce: group a shape with another shape on top, give the top shape
  the blend mode Mask or Inverse mask in the inspector (appearance blend
  select), and leave the group at 100% opacity with normal blend and no
  effect. Or open parity/corpus/files/masks.gvdesign.
- Old: a group paints into its own canvas only when its opacity or blend
  mode needs one. A plain group painted its children straight onto the
  canvas below, so the masking child's destination-in (Mask) or
  destination-out (Inverse mask) composite hit that whole canvas: the page
  background and every element painted before the group were erased
  outside the mask (Mask) or inside it (Inverse mask), and in the view the
  page showed the transparency checkerboard. Only groups with an effect,
  an opacity below 100% or a blend mode masked just their own children. A
  masking child directly in a layer erased the page the same way.
- New: a group, layer or symbol with a direct child whose blend is Mask or
  Inverse mask paints through its own canvas (the same path a group with
  opacity takes), so the mask cuts only the siblings painted before it in
  that container. Saved files are unchanged.
- Test: src/engine/scene/group.test.ts, "with a masking child (BUG-011)":
  a plain group and a layer with an "m" or "!m" child paint through their
  own canvas, and a mask in a nested group isolates only that group. All
  four fail with the old code.
- Parity exceptions: parity/exceptions/BUG-011.json. Checked against the
  old app: with every masking group of masks.gvdesign set to an opacity of
  0.999999 (which isolates it there without changing a pixel), the old
  app's PNG and JPEG exports equal the new app's byte for byte, so
  io-export-bitmap/corpus/masks and the corpus preview, bitmap and view
  renders differ only by the isolation. The PDF export ignores mask blends
  in both apps (it draws the mask shapes as plain black shapes); its
  `.fixed` output differs from the old one only in a q/Q pair around each
  masking group and the gradient pattern matrices of the shapes inside
  them, which move by (-2, +18) in PDF space. That puts the gradients
  exactly on their rectangles (checked against the gradient stops); the
  old export drew them 2 px to the right. Pending:
  platform/gvthumb/corpus/masks and import-export/corpus/masks.

## BUG-012 Offset drops inset parts of an open path that come near the source

Old code: chunk.vendor.js module 651, GVertexOffsetter.generatePolyOffset
(87884-87903, the loop `B < w.count` at 87896).

- Reproduce: offset an open path to one side only on the inset side, where
  the inset crosses itself (a tight curve next to a long line): Modify >
  Offset with a negative value, Vectorize Border of an inside border, or
  inside text on a path. For example the path `M 42 94 L 25 13 C ...`
  of the pinned unit test, offset by 30 or 60.
- Old: the trimmed inset is split where it crosses itself, and each part
  that comes near the source again is meant to be clipped around the
  source's ends, as the outset side does with _excludeCircleInside. The
  inset loop ran up to `sourceHits.count`, which an array doesn't have, so
  it never ran and every such part was dropped: the inset lost pieces the
  outset of the same path keeps, and in the pinned case the result was
  empty.
- New: the inset loop runs over the source hits and clips a part near the
  path's ends with _excludeCircleInside, like the outset loop. Closed paths
  and two-sided offsets are not affected. The clipped parts have the same
  quality as the outset's: with an offset much larger than the path's
  curvature both sides can still cross the source. An inset of 0 on an
  open path now reaches the same "Cannot read properties of null (reading
  'point')" as an outset of 0 (QUESTIONS.md "Offsetter: offset 0 on an
  open path with both sides throws"); no caller offsets by 0. The clipping
  reached the old slip of QUESTIONS.md "Offsetter: the rest of a cut arc
  starts at an unset cut point" on the inset side, where it put NaN into
  the output, so the rest of a cut arc with no earlier line cut now starts
  at the second circle hit.
- Test: src/engine/geometry/vertex-offsetter.test.ts, "clips inset-only
  parts of an open path that touch the source near its ends (BUG-012)"
  (empty with the old code), and in vertex-offsetter.old-outputs.test.ts
  "keeps the inset parts of open paths that the old code dropped
  (BUG-012)". 33 of the 1,214 recorded old outputs change; their new
  outputs are in test-data/old-offsetter-outputs.fixed.json. Checked
  numerically: 32 are one-sided insets of open paths (one with a closed
  and an open sub-path), the 33rd (random snap 167) is a two-sided offset
  that only changes through the cut-arc start. Each new output has more
  vertices than the old one, none contains NaN, and every point of the old
  output lies on the new output (largest distance 0.000 after flattening
  both curves), so the fix only adds the parts the old code dropped. The
  one case that now throws is the offset-0 case above (random rr 36).
- Parity exceptions: none. No parity scenario offsets an open path on the
  inset side only (engine-geometry/pathops covers closed paths and
  two-sided offsets; all of them still match).

## BUG-013 Offset tangent point uses dx for y

Old code: chunk.vendor.js module 651, GVertexOffsetter._getSegmToArcSqrDist
(89212-89213, `g = c[0] * p + o.getY()` with p = dx).

- Reproduce: offset a path where a straight segment of the offset outline
  is exactly tangent to the circle of an arc of the source (rare; it
  decides which parts _gcppFilter keeps). Directly: the squared distance
  between the line (-20, 10)-(20, 10) and the quarter arc from (10, 0) to
  (0, 10) around (0, 0).
- Old: when the line touched the circle, the touch point was computed as
  (p1.x + t * dx, p1.y + t * dx) instead of p1.y + t * dy, so for any line
  that isn't at 45 degrees it landed off the line, the "touch point inside
  the segment" test failed and the distance fell back to the end points
  (200 instead of 0 in the example). An offset part that touches the
  source could then be kept although it should be dropped.
- New: the touch point uses dy for y.
- Test: src/engine/geometry/vertex-offsetter.test.ts, "puts the tangent
  point of the segment-to-arc distance on the line (BUG-013)" (200 with
  the old code). In vertex-offsetter.old-outputs.test.ts six of the
  recorded helper cases change, all to 0, listed in
  test-data/old-offsetter-outputs.fixed.json. Checked for each: the line
  touches the circle at a point of the arc that start, center and bulge
  define, or passes through the arc's given end point, so 0 is the right
  distance. None of the 1,214 recorded offset outputs changes.
- Parity exceptions: none. engine-geometry/pathops/offsetter still matches
  the old app.

## BUG-014 Boolean intersections: one collinear pair drops every later hit, quadratic-vs-curve hits unlimited

Old code: chunk.vendor.js module 187, _treeIntersect (38653-38662,
`f.splice(P)`, and 38669, `T.cp2 ? (I.cp2 ? w < 9 : w < 6) : I.cp2 ? 6 : 4`).

- Reproduce: path operations (Union, Subtract, Intersect, Difference) and
  compound shapes on the intersector path that keeps Béziers (compound
  shapes with many children, or after the 10 s timeout), with two paths
  that share a straight edge piece next to curves, or with a quadratic
  curve (from an import) against another curve.
- Old: when a segment pair turned out to be collinear, the hits already
  found for that pair were removed with `splice(index)`, which also removed
  every hit found after it, of any other pair, so the boolean worked with
  intersections missing. And the number of hits kept per curve pair was
  limited (cubic-cubic 9, cubic-quadratic 6, curve-line 3 or 2) except
  when the first curve was a quadratic and the other one a curve: there
  the expression gave the constants 6 or 4, which are always true, so every
  hit of the flattened curves was added. The result depended on the
  argument order: a quadratic against a nearly equal cubic gave 8 hits,
  the same cubic against the quadratic 6.
- New: only the collinear pair's own hits are removed
  (`splice(index, 1)`), and a quadratic against a cubic or a quadratic is
  limited to 6 or 4 hits, like the other way round.
- Test: src/engine/geometry/boolean/fixture-cases.test.ts, the targeted
  case "block.quadCubicNear" and "matches the seeded differential fuzz,
  seed 11", which now compare with old-fixtures.fixed.json (both fail with
  the old code), and "has fixed outputs only for recorded cases they change
  (BUG-014)". Three of the 2,045 recorded outputs change, checked against
  full (unhashed) outputs of the old and the new code:
  - block.quadCubicNear: the first 6 of the old 8 hits, the same 6 hits
    the old code already gave with the arguments swapped.
  - fuzz 11.23.bool0 and 11.23.bool5 (the same shapes, two settings): the
    same 7 intersections; the result of clipOp(2) keeps one more
    vertex, (78.429, 54.411), which lies on the straight edge from
    (86.635, 70) to (69.108, 36.701). The shape is the same.
  The collinear.* cases don't change.
- Parity exceptions: none. The engine-geometry/boolean and pathops
  scenarios still match the old app.

## BUG-015 Fonts whose weight is only in the typographic subfamily get weight 400

Old code: chunk.vendor.js module 726, GOpenTypeUtil.getOpenTypeInfo
(100134-100180).

- Reproduce: import OpenSans-Light.ttf, OpenSans-SemiBoldItalic.ttf or
  OpenSans-ExtraBold.ttf (Fonts > Import, or a local font in the desktop
  app), or any font family that keeps its extra weights in the
  typographic subfamily name.
- Old: weight and style were read from the subfamily name (name id 2)
  alone. Fonts with more than the four classic styles name only "Regular",
  "Italic", "Bold" or "Bold Italic" there and put the real weight into the
  typographic subfamily (id 17), so Open Sans Light, SemiBold and
  ExtraBold (and their italics) all came out as weight 400. They showed up
  as Regular or Italic duplicates, and a text asking for weight 600 never
  found the SemiBold file. Noto Sans CJK KR Bold got 400 too.
- New: the weight and the style come from the typographic subfamily when
  it names them, and from the subfamily otherwise, with the same keyword
  rules as before. Open Sans Light is 300, SemiBold 600, ExtraBold 800
  (italics keep their style), Noto Sans CJK KR Bold 700. Fonts without a
  typographic subfamily are read as before; the family name is unchanged.
- Test: src/engine/text/fonts/open-type-font.test.ts, "reports weight 600
  for OpenSans SemiBoldItalic from its typographic subfamily (BUG-015)"
  and "reads names and styles like the old reader, weights also from the
  typographic subfamily (BUG-015)", which compares the old recording
  (__fixtures__/old-fonts.json) with these seven weights changed and
  nothing else; the collection tests do the same for the collection's
  first font, OpenSans-Light. All fail with the old reader. font-probe.ts
  now asks for the light font of the test collection by the weight the
  reader reports (400 in the old app, 300 now), so its table offsets are
  still compared.
- Parity exceptions: parity/exceptions/BUG-015.json.
  engine-model/extras/opentype-helpers (Light 300, SemiBoldItalic 600,
  ExtraBold 800) and engine-model/fonts/browser-probe (the collection's
  first font 300); each `.fixed` file differs from the old output only in
  those weights (checked with a field by field diff). Pending, not
  enabled for the new app yet: electron/settings-persist,
  electron/migration-old-userdata and platform/storage/old-session-profile
  import an ExtraBold font (OpenSans-ExtraBold renamed to "Mig Fonts") and
  record it as weight 400; once enabled they should get 800.

## BUG-016 Restored ready shapes skip their base constructors

Old code: chunk.vendor.js module 530, GSimpleShape constructor
(75048-75078, the base constructor only inside `if (e)`) and restore
(75195-75210).

- Reproduce: draw a ready shape (Toolbar > ready shapes), save and reopen
  the file, or duplicate, copy and paste it, or undo its deletion. Every
  one of these creates the shape without a processor and restores it from
  its blob.
- Old: without a processor the constructor did nothing, not even the base
  constructors. The restore set the saved properties, but `_paintSharp`
  and the reference list `$refs` were never created. A loaded ready shape
  was painted without pixel snapping in the view (soft edges where a
  newly drawn one is crisp), and linking it to a shared style called
  `$refs.concat` on undefined.
- New: the constructor runs the base constructors and sets pixel snapping
  in both cases; with a processor it goes on as before. Saved files are
  unchanged.
- Test: src/engine/scene/simple-shape.test.ts, "restores a ready shape
  with pixel snapping and a reference list (BUG-016)": after a save and a
  load the shape snaps to pixels, has an empty reference list and records
  a shared style link. It fails with the old constructor (`_paintSharp`
  false, `$refs` undefined).
- Parity exceptions: parity/exceptions/BUG-016.json,
  corpus/shapes-ready/render-light and render-dark: the loaded ready shapes
  are drawn pixel-snapped. Checked that all 9,725 differing pixels lie
  within 2 px of a shape edge in the old render; fills are unchanged.
  engine-model/nodes/defaults-constructed: a ready shape constructed
  without a processor now reports the base defaults instead of undefined
  for its 28 properties; each equals the value of a constructed rectangle
  (`sref` stays undefined), and the rest of the output is unchanged.
  engine-model/special/ready-shape, the preview, the bitmap and the
  exports of shapes-ready.gvdesign don't snap and still match.

## BUG-017 An image dropped into an image grid gets a NaN itrf

Old code: chunk.vendor.js module 534, GImageGrid addImage (75697-75722)
and _prepareVertices (75588-75630).

- Reproduce: open a file that holds an image grid and drop an image onto
  one of its cells with the select tool (or call addImage), then let the
  image load.
- Old: addImage stored the offset as an [x, y] pair at the cell's index
  (`off[i] = [o, o]`), but _prepareVertices reads two plain numbers per
  cell (`off[2i]`, `off[2i + 1]`). For the first cell it added the pair to
  a number, so the image's itrf got a NaN translation, the image wasn't
  painted and the file saved `null` for it; for later cells it read the
  wrong slots or none.
- New: addImage stores two numbers per cell and fills the slots of earlier
  cells with 0. Files from the old app that hold [x, y] pairs are still
  read pair by pair, and the next addImage turns them into the flat form.
  The offset keeps the old value (the x distance to the cell center for
  both coordinates).
- Test: src/engine/scene/image-grid.test.ts, "fits a dropped image with a
  finite itrf, two offset numbers per cell (BUG-017)" (fails with the old
  addImage) and "puts an image into the nearest cell, saving the x offset
  for both coordinates", now with the flat offsets.
- Parity exceptions: parity/exceptions/BUG-017.json.
  engine-model/special/image-grid stores `off` as `[o, o]` instead of
  `[[o, o]]` (same value). engine-model/image/grid-images has the itrf
  translation 1.5714285714285705 instead of NaN; checked in the old app:
  the same grid with its offsets rewritten flat before the image loads
  gives exactly this itrf. engine-model/image/paint-grid now paints that
  image (29 pixels in the cell's corner). Nothing else in the three
  outputs changes.

## BUG-018 The broken-image cross ignores the crop origin

Old code: chunk.vendor.js module 95, GImage._paintImageCanvas
(24921-24936).

- Reproduce: crop an image (so its crop box doesn't start at 0, 0), then
  make its source fail to load, for example by opening a file whose image
  url no longer resolves.
- Old: the grey placeholder box was drawn at (px, py, pw, ph), but the red
  cross went from (px, py) to (pw, ph) and from (pw, py) to (px, ph): the
  sizes were used as end coordinates, so for a crop box away from 0 the
  cross ended inside the box and didn't reach its other corners.
- New: the lines go from (px, py) to (px + pw, py + ph) and from
  (px + pw, py) to (px, py + ph). With a crop box at 0, 0 nothing changes.
- Test: src/engine/scene/image.test.ts, "draws the error cross corner to
  corner of a crop box that doesn't start at 0 (BUG-018)" (fails with the
  old end points).
- Parity exceptions: parity/exceptions/BUG-018.json,
  engine-model/image/paint-error (px 4, py 2, pw 30, ph 20): the cross now
  reaches all four corners of the 30 x 20 bitmap, the old one only the top
  left. Every differing pixel lies on the old or the new lines (checked
  pixel by pixel); the grey box is unchanged.

## BUG-019 Contact shadow grows its kept box on every padding call

Old code: chunk.vendor.js module 1028, GContactShadowEffect
getEffectPadding (234828-234852, `_savedBBox = _savedBBox.expanded(...)`).

- Reproduce: give an element a contact shadow together with another
  effect that has a padding (a drop shadow, a blur) and let the view paint
  it several times, for example by moving another element nearby.
- Old: getEffectPadding kept the element box and grew it by the other
  effects' padding in place. Every later call without a new box (the
  overlay paint calls it on every paint) grew the kept box again, so the
  padding and the box the shadow is drawn from got larger with each paint
  until the paint box was computed again.
- New: the element box is kept as it is, and the grown box is computed
  from it on each call. Repeated calls give the same padding and the same
  box.
- Test: src/engine/style/effects/effects-catalogue.test.ts, "the contact
  shadow keeps the box grown by the other effects, once (BUG-019)": a
  second and a third call return the first call's padding (with the old
  code the second call's bottom padding grows from a 74 to an 88 high
  box).
- Parity exceptions: none. The recorded renders and exports with contact
  shadows (engine-model/render effect cases, corpus effects-extra-shadows)
  compute the padding with a new box each time and still match.

## BUG-020 A fake text gives only its first backup outline to vertex readers

Old code: chunk.vendor.js module 70, GText readVertex (16880-16887) and
hasVertexForRead (around 16915-16921).

- Reproduce: open a file with a text of several style runs whose font is
  missing (or a text imported from a PDF), so the text is a fake text
  drawn from its backup outlines (`_bkpPath`, one per run). Look at it in
  outline view, hover it, or read its vertices (outline export, Vectorize
  Text).
- Old: readVertex and hasVertexForRead read the backup path at
  `_vertexIterator`, which rewindVertices set to 0 and nothing ever moved
  on. Only the first run's outline came out, while painting drew all
  runs, so the outline view, hover and selection showed only the first
  run.
- New: when one backup outline is read to its end, reading goes on with
  the next one; hasVertexForRead looks at the current and the remaining
  ones.
- Test: src/engine/text/text.test.ts, "reads every backup outline of a
  fake text (BUG-020)": the outline of the two-run fake text starts with
  the first run's vertices and its bounds are the union of both runs'
  bounds (the old outline had the first run's bounds alone). The probe's
  fakeVertices and the three fake-text undo cases (fakeMoved,
  fakeMoveUndone, fakeMoveRedone) now compare with
  __fixtures__/old-text.fixed.json; they differ from old-text.json only in
  the outline's vertex digest and its width (32.16 to 78.84, and 64.32 to
  157.68 at twice the size), which is the width of the text's source box.
  All four fail with the old reader.
- Parity exceptions: none. No parity scenario reads the vertices of a fake
  text with more than one run (engine-model/text still matches).

## BUG-021 replaceFonts writes the style twice and never the weight

Old code: chunk.vendor.js module 70, GText.replaceFonts (17982-17986).

- Reproduce: open a file whose text uses a missing font and replace it
  with a font of another weight, through the missing fonts dialog
  (Replace), the text inspector's font replacement or an imported font
  that takes over a missing one. Save the file.
- Old: with a font as the replacement and the content updated, replaceFonts
  assigned `$_tfs = font.getWeight()` and then `$_tfs = font.getStyle()`.
  The second write won and `_tfw` was never set, so the text's own weight
  in `content` and in the file stayed stale (or missing) while the runs
  had the new weight.
- New: the weight goes to `_tfw` and the style to `_tfs`.
- Test: src/engine/text/text.test.ts, "replaces fonts (fontSetterContent)"
  and "replaces fonts (fontContent)": the stored blob now has `_tfw: 700`
  for the bold replacement, where old-text.json has no `_tfw`; everything
  else equals the old recording. Both fail with the old code.
- Parity exceptions: none. No recorded scenario replaces a font
  (ui/dialog/missing-fonts only shows the dialog).

## BUG-022 Text border pattern box reads the text's own `_ba`

Old code: chunk.vendor.js module 70, GText._paintBorder (18615-18618).

- Reproduce: give a text an Inside border with a gradient or texture
  pattern and compare the pattern with the same border on a rectangle.
- Old: before building the border's pattern, the box the pattern spans is
  widened by the border's reach unless the border is inside. The check
  read `$_ba` of the text, which a text never has (it is a border layer
  property), so every text border pattern box was widened, also for
  Inside borders, where shapes keep the box as it is. The gradient or
  texture of an inside text border was stretched over a box larger than
  the text.
- New: the check reads the border layer's alignment, as shapes do
  (shape.ts). Center borders still widen by half the width, outside
  borders by the full width.
- Test: src/engine/text/text.test.ts, "widens the border's pattern box
  only for borders that aren't inside (BUG-022)": for a 100 x 50 pattern
  box and a 10 wide border, Inside keeps 100 x 50, Center gives 110 x 60
  and Outside 120 x 70. The old code widens the Inside box too.
- Parity exceptions: none. No recorded scenario has a text with an inside
  pattern border; the corpus, export and engine-model text scenarios still
  match.

## BUG-023 deCRLFify replaces only the first line break

Old code: chunk.vendor.js module 161, GTLUtil.deCRLFify (35257-35263).

- Reproduce: set or paste a text with several Windows (CR LF) or classic
  Mac (CR) line breaks into the text core, for example words from a PDF
  import or a string with lone CR characters.
- Old: deCRLFify called `replace("\r\n", "\n")` and `replace("\r", "\n")`
  with strings, which replace only the first match each. Every later
  CR LF kept its CR and every later lone CR stayed, so stray CR characters
  were laid out and saved (`a\r\nb\r\nc\rd` became `a\nb\n\nc\rd`: the
  second CR LF turned into two breaks and the lone CR stayed). GText
  already turns CR LF into LF before it reaches the core, so mainly lone
  CR characters were affected.
- New: both replacements are global, so every CR LF and every lone CR
  becomes one LF. Tabs still become three spaces.
- Test: src/engine/text/gtl/tl-core.test.ts, "normalizes every line break
  (BUG-023)": `deCRLFify("a\r\nb\r\nc\rd\te\r")` gives `"a\nb\nc\nd   e\n"`
  (the old recording, still checked, is `"a\nb\n\nc\rd   e\r"`).
- Parity exceptions: none. No recorded scenario sets a text with more than
  one line break of these kinds through the text core.

## BUG-024 HarfBuzz clusters used as UTF-16 indexes

Old code: chunk.vendor.js module 587, GOpenTypeFont.stringToGlyphs
(82205-82250).

- Reproduce: put a non-ASCII text (accented letters, Arabic, Hebrew,
  Devanagari, CJK) on a path and export it as SVG or PDF, or use a text
  pattern on such a text. These read the `text` of each shaped glyph.
- Old: HarfBuzz reports each glyph's cluster as a UTF-8 byte offset into
  the text, and the old code used it as a string index: `text.slice(
  cluster, nextCluster)`. With characters of more than one byte the slices
  drifted: "éà" (decomposed) gave "éa" and "̀", "日本語のテキスト" gave
  "日本語", "のテキ", "スト" and then empty strings, and right-to-left text
  got mostly empty strings, so text-on-path exports showed shifted or
  missing characters. Carets and selection don't use it.
- New: the byte offsets are mapped to string indexes. The first glyph of a
  cluster gets the cluster's characters (up to the next cluster), the
  other glyphs of the same cluster get "". Positions, advances and glyph
  ids are unchanged.
- Test: src/engine/text/fonts/open-type-font.test.ts, "HarfBuzz glyph
  texts (BUG-024)": clusterTexts maps UTF-8 offsets (two- and four-byte
  characters, a cluster of two glyphs, right-to-left order), the shaped
  "éà" and Hebrew texts give one character per glyph, and every entry of
  __fixtures__/old-fonts.fixed.json differs from old-fonts.json only in
  the glyph texts (187 shaping entries). The stringToGlyphs tests compare
  with those entries; they fail with the old code. harfbuzz.test.ts still
  checks that HarfBuzz itself reports byte offsets.
- Parity exceptions: parity/exceptions/BUG-024.json,
  engine-model/fonts/browser-probe: only the text field of the HarfBuzz
  glyphs differs (519 values, checked field by field). The io-export-svg,
  io-export-pdf and engine-model/text scenarios still match.

## BUG-025 Text core undo splices at the start and rolls back in a cascade

Old code: chunk.vendor.js module 652, makeEditCommand (89677-89688) and
the rollback in the layout (around 89759).

- Reproduce: in the text core, edit a text (setText on a range, toggle a
  list) and undo it, or let a layout fail after an edit so the document
  rolls back through its undo log ("A bug somewhere has produced an
  invalid state - rolling back").
- Old: an edit command logged its inverse as
  `makeEditCommand(document, start, words.length, removed)`, the
  signature of carota's free function, so the inverse got the document as
  its start and spliced the removed words in at index 0 with a wrong
  count. Undo broke the word list (stray words, `"word:undef"`), the
  layout failed, and each failure rolled back once more until the undo
  log was empty; afterwards the text had no frame and plainText and saving
  threw. The editor doesn't call undo, so in the app this only follows
  another layout failure.
- New: the inverse is `makeEditCommand(start, words.length, removed)`: it
  puts the removed words back where they were. Undo restores the text
  before the edit, redo the edited text, and no rollback happens.
- Test: src/engine/text/gtl/document.test.ts, "undoes and redoes <case>
  (BUG-025)" for setText, setTextAtStart, twoEdits, toggleList and
  toggleListOff, compared with __fixtures__/old-gtl-document.fixed.json:
  every step keeps a frame and needs no rollback, where the old recording
  breaks; and "undoes a setText back to the text before it (BUG-025)".
  All fail with the old code. The "fails to load, splice or lay out" cases
  don't change.
- Parity exceptions: none. No recorded scenario undoes inside the text
  core.

## BUG-026 Undo, Save, Redo of an inserted image makes the next save fail

Old code: chunk.vendor.js module 227, GDictionary serialize (44947-44956,
sanitize then flush); module 658, GSceneDictionary (92130-92374, the throw
at 92322).

- Reproduce: Modify > Flatten (F7) a shape, Paste Image or drop a PNG
  file, then Undo, save the file, and Redo. Save again. The same happens
  for Delete, Save, Undo of an image.
- Old: every save flushes the scene dictionary and deletes entries that
  nothing refers to. After the Undo the image is out of the scene, so its
  entry (the image data) was deleted, while the undo history still held
  the image with its `dictionary://` url. Redo inserted it again, the
  dictionary found no entry for the url, and every later save threw
  "Missing entry value for dictionary://..."; the document couldn't be
  saved any more and the image data was gone.
- New: the save still writes only the entries something refers to, so
  files are unchanged, but the scene dictionary keeps the entries it drops
  aside. When a node with such a url is inserted again (or a save finds a
  node pointing at one), the entry comes back with its data. Loading a
  document clears the kept entries. The kept entry gives up its decoded
  canvas, which is decoded again when needed.
- Test: src/engine/style/scene-dictionary.test.ts, "keeps the data of an
  image removed before a save for when it comes back (BUG-026)": insert,
  remove, save (no entries written), insert again, save: the entry is
  written with its data and one reference. Fails with the old dictionary
  (the value is gone). "recreates a missing entry from the stored url and
  says so" still throws for an entry deleted outside a flush.
- Parity exceptions: parity/exceptions/BUG-026.json.
  editor-actions/exec/modify.path2bmp and modify.path2bmp--two: the
  document after Redo is "same as after" (it serializes like the
  document right after Flatten) instead of the serialize error; nothing
  else in the output changes. Pending, not enabled for the new app yet:
  editor-actions/shortcuts/modify (modify.path2bmp case),
  editor-actions/clipboard/paste-events (paste.paste) and
  editor-actions/dnd/drops (png-file, two-files).
## BUG-040 Toggle marquee over a highlighted selected node throws

Old code: chunk.vendor.js module 82 (GEditor
highlightSelectablesUnderCollision), line 20723.

- Reproduce: select an element, Shift-drag a marquee over it, release
  Shift during the drag and press it again.
- Old: when a toggle marquee reaches a selected element that is still
  highlighted, the old code removed the highlight and then ran
  `removeFlag++` on an undeclared global, which throws a ReferenceError.
  Every following pointer move threw again, the elements after it in the
  scene were never visited, and the highlight stopped updating.
- New: the highlight is removed and the element stays selected, as the
  surrounding code means; the rest of the scene is updated as usual.
- Test: src/editor/editor.test.ts, "BUG-040: a toggle marquee over a
  highlighted selected node unhighlights it and goes on" (fails with the
  old code: ReferenceError: removeFlag is not defined).
- Parity exceptions: none. No recorded scenario toggles a marquee over a
  highlighted selected element (the pointer/marquee-* scenarios release
  the marquee without changing Shift mid-drag).

## BUG-041 Magic tool throws on a selection with open sub-paths

Old code: chunk.vendor.js module 764 (GMagicTool._doTheClip), lines
106867-106930 (the throw at 106924).

- Reproduce: select a closed shape together with an open path (or a
  compound path with an open part) and draw a magic stroke across the
  shape.
- Old: after uniting or subtracting the stroke, the old code removed the
  touched elements and then called `.item.getParent()` on the open
  sub-paths. Those are raw vertex sources without an `item`, so the mouse
  handler threw a TypeError. The closed shapes were already removed and the
  result never inserted, but the transaction was still committed as
  "Create freehand path": the document kept the raw stroke and lost the
  shape until Undo (Q-193).
- New: the tool remembers which element each open part comes from and
  removes those elements, as the loop meant. The open parts are already
  part of the result (the old code concatenated them before the throw), so
  the result holds the clipped shape and the open parts, and it is
  selected.
- Test: src/editor/tools/view-tools.test.ts, "BUG-041: unites a compound
  path that has an open sub-path and keeps the open part" and "BUG-041:
  removes a selected open path whose part went into the result" (both fail
  with the old code: TypeError: Cannot read properties of undefined
  (reading 'getParent')).
- Parity exceptions: none. The magic/* scenarios select only closed
  shapes.

## BUG-042 Finishing a freehand stroke with Shift up throws in the multi-page view

Old code: chunk.vendor.js module 335 (GFreehandTool._modifiersChanged),
lines 61192-61201, and GEditor.updateByMousePosition (module 82).

- Reproduce: in the multi-page view (F6), draw with the freehand tool,
  press Shift during the stroke for straight segments, release the mouse,
  click a further point with Shift held and then let Shift go.
- Old: letting Shift go finishes the stroke by calling _mouseRelease with
  the ModifiersChangedEvent instead of a mouse event. Its `client` is
  undefined, and in the multi-page view updateByMousePosition calls
  Rect.containsPoint(undefined), which throws a TypeError (checked in the
  old app: "Cannot read properties of undefined (reading 'getX')" from
  containsPoint). The stroke stays open and unselected and the tool
  doesn't reset. In the single-page view the position isn't read, so it
  finishes normally (Q-162).
- New: the stroke is finished with the last mouse event, so the page
  under the pointer is updated from where the pointer is. The single-page
  view behaves as before.
- Test: src/editor/tools/freehand-tool.test.ts, "BUG-042: Shift up
  finishes the stroke in the multi-page view too" (fails with the old
  code: TypeError: Cannot read properties of undefined (reading 'getX')).
- Parity exceptions: none. freehand/shift-straight-segments runs in the
  single-page view, where nothing changes.

## BUG-043 Scaling a slice with the transform box sets its height to 0

Old code: chunk.vendor.js module 1084 (GSliceEditor._applyTransform),
lines 237400-237424 (`* o[1]` at 237413).

- Reproduce: select a slice (alone or with other elements) and scale it
  with the transform box (Q), or apply any scale to it that goes through
  the editor's transform without an element preview.
- Old: without a preview the new height was the old height times the
  transform's vertical shear (matrix[1]) instead of its vertical scale,
  so a plain scale set the height to 0. x and y became x plus the
  translation, ignoring the scale around the pivot (Q-190).
- New: without a preview the slice's box is mapped through the
  transform, and x, y, w and h come from the mapped box. A rotated
  transform is still dropped, and the preview path (resize handles) is
  unchanged.
- Test: src/editor/element-editors/slice-editor.test.ts, "BUG-043: maps
  the slice's box through a scale without a preview" (fails with the old
  code: [110, 70, 160, 0] instead of [210, 170, 160, 120]).
- Parity exceptions: none. No recorded scenario scales a slice through the
  transform box.

## BUG-044 Shift on a corner shoulder drag starts the right shoulder from the left one

Old code: chunk.vendor.js module 127 (GPathEditor._movePreviewPointShoulders),
lines 29993-30045 (the bug at 30019).

- Reproduce: in detail mode, give a corner point different shoulder
  lengths (cl 10, cr 20, not uniform) and drag its left shoulder with
  Shift held.
- Old: with `cr` set, the right shoulder's start value was read from `cl`,
  so both shoulders started from the left one. Dragging the left shoulder
  from 10 to 15 left cr at 5 instead of 15, and the returned translation
  was off by the same amount (Q-189).
- New: the right shoulder starts from `cr`. The Shift branch outside
  detail mode still reads the unset values and gives a NaN translation;
  that only reaches a hint that ignores path parts and stays as it was.
- Test: src/editor/element-editors/path-editor.test.ts, "BUG-044: starts
  the right shoulder from cr when Shift drags a shoulder in detail mode"
  (fails with the old code: translation 10 instead of 20, cr 5 instead of
  15).
- Parity exceptions: none. No recorded scenario Shift-drags a shoulder of
  a corner with different shoulder lengths.

## BUG-045 A transform box pivot at x = 0 or y = 0 counts as no pivot

Old code: chunk.vendor.js module 546 (GTransformBox constructor), lines
79587-79588.

- Reproduce: with the transform box (Q) active, move its pivot onto the
  page's left or top edge (x = 0 or y = 0, where it snaps), then
  transform the selection.
- Old: the constructor took the pivot with `cx || centre`, so a pivot at
  0 was replaced by the box centre on that axis. The box is rebuilt after
  each transform keeping its pivot, so the pivot jumped back to the centre
  after the first transform (Q-137).
- New: only a missing pivot (null) falls back to the centre.
- Test: src/editor/element-editors/transform-box.test.ts, "BUG-045:
  rotates around the centre unless one is given, also at 0" (fails with
  the old code: [100, 50] instead of [0, 0]).
- Parity exceptions: none. No recorded scenario puts the pivot at 0.

## BUG-046 Pen: Space during a handle drag throws the anchor off by the scroll

Old code: chunk.vendor.js module 539 (GPenTool._updatePointProperties),
lines 76805-76820.

- Reproduce: with the pen tool, press to place a point, drag out its
  handles and hold Space while dragging to move the point itself. The app
  view is always scrolled (the page is centred), so this happens on every
  move.
- Old: the point's own coordinates plus the pointer delta were passed to
  _updatePoint, which reads its argument as a view position. In a
  scrolled view the point flew off by the scroll; zoom and path
  transforms broke it as well.
- New: the point is mapped to view space first (through the path editor's
  transform from native coordinates), the pointer delta is added there,
  and the returned view position is compared with that same view point.
- Test: src/editor/tools/pen-tool.test.ts, "BUG-046: moves the anchor by
  the pointer delta in a scrolled view too" (fails with the old code:
  [-130, -50] instead of [270, 150]).
- Parity exceptions: editor-tools/pen/space-moves-anchor. The `.fixed`
  file is the new app's output; compared with the old expected file
  (JSON diff of the normalized outputs) only the second anchor point's
  position and left handle differ: the anchor ends at (270, 150), the
  press point (250, 120) moved by the Space drag's (20, 30), and the left
  handle mirrors the right one at (220, 150), where the old app put the
  anchor at (-1730, -850) and the handle at (-3780, -1850). The right
  handle and everything else are the same.

## BUG-047 Snapping returns the unsnapped rect when equal spacing loses

Old code: chunk.vendor.js module 210 (GGuides.mapRect, the bbox guide
branch), lines 40798-40822.

- Reproduce: drag an element so that an equal-spacing match is in reach
  but another element's edge is nearer, for example in a row of boxes
  where the dragged box's edge is 1 px from a box below and the spacing
  match is 2 px away.
- Old: when the bbox guide found an equal-spacing candidate, its turn in
  the guide loop always returned: the spaced rect when the spacing won,
  otherwise the input rect unchanged, because the variable it returned
  started as the input rect. The edge snap the bbox guide had just found
  and all later guides (grid, guide lines, points, page, full pixels)
  were skipped (Q-121).
- New: the loop returns only when the spacing wins; otherwise the edge
  snaps and the later guides apply as for any other rect.
- Test: src/editor/guides/guides.test.ts, "BUG-047: snaps to an edge when
  an equal spacing is found but farther" (fails with the old code: x 92
  instead of 93).
- Parity exceptions: none. editor-tools/snap/equal-spacing and
  snap/equal-spacing-overlay have the spacing win and give the same output
  in the new app (re-run against the fixed build).
